@extends(request()->attributes->get('live3d') ? 'live3d.social.layout' : 'ingame.layouts.main')
@section('title', __('t_fleettiming.title'))
@section('root_id', 'live-fleet-timing')
@section('content')
<section id="fleet-timing">
    <h2>{{ __('t_fleettiming.title') }}</h2>
    @if(session('success'))<p class="timing-success" role="status">{{ session('success') }}</p>@endif
    @if($errors->any())<div role="alert" class="timing-error">@foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach</div>@endif
    <div class="timing-toolbar"><p>{{ __('t_fleettiming.active') }}: <strong>{{ $missions->total() }}</strong> · {{ __('t_fleettiming.clock') }}: <strong id="server-clock"></strong></p><button type="button" onclick="location.reload()">{{ __('t_fleettiming.refresh') }}</button></div>
    <section class="timing-panel"><h3>{{ __('t_fleettiming.filter') }}</h3>
        <form method="GET" action="{{ route('admin.fleettiming.index') }}" id="filter-form" class="timing-filter">
            @if(request()->attributes->get('live3d'))<input type="hidden" name="ui" value="live3d">@endif
            <datalist id="player-datalist">@foreach($allUsers as $uid => $uname)<option value="{{ $uname }} (#{{ $uid }})"></option>@endforeach</datalist>
            <input type="hidden" name="user_id" id="player-user-id" value="{{ $filterUserId ?? '' }}">
            <label for="player-search">{{ __('t_fleettiming.player') }} ({{ __('t_fleettiming.active_players', ['count' => $allUsers->count()]) }})<input type="text" id="player-search" list="player-datalist" placeholder="{{ __('t_fleettiming.search') }}" autocomplete="off" value="{{ $filterUserId && isset($allUsers[$filterUserId]) ? $allUsers[$filterUserId].' (#'.$filterUserId.')' : '' }}"></label>
            <label>{{ __('t_fleettiming.per_page') }}<select name="per_page">@foreach($perPageOptions as $option)<option value="{{ $option }}" @selected($perPage === $option)>{{ $option }}</option>@endforeach</select></label>
            <button type="submit">{{ __('t_fleettiming.apply') }}</button>
            @if($filterUserId)<a href="{{ route('admin.fleettiming.index', request()->attributes->get('live3d') ? ['ui' => 'live3d'] : []) }}">{{ __('t_fleettiming.clear') }}</a>@endif
        </form>
    </section>
    <details class="timing-panel timing-global"><summary>{{ __('t_fleettiming.global') }}</summary><p>{{ __('t_fleettiming.global_hint') }}</p>
        <form method="POST" action="{{ route('admin.fleettiming.fast-forward-all') }}" data-confirm="{{ __('t_fleettiming.confirm_all') }}">
            @csrf
            @if($filterUserId)<input type="hidden" name="user_id" value="{{ $filterUserId }}">@endif
            <button type="submit">{{ __('t_fleettiming.'.($filterUserId ? 'all_player' : 'all')) }}</button>
        </form>
    </details>
    <section class="timing-missions"><h3>{{ __('t_fleettiming.active') }}</h3>
        @forelse($missions as $mission)
        <article class="timing-panel timing-mission" data-mission-id="{{ $mission->id }}">
            <header><h4>{{ __('t_fleettiming.mission') }} #{{ $mission->id }} · {{ $missionTypeLabels[$mission->mission_type] ?? __('t_fleettiming.unknown_type', ['id' => $mission->mission_type]) }}</h4><p>{{ $users[$mission->user_id] ?? __('t_fleettiming.unknown_player', ['id' => $mission->user_id]) }} (#{{ $mission->user_id }})</p></header>
            <dl class="timing-facts">
                <div><dt>{{ __('t_fleettiming.from') }}</dt><dd>[{{ $mission->galaxy_from }}:{{ $mission->system_from }}:{{ $mission->position_from }}]</dd></div>
                <div><dt>{{ __('t_fleettiming.to') }}</dt><dd>[{{ $mission->galaxy_to }}:{{ $mission->system_to }}:{{ $mission->position_to }}]</dd></div>
                <div><dt>{{ __('t_fleettiming.departure') }}</dt><dd>{{ date('d.m.Y H:i:s', $mission->time_departure) }}</dd></div>
                <div><dt>{{ __('t_fleettiming.arrival') }}</dt><dd>{{ date('d.m.Y H:i:s', $mission->time_arrival) }}</dd></div>
            </dl>
            <p>{{ __('t_fleettiming.remaining') }}</p>
            <div class="timing-duration" data-arrival="{{ $mission->time_arrival }}" aria-label="{{ __('t_fleettiming.remaining') }}">@foreach(['days', 'hours', 'mins', 'seconds'] as $unit)<span><span>{{ __('t_fleettiming.'.$unit) }}</span><strong data-time-part="{{ $unit }}">0</strong></span>@endforeach</div>
            <p class="timing-arrived" hidden>{{ __('t_fleettiming.arrived') }}</p>
            @if($mission->time_holding)<p>{{ __('t_fleettiming.holding') }}: <span data-hold="{{ $mission->time_holding }}"></span></p>@endif
            <div class="timing-actions">
                <form method="POST" action="{{ route('admin.fleettiming.reduce') }}" class="timing-reduce">
                    @csrf
                    <input type="hidden" name="mission_id" value="{{ $mission->id }}">
                    <label for="timing-minutes-{{ $mission->id }}">{{ __('t_fleettiming.minutes') }}</label>
                    <input type="number" id="timing-minutes-{{ $mission->id }}" name="minutes" value="60" min="1" max="10000" step="1" required aria-label="{{ __('t_fleettiming.reduce_label', ['id' => $mission->id]) }}">
                    <button type="submit">{{ __('t_fleettiming.reduce') }}</button>
                </form>
                <form method="POST" action="{{ route('admin.fleettiming.fast-forward') }}" data-confirm="{{ __('t_fleettiming.confirm_one', ['id' => $mission->id]) }}">
                    @csrf
                    <input type="hidden" name="mission_id" value="{{ $mission->id }}">
                    <button type="submit">{{ __('t_fleettiming.now') }}</button>
                </form>
            </div>
        </article>
        @empty<p>{{ __('t_fleettiming.empty') }}</p>@endforelse
    </section>
    @if($missions->total())<nav class="timing-pagination" aria-label="{{ __('t_fleettiming.active') }}"><span>{{ __('t_fleettiming.showing', ['first' => $missions->firstItem(), 'last' => $missions->lastItem(), 'total' => $missions->total()]) }}</span>
        @if($missions->previousPageUrl())<a href="{{ $missions->previousPageUrl() }}">{{ __('t_fleettiming.previous') }}</a>@endif
        @foreach($missions->getUrlRange(max(1, $missions->currentPage() - 2), min($missions->lastPage(), $missions->currentPage() + 2)) as $page => $url)<a href="{{ $url }}" @if($page === $missions->currentPage()) aria-current="page" @endif>{{ $page }}</a>@endforeach
        @if($missions->nextPageUrl())<a href="{{ $missions->nextPageUrl() }}">{{ __('t_fleettiming.next') }}</a>@endif
    </nav>@endif
</section>
@php $durationLabels = [__('t_fleettiming.days'), __('t_fleettiming.hours'), __('t_fleettiming.mins'), __('t_fleettiming.seconds')]; @endphp
<script>
(() => {
    const serverNow = {{ $now }}, start = Date.now();
    const labels = @json($durationLabels);
    const parts = seconds => { const n = Math.max(0, Math.floor(seconds)); return [Math.floor(n / 86400), Math.floor(n % 86400 / 3600), Math.floor(n % 3600 / 60), n % 60]; };
    const tick = () => {
        const now = serverNow + Math.floor((Date.now() - start) / 1000);
        document.querySelector('#server-clock').textContent = new Date(now * 1000).toLocaleTimeString(document.documentElement.lang);
        document.querySelectorAll('.timing-duration').forEach(node => {
            const left = Number(node.dataset.arrival) - now;
            parts(left).forEach((n, i) => node.querySelectorAll('[data-time-part]')[i].textContent = n);
            node.nextElementSibling.hidden = left > 0;
        });
    };
    document.querySelectorAll('[data-hold]').forEach(node => node.textContent = parts(Number(node.dataset.hold)).map((n, i) => labels[i] + ': ' + n).join(' · '));
    tick();
    const interval = setInterval(tick, 1000);
    addEventListener('pagehide', () => clearInterval(interval), {once: true});
    document.querySelectorAll('form[data-confirm]').forEach(form => form.onsubmit = () => confirm(form.dataset.confirm));
    const input = document.querySelector('#player-search'), hidden = document.querySelector('#player-user-id');
    const players = new Map([...document.querySelector('#player-datalist').options].map(o => [o.value, o.value.match(/#(\d+)\)$/)[1]]));
    document.querySelector('#filter-form').addEventListener('submit', () => hidden.value = players.get(input.value) || '');
})();
</script>
@endsection
