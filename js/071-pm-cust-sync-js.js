/* إدارة العملاء المحظورين/المحذوفين: محفوظة في الحالة (state) فتتزامن على كل الأجهزة.
   - state.blockedCustomers : مفاتيح العملاء المحظورين من الطلبات
   - state.hiddenCustomers  : مفاتيح العملاء المخفيين من الجدول (الفواتير محفوظة)
   المفتاح: p:<رقم التليفون> أو n:<الاسم> */
(function(){
  if(window.__pmCustSync) return; window.__pmCustSync=true;

  function digits(p){ return String(p||'').replace(/[^\d]/g,''); }
  function normName(n){ return String(n||'').trim().replace(/\s+/g,' ').toLowerCase(); }
  function clean(t){ t=String(t||'').trim(); return t==='\u2014' ? '' : t; }
  function keyOf(name,phone){ var d=digits(phone); return d ? 'p:'+d : 'n:'+normName(name); }

  function getList(name){
    return (typeof state!=='undefined' && state && Array.isArray(state[name])) ? state[name] : [];
  }
  function cleanKeys(a){ return a.filter(function(k){ return k && k!=='n:' && k!=='p:'; }); }
  function blockedSet(){ return new Set(cleanKeys(getList('blockedCustomers'))); }
  function hiddenSet(){ return new Set(cleanKeys(getList('hiddenCustomers'))); }
  /* الأعمدة الحقيقية بس (من غير خانة التحديد اللي بنزودها) */
  function dataCells(tr){ return Array.prototype.filter.call(tr.cells,function(c){ return !c.classList.contains('pm-cm-td'); }); }
  function setList(name,set){
    if(typeof state==='undefined' || !state) return;
    state[name]=Array.from(set);
    if(typeof window.save==='function'){ try{ window.save(); }catch(e){} }
  }

  /* نقل أي حظر محفوظ قديم على الجهاز (قبل التحديث) للحالة المتزامنة مرة واحدة */
  (function migrate(){
    try{
      var old=JSON.parse(localStorage.getItem('pm_cust_block')||'[]');
      var oldH=JSON.parse(localStorage.getItem('pm_cust_hidden')||'[]');
      if((Array.isArray(old)&&old.length)||(Array.isArray(oldH)&&oldH.length)){
        var waitState=setInterval(function(){
          if(typeof state==='undefined'||!state) return;
          clearInterval(waitState);
          var b=blockedSet(); (old||[]).forEach(function(k){ b.add(k); }); setList('blockedCustomers',b);
          var h=hiddenSet(); (oldH||[]).forEach(function(k){ h.add(k); }); setList('hiddenCustomers',h);
          localStorage.removeItem('pm_cust_block'); localStorage.removeItem('pm_cust_hidden');
        },1000);
      }
    }catch(e){}
  })();

  var showHidden=false;
  var selected=new Set();
  var TABLES=['custTable','pCustTable'];

  function ensureUI(tbody){
    var tbl=tbody.parentNode;
    var thr=tbl.querySelector('thead tr');
    if(thr && !thr.querySelector('.pm-cm-th')){
      var th=document.createElement('th'); th.className='pm-cm-th';
      th.innerHTML='<input type="checkbox" class="pm-cm-cb" data-cm="all" aria-label="تحديد الكل">';
      thr.insertBefore(th,thr.firstChild);
    }
    var wrap=tbl.closest('.tablewrap');
    if(wrap && !(wrap.previousElementSibling && wrap.previousElementSibling.classList.contains('pm-cm-bar'))){
      var bar=document.createElement('div'); bar.className='pm-cm-bar'; bar.setAttribute('data-cm-for',tbody.id);
      bar.innerHTML=
        '<button type="button" class="pm-cm-block" data-cm-act="block">حظر المحدد من الطلبات</button>'+
        '<button type="button" class="pm-cm-unblock" data-cm-act="unblock">إلغاء الحظر</button>'+
        '<button type="button" class="pm-cm-del" data-cm-act="del">حذف من الجدول</button>'+
        '<button type="button" class="pm-cm-show" data-cm-act="show">'+(showHidden?'إخفاء المحذوفين':'إظهار المحذوفين')+'</button>'+
        '<span class="pm-cm-cnt"></span>';
      wrap.parentNode.insertBefore(bar,wrap);
    }
  }

  function decorate(tbody){
    ensureUI(tbody);
    var blocked=blockedSet(), hidden=hiddenSet();
    Array.prototype.forEach.call(tbody.querySelectorAll('tr'),function(tr){
      var cols=dataCells(tr);
      if(cols.length<5){ tr.style.display=''; return; }
      var name=clean(cols[0].textContent), phone=clean(cols[1].textContent);
      var key=keyOf(name,phone);
      var cb=tr.querySelector('.pm-cm-cb');
      if(!cb){
        var td=document.createElement('td'); td.className='pm-cm-td';
        td.innerHTML='<input type="checkbox" class="pm-cm-cb" aria-label="تحديد العميل">';
        tr.insertBefore(td,tr.firstChild);
        cb=td.firstChild;
        cb.addEventListener('change',function(){
          var k=cb.getAttribute('data-key');
          if(cb.checked) selected.add(k); else selected.delete(k);
          updateCounts();
        });
      }
      cb.setAttribute('data-key',key);
      cb.disabled=(key==='n:');
      cb.checked=selected.has(key);
      var isHid=hidden.has(key);
      tr.style.display=(isHid && !showHidden)?'none':'';
      tr.classList.toggle('pm-cm-hid', isHid);
      var nameCell=cols[1];
      var tag=nameCell.querySelector('.pm-cm-tag');
      if(blocked.has(key)){
        if(!tag){ tag=document.createElement('span'); tag.className='pm-cm-tag'; tag.textContent='محظور'; nameCell.appendChild(tag); }
      } else if(tag){ tag.remove(); }
    });
  }

  function updateCounts(){
    var b=blockedSet().size, h=hiddenSet().size;
    document.querySelectorAll('.pm-cm-bar .pm-cm-cnt').forEach(function(el){
      el.textContent='المحدد: '+selected.size+' · المحظورين: '+b+' · المحذوفين: '+h;
    });
    document.querySelectorAll('.pm-cm-bar .pm-cm-show').forEach(function(el){
      el.textContent=showHidden?'إخفاء المحذوفين':'إظهار المحذوفين';
    });
  }

  function refreshAll(){
    TABLES.forEach(function(id){ var t=document.getElementById(id); if(t) decorate(t); });
    updateCounts();
  }

  function act(name){
    if(name!=='show' && !selected.size){ alert('حدد عميل أو أكتر الأول.'); return; }
    if(name==='block'){
      var b=blockedSet(); selected.forEach(function(k){ b.add(k); }); setList('blockedCustomers',b);
      alert('تم حظر '+selected.size+' عميل من الطلبات على كل الأجهزة.');
    } else if(name==='unblock'){
      var b2=blockedSet(); selected.forEach(function(k){ b2.delete(k); }); setList('blockedCustomers',b2);
    } else if(name==='del'){
      if(!confirm('هيتشالوا من الجدول بس. الفواتير بتاعتهم فضلت محفوظة. متأكد؟')) return;
      var h=hiddenSet(); selected.forEach(function(k){ h.add(k); }); setList('hiddenCustomers',h);
    } else if(name==='show'){
      showHidden=!showHidden;
    }
    if(name!=='show') selected.clear();
    refreshAll();
  }

  document.addEventListener('change',function(e){
    var t=e.target;
    if(!t || t.getAttribute('data-cm')!=='all') return;
    var tbl=t.closest('table'); if(!tbl) return;
    tbl.querySelectorAll('tbody tr').forEach(function(tr){
      if(tr.style.display==='none') return;
      var cb=tr.querySelector('.pm-cm-cb'); if(!cb) return;
      var k=cb.getAttribute('data-key');
      if(!k || k==='n:') return;
      cb.checked=t.checked;
      if(t.checked) selected.add(k); else selected.delete(k);
    });
    updateCounts();
  });

  document.addEventListener('click',function(e){
    var b=e.target.closest && e.target.closest('[data-cm-act]');
    if(b) act(b.getAttribute('data-cm-act'));
  });

  /* ===== رسالة المحظور في خانة التليفون + منع الطلب ===== */
  function isBlocked(phone,name){
    var blocked=blockedSet();
    var d=digits(phone), n=normName(name);
    return (d && blocked.has('p:'+d)) || (n && blocked.has('n:'+n));
  }
  window.pmIsCustBlocked=isBlocked;

  var PAIRS=[['cartPhone','cartNote'],['ptyPhone','ptyCust']];
  function markOne(ph,nm){
    if(!ph||!nm) return;
    var hint=ph.nextElementSibling;
    if(!hint || !hint.classList.contains('pm-phone-hint')) return;
    if(isBlocked(ph.value,nm.value)){
      hint.textContent='🚫 العميل محظور';
      hint.style.color='#B42318';
      hint.style.display='block';
      ph.style.borderColor='#B42318';
      nm.style.borderColor='#B42318';
      ph.dataset.pmBlk='1';
    } else if(ph.dataset.pmBlk==='1'){
      if(hint.textContent.indexOf('🚫')===0){ hint.style.display='none'; hint.textContent=''; }
      hint.style.color='';
      ph.style.borderColor=''; nm.style.borderColor='';
      ph.dataset.pmBlk='';
    }
  }
  function markAll(){ PAIRS.forEach(function(pr){ markOne(document.getElementById(pr[0]),document.getElementById(pr[1])); }); }
  PAIRS.forEach(function(pr){
    var ph=document.getElementById(pr[0]), nm=document.getElementById(pr[1]);
    if(!ph||!nm) return;
    ph.addEventListener('input',markAll);
    ph.addEventListener('change',markAll);
    nm.addEventListener('input',markAll);
  });
  setInterval(markAll,400);

  document.addEventListener('click',function(e){
    var t=e.target;
    var cart=t.closest && t.closest('#cartCheckout');
    var party=t.closest && t.closest('#ptyOk');
    if(!cart && !party) return;
    var ph=document.getElementById(cart?'cartPhone':'ptyPhone');
    var nm=document.getElementById(cart?'cartNote':'ptyCust');
    if(isBlocked(ph&&ph.value, nm&&nm.value)){
      e.stopImmediatePropagation(); e.preventDefault();
      alert('العميل محظور 🚫');
    }
  },true);

  TABLES.forEach(function(id){
    var t=document.getElementById(id);
    if(!t) return;
    new MutationObserver(function(){ decorate(t); updateCounts(); }).observe(t,{childList:true});
  });
  refreshAll();
  setInterval(refreshAll,2000);
})();
