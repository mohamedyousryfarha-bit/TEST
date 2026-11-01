/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 011-auth-login-errors.js ---- */
try{
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
}catch(e){console.error('[PastryMY] 011-auth-login-errors.js failed',e)}
/* ---- 021-auth-logout.js ---- */
try{
(function(){
  var b=document.getElementById('signOutButton'); if(!b)return;
  b.onclick=function(){ location.reload() };
})();
}catch(e){console.error('[PastryMY] 021-auth-logout.js failed',e)}
/* ---- 033-auth-employee-login.js ---- */
try{
(function(){
  var sel=document.getElementById('employeeName');
  var pane=document.getElementById('employeePane');
  var grid=document.getElementById('staffGrid');
  var staffStep=document.getElementById('staffStep');
  var pinStep=document.getElementById('pinStep');
  var pinInput=document.getElementById('employeePin');
  if(!sel||!pane||!grid||!staffStep||!pinStep||!pinInput)return;
  var PALETTE=['#1B1B1B','#16794B','#1B1B1B','#0067B8','#B42318','#1B1B1B','#C50F1F','#4D7C0F'];
  function colorFor(n){var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return PALETTE[h%PALETTE.length]}
  function initial(n){return (n||'?').trim().charAt(0)}
  function showStaff(){ pinStep.classList.add('hide'); staffStep.classList.remove('hide'); pinInput.value=''; }
  function pick(name){
    sel.value=name;
    var av=document.getElementById('pinAvatar'), nm=document.getElementById('pinName');
    av.style.background=colorFor(name); av.textContent=initial(name);
    nm.textContent=name;
    staffStep.classList.add('hide'); pinStep.classList.remove('hide');
    pinInput.value='';
    setTimeout(function(){ pinInput.focus() },60);
  }
  function build(){
    grid.innerHTML='';
    var count=0;
    Array.prototype.forEach.call(sel.options,function(o){
      if(!o.value)return;
      count++;
      var b=document.createElement('button');
      b.type='button'; b.className='staff-card';
      var av=document.createElement('span'); av.className='staff-av'; av.style.background=colorFor(o.value); av.textContent=initial(o.value);
      var t=document.createElement('b'); t.textContent=o.value;
      b.appendChild(av); b.appendChild(t);
      b.addEventListener('click',function(){ pick(o.value) });
      grid.appendChild(b);
    });
    if(!count){
      var e=document.createElement('div'); e.className='staff-empty'; e.textContent='جارٍ تحميل أسماء الموظفين…';
      grid.appendChild(e);
    }
  }
  new MutationObserver(build).observe(sel,{childList:true});
  new MutationObserver(function(){ if(!pane.classList.contains('hide')) showStaff(); })
    .observe(pane,{attributes:true,attributeFilter:['class']});
  document.getElementById('pinBackButton').addEventListener('click',showStaff);
  build();
})();
}catch(e){console.error('[PastryMY] 033-auth-employee-login.js failed',e)}
