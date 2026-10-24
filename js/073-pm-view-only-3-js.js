(function(){
  if(window.__pmViewOnly3) return; window.__pmViewOnly3=true;
  function role(){ return (typeof cloudActorRole!=='undefined') ? cloudActorRole : ''; }

  function showInvoices(){
    document.querySelectorAll('.panel.active').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('nav.tabs .tab.active').forEach(function(t){ t.classList.remove('active'); });
    var p=document.getElementById('cartpage');
    var t=document.querySelector('nav.tabs .tab[data-tab="cartpage"]');
    if(!p) return;
    p.classList.add('active');
    if(t) t.classList.add('active');
    var card=document.getElementById('invoicesCard'); if(card) card.style.display='';
    if(typeof window.renderSales==='function') window.renderSales();
    window.scrollTo({top:0});
  }
  document.addEventListener('click',function(e){
    if(role()!=='sales') return;
    var t=e.target.closest && e.target.closest('nav.tabs .tab[data-tab="cartpage"]');
    if(!t) return;
    e.stopImmediatePropagation(); e.preventDefault();
    showInvoices();
  },true);

  var DEV_SVG=((window.__PMUI__&&window.__PMUI__.ICONS.devices)||'');
  function ensureDevBtn(){
    var d=document.getElementById('pmDock');
    if(!d || role()!=='sales') return;
    if(d.querySelector('[data-act="devView"]')) return;
    var b=document.createElement('button');
    b.type='button'; b.setAttribute('data-act','devView');
    b.innerHTML=DEV_SVG+'<span class="pmd-txt">الحسابات المتصلة</span>';
    d.appendChild(b);
  }
  function fillDev(){
    var p=document.getElementById('pmPresText'), sy=document.getElementById('pmSyncText');
    var dp=document.getElementById('pmDevPres'), ds=document.getElementById('pmDevSync');
    if(typeof window.pmDevRender==='function') window.pmDevRender();
    if(dp&&p) dp.textContent=(p.textContent||'').replace(/^.*?:\s*/,'')||'—';
    if(ds&&sy) ds.textContent=(sy.textContent||'').replace(/^.*?:\s*/,'')||'—';
  }
  var devTimer=null;
  document.addEventListener('click',function(e){
    var b=e.target.closest && e.target.closest('#pmDock [data-act="devView"]');
    if(!b) return;
    e.stopImmediatePropagation(); e.preventDefault();
    var s=document.getElementById('pmDevSheet'); if(!s) return;
    fillDev(); s.hidden=false;
    clearInterval(devTimer);
    devTimer=setInterval(function(){ if(s.hidden){ clearInterval(devTimer); } else { fillDev(); } },1000);
  },true);

  setInterval(function(){
    if(role()!=='sales') return;
    var p=document.getElementById('cartpage');
    if(p && p.classList.contains('active')){
      var c=document.getElementById('invoicesCard');
      if(c && c.style.display!=='') c.style.display='';
    }
    ensureDevBtn();
  },700);
})();
