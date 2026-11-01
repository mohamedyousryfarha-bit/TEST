/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 009-cloud-live-presence.js ---- */
try{
(function(){
  var body=document.body, timer=null, presenceCh=null, myKey=null, wasUnlocked=false;
  var header=document.querySelector('header');
  function isUnlocked(){return !body.classList.contains('auth-required')}

  /* ---- شريط الحالة ---- */
  var bar=document.createElement('div');
  bar.id='pmLiveBar'; bar.className='pm-live';
  bar.innerHTML='<div class="pm-live-chip pres" id="pmPresChip"><span class="pm-dot"></span><span id="pmPresText">الحسابات المتصلة: —</span></div>';
  var main=document.querySelector('main.wrap');
  /* ---- أيقونة المزامنة جنب زر القائمة ---- */
  var st=document.createElement('style');
  st.textContent+='#pmSyncIcon{position:absolute!important;top:50%;left:62px;transform:translateY(-50%);width:40px;height:40px;min-width:40px;margin:0;padding:0;border:0;border-radius:13px;background:rgba(255,255,255,.2);color:#7CFC9A;display:grid;place-items:center;cursor:pointer;z-index:3;backdrop-filter:blur(6px);transition:width .25s ease,height .25s ease,border-radius .25s ease,min-width .25s ease,left .25s ease}'+'#pmSyncIcon svg{width:24px;height:24px;display:block;stroke-width:2.4}'+'body.hdr-scrolled #pmSyncIcon{left:58px;width:36px;height:36px;min-width:36px;border-radius:11px}'+'body.hdr-scrolled #pmSyncIcon svg{width:22px;height:22px}'+'body.auth-required #pmSyncIcon{display:none!important}';
  st.textContent+='@keyframes pmBob{from{transform:translateY(2px)}to{transform:translateY(-2px)}}'+'#pmSyncIcon svg{overflow:visible}'+'#pmSyncIcon .pm-cloud,#pmSyncIcon .pm-ck,#pmSyncIcon .pm-cx{transition:opacity .35s ease,transform .35s ease;transform-origin:12px 12px}'+'#pmSyncIcon .pm-ck,#pmSyncIcon .pm-cx{opacity:0;transform:scale(.4)}'+'#pmSyncIcon[data-s="busy"] .pm-arrow{animation:pmBob .8s ease-in-out infinite alternate}'+'#pmSyncIcon[data-s="err"] .pm-cloud{opacity:0;transform:scale(.6)}'+'#pmSyncIcon[data-s="ok"] .pm-cloud{opacity:1;transform:scale(1);fill:currentColor}'+'#pmSyncIcon[data-s="ok"] .pm-ck{opacity:0;transform:scale(.4)}'+'#pmSyncIcon[data-s="err"] .pm-cx{opacity:1;transform:scale(1)}';
  document.head.appendChild(st);
  var syncIcon=document.createElement('button');
  syncIcon.type='button'; syncIcon.id='pmSyncIcon'; syncIcon.setAttribute('aria-label','حالة المزامنة'); syncIcon.title='حالة التحديث';
  syncIcon.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="pm-cloud" d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.5 3.5 3.5 0 0 0 7 18z"/><g class="pm-arrow"><path d="M12 16V11M9.6 13.4L12 11l2.4 2.4"/></g><path class="pm-ck" d="M6.8 12.6l3.4 3.4L17.2 8.6"/><path class="pm-cx" d="M7.5 7.5l9 9M16.5 7.5l-9 9"/></svg>';
  document.querySelector('header').appendChild(syncIcon);
  syncIcon.addEventListener('click',function(){ alert(syncIcon.title); });
  if(main) main.insertBefore(bar,main.firstChild);

  function syncFromLocal(){
    var el=document.getElementById('localSaveStatus'); if(!el)return;
    var sp=el.querySelectorAll('span'); var msg=sp[1]?sp[1].textContent:'';
    var icon=document.getElementById('pmSyncIcon');
    if(icon){
      var err=el.classList.contains('err');
      var busy=!err && /جاري|حفظ|مزامن|تحميل/.test(msg);
      icon.title='حالة التحديث: '+msg;
      icon.setAttribute('data-s',err?'err':(busy?'busy':'ok'));
      icon.style.color=err?'#B3261E':(busy?'#0067B8':'#4ADE80');
      icon.style.animation='none';
    }
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
}catch(e){console.error('[PastryMY] 009-cloud-live-presence.js failed',e)}
/* ---- 017-cloud-presence-chip.js ---- */
try{
(function(){
  var chip=document.getElementById('pmPresChip'); if(!chip)return;
  var ROLE={admin:'مدير',kitchen:'المطبخ',sales:'المبيعات',barista:'الباريستا',employee:'موظف'};
  var CLS={admin:'r-admin',kitchen:'r-kitchen',sales:'r-sales',barista:'r-barista',employee:'r-employee'};
  var lastList=[], lastMe=null, tick=null;

  var btn=document.createElement('button');
  btn.type='button'; btn.id='pmPresBtn'; btn.className='pm-pres-btn';
  btn.setAttribute('aria-haspopup','true'); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-controls','pmPresMenu');
  btn.title='عرض الأجهزة المتصلة';
  btn.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  var menu=document.createElement('div');
  menu.id='pmPresMenu'; menu.className='pm-pres-menu'; menu.setAttribute('role','menu'); menu.hidden=true;

  chip.appendChild(btn);
  chip.appendChild(menu);

  function ago(ts){
    if(!ts)return '';
    var m=Math.max(0,Math.round((Date.now()-Number(ts))/60000));
    if(m<1)return 'متصل الآن';
    if(m<60)return 'متصل منذ '+m+' د';
    var h=Math.round(m/60);
    if(h<24)return 'متصل منذ '+h+' س';
    return 'متصل منذ '+Math.round(h/24)+' يوم';
  }

  function render(){
    var rows=lastList.map(function(x){
      var m=x.m||{}, name=String(m.name||'—'), me=(x.key===lastMe);
      var role=ROLE[m.role]||'موظف';
      var meta=[role, m.device||'', ago(m.since)].filter(Boolean).join(' · ');
      return '<div class="pm-pres-row" role="menuitem">'+
        '<span class="pm-av '+(CLS[m.role]||'r-employee')+'">'+esc(name.trim().charAt(0)||'؟')+'</span>'+
        '<div class="pm-pres-info"><div class="pm-pres-name"><span class="t">'+esc(name)+'</span>'+
        (me?'<span class="pm-pres-me">هذا الجهاز</span>':'')+'</div>'+
        '<div class="pm-pres-meta">'+esc(meta)+'</div></div>'+
        '<span class="pm-pres-live" title="متصل"></span></div>';
    }).join('');
    menu.innerHTML='<div class="pm-pres-head"><span>الأجهزة المتصلة الآن</span><span class="pm-pres-count">'+lastList.length+'</span></div>'+
      (rows||'<div class="pm-pres-empty">لا توجد أجهزة متصلة الآن</div>')+
      '<div class="pm-pres-foot">يتم التحديث تلقائيًا</div>';
  }

  function setOpen(open){
    menu.hidden=!open;
    btn.setAttribute('aria-expanded',open?'true':'false');
    clearInterval(tick);
    if(open){ render(); tick=setInterval(render,30000); }
  }

  btn.addEventListener('click',function(e){ e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click',function(e){ if(!menu.hidden && !chip.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !menu.hidden){ setOpen(false); btn.focus(); } });

  // بيتنادى من تحديث الحضور (presence) في التطبيق
  window.pmRenderPresList=function(list,myKey){
    lastList=Array.isArray(list)?list:[];
    lastMe=myKey;
    window.pmPresData={list:lastList,me:lastMe};
    if(!menu.hidden) render();
    if(window.pmDevRender) window.pmDevRender();
  };
})();

/* --- مدموج من 031-cloud-presence-icon.js (نفس الترتيب الأصلي: بعد 017) --- */
(function(){
  var chip=document.getElementById('pmPresChip'); if(!chip)return;
  var txt=document.getElementById('pmPresText');
  function sync(){
    var t=(txt&&txt.textContent)||'';
    var m=t.match(/\((\d+)\)/);
    chip.setAttribute('data-count', m ? m[1] : '');
    chip.title='الحسابات المتصلة';
  }
  sync();
  setInterval(sync,1000);

  var menu=document.getElementById('pmPresMenu');
  if(menu){
    // نقلها لآخر الصفحة عشان مايتقصّش من أي حاوية في الصفحة
    document.body.appendChild(menu);
    // الضغط جوه القايمة مايقفلهاش
    menu.addEventListener('click',function(e){ e.stopPropagation(); });
  }
  function place(){
    if(!menu||menu.hidden)return;
    var r=chip.getBoundingClientRect();
    menu.style.top=(r.bottom+8)+'px';
    menu.style.right=Math.max(8, window.innerWidth-r.right)+'px';
    menu.style.left='auto';
  }
  if(menu){
    new MutationObserver(place).observe(menu,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,{passive:true});
    setInterval(place,400);
  }

  // أي ضغطة برا القايمة دي (زي الرسايل أو الترس) تقفلها
  document.addEventListener('click',function(e){
    var m=document.getElementById('pmPresMenu');
    if(!m||m.hidden)return;
    if(chip.contains(e.target)||m.contains(e.target))return;
    m.hidden=true;
    var b=document.getElementById('pmPresBtn');
    if(b)b.setAttribute('aria-expanded','false');
  },true);
})();
}catch(e){console.error('[PastryMY] 017-cloud-presence-chip.js failed',e)}
