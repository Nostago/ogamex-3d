<?php

namespace Tests\Feature;

use Tests\TestCase;

class Prototype3dTest extends TestCase
{
    public function testPrototypeIsPublicAndUsesGermanDemoInterface(): void
    {
        $this->get('/prototype-3d')
            ->assertOk()
            ->assertSee('lang="de"', false)
            ->assertSee('type="module"', false)
            ->assertSee('DEMO-MODUS')
            ->assertSee('Deuterium-Synthesizer')
            ->assertSee('prototype-translations')
            ->assertSee('verändern keinen Spielstand');
    }
}
