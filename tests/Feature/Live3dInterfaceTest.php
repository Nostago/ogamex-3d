<?php

namespace Tests\Feature;

use OGame\Http\Middleware\Locale;
use OGame\Models\User;
use OGame\Services\HighscoreService;
use OGame\Services\SettingsService;
use Tests\IsolatedAccountTestCase;

class Live3dInterfaceTest extends IsolatedAccountTestCase
{
    public function testLiveStateIsGermanAndIncludesOriginalDarkMatterWithoutChangingAccountLocale(): void
    {
        $originalLanguage = User::findOrFail($this->currentUserId)->lang;
        $before = $this->get('/options')->getStatusCode();
        $this->assertSame(200, $before);
        $response = $this->getJson('/play-3d/state')->assertOk();
        $this->assertIsInt($response->json('darkMatter'));
        /** @var array<int, array<string, mixed>> $objectData */
        $objectData = $response->json('objects');
        $objects = collect($objectData);
        $this->assertSame('Metallmine', ($objects->firstWhere('key', 'metal_mine')['name'] ?? null));
        $this->assertContains('de', Locale::SUPPORTED_LOCALES);
        $this->assertSame($originalLanguage, User::findOrFail($this->currentUserId)->lang);
    }

    public function testAllRequestedOriginalAreasRemainReachableInGermanContext(): void
    {
        foreach (['fleet', 'alliance', 'messages', 'premium', 'shop', 'merchant', 'merchant/resource-market', 'buddies', 'options', 'highscore', 'play-3d/notes'] as $path) {
            $this->get('/'.$path.'?ui=live3d')->assertOk();
        }
        $this->get('/fleet/movement?ui=live3d')->assertRedirect(route('fleet.index'));
        $this->get('/play-3d/technology?ui=live3d&object_id=1&tab=2')->assertOk()->assertSee('Metallmine');
        $this->get('/play-3d/technology?object_id=999999&tab=9')->assertSessionHasErrors();
    }

    public function testLiveHighscoreUsesOriginalAdministratorExclusion(): void
    {
        resolve(SettingsService::class)->set('highscore_admin_visible', 1);
        $this->assertTrue(resolve(HighscoreService::class)->isAdminVisibleInHighscore());
        request()->attributes->set('live3d', true);
        $this->assertFalse(resolve(HighscoreService::class)->isAdminVisibleInHighscore());
        request()->attributes->remove('live3d');
        $this->assertTrue(resolve(HighscoreService::class)->isAdminVisibleInHighscore());
    }

    public function testGermanTranslationsCoverEveryOriginalPhpInterfaceKey(): void
    {
        foreach ((glob(resource_path('lang/en/*.php')) ?: []) as $file) {
            if (in_array(basename($file), ['t_live3d.php', 't_prototype3d.php'], true)) {
                continue;
            }
            $german = resource_path('lang/de/'.basename($file));
            $this->assertFileExists($german);
            $this->assertTranslationKeys(require $file, require $german, basename($file));
        }
    }

    private function assertTranslationKeys(array $english, array $german, string $path): void
    {
        foreach ($english as $key => $value) {
            $this->assertArrayHasKey($key, $german, $path.'.'.$key);
            if (is_array($value)) {
                $this->assertTranslationKeys($value, $german[$key], $path.'.'.$key);
            } else {
                $this->assertIsString($german[$key]);
                preg_match_all('/(?<![a-zA-Z]):[a-zA-Z_][a-zA-Z0-9_]*|#[a-zA-Z]+#|%[a-zA-Z]+%|\{[a-zA-Z_]+\}/', (string)$value, $tokens);
                foreach (array_unique($tokens[0]) as $token) {
                    $this->assertStringContainsString($token, $german[$key], $path.'.'.$key);
                }
            }
        }
    }
}
