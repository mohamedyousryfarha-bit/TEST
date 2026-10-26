/* التحقق اللحظي: أول ما الرقم يكتمل (4 أو 5) يتحقق فورًا بدون انتظار.
   الجهاز بيفتكر بصمة الـ PIN بعد أول دخول ناجح (SHA-256 + ملح) عشان التأكد يبقى محلي. */
(function(){
  var CACHE_PIN_ON_DEVICE = true;   // false = ما يتحفظش أي بصمة على الجهاز
  var inp=document.getElementById('employeePin'), step=document.getElementById('pinStep'), sel=document.getElementById('employeeName');
  if(!inp||!step||!sel)return;
  var canHash = !!(window.crypto && crypto.subtle);
  var enc = new TextEncoder();
  function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0'+b.toString(16)).slice(-2) }).join('') }
  function keyFor(n){ return 'pm_pin_'+n }
  function hashPin(pin,salt){ return crypto.subtle.digest('SHA-256', enc.encode(salt+':'+pin)).then(hex) }
  function cachePin(name,pin){
    if(!CACHE_PIN_ON_DEVICE || !canHash || !name) return;
    var salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    hashPin(pin,salt).then(function(h){ try{ localStorage.setItem(keyFor(name), JSON.stringify({s:salt,h:h})) }catch(e){} });
  }
  function clearPin(name){ try{ localStorage.removeItem(keyFor(name)) }catch(e){} }
  function localMatch(name,pin){
    if(!canHash) return Promise.resolve(false);
    var raw=null; try{ raw=localStorage.getItem(keyFor(name)) }catch(e){}
    if(!raw) return Promise.resolve(false);
    var c; try{ c=JSON.parse(raw) }catch(e){ return Promise.resolve(false) }
    return hashPin(pin,c.s).then(function(h){ return h===c.h });
  }
  var busy=false, lastChecked='';
  function resetState(){ lastChecked=''; }
  function go(name,pin){
    busy=true;
    Promise.resolve().then(function(){ return unlockApp() }).catch(function(){}).then(function(){
      busy=false;
      if(!document.body.classList.contains('auth-required')) cachePin(name,pin);
      else { clearPin(name); if(inp.value===pin) wrongPin(); }
      if(inp.value!==pin) check();
    });
  }
  function wrongPin(msg){
    if(!inp.value) return;
    inp.value='';
    // يفصل حالة الفحص عشان الرقم يتقبل تاني لو اتكتب
    step.classList.add('hide'); step.classList.remove('hide');
    var w=inp.closest('.pin-wrap');
    if(w){ w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
    if(msg && window.toast) window.toast({x:msg,k:'error',t:'PIN'});
  }
  function serverCheck(name,pin){
    busy=true;
    apiCall({action:'verify_employee',employee_name:name,pin:pin}).then(function(r){
      busy=false;
      if(r && !r.error && r.data && r.data.ok){ go(name,pin); }
      else if(inp.value===pin){ wrongPin(r&&r.error?'تعذر التحقق من الخادم، حاول تاني':'PIN غير صحيح، حاول تاني'); }
      else check();
    }).catch(function(){ busy=false; if(inp.value===pin) wrongPin('تعذر التحقق من الخادم، حاول تاني'); else check(); });
  }
  function check(){
    if(!document.body.classList.contains('auth-required')) return;
    if(busy) return;
    if(step.classList.contains('hide') || !sel.value) return;
    var v=inp.value, name=sel.value;
    if(!/^\d{4,5}$/.test(v) || v===lastChecked) return;
    lastChecked=v;
    if(v.length===5){ go(name,v); return; }          // 5 أرقام: فورًا
    localMatch(name,v).then(function(local){
      if(inp.value!==v || busy) return;
      if(local){ go(name,v); return; }                 // بصمة الجهاز اتطابقت: فورًا
      serverCheck(name,v);                              // 4 أرقام: الخادم فورًا من غير انتظار
    });
  }
  // نفحص فور أي ضغطة على الكيبورد اللي على الشاشة أو الكيبورد الحقيقي
  document.addEventListener('keydown', function(){ setTimeout(check,0) });
  inp.addEventListener('input', check);
  // لما تبدأ خطوة الـ PIN من جديد نصفّر الحالة
  new MutationObserver(function(){ if(!step.classList.contains('hide')) resetState(); })
    .observe(step,{attributes:true,attributeFilter:['class']});
  // شبكة أمان بسيطة لو القيمة اتغيرت بطريقة ما من غير حدث
  setInterval(check,100);
})();
