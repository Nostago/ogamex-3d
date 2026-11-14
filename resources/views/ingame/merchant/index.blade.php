
@extends('ingame.layouts.main')
@section('content')
<div class="maincontent commerce" id="commerce-merchant">
@include('ingame.commerce.style')
<h2>{{ __('t_live3d.merchant') }}</h2><p>{{ __('t_commerce.merchant_intro') }}</p><div class="commerce-balance">{{ __('t_commerce.balance') }}: <strong>{{ number_format($darkMatter,0,',','.') }}</strong></div>
<div class="commerce-grid">
<article class="commerce-card"><h3>{{ __('t_merchant.resource_market') }}</h3><p>{{ __('t_commerce.market_intro') }}</p><p>{{ __('t_commerce.merchant_cost') }}: {{ number_format($merchantCost,0,',','.') }} {{ __('t_commerce.matter') }}</p><a href="{{ route('merchant.resource-market') }}">{{ __('t_merchant.resource_market') }} →</a></article>
<article class="commerce-card"><img src="/img/merchant/scrap_merchant.jpg" alt=""><h3>{{ __('t_merchant.scrap_merchant') }}</h3><p>{{ __('t_merchant.scrap_merchant_desc') }}</p><a href="{{ route('merchant.scrap') }}">{{ __('t_merchant.scrap_merchant') }} →</a></article>
</div></div>
@endsection
