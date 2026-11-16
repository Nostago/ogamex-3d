<section data-live-message-id="{{ $messageId }}">
<nav class="live-message-pagination" aria-label="{{ __('t_messageui.pagination') }}">
@foreach(['firstId'=>'first','prevId'=>'previous','nextId'=>'next','lastId'=>'last'] as $key=>$label)
<button type="button" data-message-page="{{ $pagination[$key] ?? '' }}" data-tab="{{ $pagination['tab'] }}" data-subtab="{{ $pagination['subtab'] }}" @disabled(!($pagination[$key] ?? null) || $pagination[$key] === $messageId)>{{ __('t_messageui.'.$label) }}</button>
@if($key === 'prevId')<span>{{ __('t_messageui.page_of', ['current'=>$pagination['currentIndex'],'total'=>$pagination['totalCount']]) }}</span>@endif
@endforeach
</nav>
<div class="live-report-body">{!! $messageBody !!}</div>
</section>
