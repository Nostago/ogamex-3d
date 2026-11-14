<?php

namespace OGame\Http\Controllers;

use Illuminate\View\View;
use OGame\Services\PlayerService;
use OGame\Services\PremiumCatalog;
use OGame\Services\PremiumService;

class ShopController extends OGameController
{
    public function index(PlayerService $player, PremiumCatalog $catalog, PremiumService $premium): View
    {
        $this->setBodyId('shop');
        return view('ingame.shop.index', ['products' => array_filter($catalog->products(), fn ($product) => $product['kind'] === 'item'), 'inventory' => $premium->inventory($player), 'darkMatter' => $player->getDarkMatter(), 'planetId' => $player->getCurrentPlanetId()]);
    }
}
