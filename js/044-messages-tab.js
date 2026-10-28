/* "رسايل للموظفين" بقت جوه القايمة المنبثقة لأيقونة الرسايل في الشريط السفلي (مش صفحة مستقلة) */
(function(){
  function isAdmin(){ return (typeof cloudActorRole!=='undefined' && cloudActorRole==='admin' && typeof cloudReady!=='undefined' && cloudReady) }
  // الحاوية بتتحط أول القايمة المنبثقة (pmBellPanel) قبل الوارد
  function ensureHost(){
    var panel=document.getElementById('pmBellPanel');
    if(!panel) return null;
    var host=document.getElementById('pmMsgsSection');
    if(!host){ host=document.createElement('div'); host.id='pmMsgsSection'; }
    if(host.parentNode!==panel || panel.firstElementChild!==host) panel.insertBefore(host, panel.firstChild);
    return host;
  }
  function tick(){
    var host=ensureHost();
    var card=document.getElementById('pmMsgCard');
    var adm=isAdmin();
    var panel=document.getElementById('pmBellPanel');
    if(panel) panel.classList.toggle('pm-admin', adm);
    if(!host) return;
    if(card && card.parentNode!==host) host.appendChild(card);
    if(card){ card.style.display=adm?'':'none'; card.style.removeProperty('visibility'); }
  }
  setInterval(tick,300);
  tick();
})();
