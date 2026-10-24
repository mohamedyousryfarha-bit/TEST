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
