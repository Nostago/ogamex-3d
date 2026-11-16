@extends('live3d.social.layout')
@section('title', __('t_socialui.highscore'))
@section('content')
    <header class="social-heading">
        <div>
            <h2>{{ __('t_socialui.highscore') }}</h2>
            <p>{{ __('t_socialui.ranking_description') }}</p>
        </div>
        <span class="social-count">{{ number_format($amount, 0, ',', '.') }} {{ __('t_socialui.players') }}</span>
    </header>
    <section class="social-panel">
        <nav class="social-pagination" aria-label="{{ __('t_socialui.pagination') }}">
            <a href="{{ route('highscore.index', ['ui' => 'live3d', 'cp' => request('cp'), 'searchRelId' => $playerId]) }}">
                {{ __('t_socialui.my_position') }}
            </a>
            <form method="get" action="{{ route('highscore.index') }}">
                <input type="hidden" name="ui" value="live3d">
                <input type="hidden" name="cp" value="{{ request('cp') }}">
                <label for="social-page">{{ __('t_socialui.page') }}</label>
                <select id="social-page" name="page" data-social-page>
                    @for($i = 1; $i <= $pages; $i++)
                        <option value="{{ $i }}" @selected($page === $i)>{{ ($i - 1) * 100 + 1 }}–{{ min($i * 100, $amount) ?: 1 }}</option>
                    @endfor
                </select>
                <button type="submit">{{ __('t_socialui.show') }}</button>
            </form>
        </nav>
        <table class="social-table social-ranking">
            <thead>
                <tr>
                    <th scope="col">{{ __('t_socialui.rank') }}</th>
                    <th scope="col">{{ __('t_socialui.player') }}</th>
                    <th scope="col" class="social-number">{{ __('t_socialui.points') }}</th>
                    <th scope="col">{{ __('t_socialui.actions') }}</th>
                </tr>
            </thead>
            <tbody>
                @forelse($players as $entry)
                    <tr @class(['social-own' => $entry['id'] === $playerId, 'social-selected' => $entry['id'] === $selectedId]) data-social-player="{{ $entry['id'] }}">
                        <td data-label="{{ __('t_socialui.rank') }}">{{ number_format($entry['rank'], 0, ',', '.') }}</td>
                        <td data-label="{{ __('t_socialui.player') }}">
                            <strong>{{ $entry['name'] }}</strong>
                            <a class="social-coordinate" data-social-galaxy
                               href="{{ route('galaxy.index', ['galaxy' => $entry['planet_coords']->galaxy, 'system' => $entry['planet_coords']->system, 'position' => $entry['planet_coords']->position]) }}">
                                [{{ $entry['planet_coords']->asString() }}]
                            </a>
                        </td>
                        <td class="social-number" data-label="{{ __('t_socialui.points') }}">{{ number_format($entry['points'], 0, ',', '.') }}</td>
                        <td data-label="{{ __('t_socialui.actions') }}">
                            @include('live3d.social.actions', ['id' => $entry['id'], 'name' => $entry['name'], 'requestFriend' => true])
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="4" class="social-empty">{{ __('t_socialui.no_scores') }}</td></tr>
                @endforelse
            </tbody>
        </table>
        <nav class="social-pagination" aria-label="{{ __('t_socialui.pagination') }}">
            @if($page > 1)
                <a href="{{ route('highscore.index', ['page' => $page - 1, 'ui' => 'live3d', 'cp' => request('cp')]) }}">← {{ __('t_socialui.previous') }}</a>
            @endif
            <span>{{ __('t_socialui.page_of', ['page' => $page, 'pages' => $pages]) }}</span>
            @if($page < $pages)
                <a href="{{ route('highscore.index', ['page' => $page + 1, 'ui' => 'live3d', 'cp' => request('cp')]) }}">{{ __('t_socialui.next') }} →</a>
            @endif
        </nav>
    </section>
@endsection
