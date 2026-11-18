<section data-native-note-editor>
<form data-note-form method="post" action="{{ route('notes.ajax.create') }}">
    @csrf
    <input type="hidden" name="id" value="{{ $noteId }}">
    <label for="work-note-subject">{{ __('t_workui.subject') }}</label>
    <input id="work-note-subject" name="noticeSubject" value="{{ $subject }}" maxlength="32">
    <label for="work-note-priority">{{ __('t_workui.priority') }}</label>
    <select id="work-note-priority" name="noticePrio">@foreach([1,2,3] as $number)<option value="{{ $number }}" @selected($priority === $number)>{{ __('t_workui.priority_'.$number) }}</option>@endforeach</select>
    <label for="work-note-content">{{ __('t_workui.content') }}</label>
    <textarea id="work-note-content" name="noticeText" maxlength="5000" rows="12">{{ $content }}</textarea>
    <span data-note-count>{{ mb_strlen($content ?? '') }} / 5000</span>
    <div class="social-actions">
<button type="submit">{{ __('t_workui.save') }}</button>
<button type="button" data-work-close>{{ __('t_workui.cancel') }}</button>
</div>
</form>
</section>
