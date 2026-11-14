<style>
.commerce{color:#cfe6f0;font:14px/1.65 system-ui,sans-serif;padding:18px;box-sizing:border-box;width:100%;min-width:0}
.commerce h2,.commerce h3{color:#9aeafa;font-weight:600}.commerce-intro{margin-bottom:24px}.commerce-balance{padding:15px 20px;background:#132339;border:1px solid #7b68ac;border-radius:6px;display:inline-block;color:#d6b4ff}.commerce-tabs{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
.commerce-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-bottom:28px}.commerce-card{padding:20px;border:1px solid #31586b;border-radius:8px;background:linear-gradient(145deg,#102a3b,#071622);min-width:0;box-sizing:border-box}.commerce-card img{width:100px;height:100px;object-fit:contain;float:none}.commerce-card h3{margin:10px 0}.commerce-price{font-size:18px;font-weight:600;color:#d5b4ff}.commerce form{display:grid;gap:12px;margin:15px 0}.commerce label{display:grid;gap:5px}.commerce input,.commerce button{box-sizing:border-box;max-width:100%;font:inherit;padding:10px;border:1px solid #3d748a;border-radius:5px;background:#071723;color:#d9eff8}.commerce button{background:#14556b;cursor:pointer;min-height:42px}.commerce button:disabled{opacity:.45;cursor:not-allowed}.commerce a{color:#78dcf5}.commerce-tabs a{padding:9px 16px;border:1px solid #31586b;border-radius:5px}.commerce-message{padding:16px;border:1px solid #4b967d;color:#97ead0;background:#0c2a2a;margin-bottom:18px}.commerce-error{border-color:#b76c57;color:#ffc9b5}.commerce-officer-image{display:block;width:100px;height:100px;background-image:url('/img/icons/a22e8a59e7cfd08f0997cf491c2ca1.png')!important;background-repeat:no-repeat;border:1px solid #34738b;border-radius:6px}.commerce table{width:100%;border-collapse:collapse}.commerce td,.commerce th{padding:12px;text-align:left;border-bottom:1px solid #27495c}.commerce input[type=number]{min-width:90px;width:100%}.commerce time{display:block;color:#73ddb3}.commerce fieldset{border:0;padding:0;min-width:0}#commerce-officers .commerce-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.commerce-card [hidden]{display:none!important}
@media(max-width:650px){.commerce{padding:8px}.commerce-grid{grid-template-columns:minmax(0,1fr)}.commerce td,.commerce th{padding:6px}.commerce-price{font-size:16px}}
</style>
@if(session('status'))<div class="commerce-message" role="status">{{ session('status') }}</div>
@endif
@if($errors->any())<div class="commerce-message commerce-error" role="alert">
@foreach($errors->all() as $error)<p>{{ $error }}</p>
@endforeach</div>
@endif

<script>
document.addEventListener('input',event=>{
 const form=event.target.closest('.commerce-purchase');if(!form||event.target.name!=='quantity'||form.dataset.commercePending==='true')return;
 const quantity=Number(event.target.value),price=Number(form.querySelector('[name=expected_price]').value),total=form.querySelector('[data-total-price]');
 if(!total)return;total.textContent=new Intl.NumberFormat(document.documentElement.lang||'de').format(price*quantity);
 form.querySelector('button').disabled=!event.target.checkValidity()||price*quantity>Number(form.dataset.balance);
});
</script>

<script>
(()=>{
 const storageKey=path=>'ogamex-commerce-receipt:'+path;
 function feedback(message,error=false){
  const root=document.querySelector('.commerce');if(!root)return;
  let box=root.querySelector('[data-commerce-feedback]');
  if(!box){box=document.createElement('div');box.dataset.commerceFeedback='true';root.prepend(box)}
  box.className='commerce-message'+(error?' commerce-error':'');box.setAttribute('role',error?'alert':'status');box.textContent=message;
 }
 document.addEventListener('DOMContentLoaded',()=>{
  try{const key=storageKey(location.pathname),value=sessionStorage.getItem(key);sessionStorage.removeItem(key);if(value){const receipt=JSON.parse(value);if(Date.now()-receipt.time<120000)feedback(receipt.message)}}catch{}
 });
 document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.matches('.commerce-purchase,form[action$="/shop/activate"],#commerce-prices form,[data-merchant-form]'))return;
  event.preventDefault();if(form.dataset.commercePending==='true')return;if(form.dataset.confirm&&!confirm(form.dataset.confirm))return;form.dataset.commercePending='true';
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);
  feedback(@json(__('t_commerce.merchant_pending')));
  try{
   const response=await fetch(form.action,{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'},body:new FormData(form)});
   const result=await response.json().catch(()=>({}));if(response.status>=500||response.redirected)throw new Error(@json(__('t_commerce.request_error')));if(!response.ok||!result.success)throw new Error(result.errors?Object.values(result.errors).flat().join(' '):result.message||@json(__('t_commerce.request_error')));
   const next=new URL(result.redirectUrl||form.dataset.redirect,location.origin);if(next.origin!==location.origin)throw new Error(@json(__('t_commerce.request_error')));
   try{sessionStorage.setItem(storageKey(next.pathname),JSON.stringify({message:result.message,time:Date.now()}))}catch{}
   location.replace(next.href);
  }catch(error){feedback((error instanceof TypeError||error instanceof SyntaxError)?@json(__('t_commerce.request_error')):error.message||@json(__('t_commerce.request_error')),true);form.dataset.commercePending='false';buttons.forEach(button=>button.disabled=false)}
 });
})();
</script>
