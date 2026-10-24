(function(){
  if(window.__pmCust) return; window.__pmCust=true;
  function esc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}) }
  function money(v){ return (Math.round((Number(v)||0)*100)/100).toFixed(2) }
  function digits(p){ return String(p||'').replace(/\D/g,'') }
  function normName(n){ return String(n||'').trim().replace(/\s+/g,' ').toLowerCase() }
  function customers(){
    var sales=(typeof state!=='undefined'&&state&&Array.isArray(state.salesLog))?state.salesLog:[];
    var groups=(typeof window.pmGroupInvoices==='function')?window.pmGroupInvoices(sales):[];
    var map={}, list=[];
    groups.forEach(function(g){
      var name=String(g.note||'').trim(), phone=String(g.customerPhone||'').trim();
      if(!name && !phone) return;
      var key=digits(phone)?'p:'+digits(phone):'n:'+normName(name);
      var c=map[key];
      if(!c){ c=map[key]={name:'',phone:'',count:0,total:0,last:''}; list.push(c); }
      if(!c.name&&name)c.name=name;
      if(!c.phone&&phone)c.phone=phone;
      if(!c.last)c.last=g.date||'';
      c.count++;
      c.total+=Number(g.total)||0;
    });
    list.sort(function(a,b){ return b.total-a.total; });
    return list;
  }
  function render(){
    var tbody=document.getElementById('custTable'); if(!tbody) return;
    var all=customers();
    var q=normName((document.getElementById('custSearch')||{}).value||'');
    var qd=digits(q);
    var rows=all.filter(function(c){
      if(!q) return true;
      return normName(c.name).indexOf(q)>-1 || (qd && digits(c.phone).indexOf(qd)>-1);
    });
    var cEl=document.getElementById('custCount'), tEl=document.getElementById('custTotal');
    if(cEl) cEl.textContent=String(all.length);
    if(tEl) tEl.textContent=money(all.reduce(function(s,c){return s+c.total},0));
    tbody.innerHTML = rows.length ? rows.map(function(c){
      return '<tr><td>'+esc(c.name||'—')+'</td><td dir="ltr">'+esc(c.phone||'—')+'</td><td>'+c.count+'</td><td>'+money(c.total)+' ج.م</td><td>'+esc(c.last)+'</td></tr>';
    }).join('') : '<tr><td colspan="5" class="empty">'+(all.length?'مفيش عميل مطابق للبحث':'لسه مفيش عملاء مسجلين في الفواتير')+'</td></tr>';
  }
  window.pmExportCustomersExcel=function(){
    if(typeof XLSX==='undefined'||typeof window.sheetFromObjects!=='function'){
      alert('مكتبة Excel لم تُحمّل. افتح التطبيق مع اتصال بالإنترنت ثم أعد المحاولة.');return;
    }
    var all=customers();
    if(!all.length){ alert('لا يوجد عملاء لتصديرهم بعد.'); return; }
    var rows=all.map(function(c){
      return {
        'العميل':c.name||'',
        'التليفون':c.phone||'',
        'عدد الفواتير':c.count,
        'إجمالي المشتريات (ج.م)':Math.round(c.total*100)/100,
        'آخر شراء':c.last||''
      };
    });
    var wb=XLSX.utils.book_new();
    wb.Props={Title:'RMY - العملاء',Author:'RMY',CreatedDate:new Date()};
    window.sheetFromObjects(wb,'العملاء',rows);
    XLSX.writeFile(wb,'RMY_Customers_'+new Date().toISOString().slice(0,10)+'.xlsx',{bookType:'xlsx',compression:true,cellStyles:true});
  };
  var s=document.getElementById('custSearch'); if(s) s.addEventListener('input',render);
  var _go=window.go;
  window.go=function(id){ var r=_go.apply(this,arguments); if(id==='customers') render(); return r; };
  var _apply=window.applyRoleUI;
  window.applyRoleUI=function(){
    var r=_apply?_apply.apply(this,arguments):undefined;
    var adm=(typeof cloudActorRole!=='undefined'&&cloudActorRole==='admin');
    var b=document.querySelector('.tabs .tab[data-tab="customers"]');
    if(b) b.style.display=adm?'':'none';
    return r;
  };
})();
