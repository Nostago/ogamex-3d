<?php

namespace OGame\Services;

use OGame\Models\AutonomousBot;

/** Deterministic NPC priorities, independent of production and combat rules. */
class AutonomousBotStrategy
{
    /** @return array{fleet: int, economy: int, research: int, raid_every: int, strength: float} */
    public static function settings(AutonomousBot $bot): array
    {
        $offensive = $bot->auto_raid && $bot->profile !== 'economy';
        $defaults = ['fleet' => $offensive ? 2 : 0, 'economy' => $offensive ? 1 : 2, 'research' => 1,
            'raid_every' => $offensive ? 2 : 4, 'strength' => 3.0];
        $values = array_replace($defaults, $bot->strategy ?? []);
        return ['fleet' => (int)$values['fleet'], 'economy' => (int)$values['economy'], 'research' => (int)$values['research'],
            'raid_every' => (int)$values['raid_every'], 'strength' => (float)$values['strength']];
    }

    /** @param array<string, int|float> $settings
     * @return array<string, int>
     */
    private static function weights(array $settings): array
    {
        $weights = [];
        $gcd = 0;
        foreach (['fleet', 'economy', 'research'] as $key) {
            $weight = max(0, min(100, (int)$settings[$key]));
            $weights[$key] = $weight;
            $a = $gcd;
            $b = $weight;
            while ($b !== 0) {
                [$a, $b] = [$b, $a % $b];
            }
            $gcd = $a;
        }
        if ($gcd === 0) {
            return ['fleet' => 2, 'economy' => 1, 'research' => 1];
        }
        return array_map(fn (int $weight): int => intdiv($weight, $gcd), $weights);
    }

    /** @param array<string, int|float> $settings */
    public static function period(array $settings): int
    {
        return array_sum(self::weights($settings));
    }

    /** @param array<string, int|float> $settings */
    public static function turn(array $settings, int $cycle): string
    {
        $weights = self::weights($settings);
        $total = array_sum($weights);
        $scores = array_fill_keys(array_keys($weights), 0);
        $selected = 'economy';
        // Smooth weighted round-robin avoids 50 consecutive fleet turns when
        // an administrator enters percentages rather than a reduced ratio.
        for ($step = 0; $step <= (max(1, $cycle) - 1) % $total; $step++) {
            $maximum = PHP_INT_MIN;
            foreach ($weights as $key => $weight) {
                $scores[$key] += $weight;
                if ($weight > 0 && $scores[$key] > $maximum) {
                    $selected = $key;
                    $maximum = $scores[$key];
                }
            }
            $scores[$selected] -= $total;
        }
        return $selected;
    }
}
