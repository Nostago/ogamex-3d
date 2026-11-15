<dialog id="live-rename-dialog" class="quick-fleet-dialog" aria-labelledby="live-rename-title">
<header><h2 id="live-rename-title">{{ __('t_readability.rename_world') }}</h2><button type="button" id="live-rename-close" aria-label="{{ __('t_operations.op_close') }}">×</button></header>
<p id="live-rename-target"></p><form id="live-rename-form"><label for="live-rename-name">{{ __('t_readability.world_name') }}</label><input id="live-rename-name" name="newPlanetName" type="text" minlength="2" maxlength="20" required autocomplete="off" aria-describedby="live-rename-hint"><p id="live-rename-hint">{{ __('t_readability.rename_hint') }}</p><p id="live-rename-status" role="status" aria-live="polite"></p><button type="submit">{{ __('t_readability.rename_save') }}</button></form>
</dialog>
