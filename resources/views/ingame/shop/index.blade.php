
@extends('ingame.layouts.main')
@section('content')
<div class="maincontent commerce" id="commerce-shop">
@include('ingame.commerce.style')
<h2>{{ __('t_commerce.catalog') }}</h2><p class="commerce-intro">{{ __('t_commerce.shop_intro') }}</p>
<div class="commerce-balance">{{ __('t_commerce.balance') }}: <strong>{{ number_format($darkMatter, 0, ',', '.') }}</strong></div>
<nav class="commerce-tabs"><a href="{{ route('shop.index', ['ui'=>request('ui'), 'cp'=>request('cp')]) }}">{{ __('t_commerce.catalog') }}</a><a href="{{ route('shop.index', ['inventory'=>1, 'ui'=>request('ui'), 'cp'=>request('cp')]) }}">{{ __('t_commerce.inventory') }}</a></nav>
@if(request()->boolean('inventory'))
<h2>{{ __('t_commerce.inventory') }}</h2><p>{{ __('t_commerce.item_target') }}</p>
@if(!array_sum($inventory))<p>{{ __('t_commerce.no_items') }}</p>
@endif
<div class="commerce-grid" id="commerce-inventory">
@foreach($products as $product)
@if(($inventory[$product['key']] ?? 0) > 0)
<article class="commerce-card" data-product="{{ $product['key'] }}"><img src="{{ $product['image'] }}" alt=""><h3>{{ $product['name'] }}</h3><p>{{ __('t_commerce.stock') }}: <strong>{{ $inventory[$product['key']] }}</strong></p><p>{{ __('t_commerce.duration') }}: {{ $product['duration'] }}</p><p>{{ __('t_commerce.queue_'.$product['queue']) }}</p>
<form action="{{ route('commerce.activate') }}" method="post">
@csrf<input type="hidden" name="inventory" value="1"><input type="hidden" name="product" value="{{ $product['key'] }}"><input type="hidden" name="planet" value="{{ $planetId }}"><input type="hidden" name="request_id" value="{{ (string) Illuminate\Support\Str::uuid() }}"><button type="submit">{{ __('t_commerce.activate') }}</button></form></article>
@endif
@endforeach
</div>
@else
@foreach(['building','research','unit'] as $queue)<h2>{{ __('t_commerce.queue_'.$queue) }}</h2><div class="commerce-grid">
@foreach($products as $product)
@if($product['queue'] === $queue)
<article class="commerce-card" data-product="{{ $product['key'] }}"><img src="{{ $product['image'] }}" alt=""><h3>{{ $product['name'] }}</h3><p>{{ __('t_commerce.duration') }}: {{ $product['duration'] }}</p><p>{{ __('t_commerce.stock') }}: {{ $inventory[$product['key']] ?? 0 }}</p>
@include('ingame.commerce.buy')
</article>
@endif
@endforeach</div>
@endforeach
@endif
</div>
<script>if(location.hash.includes('inventory')&&!new URL(location.href).searchParams.has('inventory')){const u=new URL(location.href);u.searchParams.set('inventory','1');location.replace(u.href)}</script>
@endsection
