(function(){
  if(window.__pmPartyV3) return; window.__pmPartyV3=true;

  function priceOf(name){ var m=(state.menu||[]).find(function(x){return x&&x.name===name}); return Number(m&&m.price)||0; }
  function hashKey(str){ var h=5381; for(var i=0;i<str.length;i++){ h=((h*33)^str.charCodeAt(i))>>>0; } return h.toString(36); }
  function bookingKey(o){ return o.groupId ? 'g:'+o.groupId : 'o:'+String(o.id||''); }
  window.pmPartyBookingKey=bookingKey;
  function dateText(iso){ if(!iso) return ''; var d=new Date(iso); return isNaN(d.getTime())?'':d.toLocaleDateString('ar-EG'); }
  function cartRaw(){ try{ var a=JSON.parse(localStorage.getItem('pmCart:'+(cloudActorName||'anon'))||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function cartWrite(c){ try{ localStorage.setItem('pmCart:'+(cloudActorName||'anon'),JSON.stringify(c)); }catch(e){} }
  function refreshCartUI(){
    if(typeof window.renderCart==='function') window.renderCart();
    if(typeof window.renderMenu==='function') window.renderMenu();
  }

  /* ---------- الحفلات مجمّعة: كل عميل/حفلة = حجز واحد بكل أصنافه ---------- */
  window.pmPartyBookings=function(list){
    var map={}, arr=[];
    (Array.isArray(list)?list:(Array.isArray(state.partyOrders)?state.partyOrders:[])).forEach(function(o){
      if(!o||!o.name) return;
      var k=bookingKey(o);
      if(!map[k]){ map[k]={key:k,orders:[],first:o}; arr.push(map[k]); }
      map[k].orders.push(o);
    });
    arr.forEach(function(b){
      var live=b.orders.filter(function(o){return o.status!=='cancelled'});
      b.cancelled=live.length===0 && b.orders.length>0;
      b.complete=live.length>0 && live.every(function(o){return o.status==='delivered'});
      b.completedAt=b.complete?(live.map(function(o){return o.deliveredAt||''}).sort().pop()||''):'';
    });
    arr.sort(function(a,b){ return (String(a.first.date||'')+' '+String(a.first.time||'')).localeCompare(String(b.first.date||'')+' '+String(b.first.time||'')); });
    return arr;
  };

  /* ---------- فواتير الحفلات: متحسبة من الأوردرات المسلّمة (من غير حفظ إضافي) ---------- */
  function recipeUnitCost(name){
    var comps=(state.recipes||{})[name];
    if(!Array.isArray(comps)||!comps.length) return null;
    var r=null; try{ if(typeof recipeCost==='function') r=recipeCost(name); }catch(e){ r=null; }
    return (r&&r.unitCost!=null&&isFinite(Number(r.unitCost)))?Number(r.unitCost):null;
  }
  /* تكلفة وحدة الحفلة: الحفلة (kind=party) مش ليها وصفة باسمها، تكلفتها = مجموع أجزائها × تكلفة وحدة كل وصفة */
  function unitCostOf(name){
    var item=(state.menu||[]).find(function(x){return x&&x.name===name});
    if(item&&item.kind==='party'&&Array.isArray(item.parts)&&item.parts.length){
      var tot=0;
      for(var i=0;i<item.parts.length;i++){
        var p=item.parts[i]; var uc=recipeUnitCost(p&&p.name);
        if(uc==null) return null;
        tot+=uc*(Number(p.qty)||0);
      }
      return tot;
    }
    return recipeUnitCost(name);
  }
  function lineOf(o){
    var qty=Number(o.qty)||0, unit=Number(o.price)||priceOf(o.name);
    var uc=unitCostOf(o.name); return {name:o.name||'', qty:qty, unitPrice:unit, revenue:Math.round(qty*unit*100)/100, unitCost:uc, cost:uc==null?null:Math.round(qty*uc*100)/100};
  }
  function delivererOf(b){
    var keys=['deliveredBy','delivered_by','deliveredByName','delivered_by_name','deliverer','actor_name'];
    for(var i=0;i<b.orders.length;i++){
      var o=b.orders[i];
      for(var j=0;j<keys.length;j++){ if(o[keys[j]]) return String(o[keys[j]]); }
    }
    var dm={}; try{ dm=JSON.parse(localStorage.getItem('pmDelivBy')||'{}')||{}; }catch(e){}
    for(var k=0;k<b.orders.length;k++){ if(dm[b.orders[k].id]) return String(dm[b.orders[k].id]); }
    return '';
  }
  function creatorOf(b){
    for(var i=0;i<b.orders.length;i++){ var o=b.orders[i]; if(o && o.by) return String(o.by); }
    return '';
  }
  window.pmPartyInvoicesList=function(){
    var done=window.pmPartyBookings(openPartyOrders()).filter(function(b){return b.complete && !b.orders.some(function(o){return o.closedArchiveId})});
    done.sort(function(a,b){ return (a.completedAt||'').localeCompare(b.completedAt||'') || a.key.localeCompare(b.key); });
    return done.map(function(b,i){
      var live=b.orders.filter(function(o){return o.status!=='cancelled'});
      var lines=live.map(lineOf);
      var total=lines.reduce(function(s,l){return s+l.revenue},0);
      var pcost=lines.reduce(function(s,l){return s+(l.cost==null?0:l.cost)},0);
      var puncosted=lines.filter(function(l){return l.cost==null}).length;
      var f=live[0]||b.first;
      var notes=live.map(function(o){return o.note||''}).filter(Boolean);
      return {
        id:'pinv-'+hashKey(b.key), key:b.key, no:i+1,
        date:dateText(b.completedAt), deliveredAt:b.completedAt, by:delivererOf(b), createdBy:creatorOf(b),
        customer:f.customer||'', customerPhone:f.customerPhone||'',
        eventDate:f.date||'', eventTime:f.time||'', orderNote:notes.join(' · '),
        total:Math.round(total*100)/100, cost:Math.round(pcost*100)/100, uncostedLines:puncosted, lines:lines, paid:b.orders.reduce(function(a,o){return a+(o&&o.status!=='cancelled'?(Number(o.paid)||0):0)},0)
      };
    });
  };

  /* ---------- الأوردرات المقفولة: بنعلّم كل أوردر بـ id (بيفضل حتى لو الأرشيف اتحذف) ---------- */
  window.pmClosedPartyIds=function(){
    if(!Array.isArray(state.closedPartyOrderIds)){
      /* ترحيل مرة واحدة من العلامات القديمة (مفاتيح الحجوزات) */
      var keys={};
      (Array.isArray(state.monthlyArchives)?state.monthlyArchives:[]).forEach(function(a){
        (a&&Array.isArray(a.partyInvoices)?a.partyInvoices:[]).forEach(function(i){ if(i&&i.key) keys[i.key]=true; });
      });
      (Array.isArray(state.closedPartyKeys)?state.closedPartyKeys:[]).forEach(function(k){ keys[k]=true; });
      state.closedPartyOrderIds=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){
        return o&&o.id&&keys[bookingKey(o)];
      }).map(function(o){ return o.id; });
    }
    return state.closedPartyOrderIds;
  };
  window.pmIsPartyOrderClosed=function(o){ return !!o && (!!o.closedArchiveId || window.pmClosedPartyIds().indexOf(o.id)>=0); };
  function openPartyOrders(){
    return (Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){ return o && !window.pmIsPartyOrderClosed(o); });
  }

  /* ---------- الفواتير المفتوحة (لسه متقفلتش مع شهر) ---------- */
  window.pmOpenPartyInvoices=function(){
    return window.pmPartyInvoicesList();
  };

  /* ---------- إرسال أوردر الحفلات من السلة ---------- */
  window.pmDrinkCheckout=async function(lines){
    if(!cloudReady||!cloudActorName||!cloudActorPin){ alert('لازم تكون متصل بالسحابة عشان تبعت الطلب للباريستا.'); return; }
    var noteEl=document.getElementById('cartNote');
    var note=String((noteEl&&noteEl.value)||'').trim();
    var btn=document.getElementById('cartCheckout'); if(btn)btn.disabled=true;
    var sent=0, ok=false;
    try{
      for(var i=0;i<lines.length;i++){
        var l=lines[i];
        var r=await apiCall({action:'drink_order_action',drink_action:'create',employee_name:cloudActorName,pin:cloudActorPin,order:{name:l.name,qty:l.qty,note:note}});
        if(r.error) throw r.error;
        sent++;
        var c=cartRaw(), ix=c.findIndex(function(x){return x.name===l.name});
        if(ix>=0){ c.splice(ix,1); cartWrite(c); }
      }
      if(noteEl)noteEl.value='';
      ok=true;
      alert('تم إرسال '+sent+' طلب مشروب للباريستا.');
    }catch(e){
      alert('تعذر إرسال الطلب للباريستا: '+((e&&e.message)||String(e))+(sent?'\nاتبعت '+sent+' طلب قبل الخطأ، والباقي فاضل في السلة.':''));
    }finally{
      if(btn)btn.disabled=false;
      refreshMenu(); renderCart();
    }
    return ok;
  };
  window.pmPartyCheckout=function(lines){
    if(!cloudReady||!cloudActorName||!cloudActorPin){ alert('لازم تكون متصل بالسحابة عشان تسجّل أوردر الحفلات.'); return; }
    /* الأصناف العادية في السلة بتتحول تلقائي لأصناف حفلة: صنف باسم «الاسم (حفلة)» بوصفة الصنف نفسه */
    var __regs=lines.filter(function(l){ var m=(state.menu||[]).find(function(x){return x&&x.name===l.name}); return !m||m.kind!=='party'; });
    if(__regs.length){
      var __noRecipe=__regs.filter(function(l){ return !Object.prototype.hasOwnProperty.call(state.recipes||{}, l.name); });
      if(__noRecipe.length){ alert('مفيش وصفة إنتاج للأصناف دي، فمينفعش تتحول لحفلة:\n'+__noRecipe.map(function(l){return '- '+l.name}).join('\n')+'\nضيف وصفتها الأول من تبويب المنيو.'); return; }
      if(!confirm('الأصناف دي هتتحول لأصناف حفلة في الأوردر:\n'+__regs.map(function(l){return '- '+l.name+' × '+l.qty}).join('\n')+'\nمتابعة؟')) return;
      var __ren={};
      for(var __i=0;__i<__regs.length;__i++){
        var __l=__regs[__i], __alias=__l.name+' (حفلة)';
        var __ex=(state.menu||[]).find(function(x){return x&&x.name===__alias});
        if(__ex && __ex.kind!=='party'){ alert('الاسم «'+__alias+'» مستخدم لصنف عادي. غيّر اسم الصنف الأصلي.'); return; }
        __ren[__l.name]=__alias;
      }
      cartWrite(cartRaw().map(function(c){ return __ren[c.name]?Object.assign({},c,{name:__ren[c.name]}):c; }));
      lines=lines.map(function(l){ return __ren[l.name]?Object.assign({},l,{name:__ren[l.name],base:l.name}):l; });
      refreshCartUI();
    }
    var noteEl=document.getElementById('cartNote'), phEl=document.getElementById('cartPhone');
    var today=new Date();
    var iso=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    var total=0;
    var rowsHtml=lines.map(function(l){ var sum=priceOf(l.name)*l.qty; total+=sum; return '<div><span>'+esc(l.name)+' × '+l.qty+'</span><span>'+moneyFmt(sum)+' ج.م</span></div>'; }).join('');
    var ov=document.createElement('div'); ov.className='pty-ov'; ov.id='ptyCkOv';
    ov.innerHTML='<div class="pty-card" role="dialog" aria-modal="true">'+
      '<h3>أوردر حفلات للشيف</h3>'+
      '<label>اسم العميل</label><input id="ptyCkCust" maxlength="120" placeholder="اسم العميل" value="'+esc(noteEl?noteEl.value.trim():'')+'">'+
      '<label>هاتف العميل (اختياري)</label><input id="ptyCkPhone" inputmode="tel" maxlength="30" placeholder="رقم الهاتف" value="'+esc(phEl?phEl.value.trim():'')+'">'+
      '<label>تاريخ التسليم</label><input id="ptyCkDate" type="date" lang="en-GB" dir="ltr" value="'+iso+'">'+
      '<label>وقت التسليم</label><input id="ptyCkTime" type="time" lang="en-GB" dir="ltr" value="12:00">'+
      '<label>عدد الأفراد (اختياري، للمعلومات بس)</label><input id="ptyCkGuests" inputmode="numeric" maxlength="6" placeholder="0">'+
      '<label>ملاحظات الأوردر</label><input id="ptyCkNote" maxlength="300" placeholder="ملاحظات اختيارية">'+
      '<label>المبلغ اللي اتدفع دلوقتي (اختياري)</label><input id="ptyCkPaid" inputmode="decimal" maxlength="10" placeholder="0">'+
      '<div class="pty-parts">'+rowsHtml+'</div>'+
      '<div class="pty-total"><span>الإجمالي</span><span>'+moneyFmt(total)+' ج.م</span></div>'+
      '<div class="pty-actions"><button type="button" class="secondary" id="ptyCkCancel">إلغاء</button><button type="button" class="primary" id="ptyCkOk">إرسال الأوردر للشيف</button></div></div>';
    document.body.appendChild(ov);
    document.getElementById('ptyCkCancel').onclick=function(){ ov.remove(); };
    document.getElementById('ptyCkOk').onclick=async function(){
      var btn=this;
      var cust=document.getElementById('ptyCkCust').value.trim();
      var phone=document.getElementById('ptyCkPhone').value.trim();
      var date=document.getElementById('ptyCkDate').value;
      var time=document.getElementById('ptyCkTime').value||'';
      var note=document.getElementById('ptyCkNote').value.trim();
      var guests=Math.max(0,parseInt(document.getElementById('ptyCkGuests').value,10)||0);
      var paid=Number(document.getElementById('ptyCkPaid').value)||0;
      if(paid<0){ alert('المبلغ المدفوع مينفعش يكون سالب.'); return; }
      if(!cust){ alert('اكتب اسم العميل.'); return; }
      if(!date){ alert('حدد تاريخ التسليم.'); return; }
      btn.disabled=true; btn.textContent='جارٍ الإرسال…';
      var groupId='pg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
      var sent=0;
      try{
        for(var i=0;i<lines.length;i++){
          var l=lines[i];
          var res=await apiCall({action:'party_order_action',party_action:'create',
            order:{name:l.name,base_name:l.base||'',customer:cust,customerPhone:phone,customerAddress:String((document.getElementById('cartAddr')||{}).value||'').trim(),date:date,time:time,qty:l.qty,note:note,guests:guests,groupId:groupId,price:priceOf(l.name)},
            employee_name:cloudActorName,pin:cloudActorPin});
          if(res.error) throw res.error;
          sent++;
          cartWrite(cartRaw().filter(function(x){ return x.name!==l.name; }));
          refreshCartUI();
        }
      }catch(e){
        var msg=(e&&e.message)||String(e||'خطأ غير معروف');
        try{ await window.pmPartyWorkflowRefresh(); }catch(_){}
        refreshCartUI();
        btn.disabled=false; btn.textContent='إرسال الأوردر للشيف';
        alert(sent
          ? 'اتبعت '+sent+' من '+lines.length+' أصناف للشيف، والباقي لسه في السلة. السبب: '+msg
          : 'تعذر إرسال الأوردر: '+msg);
        return;
      }
      var payMsg='';
      if(paid>0){
        try{
          await window.pmPartyWorkflowRefresh();
          var ords=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){return o&&o.id});
          var mine=ords.filter(function(o){return o.groupId===groupId});
          if(!mine.length) mine=ords.filter(function(o){return o.status!=='cancelled' && o.customer===cust && o.date===date && (o.time||'')===time && (o.customerPhone||'')===phone});
          if(!mine.length) throw new Error('الأوردر اتسجل بس مش لاقيه عشان أسجل الدفعة');
          var rp=await cloudClient.rpc('pastrymy_record_party_payment',{p_employee_name:cloudActorName,p_pin:cloudActorPin,p_order_id:mine[0].id,p_amount:paid});
          if(rp.error) throw rp.error;
          payMsg='\nالمدفوع دلوقتي: '+moneyFmt(paid)+' ج.م';
        }catch(e){
          payMsg='\n⚠️ الأوردر اتسجل بس الدفعة ماتسجلتش ('+String((e&&e.message)||e||'')+'). سجّلها من تبويب الحفلات.';
        }
      }
      ov.remove();
      /* الحجز اتسجل: نطفي علامة الحفلة عشان الأوردر الجاي يكون بيع عادي */
      var __cbOff=document.getElementById('cartAsParty');
      if(__cbOff){ __cbOff.checked=false; __cbOff.dispatchEvent(new Event('change',{bubbles:true})); }
      if(noteEl) noteEl.value='';
      if(phEl) phEl.value='';
      refreshCartUI();
      var dc=document.getElementById('cartModalClose')||document.getElementById('drawerClose'); if(dc) dc.click();
      var __sh=document.getElementById('cartPartySheet'); if(__sh) __sh.hidden=true;
      /* قفل مباشر للسلة كـ fallback: ما يعتمدش على الضغط على الزرار بس */
      if(typeof window.pmCloseCart==='function') window.pmCloseCart();
      var __ov=document.getElementById('cartModalOverlay'); if(__ov){ __ov.hidden=true; }
      document.body.classList.remove('cart-modal-open');
      try{ await window.pmPartyWorkflowRefresh(); }catch(_){}
      alert('تم إرسال الأوردر للشيف وجاري العمل عليه ✓\nالعميل: '+cust+' · التسليم: '+date+(time?' '+time:'')+payMsg);
    };
  };

  /* ---------- إلغاء حفلة (للمدير بس، والتحقق من الـ PIN على السيرفر) ---------- */
  document.addEventListener('click', async function(ev){
    var btn=ev.target&&ev.target.closest?ev.target.closest('[data-po-cancelbk]'):null;
    if(!btn) return;
    if(cloudActorRole!=='admin'){ alert('إلغاء الحفلات للمدير بس.'); return; }
    var id=(window.__pmBkFirst||[])[Number(btn.getAttribute('data-po-cancelbk'))];
    if(!id){ alert('الحفلة دي مش متاحة للإلغاء دلوقتي. حدّث الصفحة.'); return; }
    if(!confirm('إلغاء الحفلة دي نهائيًا؟ مش هتتجهز ولا هتتسلم.')) return;
    var pin=prompt('اكتب الـ PIN بتاعك عشان تأكد الإلغاء:');
    if(!pin) return;
    btn.disabled=true; btn.textContent='جارٍ الإلغاء…';
    try{
      var r=await cloudClient.rpc('pastrymy_cancel_party_booking',{p_employee_name:cloudActorName,p_pin:pin,p_order_id:id});
      if(r.error) throw r.error;
      await window.pmPartyWorkflowRefresh();
      alert('تم إلغاء الحفلة.');
    }catch(e){
      btn.disabled=false; btn.textContent='إلغاء الحفلة';
      var m=String((e&&e.message)||e||'');
      alert(m.indexOf('PARTY_ALREADY_PRODUCED')>=0?'مينفعش تلغي الحفلة، فيه أصناف اتجهزت أو اتسلمت.'
        :(m.indexOf('INVALID_EMPLOYEE_PIN')>=0?'الـ PIN غلط.':'تعذر الإلغاء: '+m));
    }
  });

  /* ---------- حالة الدفع لكل حفلة + تسجيل دفعة ---------- */
  window.__pmPaySummary=window.__pmPaySummary||{};
  /* يحمّل حالة دفع الحفلات من السيرفر قبل التقفيل، عشان المدفوع يتأرشف صح (مش null) */
  window.pmLoadPaySummary=async function(){
    if(!(cloudActorRole==='admin'||cloudActorRole==='sales')) return false;
    if(!cloudClient||!cloudActorName||!cloudActorPin) return false;
    var pr=await cloudClient.rpc('pastrymy_party_payment_summary',{p_employee_name:cloudActorName,p_pin:cloudActorPin});
    if(pr.error) throw pr.error;
    window.__pmPaySummary=pr.data||{};
    return true;
  };
  window.pmPayLine=function(b){
    var p=(window.__pmPaySummary||{})[b.key];
    if(!p) return '';
    var total=Number(p.total)||0, paid=Number(p.paid)||0, rem=Math.max(0,total-paid);
    var st=paid<=0?'مش مدفوع':(paid>=total?'مدفوع بالكامل':'دفع جزء');
    var canPay=(cloudActorRole==='admin'||cloudActorRole==='sales') && rem>0;
    return '<div class="pm-po-pay"><b>الدفع: '+st+'</b> · المدفوع '+moneyFmt(paid)+' · المتبقي '+moneyFmt(rem)+' ج.م'+
      (canPay?' <button type="button" class="secondary mini" data-po-pay="'+esc(b.orders[0].id)+'">تسجيل دفعة</button>':'')+'</div>';
  };
  document.addEventListener('click', async function(ev){
    var btn=ev.target&&ev.target.closest?ev.target.closest('[data-po-pay]'):null;
    if(!btn) return;
    if(cloudActorRole!=='admin'&&cloudActorRole!=='sales'){ alert('مش مسموحلك تسجل دفعات.'); return; }
    var id=btn.getAttribute('data-po-pay');
    var amt=Number(prompt('المبلغ اللي اتدفع (ج.م):'));
    if(!amt||amt<=0) return;
    var pin=prompt('اكتب الـ PIN بتاعك عشان تأكد التسجيل:');
    if(!pin) return;
    btn.disabled=true;
    try{
      var r=await cloudClient.rpc('pastrymy_record_party_payment',{p_employee_name:cloudActorName,p_pin:pin,p_order_id:id,p_amount:amt});
      if(r.error) throw r.error;
      await window.pmPartyWorkflowRefresh();
      alert('تم تسجيل الدفعة.');
    }catch(e){
      btn.disabled=false;
      var m=String((e&&e.message)||e||'');
      alert(m.indexOf('AMOUNT_EXCEEDS_TOTAL')>=0?'المبلغ أكبر من المتبقي.'
        :(m.indexOf('INVALID_EMPLOYEE_PIN')>=0?'الـ PIN غلط.':'تعذر التسجيل: '+m));
    }
  });

  /* ---------- بعد أي تحديث من الخادم: نعيد رسم الفواتير والعملاء (من غير أي حفظ) ---------- */
  var __refOrig=window.pmPartyWorkflowRefresh;
  if(typeof __refOrig==='function'){
    window.pmPartyWorkflowRefresh=async function(){
      var r=await __refOrig.apply(this,arguments);
      if(cloudActorRole==='admin'||cloudActorRole==='sales'){
        try{
          var pr=await cloudClient.rpc('pastrymy_party_payment_summary',{p_employee_name:cloudActorName,p_pin:cloudActorPin});
          if(!pr.error){ window.__pmPaySummary=pr.data||{}; if(window.pmPartyWorkflowRender) window.pmPartyWorkflowRender(); }
        }catch(e){}
      }
      try{ pmPartyInvRender(); }catch(e){}
      try{ pmPartyCustRender(); }catch(e){}
      return r;
    };
  }

  /* ---------- تبويب فواتير الحفلات ---------- */
  var __pinvOpen={};
  function pmInvRc(i){
    return {no:'ح-'+i.no, date:i.date, by:([i.createdBy?'أخد: '+i.createdBy:'', i.by?'سلّم: '+i.by:''].filter(Boolean).join(' · ')||'—'), note:i.customer, customerPhone:i.customerPhone, total:i.total, lines:i.lines, isParty:true};
  }
  function pmPartyInvRender(){
    var box=document.getElementById('partyInvBody'); if(!box) return;
    if(!box.__bound){
      box.__bound=true;
      box.addEventListener('toggle',function(e){ var d=e.target; if(d&&d.getAttribute&&d.getAttribute('data-pk')) __pinvOpen[d.getAttribute('data-pk')]=d.open; },true);
    }
    var all=window.pmOpenPartyInvoices().slice().sort(function(a,b){ return (Number(b.no)||0)-(Number(a.no)||0); });
    var qEl=document.getElementById('partyInvSearch');
    var q=String(qEl?qEl.value:'').trim().toLowerCase();
    var list=all.filter(function(i){
      if(!q) return true;
      var hay=['ح-'+i.no,i.customer,i.customerPhone,i.orderNote].concat((i.lines||[]).map(function(l){return l.name})).join(' ').toLowerCase();
      return hay.indexOf(q)!==-1;
    });
    var total=all.reduce(function(s,i){return s+(Number(i.total)||0)},0);
    var byParty={}, parties=[];
    all.forEach(function(i){
      (i.lines||[]).forEach(function(l){
        var k=l.name;
        if(!byParty[k]){ byParty[k]={name:k,qty:0,rev:0}; parties.push(byParty[k]); }
        byParty[k].qty+=Number(l.qty)||0;
        byParty[k].rev+=Number(l.revenue)||0;
      });
    });
    parties.sort(function(a,b){return b.rev-a.rev});
    var unitsTotal=parties.reduce(function(s,p){return s+p.qty},0);

    var stats='<div class="stats"><div class="stat"><b>'+all.length+'</b><span>عدد فواتير الحفلات</span></div>'+
      '<div class="stat"><b>'+moneyFmt(total)+' ج.م</b><span>إجمالي الحفلات</span></div>'+
      '<div class="stat"><b>'+(all.length?moneyFmt(total/all.length):0)+' ج.م</b><span>متوسط الفاتورة</span></div>'+
      '<div class="stat"><b>'+unitsTotal+'</b><span>عدد الحفلات المسلّمة</span></div></div>';

    var summary=parties.length
      ? '<h3 class="pm-po-h">الحفلات حسب النوع</h3><div class="pm-po-tablewrap"><table><tr><th>الحفلة</th><th>العدد</th><th>الإجمالي</th></tr>'+
        parties.map(function(p){return '<tr><td>'+esc(p.name)+'</td><td>'+p.qty+'</td><td>'+moneyFmt(p.rev)+' ج.م</td></tr>';}).join('')+'</table></div>'
      : '';

    var items=list.slice(0,200).map(function(i){
      var key='pinv:'+i.id, open=!!__pinvOpen[key];
      var names=(i.lines||[]).map(function(l){return l.name}).join('، ');
      var linesHtml='<div class="tablewrap"><table class="inv-items"><tr><th>الحفلة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>'+
        (i.lines||[]).map(function(l){return '<tr><td>'+esc(l.name)+'</td><td>'+nfmt(l.qty)+'</td><td>'+moneyFmt(l.unitPrice)+'</td><td>'+moneyFmt(l.revenue)+' ج.م</td></tr>';}).join('')+'</table></div>';
      var meta='<div class="inv-meta"><span>العميل: <b>'+esc(i.customer||'—')+'</b></span>'+
        (i.customerPhone?'<span>التليفون: <b dir="ltr">'+esc(i.customerPhone)+'</b></span>':'')+
        '<span>موعد الحفلة: <b>'+esc((i.eventDate||'')+' '+(i.eventTime||''))+'</b></span>'+
        (i.date?'<span>تاريخ التسليم: <b>'+esc(i.date)+'</b></span>':'')+'</div>';
      return '<details class="rcpt" data-pk="'+esc(key)+'"'+(open?' open':'')+'>'+
        '<summary><span class="rno">ح-'+esc(i.no)+' · '+esc(i.customer||'—')+'</span><span class="rtotal">'+moneyFmt(i.total)+' ج.م</span>'+
        '<span class="rmeta">'+esc(i.eventDate||'')+' · '+esc(names)+'</span></summary>'+
        '<div class="rbody">'+meta+linesHtml+(i.orderNote?'<div class="small">ملاحظات: '+esc(i.orderNote)+'</div>':'')+
        '<div class="actions" style="margin-top:10px"><button type="button" class="secondary mini" data-pinv="'+esc(i.id)+'">🖨️ عرض / طباعة الفاتورة</button></div></div></details>';
    }).join('');

    var body=list.length
      ? '<div class="sales-archive">'+items+'</div>'
      : '<div class="pm-po-empty">'+(all.length?'مفيش فواتير بتطابق البحث.':'مفيش فواتير حفلات لسه. الفاتورة بتتسجل تلقائي لما كل أصناف الحفلة تتسلم.')+'</div>';

    box.innerHTML=stats+summary+'<h3 class="pm-po-h">الفواتير</h3>'+body+
      (list.length>200?'<div class="small">بيعرض أول 200 فاتورة، ضيّق البحث.</div>':'');
    box.querySelectorAll('[data-pinv]').forEach(function(b){
      b.onclick=function(){
        var inv=all.find(function(x){return x.id===b.getAttribute('data-pinv')});
        if(inv && typeof window.pmShowInvoice==='function') window.pmShowInvoice(pmInvRc(inv));
      };
    });
  }
  window.pmPartyInvRender=pmPartyInvRender;

  /* ---------- عملاء الحفلات (تحت عملاء المحل) ---------- */
  function pmPartyCustRender(){
    var tb=document.getElementById('pCustTable'); if(!tb) return;
    var bks=window.pmPartyBookings(), invs=window.pmPartyInvoicesList();
    function keyOf(name,phone){ return String(name||'').trim()+'|'+String(phone||'').trim(); }
    var map={}, arr=[];
    bks.filter(function(b){return !b.cancelled}).forEach(function(b){
      var f=b.first, k=keyOf(f.customer,f.customerPhone);
      if(!map[k]){ map[k]={name:f.customer||'—',phone:f.customerPhone||'',bookings:0,items:{},last:'',paid:0}; arr.push(map[k]); }
      var c=map[k]; c.bookings++;
      b.orders.forEach(function(o){ c.items[o.name]=(c.items[o.name]||0)+(Number(o.qty)||0); });
      if((f.date||'')>c.last) c.last=f.date||'';
    });
    invs.forEach(function(i){ var k=keyOf(i.customer,i.customerPhone); if(map[k]) map[k].paid+=Number(i.total)||0; });
    arr.sort(function(a,b){ return b.bookings-a.bookings || a.name.localeCompare(b.name,'ar'); });
    var grand=arr.reduce(function(s,c){return s+c.paid},0);
    var cc=document.getElementById('pCustCount'), ct=document.getElementById('pCustTotal');
    if(cc) cc.textContent=String(arr.length);
    if(ct) ct.textContent=moneyFmt(grand);
    tb.innerHTML=arr.length
      ? arr.map(function(c){
          var its=Object.keys(c.items).map(function(n){return n+' × '+c.items[n]}).join('، ');
          return '<tr><td>'+esc(c.name)+'</td><td dir="ltr">'+esc(c.phone||'—')+'</td><td>'+c.bookings+'</td><td>'+esc(its)+'</td><td>'+esc(c.last||'—')+'</td><td>'+moneyFmt(c.paid)+' ج.م</td></tr>';
        }).join('')
      : '<tr><td colspan="6" class="pm-po-empty">مفيش عملاء حفلات لسه.</td></tr>';
  }
  window.pmPartyCustRender=pmPartyCustRender;

  /* ---------- هيكل فاتورة الحفلات (للمدير) ---------- */
  var TPL_KEYS=['shopName','address','phone','taxCard','commercialReg','footer'];
  function pmPartyTplGet(){
    var m=Object.assign({shopName:'PastryMY',address:'',phone:'',taxCard:'',commercialReg:'',footer:'شكراً لزيارتكم'},(state&&state.invoiceTemplate)||{});
    var p=(state&&state.partyInvoiceTemplate)||{};
    Object.keys(p).forEach(function(k){ if(p[k]) m[k]=p[k]; });
    return m;
  }
  window.pmPartyTplGet=pmPartyTplGet;
  function pmPartyTplRender(){
    var p=state.partyInvoiceTemplate||{};
    TPL_KEYS.forEach(function(k){
      var el=document.getElementById('pmPT_'+k);
      if(el&&document.activeElement!==el) el.value=p[k]||'';
    });
    var prev=document.getElementById('pmPTPreview'); if(!prev||!window.pmInvoiceHTML) return;
    var sample={no:'ح-1',date:'',by:'',note:'اسم العميل (مثال)',customerPhone:'01000000000',total:1000,isParty:true,
      lines:[{name:'حفلة مثال',qty:2,unitPrice:500,revenue:1000}]};
    prev.innerHTML=window.pmInvoiceHTML(sample,pmPartyTplGet());
  }
  window.pmPartySaveTpl=function(){
    if(cloudActorRole!=='admin'){ alert('هيكل فاتورة الحفلات للمدير بس.'); return; }
    var t={};
    TPL_KEYS.forEach(function(k){ var el=document.getElementById('pmPT_'+k); t[k]=el?String(el.value||'').trim():''; });
    state.partyInvoiceTemplate=t;
    save();
    pmPartyTplRender();
    alert('تم حفظ هيكل فاتورة الحفلات.');
  };

  /* ---------- فتح التبويبات ---------- */
  window.__goPost=window.__goPost||[];
  window.__goPost.push(function(id){
    if(id==='partyInvoices'){
      pmPartyInvRender();
      if(typeof window.pmPartyWorkflowRefresh==='function') window.pmPartyWorkflowRefresh().catch(function(){});
    }
    if(id==='partyTemplate'){ pmPartyTplRender(); }
    if(id==='customers'){ pmPartyCustRender(); }
  });
  setInterval(function(){
    var p=document.getElementById('partyInvoices');
    if(p && p.classList.contains('active') && cloudReady && typeof window.pmPartyWorkflowRefresh==='function') window.pmPartyWorkflowRefresh().catch(function(){});
  },20000);
})();
