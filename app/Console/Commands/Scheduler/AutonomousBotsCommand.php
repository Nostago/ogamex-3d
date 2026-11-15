<?php

namespace OGame\Console\Commands\Scheduler;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use OGame\Services\AutonomousBotService;

#[Description('Run one bounded decision for each due autonomous NPC')]
#[Signature('ogamex:bots:tick {--limit=100 : Maximum due bots per invocation}')]
class AutonomousBotsCommand extends Command
{
    public function handle(AutonomousBotService $bots): int
    {
        $count = $bots->tickDue((int)$this->option('limit'));
        $this->info('NPC decisions: '.$count);
        return self::SUCCESS;
    }
}
