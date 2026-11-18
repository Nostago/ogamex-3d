<?php

namespace OGame\Services;

use OGame\Models\BattleReport;
use OGame\Models\User;

/** Stored report projection only. Neither battle engine nor live fleet/planet data is consulted. */
class Live3dBattleReplayService
{
    /** @return array<string, mixed> */
    public function project(BattleReport $report): array
    {
        $catalog = [];
        foreach (ObjectService::getUnitObjects() as $unit) {
            $catalog[$unit->machine_name] = [
                'key' => $unit->machine_name, 'name' => $unit->title, 'type' => $unit->type->value,
                'image' => Live3dArtworkService::image($unit, asset('img/objects/units/'.$unit->assets->imgSmall)),
            ];
        }
        $frames = [];
        $initial = [];
        foreach (['attacker', 'defender'] as $side) {
            $record = $report->getAttribute($side) ?? [];
            $initial[$side] = ['units' => $this->units($record['units'] ?? null, $catalog), 'losses' => null, 'shots' => null, 'power' => null, 'absorbed' => null];
        }
        $frames[] = $initial;
        foreach ($report->rounds ?? [] as $round) {
            $frame = [];
            foreach (['attacker', 'defender'] as $side) {
                $frame[$side] = [
                    'units' => $this->units($round[$side.'_ships'] ?? null, $catalog),
                    'losses' => $this->units($round[$side.'_losses_in_this_round'] ?? null, $catalog),
                    'shots' => $this->amount($round['hits_'.$side] ?? null),
                    'power' => $this->amount($round['full_strength_'.$side] ?? null),
                    'absorbed' => $this->amount($round['absorbed_damage_'.$side] ?? null),
                ];
            }
            $frames[] = $frame;
        }
        $retreat = (bool)($report->general['tactical_retreat']['defender_fled'] ?? false);
        $last = $frames[array_key_last($frames)];
        $winner = 'unknown';
        $lastAttacker = $last['attacker']['units'] ?? null;
        $lastDefender = $last['defender']['units'] ?? null;
        if ($report->rounds !== null && $lastAttacker !== null && $lastDefender !== null) {
            $attacker = array_sum(array_map('intval', $lastAttacker));
            $defender = array_sum(array_map('intval', $lastDefender));
            $winner = $retreat && $report->rounds === [] ? 'retreat' : ($attacker > 0 && $defender > 0 ? 'draw' : ($attacker > 0 ? 'attacker' : ($defender > 0 ? 'defender' : 'draw')));
        }
        $used = [];
        foreach ($frames as $frame) {
            foreach (['attacker', 'defender'] as $side) {
                foreach (array_keys($frame[$side]['units'] ?? []) as $key) {
                    $used[$key] = $catalog[$key];
                }
            }
        }
        return [
            'coordinates' => $report->planet_galaxy.':'.$report->planet_system.':'.$report->planet_position,
            'date' => $report->created_at?->toIso8601String(),
            'names' => ['attacker' => $this->name((int)($report->attacker['player_id'] ?? 0)), 'defender' => $this->name((int)($report->defender['player_id'] ?? $report->planet_user_id ?? 0))],
            'roundsRecorded' => $report->rounds !== null, 'frames' => $frames, 'catalog' => array_values($used),
            'result' => [
                'winner' => $winner, 'retreat' => $retreat, 'hamill' => (bool)($report->general['hamill_manoeuvre_triggered'] ?? false),
                'losses' => ['attacker' => $this->amount($report->attacker['resource_loss'] ?? null), 'defender' => $this->amount($report->defender['resource_loss'] ?? null)],
                'loot' => $this->resources($report->loot), 'debris' => $this->resources($report->debris),
                'repairedDefenses' => $this->units($report->repaired_defenses, $catalog),
            ],
        ];
    }

    private function name(int $id): string
    {
        return match (true) {
            $id === -1 => __('Pirates'), $id === -2 => __('Aliens'), $id <= 0 => __('Unknown'),
            default => (string)(User::query()->where('id', $id)->value('username') ?? __('Unknown')),
        };
    }

    private function amount(mixed $value): string|null
    {
        return is_numeric($value) && is_finite((float)$value) && (float)$value >= 0 ? (string)(int)$value : null;
    }

    /** @param array<string, array<string, mixed>> $catalog
     * @return array<string, string>|null
     */
    private function units(mixed $values, array $catalog): array|null
    {
        if (!is_array($values)) {
            return null;
        }
        $units = [];
        foreach ($values as $key => $value) {
            $amount = $this->amount($value);
            if (isset($catalog[$key]) && $amount !== null) {
                $units[$key] = $amount;
            }
        }
        return $units;
    }

    /** @param array<string, mixed>|null $values
     * @return array<string, string|null>
     */
    private function resources(array|null $values): array
    {
        return array_combine(['metal', 'crystal', 'deuterium'], array_map(fn (string $key): string|null => $this->amount($values[$key] ?? null), ['metal', 'crystal', 'deuterium']));
    }
}
