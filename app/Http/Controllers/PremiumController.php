<?php

namespace OGame\Http\Controllers;

use Illuminate\View\View;
use OGame\Services\PlayerService;
use OGame\Services\PremiumCatalog;

class PremiumController extends OGameController
{
    public function index(PlayerService $player, PremiumCatalog $catalog): View
    {
        $this->setBodyId('premium');
        return view('ingame.premium.index', ['products' => array_filter($catalog->products(), fn ($product) => $product['kind'] === 'officer'), 'contracts' => $player->officerContracts(), 'darkMatter' => $player->getDarkMatter()]);
    }
}
