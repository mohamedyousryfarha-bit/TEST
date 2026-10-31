(function(){
  if(window.__pmDiag) return; window.__pmDiag=true;
  var LOG_KEY='pm_diag_log';
  var QUIET=['get_state','verify_employee'];        // طلبات روتينية: مش بنعرضها ولا نسجلها
  var lastModalAt=0, lastMsg='';

  // يحوّل اسم الموديل لشكل مفهوم (SM-S911B ← Samsung SM-S911B)
  function prettyModel(m){
    m=String(m||'').trim();
    if(!m||m==='K') return '';
    if(/^SM-/i.test(m)) return 'Samsung '+m;
    return m;
  }
  // يطلع اسم الموديل من الـ User-Agent (أندرويد بيبعته غالبًا)
  function uaModel(){
    var ua=navigator.userAgent||'';
    var m=ua.match(/Android[^;]*;\s*([^;)]+?)\s*(?:Build\/|\))/);
    if(m) return prettyModel(m[1]);
    if(/iPhone/.test(ua)) return 'iPhone';
    if(/iPad/.test(ua)) return 'iPad';
    if(/Windows/.test(ua)) return 'كمبيوتر Windows';
    if(/Macintosh/.test(ua)) return 'Mac';
    return '';
  }
  // أندرويد الحديث بيخفي الموديل من الـ UA، فبنجيبه من userAgentData ونحفظه
  function cacheModel(){
    try{
      if(navigator.userAgentData && navigator.userAgentData.getHighEntropyValues){
        navigator.userAgentData.getHighEntropyValues(['model']).then(function(v){
          var pm=prettyModel(v&&v.model);
          if(pm) localStorage.setItem('pm_device_model',pm);
        }).catch(function(){});
      }
    }catch(e){}
  }
  function deviceName(){
    try{
      var custom=localStorage.getItem('pm_device_name');
      if(custom) return custom;
      var id=localStorage.getItem('pm_device_id');
      if(!id){ id=Math.random().toString(36).slice(2,6).toUpperCase(); localStorage.setItem('pm_device_id',id); }
      var model=localStorage.getItem('pm_device_model')||uaModel()||'جهاز';
      return model+' · '+id;
    }catch(e){ return 'جهاز غير معروف'; }
  }
  function platformName(){
    var ua=navigator.userAgent||'';
    return /Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(ua)?'Mac':'متصفح';
  }
  function activeTab(){
    var t=document.querySelector('.tabs .tab.active');
    var p=document.querySelector('.panel.active');
    return ((t&&t.textContent)||'').trim()+(p?' ['+p.id+']':'');
  }
  function who(){
    var role=(typeof cloudActorRole!=='undefined'&&cloudActorRole)||'—';
    var name=(typeof cloudActorName!=='undefined'&&cloudActorName)||'غير مسجل';
    return name+' ('+role+')';
  }
  function opContext(body){
    body=body||{};
    var c={};
    if(body.action) c['العملية']=body.action+(body.party_action?' / '+body.party_action:'')+(body.drink_action?' / '+body.drink_action:'');
    if(body.receipt_id) c['معرف الفاتورة']=body.receipt_id;
    if(body.order_id) c['معرف الأوردر']=body.order_id;
    if(Array.isArray(body.cart)) c['عدد أصناف السلة']=body.cart.length;
    return c;
  }
  function errorText(err){
    if(!err) return '';
    return String(err.message||err.code||err.error||err);
  }
  function fullReport(entry){
    var lines=[
      'الوقت: '+entry.time,
      'الجهاز: '+entry.device+' · '+entry.platform,
      'المستخدم: '+entry.who,
      'التبويب: '+entry.tab,
      'الإصدار السحابي المحلي: '+entry.localRevision
    ];
    Object.keys(entry.op||{}).forEach(function(k){ lines.push(k+': '+entry.op[k]); });
    if(entry.status) lines.push('كود الاستجابة: '+entry.status);
    lines.push('الرسالة: '+entry.message);
    return lines.join('\n');
  }
  function save(entry){
    try{
      var list=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');
      if(!Array.isArray(list)) list=[];
      list.unshift(entry);
      localStorage.setItem(LOG_KEY,JSON.stringify(list.slice(0,100)));
    }catch(e){}
  }
  function copyText(text,btn){
    var done=function(){ if(btn){ btn.textContent='تم النسخ ✓'; } };
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done,function(){ fallbackCopy(text); done(); }); return; }
    }catch(e){}
    fallbackCopy(text); done();
  }
  function fallbackCopy(text){
    var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
    ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove();
  }
  var SEEN_KEY='pm_diag_seen';
  function seenStore(){ try{ return JSON.parse(localStorage.getItem(SEEN_KEY)||'{}'); }catch(e){ return {}; } }
  function saveSeen(o){ try{ localStorage.setItem(SEEN_KEY,JSON.stringify(o)); }catch(e){} }
  function dayKey(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  // رسالة عربية بسيطة للموظف؛ التفاصيل التقنية بتفضل تحت
  function friendlyMsg(raw){
    var m=String(raw||'');
    if(/Failed to (send|fetch)|NetworkError|Load failed|network/i.test(m)) return 'المزامنة مع السحابة وقفت. اتأكد إن الإنترنت شغال وجرّب تاني.';
    if(/timeout|timed out|aborted/i.test(m)) return 'الاتصال بطيء ومش بيرد. جرّب تاني بعد شوية.';
    if(/JWT|401|403|expired|unauthori[sz]ed|permission/i.test(m)) return 'انتهت صلاحية الدخول أو مفيش صلاحية. سجّل خروج وادخل تاني.';
    if(/429|rate limit|too many/i.test(m)) return 'في طلبات كتير في وقت قصير. استنى دقيقة وجرّب تاني.';
    if(/\b5\d\d\b|server|internal/i.test(m)) return 'السيرفر مش متاح حالياً. جرّب تاني بعد شوية.';
    return 'حصلت مشكلة غير متوقعة. انسخ التفاصيل وابعتها للمدير.';
  }
  function retrySync(){
    var b=document.getElementById('pmSyncIcon');
    if(b){ b.click(); return true; }
    return false;
  }
  function showModal(entry){
    if(navigator.onLine===false) return;               // أوفلاين: بنسجل بس
    var key=String(entry.message||'').slice(0,160);
    var old=document.getElementById('pmDiagOv');
    if(old) old.remove();                              // كل خطأ بيفتح نافذة جديدة، من غير منع للتكرار
    lastModalAt=Date.now(); lastMsg=entry.message;

    var text=fullReport(entry);
    var ov=document.createElement('div'); ov.id='pmDiagOv'; ov.dataset.key=key;
    ov.innerHTML='<div class="pdg-box" role="alertdialog" aria-modal="true" aria-labelledby="pmDiagTitle">'+
      '<h3 id="pmDiagTitle">حصلت مشكلة</h3>'+
      '<p class="pdg-msg"></p>'+
      '<p class="pdg-dev">الجهاز: <b id="pmDiagName"></b></p>'+
      '<p class="pdg-cnt" id="pmDiagCnt" hidden></p>'+
      '<div class="pdg-acts">'+
        '<button type="button" id="pmDiagRetry" class="pdg-retry">إعادة المحاولة</button>'+
        '<button type="button" id="pmDiagWa" class="pdg-wa">إرسال للمدير</button>'+
        '<button type="button" id="pmDiagCopy" class="pdg-copy">نسخ التفاصيل</button>'+
        '<button type="button" id="pmDiagRename" class="pdg-ren">تسمية الجهاز</button>'+
        '<button type="button" id="pmDiagClose" class="pdg-close">إغلاق</button>'+
      '</div>'+
      '<details class="pdg-det"><summary>عرض التفاصيل التقنية</summary>'+
        '<textarea readonly id="pmDiagText" dir="auto"></textarea>'+
      '</details>'+
    '</div>';
    document.body.appendChild(ov);
    ov.querySelector('.pdg-msg').textContent=friendlyMsg(entry.message);
    ov.querySelector('#pmDiagCnt').hidden=true;
    ov.querySelector('#pmDiagText').value=text;
    ov.querySelector('#pmDiagName').textContent=entry.device;

    function close(){
      document.removeEventListener('keydown',onKey);
      ov.remove();
    }
    function onKey(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown',onKey);
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });   // الضغط على الخلفية يقفل

    ov.querySelector('#pmDiagClose').addEventListener('click',close);
    ov.querySelector('#pmDiagRetry').addEventListener('click',function(){
      close();
      retrySync();
    });
    ov.querySelector('#pmDiagWa').addEventListener('click',function(){
      var msg=ov.querySelector('#pmDiagText').value;
      window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
    });
    ov.querySelector('#pmDiagCopy').addEventListener('click',function(e){
      var btn=e.currentTarget, orig=btn.textContent;
      copyText(ov.querySelector('#pmDiagText').value,btn);
      setTimeout(function(){ btn.textContent=orig; },2000);
    });
    ov.querySelector('#pmDiagRename').addEventListener('click',function(){
      var n=prompt('اكتب اسم الجهاز (مثلاً: الكاشير، المطبخ، اللابتوب):', entry.device);
      if(n===null) return;
      n=String(n).trim().slice(0,40);
      if(!n) return;
      try{ localStorage.setItem('pm_device_name',n); }catch(e){}
      entry.device=n;
      ov.querySelector('#pmDiagName').textContent=n;
      ov.querySelector('#pmDiagText').value=fullReport(entry);
    });
  }

  function report(op,err,status,extra){
    var message=errorText(err)||'خطأ غير معروف';
    var entry={
      time:new Date().toLocaleString('ar-EG'),
      device:deviceName(), platform:platformName(),
      who:who(), tab:activeTab(),
      localRevision:(typeof cloudRevision!=='undefined'?cloudRevision:'—'),
      op:op||{}, status:status||'', message:message
    };
    if(extra) Object.keys(extra).forEach(function(k){ entry.op[k]=extra[k]; });
    try{
      entry.op['أصناف المنيو على الجهاز']=(typeof state!=='undefined'&&state&&Array.isArray(state.menu))?state.menu.length:'—';
      var q=JSON.parse(localStorage.getItem(KEY+'_pendingCloudSnapshot')||'null');
      if(q&&q.state) entry.op['أصناف المنيو في قائمة المزامنة المعلقة']=Array.isArray(q.state.menu)?q.state.menu.length:'—';
      var rec=localStorage.getItem('pm_last_recover');
      if(rec) entry.op['آخر استعادة من السحابة']=rec;
    }catch(e){}
    save(entry);
    showModal(entry);
  }

  cacheModel();
  // لما السيرفر يمنع الحفظ لأن المنيو هيبقى فاضي: الجهاز بيحمل نسخة قديمة/فاضية،
  // فبنرجّع النسخة اللي على السيرفر ونحفظ نسخة من المحلي قبل ما نستبدلها
  var lastRecover=0;
  function recoverFromCloud(){
    var now=Date.now();
    if(now-lastRecover<30000) return;
    lastRecover=now;
    try{ localStorage.setItem('pm_last_local_before_recover',JSON.stringify(state)); }catch(e){}
    orig({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin}).then(function(got){
      var d=got&&got.data;
      if((got&&got.error)||!d||!d.state) return;
      cloudLoading=true;
      try{ clearTimeout(cloudSaveTimer); }catch(e){}
      try{ clearTimeout(queuedSyncTimer); }catch(e){}
      try{ localStorage.removeItem(KEY+'_pendingCloudSnapshot'); }catch(e){}
      state=migrateStateUnits(d.state);
      try{ localStorage.setItem('pm_last_recover',new Date().toLocaleString('ar-EG')+' · منيو='+(Array.isArray(state.menu)?state.menu.length:0)); }catch(e){}
      cloudRevision=Number(d.revision||cloudRevision);
      cloudLastSavedHash=JSON.stringify(state);
      try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
      cloudLoading=false;
      if(typeof renderAll==='function') renderAll();
      alert('المنيو اتحدّث من السحابة. جرّب التعديل تاني.');
    }).catch(function(){ cloudLoading=false; });
  }

  // كل استدعاء للسيرفر: لو رجع خطأ نسجل تفاصيل السياق (من غير الـ PIN)
  var orig=window.apiCall;
  if(typeof orig==='function'){
    window.apiCall=function(body){
      var action=body&&body.action;
      var op=opContext(body);
      var quiet=QUIET.indexOf(action)>=0;
      var p;
      try{ p=orig.apply(this,arguments); }
      catch(e){ if(!quiet) report(op,e); throw e; }
      return Promise.resolve(p).then(function(r){
        if(!quiet && r && r.error){
          var st=r.error.context&&r.error.context.status;
          report(op,r.error,st);
          if(action==='save_state' && /المنيو هيبقى فاضي/.test(errorText(r.error))) recoverFromCloud();
        }
        return r;
      },function(e){
        if(!quiet) report(op,e);
        throw e;
      });
    };
  }

  // أخطاء JavaScript غير متوقعة: بنعرف في أي تبويب حصلت
  window.addEventListener('error',function(ev){
    var m=(ev&&ev.message)||'';
    if(/ResizeObserver/.test(m)) return;
    report({'الملف':(ev&&ev.filename||'').split('/').pop()+':'+(ev&&ev.lineno||'')},{message:m});
  });
  window.addEventListener('unhandledrejection',function(ev){
    var r=ev&&ev.reason;
    report({},{message:errorText(r)||'خطأ غير معالج'});
  });

  window.pmDiagLast=function(){ try{ return JSON.parse(localStorage.getItem(LOG_KEY)||'[]'); }catch(e){ return []; } };
})();
