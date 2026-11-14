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
            Log::notice('Autonomous NPC created', ['bot_id' => $bot->id, 'user_id' => $user->id, 'seed_resources' => $seedResources]);
            return $bot;
        }, 3);
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
        $worlds = array_values(array_filter($player->planets->all(), fn (PlanetService $planet): bool => !$planet->isMoon()));
        if ($worlds === []) {
            return;
        }
        // Round-robin owned colonies; never operate on a human player's planet.
        $planet = $worlds[($bot->cycles - 1) % count($worlds)];
        $player->setCurrentPlanetId($planet->getPlanetId());
        $planet->update();
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
        // Every third cycle pursues research/shipyard prerequisites instead of spending all income on mines.
        if ($bot->profile !== 'economy' && $bot->cycles % 3 === 0) {
            foreach ($research as $key => $level) {
                if ($player->getResearchLevel($key) < min($level, $bot->max_level) && $this->pursue($bot, $player, $planet, $key)) {
                    return;
                }
            }
            foreach (['small_cargo', 'light_fighter', 'espionage_probe'] as $key) {
                if ($planet->getObjectAmount($key) < $bot->ship_limit && $this->pursue($bot, $player, $planet, $key)) {
                    return;
                }
            }
        }
        foreach ([...$economy, 'metal_store', 'crystal_store', 'deuterium_store', 'robot_factory', 'research_lab', 'shipyard'] as $key) {
            if ($planet->getObjectLevel($key) < $bot->max_level && $this->pursue($bot, $player, $planet, $key)) {
                return;
            }
        }
    }

    private function pursue(AutonomousBot $bot, PlayerService $player, PlanetService $planet, string $key, int $depth = 0): bool
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
                return $this->pursue($bot, $player, $planet, $required->machine_name, $depth + 1);
            }
        }
        if (!ObjectService::objectRequirementsMet($key, $planet) || !$planet->hasResources(ObjectService::getObjectPrice($key, $planet))) {
            return false;
        }
        if ($object->type === GameObjectType::Research) {
            $queue = resolve(ResearchQueueService::class);
            if ($player->getResearchLevel($key) >= $bot->max_level || $queue->retrieveQueue($planet)->queue !== []) {
                return false;
            }
            $queue->add($player, $planet, $object->id);
            $bot->last_action = 'research';
        } elseif (in_array($object->type, [GameObjectType::Ship, GameObjectType::Defense], true)) {
            $queue = resolve(UnitQueueService::class);
            if ($queue->retrieveQueue($planet)->queue !== []) {
                return false;
            }
            $amount = min($bot->batch_size, $bot->ship_limit - $planet->getObjectAmount($key), ObjectService::getObjectMaxBuildAmount($key, $planet, true));
            if ($amount < 1) {
                return false;
            }
            $queue->add($planet, $object->id, $amount);
            $bot->last_action = 'unit';
            $bot->last_amount = $amount;
        } else {
            $queue = resolve(BuildingQueueService::class);
            if ($planet->getObjectLevel($key) >= $bot->max_level || $queue->retrieveQueue($planet)->queue !== [] || $planet->getBuildingCount() >= $planet->getPlanetFieldMax()) {
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
