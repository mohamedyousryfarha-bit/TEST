(function(){
  var orig=window.toast;
  if(typeof orig!=='function')return;
  var DEFAULT_MS=2600, GAP_MS=350;
  var q=[], busy=false, lastKey='', lastAt=0;
  function next(){
    if(!q.length){ busy=false; return; }
    busy=true;
    var item=q.shift();
    try{ orig(item.o) }catch(e){}
    setTimeout(next, (item.o.d||DEFAULT_MS)+GAP_MS);
  }
  // الإشعارات بتظهر واحد ورا التاني بدل ما تتكدّس فوق بعض
  window.toast=function(o,kind,duration,title){
    if(o==null)return null;
    var obj=(typeof o==='string')?{x:o,k:kind,d:duration,t:title}:Object.assign({},o);
    // الإشعارات الدائمة (تقدم/انتظار) تظهر فورًا زي ما هي
    if(obj.k==='progress' || obj.d===0){ try{ return orig(obj) }catch(e){ return null } }
    obj.d=obj.d||DEFAULT_MS;
    var key=(obj.k||'')+'|'+(obj.t||'')+'|'+(obj.x||'');
    var now=Date.now();
    if(key===lastKey && now-lastAt<4000)return null;
    if(q.some(function(i){return i.key===key}))return null;
    lastKey=key; lastAt=now;
    q.push({key:key,o:obj});
    if(!busy)next();
    return null;
  };
  // رسائل شاشة الدخول العادية (بدون نوع) تتعرض كإشعار
  var prev=window.setLoginMessage;
  if(typeof prev==='function'){
    window.setLoginMessage=function(msg,type){
      try{ prev(msg,type) }catch(e){}
      if(msg) window.toast({x:String(msg),k:(type==='error'?'error':(type==='ok'?'success':'info')),t:'تسجيل الدخول'});
    };
  }
  // نص "تم تسجيل دخول الحساب المشترك" يظهر مرة واحدة كإشعار لما تفتح قايمة الموظفين
  var pane=document.getElementById('employeePane'), shownHint=false;
  if(pane){
    new MutationObserver(function(){
      if(!shownHint && !pane.classList.contains('hide')){
        shownHint=true;
        window.toast({x:'اختر اسمك وأدخل PIN الشخصي (4 أو 5 أرقام)، ويتحقق الخادم منه قبل فتح التطبيق.',k:'info',t:'الحساب المشترك'});
      }
    }).observe(pane,{attributes:true,attributeFilter:['class']});
  }
})();
