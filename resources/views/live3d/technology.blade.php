@extends('ingame.layouts.main')
@section('content')
<h2>{{ $liveTechnologyData['object']->title }}</h2>
<nav class="live-tech-tabs">@foreach([1 => 'techtree', 2 => 'techinfo', 3 => 'technology', 4 => 'applications'] as $tab => $label)<a class="btn_blue" href="{{ route('live3d.technology', ['object_id' => request('object_id'), 'tab' => $tab, 'ui' => 'live3d', 'cp' => request('cp')]) }}">{{ __('t_ingame.techtree.tab_'.$label) }}</a> @endforeach</nav>
@include($liveTechnologyName, $liveTechnologyData)
@endsection
