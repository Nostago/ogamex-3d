<?php

namespace OGame\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use OGame\Enums\CharacterClass;
use OGame\Factories\GameMissionFactory;
use OGame\Factories\PlayerServiceFactory;
use OGame\GameObjects\Models\Enums\GameObjectType;
use OGame\GameObjects\Models\Units\UnitCollection;
use OGame\Models\AutonomousBot;
use OGame\Models\Enums\PlanetType;
use OGame\Models\Planet\Coordinate;
use OGame\Models\Resources;
use OGame\Models\User;
use Throwable;

/** NPC decisions only. All costs, prerequisites, production and flights use OGameX services. */
class AutonomousBotService
{
    /** @param array<string, mixed> $options */
    public function create(string $name, array $options, int $seedResources = 0): AutonomousBot
    {
        return DB::transaction(function () use ($name, $options, $seedResources): AutonomousBot {
            $user = User::create(['username' => $name, 'email' => 'npc-'.Str::uuid().'@bots.invalid', 'password' => Hash::make(Str::random(64)), 'lang' => 'de']);
            $user->character_class = CharacterClass::COLLECTOR->value;
            $user->character_class_free_used = true;
            $user->save();
            resolve(InitialUserDataService::class)->createFor($user);
            $player = resolve(PlayerServiceFactory::class)->make($user->id, true);
            $world = $player->planets->current();
            $user->planet_current = $world->getPlanetId();
            $user->save();
            if ($seedResources > 0) {
                $world->addResources(new Resources($seedResources, $seedResources, $seedResources));
            }
            $bot = new AutonomousBot();
            $bot->fill($options);
            $bot->user_id = $user->id;
            $bot->next_tick_at = Date::now();
            $bot->save();
            $bot->refresh();
            Log::notice('Autonomous NPC created', ['bot_id' => $bot->id, 'user_id' => $user->id, 'seed_resources' => $seedResources]);
            return $bot;
        }, 3);
    }

    /** Ensure an active population without duplicating NPCs on repeated deployment. */
    public function populate(int $target = 50): int
    {
        return Cache::lock('ogamex:autonomous-bot:population', 300)->block(10, function () use ($target): int {
            $target = max(1, min(100, $target));
            $active = AutonomousBot::where('enabled', true)->count();
            foreach (AutonomousBot::where('enabled', false)->orderBy('id')->get() as $existing) {
                if ($active >= $target) {
                    break;
                }
                $player = resolve(PlayerServiceFactory::class)->make($existing->user_id, true);
                if ($player->isAdmin() || $player->isInVacationMode()) {
                    continue;
                }
                $existing->enabled = true;
                $existing->next_tick_at = Date::now();
                $existing->save();
                $active++;
            }
            $names = ['Astra', 'Vega', 'Orion', 'Lyra', 'Nova', 'Altair', 'Sirius', 'Antares', 'Mira', 'Rigel'];
            while ($active < $target && AutonomousBot::count() < 100) {
                $name = $names[$active % count($names)].'-'.Str::lower(Str::random(6));
                if (User::where('username', $name)->exists()) {
                    continue;
                }
                $this->create($name, ['enabled' => true, 'profile' => 'balanced', 'interval_seconds' => 120,
                    'max_level' => 25, 'ship_limit' => 250, 'batch_size' => 10, 'auto_build' => true,
                    'auto_research' => true, 'auto_shipbuilding' => true, 'auto_raid' => true,
                    'auto_fleet_save' => true, 'raid_inactive_players' => false]);
                $active++;
            }
            return $active;
        });
    }

    public function tickDue(int $limit = 20, int|null $onlyBot = null, bool $force = false): int
    {
        if (!$force) {
            resolve(SettingsService::class)->set('autonomous_bots_heartbeat', (string)Date::now()->timestamp);
        }
        $query = AutonomousBot::where('enabled', true);
        if ($onlyBot !== null) {
            $query->whereKey($onlyBot);
        }
        if (!$force) {
            $query->where(fn ($q) => $q->whereNull('next_tick_at')->orWhere('next_tick_at', '<=', Date::now()));
        }
        $count = 0;
        foreach ($query->orderBy('next_tick_at')->limit(max(1, min(100, $limit)))->pluck('id') as $id) {
            $lock = Cache::lock('ogamex:autonomous-bot:'.$id, 120);
            if (!$lock->get()) {
                continue;
            }
            try {
                $count += (int)DB::transaction(function () use ($id, $force): bool {
                    $bot = AutonomousBot::whereKey($id)->lockForUpdate()->first();
                    if ($bot === null || !$bot->enabled || (!$force && $bot->next_tick_at?->isFuture())) {
                        return false;
                    }
                    User::whereKey($bot->user_id)->lockForUpdate()->firstOrFail();
                    $bot->next_tick_at = Date::now()->addSeconds($bot->interval_seconds);
                    $bot->last_tick_at = Date::now();
                    $bot->cycles++;
                    $bot->last_action = 'waiting';
                    $bot->last_object = null;
                    $bot->last_amount = 0;
                    $player = resolve(PlayerServiceFactory::class)->make($bot->user_id, true);
                    // A bot must never operate an administrator or a vacationing account.
                    if ($player->isAdmin() || $player->isInVacationMode()) {
                        $bot->enabled = false;
                        $bot->last_action = 'paused';
                    } else {
                        $this->decide($bot, $player);
                    }
                    $bot->save();
                    return true;
                }, 3);
            } catch (Throwable $error) {
                // Preserve the next retry time even if the action transaction rolled back.
                AutonomousBot::whereKey($id)->update(['next_tick_at' => Date::now()->addMinutes(5), 'last_tick_at' => Date::now(), 'last_action' => 'error']);
                Log::warning('Autonomous NPC action rejected', ['bot_id' => $id, 'reason' => $error->getMessage()]);
            } finally {
                $lock->release();
            }
        }
        return $count;
    }

    private function decide(AutonomousBot $bot, PlayerService $player): void
    {
        $fleets = resolve(AutonomousBotFleetService::class);
        if ($fleets->protect($bot, $player)) {
            return;
        }
        $worlds = array_values(array_filter($player->planets->all(), fn (PlanetService $planet): bool => !$planet->isMoon()));
        if ($worlds === []) {
            return;
        }
        $offensive = $bot->auto_raid && $bot->profile !== 'economy';
        $customStrategy = $bot->strategy !== null;
        $strategy = AutonomousBotStrategy::settings($bot);
        $turn = $customStrategy ? AutonomousBotStrategy::turn($strategy, $bot->cycles) : null;
        $period = $customStrategy ? AutonomousBotStrategy::period($strategy) : 4;
        // Rotate each strategy turn across colonies as well, so a four-turn
        // strategy cannot reserve all economy turns for the same colony.
        $decisionWorld = ($offensive || $customStrategy) ? intdiv($bot->cycles - 1, $period) + ($bot->cycles - 1) % $period : $bot->cycles - 1;
        $planet = $worlds[$decisionWorld % count($worlds)];
        $player->setCurrentPlanetId($planet->getPlanetId());
        $planet->update();
        $raidEvery = $strategy['raid_every'];
        if ($bot->cycles % $raidEvery === 0) {
            // Rotate raid worlds separately from the ordinary decision world.
            $raidPlanet = $worlds[(intdiv($bot->cycles, $raidEvery) - 1) % count($worlds)];
            $player->setCurrentPlanetId($raidPlanet->getPlanetId());
            $raidPlanet->update();
            if ($fleets->raid($bot, $player, $raidPlanet)) {
                return;
            }
            $player->setCurrentPlanetId($planet->getPlanetId());
        }
        if ($bot->profile === 'explorer' && $this->expedition($bot, $player, $planet)) {
            return;
        }
        $economy = ['metal_mine', 'crystal_mine', 'deuterium_synthesizer', 'solar_plant'];
        if ($planet->energyProduction()->get() <= $planet->energyConsumption()->get()) {
            array_unshift($economy, 'solar_plant');
        } else {
            usort($economy, fn (string $left, string $right): int => $planet->getObjectLevel($left) <=> $planet->getObjectLevel($right));
        }
        $research = ['energy_technology' => 3, 'combustion_drive' => 6, 'computer_technology' => 4, 'espionage_technology' => 4, 'impulse_drive' => 3, 'astrophysics' => 3, 'weapon_technology' => 3, 'shielding_technology' => 3, 'armor_technology' => 3];
        // Reserve enough for the next starter fleet purchase before spending on
        // unrelated buildings and research. Nothing is removed from the planet.
        $fleetBudget = ($offensive || ($customStrategy && $strategy['fleet'] > 0))
            ? $this->starterFleetBudget($bot, $player, $planet)
            : null;
        if (($customStrategy ? $turn === 'fleet' : ($offensive && in_array($bot->cycles % 4, [1, 2], true))) && $this->military($bot, $player, $planet)) {
            return;
        }
        if ($offensive) {
            // Two fleet turns, one economy turn and one research turn. Keep an
            // income-building turn even while a complete fleet is affordable.
            $research = ['computer_technology' => 2, 'weapon_technology' => 3, 'armor_technology' => 3,
                'shielding_technology' => 3, 'impulse_drive' => 4, 'laser_technology' => 3,
                'ion_technology' => 2, 'espionage_technology' => 4, 'combustion_drive' => 6, 'astrophysics' => 3];
        }
        if ($customStrategy ? $turn === 'research' : ($offensive ? $bot->cycles % 4 === 0 : $bot->cycles % 3 === 0)) {
            foreach ($research as $key => $level) {
                if ($player->getResearchLevel($key) < min($level, $bot->max_level) && $this->pursue($bot, $player, $planet, $key, 0, null, $fleetBudget)) {
                    return;
                }
            }
            foreach (($offensive || $customStrategy) ? [] : ['small_cargo', 'light_fighter', 'espionage_probe'] as $key) {
                if ($planet->getObjectAmount($key) < $bot->ship_limit && $this->pursue($bot, $player, $planet, $key, 0, null, $fleetBudget)) {
                    return;
                }
            }
        }
        foreach ([...$economy, 'metal_store', 'crystal_store', 'deuterium_store', 'robot_factory', 'research_lab', 'shipyard'] as $key) {
            if ($planet->getObjectLevel($key) < $bot->max_level && $this->pursue($bot, $player, $planet, $key, 0, null, $fleetBudget)) {
                return;
            }
        }
        if ($fleetBudget !== null && $bot->last_action === 'waiting') {
            $bot->last_action = 'saving';
            $bot->last_object = $fleetBudget['key'];
        }
    }

    /**
     * A small earmarked purchase towards the first fighter/cargo/probes.
     * No resource is deducted; regular OGameX queues still validate each order.
     * @return array{key: string, cost: Resources}|null
     */
    private function starterFleetBudget(AutonomousBot $bot, PlayerService $player, PlanetService $planet): ?array
    {
        if (!$bot->auto_shipbuilding || $bot->ship_limit < 1) {
            return null;
        }
        // Do not freeze the economy before basic mines and reliable energy exist.
        if ($planet->getObjectLevel('metal_mine') < 3
            || $planet->getObjectLevel('crystal_mine') < 3
            || $planet->getObjectLevel('deuterium_synthesizer') < 1
            || $planet->getObjectLevel('solar_plant') < 3
            || $planet->energyProduction()->get() <= $planet->energyConsumption()->get()) {
            return null;
        }
        $inventory = resolve(Live3dShipInventory::class)->forPlanet($player, $planet);
        foreach (['light_fighter' => 20, 'small_cargo' => 5, 'espionage_probe' => 8] as $key => $target) {
            if ((int)$inventory[$key]['total'] >= min($target, $bot->ship_limit)) {
                continue;
            }
            $next = $this->nextMilitaryStep($bot, $player, $planet, $key);
            if ($next === null) {
                continue;
            }
            $cost = ObjectService::getObjectPrice($next, $planet);
            // Insufficient storage needs the ordinary economy builder, not a
            // permanent savings lock for resources the planet cannot hold.
            if ($cost->metal->get() > $planet->metalStorage()->get()
                || $cost->crystal->get() > $planet->crystalStorage()->get()
                || $cost->deuterium->get() > $planet->deuteriumStorage()->get()) {
                return null;
            }
            return ['key' => $next, 'cost' => $cost];
        }
        return null;
    }

    private function nextMilitaryStep(AutonomousBot $bot, PlayerService $player, PlanetService $planet, string $key, int $depth = 0): ?string
    {
        if ($depth > 12) {
            return null;
        }
        $object = ObjectService::getObjectByMachineName($key);
        if (!ObjectService::objectValidPlanetType($key, $planet) || !ObjectService::objectCharacterClassMet($key, $planet)) {
            return null;
        }
        foreach ($object->requirements as $requirement) {
            $required = ObjectService::getObjectByMachineName($requirement->object_machine_name);
            $level = $required->type === GameObjectType::Research
                ? $player->getResearchLevel($required->machine_name)
                : $planet->getObjectLevel($required->machine_name);
            if ($level < $requirement->level) {
                if ($level >= $bot->max_level) {
                    return null;
                }
                return $this->nextMilitaryStep($bot, $player, $planet, $required->machine_name, $depth + 1);
            }
        }
        if ($object->type === GameObjectType::Research) {
            return $bot->auto_research && $player->getResearchLevel($key) < $bot->max_level ? $key : null;
        }
        if (in_array($object->type, [GameObjectType::Ship, GameObjectType::Defense], true)) {
            return $bot->auto_shipbuilding ? $key : null;
        }
        return $bot->auto_build
            && $planet->getObjectLevel($key) < $bot->max_level
            && $planet->getBuildingCount() < $planet->getPlanetFieldMax() ? $key : null;
    }

    private function military(AutonomousBot $bot, PlayerService $player, PlanetService $planet): bool
    {
        if (!$bot->auto_shipbuilding || $bot->ship_limit < 1) {
            return false;
        }
        $inventory = resolve(Live3dShipInventory::class)->forPlanet($player, $planet);
        // Reach an operational force before pursuing expensive optional research
        // or filling the entire transporter stock target.
        foreach (['light_fighter' => 20, 'small_cargo' => 5, 'espionage_probe' => 8] as $key => $target) {
            if ((int)$inventory[$key]['total'] >= min($target, $bot->ship_limit)) {
                continue;
            }
            if ($this->pursue($bot, $player, $planet, $key, 0, $target)) {
                return true;
            }
            // Once there is a feasible starter-fleet purchase to save for,
            // do not divert the reserved income into a different ship type
            // during this military turn either.
            if ($this->starterFleetBudget($bot, $player, $planet) !== null) {
                return false;
            }
        }
        // Prefer stronger ships once ordinary research has unlocked them. Do not
        // delay the first fighters to develop cruisers from scratch.
        foreach (['cruiser', 'heavy_fighter', 'light_fighter'] as $key) {
            if ((int)$inventory[$key]['total'] < $bot->ship_limit && ObjectService::objectRequirementsMet($key, $planet) && $this->pursue($bot, $player, $planet, $key)) {
                return true;
            }
        }
        return false;
    }

    private function pursue(AutonomousBot $bot, PlayerService $player, PlanetService $planet, string $key, int $depth = 0, int|null $unitTarget = null, ?array $fleetBudget = null): bool
    {
        if ($depth > 12) {
            return false;
        }
        $object = ObjectService::getObjectByMachineName($key);
        if (!ObjectService::objectValidPlanetType($key, $planet) || !ObjectService::objectCharacterClassMet($key, $planet)) {
            return false;
        }
        foreach ($object->requirements as $requirement) {
            $required = ObjectService::getObjectByMachineName($requirement->object_machine_name);
            $level = $required->type === GameObjectType::Research ? $player->getResearchLevel($required->machine_name) : $planet->getObjectLevel($required->machine_name);
            if ($level < $requirement->level) {
                if ($level >= $bot->max_level) {
                    return false;
                }
                return $this->pursue($bot, $player, $planet, $required->machine_name, $depth + 1, null, $fleetBudget);
            }
        }
        $price = ObjectService::getObjectPrice($key, $planet);
        if (!ObjectService::objectRequirementsMet($key, $planet) || !$planet->hasResources($price)) {
            return false;
        }
        if ($fleetBudget !== null) {
            $reserved = $fleetBudget['cost'];
            $combined = new Resources(
                $price->metal->get() + $reserved->metal->get(),
                $price->crystal->get() + $reserved->crystal->get(),
                $price->deuterium->get() + $reserved->deuterium->get()
            );
            if (!$planet->hasResources($combined)) {
                $bot->last_action = 'saving';
                $bot->last_object = $fleetBudget['key'];
                return false;
            }
        }
        if ($object->type === GameObjectType::Research) {
            $queue = resolve(ResearchQueueService::class);
            if (!$bot->auto_research || $player->getResearchLevel($key) >= $bot->max_level || $queue->retrieveQueue($planet)->queue !== []) {
                return false;
            }
            $queue->add($player, $planet, $object->id);
            $bot->last_action = 'research';
        } elseif (in_array($object->type, [GameObjectType::Ship, GameObjectType::Defense], true)) {
            $queue = resolve(UnitQueueService::class);
            if (!$bot->auto_shipbuilding || $queue->retrieveQueue($planet)->queue !== []) {
                return false;
            }
            // Ships in flight also count toward the per-world stock target.
            $stock = $object->type === GameObjectType::Ship
                ? (int)resolve(Live3dShipInventory::class)->forPlanet($player, $planet)[$key]['total']
                : $planet->getObjectAmount($key);
            $amount = min($bot->batch_size, min($bot->ship_limit, $unitTarget ?? $bot->ship_limit) - $stock, ObjectService::getObjectMaxBuildAmount($key, $planet, true));
            if ($amount < 1) {
                return false;
            }
            $queue->add($planet, $object->id, $amount);
            $bot->last_action = 'unit';
            $bot->last_amount = $amount;
        } else {
            $queue = resolve(BuildingQueueService::class);
            if (!$bot->auto_build || $planet->getObjectLevel($key) >= $bot->max_level || $queue->retrieveQueue($planet)->queue !== [] || $planet->getBuildingCount() >= $planet->getPlanetFieldMax()) {
                return false;
            }
            $queue->add($planet, $object->id);
            $bot->last_action = 'build';
        }
        $bot->last_object = $key;
        return true;
    }

    private function expedition(AutonomousBot $bot, PlayerService $player, PlanetService $planet): bool
    {
        if ($player->getResearchLevel('astrophysics') < 1 || $player->getFleetSlotsInUse() >= $player->getFleetSlotsMax()) {
            return false;
        }
        $missions = resolve(FleetMissionService::class, ['player' => $player, 'messageService' => new MessageService($player)]);
        // Keep one autonomous expedition at a time, independent of fleet sizes.
        if ($missions->getActiveFleetMissionsSentByCurrentPlayer()->isNotEmpty()) {
            return false;
        }
        $amount = min($bot->batch_size, $planet->getObjectAmount('small_cargo'));
        if ($amount < 1) {
            return false;
        }
        $units = new UnitCollection();
        $units->addUnit(ObjectService::getShipObjectByMachineName('small_cargo'), $amount);
        $source = $planet->getPlanetCoordinates();
        $target = new Coordinate($source->galaxy, $source->system, 16);
        $mission = GameMissionFactory::getMissionById(15, []);
        if (!$mission->isMissionPossible($planet, $target, PlanetType::Planet, $units)->possible) {
            return false;
        }
        $fuel = (int)ceil($missions->calculateConsumption($planet, $units, $target, 1, 10));
        if ($fuel > $planet->deuterium()->get() || $fuel > $units->getTotalFuelCapacity($player)) {
            return false;
        }
        $missions->createNewFromPlanet($planet, $target, PlanetType::Planet, 15, $units, new Resources(), 10, 1);
        $bot->last_action = 'expedition';
        $bot->last_amount = $amount;
        return true;
    }
}
