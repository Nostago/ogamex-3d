<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title') · OGameX</title>
</head>
<body>
<main id="live-social" class="live-social">
    @if(session('status'))<p class="social-notice" role="status">{{ session('status') }}</p>@endif
    @if(session('error'))<p class="social-error" role="alert">{{ session('error') }}</p>@endif
    @yield('content')
</main>
</body>
</html>
