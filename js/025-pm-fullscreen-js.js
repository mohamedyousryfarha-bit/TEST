(function(){
  if(window.__pmFs)return; window.__pmFs=true;
  var ICON=(window.__PMUI__&&window.__PMUI__.iconHTML)?window.__PMUI__.iconHTML('expand'):'';
  function fsEl(){ return document.fullscreenElement||document.webkitFullscreenElement||null }
  function isFs(){ return !!fsEl() }
  function enter(){
    var el=document.documentElement;
    var req=el.requestFullscreen||el.webkitRequestFullscreen;
    if(!req){ alert('ملء الشاشة مش مدعوم على المتصفح ده. على الآيفون: من زرار المشاركة في Safari اختار "إضافة إلى الشاشة الرئيسية" وافتح البرنامج منها.'); return }
    try{
      var p=req.call(el,{navigationUI:'hide'});
      if(p&&p.catch) p.catch(function(){ alert('المتصفح رفض ملء الشاشة. جرّب تاني بعد ما تضغط على الشاشة.') });
    }catch(e){ alert('تعذر ملء الشاشة على الجهاز ده.') }
  }
  function exit(){
    var ex=document.exitFullscreen||document.webkitExitFullscreen;
    if(ex) try{ ex.call(document) }catch(e){}
  }
  function toggle(){ isFs()?exit():enter() }
  function label(){
    var b=document.getElementById('pmFsBtn'); if(!b)return;
    b.querySelector('span:last-child').textContent=isFs()?'إنهاء ملء الشاشة':'ملء الشاشة';
  }
  function addButton(){
    var menu=document.querySelector('.pm-menu'); if(!menu||document.getElementById('pmFsBtn'))return;
    var b=document.createElement('button');
    b.id='pmFsBtn'; b.type='button'; b.className='pm-mi';
    b.innerHTML=ICON+'<span>ملء الشاشة</span>';
    b.addEventListener('click',function(e){
      e.stopPropagation();
      var fab=document.querySelector('.pm-fabs'); if(fab)fab.classList.remove('open');
      toggle();
    });
    menu.appendChild(b);
    label();
  }
  document.addEventListener('fullscreenchange',label);
  document.addEventListener('webkitfullscreenchange',label);
  addButton();
  setTimeout(addButton,800);
})();
