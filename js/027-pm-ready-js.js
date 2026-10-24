(function(){
  if(window.__pmReady)return; window.__pmReady=true;
  function digits(v){ return String(v).replace(/[\u0660-\u0669]/g,function(d){return String('\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669').indexOf(d)}) }
  /* يسأل الشيف عدد القطع اللي طلعت من كل صنف قبل تأكيد الإنتاج */
  window.__pmAskReady=function(orders){
    var out={};
    var list=(orders||[]).filter(function(o){return o&&o.name});
    for(var i=0;i<list.length;i++){
      var o=list[i], name=String(o.name);
      var meta=(state.recipeMeta||{})[name]||{};
      var per=Number(meta.yieldQty)||1;
      var batches=Number(o.qty)||0;
      var suggest=Math.round(batches*per);
      var v=prompt('كام قطعة طلعت من «'+name+'»؟\n(عدد الوزنات: '+batches+')', String(suggest));
      if(v===null) return null;
      var n=Number(digits(v).trim());
      if(!Number.isInteger(n)||n<0){ alert('اكتب عدد صحيح (0 أو أكتر) لـ «'+name+'».'); return null; }
      out[name]=(out[name]||0)+n;
    }
    return out;
  };
})();
