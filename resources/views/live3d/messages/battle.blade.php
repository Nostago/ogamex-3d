@php
    $fmt = fn ($value) => $value === null ? __('t_battlereplay.unknown') : number_format((int)$value, 0, ',', '.');
    $first = $battle['frames'][0];
    $last = $battle['frames'][array_key_last($battle['frames'])];
    // Missing rounds cannot establish a final fleet composition.
    $final = $battle['roundsRecorded'] ? $last : ['attacker' => ['units' => null, 'losses' => null], 'defender' => ['units' => null, 'losses' => null]];
    $general = $report->general ?? [];
@endphp
<article class="live-battle-report">
    <header class="live-report-heading"><h2>{!! $subject !!}</h2><p>{{ __('t_ingame.messages.from') }}: {{ $from }} · {{ $date }}</p></header>
    <section class="live-report-section battle-overview">
        <h3>{{ __('t_battledetails.overview') }}</h3>
        <strong class="battle-outcome">{{ __('t_battlereplay.winner_'.$battle['result']['winner']) }}</strong>
        <p>{{ __('t_battledetails.recorded') }}</p>
        @if(isset($general['tactical_retreat']['defender_fled']))<p>{{ __('t_battledetails.'.($battle['result']['retreat'] ? 'retreat' : 'no_retreat')) }}</p>@endif
        @if($battle['result']['retreat'] && isset($general['tactical_retreat']['ratio']))<p>{{ __('t_battledetails.retreat_ratio') }}: 1:{{ $fmt($general['tactical_retreat']['ratio']) }}</p>@endif
        @if(($general['tactical_retreat']['deuterium_cost'] ?? 0) > 0)<p>{{ __('t_battledetails.retreat_cost') }}: {{ $fmt($general['tactical_retreat']['deuterium_cost']) }}</p>@endif
        @if($battle['result']['hamill'])<p>{{ __('t_battlereplay.hamill') }}</p>@endif
        <dl class="live-report-facts">
            @foreach(['attacker', 'defender'] as $side)<div><dt>{{ __('t_battlereplay.resource_losses') }} · {{ __('t_battlereplay.'.$side) }}</dt><dd>{{ $fmt($battle['result']['losses'][$side]) }}</dd></div>@endforeach
        </dl>
    </section>
    @foreach(['loot', 'debris'] as $resourceGroup)
    <section class="live-report-section"><h3>{{ __('t_battlereplay.'.$resourceGroup) }}</h3><dl class="live-report-resources">
        @foreach(['metal', 'crystal', 'deuterium'] as $resource)<div><dt>{{ __('t_battlereplay.'.$resource) }}</dt><dd>{{ $fmt($battle['result'][$resourceGroup][$resource]) }}</dd></div>@endforeach
    </dl></section>
    @endforeach
    @if(array_key_exists('collected_metal', $report->debris ?? []))
        @foreach(['collected', 'remaining_debris'] as $group)
        <section class="live-report-section"><h3>{{ __('t_battledetails.'.$group) }}</h3><dl class="live-report-resources">
            @foreach(['metal', 'crystal', 'deuterium'] as $resource)
            @php $collected = $report->debris['collected_'.$resource] ?? null; $total = $battle['result']['debris'][$resource]; @endphp
            <div><dt>{{ __('t_battlereplay.'.$resource) }}</dt><dd>{{ $fmt($group === 'collected' ? $collected : ($total !== null && $collected !== null ? max(0, (int)$total - (int)$collected) : null)) }}</dd></div>
            @endforeach
        </dl></section>
        @endforeach
    @endif
    <section class="live-report-section"><h3>{{ __('t_battledetails.composition') }}</h3><p>{{ __('t_battledetails.aggregate') }}</p>
        @foreach(['attacker', 'defender'] as $side)
            @php $participant = $report->getAttribute($side) ?? []; $class = strtolower($participant['character_class'] ?? ''); @endphp
            <section class="battle-side" data-battle-side="{{ $side }}"><h4>{{ __('t_battlereplay.'.$side) }} · {{ $battle['names'][$side] }}</h4>
                <dl class="battle-technologies"><div><dt>{{ __('t_battledetails.class') }}</dt><dd>{{ in_array($class, ['collector', 'discoverer', 'general'], true) ? __('t_battledetails.'.$class) : __('t_battledetails.unknown_class') }}</dd></div>
                @foreach(['weapon_technology' => 'weapons', 'shielding_technology' => 'shields', 'armor_technology' => 'armor'] as $key => $label)<div><dt>{{ __('t_battledetails.'.$label) }}</dt><dd>{{ isset($participant[$key]) ? $fmt((int)$participant[$key] * 10).' %' : __('t_battlereplay.unknown') }}</dd></div>@endforeach
                </dl>
                @include('live3d.messages.battle-units', ['previous' => $first, 'frame' => $final, 'perRound' => false])
            </section>
        @endforeach
    </section>
    @php $repairs = array_filter($battle['result']['repairedDefenses'] ?? [], fn ($count) => (int)$count > 0); @endphp
    @if(count($repairs))<section class="live-report-section"><h3>{{ __('t_battlereplay.repaired') }}</h3><dl class="live-report-objects">@foreach($repairs as $key => $count)<div><dt>{{ collect($battle['catalog'])->firstWhere('key', $key)['name'] ?? $key }}</dt><dd>{{ $fmt($count) }}</dd></div>@endforeach</dl></section>@endif
    @php $wreckage = array_filter(($viewerIsAttacker ? ($general['attacker_wreckage'] ?? []) : ($report->wreckage ?? [])), fn ($count) => (int)$count > 0); @endphp
    @if(count($wreckage))<section class="live-report-section"><h3>{{ __('t_battledetails.own_wreckage') }}</h3><dl class="live-report-objects">@foreach($wreckage as $key => $count)<div><dt>{{ collect($battle['catalog'])->firstWhere('key', $key)['name'] ?? $key }}</dt><dd>{{ $fmt($count) }}</dd></div>@endforeach</dl></section>@endif
    @if(isset($general['moon_chance']))<section class="live-report-section"><h3>{{ __('t_battledetails.moon_chance') }}: {{ $fmt($general['moon_chance']) }} %</h3>@if(isset($general['moon_created']))<p>{{ __('t_battledetails.'.($general['moon_created'] ? 'moon_created' : 'moon_not_created')) }}</p>@endif</section>@endif
    <section class="live-report-section"><h3>{{ __('t_battledetails.rounds') }}</h3>
        @if(!$battle['roundsRecorded'])<p>{{ __('t_battlereplay.missing_rounds') }}</p>
        @elseif(count($battle['frames']) === 1)<p>{{ __('t_battlereplay.no_rounds') }}</p>
        @else
            @foreach(array_slice($battle['frames'], 1) as $index => $frame)
            <details class="battle-round" data-battle-round="{{ $index + 1 }}"><summary>{{ __('t_battledetails.round_summary', ['round' => $index + 1]) }}</summary>
                @foreach(['attacker', 'defender'] as $side)
                <section class="battle-side"><h4>{{ __('t_battlereplay.'.$side) }} · {{ $battle['names'][$side] }}</h4>
                    <dl class="battle-technologies">@foreach(['shots', 'power', 'absorbed'] as $stat)<div><dt>{{ __('t_battlereplay.'.$stat) }}</dt><dd>{{ $fmt($frame[$side][$stat]) }}</dd></div>@endforeach</dl>
                    @include('live3d.messages.battle-units', ['previous' => $battle['frames'][$index], 'perRound' => true])
                </section>
                @endforeach
            </details>
            @endforeach
        @endif
    </section>
</article>
