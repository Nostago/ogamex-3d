<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use OGame\Factories\PlanetServiceFactory;
use OGame\GameObjects\Models\Abstracts\GameObject;
use OGame\GameObjects\Models\Enums\GameObjectType;
use OGame\Services\Live3dViewService;
use OGame\Services\ObjectService;
use OGame\Services\PhalanxService;
use OGame\Services\PlanetService;
use OGame\Services\PlayerService;
use OGame\Services\SettingsService;

class Live3dController extends Controller
{
    public function index(PlayerService $player, Live3dViewService $view): Response
    {
        return response()->view('live3d.index', [
            'initial' => $view->snapshot($player, $player->planets->current()),
            'adminAccess' => $player->isAdmin(),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function state(Request $request, PlayerService $player, Live3dViewService $view): JsonResponse
    {
        $input = $request->validate(['planet' => ['nullable', 'integer', 'min:1']]);
        $planet = $this->ownedPlanet($player, (int)($input['planet'] ?? $player->planets->current()->getPlanetId()));
        $planet->update();
        return response()->json($view->snapshot($player, $planet))->header('Cache-Control', 'private, no-store');
    }

    public function galaxy(Request $request, PlayerService $player, SettingsService $settings, PlanetServiceFactory $planets, PhalanxService $phalanx): JsonResponse
    {
        $input = $request->validate([
            'planet' => ['required', 'integer', 'min:1'],
            'galaxy' => ['required', 'integer', 'min:1', 'max:'.$settings->numberOfGalaxies()],
            'system' => ['required', 'integer', 'min:1', 'max:499'],
        ]);
        $planet = $this->ownedPlanet($player, (int)$input['planet']);
        $player->setCurrentPlanetId($planet->getPlanetId());
        return response()->json([
            'galaxy' => (int)$input['galaxy'], 'system' => (int)$input['system'],
            'maxGalaxies' => $settings->numberOfGalaxies(), 'maxSystems' => 499,
            'rows' => resolve(GalaxyController::class)->getGalaxyArray((int)$input['galaxy'], (int)$input['system'], $player, $planets, $phalanx),
        ])->header('Cache-Control', 'private, no-store');
    }

    /** Delegate writes to the exact controllers used by the original interface. */
    public function command(Request $request, PlayerService $player): JsonResponse
    {
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        $input = $request->validate([
            'planet' => ['required', 'integer', 'min:1'],
            'action' => ['required', Rule::in(['build', 'research', 'ship', 'defense', 'cancel-building', 'cancel-research'])],
            'technologyId' => ['required', 'integer', Rule::in(array_map(fn (GameObject $object): int => $object->id, ObjectService::getObjects()))],
            'amount' => ['required_if:action,ship,defense', 'integer', 'min:1'],
            'listId' => ['required_if:action,cancel-building,cancel-research', 'integer', 'min:1'],
        ]);
        $planet = $this->ownedPlanet($player, (int)$input['planet']);
        $object = ObjectService::getObjectById((int)$input['technologyId']);
        $expected = match ($input['action']) {
            'research', 'cancel-research' => [GameObjectType::Research],
            'ship' => [GameObjectType::Ship],
            'defense' => [GameObjectType::Defense],
            default => [GameObjectType::Building, GameObjectType::Station],
        };
        abort_unless(in_array($object->type, $expected, true), 422);
        // Bind every command to its explicitly owned planet, independent of another tab.
        $player->setCurrentPlanetId($planet->getPlanetId());
        $planet->update();
        // Whitelist the legacy payload, including for JSON requests.
        $request->replace([...$input, 'technologyId' => (string)$object->id, '_token' => $request->input('_token')]);
        return match ($input['action']) {
            'build' => resolve(ResourcesController::class)->addBuildRequest($request, $player),
            'research' => resolve(ResearchController::class)->addBuildRequest($request, $player),
            'ship' => resolve(ShipyardController::class)->addBuildRequest($request, $player),
            'defense' => resolve(DefenseController::class)->addBuildRequest($request, $player),
            'cancel-building' => resolve(ResourcesController::class)->cancelBuildRequest($request, $player),
            'cancel-research' => resolve(ResearchController::class)->cancelBuildRequest($request, $player),
            default => abort(422),
        };
    }

    private function ownedPlanet(PlayerService $player, int $id): PlanetService
    {
        abort_unless($player->planets->planetExistsAndOwnedByPlayer($id), 404);
        return $player->planets->getById($id);
    }
}
