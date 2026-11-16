<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OGame\Models\BuildingQueue;
use OGame\Models\ResearchQueue;
use OGame\Models\Resources;
use OGame\Models\UnitQueue;
use OGame\Models\User;
use OGame\Services\PremiumCatalog;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\IsolatedAccountTestCase;

class QueueTimeCreditTest extends IsolatedAccountTestCase
{
    public static function defenseProducts(): array
    {
        return [['detroid_bronze'], ['detroid_silver'], ['detroid_gold']];
    }

    #[DataProvider('defenseProducts')]
    public function testDetroidCompletesAQueueContainingOnlyRocketLaunchers(string $product): void
    {
        $this->prepareWorld();
        for ($i = 0; $i < 3; $i++) {
            $this->order('defense', 401);
        }
        $this->postJson('/shop/activate', $this->buy($product))->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'rocket_launcher' => 3]);
        $this->assertSame(3, UnitQueue::where('planet_id', $this->currentPlanetId)->where('object_id', 401)->where('processed', 1)->count());
        $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk()->assertJsonPath('defenseTotal', '3');
    }

    public function testDetroidShortensALargeRocketLauncherOrderAndGrantsCompletedUnitsExactlyOnce(): void
    {
        $this->prepareWorld();
        $this->order('defense', 401, 1000);
        $item = UnitQueue::where('planet_id', $this->currentPlanetId)->firstOrFail();
        $perUnit = $item->time_duration / 1000;
        $activation = $this->buy('detroid_bronze', 2);
        $this->postJson('/shop/activate', $activation)->assertOk()->assertJsonPath('effect.seconds', 1800);
        $this->assertSame($item->time_end - 1800, $item->fresh()?->time_end);
        $expected = (int)floor(1800 / $perUnit);
        $this->assertGreaterThan(0, $expected);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'rocket_launcher' => $expected]);
        $this->postJson('/shop/activate', $activation)->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'rocket_launcher' => $expected]);
        $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk()->assertJsonPath('defenseTotal', (string)$expected);
    }

    public function testAnExpiredFutureStartOrderIsSettledBeforeDetroidAndDoesNotConsumeInventory(): void
    {
        $this->prepareWorld();
        $this->order('defense', 401, 10);
        $this->order('defense', 401, 20);
        $this->order('ship', 204, 3);
        $activation = $this->buy('detroid_bronze');
        // Reproduce records left by the former admin finish action: the end
        // is already due while later orders still have a future start.
        UnitQueue::where('planet_id', $this->currentPlanetId)->update(['time_end' => (int)Date::now()->timestamp]);
        $this->postJson('/shop/activate', $activation)->assertUnprocessable();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'rocket_launcher' => 30, 'light_fighter' => 3]);
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => 'detroid_bronze', 'quantity' => 1]);
        $this->assertSame(0, UnitQueue::where('planet_id', $this->currentPlanetId)->where('processed', 0)->count());
    }

    public function testAlreadyGrantedUnitsInAnExpiredRecordAreNotGrantedTwice(): void
    {
        $this->prepareWorld();
        $this->order('defense', 401, 10);
        $item = UnitQueue::where('planet_id', $this->currentPlanetId)->firstOrFail();
        $item->time_end = (int)Date::now()->timestamp;
        $item->object_amount_progress = 10;
        $item->save();
        DB::table('planets')->where('id', $this->currentPlanetId)->update(['rocket_launcher' => 10]);
        $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk()->assertJsonPath('defenseTotal', '10');
        $this->assertSame(1, $item->refresh()->processed);
        $this->getJson('/play-3d/state?planet='.$this->currentPlanetId)->assertOk()->assertJsonPath('defenseTotal', '10');
    }

    public static function products(): array
    {
        $cases = [];
        foreach (['kraken', 'newtron', 'detroid'] as $kind) {
            foreach (['bronze', 'silver', 'gold'] as $tier) {
                $cases[$kind.'_'.$tier] = [$kind.'_'.$tier, $kind];
            }
        }
        return $cases;
    }

    #[DataProvider('products')]
    public function testEveryBoosterTierCompletesThreeQueuedOrdersAndCannotReplay(string $product, string $kind): void
    {
        $this->prepareWorld();
        for ($i = 0; $i < 3; $i++) {
            $this->order(match ($kind) {
                'kraken' => 'build', 'newtron' => 'research', default => 'ship'
            }, match ($kind) {
                'kraken' => 1, 'newtron' => 113, default => 204
            });
        }
        $activation = $this->buy($product, 2);
        $this->postJson('/shop/activate', $activation)->assertOk();
        if ($kind === 'kraken') {
            $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'metal_mine' => 3]);
            $this->assertSame(3, BuildingQueue::where('planet_id', $this->currentPlanetId)->where('processed', 1)->count());
        } elseif ($kind === 'newtron') {
            $this->assertDatabaseHas('users_tech', ['user_id' => $this->currentUserId, 'energy_technology' => 3]);
            $this->assertSame(3, ResearchQueue::where('planet_id', $this->currentPlanetId)->where('processed', 1)->count());
        } else {
            $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => 3]);
            $this->assertSame(3, UnitQueue::where('planet_id', $this->currentPlanetId)->where('processed', 1)->count());
        }
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => $product, 'quantity' => 1]);
        $this->postJson('/shop/activate', $activation)->assertOk();
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => $product, 'quantity' => 1]);
        $this->postJson('/shop/activate', [...$activation, 'request_id' => (string)Str::uuid()])->assertUnprocessable();
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => $product, 'quantity' => 1]);
    }

    public function testBuildingCreditUsesOnlySixMinutesThenPartiallyAcceleratesTheNextOrderAndPaysItsCost(): void
    {
        $this->prepareWorld();
        $this->planetSetObjectLevel('metal_mine', 15);
        for ($i = 0; $i < 3; $i++) {
            $this->order('build', 1);
        }
        $items = BuildingQueue::where('planet_id', $this->currentPlanetId)->orderBy('id')->get()->all();
        $items[0]->time_end = (int)Date::now()->timestamp + 360;
        $items[0]->save();
        $this->planetService->reloadPlanet();
        $before = $this->planetService->metal()->get();
        $this->postJson('/shop/activate', $this->buy('kraken_bronze'))->assertOk();
        $second = $items[1]->refresh();
        $third = $items[2]->refresh();
        $this->assertGreaterThan(1440, $second->time_duration);
        $this->assertSame(1, $items[0]->refresh()->processed);
        $this->assertSame(1, $second->building);
        $this->assertSame(0, $second->processed);
        $this->assertSame((int)Date::now()->timestamp + $second->time_duration - 1440, $second->time_end);
        $this->assertSame(0, $third->building);
        $this->assertSame(0, $third->time_start);
        $this->planetService->reloadPlanet();
        $this->assertEqualsWithDelta($before - $second->metal, $this->planetService->metal()->get(), .001);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'metal_mine' => 16]);
    }

    public function testNewtronCarriesCreditAcrossPlanetsAndLeavesTheSecondResearchPartiallyComplete(): void
    {
        $this->prepareWorld();
        $this->playerSetResearchLevel('energy_technology', 5);
        $world = $this->secondPlanetService;
        $this->assertNotNull($world);
        $world->setObjectLevel(31, 3);
        $world->addResources(new Resources(10000000, 10000000, 10000000));
        for ($i = 0; $i < 3; $i++) {
            $this->order('research', 113, 1, $i === 1 ? $world->getPlanetId() : null);
        }
        $items = ResearchQueue::whereIn('planet_id', [$this->currentPlanetId, $world->getPlanetId()])->orderBy('id')->get()->all();
        $items[0]->time_end = (int)Date::now()->timestamp + 360;
        $items[0]->save();
        $this->postJson('/shop/activate', $this->buy('newtron_bronze'))->assertOk();
        $second = $items[1]->refresh();
        $this->assertSame(1, $items[0]->refresh()->processed);
        $this->assertSame(1, $second->building);
        $this->assertSame(0, $second->processed);
        $this->assertGreaterThan(1440, $second->time_duration);
        $this->assertSame((int)Date::now()->timestamp + $second->time_duration - 1440, $second->time_end);
        $this->assertSame(0, $items[2]->refresh()->building);
        $this->assertDatabaseHas('users_tech', ['user_id' => $this->currentUserId, 'energy_technology' => 6]);
    }

    public function testCreditCannotCompleteAnUnpaidFollowUpOrAffectAnotherWorldOrFutureOrders(): void
    {
        $this->prepareWorld();
        $this->order('build', 1);
        $this->order('build', 1);
        $world = $this->secondPlanetService;
        $this->assertNotNull($world);
        $world->addResources(new Resources(10000, 10000, 10000));
        $this->order('build', 1, 1, $world->getPlanetId());
        $other = BuildingQueue::where('planet_id', $world->getPlanetId())->firstOrFail();
        $otherEnd = $other->time_end;
        $items = BuildingQueue::where('planet_id', $this->currentPlanetId)->orderBy('id')->get()->all();
        DB::table('planets')->where('id', $this->currentPlanetId)->update(['metal' => 0, 'crystal' => 0, 'deuterium' => 0]);
        $this->postJson('/shop/activate', $this->buy('kraken_gold'))->assertOk();
        $this->assertSame(1, $items[0]->refresh()->processed);
        $this->assertSame(1, $items[1]->refresh()->canceled);
        $this->assertSame(0, $items[1]->processed);
        $this->assertSame($otherEnd, $other->refresh()->time_end);
        $this->planetService->reloadPlanet();
        $this->planetService->addResources(new Resources(10000, 10000, 10000));
        $this->order('build', 1);
        $future = BuildingQueue::where('planet_id', $this->currentPlanetId)->where('processed', 0)->where('canceled', 0)->firstOrFail();
        $this->assertSame(1, $future->building);
        $this->assertGreaterThan((int)Date::now()->timestamp, $future->time_end);
    }

    public function testAnExactBudgetStartsTheNextBuildingWithoutGivingItExtraTime(): void
    {
        $this->prepareWorld();
        $this->planetSetObjectLevel('metal_mine', 15);
        $this->order('build', 1);
        $this->order('build', 1);
        [$first, $second] = BuildingQueue::where('planet_id', $this->currentPlanetId)->orderBy('id')->get()->all();
        $first->time_end = (int)Date::now()->timestamp + 1800;
        $first->save();
        $this->postJson('/shop/activate', $this->buy('kraken_bronze'))->assertOk();
        $this->assertSame(1, $first->refresh()->processed);
        $second->refresh();
        $this->assertSame(1, $second->building);
        $this->assertSame(0, $second->processed);
        $this->assertSame((int)Date::now()->timestamp + $second->time_duration, $second->time_end);
    }

    public function testDetroidCompletesOneBatchThenPartOfTheNextWithoutDuplicatingProducedShips(): void
    {
        $this->prepareWorld();
        $this->order('ship', 204, 3);
        $this->order('ship', 204, 100);
        $this->order('defense', 401, 10);
        [$first, $second, $third] = UnitQueue::where('planet_id', $this->currentPlanetId)->orderBy('id')->get()->all();
        $perUnit = ($first->time_end - $first->time_start) / 3;
        $this->travel((int)$perUnit)->seconds();
        $activation = $this->buy('detroid_bronze', 2);
        $this->postJson('/shop/activate', $activation)->assertOk();
        $expectedSecond = (int)floor((1800 - 2 * $perUnit) / $perUnit);
        $this->assertGreaterThan(0, $expectedSecond);
        $this->assertLessThan(100, $expectedSecond);
        $this->assertSame(1, $first->refresh()->processed);
        $this->assertSame($expectedSecond, $second->refresh()->object_amount_progress);
        $this->assertSame(0, $third->refresh()->object_amount_progress);
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => 3 + $expectedSecond, 'rocket_launcher' => 0]);
        $this->postJson('/shop/activate', $activation)->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => 3 + $expectedSecond]);
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => 'detroid_bronze', 'quantity' => 1]);
    }

    private function prepareWorld(): void
    {
        User::whereKey($this->currentUserId)->update(['dark_matter' => 200000]);
        $this->planetService->getPlayer()?->refreshUser();
        $this->planetAddResources(new Resources(100000000, 100000000, 100000000));
        $this->planetSetObjectLevel('research_lab', 12);
        $this->planetSetObjectLevel('shipyard', 3);
        $this->playerSetResearchLevel('combustion_drive', 2);
    }

    private function buy(string $key, int $quantity = 1): array
    {
        $this->postJson('/shop/purchase', ['_token' => csrf_token(), 'product' => $key, 'quantity' => $quantity, 'expected_price' => resolve(PremiumCatalog::class)->product($key)['price'], 'request_id' => (string)Str::uuid()])->assertOk();
        return ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'product' => $key, 'request_id' => (string)Str::uuid()];
    }

    private function order(string $action, int $objectId, int $amount = 1, int|null $planetId = null): void
    {
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $planetId ?? $this->currentPlanetId, 'action' => $action, 'technologyId' => $objectId, 'amount' => $amount])->assertOk()->assertJsonPath('status', 'success');
    }
}
