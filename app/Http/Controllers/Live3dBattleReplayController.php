<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use OGame\Models\BattleReport;
use OGame\Models\Message;
use OGame\Services\Live3dBattleReplayService;
use OGame\Services\PlayerService;

class Live3dBattleReplayController extends Controller
{
    public function show(int $messageId, PlayerService $player, Live3dBattleReplayService $replay): JsonResponse
    {
        // A retained recipient message grants access, not participation or a guessed report ID.
        $message = Message::query()->where('user_id', $player->getId())->where('key', 'battle_report')->findOrFail($messageId);
        abort_if($message->battle_report_id === null, 404);
        $report = BattleReport::query()->findOrFail($message->battle_report_id);
        return response()->json($replay->project($report))->header('Cache-Control', 'private, no-store');
    }
}
