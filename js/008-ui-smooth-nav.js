/* ==================================================================
   PastryMY Pro · طبقة الانسيابية + الإصلاح الذاتي
   - تنقّل أسلس (اختصارات، تمرير تلقائي، سحب باللمس، لوحة أوامر)
   - أخطاء تُصلَح ولا تُسقط التطبيق (لقطات + تراجع + فحص وإصلاح)
   - لا يُعدّل أي دالة حسابية أو منطق عمل؛ كل ما يلي التفاف عرضي
   ================================================================== */
(function(){
'use strict';
if(window.__PMPRO__)return; window.__PMPRO__=true;

var $=function(id){return document.getElementById(id)};
var UI=window.__PMUI__||{};
var toast=UI.toast||function(){};
var ico=UI.iconHTML||function(){return ''};
var esc=(typeof window.esc==='function')?window.esc:function(s){return String(s==null?'':s)};
var BOOT=window.__PM_BOOT__||{};
var TICON=(window.__PMUI__&&window.__PMUI__.TAB_ICONS)||{};

function G(n){ try{ return window[n] }catch(e){ return undefined } }
function call(n){ var f=G(n); if(typeof f==='function'){ try{ return f.apply(null,[].slice.call(arguments,1)) }catch(e){ logErr(n+': '+(e&&e.message)) } } }
function isNum(v){ return Number.isFinite(Number(v)) }
function nowNum(){ return Date.now() }
function getState(){ try{ return state }catch(e){ return null } }
function setState(v){ try{ state=v; return true }catch(e){ return false } }
function clickBtn(id){ var b=$(id); if(b&&!b.disabled){ try{ b.click() }catch(e){} } }
function focusEl(id){ var e=$(id); if(!e)return; try{ e.scrollIntoView({block:'center',behavior:'smooth'}) }catch(_){} setTimeout(function(){ try{ e.focus({preventScroll:true}) }catch(_){ try{e.focus()}catch(__){} } },260); }

/* ==================== 1) تسجيل الأخطاء (لا يُسقط التطبيق) ==================== */
var errCount=0;
function logErr(msg){
  msg=String(msg||'');
  if(/supabase-config|ResizeObserver|Script error/i.test(msg))return;
  errCount++;
  try{
    var arr=JSON.parse(localStorage.getItem('pm_errlog')||'[]');
    arr.push({t:nowNum(),m:msg.slice(0,300)});
    while(arr.length>25)arr.shift();
    localStorage.setItem('pm_errlog',JSON.stringify(arr));
  }catch(e){}
}
window.__PM_LOGERR__=logErr;
window.addEventListener('error',function(e){ logErr((e&&e.message)+' @'+(e&&e.filename||'')+':'+(e&&e.lineno||'')) });
window.addEventListener('unhandledrejection',function(e){ var r=e&&e.reason; logErr('Promise: '+((r&&r.message)||r)) });

/* ==================== 2) لقطات سريعة + تراجع ==================== */
var SNAPKEY='pastryMY_snapshots_v1';
function snaps(){ try{ var a=JSON.parse(localStorage.getItem(SNAPKEY)||'[]'); return Array.isArray(a)?a:[] }catch(e){ return [] } }
function putSnap(label,st){
  try{
    var a=snaps();
    a.push({t:nowNum(),label:label,state:JSON.parse(JSON.stringify(st))});
    while(a.length>5)a.shift();
    localStorage.setItem(SNAPKEY,JSON.stringify(a));
  }catch(e){ try{ localStorage.removeItem(SNAPKEY) }catch(_){} }
}
function restoreSnap(st){
  if(!setState(JSON.parse(JSON.stringify(st))))return false;
  try{ call('save') }catch(e){}
  try{ call('renderAll') }catch(e){}
  return true;
}
function noChangeNotice(label){
  try{ if(document.querySelectorAll('.pm-ferr').length)return }catch(e){}
  try{ var d=document.getElementById('messageDialog'); if(d&&d.classList.contains('show'))return }catch(e){}
  toast({k:'nochange',t:label,x:'لم يحدث أي تغيير في البيانات. تحقق من العنصر المحدد أو من القيم المدخلة ثم أعد المحاولة.',d:5200});
}
function dtext(before){
  var f=UI.delta||function(){return ''};
  try{ return f(JSON.stringify(before||null),JSON.stringify(getState()||null)) }catch(e){ return '' }
}
function attachUndo(el,label,snap){
  if(!el||!el.querySelector)return;
  if(el.querySelector('.toast-act'))return;
  if(UI.restart)try{ UI.restart(el,11000) }catch(e){}
  var b=document.createElement('button');
  b.type='button'; b.className='toast-act';
  b.innerHTML=ico('restore')+'تراجع';
  b.onclick=function(){
    if(restoreSnap(snap)){ UI.dismiss&&UI.dismiss(el); toast({k:'undo',t:'تم التراجع',x:'تم إرجاع البيانات إلى ما قبل: '+label,d:6000}); }
  };
  (el.querySelector('.toast-body')||el).appendChild(b);
}
function offerUndo(label,snap,extra,reuse){
  /* إن كانت العملية أبلغت المستخدم بنفسها (نجاح/تحذير) نضيف زر التراجع للإشعار نفسه بدل إشعار ثانٍ */
  if(reuse){
    var st=document.getElementById('toastStack');
    var ex=st&&st.lastElementChild;
    if(ex&&!ex.classList.contains('out')){ attachUndo(ex,label,snap); return ex }
  }
  var txt='تم تنفيذ العملية'+(extra?(' — '+extra):'')+'. يمكنك إلغاؤها وإرجاع البيانات كما كانت بالزر أدناه.';
  var el=toast({k:'undo',t:label,x:txt,d:11000});
  if(!el||!el.querySelector)return;
  var b=document.createElement('button');
  b.type='button'; b.className='toast-act';
  b.innerHTML=ico('restore')+'تراجع';
  b.onclick=function(){
    if(restoreSnap(snap)){ UI.dismiss&&UI.dismiss(el); toast({k:'undo',t:'تم التراجع',x:'تم إرجاع البيانات إلى ما قبل: '+label,d:6000}); }
  };
  var body=el.querySelector('.toast-body')||el;
  body.appendChild(b);
}
function suppress(){ window.__PMSUPPRESS__=(window.__PMSUPPRESS__||0)+1 }
/* يزيل كبت الرسالة بعد انتهاء العملية سواء استهلكته طبقة التنبيهات أم لا */
function unsuppress(pre){ if((window.__PMSUPPRESS__||0)>pre)window.__PMSUPPRESS__=pre }
function changed(a,b){ try{ return JSON.stringify(a)!==JSON.stringify(b) }catch(e){ return true } }
function withUndoFn(name,label){
  if(typeof window[name]!=='function')return;
  var base=window[name];
  window[name]=function(){
    var pre=window.__PMSUPPRESS__||0;
    var s0=(UI.seq&&UI.seq())||0;
    var before=getState(); before=before?JSON.parse(JSON.stringify(before)):null;
    suppress();
    var r=base.apply(this,arguments);
    unsuppress(pre);
    var after=getState();
    if(before&&changed(before,after)){ putSnap(label,before); offerUndo(label,before,dtext(before),((UI.seq&&UI.seq())||0)>s0) }
    else if(before)noChangeNotice(label);
    return r;
  };
}
function withUndoEvt(id,label,evt){
  var el=$(id); if(!el)return;
  var key=evt||'onclick';
  if(typeof el[key]!=='function')return;
  var base=el[key];
  el[key]=function(){
    var self=this,args=arguments;
    var pre=window.__PMSUPPRESS__||0;
    var s0=(UI.seq&&UI.seq())||0;
    var before=getState(); before=before?JSON.parse(JSON.stringify(before)):null;
    suppress();
    var r=base.apply(self,args);
    var done=function(){
      unsuppress(pre);
      var after=getState();
      if(before&&changed(before,after)){
        if(evt==='onchange'&&self&&self.value!==undefined)try{ self.value='' }catch(e){}
        putSnap(label,before); offerUndo(label,before,dtext(before),((UI.seq&&UI.seq())||0)>s0);
      }else if(before&&evt!=='onchange')noChangeNotice(label);
    };
    if(r&&typeof r.then==='function')r.then(done,done); else done();
    return r;
  };
}
[['deleteSale','حذف عملية بيع'],['deleteExpense','حذف مصروف'],['deletePurchase','حذف سجل شراء'],
 ['deleteStock','حذف خامة'],['removeOrder','حذف صنف من الطلب'],
 ['adjustStock','تعديل رصيد خامة']].forEach(function(p){ withUndoFn(p[0],p[1]) });
[['clearOrder','مسح الطلب'],['deleteRecipe','حذف الصنف']].forEach(function(p){ withUndoEvt(p[0],p[1],'onclick') });
[['importJsonBackup','استيراد نسخة JSON'],['importBackup','استيراد نسخة Excel']].forEach(function(p){ withUndoEvt(p[0],p[1],'onchange') });
/* إضافة طبقة تراجع على عمليات الإضافة أيضًا: زر «تراجع» يعيد الرقم/الصنف لو أُضيف بالخطأ */
[['addOrder','إضافة صنف'],['addSale','تسجيل بيع'],['addExpense','تسجيل مصروف'],
 ['addPurchase','تسجيل شراء'],['addStock','إضافة رصيد'],
 ['newRecipe','إنشاء صنف جديد'],['savePrice','تسجيل سعر خامة']].forEach(function(p){ withUndoEvt(p[0],p[1],'onclick') });


/* ==================== 3) حماية العرض والحفظ ==================== */
var _renderAll=G('renderAll');
if(typeof _renderAll==='function'){
  var PARTS=['renderSelectors','renderHome','renderStock','renderOrder','renderHistory','renderPrices','renderMonthly','renderPurchases'];
  window.renderAll=function(){
    try{ return _renderAll.apply(this,arguments) }
    catch(e){
      logErr('renderAll: '+(e&&e.message));
      var failed=[];
      PARTS.forEach(function(n){ var f=G(n); if(typeof f!=='function')return; try{ f() }catch(err){ failed.push(n); logErr(n+': '+(err&&err.message)) } });
      ['costing','sales'].forEach(function(id){
        var p=$(id); if(p&&p.classList.contains('active')){
          var f=G(id==='costing'?'renderCosting':'renderSales');
          if(typeof f==='function'){ try{ f() }catch(err){ failed.push(id) } }
        }
      });
      var el=toast({k:'warn',t:'تعذّر عرض جزء من الشاشة',x:'تم تخطي '+(failed.length||1)+' جزء دون إيقاف التطبيق. بقية البيانات سليمة ويمكنك تشغيل فحص وإصلاح.',d:10000});
      if(el&&el.querySelector){
        var b=document.createElement('button'); b.type='button'; b.className='toast-act';
        b.innerHTML=ico('restore')+'فحص وإصلاح'; b.onclick=function(){ UI.dismiss&&UI.dismiss(el); openHealth() };
        (el.querySelector('.toast-body')||el).appendChild(b);
      }
    }
  };
}
var _save=G('save');
if(typeof _save==='function'){
  window.save=function(){
    try{ return _save.apply(this,arguments) }
    catch(e){
      logErr('save: '+(e&&e.message));
      toast({k:'error',t:'تعذّر الحفظ التلقائي',x:'بياناتك الحالية لم تُفقد، لكنها غير مكتوبة على الجهاز بعد. نزّل نسخة استرداد للاطمئنان.',d:9000});
    }
  };
}

/* ==================== 4) أخطاء الحقول داخل النموذج ==================== */
var lastClick={id:'',t:0};
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button'):null;
  if(b)lastClick={id:b.id||'',t:nowNum()};
},true);
var V={
 addOrder:[['orderProduct',function(v){return !!v},'اختر الصنف أولًا'],['orderQty',function(v){return Number(v)>0},'عدد الوزنات يجب أن يكون أكبر من صفر']],
 addSale:[['saleProduct',function(v){return !!v},'اختر الصنف المباع'],['saleQty',function(v){return Number(v)>0},'عدد الوحدات يجب أن يكون أكبر من صفر'],['salePrice',function(v){return isNum(v)&&Number(v)>=0},'اكتب سعر بيع صحيحًا (صفر أو أكثر)']],
 addExpense:[['expenseAmount',function(v){return isNum(v)&&Number(v)>0},'قيمة المصروف يجب أن تكون أكبر من صفر'],['expenseCategory',function(v){return !!v},'اختر نوع المصروف']],
 addPurchase:[['purchaseIngredient',function(v){return !!v},'اختر الخامة'],['purchaseQty',function(v){return Number(v)>0},'أدخل كمية أكبر من صفر'],['purchaseTotal',function(v){return isNum(v)&&Number(v)>0},'أدخل إجمالي الشراء أكبر من صفر']],
 addStock:[['stockIngredient',function(v){return !!v},'اختر الخامة'],['stockAddQty',function(v){return Number(v)>0},'الكمية المضافة يجب أن تكون أكبر من صفر']],
 savePrice:[['priceIngredient',function(v){return !!v},'اختر الخامة'],['pricePurchase',function(v){return String(v).trim()===''||(isNum(v)&&Number(v)>=0)},'سعر العبوة يجب أن يكون رقمًا'],['pricePackSize',function(v){return String(v).trim()===''||(isNum(v)&&Number(v)>0)},'حجم العبوة يجب أن يكون رقمًا أكبر من صفر']],
 saveRecipe:[['recipeName',function(v){return !!String(v).trim()},'اكتب اسم الصنف']],
 saveCostSettings:[['costYield',function(v){return isNum(v)&&Number(v)>0},'عدد الوحدات الناتجة يجب أن يكون أكبر من صفر']],
 unlockButton:[['employeeName',function(v){return !!v},'اختر اسم الموظف'],['employeePin',function(v){return !!String(v).trim()},'أدخل PIN الشخصي']],
 signInButton:[['sharedEmail',function(v){return !!String(v).trim()},'أدخل البريد الإلكتروني'],['sharedPassword',function(v){return !!String(v).trim()},'أدخل كلمة المرور']]
};
function clearField(el){
  if(!el)return;
  el.classList.remove('pm-bad');
  var all=document.querySelectorAll('.pm-ferr');
  for(var i=0;i<all.length;i++)if(all[i].dataset&&all[i].dataset.for===el.id)all[i].remove();
}
function markField(el,msg){
  if(!el)return;
  el.classList.add('pm-bad');
  var host=el.classList.contains('pm-num-fix')?el.parentNode.parentNode:el.parentNode;
  var old=host&&host.querySelector?host.querySelector('.pm-ferr'):null; if(old)old.remove();
  var d=document.createElement('p');
  d.className='pm-ferr'; d.dataset.for=el.id||'';
  d.innerHTML=ico('alertTri')+'<span>'+esc(msg)+'</span>';
  if(host&&host.parentNode)host.parentNode.insertBefore(d,host.nextSibling);
  var once=function(){ clearField(el); el.removeEventListener('input',once); el.removeEventListener('change',once) };
  el.addEventListener('input',once); el.addEventListener('change',once);
}
function clearErrors(){ var a=document.querySelectorAll('.pm-ferr'); for(var i=0;i<a.length;i++)a[i].remove();
  var b=document.querySelectorAll('.pm-bad'); for(var j=0;j<b.length;j++)b[j].classList.remove('pm-bad'); }

var _notify=UI.notify||window.alert;
function smartNotify(text,forced){
  var t=String(text==null?'':text).trim();
  if(!t)return;
  if(/^تم[\s]/.test(t)){ clearErrors(); return _notify(t,forced); }
  if(nowNum()-lastClick.t<2200){
    var rules=V[lastClick.id];
    if(rules){
      var bad=[];
      for(var i=0;i<rules.length;i++){
        var el=$(rules[i][0]); if(!el)continue;
        if(!rules[i][1](el.value))bad.push([el,rules[i][2]]);
      }
      if(bad.length){
        for(var k=0;k<bad.length;k++)markField(bad[k][0],bad[k][1]);
        try{ bad[0][0].scrollIntoView({block:'center',behavior:'smooth'}) }catch(e){}
        setTimeout(function(){ try{ bad[0][0].focus({preventScroll:true}) }catch(e){} },300);
        try{ UI.buzz&&UI.buzz('error') }catch(e){}
        lastClick.t=0;
        return;
      }
    }
  }
  _notify(t,forced);
}
window.alert=smartNotify; window.showMessage=smartNotify;

/* ==================== 5) تنقّل أسلس ==================== */
window.__goPost=window.__goPost||[];
window.__goPost.push(function(id){
  try{ localStorage.setItem('pmLastTab',id) }catch(e){}
  centerTab(id); clearErrors();
});
function centerTab(id){
  var t=document.querySelector('nav.tabs .tab[data-tab="'+id+'"]');
  if(!t)return;
  var nav=t.parentNode;
  try{
    var x=t.offsetLeft-(nav.clientWidth-t.offsetWidth)/2;
    if(nav.scrollTo)nav.scrollTo({left:x,behavior:'smooth'}); else nav.scrollLeft=x;
  }catch(e){}
}
function goRel(d){
  var tabs=[].slice.call(document.querySelectorAll('nav.tabs .tab')).filter(function(b){ return b.style.display!=='none' });
  var cur=-1;
  for(var i=0;i<tabs.length;i++){ if(tabs[i].classList.contains('active')){ cur=i; break } }
  if(cur<0)return;
  var n=cur+d;
  if(n<0||n>=tabs.length)return;
  tabs[n].click();
}
var tx=0,ty=0,tt=0;
document.addEventListener('touchstart',function(e){ var t=e.touches&&e.touches[0]; if(!t)return; tx=t.clientX; ty=t.clientY; tt=nowNum() },{passive:true});
document.addEventListener('touchend',function(e){
  var t=e.changedTouches&&e.changedTouches[0]; if(!t)return;
  if(nowNum()-tt>700)return;
  var dx=t.clientX-tx, dy=t.clientY-ty;
  if(Math.abs(dx)<70||Math.abs(dy)>60)return;
  var tg=e.target; if(tg&&tg.closest&&tg.closest('.tablewrap,input,select,textarea,button,a'))return;
  goRel(dx>0?-1:1);
},{passive:true});


/* ==================== 6) لوحة الأوامر (Ctrl+K) ==================== */
var pal=null,palInput=null,palList=null,palItems=[],palSel=0;
function norm(s){ return String(s||'').toLowerCase().replace(/[\u064B-\u0652\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي') }
function paletteItems(){
  var out=[];
  var tabs=[].slice.call(document.querySelectorAll('nav.tabs .tab')).filter(function(b){ return b.style.display!=='none' });
  tabs.forEach(function(b){
    var id=b.dataset.tab,label=(b.textContent||'').trim();
    out.push({ic:TICON[id]||'list',t:label,h:'الانتقال إلى القسم',run:function(){ go(id) }});
  });
  out.push({ic:'plus',t:'إضافة صنف للطلب',h:'قسم التحضير',run:function(){ go('order'); focusEl('orderProduct') }});
  out.push({ic:'calc',t:'حساب مكونات الطلب',run:function(){ go('order'); clickBtn('calcOrder') }});
  out.push({ic:'check',t:'تأكيد الإنتاج وخصم الخامات',run:function(){ go('order'); clickBtn('deductOrder') }});
  out.push({ic:'plus',t:'إضافة رصيد مخزون',run:function(){ go('stock'); focusEl('stockIngredient') }});
  out.push({ic:'list',t:'فتح المنيو',run:function(){ go('menu') }});
  out.push({ic:'receipt',t:'تسجيل مصروف',run:function(){ go('monthly'); focusEl('expenseAmount') }});
  out.push({ic:'bag',t:'تسجيل شراء خامة',run:function(){ go('purchases'); focusEl('purchaseIngredient') }});
  out.push({ic:'tag',t:'تسجيل سعر خامة',run:function(){ go('prices'); focusEl('priceIngredient') }});
  out.push({ic:'excel',t:'تصدير نسخة احتياطية Excel',run:function(){ clickBtn('exportBackup') }});
  out.push({ic:'database',t:'تنزيل نسخة استرداد JSON',run:function(){ clickBtn('exportJsonBackup') }});
  out.push({ic:'archive',t:'تقفيل الشهر',run:function(){ go('monthly'); clickBtn('closeMonth') }});
  out.push({ic:'refresh',t:'تحديث سجل التعديلات',run:function(){ go('audit'); clickBtn('refreshAudit') }});
  out.push({ic:'cloud',t:'تحميل آخر نسخة سحابية',run:function(){ clickBtn('reloadCloudButton') }});
  out.push({ic:'print',t:'طباعة الشاشة الحالية',run:function(){ window.print() }});
  out.push({ic:'shield',t:'فحص وإصلاح البيانات',h:'يفحص الوصفات والمخزون والأسعار',run:function(){ openHealth() }});
  out.push({ic:'logout',t:'تسجيل الخروج',run:function(){ clickBtn('signOutButton') }});
  return out;
}
function buildPalette(){
  pal=document.createElement('div'); pal.className='pm-pal'; pal.id='pmPalette';
  pal.innerHTML='<div class="pm-pal-box">'+
    '<div class="pm-pal-top">'+ico('search')+'<input id="pmPalInput" type="text" placeholder="ابحث عن قسم أو إجراء…" autocomplete="off" spellcheck="false"><span class="pm-kbd">Esc</span></div>'+
    '<div class="pm-pal-list" id="pmPalList"></div>'+
    '<div class="pm-pal-foot"><span><span class="pm-kbd">↑</span> <span class="pm-kbd">↓</span> تنقّل</span><span><span class="pm-kbd">Enter</span> تنفيذ</span><span><span class="pm-kbd">Ctrl</span>+<span class="pm-kbd">K</span> فتح</span></div>'+
  '</div>';
  document.body.appendChild(pal);
  palInput=$('pmPalInput'); palList=$('pmPalList');
  pal.addEventListener('click',function(e){ if(e.target===pal)closePalette() });
  palInput.addEventListener('input',renderPalette);
}
function renderPalette(){
  var q=norm(palInput.value);
  palItems=paletteItems().filter(function(it){ return !q||norm(it.t).indexOf(q)>=0||norm(it.h||'').indexOf(q)>=0 });
  palSel=0;
  if(!palItems.length){ palList.innerHTML='<div class="pm-pal-empty">لا توجد نتائج مطابقة.</div>'; return }
  palList.innerHTML=palItems.map(function(it,i){
    return '<div class="pm-pal-item'+(i===0?' sel':'')+'" data-i="'+i+'">'+ico(it.ic)+'<div class="pm-pal-txt">'+esc(it.t)+(it.h?'<small>'+esc(it.h)+'</small>':'')+'</div></div>';
  }).join('');
  [].slice.call(palList.children).forEach(function(el){
    el.onmouseenter=function(){ setSel(Number(el.dataset.i)) };
    el.onclick=function(){ runSel() };
  });
}
function setSel(i){
  palSel=Math.max(0,Math.min(palItems.length-1,i));
  [].slice.call(palList.children).forEach(function(el,k){ el.classList.toggle('sel',k===palSel) });
  var s=palList.children[palSel]; if(s&&s.scrollIntoView)s.scrollIntoView({block:'nearest'});
}
function runSel(){ var it=palItems[palSel]; if(!it)return; closePalette(); setTimeout(function(){ try{ it.run() }catch(e){ logErr('palette: '+(e&&e.message)) } },60) }
function openPalette(){
  if(!pal)buildPalette();
  pal.classList.add('show');
  palInput.value=''; renderPalette();
  setTimeout(function(){ try{ palInput.focus() }catch(e){} },40);
}
function closePalette(){ if(pal)pal.classList.remove('show') }

/* ==================== 7) فحص وإصلاح ==================== */
var sheet=null,sheetBody=null,sheetTitle=null;
function buildSheet(){
  sheet=document.createElement('div'); sheet.className='pm-sheet'; sheet.id='pmSheet';
  sheet.innerHTML='<div class="pm-sheet-box">'+
    '<div class="pm-sheet-top">'+ico('shield')+'<h3 id="pmSheetTitle">فحص وإصلاح البيانات</h3><button class="pm-x" id="pmSheetX" type="button" aria-label="إغلاق">×</button></div>'+
    '<div class="pm-sheet-body" id="pmSheetBody"></div>'+
    '<div class="pm-sheet-foot">'+
      '<button class="primary" id="pmSheetScan" type="button">'+ico('shield')+'إعادة الفحص الآن</button>'+ 
      '<button class="primary" id="pmSheetFixSafe" type="button">'+ico('check')+'إصلاح المشاكل الآمنة</button>'+ 
      '<button class="secondary" id="pmSheetSnap" type="button">'+ico('database')+'تنزيل نسخة استرداد</button>'+ 
    '</div></div>';
  document.body.appendChild(sheet);
  sheet.addEventListener('click',function(e){ if(e.target===sheet)closeSheet() });
  $('pmSheetX').onclick=closeSheet;
  $('pmSheetSnap').onclick=function(){ try{ call('downloadRecoverySnapshot','manual') }catch(e){} toast({k:'success',t:'نسخة استرداد',x:'تم تنزيل نسخة استرداد كاملة من بياناتك الحالية.',d:5000}) };
  $('pmSheetScan').onclick=function(){ openHealth(); toast({k:'info',t:'اكتمل الفحص',x:'أُعيد فحص بيانات التطبيق الحالية. راجع كل بند لمعرفة النتيجة.',d:4500}) };
  $('pmSheetFixSafe').onclick=function(){ runSafeRepairs() };
  sheetBody=$('pmSheetBody'); sheetTitle=$('pmSheetTitle');
}
function closeSheet(){ if(sheet)sheet.classList.remove('show') }
function chkRow(state,title,desc,count,fixLabel,onFix){
  var d=document.createElement('div');
  d.className='pm-chk '+(count>0?'bad':'ok');
  d.innerHTML=ico(count>0?'alertTri':'check')+
    '<div class="pm-chk-t">'+esc(title)+'<small>'+esc(desc)+'</small></div>';
  if(count>0&&onFix){
    var b=document.createElement('button');
    b.type='button'; b.className='pm-fix'; b.innerHTML=ico('restore')+esc(fixLabel);
    b.onclick=function(){
      var st=getState(); if(!st)return;
      putSnap('قبل إصلاح: '+title,st);
      var n=0; try{ n=onFix()||0 }catch(e){ logErr('fix '+title+': '+(e&&e.message)) }
      try{ call('save') }catch(e){}
      try{ call('renderAll') }catch(e){}
      toast({k:'success',t:'تم الإصلاح: '+title,x:'تم تصحيح '+n+' عنصر في بياناتك وتم حفظ التغيير.',d:9000});
      openHealth();
    };
    d.appendChild(b);
  }else if(count>0){
    var s=document.createElement('span'); s.className='pm-fix ghost'; s.textContent=count; d.appendChild(s);
  }
  return d;
}
function runSafeRepairs(){
  var st=getState(); if(!st){toast({k:'error',t:'تعذر الإصلاح',x:'بيانات التطبيق غير محمّلة.',d:5000});return}
  if(!confirm('سيتم حفظ نسخة استرداد أولًا، ثم إصلاح الأخطاء الآمنة فقط مثل القيم الرقمية غير الصالحة وإعدادات التكلفة الناقصة. لن يتم حذف أصناف أو حركات أو أرشيفات. هل تريد المتابعة؟'))return;
  var checks=healthChecks(),safeTitles=['بنية البيانات الأساسية ناقصة','مكونات وصفات غير صالحة','أرصدة سالبة أو غير رقمية','أسعار خامات غير صالحة','حركات مخزون بقيم غير رقمية','إعدادات تكلفة ناقصة','مكونات غير موجودة في المخزون'];
  var total=0,details=[];
  try{putSnap('قبل الإصلاح الآمن الشامل',clone(st))}catch(e){}
  checks.forEach(function(c){if(safeTitles.indexOf(c.title)<0)return;try{var before=Number(c.scan()||0);if(before>0){var n=Number(c.fix()||0);total+=n;details.push(c.title+': '+n)}}catch(e){logErr('safe repair '+c.title+': '+(e&&e.message));details.push(c.title+': تعذر الإصلاح')}});
  try{call('save')}catch(e){logErr('safe repair save: '+(e&&e.message))}
  try{call('renderAll')}catch(e){}
  openHealth();
  toast({k:total?'success':'info',t:total?'اكتمل الإصلاح الآمن':'لم توجد إصلاحات آمنة مطلوبة',x:total?'تم تصحيح '+total+' قيمة/عنصر. لم تُحذف أي أصناف أو حركات أو أرشيفات.':'لم يعثر الفحص على أخطاء ضمن البنود الآمنة. راجع البنود الأخرى يدويًا قبل حذف أي بيانات.',d:9000});
}
function unitOf(u){ try{ return unitBase(u) }catch(e){ return u||'جرام' } }
function healthChecks(){
  var st=getState()||{};
  var C=[];
  C.push({title:'بنية البيانات الأساسية ناقصة',desc:'يتأكد من وجود أقسام الوصفات والمخزون والأسعار والسجلات بصيغتها الصحيحة',
    scan:function(){var n=0;[['recipes','object'],['prices','object'],['recipeMeta','object'],['inventory','array'],['history','array'],['purchasesLog','array'],['orders','array'],['monthlyArchives','array']].forEach(function(p){var v=st[p[0]];if(p[1]==='array'?!Array.isArray(v):(!v||typeof v!=='object'||Array.isArray(v)))n++});return n},
    fix:function(){var n=0;[['recipes',{}],['prices',{}],['recipeMeta',{}],['inventory',[]],['history',[]],['purchasesLog',[]],['orders',[]],['monthlyArchives',[]]].forEach(function(p){var v=st[p[0]],bad=Array.isArray(p[1])?!Array.isArray(v):(!v||typeof v!=='object'||Array.isArray(v));if(bad){st[p[0]]=p[1];n++}});return n}});
  C.push({title:'مكونات وصفات غير صالحة',desc:'مكوّن بدون اسم أو بكمية غير صحيحة',
    scan:function(){ var n=0; Object.keys(st.recipes||{}).forEach(function(k){ (st.recipes[k]||[]).forEach(function(c){ if(!c||!String(c.name||'').trim()||!isNum(c.qty)||Number(c.qty)<=0)n++ }) }); return n },
    fix:function(){ var n=0; Object.keys(st.recipes||{}).forEach(function(k){ var a=(st.recipes[k]||[]).filter(function(c){ return c&&String(c.name||'').trim()&&isNum(c.qty)&&Number(c.qty)>0 }); n+=(st.recipes[k]||[]).length-a.length; st.recipes[k]=a }); return n }});
  C.push({title:'خامات مكررة في المخزون',desc:'نفس الخامة مكررة بأكثر من سطر',
    scan:function(){ var seen={},n=0; (st.inventory||[]).forEach(function(x){ var k=String(x.name)+'|'+unitOf(x.unit); if(seen[k])n++; else seen[k]=1 }); return n },
    fix:function(){ var map={},n=0; var out=[]; (st.inventory||[]).forEach(function(x){
        var k=String(x.name)+'|'+unitOf(x.unit);
        if(map[k]!==undefined){ var f=out[map[k]]; var fct=(typeof factor==='function')?factor:null; var base=(typeof norm==='function')?norm:null;
          var add=base?base(x.qty,x.unit):Number(x.qty||0);
          var div=fct?fct(f.unit):1; f.qty=Number(f.qty||0)+add/(div||1); n++; }
        else{ map[k]=out.length; out.push(x) }
      }); st.inventory=out; return n }});
  C.push({title:'أرصدة سالبة أو غير رقمية',desc:'رصيد أقل من صفر أو غير رقم',
    scan:function(){ return (st.inventory||[]).filter(function(x){ return !isNum(x.qty)||Number(x.qty)<0 }).length },
    fix:function(){ var n=0; (st.inventory||[]).forEach(function(x){ if(!isNum(x.qty)||Number(x.qty)<0){ x.qty=isNum(x.qty)?Math.max(0,Number(x.qty)):0; n++ } }); return n }});
  C.push({title:'مكونات غير موجودة في المخزون',desc:'مكوّن مستخدم في وصفة وليس له رصيد',
    scan:function(){ var have={}; (st.inventory||[]).forEach(function(x){ have[String(x.name)]=1 }); var miss={},n=0;
      Object.keys(st.recipes||{}).forEach(function(k){ (st.recipes[k]||[]).forEach(function(c){ var nm=String(c.name||'').trim(); if(nm&&!have[nm]&&!miss[nm]){ miss[nm]=c.unit||'جرام'; n++ } }) }); return n },
    fix:function(){ var have={}; (st.inventory||[]).forEach(function(x){ have[String(x.name)]=1 }); var n=0;
      Object.keys(st.recipes||{}).forEach(function(k){ (st.recipes[k]||[]).forEach(function(c){ var nm=String(c.name||'').trim(); if(nm&&!have[nm]){ have[nm]=1; st.inventory.push({name:nm,unit:c.unit||'جرام',qty:0}); n++ } }) }); return n }});
  C.push({title:'أسعار خامات غير صالحة',desc:'سعر أو حجم عبوة غير رقمي أو سالب',
    scan:function(){ var n=0; Object.keys(st.prices||{}).forEach(function(k){ var p=st.prices[k]||{}; ['purchasePrice','packSize','reorder'].forEach(function(f){ var v=p[f]; if(v!==undefined&&v!==null&&v!==''&&(!isNum(v)||Number(v)<0))n++ }) }); return n },
    fix:function(){ var n=0; Object.keys(st.prices||{}).forEach(function(k){ var p=st.prices[k]||{}; ['purchasePrice','packSize','reorder'].forEach(function(f){ var v=p[f]; if(v!==undefined&&v!==null&&v!==''&&(!isNum(v)||Number(v)<0)){ p[f]=0; n++ } }) }); return n }});
  C.push({title:'أسعار لخامات غير مستخدمة',desc:'سعر مسجّل لخامة غير موجودة',
    scan:function(){ var names={}; try{ (typeof allIngredientNames==='function'?allIngredientNames():[]).forEach(function(n){ names[n]=1 }) }catch(e){}
      var n=0; Object.keys(st.prices||{}).forEach(function(k){ if(!names[k])n++ }); return n },
    fix:function(){ var names={}; try{ (typeof allIngredientNames==='function'?allIngredientNames():[]).forEach(function(n){ names[n]=1 }) }catch(e){}
      var n=0; Object.keys(st.prices||{}).forEach(function(k){ if(!names[k]){ delete st.prices[k]; n++ } }); return n }});
  C.push({title:'حركات مخزون بقيم غير رقمية',desc:'حركة إضافة أو خصم غير رقمية',
    scan:function(){ return (st.history||[]).filter(function(x){ return (x.add!==undefined&&!isNum(x.add))||(x.deduct!==undefined&&!isNum(x.deduct)) }).length },
    fix:function(){ var n=0; (st.history||[]).forEach(function(x){ if(x.add!==undefined&&!isNum(x.add)){ x.add=0; n++ } if(x.deduct!==undefined&&!isNum(x.deduct)){ x.deduct=0; n++ } }); return n }});
  C.push({title:'إعدادات تكلفة ناقصة',desc:'صنف بدون إعدادات ناتج وهامش ربح',
    scan:function(){ st.recipeMeta=st.recipeMeta||{}; var n=0; Object.keys(st.recipes||{}).forEach(function(k){ if(!st.recipeMeta[k])n++ }); return n },
    fix:function(){ st.recipeMeta=st.recipeMeta||{}; var n=0; Object.keys(st.recipes||{}).forEach(function(k){ if(!st.recipeMeta[k]){ st.recipeMeta[k]={yieldQty:1,marginPct:30,extraCost:0,actualPrice:0}; n++ } }); return n }});
  C.push({title:'خامات بأسماء غامضة أو تجريبية',desc:'اسم قصير جدًا أو أرقام فقط أو لاتيني — غالبًا بقايا اختبار',
    scan:function(){
      function bad(n){var t=String(n||'').trim();if(!t)return false;if(t.length<2)return true;if(/^\d+$/.test(t))return true;if(/^[A-Za-z0-9_]+$/.test(t))return true;return false}
      var n=0;(st.inventory||[]).forEach(function(x){if(bad(x.name))n++});return n},
    fix:function(){
      function bad(n){var t=String(n||'').trim();if(!t)return false;if(t.length<2)return true;if(/^\d+$/.test(t))return true;if(/^[A-Za-z0-9_]+$/.test(t))return true;return false}
      var removed=[];
      (st.inventory||[]).forEach(function(x){if(bad(x.name))removed.push(String(x.name))});
      var n=removed.length; if(!n)return 0;
      st.inventory=(st.inventory||[]).filter(function(x){return !bad(x.name)});
      removed.forEach(function(nm){if(st.prices&&st.prices[nm]){delete st.prices[nm]}});
      if(Array.isArray(st.history))st.history=st.history.filter(function(h){return removed.indexOf(String(h.name))<0});
      if(Array.isArray(st.purchasesLog))st.purchasesLog=st.purchasesLog.filter(function(p){return removed.indexOf(String(p.name))<0});
      return n}
  });
  C.push({title:'أصناف في الطلب بلا وصفة',desc:'صنف مضاف للطلب ووصفته غير موجودة',
    scan:function(){ return (st.orders||[]).filter(function(o){ return !st.recipes||!st.recipes[o.name] }).length },
    fix:function(){ var before=(st.orders||[]).length; st.orders=(st.orders||[]).filter(function(o){ return st.recipes&&st.recipes[o.name] }); return before-(st.orders||[]).length }});
  return C;
}
function openHealth(){
  if(!sheet)buildSheet();
  var st=getState();
  sheetBody.innerHTML='';
  if(!st){ sheetBody.innerHTML='<div class="pm-pal-empty">لا توجد بيانات محمّلة بعد.</div>'; sheet.classList.add('show'); return }
  var checks=healthChecks(),bad=0;
  checks.forEach(function(c){
    var n=0; try{ n=c.scan()||0 }catch(e){ n=0; logErr('scan '+c.title+': '+(e&&e.message)) }
    if(n>0)bad++;
    sheetBody.appendChild(chkRow(null,c.title,c.desc,n,'إصلاح',c.fix));
  });
  var info=document.createElement('p');
  info.className='small'; info.style.margin='12px 2px 2px';
  var sn=snaps();
  info.textContent='لقطات سريعة محفوظة للتراجع: '+sn.length+' · أحدثها: '+(sn.length?new Date(sn[sn.length-1].t).toLocaleString('ar-EG'):'—');
  sheetBody.appendChild(info);
  sheetTitle.textContent=bad?('فحص البيانات · '+bad+' ملاحظة'):'فحص البيانات · لا مشاكل';
  sheet.classList.add('show');
}
window.__PM_HEALTH__=openHealth;

/* ==================== 8) الوضع الليلي ==================== */
function toggleTheme(){
  document.documentElement.setAttribute('data-theme','light');
  try{ localStorage.setItem('pmTheme','light'); }catch(e){}
  toast({k:'success',t:'هوية RMY',x:'تم تثبيت الواجهة على الوضع النهاري.',d:2200});
}
window.__PM_THEME__=toggleTheme;
(function(){
  try{ localStorage.setItem('pmTheme','light'); }catch(e){}
  document.documentElement.setAttribute('data-theme','light');
})();

/* ==================== 10) أدوات الإدخال ==================== */
(function(){
  ['orderQty','saleQty','purchaseQty','stockAddQty','expenseAmount','salePrice'].forEach(function(id){
    var inp=$(id); if(!inp||inp.dataset.pmStep)return;
    inp.dataset.pmStep='1'; inp.classList.add('pm-num-fix');
    var w=document.createElement('div'); w.className='pm-numwrap';
    inp.parentNode.insertBefore(w,inp); w.appendChild(inp);
    var s=document.createElement('span'); s.className='pm-stepper';
    ['−','+'].forEach(function(txt,i){
      var b=document.createElement('button');
      b.type='button'; b.textContent=txt; b.setAttribute('aria-label',i?'زيادة':'إنقاص');
      b.onclick=function(e){
        e.preventDefault(); e.stopPropagation();
        var raw=inp.getAttribute('step');
        var stepv=(raw&&raw!=='any')?Number(raw):1; if(!isNum(stepv)||!stepv)stepv=1;
        var dec=(String(inp.value||'').split('.')[1]||'').length;
        var v=Number(inp.value||0); if(!isNum(v))v=0;
        var mn=Number(inp.getAttribute('min')||0); if(!isNum(mn))mn=0;
        var nv=v+(i?stepv:-stepv);
        if(nv<mn)nv=mn;
        inp.value=String(Number(nv.toFixed(Math.min(Math.max(dec,0),4))));
        try{ inp.dispatchEvent(new Event('input',{bubbles:true})) }catch(_){}
      };
      s.appendChild(b);
    });
    w.appendChild(s);
  });
})();
(function(){
  [['saleProduct','addSale'],['expenseAmount','addExpense'],['purchaseIngredient','addPurchase'],
   ['orderQty','addOrder'],['stockAddQty','addStock'],
   ['pricePurchase','savePrice'],['costYield','saveCostSettings']].forEach(function(p){
    var el=$(p[0]); if(!el||!el.closest)return;
    var card=el.closest('.card'); if(card&&!card.dataset.pmSubmit)card.dataset.pmSubmit=p[1];
  });
})();
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;
  var t=e.target; if(!t)return;
  if(t.tagName==='TEXTAREA')return;
  if(t.id==='sharedPassword'){ e.preventDefault(); clickBtn('signInButton'); return }
  if(t.id==='employeePin'){ e.preventDefault(); clickBtn('unlockButton'); return }
  if(t.tagName!=='INPUT'&&t.tagName!=='SELECT')return;
  if(t.type==='file')return;
  var card=t.closest?t.closest('.card'):null;
  var id=card&&card.dataset.pmSubmit;
  if(id){ e.preventDefault(); clickBtn(id) }
});

/* ==================== 11) بحث داخل الجداول ==================== */
(function(){
  var SEARCH_SVG=ico('search');
  ['salesTable','expensesTable','purchasesTable','historyTable','archivesTable','pricesTable','stockTable'].forEach(function(id){
    var box=$(id); if(!box||box.dataset.pmSearch||!box.parentNode)return;
    box.dataset.pmSearch='1';
    var wrap=document.createElement('div'); wrap.className='pm-tsearch';
    var inp=document.createElement('input');
    inp.type='search'; inp.placeholder='بحث داخل الجدول…'; inp.setAttribute('aria-label','بحث داخل الجدول');
    var ic=document.createElement('span'); ic.className='ui-ico'; ic.innerHTML=SEARCH_SVG;
    wrap.appendChild(inp); wrap.appendChild(ic);
    var cnt=document.createElement('p'); cnt.className='pm-tcount';
    box.parentNode.insertBefore(wrap,box);
    box.parentNode.insertBefore(cnt,box);
    if(id==='stockTable'){ wrap.style.display='none'; cnt.style.display='none' }
    function apply(){
      var q=String(inp.value||'').trim().toLowerCase();
      var rows=box.querySelectorAll('tr'); var shown=0,total=0;
      for(var i=0;i<rows.length;i++){
        var tr=rows[i];
        if(!tr.querySelector('td')){ tr.style.display=''; continue }
        total++;
        var ok=!q||String(tr.textContent||'').toLowerCase().indexOf(q)>=0;
        tr.style.display=ok?'':'none';
        if(ok)shown++;
      }
      cnt.textContent=q?('يظهر '+shown+' من '+total):'';
    }
    inp.addEventListener('input',apply);
    new MutationObserver(function(){ clearTimeout(box._pmt); box._pmt=setTimeout(apply,80) }).observe(box,{childList:true,subtree:true});
  });
})();

/* ==================== 12) زر عائم ==================== */
(function(){
  var c=document.createElement('div'); c.className='pm-fabs'; c.id='pmFabs';
  var menu=document.createElement('div'); menu.className='pm-menu';
  var items=[
    ['shield','فحص وإصلاح',function(){ openHealth() }],
    ['support','الدعم الفني',function(){ window.open('https://wa.me/201066297395?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%20RMY','_blank','noopener,noreferrer') }],
    ['database','نسخة استرداد',function(){ try{ call('downloadRecoverySnapshot','manual') }catch(e){} toast({k:'success',t:'نسخة استرداد',x:'تم تنزيل نسخة استرداد كاملة من بياناتك.',d:5000}) }]
  ];
  items.forEach(function(it){
    var b=document.createElement('button');
    b.type='button'; b.className='pm-mi';
    var itemIcon=ico(it[0]);
    b.innerHTML=itemIcon+'<span>'+it[1]+'</span>';
    b.onclick=function(e){ e.stopPropagation(); c.classList.remove('open'); it[2]() };
    menu.appendChild(b);
  });
  var main=document.createElement('button');
  main.type='button'; main.className='pm-fab'; main.id='pmFabMain';
  main.setAttribute('aria-label','أدوات سريعة');
  main.innerHTML='<span class="ui-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span>';
  main.onclick=function(e){ e.stopPropagation(); c.classList.toggle('open') };
  document.addEventListener('click',function(){ c.classList.remove('open') });
  c.appendChild(menu); c.appendChild(main);
  document.body.appendChild(c);
})();

/* لمسة موجية على الأزرار */
document.addEventListener('pointerdown',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button'):null;
  if(!b||b.disabled)return;
  if(b.closest&&b.closest('.pm-fabs'))return;
  var r=b.getBoundingClientRect(); if(!r.width)return;
  var s=document.createElement('span'); s.className='pm-ripple';
  var d=Math.max(r.width,r.height)*1.2;
  s.style.width=s.style.height=d+'px';
  s.style.left=((e.clientX-r.left)-d/2)+'px';
  s.style.top=((e.clientY-r.top)-d/2)+'px';
  b.appendChild(s);
  setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s) },640);
},true);

/* ==================== 13) اختصارات لوحة المفاتيح ==================== */
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); openPalette(); return }
  if(e.key==='Escape'){ closePalette(); closeSheet(); return }
  if(pal&&pal.classList.contains('show')){
    if(e.key==='ArrowDown'){ e.preventDefault(); setSel(palSel+1); return }
    if(e.key==='ArrowUp'){ e.preventDefault(); setSel(palSel-1); return }
    if(e.key==='Enter'){ e.preventDefault(); runSel(); return }
  }
  if(e.altKey&&!e.ctrlKey&&!e.metaKey){
    if(e.key==='ArrowRight'){ e.preventDefault(); goRel(-1); return }
    if(e.key==='ArrowLeft'){ e.preventDefault(); goRel(1); return }
    if(/^[1-9]$/.test(e.key)){
      e.preventDefault();
      var tabs=[].slice.call(document.querySelectorAll('nav.tabs .tab')).filter(function(b){ return b.style.display!=='none' });
      var t=tabs[Number(e.key)-1]; if(t)t.click();
      return;
    }
  }
});

/* ==================== 14) شريط الاستعادة بعد إقلاع غير سليم ==================== */
function recoverBar(title,body,acts){
  var m=document.querySelector('main.wrap')||document.body;
  var d=document.createElement('div'); d.className='pm-recover';
  d.innerHTML='<b>'+esc(title)+'</b><span>'+esc(body)+'</span><div class="pm-rec-acts"></div>';
  var box=d.querySelector('.pm-rec-acts');
  acts.forEach(function(a){
    var b=document.createElement('button');
    b.type='button'; if(a.ghost)b.className='ghost';
    b.innerHTML=ico(a.icon||'check')+esc(a.label);
    b.onclick=function(){ if(a.keep!==true&&d.parentNode)d.parentNode.removeChild(d); try{ a.run() }catch(e){} };
    box.appendChild(b);
  });
  m.insertBefore(d,m.firstChild);
}
window.addEventListener('load',function(){
  setTimeout(function(){ try{ localStorage.setItem('pm_boot_session','0') }catch(e){} },2500);
  setTimeout(function(){
    if(BOOT.repaired){
      recoverBar('تم إصلاح نسخة محفوظة تالفة تلقائيًا',
        'كانت النسخة المحفوظة على هذا الجهاز غير قابلة للقراءة، فتم نقلها إلى نسخة آمنة وبدأ التطبيق ببيانات سليمة دون فقدان أي شيء.',
        [{label:'تنزيل النسخة القديمة للمراجعة',icon:'download',keep:true,run:function(){
            try{ var raw=localStorage.getItem(BOOT.backupKey); if(raw)call('download','RMY_corrupt_backup.json',raw,'application/json;charset=utf-8') }catch(e){}
          }},
         {label:'حسنًا، فهمت',icon:'check',run:function(){}}]);
    }
    if(BOOT.crashed){
      recoverBar('الجلسة السابقة لم تُغلق بشكل سليم',
        'ربما أُغلقت الصفحة فجأة أو حدث خطأ. بياناتك محفوظة ويمكنك المتابعة بأمان.',
        [{label:'تنزيل نسخة استرداد',icon:'database',keep:true,run:function(){ try{ call('downloadRecoverySnapshot','manual') }catch(e){} }},
         {label:'متابعة بدون تغيير',icon:'check',run:function(){}}]);
    }
    if(window.__PM_STORAGE_FULL__){
      toast({k:'warn',t:'التخزين ممتلئ',x:'مساحة التخزين على الجهاز ممتلئة. تم تنظيف نسخ قديمة تلقائيًا؛ نزّل نسخة استرداد للاطمئنان.',d:9000});
    }
  },900);
});
window.addEventListener('pagehide',function(){ try{ localStorage.setItem('pm_boot_session','0') }catch(e){} });
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ try{ localStorage.setItem('pm_boot_session','0') }catch(e){} } });

/* ==================== 15) استعادة آخر قسم + ترحيب بسيط ==================== */
(function(){
  var restored=false;
  function tryRestore(){
    if(restored)return;
    if(document.body.classList.contains('auth-required'))return;
    restored=true;
    var last=pmHomeTab(); /* دايمًا تفتح على الرئيسية */
    if(last&&$(last)){ try{ go(last) }catch(e){} }
  }
  new MutationObserver(tryRestore).observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(tryRestore,1200);
})();

/* ==================== 16) حقوق الطبع والنشر أسفل التطبيق ==================== */
(function(){
  function buildFoot(){
    var f=document.querySelector('footer'); if(!f)return;
    if(f.dataset.pmFoot)return; f.dataset.pmFoot='1';
    f.classList.add('pm-footer');
    f.innerHTML='<div class="pm-foot-copy">© <span id="pmYear">'+new Date().getFullYear()+'</span> جميع حقوق الطبع والنشر محفوظة لـ <b>Pastry Chef Mohamed Yousry</b></div>';
  }
  buildFoot();
  if(!document.querySelector('footer')){
    new MutationObserver(function(){ if(document.querySelector('footer'))buildFoot() })
      .observe(document.documentElement,{childList:true,subtree:true});
  }
})();

})();
