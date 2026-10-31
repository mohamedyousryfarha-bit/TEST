/* ==================================================================
   PastryMY Pro · حارس الإقلاع (يعمل قبل أي كود آخر)
   - يفحص النسخة المحفوظة: لو تالفة ينقلها لنسخة آمنة ويشغّل التطبيق سليم
   - يكتشف الجلسة التي لم تُغلق بشكل سليم (انهيار) ليعرض خيارات الاستعادة
   - يحمي من امتلاء مساحة التخزين بدل أن يفشل الحفظ بصمت
   لا يمس أي منطق عمل، ولا يغيّر أي بيانات صحيحة.
   ================================================================== */
(function(){
  var KEY='pastryMY_mobile_final_v1';
  var B=window.__PM_BOOT__={repaired:false,backupKey:null,crashed:false,crashAt:0};

  /* 1) فحص النسخة المحفوظة */
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){
      var ok=false;
      try{
        var d=JSON.parse(raw);
        ok=!!(d&&typeof d==='object'&&!Array.isArray(d)
          &&d.recipes&&typeof d.recipes==='object'&&!Array.isArray(d.recipes)
          &&Array.isArray(d.inventory)&&Array.isArray(d.history)
          &&d.prices&&typeof d.prices==='object'&&!Array.isArray(d.prices));
      }catch(e){ ok=false }
      if(!ok){
        var bk=KEY+'__corrupt__'+Date.now();
        try{ localStorage.setItem(bk,raw) }catch(e){}
        try{ localStorage.removeItem(KEY); localStorage.removeItem(KEY+'_savedAt') }catch(e){}
        B.repaired=true; B.backupKey=bk;
      }
    }
  }catch(e){}

  /* 2) كشف الجلسة السابقة التي لم تُغلق بسلام */
  try{
    var flag=localStorage.getItem('pm_boot_session');
    if(flag&&flag!=='0'){ B.crashed=true; B.crashAt=Number(flag)||0; }
    localStorage.setItem('pm_boot_session',String(Date.now()));
  }catch(e){}

  /* 3) حفظ آمن عند امتلاء المساحة: يفرّغ اللقطات القديمة ثم يعيد المحاولة */
  var _set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
    try{ return _set.call(this,k,v) }
    catch(err){
      try{
        var kill=[];
        for(var i=0;i<localStorage.length;i++){ var key=localStorage.key(i); if(key&&(key.indexOf('pastryMY_snap')===0||key.indexOf(KEY+'__corrupt__')===0))kill.push(key) }
        kill.sort();
        for(var j=0;j<kill.length&&j<4;j++){ try{ localStorage.removeItem(kill[j]) }catch(e){} }
        try{ localStorage.removeItem('pastryMY_snapshots_v1') }catch(e){}
        return _set.call(this,k,v);
      }catch(e2){
        try{ window.__PM_STORAGE_FULL__=true }catch(e3){}
        throw err;
      }
    }
  };

  /* 4) راحة التبويب في الخلفية: مؤقتات تعديل الواجهة السريعة (<500ms) ما تشتغلش والتبويب مخفي.
     مؤقتات الشبكة والتنبيهات (≥1000ms) شغّالة زي ما هي. */
  (function(){
    var _si=window.setInterval;
    window.setInterval=function(fn,ms){
      if(typeof fn==='function'&&typeof ms==='number'&&ms>0&&ms<500){
        return _si.call(this,function(){ if(document.hidden)return; fn(); },ms);
      }
      return _si.apply(this,arguments);
    };
  })();

})();
