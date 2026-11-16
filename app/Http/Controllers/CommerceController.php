<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use OGame\Services\PlayerService;
use OGame\Services\PremiumCatalog;
use OGame\Services\PremiumService;
use OGame\Services\SettingsService;

class CommerceController extends OGameController
{
    public function purchase(Request $request, PlayerService $player, PremiumService $premium): JsonResponse|RedirectResponse
    {
        $this->checkToken($request);
        $data = $request->validate(['product' => ['required', 'string', 'max:50'], 'quantity' => ['required', 'integer', 'min:1', 'max:100'], 'expected_price' => ['required', 'integer', 'min:0', 'max:1000000000'], 'request_id' => ['required', 'uuid']]);
        $premium->purchase($player, $data['product'], (int)$data['quantity'], (int)$data['expected_price'], $data['request_id']);
        return $this->result($request, $player, 't_commerce.purchased');
    }

    public function activate(Request $request, PlayerService $player, PremiumService $premium): JsonResponse|RedirectResponse
    {
        $this->checkToken($request);
        $data = $request->validate(['product' => ['required', 'string', 'max:50'], 'planet' => ['required', 'integer', 'min:1'], 'request_id' => ['required', 'uuid']]);
        abort_unless($player->planets->planetExistsAndOwnedByPlayer((int)$data['planet']), 404);
        $planet = $player->planets->getById((int)$data['planet']);
        $effect = $premium->activate($player, $planet, $data['product'], $data['request_id']);
        $seconds = $effect['seconds'] ?? 0;
        $message = $effect === null ? __('t_commerce.activation_replayed') : __('t_commerce.activation_effect', [
            'target' => str_starts_with($data['product'], 'newtron_') ? __('t_commerce.queue_research') : $planet->getPlanetName().' ['.$planet->getPlanetCoordinates()->asString().']',
            'days' => intdiv($seconds, 86400), 'hours' => intdiv($seconds % 86400, 3600), 'minutes' => intdiv($seconds % 3600, 60), 'seconds' => $seconds % 60,
            'orders' => $effect['orders'] ?? 0, 'units' => $effect['units'] ?? 0,
        ]);
        return $this->result($request, $player, $message, $effect);
    }

    public function prices(PlayerService $player, PremiumCatalog $catalog): View
    {
        abort_unless($player->isAdmin(), 403);
        return view('ingame.commerce.prices', ['products' => $catalog->products()]);
    }

    public function savePrices(Request $request, PlayerService $player, PremiumCatalog $catalog, SettingsService $settings): JsonResponse|RedirectResponse
    {
        abort_unless($player->isAdmin(), 403);
        $this->checkToken($request);
        $rules = ['prices' => ['required', 'array:'.implode(',', array_keys($catalog->products()))]];
        foreach ($catalog->products() as $key => $product) {
            $rules['prices.'.$key] = ['required', 'integer', 'min:0', 'max:1000000000'];
        }
        $data = $request->validate($rules);
        DB::transaction(function () use ($data, $settings) {
            foreach ($data['prices'] as $key => $price) {
                $settings->set('premium_price_'.$key, (int)$price);
            }
        });
        $url = route('commerce.prices', ['ui' => $request->input('ui'), 'cp' => $request->input('cp')]);
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'message' => __('t_commerce.prices_saved'), 'redirectUrl' => $url]);
        }
        return redirect($url)->with('status', __('t_commerce.prices_saved'));
    }

    private function checkToken(Request $request): void
    {
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
    }

    /** @param array{seconds: int, orders: int, units: int}|null $effect */
    private function result(Request $request, PlayerService $player, string $message, array|null $effect = null): JsonResponse|RedirectResponse
    {
        $route = str_starts_with((string)$request->input('product'), 'commander_') || preg_match('/^(admiral|engineer|geologist|technocrat)_/', (string)$request->input('product')) ? 'premium.index' : 'shop.index';
        $url = route($route, ['ui' => $request->input('ui'), 'cp' => $request->input('cp'), 'inventory' => $request->boolean('inventory') ? 1 : null]);
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'message' => __($message), 'effect' => $effect, 'darkMatter' => $player->getDarkMatter(), 'redirectUrl' => $url]);
        }
        return redirect($url)->with('status', __($message));
    }
}
