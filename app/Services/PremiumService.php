<?php

namespace OGame\Services;

use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OGame\Enums\DarkMatterTransactionType;
use OGame\Models\OfficerContract;
use OGame\Models\User;

class PremiumService
{
    public function __construct(private PremiumCatalog $catalog, private QueueAccelerationService $queues)
    {
    }

    /** @return array<string, int> */
    public function inventory(PlayerService $player): array
    {
        return DB::table('player_items')->where('user_id', $player->getId())->pluck('quantity', 'item_key')->map(fn ($quantity): int => (int)$quantity)->all();
    }

    public function purchase(PlayerService $player, string $key, int $quantity, int $quotedPrice, string $requestId): void
    {
        DB::transaction(function () use ($player, $key, $quantity, $quotedPrice, $requestId) {
            $user = User::whereKey($player->getId())->lockForUpdate()->firstOrFail();
            if ($this->replayed($player, $requestId, 'purchase', $key, $quantity, null)) {
                $player->refreshUser();
                return;
            }
            $product = $this->catalog->product($key);
            if ($quotedPrice !== $product['price']) {
                throw ValidationException::withMessages(['product' => __('t_commerce.price_changed')]);
            }
            if ($product['kind'] === 'officer' && $quantity !== 1) {
                throw ValidationException::withMessages(['quantity' => __('t_commerce.officer_quantity')]);
            }
            $total = $product['price'] * $quantity;
            if ($user->dark_matter < $total) {
                throw ValidationException::withMessages(['product' => __('t_commerce.insufficient_matter')]);
            }
            if ($product['kind'] === 'officer') {
                // Settle the old production before changing any bonuses, on every owned world.
                foreach ($player->planets->all() as $planet) {
                    $planet->update();
                }
            }
            resolve(DarkMatterService::class)->debit($user, $total, $product['kind'] === 'officer' ? DarkMatterTransactionType::COMMANDING_STAFF->value : DarkMatterTransactionType::SHOP_PURCHASE->value, 'Premium purchase: '.$key.' x '.$quantity);
            if ($product['kind'] === 'item') {
                DB::table('player_items')->insertOrIgnore(['user_id' => $user->id, 'item_key' => $key, 'quantity' => 0, 'created_at' => Date::now(), 'updated_at' => Date::now()]);
                DB::table('player_items')->where('user_id', $user->id)->where('item_key', $key)->increment('quantity', $quantity, ['updated_at' => Date::now()]);
            } else {
                $contract = OfficerContract::firstOrNew(['user_id' => $user->id, 'officer' => $product['officer']]);
                $from = max((int)Date::now()->timestamp, $contract->exists ? (int)$contract->expires_at->timestamp : 0);
                $contract->expires_at = Date::createFromTimestamp($from)->addDays($product['days']);
                $contract->save();
                $player->resetOfficerContracts();
                foreach ($player->planets->all() as $planet) {
                    $planet->updateResourceProductionStats();
                }
            }
            $this->record($player, $requestId, 'purchase', $key, $quantity, $total, null);
            $player->refreshUser();
        }, 3);
    }

    public function activate(PlayerService $player, PlanetService $planet, string $key, string $requestId): void
    {
        DB::transaction(function () use ($player, $planet, $key, $requestId) {
            User::whereKey($player->getId())->lockForUpdate()->firstOrFail();
            if ($this->replayed($player, $requestId, 'activate', $key, 1, $planet->getPlanetId())) {
                $player->refreshUser();
                return;
            }
            $product = $this->catalog->product($key);
            if ($product['kind'] !== 'item' || $player->isInVacationMode()) {
                throw ValidationException::withMessages(['product' => __('t_commerce.activation_unavailable')]);
            }
            $stock = DB::table('player_items')->where('user_id', $player->getId())->where('item_key', $key)->lockForUpdate()->value('quantity');
            if ((int)$stock < 1) {
                throw ValidationException::withMessages(['product' => __('t_commerce.no_inventory')]);
            }
            if ($product['queue'] === 'research') {
                foreach ($player->planets->all() as $world) {
                    $world->update();
                }
            } else {
                $planet->update();
            }
            $player->updateResearchQueue();
            $this->queues->useItem($player, $planet, $product['queue'], $product['seconds']);
            DB::table('player_items')->where('user_id', $player->getId())->where('item_key', $key)->decrement('quantity', 1, ['updated_at' => Date::now()]);
            $this->record($player, $requestId, 'activate', $key, 1, 0, $planet->getPlanetId());
        }, 3);
    }

    private function replayed(PlayerService $player, string $requestId, string $action, string $key, int $quantity, int|null $planetId): bool
    {
        $previous = DB::table('premium_orders')->where('user_id', $player->getId())->where('request_id', $requestId)->first();
        if (!$previous) {
            return false;
        }
        if ($previous->action !== $action || $previous->product_key !== $key || (int)$previous->quantity !== $quantity || ($previous->planet_id === null ? null : (int)$previous->planet_id) !== $planetId) {
            throw ValidationException::withMessages(['request_id' => __('t_commerce.request_reused')]);
        }
        return true;
    }

    private function record(PlayerService $player, string $requestId, string $action, string $key, int $quantity, int $price, int|null $planetId): void
    {
        DB::table('premium_orders')->insert(['user_id' => $player->getId(), 'request_id' => $requestId, 'action' => $action, 'product_key' => $key, 'quantity' => $quantity, 'price' => $price, 'planet_id' => $planetId, 'created_at' => Date::now(), 'updated_at' => Date::now()]);
    }
}
