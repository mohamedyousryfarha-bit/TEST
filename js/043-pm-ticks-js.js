/* رسايل المدير اللي بعتها + علامات القراءة (✓✓ داكنة = لسه، ✓✓ خضرا = اتقرأت) */
(function(){
  function $(id){ return document.getElementById(id) }
  function esc(t){ var d=document.createElement('div'); d.textContent=String(t==null?'':t); return d.innerHTML }
  function ticks(read){
    return '<span class="pm-ticks '+(read?'read':'unread')+'" aria-label="'+(read?'اتقرأت':'لسه ما اتقراتش')+'">'+
      '<svg viewBox="0 0 17 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.5 4.5 10 11 2.5"/><path d="M6 6.5 9.5 10 16 2.5"/></svg></span>';
  }
  var KEY=function(){ return 'pm_sent_'+(typeof cloudActorName!=='undefined'?cloudActorName:'') };
  function localList(){ try{ return JSON.parse(localStorage.getItem(KEY())||'[]') }catch(e){ return [] } }
  function saveLocal(arr){ try{ localStorage.setItem(KEY(), JSON.stringify(arr)) }catch(e){} }

  // نسجل الرسالة محليًا لما الإرسال يتأكد من الخادم
  var pending=null;
  var sendBtn=$('pmMsgSend'), toEl=$('pmMsgTo'), bodyEl=$('pmMsgBody'), st=$('pmMsgStatus');
  if(sendBtn && toEl && bodyEl){
    sendBtn.addEventListener('click',function(){
      var to=toEl.value, body=bodyEl.value.trim();
      pending = (to && body) ? {to:to, body:body, at:new Date().toISOString()} : null;
    },true);
  }
  if(st){
    new MutationObserver(function(){
      if(pending && /تم إرسال/.test(st.textContent)){
        var arr=localList(); arr.unshift(pending); saveLocal(arr.slice(0,100));
        pending=null; load();
      }
    }).observe(st,{childList:true,characterData:true,subtree:true});
  }

  function box(){
    var host=$('pmMsgsSection'); if(!host) return null;
    var b=$('pmSentBox');
    if(!b){ b=document.createElement('div'); b.id='pmSentBox'; }
    if(b.parentNode!==host) host.appendChild(b);
    return b;
  }
  var filterMode='all', lastList=[], chipsBound=false;
  function labelOf(to){ return to==='all' ? 'كل الموظفين' : (to||'') }
  function render(list, note){
    if(list) lastList=list;
    var b=box(); if(!b) return;
    var all=lastList||[];
    var shown=all.filter(function(m){
      if(filterMode==='read') return !!m.read;
      if(filterMode==='unread') return !m.read;
      return true;
    });
    var chip=function(k,t){ return '<button type="button" class="pm-chip'+(filterMode===k?' on':'')+'" data-f="'+k+'">'+t+'</button>' };
    var html='<h4>الرسايل اللي بعتها</h4>';
    html+='<div class="pm-filters">'+chip('all','الكل')+chip('unread','لسه')+chip('read','اتقرأت')+'</div>';
    if(note) html+='<div class="pm-sent-empty">'+esc(note)+'</div>';
    if(!all.length) html+='<div class="pm-sent-empty">لسه ما بعتّش رسايل.</div>';
    else if(!shown.length) html+='<div class="pm-sent-empty">مفيش رسايل في الفلتر ده.</div>';
    shown.forEach(function(m){
      var rd=m.readers||[], read=!!m.read;
      var who = rd.length ? 'اتقرأت بواسطة: <b>'+rd.map(function(x){return esc(x)}).join('، ')+'</b>'
              : (read ? 'اتقرأت — أسماء القارئين مش متاحة من السيرفر' : 'لسه ما حدش قراها');
      html+='<div class="pm-sent-item">'+
        '<div class="pm-sent-row">'+ticks(read)+
        '<span class="to">'+esc(labelOf(m.to))+'</span>'+
        '<span class="body">'+esc(m.body)+'</span>'+
        '<span class="st">'+(read?'اتقرأت':'لسه')+'</span></div>'+
        '<div class="pm-readers">'+who+'</div>'+
        '</div>';
    });
    b.innerHTML=html;
    if(!chipsBound){
      chipsBound=true;
      b.addEventListener('click',function(e){
        var t=e.target && e.target.closest ? e.target.closest('[data-f]') : null;
        if(!t) return;
        filterMode=t.getAttribute('data-f'); render();
      });
    }
  }
  function readersOf(m){
    var r = m.read_by || m.readers || m.read_by_names || [];
    if(typeof r === 'string') r = [r];
    if(!Array.isArray(r)) return [];
    return r.map(function(x){ return typeof x === 'string' ? x : ((x && (x.employee_name || x.name)) || '') }).filter(Boolean);
  }
  function serverList(){
    return apiCall({action:'get_sent_messages',employee_name:cloudActorName,pin:cloudActorPin}).then(function(r){
      if(!r || r.error || !r.data || !Array.isArray(r.data.messages)) return null;
      return r.data.messages.map(function(m){
        var rd = readersOf(m);
        return {to:m.to_employee||m.to||'', body:m.body||'', readers:rd, read:rd.length>0 || !!m.read, at:m.created_at||''};
      });
    }).catch(function(){ return null });
  }
  function load(){
    var panel=$('pmBellPanel');
    if(!$('pmMsgsSection')) return;
    if(typeof cloudActorRole==='undefined' || cloudActorRole!=='admin' || !cloudReady){ var old=$('pmSentBox'); if(old) old.remove(); return; }
    serverList().then(function(srv){
      if(srv){
        srv.sort(function(a,b){ return String(b.at).localeCompare(String(a.at)) });
        render(srv, '');
      } else {
        // الخادم لسه ما فيهوش الـ action: نعرض اللي اتبعت من الجهاز ده، ومن غير علامة قراءة
        render(localList().map(function(m){ return {to:m.to, body:m.body, read:false} }), 'حالة القراءة هتظهر بعد تحديث الخادم.');
      }
    });
  }
  function watch(){
    var host=$('pmMsgsSection'); if(!host) return false;
    setInterval(load,5000);
    load();
    return true;
  }
  var t=setInterval(function(){ if(watch()) clearInterval(t) },400);
})();
