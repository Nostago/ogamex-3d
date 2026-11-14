<?php

namespace OGame\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

/** Presentation context only; never changes a player's language preference or game rules. */
class Live3dContext
{
    public function handle(Request $request, Closure $next): mixed
    {
        $referer = parse_url((string)$request->headers->get('referer', ''));
        $query = [];
        parse_str($referer['query'] ?? '', $query);
        $sameOrigin = ($referer['host'] ?? '') === $request->getHost();
        $live = $request->is('play-3d*') || $request->input('ui') === 'live3d'
            || ($sameOrigin && (($query['ui'] ?? '') === 'live3d' || str_starts_with($referer['path'] ?? '', '/play-3d')));
        if ($live) {
            App::setLocale('de');
            $request->attributes->set('live3d', true);
        }
        return $next($request);
    }
}
