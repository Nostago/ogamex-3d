<?php

namespace OGame\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/** @property int $id
 * @property string $request_id
 * @property int|null $admin_id
 * @property int|null $user_id
 * @property int|null $planet_id
 * @property string $recipient_name
 * @property string $world_name
 * @property string $coordinates
 * @property int $planet_type
 * @property string $ship_key
 * @property int $amount
 * @property int $before
 * @property int $after
 * @property Carbon|null $created_at
 * @property string|null $reason
 */
class AdminShipGrant extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['admin_id' => 'integer', 'user_id' => 'integer', 'planet_id' => 'integer', 'planet_type' => 'integer', 'amount' => 'integer', 'before' => 'integer', 'after' => 'integer'];
    }
}
