<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use OGame\Models\EspionageReport;
use OGame\Models\FleetMission;
use OGame\Models\Message;
use OGame\Models\Resources;
use Tests\IsolatedAccountTestCase;

class Live3dSystemMapTest extends IsolatedAccountTestCase
{
    public function testRetainedReportsBelongToRecipientAndLatestPartialReportDoesNotRevealOlderHiddenSections(): void
    {
        $old = $this->report(['ships' => ['light_fighter' => 1000000], 'defense' => []]);
        $this->deliver($old, $this->currentUserId);
        $latest = $this->report(['ships' => null, 'defense' => null, 'resources' => ['metal' => 1234]]);
        $message = $this->deliver($latest, $this->currentUserId);
        $foreign = $this->createForeignPlanet()->getPlayer();
        $this->assertNotNull($foreign);
        $secret = $this->report(['resources' => ['metal' => 987654321], 'ships' => ['deathstar' => 999999]]);
        $this->deliver($secret, $foreign->getId());
        $moon = $this->report(['planet_type' => 3, 'ships' => [], 'defense' => []]);
        $this->deliver($moon, $this->currentUserId);
        $elsewhere = $this->report(['planet_system' => $this->planetService->getPlanetCoordinates()->system === 499 ? 498 : 499]);
        $this->deliver($elsewhere, $this->currentUserId);
        $response = $this->getJson($this->url())->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $response->assertJsonCount(2, 'reports')->assertJsonPath('reports.0.assessment', 'partial')
            ->assertJsonPath('reports.0.sections.ships', null)->assertJsonPath('reports.0.sections.defense', null)
            ->assertJsonPath('reports.0.sections.resources.0.amount', '1234')->assertJsonPath('reports.1.assessment', 'clear');
        $response->assertDontSee('987654321')->assertDontSee('999999')->assertDontSee('1000000');
        $message->delete();
        $this->getJson($this->url())->assertOk()->assertJsonPath('reports.0.assessment', 'armed')
            ->assertJsonPath('reports.0.sections.ships.0.amount', '1000000');
    }

    public function testRadarReusesOriginalMovementVisibilityAndReturnDirectionWithoutForeignFleetInventory(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $second = $this->secondPlanetService;
        $this->assertNotNull($second);
        $this->planetAddUnit('small_cargo', 1000000);
        $this->playerSetResearchLevel('combustion_drive', 6);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $target = $second->getPlanetCoordinates();
        $payload = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'galaxy' => $target->galaxy, 'system' => $target->system, 'position' => $target->position, 'type' => 1, 'mission' => 3, 'speed' => 10, 'holdingtime' => 0, 'union' => 0, 'metal' => 0, 'crystal' => 0, 'deuterium' => 0, 'am202' => 3];
        $this->postJson('/play-3d/fleet/send', $payload)->assertOk()->assertJsonPath('success', true);
        $mission = FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 3)->firstOrFail();
        $foreign = $this->createForeignPlanet();
        $owner = $foreign->getPlayer();
        $this->assertNotNull($owner);
        $unrelated = $mission->replicate();
        $unrelated->user_id = $owner->getId();
        $unrelated->planet_id_from = $foreign->getPlanetId();
        $unrelated->planet_id_to = $foreign->getPlanetId();
        $unrelated->save();
        $incoming = $unrelated->replicate();
        $incoming->planet_id_to = $this->currentPlanetId;
        $incoming->mission_type = 1;
        $incoming->light_fighter = 123456789;
        $incoming->save();
        $response = $this->getJson($this->url())->assertOk()->assertJsonCount(2, 'fleets');
        /** @var array<int, array<string, mixed>> $fleets */
        $fleets = $response->json('fleets');
        $own = collect($fleets)->firstWhere('id', $mission->id);
        $hostile = collect($fleets)->firstWhere('id', $incoming->id);
        $this->assertSame('3', $own['count'] ?? null);
        $this->assertSame('3', $own['ships'][0]['amount'] ?? null);
        $this->assertSame('own', $own['relation'] ?? null);
        $this->assertSame($mission->time_departure, $own['departure'] ?? null);
        $this->assertSame($mission->time_arrival, $own['arrival'] ?? null);
        $this->assertSame('hostile', $hostile['relation'] ?? null);
        $this->assertNull($hostile['count'] ?? null);
        $this->assertNull($hostile['ships'] ?? null);
        $response->assertDontSee('123456789');
        $this->assertNotContains($unrelated->id, array_column($fleets, 'id'));
        $this->travel(2)->seconds();
        $this->postJson('/play-3d/fleet/recall', ['_token' => csrf_token(), 'fleet_mission_id' => $mission->id])->assertOk()->assertJsonPath('success', true);
        $response = $this->getJson($this->url())->assertOk();
        /** @var array<int, array<string, mixed>> $returnFleets */
        $returnFleets = $response->json('fleets');
        $return = collect($returnFleets)->firstWhere('own', true);
        $this->assertTrue($return['returning'] ?? null);
        $this->assertSame($target->asString(), $return['origin'] ?? null);
        $this->assertSame($this->planetService->getPlanetCoordinates()->asString(), $return['destination'] ?? null);
    }

    public function testSystemMapRequiresOwnedContextAndDoesNotMarkMessagesRead(): void
    {
        $this->deliver($this->report(), $this->currentUserId);
        $before = Message::where('user_id', $this->currentUserId)->where('viewed', 0)->count();
        $this->getJson($this->url())->assertOk()->assertJsonPath('planet', $this->currentPlanetId);
        $this->assertSame($before, Message::where('user_id', $this->currentUserId)->where('viewed', 0)->count());
        $foreign = $this->createForeignPlanet();
        $this->getJson('/play-3d/system-map?planet='.$foreign->getPlanetId())->assertNotFound();
        $this->getJson('/play-3d/system-map?planet=0')->assertUnprocessable();
        Auth::logout();
        $this->getJson($this->url())->assertUnauthorized();
    }

    private function url(): string
    {
        return '/play-3d/system-map?planet='.$this->currentPlanetId;
    }

    /** @param array<string, mixed> $attributes */
    private function report(array $attributes = []): EspionageReport
    {
        $coordinates = $this->planetService->getPlanetCoordinates();
        $report = new EspionageReport();
        $report->forceFill(array_replace([
            'planet_galaxy' => $coordinates->galaxy, 'planet_system' => $coordinates->system,
            'planet_position' => 5, 'planet_type' => 1, 'planet_user_id' => $this->currentUserId,
            'player_info' => [], 'resources' => ['metal' => 10], 'ships' => null, 'defense' => null,
            'buildings' => null, 'research' => null,
        ], $attributes));
        $report->save();
        return $report;
    }

    private function deliver(EspionageReport $report, int $recipient): Message
    {
        $message = new Message();
        $message->user_id = $recipient;
        $message->key = 'espionage_report';
        $message->espionage_report_id = $report->id;
        $message->save();
        return $message;
    }
}
