<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use OGame\Services\MessageService;

class MessagesController extends OGameController
{
    /**
     * Shows the messages index page.
     *
     * @param Request $request
     * @param MessageService $messageService
     * @return View
     */
    public function index(Request $request, MessageService $messageService): View
    {
        $this->setBodyId('messages');

        $unread_messages_count = $messageService->getUnreadMessageCounts();

        // By default open the "Fleets/Espionage" tab.
        $tabKey = $request->input('tab', 'fleets');
        $subtabKey = $request->input('subtab', 'espionage');
        $page = (int) $request->input('pagination', 1);

        $tabContent = $this->tabContent($messageService, $tabKey, $subtabKey, $page);

        return view('ingame.messages.index')->with([
            'unread_messages_count' => $unread_messages_count,
            'tab_content' => $tabContent,
        ]);
    }

    /**
     * Return tab content based on tab.
     *
     * @param MessageService $messageService
     * @param string $tab
     * @param string $subtab
     * @param int $page
     * @return View
     */
    protected function tabContent(MessageService $messageService, string $tab, string $subtab = '', int $page = 1): View
    {
        switch ($tab) {
            case 'fleets':
                return view('ingame.messages.tabs.fleets.tab')->with([
                    'unread_messages_count' => $messageService->getUnreadMessageCounts('fleets'),
                ]);
            case 'communication':
                return view('ingame.messages.tabs.communication.tab')->with([
                    'unread_messages_count' => $messageService->getUnreadMessageCounts('communication'),
                ]);
            case 'economy':
            case 'universe':
            case 'system':
            case 'favorites':
                return view('ingame.messages.tabs.default.tab')->with([
                    'subtab_content' => $this->subTabContent($messageService, $tab, $subtab, $page),
                ]);
            default:
                return view('ingame.messages.tabs.fleets.tab')->with([
                    'subtab_content' => $this->subTabContent($messageService, $tab, $subtab, $page),
                ]);
        }
    }

    /**
     * Return subtab content based on tab.
     *
     * @param MessageService $messageService
     * @param string $tab
     * @param string $subtab
     * @param int $page
     * @return View
     */
    protected function subTabContent(MessageService $messageService, string $tab, string $subtab = '', int $page = 1): View
    {
        $result = $messageService->getMessagesForTab($tab, $subtab, $page);

        // Return the correct subtab view based on tab.
        switch ($tab) {
            case 'fleets':
                return view('ingame.messages.tabs.fleets.subtab')->with([
                    'messages' => $result['messages'],
                    'pagination' => $result['pagination'],
                ]);
            default:
                return view('ingame.messages.tabs.default.subtab')->with([
                    'messages' => $result['messages'],
                    'pagination' => $result['pagination'],
                ]);
        }
    }

    /**
     * Get messages for specific tab and subtab via AJAX.
     *
     * @param Request $request
     * @param MessageService $messageService
     * @return View
     */
    public function ajaxGetTabContents(Request $request, MessageService $messageService): View
    {
        // A direct navigation needs the complete shell; AJAX still receives its original fragment.
        if ($request->input('ui') === 'live3d' && !$request->ajax()) {
            return $this->index($request, $messageService);
        }

        $tabKey = $request->input('tab', 'fleets');
        $subtabKey = $request->input('subtab', '');
        $page = (int) $request->input('pagination', 1);

        // If no subtab is provided, we load the tab template.
        if (empty($subtabKey)) {
            return $this->tabContent($messageService, $tabKey, '', $page);
        }

        // Otherwise we load the subtab template.
        return $this->subTabContent($messageService, $tabKey, $subtabKey, $page);
    }

    /**
     * Returns an individual message for a full screen view with pagination context.
     *
     * @param int $messageId
     * @param Request $request
     * @param MessageService $messageService
     * @return View
     */
    public function ajaxGetMessage(int $messageId, Request $request, MessageService $messageService): View
    {
        // Get tab and subtab from request for pagination context
        $tab = $request->input('tab');
        $subtab = $request->input('subtab');

        // Get full message with pagination context
        $paginationData = $messageService->getMessagePaginationContext($messageId, $tab, $subtab);

        return view($request->attributes->get('live3d') ? 'live3d.messages.detail' : 'ingame.messages.message')->with([
            'messageId' => $messageId,
            'messageBody' => $paginationData['message']->getBodyFull(),
            'battleReplayUrl' => $paginationData['message']->getKey() === 'battle_report' ? route('live3d.battle-replay', ['messageId' => $messageId]) : null,
            'pagination' => $paginationData['pagination'],
        ]);
    }

    /**
     * Handle POST requests for messages which are used for deleting messages and other things.
     *
     * @param Request $request
     * @param MessageService $messageService
     * @return JsonResponse
     */
    public function post(Request $request, MessageService $messageService): JsonResponse
    {
        $token = $request->input('_token', $request->header('X-CSRF-TOKEN'));
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
        if (in_array($request->input('action'), ['delete-read', 'delete-selected'], true)) {
            $data = $request->validate(['messageIds' => ['required', 'array', 'min:1', 'max:100'], 'messageIds.*' => ['required', 'integer', 'min:1', 'distinct']]);
            return response()->json(['deleted' => $messageService->deleteMessages($data['messageIds'], $request->input('action') === 'delete-read')]);
        }
        $messageId = $request->input('messageId');

        // If action is 103, we delete the message.
        if ((int)$request->input('action') === 103) {
            $messageService->deleteMessage($messageId);
        }

        // Return JSON response with message ID as key and success as value.
        return response()->json([
            $messageId => true,
        ]);
    }
}
