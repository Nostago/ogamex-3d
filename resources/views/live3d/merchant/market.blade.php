@extends('live3d.social.layout')
@section('root_id', 'live-market')
@section('title', __('t_workui.market'))
@section('content')
@include('live3d.merchant.nav')
<header class="social-heading">
<div>
<h2>{{ __('t_workui.market') }}</h2>
<p>{{ __('t_commerce.market_intro') }}</p>
</div>
<span class="social-count">{{ __('t_merchant.dark_matter') }}: {{ number_format($darkMatter,0,',','.') }}</span>
</header>
<p data-work-status role="status">
</p>
@if($activeMerchant)
<section class="social-panel">
    <h3>{{ __('t_commerce.active_merchant') }} · {{ __('t_commerce.sell') }} {{ __('t_merchant.'.$activeMerchant['type']) }}</h3>
    <form method="post" class="work-market-form" data-work-post action="{{ route('merchant.trade') }}" data-confirm="{{ __('t_workui.trade_confirm') }}">
        @csrf<input type="hidden" name="give_resource" value="{{ $activeMerchant['type'] }}">
        <label>{{ __('t_commerce.budget') }} · {{ __('t_merchant.'.$activeMerchant['type']) }}<input type="number" name="give_amount" min="1" step="1" max="{{ (int)floor($planet->{$activeMerchant['type']}()->get()) }}" required>
</label>
        <p>{{ __('t_workui.available') }}: {{ number_format($planet->{$activeMerchant['type']}()->get(),0,',','.') }}</p>
        <div class="work-market-grid">
            @foreach($activeMerchant['trade_rates']['receive'] as $resource => $rate)
                @php($free = max(0,(int)floor($planet->{$resource.'Storage'}()->get()-$planet->{$resource}()->get())))
                <article class="social-panel">
<h3>{{ __('t_commerce.receive') }} {{ __('t_merchant.'.$resource) }}</h3>
<p>1.000 {{ __('t_merchant.'.$activeMerchant['type']) }} = {{ number_format((int)round(1000 * $rate['rate'] / \OGame\Services\MerchantService::getBaseRate($activeMerchant['type'])),0,',','.') }} {{ __('t_merchant.'.$resource) }}</p>
<label for="receive-{{ $resource }}">{{ __('t_workui.amount') }}</label>
<div class="social-actions">
<input id="receive-{{ $resource }}" type="number" name="receive_resources[{{ $resource }}]" min="0" step="1" max="{{ $free }}" value="0" data-market-rate="{{ $rate['rate'] / \OGame\Services\MerchantService::getBaseRate($activeMerchant['type']) }}">
<button type="button" data-market-max>{{ __('t_workui.maximum') }}</button>
</div>
<p>{{ __('t_commerce.free_storage') }}: {{ number_format($free,0,',','.') }}</p>
</article>
            @endforeach
        </div>
        <p>{{ __('t_commerce.merchant_limits') }}</p>
<button type="submit">{{ __('t_commerce.trade') }}</button>
    </form>
    <form method="post" class="work-inline-form" data-work-post data-confirm="{{ __('t_workui.dismiss_confirm') }}" action="{{ route('merchant.dismiss') }}">@csrf<button type="submit">{{ __('t_merchant.dismiss_merchant') }}</button>
</form>
</section>
@endif
<div class="work-market-grid">
    @foreach(['metal','crystal','deuterium'] as $resource)
        <article class="social-panel">
<h3>{{ __('t_commerce.sell') }} {{ __('t_merchant.'.$resource) }}</h3>
<p>{{ __('t_commerce.merchant_cost') }}: {{ number_format($merchantCost,0,',','.') }} {{ __('t_merchant.dark_matter') }}</p>
<form method="post" data-work-post data-confirm="{{ __('t_commerce.merchant_call_confirm', ['cost'=>number_format($merchantCost,0,',','.')]) }}" action="{{ route('merchant.call') }}">@csrf<input type="hidden" name="type" value="{{ $resource }}">
<button type="submit" @disabled($darkMatter < $merchantCost)>{{ __('t_merchant.call_merchant') }}</button>
</form>
</article>
    @endforeach
</div>
@endsection
