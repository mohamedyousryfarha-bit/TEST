(function(){
  var chip=document.getElementById('pmPresChip'); if(!chip)return;
  var txt=document.getElementById('pmPresText');
  function sync(){
    var t=(txt&&txt.textContent)||'';
    var m=t.match(/\((\d+)\)/);
    chip.setAttribute('data-count', m ? m[1] : '');
    chip.title='الحسابات المتصلة';
  }
  sync();
  setInterval(sync,1000);

  var menu=document.getElementById('pmPresMenu');
  if(menu){
    // نقلها لآخر الصفحة عشان مايتقصّش من أي حاوية في الصفحة
    document.body.appendChild(menu);
    // الضغط جوه القايمة مايقفلهاش
    menu.addEventListener('click',function(e){ e.stopPropagation(); });
  }
  function place(){
    if(!menu||menu.hidden)return;
    var r=chip.getBoundingClientRect();
    menu.style.top=(r.bottom+8)+'px';
    menu.style.right=Math.max(8, window.innerWidth-r.right)+'px';
    menu.style.left='auto';
  }
  if(menu){
    new MutationObserver(place).observe(menu,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,{passive:true});
    setInterval(place,400);
  }

  // أي ضغطة برا القايمة دي (زي الرسايل أو الترس) تقفلها
  document.addEventListener('click',function(e){
    var m=document.getElementById('pmPresMenu');
    if(!m||m.hidden)return;
    if(chip.contains(e.target)||m.contains(e.target))return;
    m.hidden=true;
    var b=document.getElementById('pmPresBtn');
    if(b)b.setAttribute('aria-expanded','false');
  },true);
})();
