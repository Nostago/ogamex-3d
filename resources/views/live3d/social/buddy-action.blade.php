<form method="post" action="{{ route('buddies.post', ['ui' => 'live3d', 'cp' => request('cp')]) }}"
      data-social-mutation @if($confirm ?? false) data-social-confirm="{{ __('t_socialui.confirm_remove') }}" @endif>
    @csrf
    <input type="hidden" name="action" value="{{ $action }}">
    <input type="hidden" name="id" value="{{ $id }}">
    <input type="hidden" name="ajax" value="1">
    <button type="submit" @class(['social-danger' => $confirm ?? false])>{{ $label }}</button>
</form>
