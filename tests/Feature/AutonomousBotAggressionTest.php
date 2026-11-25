<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Date;
use OGame\Models\AutonomousBot;
use OGame\Models\BuildingQueue;
use OGame\Models\EspionageReport;
use OGame\Models\FleetMission;
use OGame\Models\Message;
use OGame\Models\ResearchQueue;
use OGame\Models\Resources;
use OGame\Models\UnitQueue;
use OGame\Models\User;
use OGame\Services\AutonomousBotService;
use Tests\IsolatedAccountTestCase;

class AutonomousBotAggressionTest extends IsolatedAccountTestCase
{
    public function testFleetBudgetStopsRepeatedEconomicSpendingUntilFirstFighterIsAffordable(): void
    {
        // The original prebuilt-yard tests did not exercise resource starvation.
        // Cycle three is an economy turn; before the fix it would spend the
        // remaining budget on another mine instead of saving for the first ship.
        $bot = $this->bot(['cycles' => 2]);
        $this->prepareShipyard();
        $this->planetSetObjectLevel('metal_mine', 3);
        $this->planetSetObjectLevel('crystal_mine', 3);
        $this->planetSetObjectLevel('deuterium_synthesizer', 1);
        $this->planetSetObjectLevel('solar_plant', 10);
        $this->planetService->update();

        $this->planetDeductResources(new Resources(
            (int)$this->planetService->metal()->get() - 2900,
            (int)$this->planetService->crystal()->get() - 900,
            max(0, (int)$this->planetService->deuterium()->get() - 1500)
        ));
        $service = resolve(AutonomousBotService::class);
        $service->tickDue(1, $bot->id, true);

        $this->assertDatabaseHas('autonomous_bots', [
            'id' => $bot->id, 'last_action' => 'saving', 'last_object' => 'light_fighter',
        ]);
        $this->assertSame(0, BuildingQueue::where('planet_id', $this->currentPlanetId)->count());
        $this->assertSame(0, UnitQueue::where('planet_id', $this->currentPlanetId)->count());

        // Existing inventory and completed technologies are untouched. Once
        // income makes a legal purchase possible, the next fleet turn uses the
        // normal OGameX unit queue rather than a synthetic ship grant.
        $this->planetAddResources(new Resources(6000, 2000, 0));
        $bot->refresh();
        $bot->cycles = 4; // The next decision is a fleet turn.
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', [
            'id' => $bot->id, 'last_action' => 'unit', 'last_object' => 'light_fighter',
        ]);
        $this->assertDatabaseHas('unit_queues', [
            'planet_id' => $this->currentPlanetId, 'object_id' => 204,
        ]);
    }

    public function testNoFleetSavingsLockWhenAutonomousShipbuildingIsDisabled(): void
    {
        $bot = $this->bot(['cycles' => 2, 'auto_shipbuilding' => false]);
        $this->prepareShipyard();
        $this->planetSetObjectLevel('metal_mine', 3);
        $this->planetSetObjectLevel('crystal_mine', 3);
        $this->planetSetObjectLevel('deuterium_synthesizer', 1);
        $this->planetSetObjectLevel('solar_plant', 10);
        $this->planetService->update();

        resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'build']);
    }

    public function testRaidingBotBuildsFightersBeforeCompletingOptionalResearch(): void
    {
        $bot = $this->bot();
        $this->prepareShipyard();
        resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'unit', 'last_object' => 'light_fighter', 'last_amount' => 10]);
        $this->assertDatabaseHas('unit_queues', ['planet_id' => $this->currentPlanetId, 'object_id' => 204, 'object_amount' => 10]);
        $this->assertSame(0, ResearchQueue::where('planet_id', $this->currentPlanetId)->count());
    }

    public function testStarterProbesAreCappedAtEightRatherThanAnEntireLargeProductionBatch(): void
    {
        $bot = $this->bot(['batch_size' => 100]);
        $this->prepareShipyard();
        $this->planetSetObjectLevel('shipyard', 3);
        $this->planetAddUnit('light_fighter', 20);
        $this->planetAddUnit('small_cargo', 5);
        resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('unit_queues', ['planet_id' => $this->currentPlanetId, 'object_id' => 210, 'object_amount' => 8]);
    }

    public function testEconomyTurnsRotateAcrossBothColoniesAndAreNotSpentOnMoreShips(): void
    {
        $bot = $this->bot(['cycles' => 2]);
        $this->prepareShipyard();
        $second = $this->secondPlanetService;
        $this->assertNotNull($second);
        $second->addResources(new Resources(1000000, 1000000, 1000000));
        $service = resolve(AutonomousBotService::class);
        $service->tickDue(1, $bot->id, true);
        $bot->refresh();
        $bot->cycles = 6;
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertSame(2, BuildingQueue::whereIn('planet_id', [$this->currentPlanetId, $second->getPlanetId()])->distinct('planet_id')->count('planet_id'));
        $this->assertSame(0, UnitQueue::whereIn('planet_id', [$this->currentPlanetId, $second->getPlanetId()])->count());
    }

    public function testOwnCompleteScoutReportAllowsAnEscortedRaidAgainstWeakDefenseOnTheSecondCycle(): void
    {
        [$bot, $report] = $this->raidFixture();
        resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'cycles' => 2, 'last_action' => 'raid']);
        $this->assertDatabaseHas('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 1, 'light_fighter' => 30, 'small_cargo' => 5]);
        $this->assertDatabaseHas('espionage_reports', ['id' => $report->id]);
    }

    public function testCustomCadenceAndStrengthThresholdControlARealRaid(): void
    {
        [$bot, $report] = $this->raidFixture();
        $report->forceFill(['ships' => ['light_fighter' => 14], 'defense' => []])->save();
        $bot->strategy = ['fleet' => 2, 'economy' => 1, 'research' => 1, 'raid_every' => 3, 'strength' => 3];
        $bot->save();
        $service = resolve(AutonomousBotService::class);
        $service->tickDue(1, $bot->id, true); // Decision two is not a raid turn anymore.
        $this->assertDatabaseMissing('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 1]);
        $service->tickDue(1, $bot->id, true); // Decision three rejects a less than threefold advantage.
        $this->assertSame('waiting', $bot->refresh()->last_action);
        $bot->cycles = 2;
        $bot->strategy = [...($bot->strategy ?? []), 'strength' => 2];
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'raid']);
        $this->assertDatabaseHas('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 1, 'light_fighter' => 30]);
    }

    public function testUnknownForcesMissingResearchAndSuperiorDefendersNeverAuthorizeAnAttack(): void
    {
        [$bot, $report] = $this->raidFixture();
        foreach ([
            ['ships' => null, 'defense' => [], 'research' => []],
            ['ships' => [], 'defense' => ['rocket_launcher' => 1], 'research' => null],
            ['ships' => [], 'defense' => ['rocket_launcher' => 100], 'research' => []],
            ['ships' => [], 'defense' => ['small_shield_dome' => 1], 'research' => []],
        ] as $snapshot) {
            $report->forceFill($snapshot)->save();
            $bot->refresh();
            $bot->cycles = 1;
            $bot->save();
            resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
            $this->assertSame(0, FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 1)->count());
        }
    }

    public function testEconomyProfileAndActiveHumanPlayersRemainExcludedFromArmedRaids(): void
    {
        [$bot, $report] = $this->raidFixture();
        $bot->profile = 'economy';
        $bot->cycles = 3;
        $bot->save();
        $service = resolve(AutonomousBotService::class);
        $service->tickDue(1, $bot->id, true);
        $this->assertSame(0, FleetMission::where('user_id', $this->currentUserId)->count());
        // Even enabling inactive human targets cannot opt an active human in.
        AutonomousBot::where('user_id', $report->planet_user_id)->delete();
        User::whereKey($report->planet_user_id)->update(['time' => (int)Date::now()->timestamp]);
        $bot->refresh();
        $bot->profile = 'balanced';
        $bot->cycles = 1;
        $bot->raid_inactive_players = true;
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseMissing('fleet_missions', ['user_id' => $this->currentUserId]);
    }

    public function testIncompleteOlderReportIsScoutedAgainWithEnoughAvailableProbes(): void
    {
        [$bot, $report] = $this->raidFixture();
        $report->forceFill(['research' => null, 'created_at' => Date::now()->subMinutes(6)])->save();
        $this->planetAddUnit('espionage_probe', 8);
        resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 6, 'espionage_probe' => 8]);
        $this->assertDatabaseMissing('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 1]);
    }

    public function testARecentRaidAndSixAttacksInOneDayBlockFurtherRaidsOfThatPlanet(): void
    {
        [$bot, $report, $targetId] = $this->raidFixture();
        $past = $this->flight($targetId, 1, 0);
        $past->processed = 1;
        $past->time_departure = (int)Date::now()->timestamp - 60;
        $past->save();
        $service = resolve(AutonomousBotService::class);
        $service->tickDue(1, $bot->id, true);
        $this->assertSame(1, FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 1)->count());
        $past->time_departure = (int)Date::now()->timestamp - 3600;
        $past->save();
        for ($i = 0; $i < 5; $i++) {
            $old = $this->flight($targetId, 1, 0);
            $old->processed = 1;
            $old->time_departure = (int)Date::now()->timestamp - 7200 - $i;
            $old->save();
        }
        $bot->refresh();
        $bot->cycles = 1;
        $bot->save();
        $service->tickDue(1, $bot->id, true);
        $this->assertSame(6, FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 1)->count());
    }

    public function testShipsAwayOnMissionsCountTowardTheBuildTarget(): void
    {
        $bot = $this->bot(['ship_limit' => 20]);
        $this->prepareShipyard();
        $this->planetAddUnit('light_fighter', 15);
        $this->flight(null, 3, 4);
        resolve(AutonomousBotService::class)->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('unit_queues', ['planet_id' => $this->currentPlanetId, 'object_id' => 204, 'object_amount' => 1]);
    }

    /** @param array<string, bool|int|string> $overrides */
    private function bot(array $overrides = []): AutonomousBot
    {
        return AutonomousBot::create(['user_id' => $this->currentUserId, 'enabled' => true, 'profile' => 'balanced',
            'interval_seconds' => 120, 'max_level' => 25, 'ship_limit' => 100, 'batch_size' => 10,
            'auto_build' => true, 'auto_research' => true, 'auto_shipbuilding' => true, 'auto_raid' => true,
            'auto_fleet_save' => false, ...$overrides]);
    }

    private function prepareShipyard(): void
    {
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000));
        $this->planetSetObjectLevel('shipyard', 2);
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->planetSetObjectLevel('research_lab', 3);
        $this->playerSetResearchLevel('combustion_drive', 3);
        $this->playerSetResearchLevel('espionage_technology', 2);
    }

    /** @return array{AutonomousBot, EspionageReport, int} */
    private function raidFixture(): array
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $bot = $this->bot(['cycles' => 1, 'auto_build' => false, 'auto_research' => false, 'auto_shipbuilding' => false]);
        $this->prepareShipyard();
        $this->planetAddUnit('light_fighter', 40);
        $this->planetAddUnit('small_cargo', 5);
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        AutonomousBot::create(['user_id' => $owner->getId(), 'enabled' => false]);
        $coords = $target->getPlanetCoordinates();
        $report = new EspionageReport();
        $report->forceFill(['planet_galaxy' => $coords->galaxy, 'planet_system' => $coords->system, 'planet_position' => $coords->position,
            'planet_type' => 1, 'planet_user_id' => $owner->getId(), 'player_info' => [], 'resources' => ['metal' => 20000, 'energy' => -50000],
            'ships' => [], 'defense' => ['rocket_launcher' => 1], 'research' => [], 'buildings' => [], 'debris' => []])->save();
        $message = new Message();
        $message->forceFill(['user_id' => $this->currentUserId, 'key' => 'espionage_report', 'espionage_report_id' => $report->id])->save();
        return [$bot, $report, $target->getPlanetId()];
    }

    private function flight(int|null $targetId, int $type, int $fighters): FleetMission
    {
        $mission = new FleetMission();
        $mission->forceFill(['user_id' => $this->currentUserId, 'planet_id_from' => $this->currentPlanetId, 'planet_id_to' => $targetId,
            'galaxy_from' => 1, 'system_from' => 2, 'position_from' => 8, 'galaxy_to' => 1, 'system_to' => 2, 'position_to' => 5,
            'mission_type' => $type, 'light_fighter' => $fighters, 'time_departure' => (int)Date::now()->timestamp,
            'time_arrival' => (int)Date::now()->timestamp + 10000])->save();
        return $mission;
    }
}
