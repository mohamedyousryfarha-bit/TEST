/* صوت إشعار عالي + اهتزاز قوي. الصوت بيتفعّل أول ما تلمس الشاشة مرة (المتصفح بيمنع الصوت قبل كده) */
(function(){
  if(window.__pmChime) return; window.__pmChime=true;
  var ctx=null, comp=null;
  function getCtx(){
    try{
      if(!ctx){
        var C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
        ctx=new C();
        comp=ctx.createDynamicsCompressor();
        comp.threshold.value=-18; comp.knee.value=6; comp.ratio.value=8;
        comp.attack.value=0.003; comp.release.value=0.15;
        comp.connect(ctx.destination);
      }
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  ['pointerdown','touchstart','keydown'].forEach(function(ev){
    document.addEventListener(ev,function(){ getCtx(); },{passive:true,capture:true});
  });
  /* نغمة واحدة بثلاث طبقات (أساسي + أوكتاف + خامس) عشان تبقى أعلى وأوضح */
  function note(c,freq,start,dur){
    [[1,1],[2,0.5],[1.5,0.35]].forEach(function(l){
      var o=c.createOscillator(), g=c.createGain();
      o.type='square'; o.frequency.value=freq*l[0];
      g.gain.setValueAtTime(0.0001,start);
      g.gain.exponentialRampToValueAtTime(l[1],start+0.015);
      g.gain.exponentialRampToValueAtTime(0.0001,start+dur);
      o.connect(g); g.connect(comp);
      o.start(start); o.stop(start+dur+0.05);
    });
  }
  var playing=false, CHIME_SEC=5;
  window.pmChime=function(){
    if(playing) return;
    var c=getCtx(); if(!c) return;
    playing=true;
    var play=function(){
      var t0=c.currentTime, cycle=1.04, notes=[[988,0.22],[1319,0.22],[1760,0.38]];
      for(var k=0; k*cycle<CHIME_SEC; k++){
        notes.forEach(function(n,j){
          var start=t0+k*cycle+j*0.22;
          if(start-t0<CHIME_SEC) note(c,n[0],start,n[1]);
        });
      }
    };
    var ready=(c.state==='suspended')?c.resume():Promise.resolve();
    Promise.resolve(ready).then(play,function(){});
    try{
      var vib=[]; for(var v=0; v<8; v++){ vib.push(400,200); }
      if(navigator.vibrate) navigator.vibrate(vib);
    }catch(e){}
    setTimeout(function(){ playing=false; }, CHIME_SEC*1000);
  };
})();

/* إشعار النظام: لما التطبيق يكون في تبويب تاني أو برا الشاشة، الإشعار بيظهر في الجهاز ومعاه صوت الإشعارات بتاع الجهاز نفسه */
(function(){
  if(window.__pmNotifyInit) return; window.__pmNotifyInit=true;
  var asked=false;
  function askPermission(){
    if(asked||!('Notification' in window)) return; asked=true;
    if(Notification.permission==='default'){ try{ Notification.requestPermission(); }catch(e){} }
  }
  /* طلب الإذن لازم يكون بعد لمسة من المستخدم */
  document.addEventListener('pointerdown',askPermission,{capture:true,passive:true});
  window.pmNotify=function(title,body,tag){
    try{
      if(!('Notification' in window)||Notification.permission!=='granted') return false;
      if(!document.hidden) return false; /* والتطبيق مفتوح قدامك الصوت والتنبيه اللي فوق كفاية */
      var opts={body:body||'',icon:'ICONS/icon-192.png',badge:'ICONS/favicon-32.png',tag:tag||'rmy',renotify:true,vibrate:[300,120,300,120,300],data:{url:location.href}};
      if(navigator.serviceWorker&&navigator.serviceWorker.ready){
        navigator.serviceWorker.ready.then(function(reg){ return reg.showNotification(title,opts); }).catch(function(){ try{ new Notification(title,opts); }catch(e){} });
      } else { new Notification(title,opts); }
      return true;
    }catch(e){ return false; }
  };
})();
