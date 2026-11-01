(function(){
  /* تنظيف المبيعات قبل التقفيل: يمنع تكرار نفس سطر البيع، ويستبعد أي فاتورة سبق أرشفتها في تقفيل سابق */
  function lineKey(x){
    return [x.receiptId||'', x.receiptNo||'', x.name||'', Number(x.qty)||0, Number(x.unitPrice)||0, Number(x.revenue)||0, x.at||'', x.by||''].join('|');
  }
  function archivedKeys(){
    var keys={}, ids={};
    (state.monthlyArchives||[]).forEach(function(a){
      (a.salesLog||[]).forEach(function(x){
        if(!x||typeof x!=='object')return;
        keys[lineKey(x)]=true;
        if(x.receiptId)ids[x.receiptId]=true;
      });
    });
    return {keys:keys, ids:ids};
  }
  window.pmCleanSalesForClose=function(list){
    var arch=archivedKeys(), seen={}, out=[], removed=0;
    (list||[]).forEach(function(x){
      if(!x||typeof x!=='object'){ out.push(x); return; }
      var k=lineKey(x);
      if(seen[k] || arch.keys[k] || (x.receiptId && arch.ids[x.receiptId])){ removed++; return; }
      seen[k]=true; out.push(x);
    });
    window.pmCleanReport={removed:removed};
    return out;
  };
})();
