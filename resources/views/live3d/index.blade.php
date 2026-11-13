@php
    $t = __('t_live3d', [], 'de');
    $bootstrap = [
        'initial' => $initial, 't' => $t, 'models' => __('t_prototype3d', [], 'de'),
        'stateUrl' => route('live3d.state'), 'commandUrl' => route('live3d.command'),
        'galaxyUrl' => route('live3d.galaxy'), 'fleetEventsUrl' => route('fleet.eventbox.fetch'),
        'links' => ['fleets' => route('fleet.index'), 'galaxy' => route('galaxy.index'), 'messages' => route('messages.index', ['prototype3d' => 1]), 'alliance' => route('alliance.index')],
    ];
    $liveVite = clone app(\Illuminate\Foundation\Vite::class);
    $liveVite->useScriptTagAttributes(['type' => 'module']);
@endphp
<!doctype html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>OGameX · Orbital Command</title>
    {{ $liveVite('resources/js/live3d/index.js') }}
</head>
<body class="prototype-3d live-interface orbital-command">
<div id="prototype" data-mode="orbit" data-page="planet">
    <header class="command-header">
        <a class="brand" href="{{ route('live3d.index') }}"><span class="brand-orbit" aria-hidden="true">◈</span><span>OGameX <b>3D</b><small>ORBITAL COMMAND</small></span></a>
        <div class="command-empire"><span id="live-player"></span><label for="live-planet" class="sr-only">{{ $t['planet'] }}</label><select id="live-planet"></select></div>
        <div id="live-resources" class="resource-balances"></div>
        <div class="header-actions">
            <button data-live-page="messages" data-icon="messages" aria-label="{{ $t['messages'] }}"></button>
            <a href="{{ route('options.index') }}" data-icon="settings" aria-label="{{ $t['settings'] }}"></a>
            <button id="live-refresh" data-icon="refresh" aria-label="{{ $t['refresh'] }}"></button>
            <a href="{{ route('overview.index') }}" data-icon="external" aria-label="{{ $t['original'] }}"></a>
        </div>
    </header>
    <div class="activity-bar"><p id="live-status" role="status">{{ $t['connected'] }}</p><a id="live-login" href="{{ route('login') }}" hidden>{{ $t['login'] }}</a></div>
    <div class="app-shell">
        <nav class="main-nav" aria-label="{{ $t['navigation'] }}">
            <a href="#planet" class="nav-banner" aria-hidden="true" tabindex="-1"><span class="nav-banner-world"></span></a>
            @foreach(['planet', 'buildings', 'research', 'ships', 'defense', 'fleets', 'galaxy', 'alliance', 'messages'] as $page)
                <a href="#{{ $page }}" data-live-page="{{ $page }}"><span data-icon="{{ $page }}" aria-hidden="true"></span><span>{{ $t[$page] }}</span></a>
            @endforeach
            <a class="nav-galaxy-card" href="#galaxy" data-live-page="galaxy"><span class="galaxy-radar" aria-hidden="true"></span><span>{{ $t['galaxy'] }} <b>↗</b></span></a>
            <p class="nav-note">{{ $t['authority'] }}</p>
        </nav>
        <main class="workspace">
            <header class="workspace-heading"><span class="eyebrow" id="live-context"></span><h1 id="live-heading" tabindex="-1"></h1></header>
            <section id="live-page-planet" class="orbital-stage">
                <section class="scene-panel">
                    <div id="scene" tabindex="0" aria-label="{{ $t['scene_controls'] }}"></div>
                    <div id="scene-labels" aria-hidden="true"></div>
                    <div class="orbital-reticle" aria-hidden="true"></div>
                </section>
                <header class="stage-heading"><span data-icon="planet" aria-hidden="true"></span><div><h1 id="live-world-name"></h1><p id="live-world-coordinates"></p></div></header>
                <aside class="hud-left"><section id="live-overview" class="card hud-panel"></section><section id="live-operations" class="card hud-panel"></section><a href="{{ route('resources.settings') }}" id="live-production-link">{{ $t['production_settings'] }} ↗</a></aside>
                <aside class="hud-right"><section id="live-production" class="card hud-panel"></section><section id="live-dock" class="command-dock hud-panel"></section><section id="live-fleet-events" class="card hud-panel"></section></aside>
                <div id="live-scene-recovery" class="scene-recovery" role="status"><p id="live-scene-hint">{{ $t['scene_loading'] }}</p><button id="live-scene-retry">{{ $t['scene_retry'] }}</button><details><summary>{{ $t['scene_diagnostics'] }}</summary><output id="live-scene-diagnostics"></output></details></div>
                <div class="orbital-bottom">
                    <div class="view-switch"><button id="live-colony" aria-pressed="false"><span data-icon="buildings" aria-hidden="true"></span>{{ $t['colony'] }}</button><button id="live-orbit" aria-pressed="true"><span data-icon="planet" aria-hidden="true"></span>{{ $t['orbit'] }}</button></div>
                    <div class="scene-tools"><button id="live-zoom-in" aria-label="{{ $t['zoom_in'] }}">+</button><button id="live-zoom-out" aria-label="{{ $t['zoom_out'] }}">−</button><button id="live-rotate" aria-pressed="false" data-icon="rotate" aria-label="{{ $t['rotate'] }}"></button><button id="live-camera" data-icon="refresh" aria-label="{{ $t['camera'] }}"></button></div>
                    <p class="geometry-note">{{ $t['representative'] }}</p>
                </div>
            </section>
            <section id="live-page-catalog" hidden><div id="live-groups" class="live-groups"></div><div id="live-queues"></div><div class="split-layout"><section id="live-catalog" class="card"></section><aside id="live-detail" class="card"></aside></div></section>
            <section id="live-page-galaxy" hidden>
                <div class="card galaxy-toolbar"><form id="live-galaxy-form"><label>{{ $t['galaxy'] }}<input id="live-galaxy-number" type="number" min="1" required></label><label>{{ $t['system'] }}<input id="live-system-number" type="number" min="1" max="499" required></label><button type="submit">{{ $t['show_system'] }}</button></form><div class="galaxy-controls"><button id="live-system-prev" aria-label="{{ $t['previous_system'] }}">←</button><button id="live-system-home">{{ $t['home_system'] }}</button><button id="live-system-next" aria-label="{{ $t['next_system'] }}">→</button><a id="live-galaxy-original" target="_blank" rel="noopener">{{ $t['open_original'] }} ↗</a></div></div>
                <p id="live-galaxy-status" role="status"></p><div id="live-galaxy-rows" class="card galaxy-grid"></div>
            </section>
            <section id="live-page-original" hidden>
                <section id="live-fleet-stock" class="card" hidden></section>
                <div class="card original-note"><p>{{ $t['embedded'] }}</p><a id="live-original-link" target="_blank" rel="noopener">{{ $t['open_original'] }} ↗</a></div><iframe id="live-original" title="{{ $t['original_area'] }}"></iframe>
            </section>
        </main>
    </div>
</div>
<script id="live-bootstrap" type="application/json">@json($bootstrap)</script>
</body>
</html>
