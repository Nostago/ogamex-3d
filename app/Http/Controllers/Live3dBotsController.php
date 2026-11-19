<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OGame\Models\AutonomousBot;
use OGame\Models\User;
use OGame\Services\AutonomousBotService;
use OGame\Services\AutonomousBotStrategy;
use OGame\Services\ObjectService;
use OGame\Services\PlayerService;
use OGame\Services\SettingsService;

class Live3dBotsController extends Controller
{
    public function state(PlayerService $player, SettingsService $settings): JsonResponse
    {
        abort_unless($player->isAdmin(), 403);
        $names = User::whereIn('id', AutonomousBot::pluck('user_id'))->pluck('username', 'id');
        $rows = [];
        foreach (AutonomousBot::orderBy('id')->get() as $bot) {
            $row = $bot->toArray();
            $row['name'] = $names[$bot->user_id] ?? '';
            $row['objectName'] = $bot->last_object ? ObjectService::getObjectByMachineName($bot->last_object)->title : null;
            $row['effectiveStrategy'] = AutonomousBotStrategy::settings($bot);
            $rows[] = $row;
        }
        $heartbeat = (int)$settings->get('autonomous_bots_heartbeat', 0);
        return response()->json(['bots' => $rows, 'heartbeat' => $heartbeat, 'schedulerActive' => $heartbeat > (int)Date::now()->timestamp - 180])->header('Cache-Control', 'private, no-store');
    }

    public function command(Request $request, PlayerService $player, AutonomousBotService $bots): JsonResponse
    {
        abort_unless($player->isAdmin(), 403);
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        $data = $request->validate([
            'action' => ['required', Rule::in(['create', 'save', 'tick', 'populate', 'strategy-all'])],
            'id' => ['required_unless:action,create,populate,strategy-all', 'integer', 'min:1'],
        ]);
        if ($data['action'] === 'populate') {
            return response()->json(['success' => true, 'active' => $bots->populate(50)]);
        }
        if ($data['action'] === 'tick') {
            $bot = AutonomousBot::findOrFail((int)$data['id']);
            abort_unless($bot->enabled, 422, __('t_bots.disabled'));
            return response()->json(['success' => true, 'decisions' => $bots->tickDue(1, $bot->id, true)]);
        }
        $strategy = $this->validateStrategy($request, $data['action'] === 'strategy-all');
        if ($data['action'] === 'strategy-all') {
            $count = DB::transaction(function () use ($strategy): int {
                $bots = AutonomousBot::orderBy('id')->lockForUpdate()->get();
                foreach ($bots as $bot) {
                    $bot->strategy = $strategy['strategy'] ?? null;
                    $bot->save();
                }
                return $bots->count();
            }, 3);
            return response()->json(['success' => true, 'updated' => $count]);
        }
        $options = $request->validate([
            'enabled' => ['required', 'boolean'], 'profile' => ['required', Rule::in(['balanced', 'economy', 'explorer'])],
            'interval_seconds' => ['required', 'integer', 'between:60,3600'], 'max_level' => ['required', 'integer', 'between:1,30'],
            'ship_limit' => ['required', 'integer', 'between:0,10000'], 'batch_size' => ['required', 'integer', 'between:1,100'],
            'auto_build' => ['sometimes', 'boolean'], 'auto_research' => ['sometimes', 'boolean'],
            'auto_shipbuilding' => ['sometimes', 'boolean'], 'auto_raid' => ['sometimes', 'boolean'],
            'auto_fleet_save' => ['sometimes', 'boolean'], 'raid_inactive_players' => ['sometimes', 'boolean'],
        ]);
        $options = array_merge($options, $strategy);
        if ($data['action'] === 'create') {
            $input = $request->validate(['name' => ['required', 'string', 'min:2', 'max:28', 'regex:/^[\pL\pN][\pL\pN _-]*$/u', Rule::unique('users', 'username')], 'seed_resources' => ['required', 'integer', 'between:0,1000000']]);
            abort_if(AutonomousBot::count() >= 100, 422, __('t_bots.limit_reached'));
            $bot = $bots->create($input['name'], $options, (int)$input['seed_resources']);
            return response()->json(['success' => true, 'id' => $bot->id]);
        }
        $rename = $request->validate(['name' => ['sometimes', 'required', 'string', 'min:2', 'max:28', 'regex:/^[\pL\pN][\pL\pN _-]*$/u']]);
        DB::transaction(function () use ($data, $options, $rename): void {
            $bot = AutonomousBot::whereKey((int)$data['id'])->lockForUpdate()->firstOrFail();
            if (isset($rename['name'])) {
                $name = validator($rename, ['name' => [Rule::unique('users', 'username')->ignore($bot->user_id)]])->validate();
                User::whereKey($bot->user_id)->update(['username' => $name['name']]);
            }
            $bot->fill($options);
            $bot->next_tick_at = Date::now();
            $bot->save();
        }, 3);
        return response()->json(['success' => true]);
    }

    /** @return array{strategy?: array<string, int|float>|null} */
    private function validateStrategy(Request $request, bool $required): array
    {
        $input = $request->validate([
            'strategy' => [$required ? 'present' : 'sometimes', 'nullable', 'array:fleet,economy,research,raid_every,strength'],
            'strategy.fleet' => ['required_with:strategy', 'integer', 'between:0,100'],
            'strategy.economy' => ['required_with:strategy', 'integer', 'between:0,100'],
            'strategy.research' => ['required_with:strategy', 'integer', 'between:0,100'],
            'strategy.raid_every' => ['required_with:strategy', 'integer', 'between:1,12'],
            'strategy.strength' => ['required_with:strategy', 'numeric', 'between:1,10', 'decimal:0,1'],
        ]);
        if (isset($input['strategy'])) {
            if ((int)($input['strategy']['fleet'] ?? 0) + (int)($input['strategy']['economy'] ?? 0) + (int)($input['strategy']['research'] ?? 0) < 1) {
                throw ValidationException::withMessages(['strategy' => __('t_bots.bots_strategy_zero')]);
            }
            $input['strategy'] = ['fleet' => (int)$input['strategy']['fleet'], 'economy' => (int)$input['strategy']['economy'],
                'research' => (int)$input['strategy']['research'], 'raid_every' => (int)$input['strategy']['raid_every'],
                'strength' => (float)$input['strategy']['strength']];
        }
        return $input;
    }
}
