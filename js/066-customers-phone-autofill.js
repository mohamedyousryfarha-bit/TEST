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
        hint.style.color='#1E3A5F';
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
