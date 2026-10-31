/* ورقة حجز الحفلة المضغوطة من السلة: سطر حالة صغير + ورقة بتفتح عند الطلب */
(function(){
  if(window.__pmPartySheet) return; window.__pmPartySheet=true;

  function $(id){ return document.getElementById(id); }
  /* الورقة لازم تبقى برا طبقة السلة، عشان الضغط عليها ما يقفلش السلة كلها */
  function liftSheet(){ var s=$('cartPartySheet'); if(s && s.parentElement!==document.body) document.body.appendChild(s); }
  function isOn(){ var cb=$('cartAsParty'); return !!(cb && cb.checked); }

  function setOpen(v){
    var s=$('cartPartySheet'); if(!s) return;
    liftSheet(); s.hidden=!v;
    if(v){ var cb=$('cartAsParty'); if(cb) setTimeout(function(){ cb.focus({preventScroll:true}); },50); }
    paint();
  }

  function paint(){
    var chip=$('cartPartyChip'), btn=$('cartPartyOpen');
    var on=isOn();
    var addr=String(($('cartAddr')||{}).value||'').trim();
    if(chip){
      chip.textContent = on
        ? ('🎉 حجز حفلة' + (addr ? ' · ' + addr : ' · بدون عنوان'))
        : 'بيع عادي';
      chip.className = 'pm-party-chip-txt' + (on ? ' on' : '');
    }
    if(btn) btn.textContent = on ? 'تعديل' : 'تحويل لحجز حفلة';
  }

  document.addEventListener('click', function(e){
    var t=e.target; if(!t || !t.closest) return;
    if(t.closest('#cartPartyOpen')){ e.preventDefault(); setOpen(true); return; }
    if(t.closest('#cartPartyClose') || t.closest('#cartPartyDone')){ setOpen(false); return; }
    if(t.id==='cartPartySheet'){ setOpen(false); }
  });

  document.addEventListener('change', function(e){
    if(e.target && e.target.id==='cartAsParty') paint();
  });
  document.addEventListener('input', function(e){
    if(e.target && e.target.id==='cartAddr') paint();
  });
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape' && $('cartPartySheet') && !$('cartPartySheet').hidden) setOpen(false);
  });

  /* حدّث سطر الحالة كل ما السلة تتعرض من جديد */
  var wrapped=false;
  function wrapRender(){
    if(wrapped || typeof window.renderCart!=='function') return;
    wrapped=true;
    var orig=window.renderCart;
    window.renderCart=function(){ var r=orig.apply(this,arguments); paint(); return r; };
  }
  wrapRender();
  setInterval(function(){ wrapRender(); liftSheet(); paint(); }, 800);
  liftSheet(); paint();
})();
