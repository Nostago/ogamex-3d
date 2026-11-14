<?php

namespace OGame\Services;

use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OGame\Models\BuildingQueue;
use OGame\Models\ResearchQueue;
use OGame\Models\UnitQueue;

/** Change deadlines only; original queue processors grant levels/units and start paid follow-up jobs. */
class QueueAccelerationService
{
    public function useItem(PlayerService $player, PlanetService $planet, string $kind, int $seconds): void
    {
        $now = (int)Date::now()->timestamp;
        if ($kind === 'unit') {
            $items = UnitQueue::where('planet_id', $planet->getPlanetId())->where('processed', 0)->orderBy('id')->lockForUpdate()->get();
            if ($items->isEmpty()) {
                throw ValidationException::withMessages(['product' => __('t_commerce.no_active_order')]);
            }
            $reduction = min($seconds, max(0, (int)$items->last()->time_end - $now));
            foreach ($items as $item) {
                // Advancing all three timestamps preserves per-unit production and completed-unit accounting.
                $item->time_start -= $reduction;
                $item->time_end -= $reduction;
                $item->time_progress = max(0, $item->time_progress - $reduction);
                $item->save();
            }
            $planet->updateUnitQueue();
            return;
        }
        $queue = $kind === 'building'
            ? BuildingQueue::where('planet_id', $planet->getPlanetId())
            : ResearchQueue::whereIn('planet_id', $player->planets->allIds());
        $item = $queue->where('building', 1)->where('processed', 0)->where('canceled', 0)->lockForUpdate()->first();
        if (!$item || $item->time_end <= $now) {
            throw ValidationException::withMessages(['product' => __('t_commerce.no_active_order')]);
        }
        $item->time_end = max($now, $item->time_end - $seconds);
        $item->save();
        if ($kind === 'building') {
            $planet->updateBuildingQueue();
        } else {
            $player->updateResearchQueue();
        }
    }

    public function completeOwnOrders(PlayerService $player): void
    {
        if ($player->isInVacationMode()) {
            throw ValidationException::withMessages(['action' => __('t_commerce.vacation')]);
        }
        DB::transaction(function () use ($player) {
            foreach ($player->planets->all() as $planet) {
                $planet->update();
                $count = BuildingQueue::where('planet_id', $planet->getPlanetId())->where('processed', 0)->where('canceled', 0)->count();
                for ($i = 0; $i < $count; $i++) {
                    $item = BuildingQueue::where('planet_id', $planet->getPlanetId())->where('processed', 0)->where('canceled', 0)->where('building', 1)->lockForUpdate()->first();
                    if (!$item) {
                        break;
                    }
                    $item->time_end = (int)Date::now()->timestamp;
                    $item->save();
                    $planet->updateBuildingQueue();
                }
                UnitQueue::where('planet_id', $planet->getPlanetId())->where('processed', 0)->update(['time_end' => (int)Date::now()->timestamp]);
                $planet->updateUnitQueue();
            }
            $count = ResearchQueue::whereIn('planet_id', $player->planets->allIds())->where('processed', 0)->where('canceled', 0)->count();
            for ($i = 0; $i < $count; $i++) {
                $item = ResearchQueue::whereIn('planet_id', $player->planets->allIds())->where('processed', 0)->where('canceled', 0)->where('building', 1)->lockForUpdate()->first();
                if (!$item) {
                    break;
                }
                $item->time_end = (int)Date::now()->timestamp;
                $item->save();
                $player->updateResearchQueue();
            }
        });
    }
}
