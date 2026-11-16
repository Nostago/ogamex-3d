<?php

namespace Tests\Feature;

use Mockery\MockInterface;
use OGame\Models\BuddyRequest;
use OGame\Models\Highscore;
use OGame\Models\User;
use OGame\Models\UserTech;
use OGame\Services\BuddyService;
use OGame\Services\HighscoreService;
use Tests\IsolatedAccountTestCase;

class Live3dSocialUiTest extends IsolatedAccountTestCase
{
    public function testLiveHighscoreOnlyShowsPlayerTotalPointsAndExcludesAdmins(): void
    {
        $planet = $this->createForeignPlanet();
        $owner = $planet->getPlayer();
        $this->assertNotNull($owner);
        UserTech::firstOrCreate(['user_id' => $owner->getId()]);
        $values = ['general' => 1234567, 'economy' => 222, 'research' => 333, 'military' => 444, 'general_rank' => 1, 'economy_rank' => 1, 'research_rank' => 1, 'military_rank' => 1];
        Highscore::updateOrCreate(['player_id' => $owner->getId()], $values);
        $admin = User::factory()->create(['username' => 'HiddenAdminSocialTest']);
        $admin->assignRole('admin');
        UserTech::firstOrCreate(['user_id' => $admin->id]);
        Highscore::updateOrCreate(['player_id' => $admin->id], $values);

        $response = $this->get('/highscore?ui=live3d&category=2&type=3');
        $response->assertOk()->assertSee('class="social-table social-ranking"', false)
            ->assertSee('1.234.567')->assertSee($owner->getUsername())
            ->assertDontSee($admin->username)->assertDontSee('Wirtschaft')->assertDontSee('Forschung')
            ->assertDontSee('Militär')->assertDontSee('Allianz-Highscore')
            ->assertSee('data-social-action="chat"', false)->assertSee('data-social-action="request"', false)
            ->assertDontSee('icon_chat')->assertDontSee('js_openChat');
    }

    public function testLiveHighscoreUsesTheCorrectPageForRankOneHundredEvenViaAjaxCategoryLinks(): void
    {
        $this->mock(HighscoreService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('setHighscoreType')->once()->with(0);
            $mock->shouldReceive('getHighscorePlayerAmount')->once()->andReturn(200);
            $mock->shouldReceive('getHighscorePlayerRank')->once()->andReturn(100);
            $mock->shouldReceive('getHighscorePlayers')->once()->with(100, 1)->andReturn([]);
        });
        $this->post('/ajax/highscore?ui=live3d', ['_token' => csrf_token(), 'category' => 2, 'type' => 2])
            ->assertOk()->assertSee('class="social-table social-ranking"', false)->assertSee('Seite 1 von 2');
    }

    public function testLiveHighscoreClampsInvalidPagesAndClassicCategoriesStillExist(): void
    {
        $this->get('/highscore?ui=live3d&page=-50')->assertOk()->assertSee('Seite 1 von 1');
        $this->get('/highscore?ui=live3d&page=999999')->assertOk()->assertSee('Seite 1 von 1');
        $this->get('/highscore')->assertOk()->assertViewIs('ingame.highscore.index');
    }

    public function testFriendListUsesNamedActionsAndRetainsRequestsAndIgnoredPlayers(): void
    {
        $other = $this->createForeignPlanet()->getPlayer();
        $this->assertNotNull($other);
        $buddies = resolve(BuddyService::class);
        $friendship = $buddies->sendRequest($this->currentUserId, $other->getId());
        $buddies->acceptRequest($friendship->id, $other->getId());
        $sender = User::factory()->create();
        $request = $buddies->sendRequest($sender->id, $this->currentUserId, '<script>no markup</script>');
        $ignored = User::factory()->create();
        $buddies->ignorePlayer($this->currentUserId, $ignored->id);

        $this->get('/buddies?ui=live3d')->assertOk()->assertSee('class="social-table social-friends"', false)
            ->assertSee($other->getUsername())->assertSee('Freund entfernen')->assertSee('Nachricht')
            ->assertSee('Annehmen')->assertSee('Ablehnen')->assertSee('Ignorierung aufheben')
            ->assertSee($ignored->username)->assertSee('&lt;script&gt;no markup&lt;/script&gt;', false)
            ->assertDontSee('<script>no markup</script>', false)->assertDontSee('icon_trash');
        $this->assertDatabaseHas('buddy_requests', ['id' => $request->id, 'viewed' => true]);
    }

    public function testAcceptAndRemoveUseOriginalOwnershipRulesAndReturnJsonToLiveUi(): void
    {
        $other = User::factory()->create();
        $service = resolve(BuddyService::class);
        $request = $service->sendRequest($other->id, $this->currentUserId);
        $this->postJson('/buddies?ui=live3d', ['_token' => csrf_token(), 'ajax' => 1, 'action' => 5, 'id' => $request->id])->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('buddy_requests', ['id' => $request->id, 'status' => BuddyRequest::STATUS_ACCEPTED]);
        $this->postJson('/buddies?ui=live3d', ['_token' => csrf_token(), 'ajax' => 1, 'action' => 10, 'id' => $other->id])->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseMissing('buddy_requests', ['id' => $request->id]);

        $stranger = User::factory()->create();
        $foreign = $service->sendRequest($other->id, $stranger->id);
        $this->postJson('/buddies?ui=live3d', ['_token' => csrf_token(), 'ajax' => 1, 'action' => 5, 'id' => $foreign->id])->assertStatus(400)->assertJsonPath('success', false);
        $this->assertDatabaseHas('buddy_requests', ['id' => $foreign->id, 'status' => BuddyRequest::STATUS_PENDING]);
    }

    public function testSearchAndOutgoingRequestsStayInTheNewInterface(): void
    {
        $target = User::factory()->create(['username' => 'SocialSearchTarget']);
        $this->get('/buddies?ui=live3d&q=SocialSearchTarget')->assertOk()->assertSee($target->username)->assertSee('data-social-action="request"', false);
        $this->postJson('/buddies/send-request?ui=live3d', ['_token' => csrf_token(), 'receiver_id' => $target->id, 'message' => 'Hallo'])->assertOk()->assertJsonPath('success', true);
        $this->get('/buddies?ui=live3d')->assertOk()->assertSee('Versendete Anfragen')->assertSee('Zurückziehen');
        $this->postJson('/buddies/send-request?ui=live3d', ['_token' => csrf_token(), 'receiver_id' => $target->id])->assertStatus(400);
        $this->get('/buddies')->assertOk()->assertViewIs('ingame.buddies.index');
    }
}
