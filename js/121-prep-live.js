/* مراحل التحضير على الشاشة الرئيسية للمدير: بتتحدّث من السحابة كل 5 ثواني (قراءة بس، ما بتغيّرش بيانات جهاز المدير) */
(function(){
  var STAGES=[['new','جديد'],['doing','جاري التحضير'],['ready','جاهز للتسليم']];
  var card=null, busy=false, data=null, err='', lastAt=0;
  function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}) }
  function isAdmin(){ return typeof cloudActorRole!=='undefined' && cloudActorRole==='admin' && typeof cloudReady!=='undefined' && !!cloudReady && !!cloudActorName && !!cloudActorPin }
  function mount(){
    var sec=document.getElementById('analytics');
    if(!sec) return null;
    if(!card){ card=document.createElement('div'); card.id='pmPrepLive'; card.className='pm-prep-live'; }
    if(card.parentNode!==sec || sec.firstElementChild!==card) sec.insertBefore(card, sec.firstElementChild);
    return card;
  }
  function fetchOrders(){
    if(busy || document.hidden || !isAdmin()) return;
    busy=true;
    Promise.resolve(apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin})).then(function(r){
      busy=false;
      if(!r || r.error || !r.data || !r.data.state){ err='تعذر تحديث المراحل، حاول تاني.'; }
      else { data=Array.isArray(r.data.state.orders)?r.data.state.orders:[]; err=''; lastAt=Date.now(); }
      render();
    }, function(){ busy=false; err='تعذر تحديث المراحل، حاول تاني.'; render(); });
  }
  function render(){
    var c=mount(); if(!c) return;
    if(!isAdmin()){ c.style.display='none'; return; }
    c.style.display='';
    var list=data||[];
    var boxes=STAGES.map(function(s){
      var rows=list.filter(function(o){ return o && (o.status||'new')===s[0] });
      var body=rows.length ? rows.map(function(o){ return '<div class="pmpl-row"><b>'+esc(o.name)+'</b><span>'+esc(Number(o.qty)||0)+' وزنة</span></div>' }).join('') : '<div class="pmpl-empty">لا يوجد</div>';
      return '<div class="pmpl-box pmpl-'+s[0]+'"><div class="pmpl-head"><b>'+s[1]+'</b><span class="pmpl-n">'+rows.length+'</span></div>'+body+'</div>';
    }).join('');
    var when=lastAt?new Date(lastAt).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';
    c.innerHTML='<div class="pmpl-top"><h3>مراحل التحضير</h3><button type="button" class="pmpl-refresh">تحديث</button></div>'+
      (err?'<div class="pmpl-err">'+esc(err)+'</div>':'')+
      '<div class="pmpl-grid">'+boxes+'</div><div class="pmpl-when">'+(when?'آخر تحديث: '+esc(when):'')+'</div>';
    var b=c.querySelector('.pmpl-refresh'); if(b) b.onclick=function(){ fetchOrders() };
  }
  setInterval(render, 2000);
  setInterval(fetchOrders, 5000);
  setTimeout(fetchOrders, 3000);
})();
