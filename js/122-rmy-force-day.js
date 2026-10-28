/* RMY brand lock: always use the light visual system */
(function(){
  function forceDay(){
    var root=document.documentElement;
    if(root.getAttribute('data-theme')!=='light') root.setAttribute('data-theme','light');
    try{ if(localStorage.getItem('pmTheme')!=='light') localStorage.setItem('pmTheme','light'); }catch(e){}
  }
  forceDay();
  if(window.MutationObserver) new MutationObserver(forceDay).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.__PM_THEME__=forceDay;
  window.toggleTheme=forceDay;
  // Remove any legacy theme actions that may be injected by optional UI modules.
  function removeThemeActions(){
    document.querySelectorAll('button,a,[role="menuitem"]').forEach(function(el){
      var t=(el.textContent||'').trim();
      if(/الوضع الليلي|الوضع النهاري|تبديل الوضع الليلي|تحويل للوضع الليلي|تحويل للوضع النهاري/.test(t)){
        var parent=el.closest('.pm-mi,.pm-pal-item,.settings-row,.setting-row');
        if(parent) parent.remove(); else el.remove();
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',removeThemeActions,{once:true}); else removeThemeActions();
  if(window.MutationObserver) new MutationObserver(removeThemeActions).observe(document.body,{childList:true,subtree:true});
})();
