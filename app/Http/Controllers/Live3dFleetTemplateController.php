<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use OGame\Models\FleetTemplate;
use OGame\Services\PlayerService;

/** Save planning preferences without bypassing the original fleet dispatch checks. */
class Live3dFleetTemplateController extends Controller
{
    public function store(Request $request, PlayerService $player): JsonResponse
    {
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        $data = $request->validate([
            'template_id' => ['nullable', 'integer', 'min:0'],
            'template_name' => ['required', 'string', 'max:100'],
            'ship' => ['required', 'array'], 'ship.*' => ['integer', 'min:0', 'max:1000000000000'],
            'settings' => ['required', 'array:mission,speed,type,holdingtime'],
            'settings.mission' => ['required', Rule::in([1, 2, 3, 4, 5, 6, 7, 8, 9, 15])],
            'settings.speed' => ['required', 'numeric', 'between:0.5,10', 'multiple_of:0.5'],
            'settings.type' => ['required', Rule::in([1, 2, 3])],
            'settings.holdingtime' => ['required', 'integer', 'between:0,100000'],
        ]);
        return DB::transaction(function () use ($request, $player, $data): JsonResponse {
            // Serialise the existing ten-template limit for concurrent saves by this player.
            DB::table('users')->where('id', $player->getId())->lockForUpdate()->first();
            $request->merge(['template_name' => trim($data['template_name'])]);
            $response = resolve(FleetController::class)->saveTemplate($player);
            $result = $response->getData(true);
            if (($result['success'] ?? false) === true) {
                $template = FleetTemplate::query()->where('user_id', $player->getId())->findOrFail((int)$result['template']['id']);
                $template->settings = $data['settings'];
                $template->save();
            }
            return $response;
        });
    }
}
