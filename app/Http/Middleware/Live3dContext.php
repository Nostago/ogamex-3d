<?php

namespace OGame\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Vite;
use OGame\Services\Live3dArtworkService;

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
        $response = $next($request);
        // Deliver the new presentation before the browser can paint a legacy
        // document. Preserve original templates, scripts, routes and forms.
        if ($live && $response instanceof Response && !$request->is('play-3d')) {
            $html = $response->getContent();
            if (is_string($html)) {
                $html = Live3dArtworkService::replaceLegacyImages($html);
                $response->setContent($html);
            }
            if (is_string($html) && str_contains($html, '</head>') && str_contains($html, '<body')) {
                $asset = htmlspecialchars(Vite::asset('resources/css/live3d-embedded.css'), ENT_QUOTES, 'UTF-8');
                $style = '<link rel="stylesheet" data-live3d-embedded-style href="'.$asset.'">';
                // Last stylesheet wins against the original theme, while still
                // being render-blocking and available without parent-frame JS.
                $response->setContent(str_replace('</head>', $style.'</head>', $html));
                $response->headers->set('Cache-Control', 'private, no-store');
            }
        }
        return $response;
    }
}
