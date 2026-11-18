@php
    $before = $previous[$side]['units'];
    $after = $frame[$side]['units'];
    $losses = $frame[$side]['losses'];
    $types = array_filter($battle['catalog'], fn ($unit) => (int)($before[$unit['key']] ?? 0) > 0 || (int)($after[$unit['key']] ?? 0) > 0 || ($perRound && (int)($losses[$unit['key']] ?? 0) > 0));
@endphp
@if($before === null || $after === null)<p class="live-report-unknown">{{ __('t_battlereplay.unknown') }}</p>@endif
@if(count($types))
<table class="live-battle-units">
    <thead><tr><th scope="col">{{ __('t_battlereplay.units') }}</th><th scope="col">{{ __('t_battledetails.'.($perRound ? 'round_before' : 'before')) }}</th><th scope="col">{{ __('t_battledetails.'.($perRound ? 'round_after' : 'after')) }}</th><th scope="col">{{ $perRound ? __('t_battlereplay.lost') : __('t_battledetails.lost') }}</th></tr></thead>
    <tbody>
    @foreach($types as $unit)
        @php
            $key = $unit['key'];
            $start = $before === null ? null : ($before[$key] ?? '0');
            $end = $after === null ? null : ($after[$key] ?? '0');
            $lost = $perRound ? ($losses === null ? null : ($losses[$key] ?? '0')) : ($start !== null && $end !== null && (int)$start >= (int)$end ? (int)$start - (int)$end : null);
        @endphp
        <tr data-battle-unit="{{ $key }}"><th scope="row"><img src="{{ $unit['image'] }}" alt="" loading="lazy"><span>{{ $unit['name'] }}</span></th><td data-count="before">{{ $fmt($start) }}</td><td data-count="after">{{ $fmt($end) }}</td><td data-count="lost" @class(['battle-loss' => (int)$lost > 0])>{{ $fmt($lost) }}</td></tr>
    @endforeach
    </tbody>
</table>
@elseif($before !== null && $after !== null)<p>{{ __('t_battlereplay.empty') }}</p>@endif
