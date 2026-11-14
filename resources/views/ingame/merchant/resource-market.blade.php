
@extends('ingame.layouts.main')
@section('content')
<div class="maincontent commerce" id="commerce-market">
@include('ingame.commerce.style')
<h2>{{ __('t_merchant.resource_market') }}</h2><h3>{{ __('t_merchant.exchange_your_resources') }}</h3><p>{{ __('t_commerce.market_intro') }}</p><div class="commerce-balance">{{ __('t_commerce.balance') }}: <strong>{{ number_format($darkMatter,0,',','.') }}</strong></div>
<p id="merchant-result" role="status" aria-live="polite"></p>
@if($activeMerchant)
<section class="commerce-card" id="commerce-active-merchant"><h3>{{ __('t_commerce.active_merchant') }}</h3><p>{{ __('t_commerce.sell') }}: {{ __('t_live3d.'.$activeMerchant['type']) }} · {{ __('t_commerce.available') }}: {{ number_format($planet->{$activeMerchant['type']}()->get(),0,',','.') }}</p>
<form data-merchant-form data-redirect="{{ route('merchant.resource-market',['ui'=>request('ui'),'cp'=>request('cp')]) }}" action="{{ route('merchant.trade', ['cp'=>$planet->getPlanetId(),'ui'=>request('ui')]) }}" method="post">
@csrf
<input type="hidden" name="give_resource" value="{{ $activeMerchant['type'] }}">
<label>{{ __('t_commerce.budget') }} · {{ __('t_live3d.'.$activeMerchant['type']) }}<input type="number" name="give_amount" min="1" step="1" max="{{ (int)floor($planet->{$activeMerchant['type']}()->get()) }}" required></label>
@foreach($activeMerchant['trade_rates']['receive'] as $resource=>$rate)
@php($free = max(0,(int)floor($planet->{$resource.'Storage'}()->get()-$planet->{$resource}()->get())))
<label>{{ __('t_commerce.receive') }} · {{ __('t_live3d.'.$resource) }} ({{ $rate['display'] }})<input type="number" name="receive_resources[{{ $resource }}]" min="0" max="{{ $free }}" value="0" step="1"></label><small>{{ __('t_commerce.free_storage') }}: {{ number_format($free,0,',','.') }}</small>
@endforeach
<p>{{ __('t_commerce.merchant_limits') }}</p><button type="submit">{{ __('t_commerce.trade') }}</button></form></section>
@endif
<div class="commerce-grid">
@foreach(['metal','crystal','deuterium'] as $resource)
<article class="commerce-card"><h3>{{ __('t_commerce.sell') }}: {{ __('t_live3d.'.$resource) }}</h3><p>{{ __('t_commerce.merchant_cost') }}: {{ number_format($merchantCost,0,',','.') }} {{ __('t_commerce.matter') }}</p>
<form data-merchant-form data-redirect="{{ route('merchant.resource-market',['ui'=>request('ui'),'cp'=>request('cp')]) }}" data-confirm="{{ __('t_commerce.merchant_call_confirm',['cost'=>number_format($merchantCost,0,',','.')]) }}" action="{{ route('merchant.call') }}" method="post">
@csrf<input type="hidden" name="type" value="{{ $resource }}"><button type="submit"
@disabled($darkMatter < $merchantCost)>{{ __('t_merchant.call_merchant') }}</button></form></article>
@endforeach
</div></div>

@endsection
