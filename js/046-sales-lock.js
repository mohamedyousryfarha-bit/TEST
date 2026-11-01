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
