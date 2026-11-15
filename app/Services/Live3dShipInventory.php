<?php

namespace OGame\Services;

use OGame\Models\FleetMission;

/** Current world's ships, including its outbound, holding and returning fleets. Never foreign fleets. */
class Live3dShipInventory
{
    /** @return array<string, array{available: string, onMission: string, total: string}> */
    public function forPlanet(PlayerService $player, PlanetService $planet): array
    {
        $missions = FleetMission::where('user_id', $player->getId())->where('processed', 0)
            ->where(function ($query) use ($planet): void {
                $query->where(fn ($outbound) => $outbound->whereNull('parent_id')->where('planet_id_from', $planet->getPlanetId()))
                    ->orWhere(fn ($returning) => $returning->whereNotNull('parent_id')->where('planet_id_to', $planet->getPlanetId()));
            })->get();
        $result = [];
        foreach (ObjectService::getShipObjects() as $ship) {
            $available = $planet->getObjectAmount($ship->machine_name);
            $away = (int)$missions->sum($ship->machine_name);
            $result[$ship->machine_name] = ['available' => (string)$available, 'onMission' => (string)$away, 'total' => (string)($available + $away)];
        }
        return $result;
    }
}
