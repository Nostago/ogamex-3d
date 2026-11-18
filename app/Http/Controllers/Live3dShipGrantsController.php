<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OGame\Models\AdminShipGrant;
use OGame\Models\Planet;
use OGame\Models\User;
use OGame\Services\AdminShipGrantService;
use OGame\Services\Live3dArtworkService;
use OGame\Services\ObjectService;
use OGame\Services\PlayerService;

class Live3dShipGrantsController extends Controller
{
    public function search(Request $request, PlayerService $player): JsonResponse
    {
        abort_unless($player->isAdmin(), 403);
        $data = $request->validate(['q' => ['required', 'string', 'max:80']]);
        $query = trim($data['q']);
        $users = User::query()->where(function ($builder) use ($query): void {
            $builder->where('username', 'like', '%'.addcslashes($query, '%_\\').'%');
            if (ctype_digit($query)) {
                $builder->orWhere('id', (int)$query);
            }
        })->orderBy('username')->limit(26)->get(['id', 'username']);
        return response()->json(['players' => $users->take(25)->values()->toArray(), 'truncated' => $users->count() > 25])->header('Cache-Control', 'private, no-store');
    }

    public function worlds(int $userId, PlayerService $player, AdminShipGrantService $grants): JsonResponse
    {
        abort_unless($player->isAdmin(), 403);
        $owner = User::query()->findOrFail($userId);
        $worlds = [];
        foreach (Planet::query()->where('user_id', $owner->id)->where('destroyed', 0)->whereIn('planet_type', [1, 3])->orderBy('galaxy')->orderBy('system')->orderBy('planet')->orderBy('planet_type')->get() as $planet) {
            $ships = [];
            foreach (ObjectService::getShipObjects() as $ship) {
                if ($ship->valid_planet_types !== [] && !in_array($planet->planet_type, array_map(fn ($type): int => $type->value, $ship->valid_planet_types), true)) {
                    continue;
                }
                $ships[] = ['id' => $ship->id, 'name' => $ship->title, 'available' => (string)$planet->getAttribute($ship->machine_name), 'image' => Live3dArtworkService::image($ship, asset('img/objects/units/'.$ship->assets->imgSmall))];
            }
            $worlds[] = ['id' => $planet->id, 'name' => $planet->name, 'coordinates' => $planet->galaxy.':'.$planet->system.':'.$planet->planet, 'type' => $planet->planet_type, 'ships' => $ships];
        }
        $history = AdminShipGrant::query()->where('user_id', $owner->id)->latest('id')->limit(10)->get();
        return response()->json(['player' => ['id' => $owner->id, 'name' => $owner->username], 'worlds' => $worlds, 'history' => $history->map(fn (AdminShipGrant $grant): array => $grants->receipt($grant))])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, PlayerService $player, AdminShipGrantService $grants): JsonResponse
    {
        abort_unless($player->isAdmin(), 403);
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        $input = $request->validate([
            'request_id' => ['required', 'uuid'], 'user_id' => ['required', 'integer', 'min:1'], 'planet_id' => ['required', 'integer', 'min:1'],
            'technologyId' => ['required', 'integer', Rule::in(array_map(fn ($ship): int => $ship->id, ObjectService::getShipObjects()))],
            'amount' => ['required', 'integer', 'between:1,1000000000'], 'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $result = $grants->grant($player->getId(), $input);
        return response()->json(['status' => 'success', 'replayed' => $result['replayed'], 'grant' => $grants->receipt($result['grant'])], $result['replayed'] ? 200 : 201)->header('Cache-Control', 'private, no-store');
    }
}
