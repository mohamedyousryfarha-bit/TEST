/* أصوات الماركة: كل وظيفة في التطبيق ليها صوتها الخاص.
   بيتحمّل آخر حاجة في الصفحة، وبيلف الدوال الموجودة (toast / apiCall / confirm / pmChime / __pmBellAdd) من غير ما يغيّر منطقها. */
(function(){
  if(window.__pmBrandSounds) return; window.__pmBrandSounds=true;

  /* ---------- محرك الصوت ---------- */
  var ctx=null, lastAt=0, MIN_GAP=700;
  function getCtx(){
    try{
      if(!ctx){
        var C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
        ctx=new C();
      }
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  ['pointerdown','touchstart','keydown'].forEach(function(ev){
    document.addEventListener(ev,function(){ getCtx(); },{passive:true,capture:true});
  });

  function bell(c,f,s,v,dur,partials){
    partials=partials||[[1,1],[2.76,0.25],[5.4,0.08]];
    partials.forEach(function(p){
      var o=c.createOscillator(), g=c.createGain();
      o.type='sine'; o.frequency.value=f*p[0];
      g.gain.setValueAtTime(0.0001,s);
      g.gain.exponentialRampToValueAtTime(v*p[1],s+0.005);
      g.gain.exponentialRampToValueAtTime(0.0001,s+dur/(1+p[0]*0.15));
      o.connect(g); g.connect(c.destination);
      o.start(s); o.stop(s+dur+0.05);
    });
  }
  function click(c,s,v,freq){
    var len=0.04, buf=c.createBuffer(1,c.sampleRate*len,c.sampleRate), d=buf.getChannelData(0);
    for(var i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
    var src=c.createBufferSource(), bp=c.createBiquadFilter(), g=c.createGain();
    bp.type='bandpass'; bp.frequency.value=freq||2400; bp.Q.value=1.2;
    g.gain.value=v;
    src.buffer=buf; src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(s);
  }
  function tone(c,f,s,v,dur,type){
    var o=c.createOscillator(), g=c.createGain();
    o.type=type||'triangle'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,s);
    g.gain.exponentialRampToValueAtTime(v,s+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
    o.connect(g); g.connect(c.destination);
    o.start(s); o.stop(s+dur+0.05);
  }

  /* الأصوات الثمانية */
  var SOUNDS={
    brand:function(c,t){ bell(c,659,t,.3,.5); bell(c,784,t+.14,.28,.5); bell(c,988,t+.28,.3,.9); },
    cashier:function(c,t){ click(c,t,.3,3000); bell(c,1318,t+.02,.35,1.1); },
    barista:function(c,t){ bell(c,1046,t,.35,.6); bell(c,1046,t+.32,.35,.6); },
    order:function(c,t){ bell(c,784,t,.32,.45); bell(c,988,t+.22,.32,.45); bell(c,1175,t+.44,.34,.7); },
    saved:function(c,t){ tone(c,880,t,.18,.15,'sine'); tone(c,1318,t+.09,.16,.3,'sine'); },
    error:function(c,t){ tone(c,392,t,.3,.22,'triangle'); tone(c,294,t+.2,.3,.4,'triangle'); },
    del:function(c,t){ click(c,t,.4,1800); click(c,t+.05,.15,1200); },
    message:function(c,t){ tone(c,1568,t,.22,.12,'sine'); tone(c,1976,t+.1,.2,.25,'sine'); }
  };

  /* يمنع تداخل صوتين في نفس اللحظة (مثلاً الكاشير والنجاح مع بعض): أول صوت بيكسب */
  function play(name){
    var n=Date.now(); if(n-lastAt<MIN_GAP) return;
    var c=getCtx(); if(!c||!SOUNDS[name]) return;
    lastAt=n;
    try{ SOUNDS[name](c,c.currentTime+0.03); }catch(e){}
  }
  window.pmSound={ play:play, names:Object.keys(SOUNDS) };

  /* ---------- جينغل الماركة: مرة واحدة في كل جلسة، أول لمسة ---------- */
  try{
    if(!sessionStorage.getItem('pmBrandJingle')){
      var jingle=function(){
        if(sessionStorage.getItem('pmBrandJingle')) return;
        sessionStorage.setItem('pmBrandJingle','1');
        lastAt=0; play('brand');
        document.removeEventListener('pointerdown',jingle,true);
      };
      document.addEventListener('pointerdown',jingle,{capture:true,passive:true});
    }
  }catch(e){}

  /* ---------- الطلب الجديد للباريستا/المطبخ: بدل جرس الـ pmChime القديم ---------- */
  window.pmChime=function(){ play('order'); };

  /* ---------- رسالة واردة / إشعار جديد في الجرس ---------- */
  var prevBellAdd=window.__pmBellAdd;
  window.__pmBellAdd=function(){
    play('message');
    if(typeof prevBellAdd==='function') return prevBellAdd.apply(this,arguments);
  };

  /* ---------- التوست: نجاح / خطأ / تراجع ---------- */
  var prevToast=window.toast;
  window.toast=function(o){
    try{
      var k=(o&&typeof o==='object')?o.k:arguments[1];
      if(k==='success'||k==='ok') play('saved');
      else if(k==='error') play('error');
      else if(k==='undo') play('del');
    }catch(e){}
    return prevToast.apply(this,arguments);
  };

  /* ---------- الحذف: نقرة بعد تأكيد الحذف ---------- */
  var prevConfirm=window.confirm;
  window.confirm=function(msg){
    var r=prevConfirm.apply(this,arguments);
    try{ if(r && /حذف|امسح|مسح/.test(String(msg||''))) play('del'); }catch(e){}
    return r;
  };

  /* ---------- العمليات: بيع، تجهيز مشروبات/أوردرات، حفظ ---------- */
  var prevApi=window.apiCall;
  if(typeof prevApi==='function'){
    window.apiCall=function(body){
      var p=prevApi.apply(this,arguments);
      try{
        var a=body&&body.action;
        Promise.resolve(p).then(function(r){
          if(!r||r.error) return;
          if(a==='checkout_cart') play('cashier');
          else if(a==='drink_order_action'&&body.drink_action==='prepare') play('barista');
          else if(a==='confirm_production') play('barista');
          else if(a==='party_order_action'&&body.party_action==='produce') play('barista');
        },function(){});
      }catch(e){}
      return p;
    };
  }
})();
