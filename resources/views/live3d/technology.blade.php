@extends('ingame.layouts.main')
@section('content')
@php($object = $liveTechnologyData['object'])
@php($tab = (int) request('tab', 3))
<section id="live-technology" class="live-technology">
<header><div><h2>{{ $object->title }}</h2><p>{{ in_array($object->type->value, ['ship', 'defense']) ? __('t_operations.op_amount') : __('t_live3d.level') }}: <strong>{{ $liveLevel }}</strong></p></div><form method="get" action="{{ route('live3d.technology') }}"><input type="hidden" name="ui" value="live3d"><input type="hidden" name="cp" value="{{ request('cp') }}"><input type="hidden" name="tab" value="{{ $tab }}"><label for="live-tech-object">{{ __('t_readability.tech_object') }}</label><select name="object_id" id="live-tech-object" class="dropdownInitialized live-native-select" onchange="this.form.submit()">@foreach($liveObjects as $item)<option value="{{ $item->id }}" @selected($object->id === $item->id)>{{ $item->title }}</option>@endforeach</select><noscript><button type="submit">{{ __('t_operations.op_details') }}</button></noscript></form></header>
<nav class="live-tech-tabs" aria-label="{{ __('t_live3d.technology') }}">@foreach([3 => 'technology', 1 => 'techtree', 2 => 'techinfo', 4 => 'applications'] as $number => $label)<a @if($tab === $number) aria-current="page" @endif href="{{ route('live3d.technology', ['object_id' => $object->id, 'tab' => $number, 'ui' => 'live3d', 'cp' => request('cp')]) }}">{{ __('t_ingame.techtree.tab_'.$label) }}</a>@endforeach</nav>
@if(in_array($tab, [1,3]))
<section class="live-tech-description"><p>{!! nl2br($object->description_long) !!}</p></section>
<section class="live-requirement-list"><h3>{{ __('t_operations.op_requirements') }}</h3>
@php($requirements = array_filter($liveRequirements['techtree_unique'], fn($item) => $item->depth > 0))
@if(count($requirements))
<table class="live-tech-requirements"><thead><tr><th>{{ __('t_readability.tech_object') }}</th><th>{{ __('t_operations.op_current') }}</th><th>{{ __('t_operations.op_required') }}</th><th>{{ __('t_readability.status') }}</th></tr></thead><tbody>
@foreach($requirements as $requirement)
@php($met = $requirement->levelCurrent >= $requirement->levelRequired)
<tr class="{{ $met ? 'requirement-met' : 'requirement-missing' }}"><td><a href="{{ route('live3d.technology', ['object_id' => $requirement->gameObject->id, 'tab' => 1, 'cp' => request('cp'), 'ui' => 'live3d']) }}">{{ $requirement->gameObject->title }}</a></td><td>{{ $requirement->levelCurrent }}</td><td>{{ $requirement->levelRequired }}</td><td>{{ $met ? '✓ '.__('t_operations.op_met') : '✕ '.__('t_operations.op_missing') }}</td></tr>
@endforeach
</tbody></table>
@else<p class="live-requirement-status requirement-met">✓ {{ __('t_ingame.techtree.no_requirements') }}</p>@endif
</section>
@elseif($tab === 2)
<section class="live-tech-data"><p>{!! nl2br($object->description_long) !!}</p>@foreach(['production_table','storage_table','rapidfire_table','properties_table','plasma_table','astrophysics_table'] as $key){!! $liveTechnologyData[$key] !!}@endforeach</section>
@else
<p>{{ $object->title }} {{ __('t_ingame.techtree.is_requirement_for') }}:</p><div class="live-tech-applications">@forelse($liveTechnologyData['required_by'] as $required)<a class="{{ $required->requirementsMet ? 'requirement-met' : 'requirement-missing' }}" href="{{ route('live3d.technology', ['object_id' => $required->gameObject->id, 'tab' => 1, 'cp' => request('cp'), 'ui' => 'live3d']) }}"><strong>{{ $required->gameObject->title }}</strong><span>{{ $required->requirementsMet ? '✓ '.__('t_operations.op_met') : '✕ '.__('t_operations.op_missing') }}</span></a>@empty<p>{{ __('t_readability.no_applications') }}</p>@endforelse</div>
@endif
</section>
@endsection
