/* عداد الفواتير المفتوحة على تبويب "الفواتير المفتوحة" للمبيعات والإدارة */
(function(){
  if(window.__pmOpenBadge) return; window.__pmOpenBadge=true;
  function allowed(){ var r=(typeof cloudActorRole!=='undefined')?cloudActorRole:''; return r==='sales'||r==='admin'; }
  function ready(){ return typeof cloudReady!=='undefined'&&!!cloudReady; }
  function badge(){
    var t=document.getElementById('pmOpenInvoicesTab'); if(!t) return null;
    var b=t.querySelector('.pm-open-badge');
    if(!b){
      b=document.createElement('span'); b.className='pm-open-badge';
      b.style.cssText='display:none;align-items:center;justify-content:center;margin-inline-start:6px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#D92D20;color:#1E3A5F;font-size:11px;font-weight:700;box-sizing:border-box';
      t.appendChild(b);
    }
    return b;
  }
  function paint(){
    var b=badge(); if(!b) return;
    var n=(allowed()&&ready())?Number(window.pmOpenCount||0):0;
    b.textContent=n>99?'99+':String(n);
    b.style.display=n?'inline-flex':'none';
  }
  function refresh(){
    if(!allowed()||!ready()||typeof window.pmLoadServerSales!=='function'){ paint(); return; }
    Promise.resolve(window.pmLoadServerSales()).catch(function(){}).then(function(){
      try{ if(typeof window.pmRenderOpenInvoices==='function') window.pmRenderOpenInvoices(); }catch(e){}
      paint();
    });
  }
  setInterval(paint,1000);
  setInterval(refresh,15000);
  setTimeout(refresh,2500);
})();
