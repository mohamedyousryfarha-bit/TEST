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
      // الأوردرات اللي اتقفلت مع شهر (من المدير): نحدّثها من الخادم عشان تختفي عند الكل
      if(Array.isArray(res.data.state.closedPartyOrderIds)) state.closedPartyOrderIds=res.data.state.closedPartyOrderIds;
      if(Array.isArray(res.data.state.partyInvoices)) state.partyInvoices=res.data.state.partyInvoices;
      if(res.data.state.partyInvoiceTemplate) state.partyInvoiceTemplate=res.data.state.partyInvoiceTemplate;
      if(res.data.state.partyInvoiceSeq!==undefined) state.partyInvoiceSeq=res.data.state.partyInvoiceSeq;
      // بعد تأكيد الشيف نحدّث رصيد الخامات وسجل الحركة من الخادم أيضًا.
      if(cloudActorRole==='kitchen' || cloudActorRole==='admin' || cloudActorRole==='barista'){
        ['inventory','history','productionLog','orders','recipes','readyStock'].forEach(function(k){
          if(res.data.state[k]!==undefined) state[k]=res.data.state[k];
        });
      }
      cloudRevision=Number(res.data.revision||cloudRevision);
      pmPartyWorkflowRender();
    }
  };
  /* ===== محطات الحفلات: الحلويات (الشيف) والعصائر والمشروبات (الباريستا) ===== */
  function isBarItem(name){ return typeof isDrinkName==='function' && isDrinkName(String(name||'')); }
  function stationOfPartName(name){ return isBarItem(name)?'bar':'kitchen'; }
  function stationsOfOrder(o){
    if(Array.isArray(o.stations) && o.stations.length) return o.stations;
    var parts=(o.parts&&o.parts.length)?o.parts:(((state.menu||[]).find(function(x){return x&&x.name===o.name})||{}).parts||[]);
    var s=[]; parts.forEach(function(p){ var st=stationOfPartName(p.name); if(s.indexOf(st)<0) s.push(st); });
    return s.length?s:['kitchen'];
  }
  function doneOf(o,st){ return !!(o.doneStations && o.doneStations[st]===true); }
  function roleStation(){ return cloudActorRole==='barista'?'bar':(cloudActorRole==='kitchen'?'kitchen':null); }
  function canProduceStation(st){
    if(st==='kitchen') return cloudActorRole==='kitchen'||cloudActorRole==='admin';
    return cloudActorRole==='barista'||cloudActorRole==='admin';
  }
  function menuPriceOf(name){ var m=(state.menu||[]).find(function(x){return x&&x.name===name}); return Number(m&&m.price)||0; }
  // رسالة الخطأ من السيرفر (الـ Edge Function بيرجع message في الـ body)
  async function pmErrText(err){
    try{
      if(err&&err.context&&typeof err.context.clone==='function'){
        var j=await err.context.clone().json();
        if(j&&j.message) return j.message;
        if(j&&j.error) return j.error;
      }
    }catch(_){}
    return (err&&err.message)||String(err||'خطأ غير معروف');
  }

  // خامات محطة واحدة من أوردر (بيضرب في عدد الحفلات)
  function pmPartyIngredients(order, station){
    var need={}, times=Number(order.qty)||1;
    (order.parts||[]).forEach(function(part){
      if(station && stationOfPartName(part.name)!==station) return;
      (state.recipes&&state.recipes[part.name]||[]).forEach(function(c){
        if(!c||!c.name||!(Number(c.qty)>0)) return;
        var u=unitBase(c.unit), key=c.name+'||'+u;
        if(!need[key]) need[key]={name:c.name,unit:u,qty:0};
        need[key].qty+=norm(c.qty,c.unit)*Number(part.qty||0)*times;
      });
    });
    return Object.keys(need).map(function(k){var x=need[k];x.have=getStock(x.name,x.unit);x.short=Math.max(0,x.qty-x.have);return x;});
  }

  function pmPartyWorkflowRender(){
    var box=document.getElementById('partiesBody'); if(!box) return;
    var role=cloudActorRole||'';
    var mine=roleStation();
    var canStock=(role==='kitchen'||role==='admin'||role==='barista');
    var canCollect=(role==='sales'||role==='admin');
    var all=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){return o&&o.name&&!(window.pmIsPartyOrderClosed&&window.pmIsPartyOrderClosed(o))});
    function statusText(o){return o.status==='pending'?'بانتظار التجهيز':o.status==='ready'?'جاهز':o.status==='delivered'?'تم التسليم':o.status==='cancelled'?'ملغاة':(o.status||'—');}
    function statusPill(o){return '<span class="pill'+(o.status==='pending'?' warn':'')+'">'+statusText(o)+'</span>';}

    // 1) النواقص: احتياج المحطة اللي المستخدم مسؤول عنها (أو الكل للمدير)
    var shortHtml='';
    if(!canStock){
      shortHtml='<div class="pm-po-note">جدول النواقص بيظهر للشيف والباريستا والمدير.</div>';
    }else{
      var need={}, noRecipe=0;
      all.filter(function(o){return o.status==='pending'}).forEach(function(o){
        stationsOfOrder(o).forEach(function(st){
          if(mine && st!==mine) return;
          if(doneOf(o,st)) return;
          var ing=pmPartyIngredients(o,st);
          if(!ing.length) noRecipe++;
          ing.forEach(function(z){
            var k=z.name+'||'+z.unit;
            if(!need[k]) need[k]={name:z.name,unit:z.unit,qty:0,have:z.have};
            need[k].qty+=z.qty;
          });
        });
      });
      var lack=Object.keys(need).map(function(k){var x=need[k];x.short=Math.max(0,x.qty-x.have);return x;}).filter(function(x){return x.short>1e-7;});
      shortHtml=lack.length
        ? '<div class="pm-po-tablewrap"><table><tr><th>الخامة</th><th>المطلوب</th><th>المتاح</th><th>الناقص</th></tr>'+lack.map(function(x){return '<tr><td>'+pmPartyEsc(x.name)+'</td><td>'+nfmt(x.qty)+' '+pmPartyEsc(x.unit)+'</td><td>'+nfmt(x.have)+' '+pmPartyEsc(x.unit)+'</td><td class="pm-po-short">'+nfmt(x.short)+' '+pmPartyEsc(x.unit)+'</td></tr>';}).join('')+'</table></div>'
        : '<div class="pm-po-ok">مفيش نواقص للأوردرات الحالية.</div>';
      if(noRecipe) shortHtml+='<div class="pm-po-note">فيه '+noRecipe+' جزء من غير وصفات مرتبطة، راجع المنيو والوصفات.</div>';
    }

    // 2) الأوردرات المطلوبة: كل صنف مع عميله وحالته
    var sorted=all.slice().sort(function(a,b){return String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''));});
    var ordersHtml=sorted.length
      ? '<div class="pm-po-tablewrap"><table><tr><th>الصنف</th><th>العميل</th><th>التسليم</th><th>الكمية</th><th>الحالة</th></tr>'+sorted.map(function(o){
          return '<tr><td>'+pmPartyEsc(o.name)+'</td><td>'+pmPartyEsc(o.customer)+(o.customerPhone?'<br><small>'+pmPartyEsc(o.customerPhone)+'</small>':'')+'</td><td>'+pmPartyEsc(o.date)+' '+pmPartyEsc(o.time||'')+'</td><td>'+nfmt(o.qty)+'</td><td>'+statusPill(o)+'</td></tr>';
        }).join('')+'</table></div>'
      : '<div class="pm-po-empty">مفيش أوردرات حفلات مسجلة.</div>';

    // 3) الأوامر: كارت لكل حجز، مقسوم لقسم حلويات وقسم مشروبات
    var books=(window.pmPartyBookings?window.pmPartyBookings(all):[]).filter(function(b){
      if(b.complete||b.cancelled) return false;
      if(mine) return b.orders.some(function(o){return o.status==='pending' && stationsOfOrder(o).indexOf(mine)>=0 && !doneOf(o,mine)});
      return true;
    });
    window.__pmBkFirst=[];
    window.__pmBkInfo=[];
    var acts=books.map(function(b,bi){
      var live=b.orders.filter(function(o){return o.status!=='cancelled'});
      var o0=live[0]||b.first;
      var pendN=live.filter(function(o){return o.status==='pending'}).length;
      var readyAll=live.length>0 && live.every(function(o){return o.status==='ready'||o.status==='delivered'});
      window.__pmBkFirst[bi]=b.orders[0].id;
      var total=live.reduce(function(s,o){return s+(Number(o.price)||menuPriceOf(o.name))*(Number(o.qty)||0)},0);
      var paidRec=(window.__pmPaySummary&&window.__pmPaySummary[b.key])?(Number(window.__pmPaySummary[b.key].paid)||0):0;
      var __sum=(window.__pmPaySummary||{})[b.key]; if(__sum){ total=Number(__sum.total)||total; paidRec=Number(__sum.paid)||0; }
      window.__pmBkInfo[bi]={ids:live.map(function(o){return o.id}), customer:o0.customer||'', total:total, paid:paidRec, remaining:Math.max(0,Math.round((total-paidRec)*100)/100)};

      var head='<div class="pm-po-head"><b>'+pmPartyEsc(o0.customer||'بدون اسم')+'</b><span class="pill'+(readyAll?'':' warn')+'">'+(readyAll?'كله جاهز':'ناقص '+pendN+' صنف')+'</span></div>'+
        '<div class="pm-po-meta">التليفون: '+pmPartyEsc(o0.customerPhone||'—')+' · الموعد: '+pmPartyEsc(o0.date||'')+' '+pmPartyEsc(o0.time||'')+'</div>'+
        (o0.note?'<div class="pm-po-meta">ملاحظات: '+pmPartyEsc(o0.note)+'</div>':'')+
        (window.pmPayLine?window.pmPayLine(b):'');

      var sections='';
      [['kitchen','الحلويات'],['bar','العصائر والمشروبات']].forEach(function(sec){
        var st=sec[0], title=sec[1];
        var rows='';
        live.forEach(function(o){
          if(stationsOfOrder(o).indexOf(st)<0) return;
          var done=doneOf(o,st);
          var row='<div class="pm-po-item"><div class="pm-po-itemhead"><b>'+pmPartyEsc(o.name)+' × '+nfmt(o.qty)+'</b>'+
            (done?'<span class="pill">تم التجهيز</span>':'<span class="pill warn">مستني</span>')+'</div>';
          if(!done && canProduceStation(st) && (!mine || mine===st)){
            var ing=pmPartyIngredients(o,st), missing=ing.filter(function(z){return z.short>1e-7});
            row+='<div class="pm-po-materials">'+(ing.length?ing.map(function(z){return '<div>'+pmPartyEsc(z.name)+': مطلوب '+nfmt(z.qty)+' '+pmPartyEsc(z.unit)+' · متاح '+nfmt(z.have)+' '+pmPartyEsc(z.unit)+(z.short>1e-7?' <span class="pm-po-short">(ناقص '+nfmt(z.short)+')</span>':'');}).join(''):'<div>لا توجد وصفات مرتبطة.</div>')+'</div>'+
              '<div class="pm-po-actions"><button type="button" class="primary" data-po-produce="'+pmPartyEsc(o.id)+'" data-po-station="'+st+'"'+((missing.length||!ing.length)?' disabled':'')+'>تأكيد تجهيز '+(st==='bar'?'المشروبات':'الحلويات')+' وخصم الخامات</button></div>';
          }
          rows+=row+'</div>';
        });
        if(rows) sections+='<div class="pm-po-section"><h4 style="margin:10px 0 4px">'+title+'</h4>'+rows+'</div>';
      });

      var collectHtml='';
      if(canCollect){
        collectHtml='<div class="pm-po-actions"><button type="button" class="primary" data-po-collect="'+bi+'"'+(readyAll?'':' disabled')+'>'+
          (readyAll?'تم التحصيل':'مستنيين الحجز يكمل ('+pendN+' متبقي)')+'</button></div>';
      }
      var cancelBtn=(role==='admin' && pendN===live.length && live.length)?'<div class="pm-po-actions"><button type="button" class="secondary" data-po-cancelbk="'+bi+'">إلغاء الحفلة</button></div>':'';
      return '<article class="pm-po-card">'+head+sections+collectHtml+cancelBtn+'</article>';
    }).join('');
    if(!acts) acts='<div class="pm-po-empty">'+(mine?'مفيش أصناف محتاجة تجهيز دلوقتي.':'مفيش حفلات محتاجة إجراء دلوقتي.')+'</div>';

    box.innerHTML='<div class="pm-po-toolbar"><span class="pm-po-meta">الحجز لا يخصم مخزونًا إلا عند تجهيز كل محطة؛ والتحصيل بيقفل الحجز.</span><button type="button" id="pmPoRefresh" class="secondary mini">تحديث</button></div>'
      +'<h3 class="pm-po-h">النواقص</h3>'+shortHtml
      +'<h3 class="pm-po-h">الأوردرات المطلوبة</h3>'+ordersHtml
      +'<h3 class="pm-po-h">الأوامر</h3><div class="pm-po-list">'+acts+'</div>';

    var rf=document.getElementById('pmPoRefresh');
    if(rf) rf.onclick=function(){ pmPartyWorkflowRefresh().catch(async function(e){ alert('تعذر التحديث: '+await pmErrText(e)); }); };

    box.querySelectorAll('[data-po-produce]').forEach(function(btn){btn.onclick=async function(){
      var id=btn.getAttribute('data-po-produce'), st=btn.getAttribute('data-po-station');
      if(!confirm('تأكيد تجهيز '+(st==='bar'?'المشروبات':'الحلويات')+'؟ هيتم التحقق من الخامات وخصمها مرة واحدة.')) return;
      btn.disabled=true; btn.textContent='جارٍ التجهيز…';
      try{
        var requestId=crypto.randomUUID?crypto.randomUUID():('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)}));
        var r=await apiCall({action:'party_order_action',party_action:'produce',order_id:id,station:st,request_id:requestId,employee_name:cloudActorName,pin:cloudActorPin});
        if(r.error) throw r.error;
        await pmPartyWorkflowRefresh();
      }catch(e){
        btn.disabled=false; btn.textContent='تأكيد التجهيز';
        alert('تعذر التجهيز: '+await pmErrText(e));
      }
    };});

    box.querySelectorAll('[data-po-collect]').forEach(function(btn){btn.onclick=function(){
      pmCollectOpen(Number(btn.getAttribute('data-po-collect')));
    };});
  }

  // نافذة "تم التحصيل": المبلغ لازم يساوي المتبقي بالظبط (السيرفر بيتأكد برضه)
  function pmCollectOpen(bi){
    var info=(window.__pmBkInfo||[])[bi];
    if(!info||!info.ids.length){ alert('الحجز مش متاح للتحصيل دلوقتي. حدّث الصفحة.'); return; }
    var ov=document.createElement('div'); ov.className='pty-ov';
    ov.innerHTML='<div class="pty-card" role="dialog" aria-modal="true">'+
      '<h3>تم التحصيل: '+pmPartyEsc(info.customer)+'</h3>'+
      '<div class="pty-total"><span>إجمالي الحجز</span><span>'+moneyFmt(info.total)+' ج.م</span></div>'+
      '<div class="pty-total"><span>اتدفع قبل كده</span><span>'+moneyFmt(info.paid)+' ج.م</span></div>'+
      '<div class="pty-total"><span>المتبقي</span><span>'+moneyFmt(info.remaining)+' ج.م</span></div>'+
      '<label>المبلغ اللي اتحصل دلوقتي (لازم يساوي المتبقي)</label>'+
      '<input id="pcAmt" inputmode="decimal" value="'+info.remaining+'">'+
      '<label>الـ PIN بتاعك</label>'+
      '<input id="pcPin" inputmode="numeric" type="password" maxlength="5">'+
      '<div class="pty-actions"><button type="button" class="secondary" id="pcCancel">إلغاء</button><button type="button" class="primary" id="pcOk">تأكيد التحصيل والتسليم</button></div></div>';
    document.body.appendChild(ov);
    document.getElementById('pcCancel').onclick=function(){ ov.remove(); };
    document.getElementById('pcOk').onclick=async function(){
      var amount=Math.round((Number(document.getElementById('pcAmt').value)||0)*100)/100;
      var pin=String(document.getElementById('pcPin').value||'').trim();
      if(!pin){ alert('اكتب الـ PIN بتاعك.'); return; }
      if(Math.abs(amount-info.remaining)>0.005){ alert('لازم يتحصل المبلغ كله: '+info.remaining+' ج.م.'); return; }
      var btn=this; btn.disabled=true; btn.textContent='جارٍ التحصيل…';
      try{
        var r=await apiCall({action:'party_collect',order_ids:info.ids,amount:amount,employee_name:cloudActorName,pin:pin});
        if(r.error) throw r.error;
        ov.remove();
        await pmPartyWorkflowRefresh();
        alert('تم تحصيل الحجز وتسليم الحفلة. الفاتورة موجودة في تبويب فواتير الحفلات.');
      }catch(e){
        btn.disabled=false; btn.textContent='تأكيد التحصيل والتسليم';
        var __m=await pmErrText(e);
        alert(String(__m).indexOf('INVALID_EMPLOYEE_PIN')>=0?'الـ PIN غلط. اكتب الـ PIN الشخصي بتاعك (نفس اللي بتدخل بيه التطبيق).':'تعذر التحصيل: '+__m);
      }
    };
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

  /* زرار ترحيل الحفلات القديمة للمدير: مرة واحدة، من غير ما يحتاج console */
  function pmAddMigrateButton(){
    if(cloudActorRole!=='admin') return;
    if(localStorage.getItem('pm_migrated_closed_v1')) return;
    var box=document.getElementById('partiesBody'); if(!box || document.getElementById('pmMigrateBtn')) return;
    var b=document.createElement('button'); b.id='pmMigrateBtn'; b.type='button'; b.className='secondary';
    b.textContent='ترحيل الحفلات القديمة (مرة واحدة)'; b.style.margin='0 0 10px';
    b.onclick=async function(){
      if(!confirm('ترحيل الحفلات القديمة اللي اتقفلت قبل كده؟ الإجراء ده بيتعمل مرة واحدة ومايغيّرش أي مبالغ.')) return;
      b.disabled=true;
      try{
        var r=await apiCall({action:'migrate_closed_party_orders',employee_name:cloudActorName,pin:cloudActorPin});
        if(r.error) throw r.error;
        localStorage.setItem('pm_migrated_closed_v1','1');
        alert('تم الترحيل: '+((r.data&&r.data.marked)||0)+' أوردر.');
        b.remove();
        if(typeof pmPartyWorkflowRefresh==='function') pmPartyWorkflowRefresh().catch(function(){});
      }catch(e){ b.disabled=false; alert('تعذر الترحيل: '+(await pmErrText(e))); }
    };
    box.insertBefore(b, box.firstChild);
  }
  setInterval(pmAddMigrateButton, 2000);

  /* تزامن تقفيل الشهر لكل الحسابات: لو السيرفر فيه تقفيل جديد نحمّل آخر نسخة تلقائي (من غير ما نكسر تعديلات معلقة) */
  setInterval(async function(){
    try{
      if(document.hidden || !cloudReady || !cloudActorName || !cloudActorPin) return;
      var res=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});
      var srv=res&&res.data&&res.data.state; if(!srv) return;
      if((srv.lastMonthCloseId||null)!==(state.lastMonthCloseId||null)){
        if(cloudActorRole!=='admin'){
          /* غير المدير ما يقدرش يرفع الحالة الكاملة، فنتجاهل تعديلاته المحلية ونحمّل نسخة السيرفر */
          cloudLastSavedHash=JSON.stringify(state);
          await reloadCloudState();
        } else if(JSON.stringify(state)===cloudLastSavedHash && !localStorage.getItem(PENDING_SYNC_KEY)){
          await reloadCloudState();
        }
      }
    }catch(e){}
  },30000);

  renderMenu();
})();
