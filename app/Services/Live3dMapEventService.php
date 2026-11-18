<?php

namespace OGame\Services;

use Illuminate\Support\Facades\Date;
use OGame\Models\BuildingQueue;
use OGame\Models\ResearchQueue;

class Live3dMapEventService
{
    /** Confirmed completions only; a cancelled or disappeared queue is not a completion.
     * @return array<int, array<string, mixed>>
     */
    public function recent(PlayerService $player, int $galaxy, int $system): array
    {
        $worlds = [];
        foreach ($player->planets->all() as $planet) {
            $coords = $planet->getPlanetCoordinates();
            if ($coords->galaxy === $galaxy && $coords->system === $system) {
                $worlds[$planet->getPlanetId()] = $planet;
            }
        }
        $events = [];
        foreach (['building' => BuildingQueue::class, 'research' => ResearchQueue::class] as $kind => $model) {
            $query = $model::query()->whereIn('planet_id', array_keys($worlds))->where('processed', 1)->where('canceled', 0)
                ->whereBetween('time_end', [(int)Date::now()->timestamp - 300, Date::now()->timestamp]);
            if ($kind === 'building') {
                $query->where('is_downgrade', 0);
            }
            foreach ($query->orderByDesc('time_end')->limit(12)->get() as $job) {
                $planet = $worlds[$job->planet_id];
                $events[] = [
                    'id' => $kind.'-'.$job->id, 'kind' => $kind, 'time' => $job->time_end,
                    'position' => $planet->getPlanetCoordinates()->position, 'type' => $planet->getPlanetType()->value,
                    'world' => $planet->getPlanetName(), 'name' => ObjectService::getObjectById($job->object_id)->title,
                    'level' => $job->object_level_target,
                ];
            }
        }
        usort($events, fn (array $a, array $b): int => $b['time'] <=> $a['time']);
        return array_slice($events, 0, 12);
    }
}
