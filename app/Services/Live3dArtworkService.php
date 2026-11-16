<?php

namespace OGame\Services;

use OGame\GameObjects\Models\Abstracts\GameObject;

/** Presentation only; original ship definitions and classic artwork remain intact. */
class Live3dArtworkService
{
    public const LIGHT_FIGHTER_IMAGE = '/img/live3d/ships/light-fighter-35-v1.webp';

    public const SHIP_IMAGES = [
        'light_fighter' => self::LIGHT_FIGHTER_IMAGE,
        'heavy_fighter' => '/img/live3d/ships/heavy-fighter-35-v1.webp',
        'large_cargo' => '/img/live3d/ships/large-cargo-35-v1.webp',
        'colony_ship' => '/img/live3d/ships/colony-ship-35-v1.webp',
    ];

    public static function image(GameObject $object, string $fallback): string
    {
        $image = self::SHIP_IMAGES[$object->machine_name] ?? null;
        return $image !== null ? asset(ltrim($image, '/')) : $fallback;
    }

    public static function replaceLegacyImages(string $html): string
    {
        foreach (self::SHIP_IMAGES as $key => $image) {
            $html = str_replace('/img/objects/units/'.$key.'_small.jpg', $image, $html);
        }
        return $html;
    }
}
