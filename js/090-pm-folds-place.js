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
