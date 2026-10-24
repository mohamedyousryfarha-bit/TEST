(function(){
  var ORDER=['pmToolsGroup','pmScreenGroup','pmAboutGroup'];
  var GROUPS=[
    {id:'pmToolsGroup', title:'أدوات فحص واختبار', match:function(t){
      return ['فحص وإصلاح','فحص سلامة البيانات','اختبار الحسابات'].some(function(l){ return t.indexOf(l)===0; });
    }},
    {id:'pmScreenGroup', title:'إعدادات الشاشة', match:function(t){
      return t.indexOf('الوضع الليلي')===0 || t.indexOf('الوضع النهاري')===0 || t.indexOf('تحويل للوضع')===0 || t.indexOf('ملء الشاشة')>=0 || t.indexOf('إنهاء ملء الشاشة')>=0;
    }}
  ];
  function folder(box,id,title){
    var det=document.getElementById(id);
    if(!det){
      det=document.createElement('details'); det.id=id;
      det.innerHTML='<summary></summary><div class="pm-tg-body"></div>';
      det.querySelector('summary').textContent=title;
    }
    return det;
  }
  // الفولدرات دايماً فوق الزراير الفردية، وبترتيب ثابت
  function placeFolders(box){
    var kids=[].slice.call(box.children,0,ORDER.length).map(function(k){return k.id;});
    var present=ORDER.filter(function(id){ return document.getElementById(id) && box.contains(document.getElementById(id)); });
    var ok=present.every(function(id,i){ return kids[i]===id; });
    if(ok) return;
    for(var i=present.length-1;i>=0;i--){
      box.insertBefore(document.getElementById(present[i]), box.firstChild);
    }
  }
  function group(){
    var box=document.getElementById('drawerTools'); if(!box) return;
    GROUPS.forEach(function(g){
      var btns=[].filter.call(box.querySelectorAll('button'),function(b){
        return g.match((b.textContent||'').replace(/\s+/g,' ').trim());
      });
      if(!btns.length) return;
      var det=folder(box,g.id,g.title);
      if(!det.parentNode) box.appendChild(det);
      var body=det.querySelector('.pm-tg-body');
      btns.forEach(function(b){ if(b.parentNode!==body) body.appendChild(b); });
    });
    var card=[].filter.call(document.querySelectorAll('.card'),function(c){
      var h=c.querySelector('h2');
      return h && (h.textContent||'').replace(/\s+/g,' ').trim()==='معلومات النسخة الحالية';
    })[0];
    if(card && !box.contains(card)){
      var det=folder(box,'pmAboutGroup','معلومات النسخة الحالية');
      if(!det.parentNode) box.appendChild(det);
      det.querySelector('.pm-tg-body').appendChild(card);
    }
    placeFolders(box);
  }
  setTimeout(group,300);
  setInterval(group,800);
})();
