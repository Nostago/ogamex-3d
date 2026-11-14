@php
    $t = __('t_live3d', [], 'de');
    $bootstrap = [
        'isAdmin' => $adminAccess, 'adminCommandUrl' => route('live3d.admin.command'),
        'adminLinks' => $adminAccess ? ['settings' => route('admin.serversettings.index'), 'security' => route('admin.server-administration.index'), 'rules' => route('admin.rules.index'), 'timing' => route('admin.fleettiming.index'), 'tools' => route('admin.developershortcuts.index')] : [],
        'initial' => $initial, 't' => $t, 'models' => __('t_prototype3d', [], 'de'),
        'stateUrl' => route('live3d.state'), 'commandUrl' => route('live3d.command'),
        'galaxyUrl' => route('live3d.galaxy'), 'fleetEventsUrl' => route('fleet.eventbox.fetch'),
        'links' => ['fleets' => route('fleet.index'), 'galaxy' => route('galaxy.index'), 'messages' => route('messages.index', ['prototype3d' => 1]), 'alliance' => route('alliance.index'), 'officers' => route('premium.index'), 'shop' => route('shop.index'), 'merchant' => route('merchant.index'), 'notes' => route('live3d.notes'), 'buddies' => route('buddies.index'), 'options' => route('options.index'), 'highscore' => route('highscore.index'), 'tools' => route('galaxy.index'), 'production' => route('resources.settings'), 'facilities' => route('facilities.index')],
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
<div id="prototype" data-mode="overview" data-page="planet">
    <header class="command-header">
        <a class="brand" href="{{ route('live3d.index') }}"><span class="brand-orbit" aria-hidden="true">◈</span><span>OGameX <b>3D</b><small>ORBITAL COMMAND</small></span></a>
        <div class="command-empire"><span id="live-player"></span><label for="live-planet" class="sr-only">{{ $t['planet'] }}</label><select id="live-planet"></select></div>
        <div id="live-resources" class="resource-balances"></div>
        <div class="header-actions">
            <button data-live-page="messages" data-icon="messages" aria-label="{{ $t['messages'] }}"></button>
            <button data-live-page="options" data-icon="settings" aria-label="{{ $t['settings'] }}"></button>
            <button id="live-refresh" data-icon="refresh" aria-label="{{ $t['refresh'] }}"></button>
            <a href="{{ route('overview.index') }}" data-icon="external" aria-label="{{ $t['original'] }}"></a>
        </div>
    </header>
    <div class="activity-bar"><p id="live-status" role="status">{{ $t['connected'] }}</p><a id="live-login" href="{{ route('login') }}" hidden>{{ $t['login'] }}</a></div>
    <div class="app-shell">
        <nav class="main-nav" aria-label="{{ $t['navigation'] }}">
            <a href="#planet" class="nav-banner" aria-label="{{ $t['planet'] }}"><img src="/img/live3d/planet-atlas.png" alt=""><span>OGameX · {{ $t['planet'] }}</span></a>
            @foreach(['planet', 'buildings', 'research', 'ships', 'defense', 'fleets', 'galaxy', 'alliance', 'messages', 'officers', 'shop', 'merchant', 'notes', 'buddies', 'options', 'highscore'] as $page)
                <div class="nav-entry"><a href="#{{ $page }}" data-live-page="{{ $page }}"><span data-icon="{{ $page }}" aria-hidden="true"></span><span>{{ $t[$page] }}</span></a><button class="nav-help" data-help="{{ $page }}" aria-label="{{ $t['help'] }}: {{ $t[$page] }}" title="{{ $t['help'] }}: {{ $t[$page] }}">?</button></div>
            @endforeach
            @if($adminAccess)<a href="#admin" data-live-page="admin"><span data-icon="settings" aria-hidden="true"></span><span>{{ $t['admin'] }}</span></a>@endif
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
                    <div class="view-switch"><button id="live-overview-mode" aria-pressed="true"><span data-icon="planet" aria-hidden="true"></span>{{ $t['camera'] }}</button><button id="live-colony" aria-pressed="false"><span data-icon="buildings" aria-hidden="true"></span>{{ $t['colony'] }}</button><button id="live-orbit" aria-pressed="false"><span data-icon="planet" aria-hidden="true"></span>{{ $t['orbit'] }}</button></div>
                    <div class="scene-tools"><button id="live-zoom-in" aria-label="{{ $t['zoom_in'] }}">+</button><button id="live-zoom-out" aria-label="{{ $t['zoom_out'] }}">−</button><button id="live-rotate" aria-pressed="false" data-icon="rotate" aria-label="{{ $t['rotate'] }}"></button><button id="live-camera" data-icon="refresh" aria-label="{{ $t['camera'] }}"></button></div>
                    <p class="geometry-note">{{ $t['representative'] }}</p>
                </div>
            </section>
            <section id="live-page-catalog" hidden><div id="live-groups" class="live-groups"></div><div id="live-queues"></div><div class="split-layout"><section id="live-catalog" class="card"></section><aside id="live-detail" class="card"></aside></div></section>
            <section id="live-page-galaxy" hidden>
                <div class="card galaxy-toolbar"><form id="live-galaxy-form"><label>{{ $t['galaxy'] }}<input id="live-galaxy-number" type="number" min="1" required></label><label>{{ $t['system'] }}<input id="live-system-number" type="number" min="1" max="499" required></label></form><div class="galaxy-controls"><button id="live-system-prev" aria-label="{{ $t['previous_system'] }}">←</button><button id="live-system-home">{{ $t['home_system'] }}</button><button id="live-system-next" aria-label="{{ $t['next_system'] }}">→</button><a id="live-galaxy-original" target="_blank" rel="noopener">{{ $t['open_original'] }} ↗</a></div></div>
                <p id="live-galaxy-status" role="status"></p><div id="live-galaxy-rows" class="card galaxy-grid"></div>
            </section>
            <section id="live-page-admin" hidden>
                <div class="admin-intro card"><div><span class="eyebrow">{{ $t['admin'] }}</span><h2>{{ $t['admin_title'] }}</h2><p>{{ $t['admin_intro'] }}</p></div><strong id="live-admin-target"></strong></div>
                <div id="live-admin-tabs" class="admin-tabs"></div>
                <div id="live-admin-test">
                    <div class="admin-grid">
                        <section class="card"><h2>{{ $t['admin_resources'] }}</h2><p>{{ $t['admin_resources_hint'] }}</p><div class="admin-presets" id="live-admin-packs"></div><form id="live-admin-resources"><div class="admin-resource-fields">@foreach(['metal','crystal','deuterium'] as $key)<label>{{ $t[$key] }}<input name="{{ $key }}" type="number" min="0" max="1000000000000" step="1" value="10000000" required></label>@endforeach</div><button type="submit">{{ $t['admin_add_resources'] }}</button></form></section>
                        <section class="card"><h2>{{ $t['admin_objects'] }}</h2><p>{{ $t['admin_objects_hint'] }}</p><form id="live-admin-objects"><label>{{ $t['admin_category'] }}<select id="live-admin-kind">@foreach(['building','station','research','ship','defense'] as $kind)<option value="{{ $kind }}">{{ $t[$kind] ?? $t['ships'] }}</option>@endforeach</select></label><label>{{ $t['admin_object'] }}<select id="live-admin-object"></select></label><label id="live-admin-amount-label">{{ $t['admin_amount'] }}<input id="live-admin-amount" type="number" min="1" max="100" value="1" required></label><button type="submit">{{ $t['admin_apply_object'] }}</button></form></section>
                    </div>
                    <p id="live-admin-status" role="status"></p>
                    <div id="live-admin-shortcuts" class="admin-shortcuts"></div>
                    <section class="card admin-bot-note"><h2>{{ $t['admin_bots'] }}</h2><p>{{ $t['admin_bots_hint'] }}</p></section>
                </div>
                <section id="live-admin-advanced" hidden><div class="admin-frame-toolbar"><p id="live-admin-tab-hint"></p><a id="live-admin-original" target="_blank" rel="noopener">{{ $t['open_original'] }} ↗</a></div><div id="live-admin-sections" class="admin-section-switch" hidden></div><iframe id="live-admin-frame" title="{{ $t['admin'] }}"></iframe></section>
            </section>
            <section id="live-page-original" hidden>
                <p id="live-original-capability" class="card" hidden></p><div id="live-area-tabs" class="live-groups"></div><section id="live-fleet-stock" class="card" hidden></section>
                <div class="card original-note"><p>{{ $t['embedded'] }}</p><a id="live-original-link" target="_blank" rel="noopener">{{ $t['open_original'] }} ↗</a></div><iframe id="live-original" title="{{ $t['original_area'] }}"></iframe>
            </section>
        </main>
    </div>
</div>
<dialog id="live-help-dialog"><button id="live-help-close">{{ $t['close'] }}</button><h2 id="live-help-title"></h2><p id="live-help-text"></p><a id="live-help-original">{{ $t['technology'] }} ↗</a><iframe id="live-help-frame" title="{{ $t['technology'] }}" hidden></iframe></dialog>
<script id="live-bootstrap" type="application/json">@json($bootstrap)</script>
</body>
</html>
