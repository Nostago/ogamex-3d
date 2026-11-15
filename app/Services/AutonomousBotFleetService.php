<?php

namespace OGame\Services;

use Illuminate\Support\Facades\Date;
use OGame\Factories\GameMissionFactory;
use OGame\Factories\PlanetServiceFactory;
use OGame\GameObjects\Models\Units\UnitCollection;
use OGame\Models\AutonomousBot;
use OGame\Models\Enums\PlanetType;
use OGame\Models\EspionageReport;
use OGame\Models\FleetMission;
use OGame\Models\Message;
use OGame\Models\Planet;
use OGame\Models\Planet\Coordinate;
use OGame\Models\Resources;

/** NPC decisions, never a second mission or battle engine. Reports are limited to the NPC's inbox. */
class AutonomousBotFleetService
{
    public function protect(AutonomousBot $bot, PlayerService $player): bool
    {
        if (!$bot->auto_fleet_save) {
            return false;
        }
        $now = (int)Date::now()->timestamp;
        if ($bot->fleet_save_mission_id !== null) {
            // The same row lock is used by original mission processing. Never cancel a processed leg twice.
            $mission = FleetMission::whereKey($bot->fleet_save_mission_id)->where('user_id', $player->getId())->lockForUpdate()->first();
            if ($mission !== null && !$mission->processed) {
                $nextAttack = FleetMission::where('planet_id_to', $mission->planet_id_from)->where('user_id', '!=', $player->getId())
                    ->where('processed', 0)->whereNull('parent_id')->whereIn('mission_type', [1, 2, 9])
                    ->whereBetween('time_arrival', [$now, $now + 2 * $bot->interval_seconds + 120])->max('time_arrival');
                if ($nextAttack !== null) {
                    $bot->fleet_save_until = max((int)$bot->fleet_save_until, (int)$nextAttack + 120);
                }
            }
            if ($now >= (int)$bot->fleet_save_until) {
                if ($mission !== null && !$mission->processed && $mission->parent_id === null) {
                    $this->missions($player)->cancelMission($mission);
                    $mission->refresh();
                    if ($mission->canceled) {
                        $bot->last_action = 'fleet_return';
                    }
                }
                $bot->fleet_save_mission_id = null;
                $bot->fleet_save_until = null;
                return $bot->last_action === 'fleet_return';
            }
            return true;
        }
        $threat = FleetMission::whereIn('planet_id_to', $player->planets->allIds())->where('user_id', '!=', $player->getId())
            ->where('processed', 0)->whereNull('parent_id')->whereIn('mission_type', [1, 2, 9])
            ->whereBetween('time_arrival', [$now, $now + 2 * $bot->interval_seconds + 120])->orderBy('time_arrival')->first();
        if ($threat === null) {
            return false;
        }
        $planet = $player->planets->getById((int)$threat->planet_id_to);
        $planet->update();
        $units = new UnitCollection();
        foreach (ObjectService::getShipObjects() as $ship) {
            if (!in_array($ship->machine_name, ['solar_satellite', 'crawler'], true) && $planet->getObjectAmount($ship->machine_name) > 0) {
                $units->addUnit($ship, $planet->getObjectAmount($ship->machine_name));
            }
        }
        if ($units->getAmount() < 1) {
            return false;
        }
        $missions = $this->missions($player);
        foreach ($player->planets->all() as $destination) {
            if ($destination->getPlanetId() === $planet->getPlanetId()) {
                continue;
            }
            if (FleetMission::where('planet_id_to', $destination->getPlanetId())->where('user_id', '!=', $player->getId())->where('processed', 0)->whereNull('parent_id')->whereIn('mission_type', [1, 2, 9])->exists()) {
                continue;
            }
            $target = $destination->getPlanetCoordinates();
            $missionObject = GameMissionFactory::getMissionById(4, []);
            $duration = $missions->calculateFleetMissionDuration($planet, $target, $units, $missionObject, 1);
            if ($duration <= $threat->time_arrival - $now + 120) {
                continue;
            }
            if ($this->dispatch($bot, $player, $planet, $target, $destination->getPlanetType(), 4, $units, 'fleet_save', 1, 0, true)) {
                $bot->fleet_save_until = $threat->time_arrival + 120;
                return true;
            }
        }
        // A one-world NPC can use the original expedition mission if Astrophysics permits it.
        $source = $planet->getPlanetCoordinates();
        if ($player->getResearchLevel('astrophysics') > 0 && $this->dispatch($bot, $player, $planet, new Coordinate($source->galaxy, $source->system, 16), PlanetType::Planet, 15, $units, 'fleet_save', 1, 1, true)) {
            $bot->fleet_save_until = $threat->time_arrival + 120;
            return true;
        }
        $bot->last_action = 'save_blocked';
        return true;
    }

    public function raid(AutonomousBot $bot, PlayerService $player, PlanetService $planet): bool
    {
        if (!$bot->auto_raid || $this->missions($player)->getActiveFleetMissionsSentByCurrentPlayer()->whereIn('mission_type', [1, 6])->isNotEmpty()) {
            return false;
        }
        $source = $planet->getPlanetCoordinates();
        $npcIds = AutonomousBot::where('user_id', '!=', $player->getId())->pluck('user_id');
        $targets = Planet::where('galaxy', $source->galaxy)->whereBetween('system', [max(1, $source->system - 20), min(499, $source->system + 20)])
            ->where('planet_type', 1)->where('destroyed', 0)->where('user_id', '!=', $player->getId());
        if (!$bot->raid_inactive_players) {
            $targets->whereIn('user_id', $npcIds);
        }
        foreach ($targets->orderByRaw('ABS(system - ?)', [$source->system])->orderBy('id')->limit(30)->get() as $targetRow) {
            $targetPlanet = resolve(PlanetServiceFactory::class)->make($targetRow->id, true);
            $owner = $targetPlanet?->getPlayer();
            if ($targetPlanet === null || $owner === null || $owner->isAdmin() || $owner->isInVacationMode() || (!$npcIds->contains($owner->getId()) && !$owner->isInactive())) {
                continue;
            }
            $target = $targetPlanet->getPlanetCoordinates();
            $report = EspionageReport::where('planet_galaxy', $source->galaxy)->where('planet_system', $target->system)->where('planet_position', $target->position)
                ->where('planet_type', 1)->where('planet_user_id', $owner->getId())->where('created_at', '>=', Date::now()->subMinutes(30))
                ->whereIn('id', Message::select('espionage_report_id')->where('user_id', $player->getId())->where('key', 'espionage_report'))->latest('id')->first();
            $units = new UnitCollection();
            if ($report === null) {
                $probes = min(3, $planet->getObjectAmount('espionage_probe'));
                if ($probes > 0) {
                    $units->addUnit(ObjectService::getShipObjectByMachineName('espionage_probe'), $probes);
                    if ($this->dispatch($bot, $player, $planet, $target, PlanetType::Planet, 6, $units, 'scout')) {
                        return true;
                    }
                }
                continue;
            }
            // Unknown forces are never treated as zero. No live enemy inventories are inspected.
            if (!is_array($report->getAttribute('ships')) || !is_array($report->getAttribute('defense')) || array_sum($report->ships) > 0 || array_sum($report->defense) > 0 || array_sum($report->resources) < 1000) {
                continue;
            }
            foreach (['small_cargo', 'large_cargo'] as $key) {
                $amount = min($bot->batch_size, $planet->getObjectAmount($key));
                if ($amount > 0) {
                    $units->addUnit(ObjectService::getShipObjectByMachineName($key), $amount);
                }
            }
            if ($units->getAmount() > 0 && $this->dispatch($bot, $player, $planet, $target, PlanetType::Planet, 1, $units, 'raid')) {
                return true;
            }
        }
        return false;
    }

    private function missions(PlayerService $player): FleetMissionService
    {
        return resolve(FleetMissionService::class, ['player' => $player, 'messageService' => new MessageService($player)]);
    }

    private function dispatch(AutonomousBot $bot, PlayerService $player, PlanetService $planet, Coordinate $target, PlanetType $type, int $missionId, UnitCollection $units, string $action, float $speed = 10, int $holding = 0, bool $saveResources = false): bool
    {
        $missions = $this->missions($player);
        if ($player->getFleetSlotsInUse() >= $player->getFleetSlotsMax() || !GameMissionFactory::getMissionById($missionId, [])->isMissionPossible($planet, $target, $type, $units)->possible) {
            return false;
        }
        $fuel = (int)ceil($missions->calculateConsumption($planet, $units, $target, $holding, $speed));
        if ($fuel > $planet->deuterium()->get() || $fuel > $units->getTotalFuelCapacity($player)) {
            return false;
        }
        $cargo = new Resources();
        if ($saveResources) {
            $capacity = $units->getTotalCargoCapacity($player);
            $metal = min($capacity, (int)$planet->metal()->get());
            $crystal = min($capacity - $metal, (int)$planet->crystal()->get());
            $deuterium = min($capacity - $metal - $crystal, max(0, (int)$planet->deuterium()->get() - $fuel));
            $cargo = new Resources($metal, $crystal, $deuterium);
        }
        $mission = $missions->createNewFromPlanet($planet, $target, $type, $missionId, $units, $cargo, $speed, $holding);
        if ($saveResources) {
            $bot->fleet_save_mission_id = $mission->id;
        }
        $bot->last_action = $action;
        $bot->last_amount = $units->getAmount();
        return true;
    }
}
