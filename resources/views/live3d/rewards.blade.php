@extends('ingame.layouts.main')
@section('content')
<section id="live-rewards"><header class="live-rewards-banner"><h2>{{ __('t_readability.rewards_title') }}</h2></header><p class="live-rewards-notice" role="status">{{ __('t_readability.rewards_hint') }}</p>
<div class="live-reward-grid">
@foreach([1 => 'rewards/rewards.jpg', 2 => 'facilities/dry.jpg', 3 => 'resources/desert_1.jpg', 4 => 'shipyard/shipyard.jpg', 5 => 'research/research.jpg', 6 => 'shipyard/shipyard.jpg', 7 => 'rewards/rewards.jpg'] as $number => $image)
<article class="live-reward-card"><img src="{{ asset('img/headers/'.$image) }}" alt="" loading="lazy"><div><h3>{{ __('t_readability.reward_'.$number.'_title') }}</h3><p>{{ __('t_readability.reward_'.$number.'_body', ['player' => auth()->user()->username]) }}</p><span class="live-reward-status">{{ __('t_readability.reward_unavailable') }}</span></div></article>
@endforeach
</div></section>
@endsection
