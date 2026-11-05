(function(){
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
