<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use OGame\Factories\PlayerServiceFactory;
use OGame\Models\AutonomousBot;
use OGame\Models\BuildingQueue;
use OGame\Models\FleetMission;
use OGame\Models\ResearchQueue;
use OGame\Models\Resources;
use OGame\Models\UnitQueue;
use OGame\Models\User;
use OGame\Services\AutonomousBotService;
use OGame\Services\ObjectService;
use Tests\IsolatedAccountTestCase;

class AutonomousBotsTest extends IsolatedAccountTestCase
{
    public function testAdminCanCreateConfigureAndPauseOnlyDedicatedNpcAccounts(): void
    {
        Auth::user()?->assignRole('admin');
        $input = ['_token' => csrf_token(), 'action' => 'create', 'name' => 'BOT-'.bin2hex(random_bytes(4)), ...$this->botOptions(), 'seed_resources' => 0];
        $id = $this->postJson('/play-3d/bots', $input)->assertOk()->json('id');
        $bot = AutonomousBot::findOrFail((int)$id);
        $this->assertNotSame($this->currentUserId, $bot->user_id);
        $user = User::findOrFail($bot->user_id);
        $this->assertStringEndsWith('@bots.invalid', $user->email);
        $this->assertFalse($user->hasRole('admin'));
        $this->getJson('/play-3d/bots')->assertOk()->assertJsonPath('bots.0.id', $id);
        $this->postJson('/play-3d/bots', ['_token' => csrf_token(), 'action' => 'save', 'id' => $id, ...$this->botOptions(), 'enabled' => false])->assertOk();
        $this->postJson('/play-3d/bots', ['_token' => csrf_token(), 'action' => 'tick', 'id' => $id])->assertUnprocessable();
        $this->assertSame(0, resolve(AutonomousBotService::class)->tickDue(100, (int)$id, true));
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'cycles' => 0]);
    }

    public function testAutonomousBuildingPaysOriginalCostsAndHonorsIntervalsAndPause(): void
    {
        $service = resolve(AutonomousBotService::class);
        $bot = $service->create('BOT-'.bin2hex(random_bytes(4)), $this->botOptions(), 100000);
        $player = resolve(PlayerServiceFactory::class)->make($bot->user_id, true);
        $planet = $player->planets->current();
        $before = $planet->metal()->get();
        $this->assertSame(1, $service->tickDue(1, $bot->id));
        $bot->refresh();
        $this->assertSame('build', $bot->last_action);
        $this->assertNotNull($bot->last_object);
        $price = ObjectService::getObjectPrice($bot->last_object, $planet);
        $this->assertDatabaseHas('planets', ['id' => $planet->getPlanetId(), 'metal' => $before - $price->metal->get()]);
        $this->assertSame(1, BuildingQueue::whereIn('planet_id', $player->planets->allIds())->count());
        $this->assertSame(0, $service->tickDue(1, $bot->id));
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'cycles' => 1]);
        $bot->enabled = false;
        $bot->save();
        $this->travelTo(Date::now()->addHour());
        $this->assertSame(0, $service->tickDue(1, $bot->id, true));
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'cycles' => 1]);
    }

    public function testBotsResearchProduceAndLaunchOnlyOneOriginalExpedition(): void
    {
        $service = resolve(AutonomousBotService::class);
        $bot = $service->create('BOT-'.bin2hex(random_bytes(4)), [...$this->botOptions(), 'profile' => 'explorer'], 100000);
        $player = resolve(PlayerServiceFactory::class)->make($bot->user_id, true);
        foreach ($player->planets->all() as $planet) {
            $planet->addResources(new Resources(100000, 100000, 100000));
            foreach (['robot_factory', 'research_lab', 'shipyard'] as $key) {
                $planet->setObjectLevel(ObjectService::getObjectByMachineName($key)->id, 4);
            }
        }
        $bot->cycles = 2;
        $bot->save();
        $this->assertSame(1, $service->tickDue(1, $bot->id, true));
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'research']);
        $this->assertSame(1, ResearchQueue::whereIn('planet_id', $player->planets->allIds())->count());
        foreach (['energy_technology' => 3, 'combustion_drive' => 6, 'computer_technology' => 4, 'espionage_technology' => 4, 'impulse_drive' => 3, 'astrophysics' => 3, 'weapon_technology' => 3, 'shielding_technology' => 3, 'armor_technology' => 3] as $key => $level) {
            $player->setResearchLevel($key, $level);
        }
        $bot->refresh();
        $bot->cycles = 5;
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'unit']);
        $this->assertSame(1, UnitQueue::whereIn('planet_id', $player->planets->allIds())->count());
        foreach ($player->planets->all() as $planet) {
            $planet->addUnit('small_cargo', 5);
        }
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'expedition']);
        $this->assertSame(1, FleetMission::where('user_id', $bot->user_id)->where('mission_type', 15)->count());
        $service->tickDue(1, $bot->id, true);
        $this->assertCount(1, FleetMission::where('user_id', $bot->user_id)->where('mission_type', 15)->get());
        $this->assertSame(0, FleetMission::where('user_id', $bot->user_id)->whereIn('mission_type', [1, 2, 6, 9])->count());
    }

    public function testBotControlsRequireAdminAndValidToken(): void
    {
        Auth::user()?->removeRole('admin');
        $this->getJson('/play-3d/bots')->assertForbidden();
        $this->postJson('/play-3d/bots', ['_token' => csrf_token(), 'action' => 'create'])->assertForbidden();
        Auth::user()?->assignRole('admin');
        $this->postJson('/play-3d/bots', ['_token' => 'invalid', 'action' => 'create'])->assertStatus(419);
    }

    /** @return array<string, bool|int|string> */
    private function botOptions(): array
    {
        return ['enabled' => true, 'profile' => 'balanced', 'interval_seconds' => 120, 'max_level' => 20, 'ship_limit' => 100, 'batch_size' => 10];
    }
}
