<nav class="social-actions work-toolbar" aria-label="{{ __('t_workui.merchant') }}">
    @foreach(['merchant.index' => 'merchant', 'merchant.resource-market' => 'market', 'merchant.scrap' => 'scrap'] as $route => $label)
        <a class="work-nav" @if(request()->routeIs($route)) aria-current="page" @endif href="{{ route($route, ['ui' => 'live3d', 'cp' => request('cp')]) }}">{{ __('t_workui.'.$label) }}</a>
    @endforeach
</nav>
