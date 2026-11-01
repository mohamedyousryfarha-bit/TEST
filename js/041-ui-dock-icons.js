(function(){
  var done=false;
  function place(){
    if(done)return;
    var dock=document.getElementById('pmDock'), msg=document.getElementById('pmMsgWrap'), gear=document.getElementById('pmGearWrap');
    var stock=dock&&dock.querySelector('[data-act="stock"]');
    if(!dock||!msg||!gear||!stock)return;
    dock.insertBefore(msg, stock);
    dock.insertBefore(gear, stock);
    function label(wrap,text){
      if(wrap.querySelector('.pmd-lbl'))return;
      var l=document.createElement('span'); l.className='pmd-lbl'; l.textContent=text; (wrap.querySelector('button')||wrap).appendChild(l);
    }
    label(msg,'الرسايل'); label(gear,'الإعدادات');
    // اللوحات المنسدلة تطلع فوق الشريط بدل ما تطلع تحت الشاشة
    [msg,gear].forEach(function(w){
      Array.prototype.forEach.call(w.children,function(ch){
        if(ch.tagName==='DIV'){
          ch.style.setProperty('position','fixed','important');
          ch.style.setProperty('top','auto','important');
          ch.style.setProperty('bottom','100px','important');
          ch.style.setProperty('left','12px','important');
          ch.style.setProperty('right','12px','important');
          ch.style.setProperty('width','auto','important');
          ch.style.setProperty('max-width','420px','important');
          ch.style.setProperty('margin','0 auto','important');
        }
      });
    });
    done=true;
  }
  var t=setInterval(function(){ place(); if(done) clearInterval(t) },300);
})();
