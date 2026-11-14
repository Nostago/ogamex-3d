<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Date;
use OGame\Factories\PlanetServiceFactory;
use OGame\Models\FleetMission;
use OGame\Models\Resources;
use OGame\Services\BuildingQueueService;
use OGame\Services\ObjectService;
use OGame\Services\ResearchQueueService;
use OGame\Services\UnitQueueService;
use Tests\IsolatedAccountTestCase;

class Live3dOperationsTest extends IsolatedAccountTestCase
{
    public function testGlobalActivityIncludesAllQueueTypesAndOtherOwnedWorlds(): void
    {
        $second = $this->secondPlanetService;
        $this->assertNotNull($second);
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000));
        $this->planetSetObjectLevel('research_lab', 3);
        $this->planetSetObjectLevel('shipyard', 3);
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->playerSetResearchLevel('combustion_drive', 2);
        $player = $this->planetService->getPlayer();
        $this->assertNotNull($player);
        resolve(BuildingQueueService::class)->add($this->planetService, 1);
        resolve(BuildingQueueService::class)->add($this->planetService, 2);
        resolve(ResearchQueueService::class)->add($player, $this->planetService, 113);
        resolve(UnitQueueService::class)->add($this->planetService, 202, 4);
        $second->addResources(new Resources(100000, 100000, 100000));
        resolve(BuildingQueueService::class)->add($second, 1);
        $response = $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk();
        $activity = $this->rows($response->json('activity'));
        $this->assertCount(5, $activity);
        $this->assertCount(3, $activity->where('kind', 'building'));
        $this->assertCount(1, $activity->where('kind', 'research'));
        $this->assertCount(1, $activity->where('kind', 'unit'));
        $this->assertCount(1, $activity->where('active', false));
        $this->assertCount(1, $activity->where('planet', $second->getPlanetId()));
        $this->assertStringContainsString('/img/objects/buildings/', (string)($activity->firstWhere('kind', 'building')['image'] ?? ''));
        $this->assertSame($this->currentPlanetId, $response->json('planet.id'));
    }

    public function testRequirementStatusUsesCompletedLevelsRatherThanQueuedLevels(): void
    {
        $this->planetSetObjectLevel('robot_factory', 1);
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000));
        resolve(BuildingQueueService::class)->add($this->planetService, 14);
        $response = $this->getJson('/play-3d/state')->assertOk();
        $shipyard = $this->rows($response->json('objects'))->firstWhere('key', 'shipyard');
        $requirement = $this->rows($shipyard['requirements'] ?? [])->firstWhere('key', 'robot_factory');
        $this->assertSame(1, $requirement['current'] ?? null);
        $this->assertSame(2, $requirement['level'] ?? null);
        $this->assertFalse($requirement['met'] ?? null);
        $this->planetSetObjectLevel('robot_factory', 2);
        $response = $this->getJson('/play-3d/state')->assertOk();
        $shipyard = $this->rows($response->json('objects'))->firstWhere('key', 'shipyard');
        $this->assertTrue($this->rows($shipyard['requirements'] ?? [])->firstWhere('key', 'robot_factory')['met'] ?? null);
    }

    public function testNativeFleetPreviewDispatchMovementAndRecallUseOriginalMissions(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $second = $this->secondPlanetService;
        $this->assertNotNull($second);
        $this->planetAddUnit('small_cargo', 1000000);
        $this->playerSetResearchLevel('combustion_drive', 6);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $target = $second->getPlanetCoordinates();
        $payload = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'galaxy' => $target->galaxy, 'system' => $target->system, 'position' => $target->position, 'type' => 1, 'mission' => 3, 'speed' => 10, 'holdingtime' => 0, 'union' => 0, 'metal' => 1234, 'crystal' => 0, 'deuterium' => 0, 'am202' => 3];
        $state = $this->getJson('/play-3d/fleet?planet='.$this->currentPlanetId)->assertOk();
        $this->assertSame('1000000', $this->rows($state->json('ships'))->firstWhere('id', 202)['available'] ?? null);
        $quote = $this->postJson('/play-3d/fleet/preview', $payload)->assertOk()->assertJsonPath('orders.3', true);
        $this->assertGreaterThan(0, $quote->json('duration'));
        $this->assertGreaterThan(0, $quote->json('consumption'));
        $before = $this->planetService->deuterium()->get();
        $this->postJson('/play-3d/fleet/send', $payload)->assertOk()->assertJsonPath('success', true);
        $mission = FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 3)->firstOrFail();
        $this->assertSame(1234, (int)$mission->metal);
        $this->assertSame($quote->json('duration'), $mission->time_arrival - $mission->time_departure);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'small_cargo' => 999997]);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'deuterium' => $before - $quote->json('consumption')]);
        $movements = $this->getJson('/play-3d/fleet?planet='.$this->currentPlanetId)->assertOk();
        $event = $this->rows($movements->json('movements'))->firstWhere('id', $mission->id);
        $this->assertTrue($event['recallable'] ?? null);
        $this->assertSame('3', $event['ships'][0]['amount'] ?? null);
        $this->travelTo(Date::now()->addSeconds(2));
        $this->postJson('/play-3d/fleet/recall', ['_token' => csrf_token(), 'fleet_mission_id' => $mission->id])->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('fleet_missions', ['id' => $mission->id, 'canceled' => 1]);
    }

    public function testNativeOperationsRejectForeignPlanetsAndInvalidCommands(): void
    {
        $foreign = $this->createForeignPlanet();
        $this->getJson('/play-3d/fleet?planet='.$foreign->getPlanetId())->assertNotFound();
        $this->postJson('/play-3d/fleet/preview', ['_token' => 'bad'])->assertStatus(419);
        $this->postJson('/play-3d/galaxy/action', ['_token' => csrf_token(), 'action' => 'scan', 'planet' => $foreign->getPlanetId(), 'galaxy' => 1, 'system' => 1, 'position' => 1])->assertNotFound();
        $this->postJson('/play-3d/galaxy/action', ['_token' => csrf_token(), 'action' => 'scan', 'planet' => $this->currentPlanetId, 'galaxy' => 1, 'system' => 1, 'position' => 1])->assertOk()->assertJsonPath('is_error', true);
        $this->getJson('/play-3d/galaxy/missiles?planet='.$this->currentPlanetId.'&galaxy=1&system=1&position=16')->assertUnprocessable();
    }

    public function testNativeGalaxyMissilesAndPhalanxUseOriginalActionsAndCosts(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $foreign = $this->createForeignPlanet();
        $coords = $foreign->getPlanetCoordinates();
        $this->playerSetResearchLevel('impulse_drive', 12);
        $this->planetAddUnit('interplanetary_missile', 10);
        $payload = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'galaxy' => $coords->galaxy, 'system' => $coords->system, 'position' => $coords->position, 'type' => 1];
        $query = http_build_query($payload);
        $this->getJson('/play-3d/galaxy/missiles?'.$query)->assertOk()->assertJsonPath('available_missiles', 10)->assertJsonPath('error', null);
        $this->postJson('/play-3d/galaxy/action', [...$payload, 'action' => 'missiles', 'missile_count' => 2, 'target_priority' => 0])->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'interplanetary_missile' => 8]);
        $this->assertDatabaseHas('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 10, 'position_to' => $coords->position]);
        $moon = resolve(PlanetServiceFactory::class)->createMoonForPlanet($this->planetService, 2000000, 20);
        $moon->setObjectLevel(ObjectService::getObjectByMachineName('sensor_phalanx')->id, 5);
        $moon->addResources(new Resources(0, 0, 10000));
        $scan = $this->postJson('/play-3d/galaxy/action', [...$payload, 'planet' => $moon->getPlanetId(), 'action' => 'scan'])->assertOk()
            ->assertJsonPath('success', true)->assertJsonPath('scan_cost', 5000)->assertJsonMissingPath('content_html');
        $this->assertIsArray($scan->json('movements'));
        $this->assertDatabaseHas('planets', ['id' => $moon->getPlanetId(), 'deuterium' => 5000]);
    }

    /** @param array<int, array<string, mixed>> $items
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function rows(array $items): \Illuminate\Support\Collection
    {
        return collect($items);
    }
}
