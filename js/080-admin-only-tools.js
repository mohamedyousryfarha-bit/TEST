(function(){
  var ADMIN_ONLY=['فحص وإصلاح','فحص سلامة البيانات','اختبار الحسابات'];
  function isAdmin(){ return typeof cloudActorRole!=='undefined' && cloudActorRole==='admin'; }
  function apply(){
    var admin=isAdmin();
    var folder=document.getElementById('pmToolsGroup');
    if(folder){ if(admin) folder.style.removeProperty('display'); else folder.style.setProperty('display','none','important'); }
    document.querySelectorAll('.pm-mi, #drawerTools button, #pmFabs button, .pm-menu button').forEach(function(b){
      var t=(b.textContent||'').replace(/\s+/g,' ').trim();
      var hit=ADMIN_ONLY.some(function(l){ return t.indexOf(l)===0; });
      if(!hit) return;
      if(admin) b.style.removeProperty('display');
      else b.style.setProperty('display','none','important');
    });
  }
  setInterval(apply,700);
})();
