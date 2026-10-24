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
    if(body.expected_revision!=null) c['الإصدار المتوقع']=body.expected_revision;
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
  function showModal(entry){
    var now=Date.now();
    if(document.getElementById('pmDiagOv')||now-lastModalAt<3000) return;
    if(navigator.onLine===false) return;               // أوفلاين: بنسجل بس، من غير مودال كل مرة
    if(entry.message===lastMsg && now-lastModalAt<60000) return; // نفس الرسالة متكررة: مش هنعرضها تاني فورًا
    lastModalAt=now; lastMsg=entry.message;
    var text=fullReport(entry);
    var ov=document.createElement('div'); ov.id='pmDiagOv';
    ov.innerHTML='<div class="pdg-box" role="alertdialog" aria-modal="true">'+
      '<h3>حصلت مشكلة</h3>'+
      '<p>الجهاز: <b id="pmDiagName"></b></p>'+
      '<p>'+(entry.message||'')+'</p>'+
      '<p class="small" style="font-size:12px">انسخ التفاصيل دي وابعتها للمدير، وفيها اسم الجهاز والتبويب والفاتورة.</p>'+
      '<textarea readonly id="pmDiagText"></textarea>'+
      '<div class="pdg-acts">'+
        '<button type="button" id="pmDiagCopy" style="background:#7E4728;color:#fff">نسخ التفاصيل</button>'+
        '<button type="button" id="pmDiagRename" style="background:#F5EFEB;color:#3E2415">تسمية الجهاز</button>'+
        '<button type="button" id="pmDiagClose" style="background:#F5EFEB;color:#3E2415">إغلاق</button>'+
      '</div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#pmDiagText').value=text;
    ov.querySelector('#pmDiagName').textContent=entry.device;
    ov.querySelector('#pmDiagClose').addEventListener('click',function(){ ov.remove(); });
    ov.querySelector('#pmDiagCopy').addEventListener('click',function(e){ copyText(ov.querySelector('#pmDiagText').value,e.currentTarget); });
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
