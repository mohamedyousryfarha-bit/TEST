(function(){
  if(!Array.isArray(state.partyOrders)) state.partyOrders=[];
  window.pmMenuTab = window.pmMenuTab || 'piece';

  function recipeItems(){ return Object.keys(state.recipes||{}).filter(function(n){var r=state.recipes[n];return Array.isArray(r)&&r.some(function(c){return c&&String(c.name||'').trim()&&Number(c.qty)>0;});}).sort(function(a,b){return a.localeCompare(b,'ar');}); }

  window.pmPartyStock = function(x){
    var parts=Array.isArray(x.parts)?x.parts:[], rd=state.readyStock||{}, best=null;
    parts.forEach(function(p){
      var need=Number(p.qty)||0; if(need<=0) return;
      var n=Math.floor((Number(rd[p.name])||0)/need);
      best = best===null ? n : Math.min(best,n);
    });
    return best===null?0:best;
  };

  // تبويبات المنيو
  document.getElementById('menuTabs').addEventListener('click', function(e){
    var b=e.target.closest('button[data-mtab]'); if(!b) return;
    window.pmMenuTab=b.dataset.mtab;
    document.querySelectorAll('#menuTabs button').forEach(function(x){ x.classList.toggle('on', x===b); });
    renderMenu();
  });

  // نوع الصنف في الإدارة
  window.__pmPartyDraft = window.__pmPartyDraft || [];
  function buildParts(){
    var box=document.getElementById('menuPartyParts'); if(!box) return;
    var recipes=recipeItems();
    if(!recipes.length){ box.innerHTML='<div class="small">لا توجد وصفات مكتملة. افتح «قاعدة الوصفات» وأنشئ وصفة وأضف مكوناتها ثم احفظها.</div>'; return; }
    var draft=window.__pmPartyDraft||[];
    var chosen = draft.length
      ? draft.map(function(p,i){ return '<div class="pm-party-chip"><span>'+esc(p.name)+' × '+esc(p.qty)+'</span><button type="button" onclick="pmPartyRemovePart('+i+')">✕</button></div>'; }).join('')
      : '<div class="small">لم تضف وصفات بعد</div>';
    box.innerHTML =
      '<label>اختر وصفة</label>'+
      '<select id="menuPartySel">'+recipes.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>';}).join('')+'</select>'+
      '<div class="grid2"><div><label>عدد الوحدات</label><input id="menuPartyQty" type="number" min="0.001" step="any" value="1"></div>'+
      '<div><label>&nbsp;</label><button type="button" class="secondary" onclick="pmPartyAddPart()">+ إضافة الوصفة</button></div></div>'+
      '<label>الوصفات المختارة</label><div class="pm-party-chosen">'+chosen+'</div>';
  }
  window.pmPartyAddPart=function(){
    var sel=document.getElementById('menuPartySel'), q=Number((document.getElementById('menuPartyQty')||{}).value);
    if(!sel||!sel.value){ alert('اختر وصفة.'); return; }
    if(!(q>0)){ alert('أدخل عدد وحدات أكبر من صفر.'); return; }
    window.__pmPartyDraft=window.__pmPartyDraft||[];
    var ex=window.__pmPartyDraft.find(function(p){return p.name===sel.value;});
    if(ex) ex.qty+=q; else window.__pmPartyDraft.push({name:sel.value, qty:q});
    buildParts();
  };
  window.pmPartyRemovePart=function(i){
    window.__pmPartyDraft.splice(i,1);
    buildParts();
  };
  window.pmMenuKindChange = function(){
    var k=document.getElementById('menuKind').value;
    document.getElementById('menuPartyBox').hidden = (k!=='party');
    document.getElementById('menuRecipe').hidden = (k==='party');
    document.getElementById('menuRecipeLbl').hidden = (k==='party');
    document.getElementById('menuOnDemandLbl').hidden=(k!=='drink');
    var __sel=document.getElementById('menuRecipe'); if(__sel){ var __prev=__sel.value, __list=names().filter(function(n){return k==='drink'?isDrinkName(n):true;}); __sel.innerHTML=__list.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join(''); if(__prev&&__list.indexOf(__prev)!==-1) __sel.value=__prev; }
     if(k==='party') buildParts();
  };

  // إضافة الصنف: حفلة أو قطعة
  var origAdd = window.pmMenuAdd;
  window.pmMenuAdd = function(){
    var k=document.getElementById('menuKind');
    if(!k || k.value!=='party') return origAdd && origAdd();
    var name=String(document.getElementById('menuPartyName').value||'').trim();
    var pr=Number(document.getElementById('menuPrice').value);
    if(!name){ alert('اكتب اسم الحفلة.'); return; }
    if(!(pr>0)){ alert('أدخل سعر بيع أكبر من صفر.'); return; }
    var parts=(window.__pmPartyDraft||[]).map(function(p){return {name:p.name, qty:p.qty};});
    if(!parts.length){ alert('اختر وصفة إنتاج واحدة على الأقل.'); return; }
    state.menu=Array.isArray(state.menu)?state.menu:[];
    // Convert an existing fruit-cake entry in place, preserving its historical records and stock key.
    function nameKey(v){return String(v||'').trim().toLowerCase().replace(/[ةه]/g,'ه').replace(/[أإآ]/g,'ا').replace(/\s+/g,' ');}
    var existing=state.menu.find(function(x){return nameKey(x.name)===nameKey(name);});
    if(existing){
      if(!confirm('الصنف «'+existing.name+'» موجود بالفعل. سيتم تحويله إلى «حسب الطلب» وربطه بالوصفة مع الحفاظ على سجلاته السابقة. متابعة؟'))return;
      existing.kind='party';existing.parts=parts;existing.price=pr;existing.active=true;existing.soldOut=false;
      if(typeof menuPendingImage!=='undefined'&&menuPendingImage)existing.image=menuPendingImage;
      name=existing.name;
    }else{
      state.menu.push({name:name, price:pr, image:(typeof menuPendingImage!=='undefined'&&menuPendingImage)||'', kind:'party', parts:parts, active:true});
    }
    if(typeof menuPendingImage!=='undefined') menuPendingImage='';
    document.getElementById('menuPartyName').value='';
    document.getElementById('menuPrice').value='';
    save(); if(typeof refreshMenu==='function') refreshMenu(); else renderMenu(); window.__pmPartyDraft=[]; buildParts();
    alert('تمت إضافة الحفلة للمنيو.');
  };

  // الضغط على حفلة يفتح نموذج الطلب بدل السلة
  var origStep = window.pmMenuStep;
  window.pmMenuStep = function(enc, d){
    var name=decodeURIComponent(enc);
    var item=(state.menu||[]).find(function(x){ return x.name===name; });
    /* الحفلات بقت بتتضاف للسلة زي الأصناف العادية */
    return origStep(enc, d);
  };

  // نموذج طلب الحفلة
  function pmPartyOpen(x){
    var today=new Date(); var iso=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    var ov=document.createElement('div'); ov.className='pty-ov'; ov.id='ptyOv';
    ov.innerHTML='<div class="pty-card" role="dialog" aria-modal="true">'+
      '<h3>حفلة: '+esc(x.name)+'</h3>'+
      '<label>هاتف العميل (اختياري)</label><input id="ptyPhone" inputmode="tel" maxlength="30" placeholder="رقم الهاتف">'+
      '<label>اسم العميل</label><input id="ptyCust" placeholder="اسم العميل">'+
      '<label>عنوان التسليم</label><input id="ptyAddr" placeholder="العنوان بالتفصيل">'+
      '<label>تاريخ التسليم</label><input id="ptyDate" type="date" lang="en-GB" dir="ltr" value="'+iso+'">'+
      '<label>وقت التسليم</label><input id="ptyTime" type="time" lang="en-GB" dir="ltr" value="12:00">'+
      '<label>ملاحظات الأوردر</label><input id="ptyNote" maxlength="300" placeholder="ملاحظات اختيارية">'+
      '<label>عدد الحفلات</label><input id="ptyQty" type="number" min="1" step="1" value="1">'+
      '<div class="pty-parts" id="ptyParts"></div>'+
      '<div class="pty-total"><span>الإجمالي</span><span id="ptyTotal"></span></div>'+
      '<div class="pty-actions"><button type="button" class="secondary" id="ptyCancel">إلغاء</button><button type="button" class="primary" id="ptyOk">تسجيل الحفلة</button></div>'+
      '</div>';
    document.body.appendChild(ov);
    function paint(){
      var q=Math.max(0,Number(document.getElementById('ptyQty').value)||0);
      document.getElementById('ptyParts').innerHTML=(x.parts||[]).map(function(p){
        return '<div><span>'+esc(p.name)+'</span><span>'+(p.qty*q)+'</span></div>';
      }).join('');
      document.getElementById('ptyTotal').textContent=moneyFmt((Number(x.price)||0)*q)+' ج.م';
    }
    paint();
    document.getElementById('ptyQty').addEventListener('input', paint);
    document.getElementById('ptyCancel').onclick=function(){ ov.remove(); };
    document.getElementById('ptyOk').onclick=function(){
      var cust=String(document.getElementById('ptyCust').value||'').trim();
      var date=document.getElementById('ptyDate').value;
      var q=Math.floor(Number(document.getElementById('ptyQty').value));
      if(!cust){ alert('اكتب اسم العميل.'); return; }
      if(!date){ alert('حدد تاريخ الحفلة.'); return; }
      if(!(q>0)){ alert('عدد الحفلات لازم يكون 1 أو أكتر.'); return; }
      if(!cloudReady || !cloudActorName || !cloudActorPin){ alert('لازم تكون متصل بالسحابة لتسجيل أوردر الحفلة.'); return; }
      var btn=document.getElementById('ptyOk'); btn.disabled=true; btn.textContent='جارٍ تسجيل الأوردر…';
      apiCall({action:'party_order_action',party_action:'create',order:{name:x.name,customer:cust,customerPhone:(document.getElementById('ptyPhone').value||''),customerAddress:String((document.getElementById('ptyAddr')||{}).value||'').trim(),date:date,time:(document.getElementById('ptyTime').value||''),qty:q,note:(document.getElementById('ptyNote').value||'')},employee_name:cloudActorName,pin:cloudActorPin})
        .then(function(res){ if(res.error) throw res.error; ov.remove(); return pmPartyWorkflowRefresh().then(function(){ renderMenu(); alert('تم تسجيل أوردر «'+x.name+'» للعميل '+cust+'، ولم يتم خصم أي خامات أو مخزون عند الحجز.'); }); })
        .catch(function(err){ btn.disabled=false; btn.textContent='تسجيل الحفلة'; var msg=(err&&err.message)||String(err||'خطأ غير معروف'); alert('تعذر تسجيل الأوردر: '+msg); });
    };
  }
  window.pmPartyOpen = pmPartyOpen;

  // لوحة سير عمل أوردرات الحفلات، منفصلة عن بيع المخزون الجاهز.
  function pmPartyEsc(v){ return esc(String(v==null?'':v)); }
  window.pmPartyWorkflowRefresh = async function(){
    if(!cloudReady || !cloudActorName || !cloudActorPin) return;
    var res=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});
    if(res.error) throw res.error;
    if(res.data && res.data.state){
      state.partyOrders=Array.isArray(res.data.state.partyOrders)?res.data.state.partyOrders:[];
      if(Array.isArray(res.data.state.partyInvoices)) state.partyInvoices=res.data.state.partyInvoices;
      if(res.data.state.partyInvoiceTemplate) state.partyInvoiceTemplate=res.data.state.partyInvoiceTemplate;
      if(res.data.state.partyInvoiceSeq!==undefined) state.partyInvoiceSeq=res.data.state.partyInvoiceSeq;
      // بعد تأكيد الشيف نحدّث رصيد الخامات وسجل الحركة من الخادم أيضًا.
      if(cloudActorRole==='kitchen' || cloudActorRole==='admin'){
        ['inventory','history','productionLog','orders','recipes','readyStock'].forEach(function(k){
          if(res.data.state[k]!==undefined) state[k]=res.data.state[k];
        });
      }
      cloudRevision=Number(res.data.revision||cloudRevision);
      pmPartyWorkflowRender();
    }
  };
  function pmPartyIngredients(order){
    var need={};
    (order.parts||[]).forEach(function(part){
      (state.recipes&&state.recipes[part.name]||[]).forEach(function(c){
        if(!c||!c.name||!(Number(c.qty)>0)) return;
        var u=unitBase(c.unit), key=c.name+'||'+u;
        if(!need[key]) need[key]={name:c.name,unit:u,qty:0};
        need[key].qty+=norm(c.qty,c.unit)*Number(part.qty||0);
      });
    });
    return Object.keys(need).map(function(k){var x=need[k];x.have=getStock(x.name,x.unit);x.short=Math.max(0,x.qty-x.have);return x;});
  }
  function pmPartyWorkflowRender(){
    var box=document.getElementById('partiesBody'); if(!box) return;
    var role=cloudActorRole||'';
    var canStock=(role==='kitchen'||role==='admin');
    var canDeliver=(role==='sales'||role==='admin');
    var all=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){return o&&o.name});
    var pending=all.filter(function(o){return o.status==='pending'});
    function statusText(o){return o.status==='pending'?'بانتظار التجهيز':o.status==='ready'?'جاهز للتسليم':o.status==='delivered'?'تم التسليم':o.status==='cancelled'?'ملغاة':(o.status||'—');}
    function statusPill(o){return '<span class="pill'+(o.status==='pending'?' warn':'')+'">'+statusText(o)+'</span>';}

    // 1) النواقص: احتياج الأصناف اللي لسه متجهزتش مقارنة بالرصيد
    var shortHtml='';
    if(!canStock){
      shortHtml='<div class="pm-po-note">جدول النواقص بيظهر لحساب المطبخ والمدير.</div>';
    }else{
      var need={}, noRecipe=0;
      pending.forEach(function(o){
        var ing=pmPartyIngredients(o);
        if(!ing.length) noRecipe++;
        ing.forEach(function(z){
          var k=z.name+'||'+z.unit;
          if(!need[k]) need[k]={name:z.name,unit:z.unit,qty:0,have:z.have};
          need[k].qty+=z.qty;
        });
      });
      var lack=Object.keys(need).map(function(k){var x=need[k];x.short=Math.max(0,x.qty-x.have);return x;}).filter(function(x){return x.short>1e-7;});
      shortHtml=lack.length
        ? '<div class="pm-po-tablewrap"><table><tr><th>الخامة</th><th>المطلوب</th><th>المتاح</th><th>الناقص</th></tr>'+lack.map(function(x){return '<tr><td>'+pmPartyEsc(x.name)+'</td><td>'+nfmt(x.qty)+' '+pmPartyEsc(x.unit)+'</td><td>'+nfmt(x.have)+' '+pmPartyEsc(x.unit)+'</td><td class="pm-po-short">'+nfmt(x.short)+' '+pmPartyEsc(x.unit)+'</td></tr>';}).join('')+'</table></div>'
        : '<div class="pm-po-ok">مفيش نواقص للأوردرات الحالية.</div>';
      if(noRecipe) shortHtml+='<div class="pm-po-note">فيه '+noRecipe+' صنف من غير وصفات مرتبطة، راجع المنيو والوصفات.</div>';
    }

    // 2) الأوردرات المطلوبة: كل صنف مع عميله وحالته
    var sorted=all.slice().sort(function(a,b){return String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''));});
    var ordersHtml=sorted.length
      ? '<div class="pm-po-tablewrap"><table><tr><th>الصنف</th><th>العميل</th><th>التسليم</th><th>الكمية</th><th>الحالة</th></tr>'+sorted.map(function(o){
          return '<tr><td>'+pmPartyEsc(o.name)+'</td><td>'+pmPartyEsc(o.customer)+(o.customerPhone?'<br><small>'+pmPartyEsc(o.customerPhone)+'</small>':'')+'</td><td>'+pmPartyEsc(o.date)+' '+pmPartyEsc(o.time||'')+'</td><td>'+nfmt(o.qty)+'</td><td>'+statusPill(o)+(o.status==='delivered'&&o.deliveredAt?'<br><small>'+pmPartyEsc(o.deliveredAt)+'</small>':'')+'</td></tr>';
        }).join('')+'</table></div>'
      : '<div class="pm-po-empty">مفيش أوردرات حفلات مسجلة.</div>';

    // 3) الأوامر: كارت واحد لكل عميل/حفلة بكل أصنافها
    var books=(window.pmPartyBookings?window.pmPartyBookings():[]).filter(function(b){
      if(b.complete||b.cancelled) return false;
      if(role==='kitchen') return b.orders.some(function(o){return o.status==='pending'});
      return true;
    });
    window.__pmBkReady=[];
    window.__pmBkFirst=[];
    var acts=books.map(function(b,bi){
      var o0=b.first;
      var pendN=b.orders.filter(function(o){return o.status==='pending'}).length;
      var readyOrders=b.orders.filter(function(o){return o.status==='ready'});
      window.__pmBkReady[bi]=readyOrders.map(function(o){return o.id});
      window.__pmBkFirst[bi]=b.orders[0].id;
      var canDeliverNow=canDeliver && pendN===0 && readyOrders.length>0;
      var head='<div class="pm-po-head"><b>'+pmPartyEsc(o0.customer||'بدون اسم')+'</b><span class="pill'+(pendN?' warn':'')+'">'+(pendN?'ناقص '+pendN+' صنف':'كله جاهز')+'</span></div>'+
        '<div class="pm-po-meta">التليفون: '+pmPartyEsc(o0.customerPhone||'—')+' · الموعد: '+pmPartyEsc(o0.date||'')+' '+pmPartyEsc(o0.time||'')+'</div>'+
        (o0.note?'<div class="pm-po-meta">ملاحظات: '+pmPartyEsc(o0.note)+'</div>':'')+(window.pmPayLine?window.pmPayLine(b):'');
      var items=b.orders.map(function(o){
        var row='<div class="pm-po-item"><div class="pm-po-itemhead"><b>'+pmPartyEsc(o.name)+' × '+nfmt(o.qty)+'</b>'+statusPill(o)+'</div>';
        if(canStock && o.status==='pending'){
          var ing=pmPartyIngredients(o), missing=ing.filter(function(z){return z.short>1e-7});
          row+='<div class="pm-po-materials">'+(ing.length?ing.map(function(z){return '<div>'+pmPartyEsc(z.name)+': مطلوب '+nfmt(z.qty)+' '+pmPartyEsc(z.unit)+' · متاح '+nfmt(z.have)+' '+pmPartyEsc(z.unit)+(z.short>1e-7?' <span class="pm-po-short">(ناقص '+nfmt(z.short)+')</span>':'');}).join(''):'<div>لا توجد وصفات مرتبطة بالصنف ده.</div>')+'</div>'+
            '<div class="pm-po-actions"><button type="button" class="primary" data-po-produce="'+pmPartyEsc(o.id)+'"'+((missing.length||!ing.length)?' disabled':'')+'>تأكيد تجهيز الصنف وخصم الخامات</button></div>';
        }
        return row+'</div>';
      }).join('');
      var deliverHtml='';
      if(canDeliver){
        deliverHtml='<div class="pm-po-actions"><button type="button" class="primary" data-po-deliverbk="'+bi+'"'+(canDeliverNow?'':' disabled')+'>'+(canDeliverNow?'تسليم الحفلة للعميل':'مستنيين الشيف يكمّل الأصناف ('+pendN+' متبقي)')+'</button></div>';
      }
      var cancelBtn=(role==='admin' && pendN===b.orders.length)?'<div class="pm-po-actions"><button type="button" class="secondary" data-po-cancelbk="'+bi+'">إلغاء الحفلة</button></div>':'';
      return '<article class="pm-po-card">'+head+items+deliverHtml+cancelBtn+'</article>';
    }).join('');
    if(!acts) acts='<div class="pm-po-empty">'+(role==='kitchen'?'مفيش أصناف محتاجة تجهيز دلوقتي.':'مفيش حفلات محتاجة إجراء دلوقتي.')+'</div>';

    box.innerHTML='<div class="pm-po-toolbar"><span class="pm-po-meta">الحجز لا يخصم مخزونًا؛ الخصم عند تأكيد تجهيز كل صنف.</span><button type="button" id="pmPoRefresh" class="secondary mini">تحديث</button></div>'
      +'<h3 class="pm-po-h">النواقص</h3>'+shortHtml
      +'<h3 class="pm-po-h">الأوردرات المطلوبة</h3>'+ordersHtml
      +'<h3 class="pm-po-h">الأوامر</h3><div class="pm-po-list">'+acts+'</div>';

    var rf=document.getElementById('pmPoRefresh');
    if(rf) rf.onclick=function(){ pmPartyWorkflowRefresh().catch(function(e){ alert('تعذر التحديث: '+((e&&e.message)||String(e||''))); }); };

    box.querySelectorAll('[data-po-produce]').forEach(function(btn){btn.onclick=async function(){
      var id=btn.getAttribute('data-po-produce'); if(!confirm('تأكيد تجهيز الصنف؟ هيتم التحقق من الخامات وخصمها مرة واحدة.')) return;
      btn.disabled=true; btn.textContent='جارٍ التجهيز…';
      try{var requestId=crypto.randomUUID?crypto.randomUUID():('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)}));var r=await apiCall({action:'party_order_action',party_action:'produce',order_id:id,request_id:requestId,employee_name:cloudActorName,pin:cloudActorPin});if(r.error)throw r.error;await pmPartyWorkflowRefresh();}catch(e){btn.disabled=false;btn.textContent='تأكيد تجهيز الصنف وخصم الخامات';alert('لم يتم تأكيد التجهيز: '+((e&&e.message)||String(e||'خطأ')));}
    };});

    box.querySelectorAll('[data-po-deliverbk]').forEach(function(btn){btn.onclick=async function(){
      var bi=Number(btn.getAttribute('data-po-deliverbk'));
      var ids=(window.__pmBkReady||[])[bi]||[];
      if(!ids.length){ alert('مفيش أصناف جاهزة للتسليم.'); return; }
      if(!confirm('تأكيد تسليم الحفلة للعميل؟ هيتسجل تسليم '+ids.length+' صنف.')) return;
      btn.disabled=true; btn.textContent='جارٍ التسليم…';
      var done=0;
      try{
        for(var k=0;k<ids.length;k++){
          var r=await apiCall({action:'party_order_action',party_action:'deliver',order_id:ids[k],employee_name:cloudActorName,pin:cloudActorPin});
          if(r.error) throw r.error;
          try{ var __dm=JSON.parse(localStorage.getItem('pmDelivBy')||'{}'); __dm[ids[k]]=cloudActorName; localStorage.setItem('pmDelivBy',JSON.stringify(__dm)); }catch(_){}
          done++;
        }
        await pmPartyWorkflowRefresh();
        alert('تم تسليم الحفلة للعميل. الفاتورة موجودة في تبويب فواتير الحفلات.');
      }catch(e){
        try{ await pmPartyWorkflowRefresh(); }catch(_){}
        btn.disabled=false; btn.textContent='تسليم الحفلة للعميل';
        alert((done?'اتسلم '+done+' من '+ids.length+' صنف، والباقي محتاج تعيد المحاولة. ':'تعذر التسليم. ')+'السبب: '+((e&&e.message)||String(e||'')));
      }
    };});
  }

  window.pmPartyWorkflowRender=pmPartyWorkflowRender;
  // فتح تبويب الحفلات يحدّث البيانات من الخادم
  window.__goPost=window.__goPost||[];
  window.__goPost.push(function(id){
    if(id==='parties' && typeof window.pmPartyWorkflowRefresh==='function'){
      window.pmPartyWorkflowRefresh().catch(function(e){ alert('تعذر تحميل الحفلات: '+((e&&e.message)||String(e||''))); });
    }
  });
  setInterval(function(){
    var p=document.getElementById('parties');
    if(p && p.classList.contains('active') && cloudReady && typeof window.pmPartyWorkflowRefresh==='function') window.pmPartyWorkflowRefresh().catch(function(){});
  },20000);

  renderMenu();
})();
