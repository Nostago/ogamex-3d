<?php

namespace OGame\Http\Controllers;

use Illuminate\View\View;

class RewardsController extends OGameController
{
    /**
     * Shows the rewards index page
     *
     * @return View
     */
    public function index(): View
    {
        return view(request()->attributes->get('live3d') ? 'live3d.rewards' : 'ingame.rewards.index');
    }
}
