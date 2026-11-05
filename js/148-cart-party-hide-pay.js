/* ---- 148-cart-party-hide-pay.js ----
   لما الأوردر يتحوّل لحجز حفلة، قسم "طريقة الدفع" بيتخفي من السلة
   (الدفع في الحفلة بيتسجل بعدين عند التحصيل)، ويرجع الكاش كاختيار افتراضي. */
(function(){
  'use strict';
  function wrap(){
    var box=document.getElementById('cartPayMethods');
    return box ? box.parentElement : null;
  }
  function apply(){
    var party=document.getElementById('cartAsParty');
    var w=wrap();
    if(!w) return;
    var on=!!(party&&party.checked);
    w.style.display=on?'none':'';
    if(on){
      var cash=document.querySelector('input[name="cartPayMethod"][value="cash"]');
      if(cash) cash.checked=true;
    }
  }
  document.addEventListener('change',function(e){
    if(e.target&&e.target.id==='cartAsParty') apply();
  });
  document.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('#cartPayMethods')) return;
    setTimeout(apply,0);
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply);
  else apply();
})();
