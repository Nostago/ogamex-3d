<form action="{{ route('commerce.purchase') }}" method="post" class="commerce-purchase" data-balance="{{ $darkMatter }}">
@csrf
<input type="hidden" name="product" value="{{ $product['key'] }}">
<input type="hidden" name="expected_price" value="{{ $product['price'] }}">
<input type="hidden" name="request_id" value="{{ (string) Illuminate\Support\Str::uuid() }}">
@if($product['kind'] === 'item')<label>{{ __('t_commerce.quantity') }}<input type="number" name="quantity" value="1" min="1" max="100" required></label>
@else<input type="hidden" name="quantity" value="1">
@endif
<button type="submit"
@disabled($darkMatter < $product['price'])>{{ $product['kind'] === 'item' ? __('t_commerce.buy') : __('t_commerce.recruit') }} · <span data-total-price>{{ number_format($product['price'], 0, ',', '.') }}</span> {{ __('t_commerce.matter') }}{{ $product['kind'] === 'officer' ? ' / '.$product['days'].' '.__('t_commerce.days') : '' }}</button>
</form>
