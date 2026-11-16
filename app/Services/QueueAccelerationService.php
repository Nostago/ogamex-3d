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
    /** @return array{seconds: int, orders: int, units: int} */
    public function useItem(PlayerService $player, PlanetService $planet, string $kind, int $seconds): array
    {
        $now = (int)Date::now()->timestamp;
        if ($kind === 'unit') {
            $items = UnitQueue::where('planet_id', $planet->getPlanetId())->where('processed', 0)->orderBy('id')->lockForUpdate()->get();
            if ($items->isEmpty()) {
                throw ValidationException::withMessages(['product' => __('t_commerce.no_active_order')]);
            }
            $reduction = min($seconds, max(0, (int)$items->last()->time_end - $now));
            if ($reduction <= 0) {
                throw ValidationException::withMessages(['product' => __('t_commerce.no_active_order')]);
            }
            $beforeUnits = (int)$items->sum('object_amount_progress');
            foreach ($items as $item) {
                // Advancing all three timestamps preserves per-unit production and completed-unit accounting.
                $item->time_start -= $reduction;
                $item->time_end -= $reduction;
                $item->time_progress = max(0, $item->time_progress - $reduction);
                $item->save();
            }
            $planet->updateUnitQueue();
            $updated = UnitQueue::whereIn('id', $items->modelKeys())->get();
            return ['seconds' => $reduction, 'orders' => $updated->where('processed', 1)->count(), 'units' => (int)$updated->sum('object_amount_progress') - $beforeUnits];
        }
        $queue = $kind === 'building'
            ? BuildingQueue::where('planet_id', $planet->getPlanetId())
            : ResearchQueue::whereIn('planet_id', $player->planets->allIds());
        // Snapshot the existing queue. Waiting jobs have not been paid or timed yet;
        // only the original processors may start them and calculate their durations.
        $items = $queue->where('processed', 0)->where('canceled', 0)
            ->orderByDesc('building')->orderBy('id')->lockForUpdate()->get();
        $first = $items->first();
        if (!$first || $first->building !== 1 || $first->time_end <= $now) {
            throw ValidationException::withMessages(['product' => __('t_commerce.no_active_order')]);
        }
        $remaining = $seconds;
        foreach ($items as $item) {
            if ($remaining <= 0) {
                break;
            }
            $item->refresh();
            if ($item->processed || $item->canceled) {
                continue;
            }
            if ($item->building !== 1) {
                break;
            }
            $reduction = min($remaining, max(0, $item->time_end - $now));
            $item->time_end -= $reduction;
            $item->save();
            $remaining -= $reduction;
            if ($kind === 'building') {
                $planet->updateBuildingQueue();
            } else {
                $player->updateResearchQueue();
            }
        }
        $completed = 0;
        foreach ($items as $item) {
            if ($item->refresh()->processed) {
                $completed++;
            }
        }
        return ['seconds' => $seconds - $remaining, 'orders' => $completed, 'units' => 0];
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
