/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 046-sales-lock.js ---- */
try{
(function(){
  var HIDE_ACTS=['stock','devices'];
  var ADMIN_TOOLS=['فحص وإصلاح','نسخة استرداد'];
  function hideAdminTools(restricted){
    document.querySelectorAll('#pmFabs .pm-mi').forEach(function(b){
      var t=(b.textContent||'').trim();
      var isAdmin=ADMIN_TOOLS.some(function(l){ return t.indexOf(l)!==-1 });
      if(isAdmin && restricted) b.style.setProperty('display','none','important');
      else b.style.removeProperty('display');
    });
  }
  function apply(){
    var role = typeof cloudActorRole!=='undefined' ? cloudActorRole : '';
    var sales = role==='sales';
    document.body.classList.toggle('role-sales', sales);
    hideAdminTools(role==='sales' || role==='kitchen' || role==='barista');
    if(!sales) return;
    HIDE_ACTS.forEach(function(a){
      var b=document.querySelector('#pmDock [data-act="'+a+'"]');
      if(b) b.style.setProperty('display','none','important');
    });
  }
  setInterval(apply,300);
})();
}catch(e){console.error('[PastryMY] 046-sales-lock.js failed',e)}
/* ---- 052-sales-no-invoices.js ---- */
try{
(function(){
  window.__goPre=window.__goPre||[];
  window.__goPre.push(function(id){
    return (cloudActorRole==='sales' && id==='cartpage') ? 'menu' : id;
  });
})();
}catch(e){console.error('[PastryMY] 052-sales-no-invoices.js failed',e)}
