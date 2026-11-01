(function(){
  var b=document.body;
  function upd(){
    var y=window.scrollY||document.documentElement.scrollTop||0;
    if(!b.classList.contains('hdr-scrolled')&&y>40) b.classList.add('hdr-scrolled');
    else if(b.classList.contains('hdr-scrolled')&&y<12) b.classList.remove('hdr-scrolled');
  }
  window.addEventListener('scroll',upd,{passive:true});
  upd();
})();
