/* الإعدادات ورقة مضغوطة في القايمة الجانبية: فيها الدعم الفني ونسخة الاسترداد وتحديث الصفحة وآخر نسخة سحابية.
   تسجيل الخروج بيتحط تحت القايمة الجانبية على طول.
   الإعدادات بتظهر للمدير بس. "آخر نسخة سحابية" بتظهر لكل الأقسام في القايمة الجانبية. */
(function(){
  var MOVE_TO_SETTINGS=['الدعم الفني','نسخة استرداد'];
  function isAdmin(){ return (typeof cloudActorRole!=='undefined' ? cloudActorRole : '') === 'admin'; }
  function ensureStyle(){
    if(document.getElementById('pmRoleGateStyle')) return;
    var st=document.createElement('style'); st.id='pmRoleGateStyle';
    st.textContent='body.pm-not-admin #pmGearWrap,body.pm-not-admin #pmSettingsFold,body.pm-not-admin #retryCloudButton{display:none!important}';
    document.head.appendChild(st);
  }
  function move(){
    var drawer=document.getElementById('sideDrawer'); if(!drawer) return false;
    ensureStyle();
    var admin=isAdmin();
    document.body.classList.toggle('pm-not-admin', !admin);

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

    // زراير الإعدادات اللي جوه الشريط القديم: المدير بس يشوف "تحديث الصفحة" و"آخر نسخة سحابية" هنا
    var settingsIds = admin ? ['retryCloudButton','reloadCloudButton'] : ['retryCloudButton'];
    settingsIds.forEach(function(id){
      var b=document.getElementById(id);
      if(b && b.parentNode!==bodyEl) bodyEl.appendChild(b);
    });

    // الدعم الفني ونسخة الاسترداد من القايمة الجانبية (تتخبي للغير)
    drawer.querySelectorAll('button,a,[role="button"]').forEach(function(b){
      if(b.closest('#pmSettingsFold')) return;
      var t=(b.textContent||'').replace(/\s+/g,' ').trim();
      if(MOVE_TO_SETTINGS.some(function(l){ return t.indexOf(l)===0; })) bodyEl.appendChild(b);
    });

    // آخر نسخة سحابية: لغير المدير تفضل ظاهرة في القايمة الجانبية نفسها
    if(!admin){
      var rb=document.getElementById('reloadCloudButton');
      if(rb){
        var out0=document.getElementById('signOutButton');
        var wantBefore = (out0 && out0.parentNode===drawer) ? out0 : null;
        if(rb.parentNode!==drawer || (wantBefore && rb.nextElementSibling!==wantBefore)){
          drawer.insertBefore(rb, wantBefore);
        }
      }
    }

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
