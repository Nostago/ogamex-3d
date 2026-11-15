<?php

namespace Tests\Feature;

use OGame\Factories\PlanetServiceFactory;
use Tests\IsolatedAccountTestCase;

class Live3dPlanetNameTest extends IsolatedAccountTestCase
{
    public function testRenameUsesOriginalRulesAndExplicitOwnedPlanet(): void
    {
        $second = $this->secondPlanetService;
        $this->assertNotNull($second);
        $originalName = $this->planetService->getPlanetName();
        $payload = ['_token' => csrf_token(), 'action' => 'rename-planet', 'planet' => $second->getPlanetId(), 'newPlanetName' => 'Nova Prime'];
        $this->postJson('/play-3d/command', $payload)->assertOk()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('planets', ['id' => $second->getPlanetId(), 'name' => 'Nova Prime']);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'name' => $originalName]);
        $this->getJson('/play-3d/state?planet='.$second->getPlanetId())->assertOk()->assertJsonPath('planet.name', 'Nova Prime');
        $moon = resolve(PlanetServiceFactory::class)->createMoonForPlanet($this->planetService, 2000000, 20);
        $this->postJson('/play-3d/command', [...$payload, 'planet' => $moon->getPlanetId(), 'newPlanetName' => 'Luna'])->assertOk()->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('planets', ['id' => $moon->getPlanetId(), 'name' => 'Luna']);
    }

    public function testRenameRejectsForeignPlanetsInvalidNamesAndInvalidTokens(): void
    {
        $foreign = $this->createForeignPlanet();
        $payload = ['_token' => csrf_token(), 'action' => 'rename-planet', 'planet' => $this->currentPlanetId, 'newPlanetName' => 'Orion'];
        $this->postJson('/play-3d/command', [...$payload, 'planet' => $foreign->getPlanetId()])->assertNotFound();
        $this->postJson('/play-3d/command', [...$payload, '_token' => 'wrong'])->assertStatus(419);
        foreach (['A', '-Orion', 'Nova  Prime', '<script>'] as $invalid) {
            $this->postJson('/play-3d/command', [...$payload, 'newPlanetName' => $invalid])->assertOk()->assertJsonPath('status', 'error')->assertJsonPath('errorbox.failed', true);
        }
        $this->postJson('/play-3d/command', [...$payload, 'newPlanetName' => str_repeat('x', 21)])->assertUnprocessable();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'name' => $this->planetService->getPlanetName()]);
        $this->get('/play-3d')->assertOk()->assertSee('id="live-rename-open"', false)->assertSee('id="live-ui-heading-scale"', false)->assertSee('step="1"', false);
    }
}
