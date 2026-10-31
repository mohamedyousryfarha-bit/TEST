/* العنوان: يظهر في السلة بس لو فيها حفلات، ويتعرض في جداول العملاء من بيانات طلبات الحفلات */
(function(){
  if(window.__pmAddrScope) return; window.__pmAddrScope=true;

  function digitsOnly(v){
    return String(v||'').replace(/[\u0660-\u0669]/g,function(d){return String(d.charCodeAt(0)-0x0660)}).replace(/\D/g,'');
  }

  /* 1) خانة العنوان في السلة تظهر بس لو فيها حفلة */
  function isPartyCart(){
    try{
      var cart=JSON.parse(localStorage.getItem('pmCart:'+(cloudActorName||'anon'))||'[]');
      var menu=(typeof state!=='undefined'&&state&&Array.isArray(state.menu))?state.menu:[];
      return Array.isArray(cart)&&cart.some(function(l){
        var m=menu.find(function(x){return x&&x.name===l.name&&x.active!==false});
        return !!(m&&m.kind==='party');
      });
    }catch(e){ return false; }
  }
  window.pmCartAsParty=function(){ var c=document.getElementById('cartAsParty'); return !!(c&&c.checked); };
  function syncCartAddr(){
    var inp=document.getElementById('cartAddr'); if(!inp) return;
    var lab=document.querySelector('label[for="cartAddr"]');
    var show=isPartyCart()||(window.pmCartAsParty&&window.pmCartAsParty());
    inp.style.display=show?'':'none';
    if(lab) lab.style.display=show?'':'none';
  }

  /* 2) عنوان كل عميل من آخر طلب حفلة ليه (بالتليفون) */
  function addrByPhone(){
    var map={};
    var orders=(typeof state!=='undefined'&&state&&Array.isArray(state.partyOrders))?state.partyOrders:[];
    orders.forEach(function(o){
      var ph=digitsOnly(o&&o.customerPhone), ad=String((o&&o.customerAddress)||'').trim();
      if(ph && ad) map[ph]=ad;
    });
    return map;
  }
  function applyTable(tbody){
    var table=tbody.closest('table'); if(!table) return;
    var ths=[].slice.call(table.querySelectorAll('thead th'));
    var phoneIdx=-1;
    ths.forEach(function(th,i){ if(phoneIdx<0 && /تليفون|تليفون|هاتف/.test(th.textContent)) phoneIdx=i; });
    if(phoneIdx<0) return;
    var hasAddrTh=ths.some(function(th){return th.textContent.trim()==='العنوان'});
    if(!hasAddrTh){
      var tr=table.querySelector('thead tr');
      if(tr){ var th=document.createElement('th'); th.textContent='العنوان'; tr.appendChild(th); }
    }
    var map=addrByPhone();
    [].forEach.call(tbody.querySelectorAll('tr'),function(row){
      if(row.getAttribute('data-pm-addr')==='1') return;
      var cell=row.children[phoneIdx];
      var phone=digitsOnly(cell?cell.textContent:'');
      var td=document.createElement('td');
      td.textContent=map[phone]||'—';
      row.appendChild(td);
      row.setAttribute('data-pm-addr','1');
    });
  }

  function tick(){
    syncCartAddr();
    ['custTable','pCustTable'].forEach(function(id){
      var tb=document.getElementById(id); if(tb) applyTable(tb);
    });
  }
  setInterval(tick,1200);
  setTimeout(tick,1500);
})();

/* تحديث خانة العنوان لما يتغيّر مفتاح حجز الحفلة */
(function(){ document.addEventListener('change',function(e){ if(e.target&&e.target.id==='cartAsParty'){ try{ if(typeof renderCart==='function') renderCart(); }catch(_){} var inp=document.getElementById('cartAddr'); if(inp){ var show=!!e.target.checked; inp.style.display=show?'':'none'; var lab=document.querySelector('label[for="cartAddr"]'); if(lab) lab.style.display=show?'':'none'; } } }); })();
