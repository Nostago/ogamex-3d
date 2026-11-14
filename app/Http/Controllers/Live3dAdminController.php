<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use OGame\GameObjects\Models\Abstracts\GameObject;
use OGame\GameObjects\Models\Enums\GameObjectType;
use OGame\Http\Controllers\Admin\DeveloperShortcutsController;
use OGame\Models\User;
use OGame\Services\ObjectService;
use OGame\Services\PlayerService;
use OGame\Services\QueueAccelerationService;
use OGame\Services\SettingsService;

/** UI adapter only. All privileged changes use the original admin controller. */
class Live3dAdminController extends Controller
{
    public function command(Request $request, PlayerService $player, SettingsService $settings): JsonResponse
    {
        abort_unless($player->isAdmin(), 403);
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        $input = $request->validate([
            'planet' => ['required', 'integer', 'min:1'],
            'action' => ['required', Rule::in(['resources', 'object', 'finish-orders'])],
            'metal' => ['required_if:action,resources', 'integer', 'min:0', 'max:1000000000000'],
            'crystal' => ['required_if:action,resources', 'integer', 'min:0', 'max:1000000000000'],
            'deuterium' => ['required_if:action,resources', 'integer', 'min:0', 'max:1000000000000'],
            'technologyId' => ['required_if:action,object', 'integer', Rule::in(array_map(fn (GameObject $object): int => $object->id, ObjectService::getObjects()))],
            'amount' => ['required_if:action,object', 'integer', 'min:1', 'max:1000000000'],
        ]);
        abort_unless($player->planets->planetExistsAndOwnedByPlayer((int)$input['planet']), 404);
        $player->setCurrentPlanetId((int)$input['planet']);
        if ($input['action'] === 'finish-orders') {
            DB::transaction(function () use ($player) {
                User::whereKey($player->getId())->lockForUpdate()->firstOrFail();
                $player->refreshUser();
                resolve(QueueAccelerationService::class)->completeOwnOrders($player);
                Log::notice('Admin completed own production orders', ['admin_id' => $player->getId()]);
            }, 3);
            return response()->json(['status' => 'success']);
        }
        $planet = $player->planets->current();
        $controller = resolve(DeveloperShortcutsController::class);
        if ($input['action'] === 'resources') {
            $coordinates = $planet->getPlanetCoordinates();
            // Derive the target from the explicitly owned planet; never trust arbitrary coordinates.
            $request->replace([
                '_token' => $token, 'galaxy' => $coordinates->galaxy, 'system' => $coordinates->system, 'position' => $coordinates->position,
                $planet->getPlanetType()->value === 3 ? 'update_resources_moon' : 'update_resources_planet' => 1,
                'metal' => $input['metal'], 'crystal' => $input['crystal'], 'deuterium' => $input['deuterium'],
            ]);
            $controller->updateResources($request, $player, $settings);
        } else {
            $object = ObjectService::getObjectById((int)$input['technologyId']);
            $unit = in_array($object->type, [GameObjectType::Ship, GameObjectType::Defense], true);
            $kind = $object->type === GameObjectType::Research ? 'research' : 'building';
            if (!$unit) {
                abort_if((int)$input['amount'] > 100, 422);
            }
            $request->replace([
                '_token' => $token,
                ($unit ? 'unit_' : $kind.'_').$object->id => 1,
                $unit ? 'amount_of_units' : $kind.'_level' => $input['amount'],
            ]);
            $controller->update($request, $player, $settings);
        }
        return response()->json(['status' => 'success'])->header('Cache-Control', 'private, no-store');
    }
}
