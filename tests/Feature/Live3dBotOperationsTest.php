<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use OGame\Factories\GameMissionFactory;
use OGame\Factories\PlayerServiceFactory;
use OGame\GameObjects\Models\Units\UnitCollection;
use OGame\Models\AutonomousBot;
use OGame\Models\EspionageReport;
use OGame\Models\FleetMission;
use OGame\Models\Message;
use OGame\Models\Planet;
use OGame\Models\Resources;
use OGame\Models\User;
use OGame\Services\AutonomousBotService;
use OGame\Services\FleetMissionService;
use OGame\Services\Live3dShipInventory;
use OGame\Services\ObjectService;
use Tests\IsolatedAccountTestCase;

class Live3dBotOperationsTest extends IsolatedAccountTestCase
{
    public function testFreeNamesRenameAndUniquenessRemainAdminOnly(): void
    {
        Auth::user()?->assignRole('admin');
        $input = ['_token' => (string)csrf_token(), 'action' => 'create', 'name' => 'Freier Name '.bin2hex(random_bytes(3)), ...$this->botOptions(), 'seed_resources' => 0];
        $id = (int)$this->postJson('/play-3d/bots', $input)->assertOk()->json('id');
        $this->postJson('/play-3d/bots', $input)->assertUnprocessable();
        $bot = AutonomousBot::findOrFail($id);
        $renamed = 'Äquator '.bin2hex(random_bytes(3));
        $this->postJson('/play-3d/bots', [...$input, 'action' => 'save', 'id' => $id, 'name' => $renamed, 'auto_raid' => true])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $bot->user_id, 'username' => $renamed]);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $id, 'auto_raid' => 1]);
        $this->postJson('/play-3d/bots', [...$input, 'action' => 'save', 'id' => $id, 'name' => $this->currentUsername])->assertUnprocessable();
        Auth::user()?->removeRole('admin');
        $this->postJson('/play-3d/bots', ['_token' => (string)csrf_token(), 'action' => 'populate'])->assertForbidden();
    }

    public function testPopulationIsFiftyUniqueActiveAccountsAndIdempotent(): void
    {
        $service = resolve(AutonomousBotService::class);
        $beforeHuman = User::findOrFail($this->currentUserId)->toArray();
        $this->assertSame(50, $service->populate(50));
        $ids = AutonomousBot::pluck('user_id')->all();
        $this->assertCount(50, $ids);
        $this->assertSame(50, AutonomousBot::where('enabled', true)->where('auto_build', true)->where('auto_research', true)->where('auto_shipbuilding', true)->where('auto_raid', true)->where('auto_fleet_save', true)->count());
        $this->assertSame(50, $service->populate(50));
        $this->assertSame($ids, AutonomousBot::pluck('user_id')->all());
        $this->assertSame(50, User::whereIn('id', $ids)->distinct('username')->count('username'));
        $this->assertSame(0, User::whereIn('id', $ids)->where('username', 'like', 'BOT-%')->count());
        $this->assertSame($beforeHuman, User::findOrFail($this->currentUserId)->toArray());
    }

    public function testShipInventoryCountsOnlyOwnCurrentWorldAndDoesNotDoubleCountReturnLegs(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $this->planetAddUnit('small_cargo', 100);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $player = $this->planetService->getPlayer();
        $this->assertNotNull($player);
        $destination = $this->secondPlanetService;
        $this->assertNotNull($destination);
        $units = new UnitCollection();
        $units->addUnit(ObjectService::getShipObjectByMachineName('small_cargo'), 10);
        $missions = resolve(FleetMissionService::class, ['player' => $player]);
        $mission = $missions->createNewFromPlanet($this->planetService, $destination->getPlanetCoordinates(), $destination->getPlanetType(), 3, $units, new Resources(), 10);
        $inventory = resolve(Live3dShipInventory::class);
        $this->assertSame(['available' => '90', 'onMission' => '10', 'total' => '100'], $inventory->forPlanet($player, $this->planetService)['small_cargo']);
        $this->assertSame('0', $inventory->forPlanet($player, $destination)['small_cargo']['onMission']);
        $this->travelTo(Date::now()->addSecond());
        $missions->cancelMission($mission);
        $this->assertSame('10', $inventory->forPlanet($player, $this->planetService)['small_cargo']['onMission']);
        $return = FleetMission::where('parent_id', $mission->id)->firstOrFail();
        $this->travelTo(Date::createFromTimestamp($return->time_arrival + 1));
        GameMissionFactory::getMissionById(3, [])->process($return);
        $player = resolve(PlayerServiceFactory::class)->make($player->getId(), true);
        $this->assertSame(['available' => '100', 'onMission' => '0', 'total' => '100'], $inventory->forPlanet($player, $player->planets->getById($this->currentPlanetId))['small_cargo']);
    }

    public function testAstrophysicsFiveAllowsOriginalPositionsAndExplainsTheOuterPositions(): void
    {
        $this->planetAddUnit('colony_ship', 1);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $this->playerSetResearchLevel('astrophysics', 5);
        $coords = $this->getNearbyEmptyCoordinate(3, 3);
        $payload = $this->payload($coords->galaxy, $coords->system, 3, 7) + ['am208' => 1];
        $this->postJson('/play-3d/fleet/preview', $payload)->assertOk()->assertJsonPath('orders.7', true)->assertJsonPath('missionPossible', true);
        foreach ([1 => 8, 2 => 6, 14 => 6, 15 => 8] as $position => $required) {
            $coords = $this->getNearbyEmptyCoordinate($position, $position);
            $this->postJson('/play-3d/fleet/preview', [...$payload, 'galaxy' => $coords->galaxy, 'system' => $coords->system, 'position' => $position])->assertOk()->assertJsonPath('missionPossible', false)->assertJsonPath('reason', __('t_operations.colony_astrophysics', ['position' => $position, 'required' => $required, 'current' => 5]));
        }
    }

    public function testSpyShowsActualProtectedPlanetReasonAndOrdinaryTargetCanLaunch(): void
    {
        $target = $this->createForeignPlanet();
        $coords = $target->getPlanetCoordinates();
        $this->planetAddUnit('espionage_probe', 5);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $payload = $this->payload($coords->galaxy, $coords->system, $coords->position, 6) + ['am210' => 2];
        $this->postJson('/play-3d/fleet/preview', $payload)->assertOk()->assertJsonPath('missionPossible', true);
        $this->postJson('/play-3d/fleet/preview', [...$payload, 'deuterium' => 1000000])->assertOk()->assertJsonPath('missionPossible', false)->assertJsonPath('reason', __('t_operations.mission_fuel_missing'));
        $this->postJson('/play-3d/fleet/preview', [...$payload, 'metal' => 1000000])->assertOk()->assertJsonPath('missionPossible', false)->assertJsonPath('reason', __('t_operations.mission_cargo_exceeded'));
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        // Use the existing protected world read-only if present; otherwise name only our new fixture.
        $existing = User::where('username', 'Legor')->first();
        $protectedPayload = $payload;
        if ($existing !== null) {
            $world = Planet::where('user_id', $existing->id)->where('planet_type', 1)->where('destroyed', 0)->firstOrFail();
            $protectedPayload = [...$payload, 'galaxy' => $world->galaxy, 'system' => $world->system, 'position' => $world->planet];
        } else {
            $protected = $owner->getUser();
            $protected->username = 'Legor';
            $protected->save();
            resolve(PlayerServiceFactory::class)->make($owner->getId(), true);
        }
        $this->postJson('/play-3d/fleet/preview', $protectedPayload)->assertOk()->assertJsonPath('missionPossible', false)->assertJsonPath('reason', __('This planet belongs to an administrator and cannot be probed.'));
        if ($existing === null) {
            $protected = $owner->getUser();
            $protected->username = 'Fixture Target';
            $protected->save();
            resolve(PlayerServiceFactory::class)->make($owner->getId(), true);
        }
        $this->postJson('/play-3d/fleet/send', $payload)->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 6, 'espionage_probe' => 2]);
    }

    public function testDirectMessageNavigationKeepsFullShellAndAjaxKeepsFragment(): void
    {
        $this->get('/ajax/messages?tab=fleets&subtab=transport&ui=live3d')->assertOk()->assertSee('id="buttonz"', false);
        $this->get('/ajax/messages?tab=fleets&subtab=transport&ui=live3d', ['X-Requested-With' => 'XMLHttpRequest'])->assertOk()->assertDontSee('id="buttonz"', false);
    }

    public function testRaidingUsesOnlyOwnedReportsAndOriginalScoutAndAttackMissions(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $bot = AutonomousBot::create(['user_id' => $this->currentUserId, ...$this->botOptions(), 'cycles' => 3, 'auto_raid' => true]);
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        AutonomousBot::create(['user_id' => $owner->getId(), ...$this->botOptions()]);
        $this->planetAddUnit('espionage_probe', 3);
        $this->playerSetResearchLevel('espionage_technology', 12);
        $target->addResources(new Resources(20000, 20000, 20000));
        $this->planetAddUnit('small_cargo', 5);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $coords = $target->getPlanetCoordinates();
        $report = new EspionageReport();
        $report->forceFill(['planet_galaxy' => $coords->galaxy, 'planet_system' => $coords->system, 'planet_position' => $coords->position, 'planet_type' => 1, 'planet_user_id' => $owner->getId(), 'player_info' => [], 'debris' => [], 'buildings' => [], 'research' => [], 'resources' => ['metal' => 20000], 'ships' => [], 'defense' => []]);
        $report->save();
        // A report addressed to somebody else must not authorize a raid.
        $message = new Message();
        $message->forceFill(['user_id' => $owner->getId(), 'key' => 'espionage_report', 'espionage_report_id' => $report->id, 'params' => []]);
        $message->save();
        $service = resolve(AutonomousBotService::class);
        $this->assertSame(1, $service->tickDue(1, $bot->id, true));
        $this->assertSame('scout', $bot->refresh()->last_action);
        $scout = FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 6)->firstOrFail();
        $this->assertSame(3, $scout->espionage_probe);
        $this->assertSame(0, FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 1)->count());
        // Complete both original legs, then grant the NPC its own retained report.
        $this->travelTo(Date::createFromTimestamp($scout->time_arrival + 1));
        GameMissionFactory::getMissionById(6, [])->process($scout);
        $return = FleetMission::where('parent_id', $scout->id)->firstOrFail();
        $this->travelTo(Date::createFromTimestamp($return->time_arrival + 1));
        GameMissionFactory::getMissionById(6, [])->process($return);
        $message->user_id = $this->currentUserId;
        $message->save();
        // The latest real report is authoritative; the target is undefended in this fixture.
        $bot->refresh();
        $bot->cycles = 11;
        $bot->save();
        $this->assertSame(1, $service->tickDue(1, $bot->id, true));
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'raid']);
        $this->assertDatabaseHas('fleet_missions', ['user_id' => $this->currentUserId, 'mission_type' => 1, 'small_cargo' => 5]);
        $service->tickDue(1, $bot->id, true);
        $this->assertSame(1, FleetMission::where('user_id', $this->currentUserId)->where('mission_type', 1)->count());
    }

    public function testFleetSaveEvacuatesAvailableShipsAndRecallsAfterThreatPasses(): void
    {
        $this->travelTo(Date::createFromTimestamp(time()));
        $bot = AutonomousBot::create(['user_id' => $this->currentUserId, ...$this->botOptions(), 'auto_fleet_save' => true]);
        $this->planetAddUnit('small_cargo', 5);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $this->playerSetResearchLevel('astrophysics', 1);
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        $target->addUnit('light_fighter', 1);
        $target->addResources(new Resources(100000, 100000, 100000));
        $units = new UnitCollection();
        $units->addUnit(ObjectService::getShipObjectByMachineName('light_fighter'), 1);
        $missions = resolve(FleetMissionService::class, ['player' => $owner]);
        $threat = $missions->createNewFromPlanet($target, $this->planetService->getPlanetCoordinates(), $this->planetService->getPlanetType(), 1, $units, new Resources(), 10);
        $threat->time_arrival = (int)Date::now()->timestamp + 30;
        $threat->save();
        $service = resolve(AutonomousBotService::class);
        $this->assertSame(1, $service->tickDue(1, $bot->id, true));
        $bot->refresh();
        $this->assertSame('fleet_save', $bot->last_action);
        $saved = FleetMission::findOrFail($bot->fleet_save_mission_id);
        $this->assertSame(5, $saved->small_cargo);
        $this->assertGreaterThan(0, $saved->metal + $saved->crystal + $saved->deuterium);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'small_cargo' => 0]);
        $this->assertSame(1, $service->tickDue(1, $bot->id, true));
        $this->assertSame(1, FleetMission::where('user_id', $this->currentUserId)->whereNull('parent_id')->count());
        // The fixture threat has passed; keep the saved fleet in flight until its original recall.
        $threat->processed = 1;
        $threat->save();
        $this->travelTo(Date::createFromTimestamp((int)$bot->fleet_save_until + 1));
        $service->tickDue(1, $bot->id, true);
        $this->assertDatabaseHas('autonomous_bots', ['id' => $bot->id, 'last_action' => 'fleet_return', 'fleet_save_mission_id' => null]);
        $this->assertDatabaseHas('fleet_missions', ['parent_id' => $saved->id, 'user_id' => $this->currentUserId, 'processed' => 0, 'small_cargo' => 5]);
    }

    public function testDisabledBehavioursNeverSpendResourcesOrQueueProduction(): void
    {
        $bot = AutonomousBot::create(['user_id' => $this->currentUserId, ...$this->botOptions(), 'cycles' => 2,
            'auto_build' => false, 'auto_research' => false, 'auto_shipbuilding' => false, 'auto_raid' => false, 'auto_fleet_save' => false]);
        $this->planetAddResources(new Resources(100000, 100000, 100000));
        $service = resolve(AutonomousBotService::class);
        $this->assertSame(1, $service->tickDue(1, $bot->id, true));
        $this->assertSame('waiting', $bot->refresh()->last_action);
        $worlds = Planet::where('user_id', $this->currentUserId)->pluck('id');
        $this->assertSame(0, \OGame\Models\BuildingQueue::whereIn('planet_id', $worlds)->count());
        $this->assertSame(0, \OGame\Models\ResearchQueue::whereIn('planet_id', $worlds)->count());
        $this->assertSame(0, \OGame\Models\UnitQueue::whereIn('planet_id', $worlds)->count());
        $this->assertSame(0, FleetMission::where('user_id', $this->currentUserId)->count());
    }

    /** @return array<string, bool|int|string> */
    private function botOptions(): array
    {
        return ['enabled' => true, 'profile' => 'balanced', 'interval_seconds' => 120, 'max_level' => 20, 'ship_limit' => 100, 'batch_size' => 10];
    }

    /** @return array<string, int|string> */
    private function payload(int $galaxy, int $system, int $position, int $mission): array
    {
        return ['_token' => (string)csrf_token(), 'planet' => $this->currentPlanetId, 'galaxy' => $galaxy, 'system' => $system, 'position' => $position, 'type' => 1, 'mission' => $mission, 'speed' => 10, 'holdingtime' => 0, 'metal' => 0, 'crystal' => 0, 'deuterium' => 0];
    }
}
