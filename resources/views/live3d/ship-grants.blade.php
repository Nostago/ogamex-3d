<section class="card ship-grants" aria-labelledby="ship-grants-title">
    <h2 id="ship-grants-title">{{ __('t_shipgrants.title') }}</h2>
    <p>{{ __('t_shipgrants.intro') }}</p>
    <form id="ship-grant-search" class="ship-grant-search">
        <label for="ship-grant-query">{{ __('t_shipgrants.query') }}<input id="ship-grant-query" name="q" type="search" maxlength="80" required autocomplete="off"></label>
        <button type="submit">{{ __('t_shipgrants.search') }}</button>
    </form>
    <p id="ship-grant-search-status" role="status"></p>
    <div id="ship-grant-results" class="ship-grant-results" aria-label="{{ __('t_shipgrants.results') }}"></div>
    <form id="ship-grant-form">
        <fieldset id="ship-grant-fields" disabled>
            <legend id="ship-grant-recipient">{{ __('t_shipgrants.choose_player') }}</legend>
            <div class="ship-grant-fields">
                <label for="ship-grant-world">{{ __('t_shipgrants.world') }}<select id="ship-grant-world" required></select></label>
                <label for="ship-grant-ship">{{ __('t_shipgrants.ship') }}<select id="ship-grant-ship" required></select></label>
                <label for="ship-grant-amount">{{ __('t_shipgrants.amount') }}<input id="ship-grant-amount" type="number" min="1" max="1000000000" step="1" value="1" required></label>
                <label for="ship-grant-reason">{{ __('t_shipgrants.reason') }}<input id="ship-grant-reason" type="text" maxlength="500"></label>
            </div>
        </fieldset>
        <section id="ship-grant-preview" class="ship-grant-preview" aria-live="polite"><p>{{ __('t_shipgrants.select_hint') }}</p></section>
        <p>{{ __('t_shipgrants.amount_note') }}</p>
        <div class="live-groups"><button id="ship-grant-submit" type="submit" disabled>{{ __('t_shipgrants.submit') }}</button><button id="ship-grant-new" type="button" hidden>{{ __('t_shipgrants.new') }}</button></div>
    </form>
    <p id="ship-grant-status" role="status" aria-live="polite"></p>
    <section class="ship-grant-history"><h3>{{ __('t_shipgrants.history') }}</h3><div id="ship-grant-history"></div></section>
</section>
