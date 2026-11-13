<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use OGame\Models\Resources;
use Tests\IsolatedAccountTestCase;

class Live3dTest extends IsolatedAccountTestCase
{
    public function testAuthenticatedViewAndReadModelExposeServerValuesWithoutDemoLimits(): void
    {
        $this->planetSetObjectLevel('metal_mine', 12);
        $this->planetAddUnit('light_fighter', 1000000);
        $this->get('/play-3d')->assertOk()->assertSee('live-bootstrap')->assertDontSee('data-advance-time')->assertHeader('Cache-Control', 'no-store, private');
        $response = $this->getJson('/play-3d/state')->assertOk();
        /** @var array<int, array<string, mixed>> $objectData */
        $objectData = $response->json('objects');
        $objects = collect($objectData);
        $this->assertSame('12', $objects->firstWhere('key', 'metal_mine')['amount'] ?? null);
        $this->assertSame('1000000', $objects->firstWhere('key', 'light_fighter')['amount'] ?? null);
        $this->assertNotNull($objects->firstWhere('key', 'deathstar'));
        $this->assertNotNull($objects->firstWhere('key', 'graviton_technology'));
        $this->assertNotNull($objects->firstWhere('key', 'large_shield_dome'));
        $this->assertSame($this->currentPlanetId, $response->json('planet.id'));
        $this->assertNotNull($this->secondPlanetService);
        $this->getJson('/play-3d/state?planet='.$this->secondPlanetService->getPlanetId())->assertOk()->assertJsonPath('planet.id', $this->secondPlanetService->getPlanetId());
    }

    public function testDashboardIncludesOriginalAssetsAndLiveCounters(): void
    {
        $this->planetAddUnit('rocket_launcher', 18);
        $this->planetAddUnit('light_fighter', 1000000);
        $response = $this->getJson('/play-3d/state')->assertOk()
            ->assertJsonPath('shipTotal', '1000000')->assertJsonPath('defenseTotal', '18');
        $this->assertIsInt($response->json('unread'));
        $this->assertIsInt($response->json('fleetSlots.used'));
        $this->assertGreaterThan(0, $response->json('fleetSlots.max'));
        $this->assertStringContainsString('/img/planets/small/', $response->json('planet.image'));
        /** @var array<int, array<string, mixed>> $objectData */
        $objectData = $response->json('objects');
        $objects = collect($objectData);
        $this->assertStringContainsString('/img/objects/buildings/', (string)($objects->firstWhere('key', 'metal_mine')['image'] ?? ''));
        $this->assertStringContainsString('/img/objects/units/', (string)($objects->firstWhere('key', 'light_fighter')['image'] ?? ''));
    }

    public function testGalaxyReadModelUsesOriginalVisibilityAndRejectsForeignPlanetAndInvalidCoordinates(): void
    {
        $coordinates = $this->planetService->getPlanetCoordinates();
        $query = '?planet='.$this->currentPlanetId.'&galaxy='.$coordinates->galaxy.'&system='.$coordinates->system;
        $response = $this->getJson('/play-3d/galaxy'.$query)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->assertSame($coordinates->galaxy, $response->json('galaxy'));
        $this->assertSame(499, $response->json('maxSystems'));
        /** @var array<int, array<string, mixed>> $rows */
        $rows = $response->json('rows');
        $this->assertGreaterThanOrEqual(15, count($rows));
        $row = collect($rows)->firstWhere('position', $coordinates->position);
        $this->assertNotNull($row);
        $this->assertSame($this->currentPlanetId, $row['planets'][0]['planetId']);
        $this->assertSame($this->planetService->getPlanetName(), $row['planets'][0]['planetName']);
        $foreign = $this->createForeignPlanet();
        $this->getJson('/play-3d/galaxy?planet='.$foreign->getPlanetId().'&galaxy=1&system=1')->assertNotFound();
        $this->getJson('/play-3d/galaxy?planet='.$this->currentPlanetId.'&galaxy=0&system=1')->assertUnprocessable();
        $this->getJson('/play-3d/galaxy?planet='.$this->currentPlanetId.'&galaxy=1&system=500')->assertUnprocessable();
        Auth::logout();
        $this->getJson('/play-3d/galaxy'.$query)->assertUnauthorized();
    }

    public function testForeignPlanetsAndUnauthenticatedAccessAreRejected(): void
    {
        $foreign = $this->createForeignPlanet();
        $this->getJson('/play-3d/state?planet='.$foreign->getPlanetId())->assertNotFound();
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $foreign->getPlanetId(), 'action' => 'build', 'technologyId' => 1])->assertNotFound();
        Auth::logout();
        $this->get('/play-3d')->assertRedirect('/login');
        $this->getJson('/play-3d/state')->assertUnauthorized();
    }

    public function testBuildUsesOriginalQueueAndWhitelistsClientControlledMode(): void
    {
        $this->planetSetObjectLevel('metal_mine', 1);
        $this->planetAddResources(new Resources(100000, 100000, 100000, 0));
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'build', 'technologyId' => 1, 'mode' => 3])->assertOk()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('building_queues', ['planet_id' => $this->currentPlanetId, 'object_id' => 1, 'object_level_target' => 2, 'canceled' => 0]);
        $state = $this->getJson('/play-3d/state')->assertOk();
        $queue = $state->json('queues.building.0');
        $this->assertSame(1, $queue['objectId']);
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'cancel-building', 'technologyId' => 1, 'listId' => $queue['id']])->assertOk()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('building_queues', ['id' => $queue['id'], 'canceled' => 1]);
    }

    public function testResearchAndUnitOrdersUseOriginalServicesAndCompleteOnOriginalClock(): void
    {
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->planetSetObjectLevel('shipyard', 2);
        $this->planetSetObjectLevel('research_lab', 2);
        $this->playerSetResearchLevel('energy_technology', 1);
        $this->playerSetResearchLevel('combustion_drive', 2);
        $this->planetAddResources(new Resources(100000, 100000, 100000, 0));
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'research', 'technologyId' => 113])->assertOk()->assertJsonPath('status', 'success');
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'ship', 'technologyId' => 204, 'amount' => 3])->assertOk()->assertJsonPath('status', 'success');
        $this->getJson('/play-3d/state')->assertOk()->assertJsonPath('queues.unit.0.quantity', '3');
        $this->travel(2)->hours();
        $response = $this->getJson('/play-3d/state')->assertOk();
        /** @var array<int, array<string, mixed>> $objectData */
        $objectData = $response->json('objects');
        $objects = collect($objectData);
        $this->assertSame('3', $objects->firstWhere('key', 'light_fighter')['amount'] ?? null);
        $this->assertEmpty($response->json('queues.unit'));
        $this->assertSame('2', $objects->firstWhere('key', 'energy_technology')['amount'] ?? null);
    }

    public function testCsrfInvalidTypesAndInvalidAmountsCannotCreateOrders(): void
    {
        $base = ['planet' => $this->currentPlanetId, 'action' => 'ship', 'technologyId' => 204, 'amount' => 1];
        $this->postJson('/play-3d/command', $base)->assertStatus(419);
        $this->postJson('/play-3d/command', [...$base, '_token' => csrf_token(), 'amount' => 0])->assertUnprocessable();
        $this->postJson('/play-3d/command', [...$base, '_token' => csrf_token(), 'technologyId' => 1])->assertUnprocessable();
        $this->postJson('/play-3d/command', [...$base, '_token' => csrf_token(), 'technologyId' => 999999])->assertUnprocessable();
        $this->assertDatabaseMissing('unit_queues', ['planet_id' => $this->currentPlanetId]);
    }

    public function testCommandsBindToTheExplicitPlanetInsteadOfTheCurrentTab(): void
    {
        $this->assertNotNull($this->secondPlanetService);
        $secondId = $this->secondPlanetService->getPlanetId();
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $secondId, 'action' => 'build', 'technologyId' => 1])->assertOk()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('building_queues', ['planet_id' => $secondId, 'object_id' => 1, 'canceled' => 0]);
        $this->assertDatabaseMissing('building_queues', ['planet_id' => $this->currentPlanetId]);
    }

    public function testVacationModeRemainsEnforcedByOriginalController(): void
    {
        $player = $this->planetService->getPlayer();
        $this->assertNotNull($player);
        $player->activateVacationMode();
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'build', 'technologyId' => 1])->assertOk()->assertJsonPath('success', false);
        $this->assertDatabaseMissing('building_queues', ['planet_id' => $this->currentPlanetId]);
    }

    public function testOriginalInterfaceStillOffersTheNewEntryAndPublicDemoStaysSeparate(): void
    {
        $this->get('/overview')->assertOk()->assertSee(route('live3d.index'));
        $this->get('/prototype-3d')->assertOk()->assertSee('prototype-translations')->assertDontSee('live-bootstrap');
    }
}
