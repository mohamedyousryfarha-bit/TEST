/* تبديل الوضع الداكن / الفاتح من زر الهيدر (أيقونة فقط) */
(function(){
  var KEY='rmy-theme';
  var root=document.documentElement;
  function isDark(){ return root.getAttribute('data-theme')==='dark'; }
  function resetAutoColors(){
    /* إزالة الألوان اللي وضعها سكربتات التباين وقت الوضع الفاتح */
    document.querySelectorAll('[data-pm-auto-color]').forEach(function(el){
      el.style.removeProperty('color'); el.style.removeProperty('text-shadow');
      el.removeAttribute('data-pm-auto-color');
    });
    document.querySelectorAll('[data-pm-auto-bg]').forEach(function(el){
      el.style.removeProperty('background-color');
      el.removeAttribute('data-pm-auto-bg');
    });
  }
  function apply(dark){
    if(dark) root.setAttribute('data-theme','dark'); else root.removeAttribute('data-theme');
    var btn=document.getElementById('themeToggle');
    if(btn){
      btn.setAttribute('aria-pressed', dark?'true':'false');
      btn.setAttribute('title', dark?'الوضع الفاتح':'الوضع الداكن');
    }
    resetAutoColors();
    if(window.pmDarkGuard){ if(dark) window.pmDarkGuard.run(); else window.pmDarkGuard.reset(); }
  }
  function init(){
    var btn=document.getElementById('themeToggle');
    if(!btn) return;
    btn.setAttribute('aria-pressed', isDark()?'true':'false');
    btn.addEventListener('click',function(){
      var next=!isDark();
      try{ localStorage.setItem(KEY, next?'dark':'light'); }catch(e){}
      apply(next);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
