/* ---- 093-ui-remember-tab.js ----
   يحفظ آخر تبويب فتحه المستخدم عند كل ضغطة على تبويب، حتى لو فشلت go() في منتصف التنفيذ.
   الاستعادة بتحصل في unlockApp (006) بعد تحميل البيانات، ومفتاح الحفظ واحد: pm_last_tab.
   ما بيغيّرش أي منطق عمل. */
(function(){
  try{
    document.addEventListener('click',function(e){
      var t=e.target;
      var tab=(t&&t.closest)?t.closest('.tab[data-tab]'):null;
      if(!tab) return;
      var id=tab.getAttribute('data-tab');
      if(!id) return;
      try{ localStorage.setItem('pm_last_tab',id) }catch(err){}
    },true);
  }catch(err){
    console.error('[PastryMY] 093-ui-remember-tab.js failed',err);
  }
})();
