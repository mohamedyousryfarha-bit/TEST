/* تبويب "الرسايل للموظفين" جديد في الرئيسية: الكارت وقايمة الرسايل المبعوتة بيتحطوا فيه */
(function(){
  function isAdmin(){ return (typeof cloudActorRole!=='undefined' && cloudActorRole==='admin' && typeof cloudReady!=='undefined' && cloudReady) }
  function ensureSection(){
    var host=document.getElementById('pmMsgsSection');
    if(host) return host;
    var sec=document.createElement('section'); sec.id='msgsPanel'; sec.className='panel';
    sec.innerHTML='<div id="pmMsgsSection"></div>';
    var backup=document.getElementById('backup');
    if(backup && backup.parentNode) backup.parentNode.insertBefore(sec, backup.nextSibling);
    else { var main=document.querySelector('main.wrap'); if(main) main.appendChild(sec); }
    return document.getElementById('pmMsgsSection');
  }
  function ensureTab(){
    var b=document.querySelector('#appNav .tab[data-tab="msgsPanel"]');
    if(b) return b;
    var items=document.querySelector('#appNav .nav-items');
    if(!items) return null;
    b=document.createElement('button'); b.type='button'; b.className='tab'; b.setAttribute('data-tab','msgsPanel');
    b.innerHTML='<span class="tab-ico ui-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/></svg></span><span class="tab-lbl">الرسايل للموظفين</span>';
    b.onclick=function(){ if(typeof go==='function') go('msgsPanel') };
    items.insertBefore(b, items.children[1]||null);
    return b;
  }
  // زرار الرسايل في الشريط للمدير بيفتح التبويب الجديد مباشرة
  var bell=document.getElementById('pmBell');
  if(bell){
    bell.addEventListener('click',function(e){
      if(!isAdmin()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      var p=document.getElementById('pmBellPanel'); if(p) p.style.display='none';
      if(typeof go==='function') go('msgsPanel');
    },true);
  }
  function tick(){
    var host=ensureSection();
    var tab=ensureTab();
    var card=document.getElementById('pmMsgCard');
    if(card && card.parentNode!==host) host.appendChild(card);
    var adm=isAdmin();
    if(card){ card.style.display=adm?'':'none'; card.style.removeProperty('visibility'); }
    if(tab) tab.style.display=adm?'':'none';
  }
  setInterval(tick,300);
})();
