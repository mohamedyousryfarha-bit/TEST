/* الإعدادات ورقة مضغوطة في القايمة الجانبية: فيها الدعم الفني ونسخة الاسترداد وتحديث الصفحة وآخر نسخة سحابية.
   تسجيل الخروج بيتحط تحت القايمة الجانبية على طول */
(function(){
  var MOVE_TO_SETTINGS=['الدعم الفني','نسخة استرداد'];
  var SETTINGS_IDS=['retryCloudButton','reloadCloudButton'];
  function move(){
    var drawer=document.getElementById('sideDrawer'); if(!drawer) return false;
    var fold=document.getElementById('pmSettingsFold');
    if(!fold){
      fold=document.createElement('details'); fold.id='pmSettingsFold';
      var sum=document.createElement('summary');
      sum.textContent='الإعدادات';
      fold.appendChild(sum);
      var body=document.createElement('div'); body.id='pmSettingsBody';
      fold.appendChild(body);
      drawer.appendChild(fold);
    }
    var bodyEl=document.getElementById('pmSettingsBody');
    // زراير الإعدادات اللي جوه الشريط القديم
    SETTINGS_IDS.forEach(function(id){
      var b=document.getElementById(id);
      if(b && b.parentNode!==bodyEl) bodyEl.appendChild(b);
    });
    // الدعم الفني ونسخة الاسترداد من القايمة الجانبية
    drawer.querySelectorAll('button,a,[role="button"]').forEach(function(b){
      if(b.closest('#pmSettingsFold')) return;
      var t=(b.textContent||'').replace(/\s+/g,' ').trim();
      if(MOVE_TO_SETTINGS.some(function(l){ return t.indexOf(l)===0; })) bodyEl.appendChild(b);
    });
    // تسجيل الخروج تحت القايمة الجانبية
    var out=document.getElementById('signOutButton');
    if(out){
      if(out.parentNode!==drawer || drawer.lastElementChild!==out){
        drawer.appendChild(out);
      }
    }
    return true;
  }
  move();
  setInterval(move,700);
})();
