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
        'small_cargo' => '/img/live3d/ships/small_cargo-35-v1.webp',
        'cruiser' => '/img/live3d/ships/cruiser-35-v1.webp',
        'battle_ship' => '/img/live3d/ships/battle_ship-35-v1.webp',
        'battlecruiser' => '/img/live3d/ships/battlecruiser-35-v1.webp',
        'bomber' => '/img/live3d/ships/bomber-35-v3.webp',
        'destroyer' => '/img/live3d/ships/destroyer-35-v1.webp',
        'deathstar' => '/img/live3d/ships/deathstar-35-v1.webp',
        'reaper' => '/img/live3d/ships/reaper-35-v1.webp',
        'recycler' => '/img/live3d/ships/recycler-35-v1.webp',
        'pathfinder' => '/img/live3d/ships/pathfinder-35-v2.webp',
        'crawler' => '/img/live3d/ships/crawler-35-v3.webp',
        'solar_satellite' => '/img/live3d/ships/solar_satellite-35-v1.webp',
        'espionage_probe' => '/img/live3d/ships/espionage_probe-35-v2.webp',
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
