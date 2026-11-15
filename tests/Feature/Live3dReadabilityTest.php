<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Date;
use OGame\Factories\GameMissionFactory;
use OGame\Models\FleetMission;
use OGame\Models\Planet;
use OGame\Models\Resources;
use Tests\IsolatedAccountTestCase;

class Live3dReadabilityTest extends IsolatedAccountTestCase
{
    public function testSelectedColonyShipHasNoFalseWarningAndOriginalMissionCreatesAColony(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $this->planetAddUnit('colony_ship', 1);
        $this->playerSetResearchLevel('astrophysics', 3);
        $this->playerSetResearchLevel('impulse_drive', 3);
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000));
        $coordinates = $this->planetService->getPlanetCoordinates();
        $used = Planet::where('galaxy', $coordinates->galaxy)->where('system', $coordinates->system)->where('planet_type', 1)->pluck('planet')->all();
        $position = array_values(array_diff(range(4, 12), $used))[0];
        $payload = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'galaxy' => $coordinates->galaxy, 'system' => $coordinates->system, 'position' => $position, 'type' => 1, 'mission' => 7, 'speed' => 10, 'holdingtime' => 0, 'union' => 0, 'metal' => 0, 'crystal' => 0, 'deuterium' => 0, 'am208' => 1];
        $preview = $this->postJson('/play-3d/fleet/preview', $payload)->assertOk()->assertJsonPath('orders.7', true);
        $preview->assertDontSee(__('Colony ships must be sent to colonise this planet!'));
        $this->assertLessThanOrEqual($preview->json('fuelCapacity'), $preview->json('consumption'));
        $this->postJson('/play-3d/fleet/send', $payload)->assertOk()->assertJsonPath('success', true);
        $mission = FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 7)->firstOrFail();
        $this->assertSame(1, $mission->colony_ship);
        $this->travelTo(Date::createFromTimestamp($mission->time_arrival + 1));
        GameMissionFactory::getMissionById(7, [])->process($mission);
        $this->assertDatabaseHas('planets', ['user_id' => $this->currentUserId, 'galaxy' => $coordinates->galaxy, 'system' => $coordinates->system, 'planet' => $position, 'planet_type' => 1]);
    }

    public function testInvalidColonisationExplainsAstrophysicsInsteadOfInventingMissingShip(): void
    {
        $this->planetAddUnit('colony_ship', 1);
        $this->playerSetResearchLevel('astrophysics', 0);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $coordinates = $this->planetService->getPlanetCoordinates();
        $payload = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'galaxy' => $coordinates->galaxy, 'system' => $coordinates->system, 'position' => 1, 'type' => 1, 'mission' => 7, 'speed' => 10, 'holdingtime' => 0, 'union' => 0, 'metal' => 0, 'crystal' => 0, 'deuterium' => 0, 'am208' => 1];
        $this->postJson('/play-3d/fleet/preview', $payload)->assertOk()->assertJsonPath('orders.7', false)
            ->assertJsonPath('errors.0.message', __('Your knowledge of astrophysics is not sufficient to colonize this planet position.'));
    }

    public function testRewardsAndTechnologyUseReadableGermanViewsWithoutNestedOverlay(): void
    {
        $this->get('/rewards?ui=live3d')->assertOk()->assertSee('Belohnungen')->assertSee('live-reward-card')->assertDontSee('Lieutenant Cupid')->assertDontSee('Not fulfilled');
        foreach ([1, 2, 3, 4] as $tab) {
            $this->get('/play-3d/technology?object_id=1&tab='.$tab.'&ui=live3d')->assertOk()->assertSee('live-technology')->assertDontSee('id="technologytree"', false);
        }
        $this->playerSetResearchLevel('energy_technology', 5);
        $this->get('/play-3d/technology?object_id=113&tab=3')->assertOk()->assertSee('Energietechnik')->assertSee('<strong>5</strong>', false);
        $this->get('/play-3d')->assertOk()->assertSee('live-ui-text-scale')->assertSee('Extra groß');
    }
}
