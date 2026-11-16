<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Date;
use OGame\Models\BattleReport;
use OGame\Models\EspionageReport;
use OGame\Models\Message;
use Tests\IsolatedAccountTestCase;

class Live3dMessageDialogTest extends IsolatedAccountTestCase
{
    public function testBattleDetailsRetainOriginalLootAndDebrisInsideTheNewDialogFragment(): void
    {
        $coordinates = $this->planetService->getPlanetCoordinates();
        $report = new BattleReport();
        $report->forceFill(['planet_galaxy' => $coordinates->galaxy, 'planet_system' => $coordinates->system, 'planet_position' => $coordinates->position, 'planet_user_id' => $this->currentUserId,
            'attacker' => ['player_id' => $this->currentUserId, 'resource_loss' => 20000, 'units' => [], 'weapon_technology' => 0, 'shielding_technology' => 0, 'armor_technology' => 0],
            'defender' => ['player_id' => $this->currentUserId, 'resource_loss' => 10000, 'units' => [], 'weapon_technology' => 0, 'shielding_technology' => 0, 'armor_technology' => 0],
            'rounds' => [], 'loot' => ['percentage' => 50, 'metal' => 1000, 'crystal' => 500, 'deuterium' => 100], 'debris' => ['metal' => 1000, 'crystal' => 500], 'repaired_defenses' => []]);
        $report->save();
        $message = new Message();
        $message->user_id = $this->currentUserId;
        $message->key = 'battle_report';
        $message->battle_report_id = $report->id;
        $message->save();
        $this->get('/ajax/messages/'.$message->id.'?ui=live3d')->assertOk()->assertSee('data-live-message-id', false)->assertSee('messagedetails')->assertSee('1,000')->assertSee('500');
    }

    public function testNativeEspionageDetailsHaveNamedActionsAndPreserveUnknownInformation(): void
    {
        $first = $this->report();
        $second = $this->report();
        $second->created_at = Date::now()->subMinute();
        $second->save();
        $this->get('/ajax/messages/'.$first->id.'?ui=live3d')->assertOk()
            ->assertSee('data-live-message-id="'.$first->id.'"', false)
            ->assertSee('live-spy-report')->assertSee('data-message-fleet', false)
            ->assertSee('mission=6', false)->assertSee('mission=1', false)
            ->assertSee('data-report-section="research"', false)
            ->assertSee('live-report-unknown')->assertSee('Keine Einträge vorhanden.')
            ->assertSee('1.200')->assertDontSee('sendShipsWithPopup')->assertDontSee('sr-en-256')->assertDontSee('More details');
        $this->assertDatabaseHas('messages', ['id' => $first->id, 'viewed' => 1]);
    }

    public function testClassicReportRemainsAvailableAndAnotherPlayersDetailsAreNotReadable(): void
    {
        $message = $this->report();
        $this->get('/ajax/messages/'.$message->id)->assertOk()->assertSee('detail_msg')->assertDontSee('live-spy-report');
        $owner = $this->createForeignPlanet()->getPlayer();
        $this->assertNotNull($owner);
        $message->user_id = $owner->getId();
        $message->save();
        $this->get('/ajax/messages/'.$message->id.'?ui=live3d')->assertNotFound();
    }

    public function testDeleteReadMessagesOnlyDeletesReadOwnedMessagesExplicitlySelected(): void
    {
        $read = $this->report();
        $read->viewed = 1;
        $read->save();
        $keep = $this->report();
        $keep->viewed = 1;
        $keep->save();
        $unread = $this->report();
        $foreign = $this->report();
        $foreign->viewed = 1;
        $owner = $this->createForeignPlanet()->getPlayer();
        $this->assertNotNull($owner);
        $foreign->user_id = $owner->getId();
        $foreign->save();
        $this->postJson('/messages', ['_token' => csrf_token(),'action' => 'delete-read','messageIds' => [$read->id,$unread->id,$foreign->id]])->assertOk()->assertJsonPath('deleted', 1);
        $this->assertDatabaseMissing('messages', ['id' => $read->id]);
        foreach ([$keep,$unread,$foreign] as $message) {
            $this->assertDatabaseHas('messages', ['id' => $message->id]);
        }
    }

    public function testSingleMessageDeletionAndCsrfProtectionUseTheOriginalEndpoint(): void
    {
        $message = $this->report();
        $message->viewed = 1;
        $message->save();
        $this->postJson('/messages', ['action' => 103,'messageId' => $message->id])->assertStatus(419);
        $this->postJson('/messages', ['_token' => csrf_token(),'action' => 103,'messageId' => $message->id])->assertOk();
        $this->assertDatabaseMissing('messages', ['id' => $message->id]);
    }

    private function report(): Message
    {
        $coordinates = $this->planetService->getPlanetCoordinates();
        $report = new EspionageReport();
        $report->forceFill(['planet_galaxy' => $coordinates->galaxy,'planet_system' => $coordinates->system,'planet_position' => $coordinates->position,'planet_type' => 1,'planet_user_id' => $this->currentUserId,'player_info' => [], 'resources' => ['metal' => 900,'crystal' => 2814,'deuterium' => 683,'energy' => -93], 'debris' => ['metal' => 0,'crystal' => 0,'deuterium' => 0], 'ships' => ['light_fighter' => 1200], 'defense' => [], 'buildings' => ['metal_mine' => 7], 'research' => null]);
        $report->save();
        $message = new Message();
        $message->user_id = $this->currentUserId;
        $message->key = 'espionage_report';
        $message->espionage_report_id = $report->id;
        $message->save();
        return $message;
    }
}
