
@extends('ingame.layouts.main')
@section('content')
<div class="maincontent commerce" id="commerce-prices">
@include('ingame.commerce.style')
<h2>{{ __('t_commerce.prices') }}</h2><p>{{ __('t_commerce.prices_intro') }}</p>
<form action="{{ route('commerce.prices.save') }}" method="post">
@csrf
<table><thead><tr><th>{{ __('t_commerce.catalog') }}</th><th>{{ __('t_commerce.price') }}</th></tr></thead><tbody>
@foreach($products as $key=>$product)<tr><td><label for="price-{{ $key }}">{{ $product['name'] }}</label></td><td><input id="price-{{ $key }}" name="prices[{{ $key }}]" type="number" min="0" max="1000000000" step="1" value="{{ old('prices.'.$key,$product['price']) }}" required></td></tr>
@endforeach
</tbody></table><button type="submit">{{ __('t_commerce.save') }}</button></form>
</div>
@endsection
