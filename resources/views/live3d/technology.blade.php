@extends('ingame.layouts.main')
@section('content')
<h2>{{ $liveTechnologyData['object']->title }}</h2>
<nav class="live-tech-tabs">@foreach([1 => 'techtree', 2 => 'techinfo', 3 => 'technology', 4 => 'applications'] as $tab => $label)<a class="btn_blue" href="{{ route('live3d.technology', ['object_id' => request('object_id'), 'tab' => $tab, 'ui' => 'live3d', 'cp' => request('cp')]) }}">{{ __('t_ingame.techtree.tab_'.$label) }}</a> @endforeach</nav>
@if(isset($liveTechnologyData['techtree_unique']))
<section class="live-requirement-list"><h3>{{ __('t_operations.op_requirements') }}</h3>
@foreach($liveTechnologyData['techtree_unique'] as $requirement)
@if($requirement->depth > 0)
<p class="live-requirement-status {{ $requirement->levelCurrent >= $requirement->levelRequired ? 'requirement-met' : 'requirement-missing' }}">{{ $requirement->levelCurrent >= $requirement->levelRequired ? '✓' : '✕' }} {{ $requirement->gameObject->title }} · {{ $requirement->levelCurrent >= $requirement->levelRequired ? __('t_operations.op_met') : __('t_operations.op_missing') }} · {{ __('t_operations.op_current') }}: {{ $requirement->levelCurrent }} / {{ __('t_operations.op_required') }}: {{ $requirement->levelRequired }}</p>
@endif
@endforeach
</section>
@endif
@include($liveTechnologyName, $liveTechnologyData)
@endsection
