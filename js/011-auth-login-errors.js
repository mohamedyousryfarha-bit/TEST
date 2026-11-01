(function(){
  /* رسالة واضحة بالعربي لو الاسم أو الـ PIN غلط بدل "Edge Function returned a non-2xx status code" */
  var origApi=window.apiCall;
  if(typeof origApi==='function'){
    window.apiCall=function(body){
      var p=origApi.apply(this,arguments);
      if(!body||body.action!=='verify_employee')return p;
      return Promise.resolve(p).then(function(r){
        if(r&&r.error){
          var st=r.error.context&&r.error.context.status;
          if(!st||st<500){
            r.error=new Error('كلمة السر (PIN) غير صحيحة. تأكد من اختيار اسمك وإدخال الرقم الصحيح.');
          }
        }
        return r;
      });
    };
  }
  /* رسالة واضحة لو بيانات الحساب المشترك غلط */
  var ORIG_MSG='Invalid login credentials';
  var mo=new MutationObserver(function(){
    var el=document.getElementById('loginMessage');
    if(el&&el.textContent.indexOf(ORIG_MSG)>=0){
      el.textContent='البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
  });
  var lm=document.getElementById('loginMessage');
  if(lm) mo.observe(lm,{childList:true,characterData:true,subtree:true});
})();
