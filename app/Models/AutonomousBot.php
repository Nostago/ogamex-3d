<?php

namespace OGame\Models;

use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property bool $enabled
 * @property string $profile
 * @property int $interval_seconds
 * @property int $max_level
 * @property int $ship_limit
 * @property int $batch_size
 * @property array<string, int|float>|null $strategy
 * @property bool $auto_build
 * @property bool $auto_research
 * @property bool $auto_shipbuilding
 * @property bool $auto_raid
 * @property bool $auto_fleet_save
 * @property bool $raid_inactive_players
 * @property int|null $fleet_save_mission_id
 * @property int|null $fleet_save_until
 * @property int $cycles
 * @property Carbon|null $next_tick_at
 * @property Carbon|null $last_tick_at
 * @property string $last_action
 * @property string|null $last_object
 * @property int $last_amount
 */
#[Unguarded]
class AutonomousBot extends Model
{
    protected function casts(): array
    {
        return ['strategy' => 'array', 'auto_build' => 'boolean', 'auto_research' => 'boolean', 'auto_shipbuilding' => 'boolean', 'auto_raid' => 'boolean', 'auto_fleet_save' => 'boolean', 'raid_inactive_players' => 'boolean', 'enabled' => 'boolean', 'next_tick_at' => 'datetime', 'last_tick_at' => 'datetime'];
    }
}
