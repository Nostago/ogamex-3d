<?php

namespace Tests\Unit;

use OGame\Services\AutonomousBotStrategy;
use PHPUnit\Framework\TestCase;

class AutonomousBotStrategyTest extends TestCase
{
    public function testPercentagesAndReducedRatiosProduceTheSameDeterministicSchedule(): void
    {
        $ratio = ['fleet' => 2, 'economy' => 1, 'research' => 1];
        $percent = ['fleet' => 50, 'economy' => 25, 'research' => 25];
        $this->assertSame(4, AutonomousBotStrategy::period($percent));
        $counts = ['fleet' => 0, 'economy' => 0, 'research' => 0];
        for ($cycle = 1; $cycle <= 100; $cycle++) {
            $turn = AutonomousBotStrategy::turn($ratio, $cycle);
            $this->assertSame($turn, AutonomousBotStrategy::turn($percent, $cycle));
            $counts[$turn]++;
        }
        $this->assertSame(['fleet' => 50, 'economy' => 25, 'research' => 25], $counts);
    }

    public function testPrioritiesAreInterleavedAndAZeroWeightNeverGetsAPreferredTurn(): void
    {
        $weights = ['fleet' => 51, 'economy' => 24, 'research' => 25];
        $turns = [];
        for ($cycle = 1; $cycle <= 100; $cycle++) {
            $turns[] = AutonomousBotStrategy::turn($weights, $cycle);
        }
        $counts = array_count_values($turns);
        $this->assertSame(51, $counts['fleet']);
        $this->assertSame(24, $counts['economy']);
        $this->assertSame(25, $counts['research']);
        for ($offset = 0; $offset <= 90; $offset += 10) {
            $this->assertCount(3, array_unique(array_slice($turns, $offset, 10)));
        }
        for ($cycle = 1; $cycle <= 10; $cycle++) {
            $this->assertSame('research', AutonomousBotStrategy::turn(['fleet' => 0, 'economy' => 0, 'research' => 100], $cycle));
        }
    }
}
