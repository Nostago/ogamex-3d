<?php

namespace Tests\Feature;

use OGame\Models\Resources;
use OGame\Services\Live3dArtworkService;
use OGame\Services\ObjectService;
use OGame\Services\UnitQueueService;
use Tests\IsolatedAccountTestCase;

class Live3dShipArtworkTest extends IsolatedAccountTestCase
{
    public function testLightFighterUsesTheSameSmallImageInCatalogFleetAndProduction(): void
    {
        $expected = asset(ltrim(Live3dArtworkService::LIGHT_FIGHTER_IMAGE, '/'));
        $state = $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk();
        $objects = collect((array)$state->json('objects'));
        $this->assertSame($expected, $objects->firstWhere('key', 'light_fighter')['image']);
        $this->assertStringContainsString('heavy_fighter_small.jpg', $objects->firstWhere('key', 'heavy_fighter')['image']);
        $fleet = $this->getJson('/play-3d/fleet?planet='.$this->currentPlanetId)->assertOk();
        $this->assertSame($expected, collect((array)$fleet->json('ships'))->firstWhere('key', 'light_fighter')['image']);
        $this->planetSetObjectLevel('shipyard', 1);
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->playerSetResearchLevel('combustion_drive', 1);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        resolve(UnitQueueService::class)->add($this->planetService, 204, 3);
        $activity = $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk()->json('activity');
        $this->assertSame($expected, collect((array)$activity)->firstWhere('objectId', 204)['image']);
        $this->assertSame('light_fighter_small.jpg', ObjectService::getShipObjectByMachineName('light_fighter')->assets->imgSmall);
        $this->assertSame(3000.0, ObjectService::getObjectRawPrice('light_fighter')->metal->get());
        $state->assertDontSee('light-fighter-v1.glb');
        $this->get('/shipyard')->assertOk()->assertDontSee('light-fighter-35-v1.webp')->assertDontSee('light-fighter-v1.glb');
    }
}
