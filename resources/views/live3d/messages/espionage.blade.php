<article class="live-spy-report">
<header class="live-report-heading"><div><h2>{!! $subject !!}</h2><p>{{ __('t_ingame.messages.from') }}: {{ $from }} · {{ $date }}</p></div></header>
<nav class="live-report-actions" aria-label="{{ __('t_messageui.actions') }}">
<a data-message-fleet href="{{ route('fleet.index', ['galaxy'=>$galaxy,'system'=>$system,'position'=>$position,'type'=>$planet_type,'mission'=>1]) }}">{{ __('t_ingame.messages.battle_attack') }}</a>
<a data-message-fleet href="{{ route('fleet.index', ['galaxy'=>$galaxy,'system'=>$system,'position'=>$position,'type'=>$planet_type,'mission'=>6]) }}">{{ __('t_ingame.messages.battle_espionage') }}</a>
</nav>
<dl class="live-report-facts"><div><dt>{{ __('t_ingame.messages.spy_player') }}</dt><dd>{{ strip_tags($playername) }}</dd></div><div><dt>{{ __('t_ingame.messages.spy_counter_esp') }}</dt><dd>{{ $counter_espionage_chance }} %</dd></div></dl>
<section class="live-report-section"><h3>{{ __('t_ingame.messages.spy_resources') }}</h3><dl class="live-report-resources">
@foreach(['metal','crystal','deuterium','energy'] as $resource)<div><dt>{{ __('t_live3d.'.$resource) }}</dt><dd>{{ $resources->{$resource}->getFormattedFull() }}</dd></div>@endforeach
</dl></section>
@if($debris->any())<section class="live-report-section"><h3>{{ __('t_ingame.messages.spy_debris_field') }}</h3><dl class="live-report-resources">@foreach(['metal','crystal','deuterium'] as $resource)<div><dt>{{ __('t_live3d.'.$resource) }}</dt><dd>{{ $debris->{$resource}->getFormattedFull() }}</dd></div>@endforeach</dl></section>@endif
@foreach(['ships'=>$ships,'defense'=>$defense,'buildings'=>$buildings,'research'=>$research] as $section=>$entries)
<section class="live-report-section" data-report-section="{{ $section }}"><h3>{{ __('t_messageui.section_'.$section) }}</h3>
@if(!($known_sections[$section] ?? false))<p class="live-report-unknown">{{ __('t_ingame.messages.spy_no_info') }}</p>
@elseif(empty($entries))<p>{{ __('t_messageui.no_entries') }}</p>
@else<dl class="live-report-objects">@foreach($entries as $unit)
@php
 $folder = in_array($section,['ships','defense'],true) ? 'units' : ($section === 'research' ? 'research' : 'buildings');
 $image = \OGame\Services\Live3dArtworkService::image($unit->object, asset('img/objects/'.$folder.'/'.$unit->object->assets->imgSmall));
@endphp
<div><dt><img src="{{ $image }}" alt="" loading="lazy"><span>{{ $unit->object->title }}</span></dt><dd>{{ number_format($unit->amount,0,',','.') }}</dd></div>
@endforeach</dl>@endif</section>
@endforeach
</article>
