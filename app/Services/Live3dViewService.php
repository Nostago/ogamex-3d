<?php

namespace OGame\Services;

use Illuminate\Support\Facades\Date;
use OGame\GameObjects\Models\Enums\GameObjectType;
use OGame\ViewModels\Queue\BuildingQueueViewModel;
use OGame\ViewModels\Queue\ResearchQueueViewModel;
use OGame\ViewModels\Queue\UnitQueueViewModel;

/** Read model only: all rules, prices and queue execution belong to existing services. */
class Live3dViewService
{
    /** @return array<string, mixed> */
    public function snapshot(PlayerService $player, PlanetService $planet): array
    {
        $activity = resolve(Live3dActivityService::class)->forPlayer($player);
        $buildingQueue = resolve(BuildingQueueService::class)->retrieveQueue($planet);
        $researchQueue = resolve(ResearchQueueService::class)->retrieveQueue($planet);
        $unitQueue = resolve(UnitQueueService::class)->retrieveQueue($planet);
        $objects = [];
        $inventory = resolve(Live3dShipInventory::class)->forPlanet($player, $planet);
        foreach (ObjectService::getObjects() as $object) {
            if ($object->valid_planet_types !== [] && !in_array($planet->getPlanetType(), $object->valid_planet_types, true)) {
                continue;
            }
            $unit = in_array($object->type, [GameObjectType::Ship, GameObjectType::Defense], true);
            $level = $unit ? $planet->getObjectAmount($object->machine_name)
                : ($object->type === GameObjectType::Research ? $player->getResearchLevel($object->machine_name) : $planet->getObjectLevel($object->machine_name));
            $cost = ObjectService::getObjectPrice($object->machine_name, $planet);
            $requirementsMet = $unit
                ? ObjectService::objectRequirementsMet($object->machine_name, $planet) && ObjectService::objectCharacterClassMet($object->machine_name, $planet)
                : ObjectService::objectRequirementsMetWithQueue($object->machine_name, $level + 1, $planet);
            $duration = $unit ? $planet->getUnitConstructionTime($object->machine_name)
                : ($object->type === GameObjectType::Research ? $planet->getTechnologyResearchTime($object->machine_name) : $planet->getBuildingConstructionTime($object->machine_name));
            $objects[] = [
                'id' => $object->id,
                'key' => $object->machine_name,
                'name' => $object->title,
                'description' => strip_tags($object->description),
                'image' => isset($object->assets->imgSmall) ? asset('img/objects/'.($unit ? 'units' : ($object->type === GameObjectType::Research ? 'research' : 'buildings')).'/'.$object->assets->imgSmall) : null,
                'type' => $object->type->value,
                'amount' => (string)$level,
                ...($inventory[$object->machine_name] ?? []),
                'cost' => ['metal' => $cost->metal->get(), 'crystal' => $cost->crystal->get(), 'deuterium' => $cost->deuterium->get(), 'energy' => $cost->energy->get()],
                'seconds' => $duration,
                'requirementsMet' => $requirementsMet,
                'affordable' => $planet->hasResources($cost),
                'maxAmount' => $unit ? ObjectService::getObjectMaxBuildAmount($object->machine_name, $planet, $requirementsMet) : null,
                'requirements' => array_map(fn ($requirement): array => [
                    'name' => ObjectService::getObjectByMachineName($requirement->object_machine_name)->title,
                    'key' => $requirement->object_machine_name,
                    'level' => $requirement->level,
                    'current' => ObjectService::getObjectByMachineName($requirement->object_machine_name)->type === GameObjectType::Research ? $player->getResearchLevel($requirement->object_machine_name) : $planet->getObjectLevel($requirement->object_machine_name),
                    'met' => (ObjectService::getObjectByMachineName($requirement->object_machine_name)->type === GameObjectType::Research ? $player->getResearchLevel($requirement->object_machine_name) : $planet->getObjectLevel($requirement->object_machine_name)) >= $requirement->level,
                ], $object->requirements),
            ];
        }
        return [
            'serverTime' => Date::now()->timestamp,
            'vacation' => $player->isInVacationMode(),
            'player' => $player->getUsername(false),
            'darkMatter' => $player->getDarkMatter(),
            'planet' => [
                'id' => $planet->getPlanetId(), 'name' => $planet->getPlanetName(),
                'coordinates' => $planet->getPlanetCoordinates()->asString(), 'diameter' => $planet->getPlanetDiameter(),
                'image' => asset('img/planets/small/'.$planet->getPlanetBiomeType().'_'.$planet->getPlanetImageType().'.png'), 'temperature' => $planet->getPlanetTempAvg(),
                'type' => $planet->getPlanetType()->value, 'fieldsUsed' => $planet->getBuildingCount(), 'fieldsMax' => $planet->getPlanetFieldMax(),
            ],
            'planets' => array_map(fn (PlanetService $item): array => [
                'id' => $item->getPlanetId(), 'name' => $item->getPlanetName(), 'coordinates' => $item->getPlanetCoordinates()->asString(), 'type' => $item->getPlanetType()->value,
            ], $player->planets->all()),
            'resources' => [
                'metal' => ['amount' => $planet->metal()->get(), 'limit' => $planet->metalStorage()->get(), 'hour' => $planet->getMetalProductionPerHour()],
                'crystal' => ['amount' => $planet->crystal()->get(), 'limit' => $planet->crystalStorage()->get(), 'hour' => $planet->getCrystalProductionPerHour()],
                'deuterium' => ['amount' => $planet->deuterium()->get(), 'limit' => $planet->deuteriumStorage()->get(), 'hour' => $planet->getDeuteriumProductionPerHour()],
            ],
            'energy' => ['made' => $planet->energyProduction()->get(), 'used' => $planet->energyConsumption()->get(), 'factor' => $planet->getResourceProductionFactor()],
            'unread' => (new MessageService($player))->getUnreadMessagesCount(),
            'fleetSlots' => ['used' => $player->getFleetSlotsInUse(), 'max' => $player->getFleetSlotsMax()],
            'defenseTotal' => (string)$planet->getDefenseUnits()->getAmount(),
            'shipTotal' => (string)array_sum(array_column($inventory, 'total')),
            'shipAvailable' => (string)array_sum(array_column($inventory, 'available')),
            'shipOnMission' => (string)array_sum(array_column($inventory, 'onMission')),
            'objects' => $objects,
            'activity' => $activity,
            'queues' => [
                'building' => array_map(fn (BuildingQueueViewModel $item): array => [
                    'id' => $item->id, 'objectId' => $item->object->id, 'name' => $item->object->title, 'remaining' => $item->time_countdown, 'seconds' => $item->time_total, 'active' => $item->building, 'target' => $item->level_target,
                ], $buildingQueue->queue),
                'research' => array_map(fn (ResearchQueueViewModel $item): array => [
                    'id' => $item->id, 'objectId' => $item->object->id, 'name' => $item->object->title, 'remaining' => $item->time_countdown, 'seconds' => $item->time_total, 'active' => $item->building, 'target' => $item->level_target, 'planet' => $item->planet->getPlanetId(),
                ], $researchQueue->queue),
                'unit' => array_map(fn (UnitQueueViewModel $item): array => [
                    'id' => $item->id, 'objectId' => $item->object->id, 'name' => $item->object->title, 'remaining' => $item->time_countdown, 'seconds' => $item->time_total, 'quantity' => (string)$item->object_amount_remaining, 'unitSeconds' => $item->time_countdown_per_object, 'nextRemaining' => $item->time_countdown_object_next,
                ], $unitQueue->queue),
            ],
        ];
    }
}
