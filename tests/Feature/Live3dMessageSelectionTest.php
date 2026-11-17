<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use OGame\Factories\PlayerServiceFactory;
use OGame\Models\Message;
use OGame\Models\User;
use OGame\Services\MessageService;
use Tests\IsolatedAccountTestCase;

class Live3dMessageSelectionTest extends IsolatedAccountTestCase
{
    public function testSelectedDeletionIncludesReadAndUnreadOwnedMessagesButNothingElse(): void
    {
        $read = $this->message(true);
        $unread = $this->message(false);
        $keep = $this->message(true);
        $foreign = $this->message(true);
        $foreign->user_id = User::factory()->create()->id;
        $foreign->save();

        $this->postJson('/messages?ui=live3d', ['_token' => csrf_token(), 'action' => 'delete-selected', 'messageIds' => [$read->id, $unread->id, $foreign->id]])
            ->assertOk()->assertJsonPath('deleted', 2);
        $this->assertDatabaseMissing('messages', ['id' => $read->id]);
        $this->assertDatabaseMissing('messages', ['id' => $unread->id]);
        foreach ([$keep, $foreign] as $message) {
            $this->assertDatabaseHas('messages', ['id' => $message->id]);
        }
        $this->postJson('/messages?ui=live3d', ['_token' => csrf_token(), 'action' => 'delete-selected', 'messageIds' => [$read->id, $unread->id]])->assertOk()->assertJsonPath('deleted', 0);
    }

    public function testSelectionMustBeBoundedValidAndCsrfProtected(): void
    {
        $message = $this->message(true);
        $this->postJson('/messages?ui=live3d', ['action' => 'delete-selected', 'messageIds' => [$message->id]])->assertStatus(419);
        foreach ([[], [$message->id, $message->id], [$message->id, 'bad'], range(1, 101)] as $ids) {
            $this->postJson('/messages?ui=live3d', ['_token' => csrf_token(), 'action' => 'delete-selected', 'messageIds' => $ids])->assertUnprocessable();
        }
        $this->assertDatabaseHas('messages', ['id' => $message->id]);
    }

    public function testGroupedUnreadCountsMatchTheOriginalCountersWithOneQuery(): void
    {
        $this->message(false);
        $this->message(true);
        $service = new MessageService(resolve(PlayerServiceFactory::class)->make($this->currentUserId));
        $expected = [];
        foreach (['fleets', 'communication', 'economy', 'universe', 'system', 'favorites'] as $tab) {
            $expected[$tab] = $service->getUnreadMessagesCountForTab($tab);
        }
        DB::enableQueryLog();
        DB::flushQueryLog();
        $actual = $service->getUnreadMessageCounts();
        $queries = DB::getQueryLog();
        DB::disableQueryLog();
        $this->assertSame($expected, $actual);
        $this->assertCount(1, $queries);
        foreach ($service->getUnreadMessageCounts('fleets') as $subtab => $count) {
            $this->assertSame($service->getUnreadMessagesCountForSubTab('fleets', $subtab), $count);
        }
    }

    public function testOnlyTheDisplayedPageIsMarkedReadInOneUpdate(): void
    {
        Message::where('user_id', $this->currentUserId)->delete();
        for ($i = 0; $i < 12; $i++) {
            $this->message(false);
        }
        $service = new MessageService(resolve(PlayerServiceFactory::class)->make($this->currentUserId));
        DB::enableQueryLog();
        DB::flushQueryLog();
        $result = $service->getMessagesForTab('universe', 'universe');
        $queries = DB::getQueryLog();
        $updates = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^update\s+[`"]?messages[`"]?\s/i', $query['query']) === 1);
        DB::disableQueryLog();
        $this->assertCount(1, $updates, implode("\n", array_column($queries, 'query')));
        $this->assertCount(10, $result['messages']);
        $this->assertTrue($result['messages'][0]->isUnread());
        $this->assertSame(2, Message::where('user_id', $this->currentUserId)->where('viewed', 0)->count());

        DB::enableQueryLog();
        DB::flushQueryLog();
        $service->getMessagesForTab('universe', 'universe');
        $updates = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^update\s+[`"]?messages[`"]?\s/i', $query['query']) === 1);
        DB::disableQueryLog();
        $this->assertCount(0, $updates);
    }

    private function message(bool $read): Message
    {
        $message = new Message();
        $message->user_id = $this->currentUserId;
        $message->key = 'welcome_message';
        $message->params = ['player' => (string)$this->currentUserId];
        $message->viewed = $read ? 1 : 0;
        $message->save();
        return $message;
    }
}
