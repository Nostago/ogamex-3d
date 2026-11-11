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
    <title>OGameX-3D · 0.4</title>
    {{ $prototypeVite('resources/js/prototype3d/index.js') }}
</head>
<body class="prototype-3d">
<div id="prototype" data-mode="colony">
    <header class="topbar">
        <a class="brand" href="{{ url('/') }}"><span class="brand-icon">◈</span> OGameX<span class="brand-3d">3D</span><small>V 0.4</small></a>
        <span class="demo-tag"><i></i>{{ $t['demo'] }}</span>
        <a class="back-link" href="{{ url('/') }}">{{ $t['back'] }} ↗</a>
    </header>
    <main>
        <section class="scene-panel" aria-label="{{ $t['scene'] }}">
            <div class="scene-title"><span class="eyebrow">{{ $t['sector'] }} · 01</span><h1>Kepler <em>IX</em></h1><p>[1:42:8] <span> / </span> {{ $t['class'] }}</p></div>
            <div class="view-switch" role="group" aria-label="{{ $t['view'] }}">
                <button id="colony-view" aria-pressed="true">◉ {{ $t['colony'] }}</button>
                <button id="orbit-view" aria-pressed="false">◎ {{ $t['orbit'] }}</button>
            </div>
            <div id="scene" tabindex="0" aria-label="{{ $t['controls'] }}"></div>
            <div id="scene-labels" aria-hidden="true"></div>
            <p id="render-status" role="status">{{ $t['loading'] }}</p>
            <div class="scene-tools">
                <button id="zoom-in" aria-label="{{ $t['zoom_in'] }}">+</button>
                <button id="zoom-out" aria-label="{{ $t['zoom_out'] }}">−</button>
                <button id="rotate" aria-pressed="false">↻ <span>{{ $t['rotate'] }}</span></button>
                <button id="reset-camera">⌖ <span>{{ $t['camera'] }}</span></button>
            </div>
            <div class="scene-caption"><span class="signal">▥</span> {{ $t['controls'] }}</div>
            <div class="coordinates">KEPLER SYSTEM <span> / </span> 01.042.008</div>
        </section>
        <aside class="colony-panel">
            <div class="panel-heading"><div><span class="eyebrow">{{ $t['command'] }}</span><h2 id="panel-title">{{ $t['colony'] }}</h2></div><span class="online-dot"></span></div>
            <div id="production-summary" class="production-summary"></div>
            <div class="section-heading"><h3>{{ $t['structures'] }}</h3><span id="structure-count">04</span></div>
            <div id="building-list"></div>
            <p id="plot-summary" class="plot-summary" aria-live="polite"></p>
            <button id="toggle-build" class="upgrade-button" aria-expanded="false" aria-controls="builder">+ {{ $t['build_menu'] }}</button>
            <section id="builder" hidden></section>
            <section id="building-info" aria-live="polite"></section>
            <section id="orbit-info" hidden><span class="eyebrow">{{ $t['orbit_network'] }}</span><h3>{{ $t['station'] }}</h3><p>{{ $t['orbit_description'] }}</p><div class="fleet-row">◁ <span>{{ $t['scout'] }}</span><b>02</b></div><div class="fleet-row">◇ <span>{{ $t['transport'] }}</span><b>01</b></div></section>
            <div class="demo-note"><span>◈</span><p>{{ $t['note'] }}</p></div>
            <button id="reset-demo" class="text-button">↺ {{ $t['reset'] }}</button>
        </aside>
    </main>
    <footer><span><i></i>{{ $t['local'] }}</span><span>OGameX-3D <b> / </b> {{ $t['prototype'] }}</span></footer>
</div>
<script type="application/json" id="prototype-translations">@json($t)</script>
</body>
</html>
