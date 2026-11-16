<?php

namespace OGame\Services;

use OGame\GameObjects\Models\Abstracts\GameObject;

/** Presentation only; original ship definitions and classic artwork remain intact. */
class Live3dArtworkService
{
    public const LIGHT_FIGHTER_IMAGE = '/img/live3d/ships/light-fighter-35-v1.webp';

    public static function image(GameObject $object, string $fallback): string
    {
        return $object->machine_name === 'light_fighter' ? asset(ltrim(self::LIGHT_FIGHTER_IMAGE, '/')) : $fallback;
    }

    public static function replaceLegacyImages(string $html): string
    {
        return str_replace('/img/objects/units/light_fighter_small.jpg', self::LIGHT_FIGHTER_IMAGE, $html);
    }
}
