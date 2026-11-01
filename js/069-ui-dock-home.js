/* زر الرئيسية في الشريط السفلي: فوق = يفتح الرئيسية، ولما تنزل تحت يتحول لسهم للأعلى ويطلّعك لفوق */
(function(){
  if(window.__pmDockHome) return; window.__pmDockHome=true;

  var HOME_HTML=((window.__PMUI__||{}).ICONS||{}).home+'الرئيسية';
  var UP_HTML=((window.__PMUI__||{}).ICONS||{}).arrowUp+'للأعلى';

  var mode='home';
  var TOP_AT=300, HOME_AT=120;

  function btn(){ return document.querySelector('#pmDock button[data-act="home"]'); }
  function scrollY(){ return window.scrollY||document.documentElement.scrollTop||0; }

  function render(b){
    var want=mode==='up'?UP_HTML:HOME_HTML;
    if(b.getAttribute('data-pm-mode')!==mode || b.innerHTML!==want){
      b.innerHTML=want;
      b.setAttribute('data-pm-mode',mode);
    }
  }

  /* الضغط على الزرار بيتحدد بمكان اللمس نفسه (مش بالعنصر اللي تحته)، عشان أي زرار تاني متداخل معاه ما ياخدش الضغطة.
     الأحداث كلها بتتوقف هنا وإحنا بنتصرف في الـ click. */
  function pointOf(e){
    var t=(e.changedTouches&&e.changedTouches[0])||(e.touches&&e.touches[0])||e;
    return (t&&typeof t.clientX==='number')?{x:t.clientX,y:t.clientY}:null;
  }
  function homeAt(e){
    var b=btn(); if(!b) return null;
    var p=pointOf(e); if(!p) return null;
    var r=b.getBoundingClientRect();
    return (p.x>=r.left && p.x<=r.right && p.y>=r.top && p.y<=r.bottom) ? b : null;
  }
  function showHomePanel(){
    var home=document.getElementById('home');
    if(!home){ if(typeof window.go==='function') window.go('analytics'); return; }
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p===home); });
    document.querySelectorAll('.tab.active').forEach(function(t){ t.classList.remove('active'); });
  }
  var EVENTS=['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'];
  EVENTS.forEach(function(ev){
    document.addEventListener(ev,function(e){
      var b=homeAt(e) || (e.target&&e.target.closest?e.target.closest('#pmDock button[data-act="home"]'):null);
      if(!b) return;
      e.stopImmediatePropagation();
      if(ev!=='click') return;
      if(mode==='up'){
        window.scrollTo({top:0,behavior:'smooth'});
      } else {
        /* الرئيسية = شاشة القايمة الرئيسية (قسم #home) مش التحليلات */
        var back=document.getElementById('pmBack');
        if(document.body.classList.contains('pm-view') && back){ back.click(); }
        else { showHomePanel(); }
        window.scrollTo({top:0,behavior:'smooth'});
      }
    },{capture:true,passive:true});
  });

  function tick(){
    var b=btn(); if(!b) return;
    var y=scrollY();
    if(mode==='home' && y>TOP_AT) mode='up';
    else if(mode==='up' && y<HOME_AT) mode='home';
    render(b);
  }
  setInterval(tick,150);
  setTimeout(tick,1200);
})();
