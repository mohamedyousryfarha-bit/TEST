/* تكبير صوت التنبيهات: كل أصوات التطبيق (الجرس والتنبيه وصوت الكاشير والباريستا) بتمر على مرحلة تكبير
   وحد أقصى (limiter) عشان تبقى عالية وواضحة من غير ما تتشوّه. بتتطبق على كل الأصوات من غير ما نغيّر ملفات الأصوات. */
(function(){
  if(window.__pmLoudAlerts) return; window.__pmLoudAlerts=true;
  var Orig=window.AudioContext||window.webkitAudioContext;
  if(!Orig) return;
  var BOOST=2.6;           // تكبير الصوت (حوالي +8 ديسيبل)

  var Loud=function(){
    var c=new Orig();
    var master=c.createGain(); master.gain.value=BOOST;
    var limit=c.createDynamicsCompressor();
    limit.threshold.value=-3; limit.knee.value=0; limit.ratio.value=20;
    limit.attack.value=0.001; limit.release.value=0.08;
    master.connect(limit); limit.connect(c.destination);
    Object.defineProperty(c,'__pmMaster',{value:master});
    return c;
  };
  Loud.prototype=Orig.prototype;
  window.AudioContext=Loud;
  if(window.webkitAudioContext) window.webkitAudioContext=Loud;

  // أي node بيتوصّل بـ destination يتحوّل للمرحلة المكبّرة
  var proto=AudioNode.prototype, origConnect=proto.connect;
  proto.connect=function(dest){
    var args=Array.prototype.slice.call(arguments);
    try{
      var m=this.context && this.context.__pmMaster;
      if(m && dest===this.context.destination){ args[0]=m; }
    }catch(e){}
    return origConnect.apply(this,args);
  };
})();
