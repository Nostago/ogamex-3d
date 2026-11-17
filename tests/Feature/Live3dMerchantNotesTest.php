<?php

namespace Tests\Feature;

use OGame\Models\Note;
use OGame\Models\User;
use Tests\IsolatedAccountTestCase;

class Live3dMerchantNotesTest extends IsolatedAccountTestCase
{
    public function testNativeMerchantPagesUseNamedActionsAndFullWidthLists(): void
    {
        $this->get('/merchant?ui=live3d')->assertOk()->assertSee('id="live-merchant"', false)->assertSee('Schrotthändler öffnen');
        $this->get('/merchant/scrap?ui=live3d')->assertOk()->assertSee('id="live-scrap"', false)
            ->assertSee('Auswahl prüfen')->assertSee('Alle verfügbaren auswählen')->assertSee('Verhandeln')
            ->assertSee('Leichter Jäger')->assertSee('data-scrap-unit="204"', false)->assertSee('rocket_launcher_small.jpg')
            ->assertDontSee('anythingSlider')->assertDontSee('js_maxShips');
        $this->get('/merchant/resource-market?ui=live3d')->assertOk()->assertSee('id="live-market"', false)->assertSee('Händler rufen');
        $this->get('/merchant/market/metal?ui=live3d&overlay=1')->assertOk()->assertSee('id="live-market"', false)->assertDontSee('setMaxValue');
        $this->get('/merchant/scrap')->assertOk()->assertSee('js_anythingSliderShips');
    }

    public function testNotesListAndEditorEscapeContentAndProtectOwnership(): void
    {
        $note = $this->note($this->currentUserId);
        $foreign = $this->note(User::factory()->create()->id);
        $foreign->subject = 'PrivateForeignNote';
        $foreign->save();
        $this->get('/play-3d/notes?ui=live3d')->assertOk()->assertSee('id="live-notes"', false)->assertSee('Öffnen / Bearbeiten')
            ->assertSee('Markierte löschen')->assertSee('&lt;script&gt;', false)->assertDontSee('<script>alert', false)->assertDontSee('PrivateForeignNote');
        $this->get('/overlay/notes/view?ui=live3d&id='.$note->id)->assertOk()->assertSee('data-native-note-editor', false)->assertSee('maxlength="5000"', false)->assertSee('&lt;script&gt;', false);
        $this->get('/overlay/notes/view?ui=live3d&id='.$foreign->id)->assertNotFound();
        $this->postJson('/ajax/notes/create?ui=live3d', ['_token' => csrf_token(), 'id' => $foreign->id, 'noticeSubject' => 'Changed', 'noticeText' => 'Changed'])->assertUnprocessable();
    }

    public function testNativeNoteCreationEditingAndSelectedDeletionUseOriginalServices(): void
    {
        $created = $this->postJson('/ajax/notes/create?ui=live3d', ['_token' => csrf_token(), 'noticeSubject' => 'Meine Notiz', 'noticePrio' => 1, 'noticeText' => 'Text'])->assertOk()->json('id');
        $this->assertIsInt($created);
        $this->postJson('/ajax/notes/create?ui=live3d', ['_token' => csrf_token(), 'id' => $created, 'noticeSubject' => 'Geändert', 'noticePrio' => 3, 'noticeText' => ''])->assertOk();
        $this->assertDatabaseHas('notes', ['id' => $created, 'subject' => 'Geändert', 'priority' => 3, 'content' => '']);
        $foreign = $this->note(User::factory()->create()->id);
        $keep = $this->note($this->currentUserId);
        $this->post('/overlay/notes?ui=live3d', ['_token' => csrf_token(), 'noticeDeleteMethode' => '1', 'delIds' => [$created, $foreign->id]])->assertOk();
        $this->assertDatabaseMissing('notes', ['id' => $created]);
        foreach ([$foreign, $keep] as $note) {
            $this->assertDatabaseHas('notes', ['id' => $note->id]);
        }
        $this->get('/overlay/notes')->assertOk()->assertSee('id="noteList"', false);
    }

    private function note(int $owner): Note
    {
        return Note::create(['user_id' => $owner, 'priority' => 1, 'subject' => 'Test <script>', 'content' => '<script>alert(1)</script>'.str_repeat(' langer Text', 300)]);
    }
}
