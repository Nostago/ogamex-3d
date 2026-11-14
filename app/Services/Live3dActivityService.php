<?php

namespace OGame\Services;

use OGame\GameObjects\Models\Abstracts\GameObject;

/** All owned worlds, with completion delegated to the existing queue processors. */
class Live3dActivityService
{
    /** @return array<int, array<string, mixed>> */
    public function forPlayer(PlayerService $player): array
    {
        $items = [];
        foreach ($player->planets->all() as $planet) {
            $planet->update();
            foreach (resolve(BuildingQueueService::class)->retrieveQueue($planet)->queue as $job) {
                $items[] = [
                    ...$this->describe($job->object, $planet),
                    'kind' => 'building', 'id' => $job->id, 'active' => (bool)$job->building,
                    'target' => $job->level_target, 'remaining' => $job->time_countdown, 'seconds' => $job->time_total,
                ];
            }
            foreach (resolve(UnitQueueService::class)->retrieveQueue($planet)->queue as $index => $job) {
                $items[] = [
                    ...$this->describe($job->object, $planet),
                    'kind' => 'unit', 'id' => $job->id, 'active' => $index === 0,
                    'quantity' => (string)$job->object_amount_remaining, 'remaining' => $job->time_countdown, 'seconds' => $job->time_total,
                ];
            }
        }
        foreach (resolve(ResearchQueueService::class)->retrieveQueue($player->planets->current())->queue as $job) {
            $items[] = [
                ...$this->describe($job->object, $job->planet),
                'kind' => 'research', 'id' => $job->id, 'active' => (bool)$job->building,
                'target' => $job->level_target, 'remaining' => $job->time_countdown, 'seconds' => $job->time_total,
            ];
        }
        usort($items, fn (array $left, array $right): int => [(int)!$left['active'], $left['planet'], $left['kind'], $left['id']] <=> [(int)!$right['active'], $right['planet'], $right['kind'], $right['id']]);
        return $items;
    }

    /** @return array<string, mixed> */
    private function describe(GameObject $object, PlanetService $planet): array
    {
        $folder = match ($object->type->value) {
            'ship', 'defense' => 'units', 'research' => 'research', default => 'buildings',
        };
        return [
            'objectId' => $object->id, 'name' => $object->title, 'objectType' => $object->type->value,
            'image' => asset('img/objects/'.$folder.'/'.$object->assets->imgSmall),
            'planet' => $planet->getPlanetId(), 'planetName' => $planet->getPlanetName(),
            'coordinates' => $planet->getPlanetCoordinates()->asString(),
        ];
    }
}
