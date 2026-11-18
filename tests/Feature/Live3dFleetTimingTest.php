<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use OGame\Models\FleetMission;
use Tests\IsolatedAccountTestCase;

class Live3dFleetTimingTest extends IsolatedAccountTestCase
{
    public function testPanelAndReductionFeedbackAreGermanAndKeepTheMinutesValue(): void
    {
        $user = Auth::user();
        $this->assertNotNull($user);
        $user->assignRole('admin');
        $mission = $this->mission();
        $arrival = $mission->time_arrival;
        $this->get('/admin/fleet-timing?ui=live3d')->assertOk()
            ->assertSee('Flottenzeiten verwalten')->assertSee('Angreifen')->assertSee('Verkürzen')->assertSee('name="minutes" value="60"', false)
            ->assertSee('data-time-part="days"', false)->assertSee('data-time-part="seconds"', false)
            ->assertDontSee('Reduce')->assertDontSee('Server time')->assertDontSee('width: 40px');
        $this->from('/admin/fleet-timing?ui=live3d')->post('/admin/fleet-timing/reduce?ui=live3d', ['_token' => csrf_token(), 'mission_id' => $mission->id, 'minutes' => 37])
            ->assertRedirect('/admin/fleet-timing?ui=live3d')->assertSessionHas('success', __('t_fleettiming.success_reduce', ['id' => $mission->id, 'minutes' => 37]));
        $this->assertSame($arrival - 37 * 60, $mission->fresh()?->time_arrival);
    }

    public function testTimingRemainsAdminOnlyAndInvalidAmountsCannotChangeTheMission(): void
    {
        $mission = $this->mission();
        $body = ['_token' => csrf_token(), 'mission_id' => $mission->id, 'minutes' => 100];
        $this->post('/admin/fleet-timing/reduce?ui=live3d', $body)->assertRedirect('/overview');
        $user = Auth::user();
        $this->assertNotNull($user);
        $user->assignRole('admin');
        foreach ([0, -1, 1.5, 10001] as $minutes) {
            $this->postJson('/admin/fleet-timing/reduce?ui=live3d', [...$body, 'minutes' => $minutes])->assertUnprocessable();
        }
        $this->assertSame($mission->time_arrival, $mission->fresh()?->time_arrival);
    }

    private function mission(): FleetMission
    {
        $mission = new FleetMission();
        $mission->forceFill([
            'user_id' => $this->currentUserId, 'planet_id_from' => $this->currentPlanetId,
            'galaxy_from' => 1, 'system_from' => 2, 'position_from' => 8,
            'galaxy_to' => 1, 'system_to' => 2, 'position_to' => 5,
            'mission_type' => 1, 'light_fighter' => 5,
            'time_departure' => (int)Date::now()->timestamp, 'time_arrival' => (int)Date::now()->timestamp + 9000,
        ])->save();
        return $mission;
    }
}
