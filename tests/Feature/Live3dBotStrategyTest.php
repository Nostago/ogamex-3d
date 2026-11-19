<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use OGame\Models\AutonomousBot;
use OGame\Models\BuildingQueue;
use OGame\Models\Planet;
use OGame\Models\ResearchQueue;
use OGame\Models\Resources;
use OGame\Models\UnitQueue;
use OGame\Services\AutonomousBotService;
use Tests\IsolatedAccountTestCase;

class Live3dBotStrategyTest extends IsolatedAccountTestCase
{
    public function testStrategyWritesRequireAdminAndCsrfAndRejectInvalidValuesAtomically(): void
    {
        $body = ['action' => 'strategy-all', 'strategy' => $this->strategy(), '_token' => csrf_token()];
        $this->postJson('/play-3d/bots', $body)->assertForbidden();
        Auth::user()?->assignRole('admin');
        $this->postJson('/play-3d/bots', [...$body, '_token' => 'bad'])->assertStatus(419);
        $bot = $this->bot();
        foreach ([
            ['fleet' => 0, 'economy' => 0, 'research' => 0], ['fleet' => -1], ['fleet' => 101], ['fleet' => 1.5],
            ['raid_every' => 0], ['raid_every' => 13], ['strength' => .5], ['strength' => 11], ['strength' => 2.55], ['surprise' => true],
        ] as $bad) {
            $this->postJson('/play-3d/bots', [...$body, 'strategy' => [...$this->strategy(), ...$bad]])->assertUnprocessable();
            $this->assertNull(AutonomousBot::findOrFail($bot->id)->strategy);
        }
        $this->postJson('/play-3d/bots', ['action' => 'strategy-all', '_token' => csrf_token()])->assertUnprocessable();
        $this->postJson('/play-3d/bots', [...$body, 'strategy' => []])->assertUnprocessable();
        $this->postJson('/play-3d/bots', [...$body, 'strategy' => ['fleet' => 1]])->assertUnprocessable();
    }

    public function testIndividualStrategySurvivesReloadAndOlderClientsAndCanReturnToDefaults(): void
    {
        Auth::user()?->assignRole('admin');
        $bot = $this->bot();
        $body = ['action' => 'save', 'id' => $bot->id, '_token' => csrf_token(), ...$this->botOptions(), 'strategy' => $this->strategy()];
        $this->postJson('/play-3d/bots', $body)->assertOk();
        $this->getJson('/play-3d/bots')->assertOk()->assertJsonPath('bots.0.strategy.fleet', 50)->assertJsonPath('bots.0.effectiveStrategy.strength', 2.5);
        unset($body['strategy']);
        $this->postJson('/play-3d/bots', $body)->assertOk();
        $this->assertSame(50, $bot->refresh()->strategy['fleet'] ?? null);
        $this->postJson('/play-3d/bots', [...$body, 'strategy' => null])->assertOk();
        $this->assertNull(AutonomousBot::findOrFail($bot->id)->strategy);
        $this->getJson('/play-3d/bots')->assertOk()->assertJsonPath('bots.0.effectiveStrategy.fleet', 2)->assertJsonPath('bots.0.effectiveStrategy.raid_every', 2);
    }

    public function testBulkApplyAndResetPreserveNamesFlagsCyclesAndHumanInventories(): void
    {
        Auth::user()?->assignRole('admin');
        $service = resolve(AutonomousBotService::class);
        $first = $service->create('Strategy One '.bin2hex(random_bytes(3)), $this->botOptions());
        $second = $service->create('Strategy Two '.bin2hex(random_bytes(3)), [...$this->botOptions(), 'enabled' => false, 'auto_raid' => false, 'profile' => 'economy']);
        $before = $second->getRawOriginal();
        $human = Planet::findOrFail($this->currentPlanetId)->only(['name', 'light_fighter', 'small_cargo']);
        $body = ['action' => 'strategy-all', 'strategy' => $this->strategy(), '_token' => csrf_token()];
        $this->postJson('/play-3d/bots', $body)->assertOk()->assertJsonPath('updated', 2);
        $this->assertSame(2.5, $first->refresh()->strategy['strength'] ?? null);
        $fresh = $second->fresh();
        $this->assertNotNull($fresh);
        foreach (['enabled', 'auto_raid', 'profile', 'cycles', 'user_id', 'next_tick_at'] as $key) {
            $this->assertSame($before[$key], $fresh->getRawOriginal($key));
        }
        $this->postJson('/play-3d/bots', [...$body, 'strategy' => null])->assertOk();
        $this->assertNull($second->fresh()?->strategy);
        $this->assertSame($human, Planet::findOrFail($this->currentPlanetId)->only(['name', 'light_fighter', 'small_cargo']));
    }

    public function testCustomPrioritiesActuallyChooseResearchOrFleetProductionWithoutEnablingRaids(): void
    {
        $this->prepare();
        $bot = $this->bot(['auto_raid' => false, 'strategy' => [...$this->strategy(), 'fleet' => 0, 'economy' => 0, 'research' => 100]]);
        $service = resolve(AutonomousBotService::class);
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'research']);
        $this->assertSame(0, UnitQueue::where('planet_id', $this->currentPlanetId)->count());
        ResearchQueue::where('planet_id', $this->currentPlanetId)->delete();
        $bot->refresh();
        $bot->cycles = 0;
        $bot->strategy = [...$this->strategy(), 'fleet' => 100, 'economy' => 0, 'research' => 0];
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('unit_queues', ['planet_id' => $this->currentPlanetId, 'object_id' => 204]);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'auto_raid' => 0, 'last_action' => 'unit']);
        $this->assertSame(0, BuildingQueue::where('planet_id', $this->currentPlanetId)->count());
    }

    /** @return array<string, int|float> */
    private function strategy(): array
    {
        return ['fleet' => 50, 'economy' => 25, 'research' => 25, 'raid_every' => 3, 'strength' => 2.5];
    }

    /** @return array<string, bool|int|string> */
    private function botOptions(): array
    {
        return ['enabled' => true, 'profile' => 'balanced', 'interval_seconds' => 120, 'max_level' => 25, 'ship_limit' => 100, 'batch_size' => 10,
            'auto_build' => true, 'auto_research' => true, 'auto_shipbuilding' => true, 'auto_raid' => true, 'auto_fleet_save' => false];
    }

    /** @param array<string, mixed> $overrides */
    private function bot(array $overrides = []): AutonomousBot
    {
        return AutonomousBot::create(['user_id' => $this->currentUserId, ...$this->botOptions(), ...$overrides]);
    }

    private function prepare(): void
    {
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000));
        $this->planetSetObjectLevel('shipyard', 3);
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->planetSetObjectLevel('research_lab', 3);
        $this->playerSetResearchLevel('combustion_drive', 3);
    }
}
