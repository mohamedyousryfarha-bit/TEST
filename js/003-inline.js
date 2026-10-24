(function(){
  function fixGroups(){
    document.querySelectorAll('#appNav .nav-group').forEach(function(g){
      var any=[].some.call(g.querySelectorAll('.tab'),function(b){return getComputedStyle(b).display!=='none'});
      g.style.display=any?'':'none';
    });
  }
  fixGroups(); setInterval(fixGroups,800);
})();
