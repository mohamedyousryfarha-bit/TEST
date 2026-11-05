/* ---- 147-menu-admin-collapse.js ----
   إدارة المنيو: كارت قابل للطي والفتح لتوفير مساحة.
   الحالة (مطوية/مفتوحة) بتتحفظ على الجهاز. الضغط على العنوان بيفتح/يقفل. */
(function(){
  'use strict';
  var KEY='pm_menu_admin_collapsed';
  var CSS=
    '#menuAdminCard.pm-collapsible>h2{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;user-select:none;margin-bottom:0}'+
    '#menuAdminCard.pm-collapsible>h2::after{content:"\u25BE";font-size:14px;font-weight:700;color:#0067B8;flex:0 0 auto}'+
    '#menuAdminCard.pm-collapsible.pm-collapsed>h2::after{content:"\u25B8"}'+
    '#menuAdminCard.pm-collapsible.pm-collapsed>:not(h2){display:none!important}';

  function injectCss(){
    if(document.getElementById('pmMenuAdminCollapseCss')) return;
    var st=document.createElement('style'); st.id='pmMenuAdminCollapseCss'; st.textContent=CSS;
    document.head.appendChild(st);
  }
  function setState(card,collapsed){
    card.classList.toggle('pm-collapsed',collapsed);
    var h=card.querySelector(':scope > h2');
    if(h) h.setAttribute('aria-expanded',String(!collapsed));
  }
  function init(){
    var card=document.getElementById('menuAdminCard');
    if(!card||card.dataset.collapseInit==='1') return;
    var h=card.querySelector(':scope > h2');
    if(!h) return;
    card.dataset.collapseInit='1';
    injectCss();
    card.classList.add('pm-collapsible');
    h.setAttribute('role','button');
    h.setAttribute('tabindex','0');
    var collapsed=false;
    try{ collapsed=localStorage.getItem(KEY)==='1'; }catch(e){}
    setState(card,collapsed);
    function toggle(){
      collapsed=!collapsed;
      try{ localStorage.setItem(KEY,collapsed?'1':'0'); }catch(e){}
      setState(card,collapsed);
    }
    h.addEventListener('click',toggle);
    h.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
