@php
    $t = __('t_prototype3d', [], 'de');
    // Legacy game bundles disable module tags globally. Keep this entry isolated.
    $prototypeVite = clone app(\Illuminate\Foundation\Vite::class);
    $prototypeVite->useScriptTagAttributes(['type' => 'module']);
@endphp
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OGameX-3D · 0.11</title>
    {{ $prototypeVite('resources/js/prototype3d/index.js') }}
</head>
<body class="prototype-3d">
<div id="prototype" data-mode="colony" data-page="planet">
    <header class="topbar">
        <a class="brand" href="{{ url('/') }}"><span class="brand-icon">◈</span> OGameX<span class="brand-3d">3D</span><small>V 0.11</small></a>
        <span class="demo-tag">{{ $t['demo'] }}</span>
        <div class="planet-context"><label for="planet-select">{{ $t['choose_planet'] }}</label><select id="planet-select"></select><span id="context-fields"></span></div>
        <button id="reset-demo" class="text-button">↺ {{ $t['reset'] }}</button>
        <a class="back-link" href="{{ url('/') }}">{{ $t['back'] }} ↗</a>
    </header>
    <div class="activity-bar"><p id="render-status" role="status">{{ $t['loading'] }}</p><button id="cancel-operation" hidden>{{ $t['interrupt'] }}</button></div>
    <div class="app-shell">
        <nav class="main-nav" aria-label="{{ $t['main_navigation'] }}">
            <span class="eyebrow nav-caption">{{ $t['command'] }}</span>
            @foreach (['planet' => '◉', 'buildings' => '▥', 'ships' => '◇', 'fleets' => '⌁', 'messages' => '✉'] as $page => $icon)
                <a href="#{{ $page }}" data-page-link="{{ $page }}"><span aria-hidden="true">{{ $icon }}</span><span>{{ $t['nav_' . $page] }}</span>@if($page === 'messages')<b id="message-unread" class="unread-badge" hidden></b>@endif</a>
            @endforeach
            <p class="nav-note">{{ $t['note'] }}</p>
        </nav>
        <main class="workspace">
            <header class="workspace-heading"><div><span class="eyebrow" id="context-name"></span><h1 id="page-title" tabindex="-1">{{ $t['nav_planet'] }}</h1><p id="page-description"></p></div></header>
            <section id="page-planet" class="page" aria-labelledby="page-title">
                <div class="planet-layout">
                    <div id="planet-scene-slot">
                        <section class="scene-panel" aria-label="{{ $t['scene'] }}">
                            <div class="scene-title"><span class="eyebrow">{{ $t['sector'] }} · 01</span><h2 id="planet-name">Kepler IX</h2><p id="planet-coordinates">[1:42:8]</p></div>
                            <div class="view-switch" role="group" aria-label="{{ $t['view'] }}"><button id="colony-view" aria-pressed="true">◉ {{ $t['colony'] }}</button><button id="orbit-view">◎ {{ $t['orbit'] }}</button></div>
                            <div id="scene" tabindex="0" aria-label="{{ $t['controls'] }}"></div><div id="scene-labels" aria-hidden="true"></div>
                            <div class="scene-tools"><button id="zoom-in" aria-label="{{ $t['zoom_in'] }}">+</button><button id="zoom-out" aria-label="{{ $t['zoom_out'] }}">−</button><button id="rotate" aria-pressed="false">↻ <span>{{ $t['rotate'] }}</span></button><button id="reset-camera">⌖ <span>{{ $t['camera'] }}</span></button></div>
                            <div class="scene-caption">{{ $t['controls'] }}</div>
                        </section>
                    </div>
                    <div class="overview-cards">
                        <section id="planet-orbit-info" class="card" hidden></section>
                        <section class="card planet-capacity" aria-label="{{ $t['planet_state'] }}"><h2>{{ $t['planet_state'] }}</h2><div class="capacity-stats"><span>{{ $t['diameter'] }}</span><strong id="planet-diameter"></strong><span>{{ $t['fields_used'] }}</span><strong id="fields-used"></strong><span>{{ $t['fields_free'] }}</span><strong id="fields-free"></strong></div><progress id="capacity-meter" aria-label="{{ $t['fields_used'] }}"></progress><p id="terraformer-effect" class="muted"></p><p class="muted">{{ $t['planet_demo'] }}</p></section>
                        <section class="card"><h2>{{ $t['demo_stats'] }}</h2><div id="production-summary" class="production-summary"></div></section>
                        <section class="card quick-links"><h2>{{ $t['quick_access'] }}</h2><a href="#buildings">{{ $t['nav_buildings'] }} <strong id="structure-count">09</strong></a><a href="#ships">{{ $t['nav_ships'] }} <strong id="overview-pending">0</strong></a><a href="#fleets">{{ $t['nav_fleets'] }} <strong id="overview-fleet">3</strong></a></section>
                    </div>
                </div>
            </section>
            <section id="page-buildings" class="page" hidden aria-labelledby="page-title">
                <div class="split-layout">
                    <section class="card catalog-panel"><div class="section-heading"><h2>{{ $t['building_catalog'] }}</h2><button id="toggle-build" aria-expanded="false" aria-controls="builder">+ {{ $t['build_menu'] }}</button></div>
                        <section id="builder" hidden></section>
                        <p id="plot-summary" class="muted" aria-live="polite"></p><div id="building-list"></div>
                    </section>
                    <aside class="detail-column"><section id="building-info" class="card" aria-live="polite"></section><button data-preview="buildings" aria-controls="buildings-preview" aria-expanded="false">{{ $t['preview_show'] }}</button><div id="buildings-preview" class="preview-slot" hidden></div></aside>
                </div>
            </section>
            <section id="page-ships" class="page" hidden aria-labelledby="page-title">
                <div class="equal-layout"><section class="card"><div id="ship-stock"></div><div id="shipyard-summary"></div><div id="ship-builder"></div><button id="open-shipyard-building" class="text-button">{{ $t['shipyard_details'] }} →</button><div class="preview-area"><button data-preview="ships" aria-controls="ships-preview" aria-expanded="false">{{ $t['preview_show'] }}</button><div id="ships-preview" class="preview-slot" hidden></div></div></section><section id="ship-orders" class="card"></section></div><section id="ship-examples" class="card"></section>
            </section>
            <section id="page-fleets" class="page" hidden aria-labelledby="page-title">
                <section id="mission-overview" class="card"></section><div id="fleet-management"></div><div id="fleets-preview" class="preview-slot" hidden></div>
            </section>
            <section id="page-messages" class="page" hidden aria-labelledby="page-title">
                <a data-live-message-link class="secondary-link" href="{{ route('messages.index', ['prototype3d' => 1]) }}">{{ $t['live_mailbox'] }} ↗</a>
                <div id="message-center"></div><div id="messages-preview" hidden></div>
            </section>
        </main>
    </div>
    <footer><span>◈ {{ $t['local'] }}</span><span>OGameX-3D · V 0.11</span></footer>
</div>
<script type="application/json" id="prototype-translations">@json($t)</script>
</body>
</html>
