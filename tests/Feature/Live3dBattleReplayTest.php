<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use OGame\Models\BattleReport;
use OGame\Models\Message;
use OGame\Models\Resources;
use OGame\Services\UnitQueueService;
use Tests\IsolatedAccountTestCase;

class Live3dBattleReplayTest extends IsolatedAccountTestCase
{
    public function testReplayProjectsExactStoredRoundResultsWithoutChangingTheBattleOrMessages(): void
    {
        $report = $this->report();
        $message = $this->message($report);
        $report->refresh();
        $before = $report->getRawOriginal();
        $data = $this->getJson('/play-3d/messages/'.$message->id.'/battle-replay')->assertOk()->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('frames.0.attacker.units.light_fighter', '13')
            ->assertJsonPath('frames.1.attacker.units.light_fighter', '10')
            ->assertJsonPath('frames.1.attacker.losses.light_fighter', '3')
            ->assertJsonPath('frames.1.defender.absorbed', '700')
            ->assertJsonPath('frames.2.defender.units', [])
            ->assertJsonPath('result.winner', 'attacker')->assertJsonPath('result.loot.metal', '500')->json();
        $this->assertCount(3, $data['frames']);
        $freshReport = $report->fresh();
        $freshMessage = $message->fresh();
        $this->assertNotNull($freshReport);
        $this->assertNotNull($freshMessage);
        $this->assertSame($before, $freshReport->getRawOriginal());
        $this->assertSame(0, $freshMessage->viewed);
        $this->assertContains('rocket_launcher', array_column($data['catalog'], 'key'));
    }

    public function testForeignDeletedAndUnlinkedMessagesNeverGrantReportAccess(): void
    {
        $report = $this->report();
        $foreign = $this->createForeignPlanet()->getPlayer();
        $this->assertNotNull($foreign);
        $message = $this->message($report);
        $message->user_id = $foreign->getId();
        $message->save();
        $this->getJson('/play-3d/messages/'.$message->id.'/battle-replay')->assertNotFound();
        $message->user_id = $this->currentUserId;
        $message->key = 'fleet_return';
        $message->save();
        $this->getJson('/play-3d/messages/'.$message->id.'/battle-replay')->assertNotFound();
        $message->delete();
        $this->getJson('/play-3d/messages/'.$message->id.'/battle-replay')->assertNotFound();
        Auth::logout();
        $this->getJson('/play-3d/messages/'.$message->id.'/battle-replay')->assertUnauthorized();
    }

    public function testMissingRoundsAndMissingStatisticsAreNotInventedAndExpeditionSidesStayStored(): void
    {
        $report = $this->report();
        $report->attacker = ['player_id' => -1, 'units' => ['light_fighter' => '9007199254740993']];
        $report->rounds = null;
        $report->save();
        $message = $this->message($report);
        $url = '/play-3d/messages/'.$message->id.'/battle-replay';
        $this->getJson($url)->assertOk()->assertJsonPath('roundsRecorded', false)->assertJsonPath('result.winner', 'unknown')->assertJsonPath('frames.0.attacker.units.light_fighter', '9007199254740993');
        $report->rounds = [['attacker_ships' => ['light_fighter' => 2], 'defender_ships' => []]];
        $report->save();
        $this->getJson($url)->assertOk()->assertJsonPath('frames.1.attacker.units.light_fighter', '2')->assertJsonPath('frames.1.attacker.shots', null)->assertJsonPath('frames.1.attacker.losses', null);
        $report->rounds = [];
        $report->general = ['tactical_retreat' => ['defender_fled' => true]];
        $report->save();
        $this->getJson($url)->assertOk()->assertJsonPath('roundsRecorded', true)->assertJsonPath('result.winner', 'retreat');
    }

    public function testOnlyBattleMessageDetailsOfferTheReplayWithoutAnAutomaticAssetDownload(): void
    {
        $report = $this->report();
        $message = $this->message($report);
        $this->get('/ajax/messages/'.$message->id.'?ui=live3d')->assertOk()->assertSee('data-battle-replay-url', false)->assertSee('Kampf ansehen');
        $this->get('/ajax/messages/'.$message->id)->assertOk()->assertDontSee('data-battle-replay-url', false);
    }

    public function testNativeBattleDetailsShowActualCountsAndGermanClassWithoutLegacyEditorOrExampleData(): void
    {
        $report = $this->report();
        $report->attacker = [...($report->attacker ?? []), 'character_class' => 'Collector', 'weapon_technology' => 10];
        $report->save();
        $before = $report->fresh()?->getRawOriginal();
        $message = $this->message($report);
        $response = $this->get('/ajax/messages/'.$message->id.'?ui=live3d')->assertOk()
            ->assertSee('live-battle-report')->assertSee('Kollektor')->assertSee('100 %')->assertSee('Im Kampf verloren')
            ->assertSee('data-battle-round="1"', false)->assertSee('data-battle-round="2"', false)
            ->assertDontSee('sceditor')->assertDontSee('rawMessageData')->assertDontSee('Font colour')
            ->assertDontSee('DETROID')->assertDontSee('gameforge.com')->assertDontSee('Ehrenpunkte')
            ->assertDontSee('data-battle-unit="heavy_fighter"', false);
        // First fleet table is the attacker's whole-battle summary: 13 -> 8, five lost.
        $html = $response->getContent();
        $this->assertIsString($html);
        $this->assertMatchesRegularExpression('/data-battle-unit="light_fighter"[^>]*>.*?data-count="before">13<.*?data-count="after">8<.*?data-count="lost"[^>]*>5</s', $html);
        $this->assertSame($before, $report->fresh()?->getRawOriginal());
        $this->assertDatabaseHas('messages', ['id' => $message->id, 'viewed' => 1]);
    }

    public function testNativeDetailsReadIncompleteHistoricalReportsWithoutInventingEndCounts(): void
    {
        $report = $this->report();
        $report->rounds = null;
        $report->save();
        $message = $this->message($report);
        $this->get('/ajax/messages/'.$message->id.'?ui=live3d')->assertOk()->assertSee('keine Rundendaten gespeichert')->assertSee('Nicht aufgezeichnet')
            ->assertSee('data-count="after">Nicht aufgezeichnet', false);
        $report->rounds = [['attacker_ships' => ['light_fighter' => 8], 'defender_ships' => []]];
        $report->save();
        $this->get('/ajax/messages/'.$message->id.'?ui=live3d')->assertOk()->assertSee('Runde 1')->assertSee('Nicht aufgezeichnet')->assertDontSee('Font colour');
    }

    public function testOnlyTheHeadOfTheShipQueueIsActiveAndTheNextOrderTakesOver(): void
    {
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000));
        $this->planetSetObjectLevel('shipyard', 2);
        $this->planetSetObjectLevel('robot_factory', 2);
        $this->playerSetResearchLevel('combustion_drive', 2);
        $queue = resolve(UnitQueueService::class);
        $queue->add($this->planetService, 204, 2);
        $queue->add($this->planetService, 202, 2);
        $response = $this->getJson('/play-3d/state')->assertOk()->assertJsonPath('queues.unit.0.active', true)->assertJsonPath('queues.unit.1.active', false);
        $nextId = $response->json('queues.unit.1.id');
        $this->travel((int)$response->json('queues.unit.0.remaining') + 1)->seconds();
        $this->getJson('/play-3d/state')->assertOk()->assertJsonPath('queues.unit.0.id', $nextId)->assertJsonPath('queues.unit.0.active', true);
    }

    private function message(BattleReport $report): Message
    {
        $message = new Message();
        $message->forceFill(['user_id' => $this->currentUserId, 'key' => 'battle_report', 'battle_report_id' => $report->id, 'viewed' => 0])->save();
        return $message;
    }

    private function report(): BattleReport
    {
        $report = new BattleReport();
        $coords = $this->planetService->getPlanetCoordinates();
        $report->forceFill(['planet_galaxy' => $coords->galaxy, 'planet_system' => $coords->system, 'planet_position' => $coords->position, 'planet_type' => 1, 'planet_user_id' => $this->currentUserId,
            'attacker' => ['player_id' => $this->currentUserId, 'units' => ['light_fighter' => 13], 'resource_loss' => 20000],
            'defender' => ['player_id' => $this->currentUserId, 'units' => ['rocket_launcher' => 3], 'resource_loss' => 6000],
            'rounds' => [
                ['attacker_ships' => ['light_fighter' => 10], 'defender_ships' => ['rocket_launcher' => 2], 'attacker_losses' => ['light_fighter' => 3], 'defender_losses' => ['rocket_launcher' => 1], 'attacker_losses_in_this_round' => ['light_fighter' => 3], 'defender_losses_in_this_round' => ['rocket_launcher' => 1], 'hits_attacker' => 13, 'hits_defender' => 3, 'full_strength_attacker' => 650, 'full_strength_defender' => 240, 'absorbed_damage_attacker' => 100, 'absorbed_damage_defender' => 700],
                ['attacker_ships' => ['light_fighter' => 8], 'defender_ships' => [], 'attacker_losses' => ['light_fighter' => 5], 'defender_losses' => ['rocket_launcher' => 3], 'attacker_losses_in_this_round' => ['light_fighter' => 2], 'defender_losses_in_this_round' => ['rocket_launcher' => 2], 'hits_attacker' => 10, 'hits_defender' => 2, 'full_strength_attacker' => 500, 'full_strength_defender' => 160, 'absorbed_damage_attacker' => 80, 'absorbed_damage_defender' => 600],
            ], 'loot' => ['metal' => 500, 'crystal' => 200, 'deuterium' => 100], 'debris' => ['metal' => 2000, 'crystal' => 1000], 'repaired_defenses' => ['rocket_launcher' => 2]]);
        $report->save();
        return $report;
    }
}
