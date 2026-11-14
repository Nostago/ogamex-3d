<?php

namespace OGame\Services;

use Illuminate\Validation\ValidationException;

/** Original shop catalogue; editable prices are read exclusively from administration settings. */
class PremiumCatalog
{
    /** @return array<string, array<string, mixed>> */
    public function products(): array
    {
        $products = [];
        foreach ($this->boosters() as $item) {
            $key = $item['name_key'].'_'.$item['tier_key'];
            $products[$key] = [...$item, 'key' => $key, 'kind' => 'item',
                'seconds' => match ($item['tier_key']) {
                    'gold' => 21600, 'silver' => 7200, default => 1800
                },
                'queue' => match ($item['name_key']) {
                    'kraken' => 'building', 'newtron' => 'research', default => 'unit'
                },
                'name' => __('t_resources.'.$item['name_key'].'.title').' · '.__('t_ingame.shop.tier_'.$item['tier_key']),
                'image' => '/img/icons/'.$item['image_hash'].'-100x.png'];
        }
        foreach (['commander' => 10000, 'admiral' => 10000, 'engineer' => 2500, 'geologist' => 12500, 'technocrat' => 10000] as $officer => $weeklyPrice) {
            foreach ([7 => $weeklyPrice, 90 => $weeklyPrice * 10] as $days => $price) {
                $key = $officer.'_'.$days;
                $products[$key] = ['key' => $key, 'kind' => 'officer', 'officer' => $officer, 'days' => $days, 'price' => $price,
                    'name' => __('t_commerce.'.$officer).' · '.$days.' '.__('t_commerce.days')];
            }
        }
        $settings = resolve(SettingsService::class);
        foreach ($products as $key => &$product) {
            $product['price'] = max(0, (int)$settings->get('premium_price_'.$key, $product['price']));
        }
        return $products;
    }

    /** @return array<string, mixed> */
    public function product(string $key): array
    {
        return $this->products()[$key] ?? throw ValidationException::withMessages(['product' => __('t_commerce.invalid_product')]);
    }

    /** @return array<int, array<string, mixed>> */
    private function boosters(): array
    {
        return [
            // Gold boosters (6h / 7 000 DM)
            ['ref' => '929d5e15709cc51a4500de4499e19763c879f7f7', 'name_key' => 'kraken',  'tier_key' => 'gold',   'rarity' => 'rare',     'duration' => '6h',  'price' => 7000, 'price_label' => '7K',   'image_hash' => '40a1644e104985a3e72da28b76069197128f9fb5'],
            ['ref' => '0968999df2fe956aa4a07aea74921f860af7d97f', 'name_key' => 'detroid', 'tier_key' => 'gold',   'rarity' => 'rare',     'duration' => '6h',  'price' => 7000, 'price_label' => '7K',   'image_hash' => '55d4b1750985e4843023d7d0acd2b9bafb15f0b7'],
            ['ref' => '8a4f9e8309e1078f7f5ced47d558d30ae15b4a1b', 'name_key' => 'newtron', 'tier_key' => 'gold',   'rarity' => 'rare',     'duration' => '6h',  'price' => 7000, 'price_label' => '7K',   'image_hash' => 'd949732b01a7f7f6d92e814f2de99479a324e1e3'],
            // Silver boosters (2h / 2 500 DM)
            ['ref' => '4a58d4978bbe24e3efb3b0248e21b3b4b1bfbd8a', 'name_key' => 'kraken',  'tier_key' => 'silver', 'rarity' => 'uncommon', 'duration' => '2h',  'price' => 2500, 'price_label' => '2.5K', 'image_hash' => '1ee55efe00bb03743ca031a9eaa1374bb936d863'],
            ['ref' => '27cbcd52f16693023cb966e5026d8a1efbbfc0f9', 'name_key' => 'detroid', 'tier_key' => 'silver', 'rarity' => 'uncommon', 'duration' => '2h',  'price' => 2500, 'price_label' => '2.5K', 'image_hash' => 'd0b8fb3d307b815b3182f3872e8eab654fe677df'],
            ['ref' => 'd26f4dab76fdc5296e3ebec11a1e1d2558c713ea', 'name_key' => 'newtron', 'tier_key' => 'silver', 'rarity' => 'uncommon', 'duration' => '2h',  'price' => 2500, 'price_label' => '2.5K', 'image_hash' => 'a92734028d1bf2e75c5c25ae134b4d298a5ca36e'],
            // Bronze boosters (30m / 700 DM)
            ['ref' => '40f6c78e11be01ad3389b7dccd6ab8efa9347f3c', 'name_key' => 'kraken',  'tier_key' => 'bronze', 'rarity' => 'common',   'duration' => '30m', 'price' => 700,  'price_label' => '700',  'image_hash' => '98629d11293c9f2703592ed0314d99f320f45845'],
            ['ref' => 'd3d541ecc23e4daa0c698e44c32f04afd2037d84', 'name_key' => 'detroid', 'tier_key' => 'bronze', 'rarity' => 'common',   'duration' => '30m', 'price' => 700,  'price_label' => '700',  'image_hash' => '56724c3a1dcae8036bb172f0be833a6f9a28bc27'],
            ['ref' => 'da4a2a1bb9afd410be07bc9736d87f1c8059e66d', 'name_key' => 'newtron', 'tier_key' => 'bronze', 'rarity' => 'common',   'duration' => '30m', 'price' => 700,  'price_label' => '700',  'image_hash' => '4bc4327a3fd508b5da84267e2cfd58d47f9e4dcb'],
        ];
    }
}
