@extends('live3d.social.layout')
@section('root_id', 'live-merchant')
@section('title', __('t_workui.merchant'))
@section('content')
@include('live3d.merchant.nav')
<header class="social-heading">
<div>
<h2>{{ __('t_workui.merchant') }}</h2>
<p>{{ __('t_commerce.merchant_intro') }}</p>
</div>
<span class="social-count">{{ __('t_merchant.dark_matter') }}: {{ number_format($darkMatter, 0, ',', '.') }}</span>
</header>
<div class="work-two-columns">
    <article class="social-panel">
<h3>{{ __('t_workui.market') }}</h3>
<p>{{ __('t_commerce.market_intro') }}</p>
<p>{{ __('t_commerce.merchant_cost') }}: {{ number_format($merchantCost, 0, ',', '.') }} {{ __('t_merchant.dark_matter') }}</p>
<a class="work-nav" href="{{ route('merchant.resource-market', ['ui'=>'live3d','cp'=>request('cp')]) }}">{{ __('t_workui.open_market') }} →</a>
</article>
    <article class="social-panel">
<img class="work-portrait" src="/img/merchant/scrap_merchant.jpg" alt="">
<h3>{{ __('t_workui.scrap') }}</h3>
<p>{{ __('t_merchant.scrap_merchant_desc') }}</p>
<a class="work-nav" href="{{ route('merchant.scrap', ['ui'=>'live3d','cp'=>request('cp')]) }}">{{ __('t_workui.open_scrap') }} →</a>
</article>
</div>
@endsection
