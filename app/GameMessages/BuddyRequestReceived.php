<?php

namespace OGame\GameMessages;

use OGame\GameMessages\Abstracts\GameMessage;
use OGame\Models\BuddyRequest;

class BuddyRequestReceived extends GameMessage
{
    protected function initialize(): void
    {
        $this->key = 'buddy_request_received';
        $this->params = ['sender_name', 'buddy_request_id'];
        $this->tab = 'communication';
        $this->subtab = 'information';
    }

    /**
     * @inheritdoc
     */
    public function getFooterActions(): string
    {
        // Get the buddy request ID from the message params
        $buddyRequestId = $this->message->params['buddy_request_id'] ?? null;

        if (!$buddyRequestId) {
            return '';
        }

        // Load the buddy request to check its status
        $buddyRequest = BuddyRequest::find($buddyRequestId);

        // Only show buttons if the request is still pending
        if (!$buddyRequest || !$buddyRequest->isPending()) {
            return '';
        }

        $live = (bool)request()->attributes->get('live3d');
        return '
            <gradient-button sq30="">
                <button class="custom_btn tooltip acceptRequest" data-buddyid="' . $buddyRequestId . '" aria-label="' . __('t_readability.buddy_accept') . '" data-tooltip-title="' . __('t_readability.buddy_accept') . '">
                    <span class="icon_nf icon_accept" aria-hidden="true"></span>' . ($live ? '<span class="buddy-action-label">✓ ' . __('t_readability.buddy_accept') . '</span>' : '') . '
                </button>
            </gradient-button>
            <gradient-button sq30="">
                <button class="custom_btn tooltip rejectRequest" data-buddyid="' . $buddyRequestId . '" aria-label="' . __('t_readability.buddy_decline') . '" data-tooltip-title="' . __('t_readability.buddy_decline') . '">
                    <span class="icon_nf icon_refuse" aria-hidden="true"></span>' . ($live ? '<span class="buddy-action-label">✕ ' . __('t_readability.buddy_decline') . '</span>' : '') . '
                </button>
            </gradient-button>
        ';
    }
}
