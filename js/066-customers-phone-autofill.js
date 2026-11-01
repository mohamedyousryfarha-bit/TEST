/* دمج تلقائي لملفات متتالية من نفس الميزة بالترتيب الأصلي. كل جزء معزول بـ try/catch عشان فشل جزء ما يوقفش الباقي. */
/* ---- 066-customers-phone-autofill.js ---- */
try{
/* لما تكتب رقم تليفون عميل مسجل في الطلب، اسمه بيتملى تلقائي */
(function(){
  if(window.__pmPhoneFill) return; window.__pmPhoneFill=true;

  function toEn(v){
    return String(v||'')
      .replace(/[\u0660-\u0669]/g,function(d){return String(d.charCodeAt(0)-0x0660)})
      .replace(/[\u06F0-\u06F9]/g,function(d){return String(d.charCodeAt(0)-0x06F0)});
  }
  function normPhone(v){ return toEn(v).replace(/\D/g,''); }

  /* كل مصادر العملاء: المبيعات الحالية + سيرفر المبيعات + الأرشيف المقفول. القيمة = الاسم (أو '' لو العميل مسجل بدون اسم) */
  function phoneToName(){
    var map={};
    function add(list){
      (Array.isArray(list)?list:[]).forEach(function(x){
        if(!x||typeof x!=='object') return;
        var p=normPhone(x.customerPhone); if(!p) return;
        var n=String(x.note||x.customerName||'').trim();
        if(!(p in map) || (!map[p] && n)) map[p]=n;
      });
    }
    try{ add(typeof state!=='undefined'&&state?state.salesLog:[]); }catch(e){}
    /* عملاء الحفلات: الاسم بيتخزن في حقل customer مش note */
    try{
      ((typeof state!=='undefined'&&state&&Array.isArray(state.partyOrders))?state.partyOrders:[]).forEach(function(o){
        if(!o||typeof o!=='object') return;
        var p=normPhone(o.customerPhone); if(!p) return;
        var n=String(o.customer||'').trim();
        if(!(p in map) || (!map[p] && n)) map[p]=n;
      });
    }catch(e){}
    try{ add(window.__pmSalesLogServer); }catch(e){}
    try{ ((typeof state!=='undefined'&&state&&Array.isArray(state.monthlyArchives))?state.monthlyArchives:[]).forEach(function(a){ add(a&&a.salesLog); }); }catch(e){}
    return map;
  }

  function bind(phoneId,nameId){
    var ph=document.getElementById(phoneId), nm=document.getElementById(nameId);
    if(!ph||!nm||ph.dataset.pmBound) return;
    ph.dataset.pmBound='1';

    var hint=document.createElement('div');
    hint.className='pm-phone-hint';
    hint.style.cssText='font-size:12px;color:#16794B;margin-top:4px;display:none;font-weight:700';
    ph.insertAdjacentElement('afterend',hint);

    function look(){
      var p=normPhone(ph.value);
      if(p.length<9){ hint.style.display='none'; return; }
      var map=phoneToName();
      if(!(p in map)){
        hint.textContent='👤 عميل جديد (غير مسجل)';
        hint.style.color='#1B1B1B';
        hint.style.display='block';
        return;
      }
      var name=map[p];
      if(name && (!nm.value.trim() || nm.dataset.pmAuto==='1')){ nm.value=name; nm.dataset.pmAuto='1'; }
      hint.textContent=name?('✓ عميل مسجل: '+name):'✓ عميل مسجل';
      hint.style.color='#16794B';
      hint.style.display='block';
    }

    nm.addEventListener('input',function(){ nm.dataset.pmAuto=''; });
    ph.addEventListener('input',look);
    ph.addEventListener('change',look);
  }

  function bindAll(){
    bind('cartPhone','cartNote');
    bind('ptyPhone','ptyCust');
  }
  bindAll();
  setInterval(bindAll,1500);
})();
}catch(e){console.error('[PastryMY] 066-customers-phone-autofill.js failed',e)}
/* ---- 067-customers-address-scope.js ---- */
try{
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
}catch(e){console.error('[PastryMY] 067-customers-address-scope.js failed',e)}
