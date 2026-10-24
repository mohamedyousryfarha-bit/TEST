/* فلترة تبويبات القائمة حسب الصلاحية + إخفاء الأقسام الفاضية.
   الفلترة بتتعمل بالـ data-tab (مش بترتيب الأقسام)، عشان أي تغيير في الترتيب ما يبوظش الصلاحيات. */
(function(){
  if(window.__pmNavFilter) return; window.__pmNavFilter=true;

  var ALL=['analytics','customers','menu','cartpage','salesInvoices','order','recipes:food','recipes:drink','stock','history','purchases','prices','costing','expenses','monthly','audit','backup','parties','partyInvoices','partyTemplate','drinkQueue','drinkProduce'];

  function minus(list){ return ALL.filter(function(k){ return list.indexOf(k)<0; }); }

  /* admin / employee: قائمة منع (deny) عشان أي تبويب ما نعرفوش يفضل ظاهر للمدير.
     sales / kitchen / barista: قائمة سماح (allow) زي ما كانت الصلاحيات الأصلية. */
  var RULES={
    admin:    {deny:['salesInvoices']},
    employee: {deny:['analytics','cartpage','drinkQueue','drinkProduce','recipes:drink']},
    sales:    {allow:['customers','menu','cartpage','parties','partyInvoices','openInvoices']},
    kitchen:  {allow:['order','recipes:food','stock']},
    barista:  {allow:['drinkProduce','drinkQueue','recipes:drink']}
  };

  function tabKey(b){
    var t=b.getAttribute('data-tab')||'';
    var g=b.getAttribute('data-rgroup');
    return g ? t+':'+g : t;
  }

  /* يرجّع الصلاحية الحالية، أو null لو مفيش صلاحية لسه (قبل تسجيل الدخول) → ما نفلترش حاجة */
  function currentRole(){
    var r=document.body.getAttribute('data-role')||'';
    if(!r){
      var m=(document.body.className||'').match(/role-(\w+)/);
      r=m?m[1]:'';
    }
    if(!r) return null;
    return RULES[r] ? r : 'employee';
  }

  function isHidden(rule,key){
    if(rule.allow) return rule.allow.indexOf(key)<0;
    if(rule.deny)  return rule.deny.indexOf(key)>=0;
    return false;
  }

  function apply(){
    var nav=document.getElementById('appNav');
    if(!nav) return;
    var role=currentRole();
    var rule=role?RULES[role]:null;
    nav.querySelectorAll('.tab').forEach(function(b){
      b.classList.toggle('pm-tab-off', !!rule && isHidden(rule,tabKey(b)));
    });
    nav.querySelectorAll('.nav-group').forEach(function(g){
      var visible=g.querySelectorAll('.tab:not(.pm-tab-off)').length;
      g.classList.toggle('pm-grp-off', rule!==null && visible===0);
    });
  }

  var t=null;
  function schedule(){ clearTimeout(t); t=setTimeout(apply,30); }

  var nav=document.getElementById('appNav');
  if(nav) new MutationObserver(schedule).observe(nav,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-role','class']});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule);
  schedule();
  setTimeout(apply,1200);
  setTimeout(apply,3000);
})();
