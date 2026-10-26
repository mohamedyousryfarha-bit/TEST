(function(){
  var body=document.body, timer=null, presenceCh=null, myKey=null, wasUnlocked=false;
  var header=document.querySelector('header');
  function isUnlocked(){return !body.classList.contains('auth-required')}

  /* ---- شريط الحالة ---- */
  var bar=document.createElement('div');
  bar.id='pmLiveBar'; bar.className='pm-live';
  bar.innerHTML='<div class="pm-live-chip" id="pmSyncChip"><span class="pm-dot"></span><span id="pmSyncText">حالة التحديث: —</span></div>'+
                '<div class="pm-live-chip pres" id="pmPresChip"><span class="pm-dot"></span><span id="pmPresText">الحسابات المتصلة: —</span></div>';
  var main=document.querySelector('main.wrap');
  if(main) main.insertBefore(bar,main.firstChild);

  function syncFromLocal(){
    var el=document.getElementById('localSaveStatus'); if(!el)return;
    var sp=el.querySelectorAll('span'); var msg=sp[1]?sp[1].textContent:'';
    document.getElementById('pmSyncText').textContent='حالة التحديث: '+msg;
    document.getElementById('pmSyncChip').classList.toggle('err',el.classList.contains('err'));
  }
  var ls=document.getElementById('localSaveStatus');
  if(ls) new MutationObserver(syncFromLocal).observe(ls,{childList:true,subtree:true,characterData:true,attributes:true});
  syncFromLocal();

  /* ---- الحسابات المتصلة (Supabase Realtime Presence) ---- */
  function deviceLabel(){
    var u=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/.test(u))return 'آيفون';
    if(/Android/.test(u))return 'أندرويد';
    if(/Windows/.test(u))return 'ويندوز';
    if(/Macintosh|Mac OS/.test(u))return 'ماك';
    return 'متصفح';
  }
  function roleLabel(r){return r==='admin'?'مدير':(r==='kitchen'?'المطبخ':(r==='barista'?'الباريستا':'موظف'))}
  function renderPresence(){
    var el=document.getElementById('pmPresText'); if(!el)return;
    if(!presenceCh){
      el.textContent='الحسابات المتصلة: '+(isUnlocked()&&typeof cloudClient!=='undefined'&&!cloudClient?'وضع محلي':'—');
      if(window.pmRenderPresList)window.pmRenderPresList([],null);
      return;
    }
    var st=presenceCh.presenceState(), list=[];
    Object.keys(st).forEach(function(k){ (st[k]||[]).forEach(function(m){ list.push({key:k,m:m}) }) });
    if(!list.length){ el.textContent='الحسابات المتصلة: لا أحد'; if(window.pmRenderPresList)window.pmRenderPresList([],myKey); return; }
    var parts=list.map(function(x){
      var me=(x.key===myKey)?' (أنت)':'';
      return (x.m.name||'—')+' · '+roleLabel(x.m.role)+' · '+(x.m.device||'')+me;
    });
    el.textContent='الحسابات المتصلة ('+list.length+')'; if(window.pmRenderPresList)window.pmRenderPresList(list,myKey);
  }
  function startPresence(){
    if(presenceCh)return;
    if(typeof cloudClient==='undefined'||!cloudClient){ renderPresence(); return; }
    myKey=(cloudActorName||'user')+'-'+Math.random().toString(36).slice(2,8);
    presenceCh=cloudClient.channel('pastrymy-presence',{config:{presence:{key:myKey}}});
    presenceCh.on('presence',{event:'sync'},renderPresence).subscribe(function(st){
      if(st==='SUBSCRIBED'){
        presenceCh.track({name:cloudActorName||'—',role:cloudActorRole||'',device:deviceLabel(),since:Date.now()});
      }else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'){
        var el=document.getElementById('pmPresText'); if(el)el.textContent='الحسابات المتصلة: غير متاح حالياً';
      }
    });
    renderPresence();
  }
  function stopPresence(){
    if(presenceCh&&cloudClient){ try{ cloudClient.removeChannel(presenceCh) }catch(e){} }
    presenceCh=null; renderPresence();
  }

  /* ---- تصغير الهيدر بعد 10 ثوانٍ من الدخول ---- */
  function onUnlocked(){
    clearTimeout(timer);
    body.classList.remove('hdr-mini');
    timer=setTimeout(function(){ body.classList.add('hdr-mini') },10000);
    startPresence();
  }
  function onLocked(){ clearTimeout(timer); body.classList.remove('hdr-mini'); stopPresence(); }
  new MutationObserver(function(){
    var u=isUnlocked();
    if(u&&!wasUnlocked)onUnlocked();
    if(!u&&wasUnlocked)onLocked();
    wasUnlocked=u;
  }).observe(body,{attributes:true,attributeFilter:['class']});
  if(header) header.addEventListener('click',function(){
    if(!isUnlocked())return;
    clearTimeout(timer);
    body.classList.toggle('hdr-mini');
  });
  wasUnlocked=isUnlocked();
  if(wasUnlocked)onUnlocked();
})();
