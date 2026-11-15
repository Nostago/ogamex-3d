<?php

namespace OGame\Console\Commands\Admin;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use OGame\Services\AutonomousBotService;

#[Description('Ensure a dedicated, active NPC population; never converts human accounts')]
#[Signature('ogamex:bots:populate {--count=50 : Desired active NPC population (1–100)}')]
class PopulateAutonomousBots extends Command
{
    public function handle(AutonomousBotService $bots): int
    {
        $this->info('Active NPCs: '.$bots->populate((int)$this->option('count')));
        return self::SUCCESS;
    }
}
