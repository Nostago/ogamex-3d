<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Tests\IsolatedAccountTestCase;

class Live3dAdminTest extends IsolatedAccountTestCase
{
    public function testNormalPlayersAndGuestsCannotGrantResources(): void
    {
        $user = Auth::user();
        $this->assertNotNull($user);
        $user->removeRole('admin');
        $this->postJson('/play-3d/admin/command', $this->resources())->assertForbidden();
        $this->get('/play-3d')->assertOk()->assertDontSee('href="#admin"', false);
        Auth::logout();
        $this->postJson('/play-3d/admin/command', $this->resources())->assertUnauthorized();
    }

    public function testAdminResourcesUseTheOriginalControllerAndExplicitOwnedPlanet(): void
    {
        $this->admin();
        $this->assertNotNull($this->secondPlanetService);
        $target = $this->secondPlanetService;
        $before = $target->metal()->get();
        $this->get('/play-3d')->assertOk()->assertSee('href="#admin"', false);
        $this->postJson('/play-3d/admin/command', [...$this->resources(), 'planet' => $target->getPlanetId(), 'metal' => 10000000, 'reset_buildings' => 1])->assertOk()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('planets', ['id' => $target->getPlanetId(), 'metal' => $before + 10000000]);
        $this->getJson('/play-3d/state?planet='.$target->getPlanetId())->assertOk()->assertJsonPath('resources.metal.amount', (int)($before + 10000000));
    }

    public function testAdminToolsUseOriginalBuildingResearchAndUnitPaths(): void
    {
        $this->admin();
        $this->planetSetObjectLevel('metal_mine', 4);
        $base = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'object'];
        $this->postJson('/play-3d/admin/command', [...$base, 'technologyId' => 1, 'amount' => 12, 'reset_research' => 1])->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'metal_mine' => 12]);
        $this->postJson('/play-3d/admin/command', [...$base, 'technologyId' => 113, 'amount' => 10])->assertOk();
        $this->assertDatabaseHas('users_tech', ['user_id' => $this->planetService->getPlayer()?->getId(), 'energy_technology' => 10]);
        $this->postJson('/play-3d/admin/command', [...$base, 'technologyId' => 204, 'amount' => 1000000])->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => 1000000]);
    }

    public function testInvalidTokenForeignTargetsAndInvalidValuesAreRejected(): void
    {
        $this->admin();
        $this->postJson('/play-3d/admin/command', [...$this->resources(), '_token' => 'invalid'])->assertStatus(419);
        $foreign = $this->createForeignPlanet();
        $this->postJson('/play-3d/admin/command', [...$this->resources(), 'planet' => $foreign->getPlanetId()])->assertNotFound();
        $this->postJson('/play-3d/admin/command', [...$this->resources(), 'metal' => -1])->assertUnprocessable();
        $this->postJson('/play-3d/admin/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'object', 'technologyId' => 1, 'amount' => 101])->assertUnprocessable();
    }

    private function admin(): void
    {
        $user = Auth::user();
        $this->assertNotNull($user);
        $user->assignRole('admin');
    }

    /** @return array<string, int|string|null> */
    private function resources(): array
    {
        return ['_token' => csrf_token(), 'planet' => (int)$this->currentPlanetId, 'action' => 'resources', 'metal' => 1000, 'crystal' => 1000, 'deuterium' => 1000];
    }
}
