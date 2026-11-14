<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use OGame\Services\ObjectService;
use OGame\Services\PlayerService;
use OGame\Services\SettingsService;

/** Native galaxy forms; all game actions are delegated to the original controllers. */
class Live3dGalaxyController extends Controller
{
    public function missiles(Request $request, PlayerService $player, SettingsService $settings): JsonResponse
    {
        $this->prepare($request, $player, $settings);
        $data = app()->call([resolve(GalaxyController::class), 'missileAttackOverlay'])->getData();
        $data['defenses'] = array_values(array_map(fn ($object): array => ['id' => $object->id, 'priority' => $object->id - 399, 'name' => $object->title], array_filter(ObjectService::getDefenseObjects(), fn ($object): bool => $object->id >= 401 && $object->id <= 406)));
        return response()->json($data)->header('Cache-Control', 'private, no-store');
    }

    public function action(Request $request, PlayerService $player, SettingsService $settings): JsonResponse
    {
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        $action = $request->validate(['action' => ['required', Rule::in(['scan', 'missiles', 'relocate'])]])['action'];
        $this->prepare($request, $player, $settings);
        if ($action === 'scan') {
            $movements = [];
            // Capture the original scan result without executing its legacy markup/scripts.
            view()->composer('ingame.phalanx.content', function (View $view) use (&$movements): void {
                $movements = $view->getData()['fleet_movements'];
            });
            $data = app()->call([resolve(PhalanxController::class), 'scan'])->getData(true);
            unset($data['content_html']);
            $data['movements'] = $movements;
            return response()->json($data);
        }
        if ($action === 'missiles') {
            $request->validate(['missile_count' => ['required', 'integer', 'min:1'], 'target_priority' => ['required', 'integer', 'between:0,7']]);
            return app()->call([resolve(GalaxyController::class), 'missileAttack']);
        }
        abort_if($player->planets->current()->isMoon(), 422);
        return app()->call([resolve(PlanetMoveController::class), 'move']);
    }

    private function prepare(Request $request, PlayerService $player, SettingsService $settings): void
    {
        $data = $request->validate([
            'planet' => ['required', 'integer', 'min:1'],
            'galaxy' => ['required', 'integer', 'min:1', 'max:'.$settings->numberOfGalaxies()],
            'system' => ['required', 'integer', 'between:1,499'], 'position' => ['required', 'integer', 'between:1,15'],
            'type' => ['nullable', Rule::in([1, 3])],
        ]);
        abort_unless($player->planets->planetExistsAndOwnedByPlayer((int)$data['planet']), 404);
        $player->setCurrentPlanetId((int)$data['planet']);
        $player->planets->current()->update();
    }
}
