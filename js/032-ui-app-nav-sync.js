(function(){
  var nav=document.getElementById('appNav');
  function sync(){
    var open=!!document.querySelector('.panel.active');
    document.body.classList.toggle('pm-view',open);
  }
  // شاشة البداية: مفيش قسم مفتوح
  document.querySelectorAll('.panel.active').forEach(function(p){p.classList.remove('active')});
  document.getElementById('pmBack').addEventListener('click',function(){
    document.querySelectorAll('.panel.active').forEach(function(p){p.classList.remove('active')});
    document.querySelectorAll('.tab.active').forEach(function(t){t.classList.remove('active')});
    sync(); window.scrollTo({top:0,behavior:'smooth'});
  });
  if(nav) nav.addEventListener('click',function(e){
    if(e.target.closest('button')){ setTimeout(function(){sync();window.scrollTo({top:0})},40); }
  });
  setInterval(sync,300); sync();
})();
