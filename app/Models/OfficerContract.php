<?php

namespace OGame\Models;

use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $user_id
 * @property string $officer
 * @property Carbon $expires_at
 */
#[Unguarded]
class OfficerContract extends Model
{
    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }
}
