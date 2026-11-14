
@extends('ingame.layouts.main')
@section('content')
<div class="maincontent commerce" id="commerce-officers">
@include('ingame.commerce.style')
<h2>{{ __('t_ingame.premium.recruit_officers') }}</h2><p class="commerce-intro">{{ __('t_commerce.officers_intro') }}</p><div class="commerce-balance">{{ __('t_commerce.balance') }}: <strong>{{ number_format($darkMatter,0,',','.') }}</strong></div>
<div class="commerce-grid">
@foreach(['commander','admiral','engineer','geologist','technocrat'] as $index => $officer)
<article class="commerce-card" data-officer="{{ $officer }}"><span class="commerce-officer-image" role="img" aria-label="{{ __('t_commerce.'.$officer) }}" style="background-position:{{ -100*($index+1) }}px 0"></span><h3>{{ __('t_commerce.'.$officer) }}</h3><p>{{ __('t_commerce.'.$officer.'_effect') }}</p>
@if(($contracts[$officer] ?? 0)>now()->timestamp)<time datetime="{{ gmdate('c',$contracts[$officer]) }}">{{ __('t_commerce.active_until') }}: {{ gmdate('d.m.Y H:i',$contracts[$officer]) }} UTC</time>
@else<p>{{ __('t_commerce.inactive') }}</p>
@endif
@foreach([7,90] as $days)
@php($product = $products[$officer.'_'.$days])
@include('ingame.commerce.buy')
@endforeach
</article>
@endforeach
</div><section class="commerce-card"><h3>{{ __('t_commerce.staff') }}</h3><p>{{ __('t_commerce.staff_effect') }}</p></section>
</div>
@endsection
