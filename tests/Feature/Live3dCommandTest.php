<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use OGame\Models\FleetTemplate;
use OGame\Models\Resources;
use OGame\Services\BuildingQueueService;
use Tests\IsolatedAccountTestCase;

class Live3dCommandTest extends IsolatedAccountTestCase
{
    public function testEmpireContainsOwnedWorldsWithResourcesAndTheirOwnOrders(): void
    {
        $secondWorld = $this->secondPlanetService;
        $this->assertNotNull($secondWorld);
        $foreign = $this->createForeignPlanet();
        $secondWorld->addResources(new Resources(100000, 100000, 100000));
        resolve(BuildingQueueService::class)->add($secondWorld, 1);
        /** @var array<int, array<string, mixed>> $data */
        $data = $this->getJson('/play-3d/state')->assertOk()->json('empire');
        $worlds = collect($data)->keyBy('id');
        $this->assertTrue($worlds->has($this->currentPlanetId));
        $this->assertTrue($worlds->has($secondWorld->getPlanetId()));
        $this->assertFalse($worlds->has($foreign->getPlanetId()));
        $second = $worlds->get($secondWorld->getPlanetId());
        $this->assertNotNull($second);
        $this->assertGreaterThan(0, $second['resources']['metal']['limit']);
        $this->assertArrayHasKey('factor', $second['energy']);
        $this->assertNotEmpty($second['orders']);
        foreach ($second['orders'] as $order) {
            $this->assertSame($secondWorld->getPlanetId(), $order['planet']);
        }
        $first = $worlds->get($this->currentPlanetId);
        $this->assertNotNull($first);
        $this->assertEmpty($first['orders']);
    }

    public function testPlanningPreferencesPersistWithExistingTemplatesWithoutDispatchingShips(): void
    {
        $body = $this->templateBody();
        $before = DB::table('fleet_missions')->count();
        $saved = $this->postJson('/play-3d/fleet/templates', $body)->assertOk()->assertJsonPath('success', true);
        $id = (int)$saved->json('template.id');
        $this->getJson('/ajax/fleet/templates')->assertOk()->assertJsonPath('templates.0.settings.mission', 15)->assertJsonPath('templates.0.ships.204', 3);
        $body['template_id'] = $id;
        $body['settings']['mission'] = 3;
        $this->postJson('/play-3d/fleet/templates', $body)->assertOk()->assertJsonPath('success', true);
        $this->assertSame(1, FleetTemplate::where('user_id', $this->currentUserId)->count());
        $this->assertSame(3, FleetTemplate::findOrFail($id)->settings['mission'] ?? null);
        $this->assertSame($before, DB::table('fleet_missions')->count());
    }

    public function testTemplateWritesRejectForeignOwnershipInvalidPreferencesAndMissingToken(): void
    {
        $foreign = $this->createForeignPlanet();
        $foreignPlayer = $foreign->getPlayer();
        $this->assertNotNull($foreignPlayer);
        $template = FleetTemplate::create(['user_id' => $foreignPlayer->getId(), 'name' => 'Private', 'ships' => ['204' => 4]]);
        $body = $this->templateBody();
        $body['template_id'] = $template->id;
        $this->postJson('/play-3d/fleet/templates', $body)->assertOk()->assertJsonPath('success', false);
        $fresh = $template->fresh();
        $this->assertNotNull($fresh);
        $this->assertNull($fresh->settings);
        unset($body['template_id']);
        $body['settings']['mission'] = 99;
        $this->postJson('/play-3d/fleet/templates', $body)->assertUnprocessable();
        $body = $this->templateBody();
        unset($body['_token']);
        $this->postJson('/play-3d/fleet/templates', $body)->assertStatus(419);
        Auth::logout();
        $this->postJson('/play-3d/fleet/templates', $this->templateBody())->assertUnauthorized();
    }

    public function testMapReportsOnlyRecentConfirmedCompletionsOnOwnedWorlds(): void
    {
        $foreign = $this->createForeignPlanet();
        $now = (int)Date::now()->timestamp;
        $job = ['planet_id' => $this->currentPlanetId, 'object_id' => 1, 'object_level_target' => 2, 'time_end' => $now - 10, 'processed' => 1, 'canceled' => 0];
        $own = DB::table('building_queues')->insertGetId($job);
        DB::table('building_queues')->insert([...$job, 'canceled' => 1]);
        DB::table('building_queues')->insert([...$job, 'time_end' => $now - 301]);
        DB::table('building_queues')->insert([...$job, 'time_end' => $now + 10]);
        DB::table('building_queues')->insert([...$job, 'is_downgrade' => 1]);
        DB::table('building_queues')->insert([...$job, 'planet_id' => $foreign->getPlanetId()]);
        $events = $this->getJson('/play-3d/system-map?planet='.$this->currentPlanetId)->assertOk()->json('events');
        $this->assertCount(1, $events);
        $this->assertSame('building-'.$own, $events[0]['id']);
        $this->assertSame(2, $events[0]['level']);
    }

    public function testLogoutRemainsAProtectedPostInThePlayerMenu(): void
    {
        $response = $this->get('/play-3d')->assertOk();
        $response->assertSee('id="live-player-menu"', false)->assertSee('id="live-page-empire"', false)->assertSee('id="fleet-formation-toggle"', false);
        $this->assertMatchesRegularExpression('/<form method="POST" action="[^"]*logout">.*?name="_token"/s', (string)$response->getContent());
    }

    /** @return array<string, mixed> */
    private function templateBody(): array
    {
        return ['_token' => csrf_token(), 'template_name' => 'Expedition', 'ship' => ['204' => 3], 'settings' => ['mission' => 15, 'type' => 1, 'speed' => 10, 'holdingtime' => 1]];
    }
}
