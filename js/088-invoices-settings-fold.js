/* دمج تلقائي لملفات متتالية من نفس الميزة بالترتيب الأصلي. كل جزء معزول بـ try/catch عشان فشل جزء ما يوقفش الباقي. */
/* ---- 088-invoices-settings-fold.js ---- */
try{
/* ضبط الفواتير: هيكل فاتورة المبيعات وهيكل فاتورة الحفلات في ورقة مضغوطة في القايمة الجانبية (للمدير بس) */
(function(){
  function move(){
    var drawer=document.getElementById('sideDrawer'); if(!drawer) return false;
    var fold=document.getElementById('pmInvFold');
    if(!fold){
      fold=document.createElement('details'); fold.id='pmInvFold';
      var sum=document.createElement('summary'); sum.textContent='ضبط الفواتير'; fold.appendChild(sum);
      var body=document.createElement('div'); body.id='pmInvFoldBody'; fold.appendChild(body);
      var sf=document.getElementById('pmSettingsFold');
      if(sf) drawer.insertBefore(fold,sf); else drawer.appendChild(fold);
    }
    var bodyEl=document.getElementById('pmInvFoldBody');
    var a=document.getElementById('pmInvTab'); if(a && a.parentNode!==bodyEl) bodyEl.appendChild(a);
    var p=document.querySelector('#partiesGroup .tab[data-tab="partyTemplate"]'); if(p && p.parentNode!==bodyEl) bodyEl.appendChild(p);
    return true;
  }
  move();
  setInterval(move,700);
})();
}catch(e){console.error('[PastryMY] 088-invoices-settings-fold.js failed',e)}
/* ---- 089-admin-maintenance-fold.js ---- */
try{
/* وضع الصيانة: في ورقة مضغوطة في القايمة الجانبية عشان المساحة */
(function(){
  function move(){
    var drawer=document.getElementById('sideDrawer'); if(!drawer) return false;
    var fold=document.getElementById('pmMaintFold');
    if(!fold){
      fold=document.createElement('details'); fold.id='pmMaintFold';
      var sum=document.createElement('summary'); sum.textContent='وضع الصيانة'; fold.appendChild(sum);
      var body=document.createElement('div'); body.id='pmMaintFoldBody'; fold.appendChild(body);
      var inv=document.getElementById('pmInvFold');
      var sf=document.getElementById('pmSettingsFold');
      if(inv && inv.parentNode===drawer) drawer.insertBefore(fold,inv.nextSibling);
      else if(sf) drawer.insertBefore(fold,sf);
      else drawer.appendChild(fold);
    }
    var bodyEl=document.getElementById('pmMaintFoldBody');
    var row=document.getElementById('pmMaintRow');
    if(row && row.parentNode!==bodyEl) bodyEl.appendChild(row);
    return true;
  }
  move();
  setInterval(move,700);
})();
}catch(e){console.error('[PastryMY] 089-admin-maintenance-fold.js failed',e)}
/* ---- 090-ui-folds-placement.js ---- */
try{
/* الثلاث ورقات تفضل تحت الثلاث مجموعات مباشرة جوه أدوات القايمة */
(function(){
  var FOLDS=['pmInvFold','pmMaintFold','pmSettingsFold'];
  function place(){
    var box=document.getElementById('drawerTools'); if(!box) return;
    var anchor=document.getElementById('pmAboutGroup');
    if(!anchor || anchor.parentNode!==box) return;
    var prev=anchor;
    FOLDS.forEach(function(id){
      var f=document.getElementById(id); if(!f) return;
      if(f.parentNode!==box || f.previousElementSibling!==prev){
        box.insertBefore(f, prev.nextSibling);
      }
      prev=f;
    });
  }
  place();
  setInterval(place,700);
})();
}catch(e){console.error('[PastryMY] 090-ui-folds-placement.js failed',e)}
