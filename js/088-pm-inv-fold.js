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
