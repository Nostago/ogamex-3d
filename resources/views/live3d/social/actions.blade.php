<div class="social-actions">
    @if($id !== (int) auth()->id())
        <button type="button" data-social-action="chat" data-player-id="{{ $id }}" data-player-name="{{ $name }}">
            {{ __('t_socialui.message') }}
        </button>
        @if($requestFriend ?? false)
            <button type="button" data-social-action="request" data-player-id="{{ $id }}" data-player-name="{{ $name }}">
                {{ __('t_socialui.add_friend') }}
            </button>
        @endif
    @else
        <span class="social-muted">{{ __('t_socialui.you') }}</span>
    @endif
</div>
