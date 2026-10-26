/* مهلة 20 ثانية لطلب حفظ الحالة: لو الخادم ما ردش، التعديل يتحفظ على الجهاز ويتعاد رفعه تلقائيًا بدل ما الحالة تفضل معلقة */
(function(){
  if(window.__pmSaveTimeout) return; window.__pmSaveTimeout=true;
  var prev=window.apiCall;
  if(typeof prev!=='function') return;
  window.apiCall=function(body){
    var p=prev.apply(this,arguments);
    if(!body||body.action!=='save_state') return p;
    var timeout=new Promise(function(_,reject){
      setTimeout(function(){ reject(new Error('انتهت مهلة الاتصال بالخادم. التعديل محفوظ على الجهاز وسيُعاد رفعه تلقائيًا.')) },20000);
    });
    return Promise.race([p,timeout]);
  };
})();
