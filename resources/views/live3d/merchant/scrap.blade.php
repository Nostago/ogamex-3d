@extends('live3d.social.layout')
@section('root_id', 'live-scrap')
@section('title', __('t_workui.scrap'))
@section('content')
@include('live3d.merchant.nav')
<header class="social-heading">
<div>
<h2>{{ __('t_workui.scrap') }}</h2>
<p>{{ __('t_merchant.scrap_merchant_desc') }}</p>
</div>
<span class="social-count">{{ __('t_merchant.dark_matter') }}: <strong data-scrap-dm>{{ number_format($darkMatter,0,',','.') }}</strong>
</span>
</header>
<p data-work-status role="status">
</p>
<div class="work-scrap-layout" data-scrap-percentage="{{ $offerPercentage }}">
    <aside class="social-panel work-scrap-summary">
        <img class="work-portrait" src="/img/merchant/scrap_merchant.jpg" alt="">
        <h3>{{ __('t_merchant.offer') }}: <strong data-scrap-offer>{{ $offerPercentage }} %</strong>
</h3>
        <p>{{ __('t_workui.scrap_preview') }}</p>
        <dl class="work-resources">@foreach(['metal','crystal','deuterium'] as $resource)<div>
<dt>{{ __('t_merchant.'.$resource) }}</dt>
<dd data-scrap-return="{{ $resource }}">0</dd>
</div>@endforeach</dl>
        <button type="button" data-scrap-bargain data-cost="{{ $bargainCost }}" data-balance="{{ $darkMatter }}" @disabled($darkMatter < $bargainCost || $offerPercentage >= 75)>{{ __('t_merchant.bargain') }}</button>
        <p>{{ __('t_merchant.costs') }} <strong data-scrap-cost>{{ number_format($bargainCost,0,',','.') }}</strong> {{ __('t_merchant.dark_matter') }}</p>
        <p class="social-muted">{{ __('t_workui.scrap_review_hint') }}</p>
    </aside>
    <form class="social-panel" data-scrap-form>
        <header class="social-heading">
<h3>{{ __('t_merchant.objects_to_be_scrapped') }}</h3>
<div class="social-actions">
<button type="submit" data-scrap-submit disabled>{{ __('t_workui.review_scrap') }}</button>
<button type="button" data-scrap-all>{{ __('t_workui.select_available') }}</button>
<button type="button" data-scrap-clear>{{ __('t_workui.clear') }}</button>
</div>
</header>
        <label class="work-available-filter">
<input type="checkbox" data-scrap-only-available checked> {{ __('t_workui.only_available') }}</label>
        @foreach(['ships' => $ships, 'defense' => $defense] as $kind => $items)
            <details class="work-unit-group" open>
<summary>{{ __('t_workui.'.$kind) }}</summary>
            <div class="work-unit-grid">
                @foreach($items as $id => $item)
                    @php($object = \OGame\Services\ObjectService::getObjectById($id))
                    <article class="work-unit" data-scrap-unit="{{ $id }}" data-name="{{ $item['name'] }}" data-costs="{{ json_encode($item['cost']) }}" @if($item['amount'] <= 0) hidden @endif>
                        <img loading="lazy" width="88" height="88" src="{{ \OGame\Services\Live3dArtworkService::image($object, '/img/objects/units/'.$object->machine_name.'_small.jpg') }}" alt="">
                        <div>
<strong>{{ $item['name'] }}</strong>
<p>{{ __('t_workui.available') }}: <span>{{ number_format($item['amount'],0,',','.') }}</span>
</p>
</div>
                        <label for="scrap-{{ $id }}">{{ __('t_workui.amount') }}</label>
                        <div class="social-actions">
<input id="scrap-{{ $id }}" name="items[{{ $id }}]" type="number" min="0" max="{{ $item['amount'] }}" step="1" value="0" @disabled($item['amount'] <= 0)>
<button type="button" data-scrap-max @disabled($item['amount'] <= 0)>{{ __('t_workui.maximum') }}</button>
</div>
                    </article>
                @endforeach
            </div>
</details>
        @endforeach
        <button type="submit" data-scrap-submit disabled>{{ __('t_workui.review_scrap') }}</button>
    </form>
</div>
@endsection
