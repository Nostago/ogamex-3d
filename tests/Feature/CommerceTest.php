<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OGame\Models\BuildingQueue;
use OGame\Models\OfficerContract;
use OGame\Models\Resources;
use OGame\Models\UnitQueue;
use OGame\Models\User;
use OGame\Services\PlayerService;
use OGame\Services\PremiumCatalog;
use OGame\Services\PremiumService;
use Tests\IsolatedAccountTestCase;

class CommerceTest extends IsolatedAccountTestCase
{
    public function testPurchaseUsesDarkMatterPersistsInventoryAndReplaysWithoutDoubleCharge(): void
    {
        $this->fund();
        $payload = $this->purchase('kraken_bronze', 2);
        $this->postJson('/shop/purchase', $payload)->assertOk()->assertJsonPath('darkMatter', 198600);
        $this->postJson('/shop/purchase', $payload)->assertOk();
        $this->assertDatabaseHas('users', ['id' => $this->currentUserId, 'dark_matter' => 198600]);
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => 'kraken_bronze', 'quantity' => 2]);
        $this->assertSame(1, DB::table('premium_orders')->where('user_id', $this->currentUserId)->count());
        $this->postJson('/shop/purchase', [...$payload, 'quantity' => 3])->assertUnprocessable();
        $this->get('/shop?ui=live3d&inventory=1')->assertOk()->assertSee('Kraken')->assertSee('Inventar');
    }

    public function testInsufficientBalanceInvalidProductTokenAndChangedPriceDoNotBuyItems(): void
    {
        User::whereKey($this->currentUserId)->update(['dark_matter' => 0]);
        $this->player()->refreshUser();
        $this->postJson('/shop/purchase', $this->purchase('kraken_gold'))->assertUnprocessable();
        $this->fund();
        $this->postJson('/shop/purchase', [...$this->purchase('kraken_gold'), 'expected_price' => 1])->assertUnprocessable();
        $this->postJson('/shop/purchase', [...$this->purchase('kraken_gold'), '_token' => 'invalid'])->assertStatus(419);
        $this->postJson('/shop/purchase', [...$this->purchase('kraken_gold'), 'product' => 'not-real'])->assertUnprocessable();
        $this->postJson('/shop/purchase', [...$this->purchase('kraken_gold'), 'quantity' => -1])->assertUnprocessable();
        $this->assertSame(0, DB::table('player_items')->where('user_id', $this->currentUserId)->count());
    }

    public function testOnlyAdministratorsCanChangePricesAndSavedPricesAreUsedForPurchases(): void
    {
        $prices = array_map(fn ($product) => $product['price'], resolve(PremiumCatalog::class)->products());
        $prices['kraken_bronze'] = 123;
        $data = ['_token' => csrf_token(), 'prices' => $prices];
        $this->get('/admin/premium-prices')->assertRedirect('/overview');
        $this->post('/admin/premium-prices', $data)->assertRedirect('/overview');
        Auth::user()?->assignRole('admin');
        $this->get('/admin/premium-prices?ui=live3d')->assertOk()->assertSee('Dunkler Materie');
        $this->post('/admin/premium-prices', $data)->assertRedirect();
        $this->assertDatabaseHas('settings', ['key' => 'premium_price_kraken_bronze', 'value' => '123']);
        $this->fund();
        $payload = $this->purchase('kraken_bronze');
        $this->postJson('/shop/purchase', [...$payload, 'expected_price' => 700])->assertUnprocessable();
        $this->postJson('/shop/purchase', [...$payload, 'expected_price' => 123])->assertOk()->assertJsonPath('darkMatter', 199877);
        $this->post('/admin/premium-prices', ['_token' => csrf_token(), 'prices' => [...$prices, 'kraken_bronze' => -1]])->assertSessionHasErrors();
        $this->assertDatabaseHas('settings', ['key' => 'premium_price_kraken_bronze', 'value' => '123']);
    }

    public function testActivationRequiresAnOwnedWorldAndActiveOrderAndDoesNotWasteInventory(): void
    {
        $this->fund();
        $this->postJson('/shop/purchase', $this->purchase('kraken_gold'))->assertOk();
        $activate = ['_token' => csrf_token(), 'product' => 'kraken_gold', 'planet' => $this->currentPlanetId, 'request_id' => (string)Str::uuid()];
        $this->postJson('/shop/activate', $activate)->assertUnprocessable();
        $foreign = $this->createForeignPlanet();
        $this->postJson('/shop/activate', [...$activate, 'planet' => $foreign->getPlanetId()])->assertNotFound();
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => 'kraken_gold', 'quantity' => 1]);
        $this->planetAddResources(new Resources(1000000, 1000000, 1000000, 0));
        $this->planetSetObjectLevel('metal_mine', 1);
        $this->order('build', 1);
        $this->postJson('/shop/activate', $activate)->assertOk();
        $this->postJson('/shop/activate', $activate)->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'metal_mine' => 2]);
        $this->assertDatabaseHas('player_items', ['user_id' => $this->currentUserId, 'item_key' => 'kraken_gold', 'quantity' => 0]);
    }

    public function testOfficersExtendExpireAndChangeOriginalFleetResearchEspionageAndProduction(): void
    {
        $this->fund();
        $player = $this->player();
        $beforeSlots = $player->getFleetSlotsMax();
        $beforeExpeditions = $player->getExpeditionSlotsMax();
        $beforeSpy = $player->getEffectiveEspionageLevel();
        $this->planetSetObjectLevel('research_lab', 3);
        $beforeResearch = $this->planetService->getTechnologyResearchTime('energy_technology');
        foreach (['commander', 'admiral', 'engineer', 'geologist', 'technocrat'] as $officer) {
            $product = resolve(PremiumCatalog::class)->product($officer.'_7');
            resolve(PremiumService::class)->purchase($player, $officer.'_7', 1, $product['price'], (string)Str::uuid());
        }
        $this->assertTrue($player->hasCommandingStaff());
        $this->assertSame($beforeSlots + 3, $player->getFleetSlotsMax());
        $this->assertSame($beforeExpeditions + 1, $player->getExpeditionSlotsMax());
        $this->assertSame($beforeSpy + 3, $player->getEffectiveEspionageLevel());
        $this->assertSame((float)max(1, (int)($beforeResearch * .75)), $this->planetService->getTechnologyResearchTime('energy_technology'));
        $firstExpiry = $player->officerContracts()['engineer'];
        resolve(PremiumService::class)->purchase($player, 'engineer_7', 1, 2500, (string)Str::uuid());
        $this->assertSame($firstExpiry + 7 * 86400, $player->officerContracts()['engineer']);
        $this->travelTo(Date::createFromTimestamp($firstExpiry));
        $this->assertFalse($player->hasAdmiral());
        $this->assertTrue($player->hasEngineer());
        $this->assertFalse($player->hasCommandingStaff());
        $this->assertSame($beforeSlots, $player->getFleetSlotsMax());
        $this->assertSame($beforeSpy, $player->getEffectiveEspionageLevel());
    }

    public function testOfflineProductionStopsTheGeologistBonusExactlyAtExpiry(): void
    {
        $player = $this->player();
        $this->planetSetObjectLevel('metal_mine', 3);
        $this->planetSetObjectLevel('solar_plant', 15);
        $this->planetSetObjectLevel('metal_store', 10);
        $this->planetService->update();
        $normal = $this->planetService->getMetalProductionPerHour();
        OfficerContract::create(['user_id' => $this->currentUserId, 'officer' => 'geologist', 'expires_at' => Date::now()->addHour()]);
        $player->resetOfficerContracts();
        $this->planetService->updateResourceProductionStats();
        $boosted = $this->planetService->getMetalProductionPerHour();
        $this->assertGreaterThan($normal, $boosted);
        $before = $this->planetService->metal()->get();
        $this->travel(1)->hours();
        $this->planetService->updateResourcesUntil((int)Date::now()->timestamp);
        $this->planetService->reloadPlanet();
        $this->assertEqualsWithDelta($before + $boosted, $this->planetService->metal()->get(), 1);
        $this->travel(1)->hours();
        $this->planetService->update();
        $this->assertEqualsWithDelta($before + $boosted + $normal, $this->planetService->metal()->get(), 1);
    }

    public function testAdminFinishesOwnFollowUpOrdersAndResearchAndUnitsThroughOriginalProcessors(): void
    {
        $this->fund();
        $this->planetAddResources(new Resources(10000000, 10000000, 10000000, 0));
        $this->planetSetObjectLevel('metal_mine', 1);
        $this->planetSetObjectLevel('research_lab', 3);
        $this->planetSetObjectLevel('shipyard', 3);
        $this->playerSetResearchLevel('combustion_drive', 2);
        $this->order('build', 1);
        $this->order('build', 1);
        $this->order('research', 113);
        $this->order('ship', 204, 7);
        $data = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => 'finish-orders'];
        $this->postJson('/play-3d/admin/command', $data)->assertForbidden();
        Auth::user()?->assignRole('admin');
        $foreign = $this->createForeignPlanet();
        $this->postJson('/play-3d/admin/command', [...$data, 'planet' => $foreign->getPlanetId()])->assertNotFound();
        $this->postJson('/play-3d/admin/command', $data)->assertOk();
        $this->postJson('/play-3d/admin/command', $data)->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'metal_mine' => 3, 'light_fighter' => 7]);
        $this->assertDatabaseHas('users_tech', ['user_id' => $this->currentUserId, 'energy_technology' => 1]);
        $this->assertSame(0, BuildingQueue::where('planet_id', $this->currentPlanetId)->where('processed', 0)->where('canceled', 0)->count());
    }

    public function testDetroidAdvancesPartialUnitProductionWithoutDuplicatingAlreadyCompletedShips(): void
    {
        $this->fund();
        $this->planetAddResources(new Resources(10000000, 10000000, 10000000, 0));
        $this->planetSetObjectLevel('shipyard', 3);
        $this->playerSetResearchLevel('combustion_drive', 2);
        $this->order('ship', 204, 100);
        $queue = UnitQueue::where('planet_id', $this->currentPlanetId)->where('processed', 0)->firstOrFail();
        $perUnit = ($queue->time_end - $queue->time_start) / $queue->object_amount;
        $this->travel((int)($perUnit * 2.5))->seconds();
        $this->planetService->update();
        $this->postJson('/shop/purchase', $this->purchase('detroid_bronze'))->assertOk();
        $data = ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'product' => 'detroid_bronze', 'request_id' => (string)Str::uuid()];
        $this->postJson('/shop/activate', $data)->assertOk();
        $expected = min(100, (int)floor(((int)Date::now()->timestamp - $queue->time_start + 1800) / $perUnit));
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => $expected]);
        $this->postJson('/shop/activate', $data)->assertOk();
        $this->assertDatabaseHas('planets', ['id' => $this->currentPlanetId, 'light_fighter' => $expected]);
    }

    public function testNewtronUsesOnlyTheOwnersGlobalActiveResearch(): void
    {
        $this->fund();
        $this->assertNotNull($this->secondPlanetService);
        $world = $this->secondPlanetService;
        $world->setObjectLevel(31, 3);
        $world->addResources(new Resources(100000, 100000, 100000, 0));
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $world->getPlanetId(), 'action' => 'research', 'technologyId' => 113])->assertOk()->assertJsonPath('status', 'success');
        $this->postJson('/shop/purchase', $this->purchase('newtron_gold'))->assertOk();
        $this->postJson('/shop/activate', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'product' => 'newtron_gold', 'request_id' => (string)Str::uuid()])->assertOk();
        $this->assertDatabaseHas('users_tech', ['user_id' => $this->currentUserId, 'energy_technology' => 1]);
    }

    private function player(): PlayerService
    {
        $player = $this->planetService->getPlayer();
        $this->assertNotNull($player);
        return $player;
    }

    private function fund(): void
    {
        User::whereKey($this->currentUserId)->update(['dark_matter' => 200000]);
        $this->player()->refreshUser();
    }

    /** @return array<string, mixed> */
    private function purchase(string $key, int $quantity = 1): array
    {
        return ['_token' => csrf_token(), 'product' => $key, 'quantity' => $quantity, 'expected_price' => resolve(PremiumCatalog::class)->product($key)['price'], 'request_id' => (string)Str::uuid()];
    }

    private function order(string $action, int $object, int $amount = 1): void
    {
        $this->postJson('/play-3d/command', ['_token' => csrf_token(), 'planet' => $this->currentPlanetId, 'action' => $action, 'technologyId' => $object, 'amount' => $amount])->assertOk()->assertJsonPath('status', 'success');
    }
}
