(function(){
  function tick(){
    if(typeof cloudActorRole!=='undefined') document.body.dataset.role=cloudActorRole||'';
    document.querySelectorAll('.qa button[data-qa]').forEach(function(b){
      var t=document.querySelector('nav.tabs .tab[data-tab="'+b.dataset.qa+'"]');
      b.dataset.vis=(t&&t.style.display!=='none')?'1':'0';
    });
  }
  tick(); setInterval(tick,400);
})();
