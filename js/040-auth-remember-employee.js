/* يفتكر آخر موظف دخل من الجهاز ويفتح خطوة الـ PIN له علطول (الاسم بس، مش الـ PIN) */
(function(){
  var KEY='pm_last_emp', done=false;
  var grid=document.getElementById('staffGrid'), staffStep=document.getElementById('staffStep'), pane=document.getElementById('employeePane');
  if(!grid||!staffStep||!pane)return;
  grid.addEventListener('click',function(e){
    var c=e.target.closest('.staff-card'); if(!c)return;
    var n=c.querySelector('b'); if(n){ try{ localStorage.setItem(KEY,n.textContent) }catch(_){} }
  },true);
  function tryAuto(){
    if(done) return;
    if(!document.body.classList.contains('auth-required')){ done=true; return; }
    if(pane.classList.contains('hide') || staffStep.classList.contains('hide')) return;
    var cards=grid.querySelectorAll('.staff-card'); if(!cards.length) return;
    done=true;
    var last=''; try{ last=localStorage.getItem(KEY)||'' }catch(_){}
    if(!last) return;
    for(var i=0;i<cards.length;i++){
      var n=cards[i].querySelector('b');
      if(n && n.textContent===last){ cards[i].click(); return; }
    }
  }
  var t=setInterval(function(){ tryAuto(); if(done) clearInterval(t) },200);
})();
