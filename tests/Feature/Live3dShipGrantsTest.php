<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OGame\Factories\PlanetServiceFactory;
use OGame\Models\AdminShipGrant;
use Tests\IsolatedAccountTestCase;

class Live3dShipGrantsTest extends IsolatedAccountTestCase
{
    public function testOnlyAdministratorsCanSearchInspectAndGrantShips(): void
    {
        $owner = $this->createForeignPlanet()->getPlayer();
        $this->assertNotNull($owner);
        $this->getJson('/play-3d/admin/ship-grants/players?q=abc')->assertForbidden();
        $this->getJson('/play-3d/admin/ship-grants/players/'.$owner->getId())->assertForbidden();
        $this->postJson('/play-3d/admin/ship-grants', $this->body($owner->getId(), $this->currentPlanetId))->assertForbidden();
        $this->admin();
        $this->getJson('/play-3d/admin/ship-grants/players?q='.$owner->getId())->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        Auth::logout();
        $this->getJson('/play-3d/admin/ship-grants/players?q=abc')->assertUnauthorized();
    }

    public function testGrantAddsToTheForeignPlanetAndRecordsOnlyOneReceiptForRetries(): void
    {
        $this->admin();
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        $target->addUnit('light_fighter', 7);
        $before = DB::table('planets')->where('id', $target->getPlanetId())->first();
        $this->assertNotNull($before);
        $adminCount = $this->planetService->getObjectAmount('light_fighter');
        $body = $this->body($owner->getId(), $target->getPlanetId());
        $reply = $this->postJson('/play-3d/admin/ship-grants', $body)->assertCreated()->assertJsonPath('grant.before', '7')->assertJsonPath('grant.after', '12');
        $this->postJson('/play-3d/admin/ship-grants', $body)->assertOk()->assertJsonPath('replayed', true)->assertJsonPath('grant.id', $reply->json('grant.id'));
        $this->assertDatabaseHas('planets', ['id' => $target->getPlanetId(), 'light_fighter' => 12, 'metal' => $before->metal, 'crystal' => $before->crystal, 'deuterium' => $before->deuterium]);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => $adminCount]);
        $this->assertSame(1, AdminShipGrant::query()->count());
        $this->assertDatabaseHas('admin_ship_grants', ['admin_id' => $this->currentUserId, 'user_id' => $owner->getId(), 'planet_id' => $target->getPlanetId(), 'reason' => 'Replacement']);
        $this->postJson('/play-3d/admin/ship-grants', [...$body, 'amount' => 6])->assertConflict();
        $this->assertDatabaseHas('planets', ['id' => $target->getPlanetId(), 'light_fighter' => 12]);
    }

    public function testWorldSelectionDistinguishesPlanetFromMoonAndOmitsDestroyedWorlds(): void
    {
        $this->admin();
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        $moon = resolve(PlanetServiceFactory::class)->createMoonForPlanet($target, 2000000, 20);
        $response = $this->getJson('/play-3d/admin/ship-grants/players/'.$owner->getId())->assertOk();
        $this->assertCount(2, $response->json('worlds'));
        $this->postJson('/play-3d/admin/ship-grants', $this->body($owner->getId(), $moon->getPlanetId()))->assertCreated()->assertJsonPath('grant.type', 3);
        $this->assertDatabaseHas('planets', ['id' => $moon->getPlanetId(), 'light_fighter' => 5]);
        $this->assertDatabaseHas('planets', ['id' => $target->getPlanetId(), 'light_fighter' => 0]);
        DB::table('planets')->where('id', $moon->getPlanetId())->update(['destroyed' => 1]);
        $this->postJson('/play-3d/admin/ship-grants', $this->body($owner->getId(), $moon->getPlanetId()))->assertConflict();
        $this->assertCount(1, $this->getJson('/play-3d/admin/ship-grants/players/'.$owner->getId())->json('worlds'));
    }

    public function testInvalidTargetsTokensAmountsAndNonShipObjectsAreRejected(): void
    {
        $this->admin();
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        $body = $this->body($owner->getId(), $target->getPlanetId());
        $this->postJson('/play-3d/admin/ship-grants', [...$body, '_token' => 'bad'])->assertStatus(419);
        $this->postJson('/play-3d/admin/ship-grants', [...$body, 'user_id' => $this->currentUserId])->assertConflict();
        foreach ([0, -1, 1.5, 1000000001] as $amount) {
            $this->postJson('/play-3d/admin/ship-grants', [...$body, 'amount' => $amount])->assertUnprocessable();
        }
        foreach ([1, 113, 401, 999] as $technology) {
            $this->postJson('/play-3d/admin/ship-grants', [...$body, 'technologyId' => $technology])->assertUnprocessable();
        }
        DB::table('planets')->where('id', $target->getPlanetId())->update(['light_fighter' => 2147483646]);
        $this->postJson('/play-3d/admin/ship-grants', $body)->assertUnprocessable();
        $this->assertSame(0, AdminShipGrant::query()->count());
        $this->assertDatabaseHas('planets', ['id' => $target->getPlanetId(), 'light_fighter' => 2147483646]);
    }

    public function testReceiptsRemainAvailableAndShipGrantsDoNotModifyProductionQueues(): void
    {
        $this->admin();
        $target = $this->createForeignPlanet();
        $owner = $target->getPlayer();
        $this->assertNotNull($owner);
        $queue = ['planet_id' => $target->getPlanetId(), 'object_id' => 204, 'object_amount' => 3, 'time_start' => now()->timestamp, 'time_end' => (int)now()->timestamp + 5000];
        $id = DB::table('unit_queues')->insertGetId($queue);
        $before = DB::table('unit_queues')->where('id', $id)->first();
        $this->postJson('/play-3d/admin/ship-grants', $this->body($owner->getId(), $target->getPlanetId()))->assertCreated();
        $this->assertEquals($before, DB::table('unit_queues')->where('id', $id)->first());
        $this->getJson('/play-3d/admin/ship-grants/players/'.$owner->getId())->assertOk()->assertJsonPath('history.0.reason', 'Replacement')->assertJsonPath('history.0.amount', '5');
    }

    private function admin(): void
    {
        $user = Auth::user();
        $this->assertNotNull($user);
        $user->assignRole('admin');
    }

    /** @return array<string, mixed> */
    private function body(int $user, int $planet): array
    {
        return ['_token' => csrf_token(), 'request_id' => (string)Str::uuid(), 'user_id' => $user, 'planet_id' => $planet, 'technologyId' => 204, 'amount' => 5, 'reason' => 'Replacement'];
    }
}
