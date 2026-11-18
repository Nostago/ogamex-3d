<?php

namespace OGame\Services;

/** Presentation of owned worlds only; queue processing remains in Live3dActivityService. */
class Live3dEmpireService
{
    /** @param array<int, array<string, mixed>> $activity
     * @return array<int, array<string, mixed>>
     */
    public function forPlayer(PlayerService $player, array $activity): array
    {
        $worlds = [];
        foreach ($player->planets->all() as $planet) {
            $resources = [];
            foreach (['metal', 'crystal', 'deuterium'] as $key) {
                $resources[$key] = match ($key) {
                    'metal' => ['amount' => $planet->metal()->get(), 'limit' => $planet->metalStorage()->get(), 'hour' => $planet->getMetalProductionPerHour()],
                    'crystal' => ['amount' => $planet->crystal()->get(), 'limit' => $planet->crystalStorage()->get(), 'hour' => $planet->getCrystalProductionPerHour()],
                    default => ['amount' => $planet->deuterium()->get(), 'limit' => $planet->deuteriumStorage()->get(), 'hour' => $planet->getDeuteriumProductionPerHour()],
                };
            }
            $worlds[] = [
                'id' => $planet->getPlanetId(), 'name' => $planet->getPlanetName(),
                'coordinates' => $planet->getPlanetCoordinates()->asString(), 'type' => $planet->getPlanetType()->value,
                'image' => asset('img/planets/small/'.$planet->getPlanetBiomeType().'_'.$planet->getPlanetImageType().'.png'),
                'resources' => $resources,
                'energy' => ['made' => $planet->energyProduction()->get(), 'used' => $planet->energyConsumption()->get(), 'factor' => $planet->getResourceProductionFactor()],
                'orders' => array_values(array_filter($activity, fn (array $item): bool => $item['planet'] === $planet->getPlanetId())),
            ];
        }
        return $worlds;
    }
}
