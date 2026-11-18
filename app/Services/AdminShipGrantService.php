<?php

namespace OGame\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OGame\Models\AdminShipGrant;
use OGame\Models\Planet;
use OGame\Models\User;

/** Administrator compensation, independent of the administrator's selected planet. */
class AdminShipGrantService
{
    /** @param array<string, mixed> $input
     * @return array{grant: AdminShipGrant, replayed: bool}
     */
    public function grant(int $adminId, array $input): array
    {
        return DB::transaction(function () use ($adminId, $input): array {
            // Serialise requests by this admin, including retries of the same request ID.
            $admin = User::query()->whereKey($adminId)->lockForUpdate()->firstOrFail();
            abort_unless($admin->hasRole('admin'), 403);
            $existing = AdminShipGrant::query()->where('request_id', $input['request_id'])->first();
            if ($existing !== null) {
                abort_unless($existing->admin_id === $adminId && $existing->user_id === (int)$input['user_id']
                    && $existing->planet_id === (int)$input['planet_id'] && $existing->ship_key === ObjectService::getObjectById((int)$input['technologyId'])->machine_name
                    && $existing->amount === (int)$input['amount'] && ($existing->reason ?? '') === ($input['reason'] ?? ''), 409, __('t_shipgrants.conflict'));
                return ['grant' => $existing, 'replayed' => true];
            }
            $owner = User::query()->whereKey((int)$input['user_id'])->lockForUpdate()->firstOrFail();
            $planet = Planet::query()->whereKey((int)$input['planet_id'])->lockForUpdate()->firstOrFail();
            abort_unless($planet->user_id === $owner->id && $planet->destroyed === 0 && in_array($planet->planet_type, [1, 3], true), 409, __('t_shipgrants.target_changed'));
            $ship = ObjectService::getShipObjectByMachineName(ObjectService::getObjectById((int)$input['technologyId'])->machine_name);
            if ($ship->valid_planet_types !== [] && !in_array($planet->planet_type, array_map(fn ($type): int => $type->value, $ship->valid_planet_types), true)) {
                throw ValidationException::withMessages(['technologyId' => __('t_shipgrants.invalid_type')]);
            }
            $before = (int)$planet->getAttribute($ship->machine_name);
            $amount = (int)$input['amount'];
            // Ship columns are signed 32-bit integers in the existing schema.
            if ($before < 0 || $before > 2147483647 - $amount) {
                throw ValidationException::withMessages(['amount' => __('t_shipgrants.limit')]);
            }
            // An atomic increment cannot overwrite a simultaneous arrival or production update.
            Planet::query()->whereKey($planet->id)->increment($ship->machine_name, $amount);
            $grant = new AdminShipGrant();
            $grant->forceFill([
                'request_id' => $input['request_id'], 'admin_id' => $adminId, 'user_id' => $owner->id, 'planet_id' => $planet->id,
                'recipient_name' => $owner->username, 'world_name' => $planet->name,
                'coordinates' => $planet->galaxy.':'.$planet->system.':'.$planet->planet, 'planet_type' => $planet->planet_type,
                'ship_key' => $ship->machine_name, 'amount' => $amount, 'before' => $before, 'after' => $before + $amount,
                'reason' => $input['reason'] ?? null,
            ])->save();
            return ['grant' => $grant, 'replayed' => false];
        }, 3);
    }

    /** @return array<string, mixed> */
    public function receipt(AdminShipGrant $grant): array
    {
        return [
            'id' => $grant->id, 'request_id' => $grant->request_id,
            'user_id' => $grant->user_id, 'player' => $grant->recipient_name, 'planet_id' => $grant->planet_id,
            'world' => $grant->world_name, 'coordinates' => $grant->coordinates, 'type' => $grant->planet_type,
            'ship' => ObjectService::getShipObjectByMachineName($grant->ship_key)->title,
            'amount' => (string)$grant->amount, 'before' => (string)$grant->before, 'after' => (string)$grant->after,
            'reason' => $grant->reason, 'date' => $grant->created_at?->toIso8601String(),
        ];
    }
}
