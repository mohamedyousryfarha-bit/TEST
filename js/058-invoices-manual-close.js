(function(){
  'use strict';
  if(window.__pmManualInvoiceCloseFixedV2)return;
  window.__pmManualInvoiceCloseFixedV2=true;
  function roleAllowed(){
    var role=String((typeof cloudActorRole!=='undefined'?cloudActorRole:window.cloudActorRole)||'').toLowerCase();
    return role==='admin'||role==='sales';
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function money(v){return (Number(v)||0).toLocaleString('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2})+' ج.م'}
  function receiptKey(x){return String(x.receiptId||('legacy-'+(x.receiptNo||'')+'-'+(x.date||x.at||'')+'-'+(x.by||'')))}
  function normTxt(v){ return String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase(); }
  function pendingDrinksFor(g){
    var pend=(Array.isArray(state.drinkOrders)?state.drinkOrders:[]).filter(function(o){ return o && String(o.status||'')==='pending'; });
    var used={}, out=[];
    g.lines.forEach(function(x){
      if(!(window.pmIsDrinkLine && window.pmIsDrinkLine(x))) return;
      var idx=pend.findIndex(function(o,i){
        return !used[i] && normTxt(o.name)===normTxt(x.name) && Number(o.qty)===Number(x.qty) &&
               (!normTxt(o.note)||!normTxt(x.note)||normTxt(o.note)===normTxt(x.note));
      });
      if(idx>=0){ used[idx]=true; out.push(String(x.name)+' × '+String(x.qty)); }
    });
    return out;
  }
  function loadServerSales(){
    var c=(typeof cloudClient!=='undefined')?cloudClient:null;
    var ready=(typeof cloudReady!=='undefined')?cloudReady:false;
    var who=(typeof cloudActorName!=='undefined'?cloudActorName:window.cloudActorName);
    var pin=(typeof cloudActorPin!=='undefined'?cloudActorPin:window.cloudActorPin);
    if(!c||!ready||!who||!pin)return Promise.resolve();
    return c.rpc('pastrymy_sales_invoices',{p_employee_name:who,p_pin:pin}).then(function(res){
      if(res&&!res.error&&res.data&&Array.isArray(res.data.entries)){window.__pmSalesLogServer=res.data.entries;}
    }).catch(function(){});
  }
  function groups(){
    var appState=(typeof state!=='undefined'&&state)?state:window.state;
    var logs=Array.isArray(window.__pmSalesLogServer)?window.__pmSalesLogServer:((appState&&Array.isArray(appState.salesLog))?appState.salesLog:[]);
    var map={};
    logs.forEach(function(x){
      var id=receiptKey(x);
      if(!map[id])map[id]={id:id,no:x.receiptNo||'—',date:x.date||x.at||'',by:x.by||'—',lines:[],total:0,status:'open'};
      map[id].lines.push(x);
      map[id].total+=Number(x.revenue!=null?x.revenue:(Number(x.qty)||0)*(Number(x.unitPrice)||0));
      
    });
    return Object.keys(map).map(function(k){
      var g=map[k];
      if(g.lines.length&&g.lines.every(function(x){return x.invoiceStatus==='closed'}))g.status='closed';
      return g;
    }).filter(function(g){return g.status!=='closed'}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
  }
  function render(){
    var body=document.getElementById('pmOpenInvoicesBody');
    if(!body)return;
    if(!roleAllowed()){body.innerHTML='<div class="empty">هذه الصفحة متاحة للمبيعات والإدارة فقط.</div>';return}
    var arr=groups();
    window.pmOpenCount=arr.length;
    if(!arr.length){body.innerHTML='<div class="empty">لا توجد فواتير مفتوحة حاليًا.</div>';return}
    body.innerHTML=arr.map(function(g){
      return '<article class="card" style="margin:12px 0"><div class="sectionhead"><h3>فاتورة رقم '+esc(g.no)+'</h3><b>'+money(g.total)+'</b></div><p class="small">التاريخ: '+esc(g.date)+' · البائع: '+esc(g.by)+'</p><div class="tablewrap"><table><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>'+g.lines.map(function(x){return '<tr><td>'+esc(x.name||'')+'</td><td>'+esc(x.qty||0)+'</td><td>'+money(x.unitPrice)+'</td><td>'+money(x.revenue!=null?x.revenue:(Number(x.qty)||0)*(Number(x.unitPrice)||0))+'</td></tr>'}).join('')+'</table></div><div class="actions"><button type="button" class="secondary" data-pm-view-invoice="'+esc(g.id)+'">عرض الفاتورة</button><button type="button" class="secondary" data-pm-print-invoice="'+esc(g.id)+'">طباعة</button></div><button type="button" class="primary" data-pm-close-invoice="'+esc(g.id)+'">إغلاق الفاتورة يدويًا</button></article>';
    }).join('');
  }
  function build(){
    var tab=document.getElementById('pmOpenInvoicesTab');
    if(!tab){
      var nav=document.getElementById('appNav')||document.querySelector('nav.tabs');
      if(!nav)return false;
      var navGroups=Array.prototype.slice.call(nav.querySelectorAll('.nav-group'));
      var salesGroup=navGroups.find(function(g){var t=g.querySelector('.nav-title');return t&&t.textContent.trim().indexOf('المبيعات')!==-1;});
      var navItems=salesGroup&&salesGroup.querySelector('.nav-items');
      tab=document.createElement('button');
      tab.type='button';tab.className='tab';tab.id='pmOpenInvoicesTab';tab.dataset.tab='openInvoices';
      tab.textContent='الفواتير المفتوحة';
      tab.addEventListener('click',function(){if(roleAllowed()&&typeof window.go==='function')window.go('openInvoices')});
      if(navItems)navItems.appendChild(tab);
      else {var group=document.createElement('div');group.className='nav-group';group.innerHTML='<div class="nav-title">المبيعات</div><div class="nav-items"></div>';group.querySelector('.nav-items').appendChild(tab);nav.appendChild(group);}
    }
    var panel=document.getElementById('openInvoices');
    if(!panel){
      panel=document.createElement('section');panel.id='openInvoices';panel.className='panel';
      panel.innerHTML='<div class="sectionhead"><h2>الفواتير المفتوحة</h2><button type="button" class="secondary" id="pmOpenInvoicesRefresh">تحديث</button></div><p class="small">الفاتورة تظل مفتوحة حتى تغلقها المبيعات أو الإدارة يدويًا. تحضير المشروبات لا يغلق الفاتورة ولا يخصم المخزون.</p><div id="pmOpenInvoicesBody"></div>';
      var salesPanel=document.getElementById('sales');
      if(salesPanel&&salesPanel.parentElement)salesPanel.insertAdjacentElement('afterend',panel);
      else {var main=document.querySelector('main');(main||document.body).appendChild(panel);}
      panel.querySelector('#pmOpenInvoicesRefresh').addEventListener('click',function(){loadServerSales().then(render)});
      panel.addEventListener('click',async function(e){
        var vb=e.target.closest('[data-pm-view-invoice],[data-pm-print-invoice]');
        if(vb){
          var vid=vb.getAttribute('data-pm-view-invoice')||vb.getAttribute('data-pm-print-invoice');
          var vg=groups().find(function(g){return g.id===vid;});
          if(!vg){alert('الفاتورة مش موجودة. حدّث القايمة.');return}
          var cust=(vg.lines.find(function(x){return x.customerPhone})||{}).customerPhone;
          var nts=(vg.lines.find(function(x){return x.note})||{}).note;
          if(typeof window.pmShowInvoice!=='function'){alert('تعذر فتح الفاتورة.');return}
          window.pmShowInvoice({id:vg.id,no:vg.no,date:vg.date,by:vg.by,note:nts,customerPhone:cust,total:vg.total,lines:vg.lines});
          if(vb.hasAttribute('data-pm-print-invoice')){ var pb=document.getElementById('pmvPrint'); if(pb) pb.click(); }
          return;
        }
        var b=e.target.closest('[data-pm-close-invoice]');if(!b)return;
        if(!roleAllowed()){alert('الصلاحية للمبيعات والإدارة فقط.');return}
        var id=b.getAttribute('data-pm-close-invoice');
        var cg=groups().find(function(g){return g.id===id;});
        if(cg && cg.lines.some(function(x){return window.pmIsDrinkLine && window.pmIsDrinkLine(x);})){
          var gr=await window.apiCall({action:'get_state',employee_name:(typeof cloudActorName!=='undefined'?cloudActorName:window.cloudActorName),pin:(typeof cloudActorPin!=='undefined'?cloudActorPin:window.cloudActorPin)});
          if(gr&&gr.error){ alert('تعذر التحقق من حالة المشروبات. حاول تاني.'); return; }
          var remoteDrinks=gr&&gr.data&&gr.data.state&&gr.data.state.drinkOrders;
          if(Array.isArray(remoteDrinks)) state.drinkOrders=remoteDrinks;
          var waiting=pendingDrinksFor(cg);
          if(waiting.length){ alert('لا يمكن إغلاق الفاتورة قبل تحضير المشروبات دي:\n'+waiting.join('\n')); return; }
        }
        if(!confirm('تأكيد إغلاق الفاتورة يدويًا؟ لن يتم خصم أي مخزون.'))return;
        if(typeof window.apiCall!=='function'){alert('تعذر الاتصال بالخادم.');return}
        b.disabled=true;
        try{
          var actor={employee_name:(typeof cloudActorName!=='undefined'?cloudActorName:window.cloudActorName),pin:(typeof cloudActorPin!=='undefined'?cloudActorPin:window.cloudActorPin)};var r=await window.apiCall(Object.assign({action:'close_invoice',receipt_id:id},actor));var closeErr=(r&&r.error)||(r&&r.data&&r.data.error);if(closeErr)throw closeErr;var fresh=await window.apiCall(Object.assign({action:'get_state'},actor));if(fresh&&fresh.error)throw fresh.error;var remote=fresh&&fresh.data;if(remote&&remote.state){cloudLoading=true;state=migrateStateUnits(remote.state);cloudRevision=Number(remote.revision||0);cloudLastSavedHash=JSON.stringify(state);cloudLoading=false;if(typeof window.save==='function')window.save();}if(typeof window.renderAll==='function'){try{window.renderAll()}catch(e){}}await loadServerSales();render();if(groups().some(function(g){return g.id===id})){ var __st=(state.salesLog||[]).filter(function(x){return receiptKey(x)===id}).map(function(x){return String(x.invoiceStatus)}).join(','); var __rep=JSON.stringify(r&&r.data||null)||''; alert('سجّل الخادم طلب الإغلاق، لكن الفاتورة لسه ظاهرة مفتوحة في البيانات اللي رجعت. غالبًا الخادم مش بيعلّم أصناف الفاتورة دي بنفس المعرّف (فاتورة قديمة). رقم الفاتورة: '+id+'\nحالة أصنافها: '+__st+'\nرد الخادم: '+__rep.slice(0,250));}else{alert('تم إغلاق الفاتورة يدويًا.');}}catch(err){alert('لم يتم إغلاق الفاتورة: '+((err&&err.message)||String(err)));b.disabled=false}
      });
    }
    if(typeof window.go==='function'&&!window.go.__pmOpenInvoiceWrapped){
      var oldGo=window.go;
      var wrapped=function(id){if(id==='openInvoices'&&!roleAllowed())id='home';oldGo(id);if(id==='openInvoices')render()};
      wrapped.__pmOpenInvoiceWrapped=true;window.go=wrapped;
    }
    function sync(){
      var ok=roleAllowed();
      var t=document.getElementById('pmOpenInvoicesTab');
      if(t)t.style.display=ok?'':'none';
      if(!ok&&panel.classList.contains('active')&&typeof window.go==='function')window.go('home');
      if(ok&&panel.classList.contains('active'))render();
    }
    if(typeof window.applyRoleUI==='function'&&!window.applyRoleUI.__pmOpenInvoiceWrapped){
      var oldApply=window.applyRoleUI;
      var wrappedApply=function(){oldApply.apply(this,arguments);sync()};
      wrappedApply.__pmOpenInvoiceWrapped=true;window.applyRoleUI=wrappedApply;
    }
    window.pmRenderOpenInvoices=render;
    window.pmLoadServerSales=loadServerSales;
    window.__goPost=window.__goPost||[];
    if(!window.__pmOpenInvoicesPostHook){window.__pmOpenInvoicesPostHook=true;window.__goPost.push(function(id,origId){if(origId==='openInvoices'||id==='openInvoices'){var p=document.getElementById('openInvoices');if(p){p.style.display='';p.classList.add('active');}render();loadServerSales().then(render);}});}
    sync();render();
    return true;
  }
  function start(){
    var tries=0;
    var timer=setInterval(function(){tries++;if(build()||tries>80)clearInterval(timer)},250);
    setInterval(function(){if(document.getElementById('pmOpenInvoicesTab')){var t=document.getElementById('pmOpenInvoicesTab');t.style.display=roleAllowed()?'':'none';}},1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
