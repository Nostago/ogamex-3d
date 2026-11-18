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
        $this->assertSame(asset(ltrim(Live3dArtworkService::SHIP_IMAGES['cruiser'], '/')), $objects->firstWhere('key', 'cruiser')['image']);
        $fleet = $this->getJson('/play-3d/fleet?planet='.$this->currentPlanetId)->assertOk();
        $this->assertSame($expected, collect((array)$fleet->json('ships'))->firstWhere('key', 'light_fighter')['image']);
        $this->planetSetObjectLevel('shipyard', 6);
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->playerSetResearchLevel('combustion_drive', 6);
        $this->playerSetResearchLevel('impulse_drive', 3);
        $this->playerSetResearchLevel('armor_technology', 2);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        foreach ([204, 205, 203, 208] as $id) {
            resolve(UnitQueueService::class)->add($this->planetService, $id, 1);
        }
        $activity = $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk()->json('activity');
        foreach (Live3dArtworkService::SHIP_IMAGES as $key => $image) {
            $expectedImage = asset(ltrim($image, '/'));
            $this->assertSame($expectedImage, $objects->firstWhere('key', $key)['image']);
            if (!in_array($key, ['crawler', 'solar_satellite'], true)) {
                $this->assertSame($expectedImage, collect((array)$fleet->json('ships'))->firstWhere('key', $key)['image']);
            }
            $id = ObjectService::getShipObjectByMachineName($key)->id;
            if (in_array($id, [204, 205, 203, 208], true)) {
                $this->assertSame($expectedImage, collect((array)$activity)->firstWhere('objectId', $id)['image']);
            }
        }
        $this->assertCount(17, Live3dArtworkService::SHIP_IMAGES);
        $this->assertSame('light_fighter_small.jpg', ObjectService::getShipObjectByMachineName('light_fighter')->assets->imgSmall);
        $this->assertSame(3000.0, ObjectService::getObjectRawPrice('light_fighter')->metal->get());
        $state->assertDontSee('.glb');
        $this->get('/shipyard')->assertOk()->assertDontSee('light-fighter-35-v1.webp')->assertDontSee('/models/live3d/');
    }
}
