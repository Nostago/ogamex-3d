@extends('live3d.social.layout')
@section('title', __('t_socialui.friends'))
@section('content')
    <header class="social-heading">
        <div>
            <h2>{{ __('t_socialui.friends') }}</h2>
            <p>{{ __('t_socialui.friends_description') }}</p>
        </div>
        <span class="social-count">{{ trans_choice('t_socialui.friend_count', $buddies->count()) }}</span>
    </header>
    <section class="social-panel">
        <header class="social-heading">
            <h3>{{ __('t_socialui.my_friends') }}</h3>
            <label>
                {{ __('t_socialui.filter_friends') }}
                <input type="search" data-social-filter placeholder="{{ __('t_socialui.name') }}">
            </label>
        </header>
        <table class="social-table social-friends">
            <thead>
                <tr>
                    <th scope="col">{{ __('t_socialui.player') }}</th>
                    <th scope="col">{{ __('t_socialui.points') }}</th>
                    <th scope="col">{{ __('t_socialui.rank') }}</th>
                    <th scope="col">{{ __('t_socialui.coordinates') }}</th>
                    <th scope="col">{{ __('t_socialui.actions') }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($buddies as $friendship)
                    @php
                        $buddy = $friendship->sender_user_id === auth()->id() ? $friendship->receiver : $friendship->sender;
                        $buddyPlayer = app(\OGame\Services\PlayerService::class, ['player_id' => $buddy->id]);
                        $scores = app(\OGame\Services\HighscoreService::class);
                        $coords = $buddyPlayer->planets->first()?->getPlanetCoordinates();
                        $online = $buddy->isOnline();
                    @endphp
                    <tr data-social-friend="{{ $buddy->username }}">
                        <td data-label="{{ __('t_socialui.player') }}">
                            <strong>{{ $buddy->username }}</strong>
                            <span @class(['social-status', 'social-online' => $online])>{{ $online ? __('t_socialui.online') : __('t_socialui.offline') }}</span>
                        </td>
                        <td data-label="{{ __('t_socialui.points') }}">{{ number_format($scores->getPlayerScore($buddyPlayer), 0, ',', '.') }}</td>
                        <td data-label="{{ __('t_socialui.rank') }}">
                            <a href="{{ route('highscore.index', ['ui' => 'live3d', 'cp' => request('cp'), 'searchRelId' => $buddy->id]) }}">{{ $scores->getHighscorePlayerRank($buddyPlayer) ?: '–' }}</a>
                        </td>
                        <td data-label="{{ __('t_socialui.coordinates') }}">
                            @if($coords)
                                <a data-social-galaxy href="{{ route('galaxy.index', ['galaxy' => $coords->galaxy, 'system' => $coords->system]) }}">[{{ $coords->asString() }}]</a>
                            @else
                                –
                            @endif
                        </td>
                        <td data-label="{{ __('t_socialui.actions') }}">
                            <div class="social-actions">
                                @include('live3d.social.actions', ['id' => $buddy->id, 'name' => $buddy->username, 'requestFriend' => false])
                                @include('live3d.social.buddy-action', ['action' => 10, 'id' => $buddy->id, 'label' => __('t_socialui.remove_friend'), 'confirm' => true])
                            </div>
                        </td>
                    </tr>
                @endforeach
                <tr data-social-no-friends @if($buddies->isNotEmpty()) hidden @endif>
                    <td colspan="5" class="social-empty">{{ __('t_socialui.no_friends') }}</td>
                </tr>
            </tbody>
        </table>
    </section>
    <div class="social-request-grid">
        @foreach(['received' => $received_requests, 'sent' => $sent_requests] as $direction => $requests)
            <section class="social-panel">
                <h3>{{ __('t_socialui.'.$direction) }} <span class="social-count">{{ $requests->count() }}</span></h3>
                @forelse($requests as $friendRequest)
                    @php($other = $direction === 'received' ? $friendRequest->sender : $friendRequest->receiver)
                    <article class="social-request">
                        <strong>{{ $other->username }}</strong>
                        @if($friendRequest->message)<p>{{ $friendRequest->message }}</p>@endif
                        <div class="social-actions">
                            @if($direction === 'received')
                                @include('live3d.social.buddy-action', ['action' => 5, 'id' => $friendRequest->id, 'label' => __('t_socialui.accept'), 'confirm' => false])
                                @include('live3d.social.buddy-action', ['action' => 4, 'id' => $friendRequest->id, 'label' => __('t_socialui.reject'), 'confirm' => false])
                            @else
                                @include('live3d.social.buddy-action', ['action' => 3, 'id' => $friendRequest->id, 'label' => __('t_socialui.withdraw'), 'confirm' => false])
                            @endif
                        </div>
                    </article>
                @empty
                    <p class="social-empty">{{ __('t_socialui.no_requests') }}</p>
                @endforelse
            </section>
        @endforeach
    </div>
    <section class="social-panel">
        <h3>{{ __('t_socialui.find_players') }}</h3>
        <form class="social-search" method="get" action="{{ route('buddies.index') }}">
            <input type="hidden" name="ui" value="live3d">
            <input type="hidden" name="cp" value="{{ request('cp') }}">
            <label for="social-search">{{ __('t_socialui.name') }}</label>
            <input id="social-search" name="q" type="search" value="{{ $search }}" maxlength="100" required>
            <button type="submit">{{ __('t_socialui.search') }}</button>
        </form>
        @if($search !== '')
            <div class="social-search-results">
                @forelse($search_results as $result)
                    <article class="social-request">
                        <strong>{{ $result->username }}</strong>
                        @include('live3d.social.actions', ['id' => $result->id, 'name' => $result->username, 'requestFriend' => !$result->hasRole('admin')])
                    </article>
                @empty
                    <p class="social-empty">{{ __('t_socialui.no_results') }}</p>
                @endforelse
            </div>
        @endif
    </section>
    <section class="social-panel">
        <h3>{{ __('t_socialui.ignored') }}</h3>
        @forelse($ignored_players as $ignored)
            <article class="social-request">
                <strong>{{ $ignored->ignoredUser->username }}</strong>
                <form method="post" action="{{ route('buddies.unignore', ['ui' => 'live3d', 'cp' => request('cp')]) }}">
                    @csrf
                    <input type="hidden" name="ignored_user_id" value="{{ $ignored->ignored_user_id }}">
                    <button type="submit">{{ __('t_socialui.unignore') }}</button>
                </form>
            </article>
        @empty
            <p class="social-empty">{{ __('t_socialui.no_ignored') }}</p>
        @endforelse
    </section>
@endsection
