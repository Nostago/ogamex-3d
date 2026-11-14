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
        return ['enabled' => 'boolean', 'next_tick_at' => 'datetime', 'last_tick_at' => 'datetime'];
    }
}
