@extends('live3d.social.layout')
@section('root_id', 'live-notes')
@section('title', __('t_workui.notes'))
@section('content')
<header class="social-heading">
<div>
<h2>{{ __('t_workui.notes') }}</h2>
<p>{{ __('t_workui.notes_intro') }}</p>
</div>
<button type="button" data-note-open="0">+ {{ __('t_workui.new_note') }}</button>
</header>
@if(isset($success))<p class="social-notice" role="status">{{ __('t_workui.notes_deleted') }}</p>@endif
<section class="social-panel">
    <div class="social-actions work-toolbar">
        <label>
<input type="checkbox" data-notes-all> {{ __('t_workui.select_all') }}</label>
        <button type="button" data-notes-delete disabled>{{ __('t_workui.delete_selected') }}</button>
        <label class="work-filter">{{ __('t_workui.search_notes') }}<input type="search" data-notes-filter>
</label>
    </div>
    <div class="work-notes-list">
        @foreach($notes as $note)
            <article class="work-note" data-note-row="{{ $note->id }}" data-note-search="{{ $note->subject.' '.$note->content }}">
                <label>
<input type="checkbox" data-note-select="{{ $note->id }}"> {{ __('t_workui.select') }}</label>
                <header>
<h3>{{ $note->subject ?: __('t_workui.untitled') }}</h3>
<span class="work-priority work-priority-{{ $note->priority }}">{{ __('t_workui.priority_'.$note->priority) }}</span>
</header>
                <time datetime="{{ $note->created_at?->toIso8601String() }}">{{ $note->updated_at?->format('d.m.Y H:i') }}</time>
                <p>{{ \Illuminate\Support\Str::limit($note->content ?? '', 180) }}</p>
                <div class="social-actions">
<button type="button" data-note-open="{{ $note->id }}">{{ __('t_workui.open_edit') }}</button>
<button type="button" class="social-danger" data-note-delete="{{ $note->id }}">{{ __('t_workui.delete') }}</button>
</div>
            </article>
        @endforeach
    </div>
    <p class="social-empty" data-notes-empty @if(count($notes)) hidden @endif>{{ __('t_workui.no_notes') }}</p>
</section>
@endsection
