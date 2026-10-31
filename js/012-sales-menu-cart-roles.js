(function(){
  /* المنيو + السلة + دور المبيعات */
  var origApply=window.applyRoleUI;
  var PM_MENU_SIDE=240;

  function canSeeMenu(){ return cloudActorRole==='admin'||cloudActorRole==='sales'; }
  function isOwner(){ return cloudActorRole==='admin'; }
  function setCardHidden(id,hide){ var el=document.getElementById(id), card=el&&el.closest('.card'); if(card) card.style.display=hide?'none':''; }

  window.__goPre=window.__goPre||[];
  window.__goPre.push(function(id){
    if(cloudActorRole==='sales'&&id!=='menu'&&id!=='cartpage'&&id!=='parties'&&id!=='readyDelivery'&&id!=='partyInvoices'&&id!=='salesInvoices'&&id!=='drinkQueue'&&id!=='openInvoices')id='menu';if(cloudActorRole==='barista'&&id!=='recipes'&&id!=='drinkQueue'&&id!=='drinkProduce'&&id!=='parties')id='drinkProduce';
    if((id==='menu'||id==='cartpage')&&!canSeeMenu()&&cloudActorRole!=='kitchen')id='home';
    if(cloudActorRole==='kitchen'&&id==='cartpage')id='order';
    return id;
  });
  window.__goPost=window.__goPost||[];
  window.__goPost.push(function(id){
    if(id==='menu')renderMenu();
    if(id==='menu')renderCart();
    if(id==='cartpage'){ renderCart(); if(typeof window.renderSales==='function')window.renderSales(); }
  });

  if(typeof origApply==='function'){
    window.applyRoleUI=function(){
      var r=origApply.apply(this,arguments);
      var sales=cloudActorRole==='sales', menuOK=canSeeMenu();

      document.querySelectorAll('.tabs .tab').forEach(function(b){
        if(b.dataset.tab==='menu'||b.dataset.tab==='cartpage') b.style.display=menuOK?'':'none';
        else if(sales) b.style.display=(b.dataset.tab==='sales'||b.dataset.tab==='parties'||b.dataset.tab==='readyDelivery'||b.dataset.tab==='partyInvoices'||b.dataset.tab==='salesInvoices'||b.dataset.tab==='openInvoices')?'':'none';
      });
      document.querySelectorAll('main .panel').forEach(function(p){
        if(p.id==='menu'||p.id==='cartpage') p.style.display=menuOK?'':'none';
        else if(sales) p.style.display=(p.id==='sales'||p.id==='parties'||p.id==='readyDelivery'||p.id==='partyInvoices'||p.id==='salesInvoices'||p.id==='openInvoices')?'':'none';
      });

      var adm=document.getElementById('menuAdminCard');
      if(adm) adm.style.display=(isOwner()||cloudActorRole==='kitchen')?'':'none';

      // المبيعات: البيع من السلة بس، فالفورم اليدوي وجدول المبيعات بيتخفوا
      setCardHidden('saleProduct', sales);
      
      // المبيعات مش محتاجين المصروفات التشغيلية
      setCardHidden('expenseCategory', sales);
      setCardHidden('expensesTable', sales);

      var kit=cloudActorRole==='kitchen';
       document.body.classList.toggle('role-kitchen',kit);
       document.querySelectorAll('.tabs .tab').forEach(function(b){
         if(b.dataset.tab==='menu') b.style.display=kit?'':b.style.display;
         if(b.dataset.tab==='cartpage'&&kit) b.style.display='none';
       });
       var mPanel=document.getElementById('menu'), cPanel=document.getElementById('cartpage');
       if(mPanel&&kit) mPanel.style.display='';
       if(cPanel&&kit) cPanel.style.display='none';
       var mg=document.getElementById('menuGrid'), mgCard=mg&&mg.closest('.card');
       if(mgCard) mgCard.style.display=kit?'none':'';
       if(adm&&kit){
         [].slice.call(adm.children).forEach(function(c){
           c.style.display=(c.tagName==='H2'||c.tagName==='P'||c.id==='menuAdminList')?'':'none';
         });
         var ap=adm.querySelector(':scope > p'); if(ap) ap.textContent='من هنا تقدر توقف بيع صنف لما يخلص، أو ترجعه متاح للبيع.';
         var ah=adm.querySelector(':scope > h2'); if(ah) ah.textContent='حالة الأصناف';
       }
       if(sales && typeof window.go==='function') window.go('menu');
      return r;
    };
  }

  /* ---------- البيع اليدوي القديم: بقى يوجّه للسلة ---------- */
  window.pmSalesRecord=function(){
    alert('البيع بيتم من المنيو: أضف الأصناف للسلة ثم اضغط إتمام البيع.');
    if(typeof window.go==='function') window.go('menu');
    return Promise.resolve(false);
  };

  /* ---------- السلة (محفوظة على الجهاز لكل موظف) ---------- */
  function cartKey(){ return 'pmCart:'+(cloudActorName||'anon'); }
  function loadCart(){
    try{
      var a=JSON.parse(localStorage.getItem(cartKey())||'[]');
      return Array.isArray(a)?a.filter(function(x){return x&&typeof x.name==='string'&&Number.isInteger(x.qty)&&x.qty>0}):[];
    }catch(e){ return []; }
  }
  function saveCart(c){ try{ localStorage.setItem(cartKey(),JSON.stringify(c)); }catch(e){} }
  function menuItem(name){ return (state.menu||[]).find(function(x){return x&&x.name===name&&x.active!==false}); }
  function cartTotals(cart){
    var total=0, count=0;
    cart.forEach(function(l){ count+=l.qty; var x=menuItem(l.name); if(x) total+=l.qty*Number(x.price||0); });
    return {total:total,count:count};
  }

  function remainingOf(name){
    var __pm=menuItem(name); if(__pm&&(__pm.kind==='party'||(__pm.kind==='drink'&&__pm.onDemand===true))) return 1e9;
    var base=Number((state.readyStock||{})[name])||0;
    var inC=loadCart().reduce(function(s,l){ return l.name===name ? s+(Number(l.qty)||0) : s },0);
    return Math.max(0,base-inC);
  }
  function refreshMenu(){ if(typeof window.renderMenu==='function') window.renderMenu(); }

  function renderCart(){
    var cart=loadCart(), t=cartTotals(cart);
    var box=document.getElementById('cartItems');
    if(box){
      box.innerHTML=cart.length?cart.map(function(l,i){
        var x=menuItem(l.name), line=x?l.qty*Number(x.price||0):0;
        return '<div class="cart-row"><div class="cname">'+esc(l.name)+(x?'':' <span class="pill low">غير متاح</span>')+
          '<div class="small">'+(x?moneyFmt(x.price)+(x.kind==='party'?' ج.م للحفلة':' ج.م للوحدة'):'اشيله من السلة')+'</div></div>'+
          '<div class="cqty"><button type="button" onclick="pmCartChange('+i+',-1)">−</button><b>'+l.qty+'</b><button type="button" onclick="pmCartChange('+i+',1)">+</button></div>'+
          '<div class="cline">'+moneyFmt(line)+' ج.م</div>'+
          '<button type="button" class="danger mini" onclick="pmCartRemove('+i+')">×</button></div>';
      }).join(''):'<div class="empty">السلة فاضية. اختار أصناف من المنيو.<div class="actions" style="justify-content:center"><button type="button" class="secondary mini" style="flex:0 0 auto" onclick="go(\'menu\')">فتح المنيو</button></div></div>';
    }
    var tot=document.getElementById('cartTotal'); if(tot) tot.textContent=moneyFmt(t.total)+' ج.م';
    var cb=document.getElementById('cartCheckout'); if(cb) cb.disabled=!cart.length;
     if(cb) cb.textContent=((window.pmCartAsParty&&window.pmCartAsParty())||cart.some(function(l){var m=menuItem(l.name);return !!(m&&(m.kind==='party'||(m.kind==='drink'&&m.onDemand===true)))}))?'إرسال الأوردر للشيف':'إتمام البيع';
    
  }

  window.renderCart=renderCart;
  window.pmCartAdd=function(enc){
    var name=decodeURIComponent(enc);
    if(!menuItem(name))return;
    if(remainingOf(name)<=0){ alert('مفيش متاح زيادة من «'+name+'» دلوقتي.'); return; }
    var c=loadCart(), i=c.findIndex(function(x){return x.name===name});
    if(i>=0){ c[i].qty=Math.min(999,c[i].qty+1); } else c.push({name:name,qty:1});
    saveCart(c);
     renderCart(); refreshMenu();
  };
  window.pmCartChange=function(i,d){
    var c=loadCart();
    if(!c[i])return;
    if(d>0 && remainingOf(c[i].name)<=0){ alert('مفيش متاح زيادة من «'+c[i].name+'» دلوقتي.'); return; }
    c[i].qty=Math.min(999,c[i].qty+d); if(c[i].qty<=0)c.splice(i,1);
    saveCart(c); renderCart(); refreshMenu();
  };
  window.pmCartRemove=function(i){
    var c=loadCart(); c.splice(i,1); saveCart(c); renderCart(); refreshMenu();
  };
  window.pmCartClear=function(){
    if(!loadCart().length)return;
    if(!confirm('تفريغ السلة؟'))return;
    saveCart([]); renderCart(); refreshMenu();
  };
  

  window.pmCartCheckout=async function(){
    var cart=loadCart();
    if(!cart.length){alert('السلة فاضية.');return}
    // تحويل الأوردر لحجز حفلة: نفس الأصناف بأسعار المنيو، ونافذة الحفلات بتسجّل الحجز
    if(window.pmCartAsParty && window.pmCartAsParty()){
      return window.pmPartyCheckout(cart.map(function(l){ return {name:l.name, qty:l.qty}; }));
    }
    // المشروبات التي تُحضّر عند الطلب تُرسل ضمن نفس السلة والفاتورة؛ لا نفصلها عن الأكل.
    var __pl=cart.filter(function(l){var m=menuItem(l.name);return !!(m&&m.kind==='party')});
    if(__pl.length){
      if(__pl.length!==cart.length){
        // السلة فيها حفلات وأصناف عادية: نسجّل الحفلات الأول، وبعدين الباقي يتسجل لوحده
        await window.pmPartyCheckout(__pl);
        var __still=loadCart().some(function(l){var m=menuItem(l.name);return !!(m&&m.kind==='party')});
        if(__still) return;
        return window.pmCartCheckout();
      }
      return window.pmPartyCheckout(__pl);
    }
    var noteEl=document.getElementById('cartNote');
    var note=String((noteEl&&noteEl.value)||'').trim();
     var phoneEl=document.getElementById('cartPhone');
     var custPhone=String((phoneEl&&phoneEl.value)||'').trim();
    // checkout_cart على السيرفر بيدعم فاتورة واحدة للأكل والمشروبات العادية معًا.
    var btn=document.getElementById('cartCheckout'); if(btn)btn.disabled=true;
    try{
      window.__pmCheckoutRequestId=window.__pmCheckoutRequestId||(function(){var id='';try{id=sessionStorage.getItem('pmCheckoutRequestId')||''}catch(e){}if(!id)id=crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)});try{sessionStorage.setItem('pmCheckoutRequestId',id)}catch(e){}return id})();
      var res=await apiCall({
        action:'checkout_cart', employee_name:cloudActorName, pin:cloudActorPin,
        request_id:window.__pmCheckoutRequestId,
        cart:cart.map(function(l){return {name:l.name,qty:l.qty}}), note:note, customer_phone:custPhone
      });
      if(res.error){
        var st=res.error.context&&res.error.context.status;
        alert(res.error.message||(st===409?'تغيّرت البيانات من جهاز آخر. اضغط تحديث الصفحة ثم أعد المحاولة.':'تعذر إتمام البيع.'));
        return;
      }
      cloudRevision=Number((res.data&&res.data.revision)||cloudRevision);
      var rc=res.data.receipt; window.__pmCheckoutRequestId=null; try{sessionStorage.removeItem('pmCheckoutRequestId')}catch(e){}
      state.readyStock=state.readyStock||{};rc.lines.forEach(function(l){if(!(l.onDemand===true))state.readyStock[l.name]=Math.max(0,(Number(state.readyStock[l.name])||0)-(Number(l.qty)||0))});
      state.salesLog=state.salesLog||[];
      rc.lines.forEach(function(l){ if(l&&typeof l==='object'){ if(!l.by)l.by=cloudActorName; if(l.receiptNo==null&&rc.no!=null)l.receiptNo=rc.no; if(!l.receiptId&&rc.id)l.receiptId=rc.id; } });
      if(custPhone){ rc.customerPhone=custPhone; rc.lines.forEach(function(l){ if(l&&typeof l==='object') l.customerPhone=custPhone; }); }
      for(var i=rc.lines.length-1;i>=0;i--) state.salesLog.unshift(rc.lines[i]);
      if(typeof window.pmInvoiceFocus==='function')window.pmInvoiceFocus(rc.no);
      var __done=cart.map(function(l){return l.name});
      saveCart(loadCart().filter(function(l){return __done.indexOf(l.name)===-1}));
      refreshMenu();
      if(noteEl)noteEl.value='';
       if(phoneEl)phoneEl.value='';
      renderCart();
      if(typeof renderSales==='function')renderSales();
      // فاتورة كيك بس أو مشروبات بس: تتقفل وتظهر عادي. لو الاتنين مع بعض تفضل مفتوحة لحين التحضير.
      var __isDr=function(n){return !!(window.pmIsDrinkName&&window.pmIsDrinkName(n))};
      var __onlyOneKind=cart.every(function(l){return __isDr(l.name)})||cart.every(function(l){return !__isDr(l.name)});
      if(rc.status==='open' && __onlyOneKind && rc.id){
        try{
          var __cl=await apiCall({action:'close_invoice',receipt_id:rc.id,employee_name:cloudActorName,pin:cloudActorPin});
          if(__cl&&__cl.error) throw __cl.error;
          rc.status='closed';
          rc.lines.forEach(function(l){ if(l&&typeof l==='object') l.invoiceStatus='closed'; });
        }catch(e){ /* لو السيرفر رفض الإغلاق، الفاتورة تفضل مفتوحة زي ما هي */ }
      }
      if(rc.status==='open'){
        alert('تم تسجيل الطلب رقم '+rc.no+' · الإجمالي '+moneyFmt(rc.total)+' ج.م. الفاتورة ما زالت مفتوحة لحين تجهيز كل المشروبات، وسيتم إغلاقها بعد اكتمال التحضير.');
      }else{
        alert('تم تسجيل الفاتورة رقم '+rc.no+' · البائع: '+cloudActorName+' · الإجمالي '+moneyFmt(rc.total)+' ج.م');
        if(typeof window.pmShowInvoice==='function')window.pmShowInvoice(rc);
      }
      if(typeof window.pmCloseCart==='function') window.pmCloseCart();
      if(loadCart().length) return window.pmCartCheckout();
    }catch(e){
      alert('تعذر إتمام البيع: '+(e.message||''));
    }finally{
      if(btn)btn.disabled=false;
    }
  };

  /* ---------- عرض المنيو ---------- */
  var menuSearchQ='';
  function renderMenu(){
    var grid=document.getElementById('menuGrid'); if(!grid)return;
    var q=menuSearchQ.trim().toLowerCase();
    var items=(state.menu||[]).filter(function(x){
      return x&&x.active!==false&&((x.kind||'piece')===(window.pmMenuTab||'piece'))&&(!q||String(x.name).toLowerCase().indexOf(q)!==-1);
    });
    var __rd=state.readyStock||{};var __cart=loadCart(), __cq={};
    __cart.forEach(function(l){ __cq[l.name]=(__cq[l.name]||0)+(Number(l.qty)||0) });
    var __sc={};
    (state.salesLog||[]).forEach(function(z){ if(z&&z.name) __sc[z.name]=(__sc[z.name]||0)+(Number(z.qty)||0) });
    var __top=null, __tv=0;
    Object.keys(__sc).forEach(function(k){ if(__sc[k]>__tv){ __tv=__sc[k]; __top=k } });
    var __isSold=function(x){
      var __p=x.kind==='party'||(x.kind==='drink'&&x.onDemand===true);
      var __b=__p?1e9:(Number(__rd[x.name])||0), __r=Math.max(0,__b-(__cq[x.name]||0));
      return !!x.soldOut||(!__p&&__b<=0)||(!__p&&__r<=0);
    };
    items=items.slice().sort(function(a,b){ return (__isSold(a)?1:0)-(__isSold(b)?1:0); });
    var __html=items.map(function(x){
      var __isParty=x.kind==='party'||(x.kind==='drink'&&x.onDemand===true);
      var __base=__isParty?1e9:(Number(__rd[x.name])||0), __inC=__cq[x.name]||0, __r=Math.max(0,__base-__inC);
      var __out=!!x.soldOut||(!__isParty&&__base<=0), __sold=__out||(!__isParty&&__r<=0);
      var __low=!__isParty&&!__out&&__r<=5, __enc=encodeURIComponent(x.name);
      var __feat=(!__sold&&!q&&__tv>0&&x.name===__top);
      var thumb=x.image?'<img src="'+esc(x.image)+'" alt="" loading="lazy">':'<div class="mx-noimg">🍽️</div>';
      var stock=__out?'<span class="mx-stock zero">غير متاح</span>':(__isParty?'<span class="mx-stock">يُجهز حسب الطلب</span>':'<span class="mx-stock'+(__r<=0?' zero':(__low?' low':''))+'">متاح '+__r+'</span>');
      var minus=__inC?'<button type="button" class="mx-minus" data-step="-1" aria-label="إنقاص">\u2212</button>':'';
      var qty=__inC?'<button type="button" class="mx-qty" data-pick="1" aria-label="تحديد الكمية">'+__inC+'</button>':'';
      var plus=__sold?'<button type="button" class="mx-plus" disabled aria-label="خلص">+</button>':'<button type="button" class="mx-plus" data-step="1" aria-label="إضافة">+</button>';
      return '<div class="mx-card'+(__out?' sold':'')+(__feat?' mx-feat':'')+'" data-enc="'+__enc+'" data-sold="'+(__sold?'1':'0')+'">'+
        (__feat?'<span class="mx-tag">\u0627\u0644\u0623\u0643\u062b\u0631 \u0637\u0644\u0628\u064b\u0627</span>':'')+
        '<div class="mx-thumb">'+thumb+'</div>'+
        '<div class="mx-body"><div class="mx-name">'+esc(x.name)+'</div>'+
        '<div class="mx-meta">'+stock+(__inC?'<span class="mx-inc">\u0641\u064a \u0627\u0644\u0633\u0644\u0629 '+__inC+'</span>':'')+'</div>'+
        '<div class="mx-foot"><b class="mx-price">'+moneyFmt(x.price)+' \u062c.\u0645</b><div class="mx-step">'+minus+qty+plus+'</div></div>'+
        '</div></div>';
    }).join('');
    grid.innerHTML=items.length?__html:'<div class="empty" style="grid-column:1/-1">'+(q?'لا توجد نتائج للبحث.':'لا توجد أصناف في المنيو بعد.')+'</div>'
    if(!grid._pmBound){
      grid._pmBound=true;
      grid.addEventListener('click',function(e){
        var card=e.target.closest('.mx-card[data-enc]'); if(!card) return;
        var enc=card.getAttribute('data-enc');
        var st=e.target.closest('[data-step]');
        if(st){
          e.stopPropagation(); if(st.disabled) return;
          if(Number(st.getAttribute('data-step'))>0){ window.pmCartAdd(enc); }
          else { var nm=decodeURIComponent(enc), cc=loadCart(), ii=cc.findIndex(function(x){return x.name===nm}); if(ii>=0) window.pmCartChange(ii,-1); }
          return;
        }
        var pk=e.target.closest('[data-pick]');
        if(pk){ e.stopPropagation(); if(window.pmQtyPick) window.pmQtyPick(enc); return; }
        if(card.getAttribute('data-sold')==='1') return;
        window.pmCartAdd(enc);
      });
    }
    renderMenuAdmin();
    
  }
  window.renderMenu=renderMenu;
  window.pmMenuSearch=function(v){ menuSearchQ=String(v||''); renderMenu(); };
  window.pmMenuStep=function(enc,d){
    var name=decodeURIComponent(enc);
    if(d>0){ window.pmCartAdd(enc); }
    else{ var c=loadCart(), i=c.findIndex(function(x){return x.name===name}); if(i>=0) window.pmCartChange(i,-1); }
    renderMenu();
  };

  function renderMenuAdmin(){
    var sel=document.getElementById('menuRecipe');
    if(sel&&isOwner()){
      var prev=sel.value, __kk=(document.getElementById('menuKind')||{}).value, list=names().filter(function(n){return __kk==='drink'?isDrinkName(n):true;});
      sel.innerHTML=list.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join('');
      if(prev&&list.indexOf(prev)!==-1)sel.value=prev;
    }
    var box=document.getElementById('menuAdminList'); if(!box)return;
    var items=state.menu||[];
    window.__pmMenuSelected=window.__pmMenuSelected||{};
    var selected=window.__pmMenuSelected;
    var chosen=Object.keys(selected).filter(function(k){return selected[k]&&items[Number(k)];});
    var bulk=(cloudActorRole==='admin'&&chosen.length)?'<div class="pm-menu-bulk"><span>تم تحديد '+chosen.length+' صنف</span><button type="button" class="danger mini" onclick="pmMenuDeleteSelected()">حذف المحدد ('+chosen.length+')</button><button type="button" class="secondary mini" onclick="pmMenuClearSelection()">إلغاء التحديد</button></div>':'';
    box.innerHTML=items.length?bulk+'<div class="tablewrap"><table><tr><th><input aria-label="تحديد كل الأصناف" type="checkbox" style="width:18px;min-height:18px" '+(chosen.length===items.length?'checked':'')+' onchange="pmMenuSelectAll(this.checked)"></th><th>الصنف</th><th>السعر</th><th>إجراء</th></tr>'+ 
      items.map(function(x,i){
        return '<tr><td><input aria-label="تحديد '+esc(x.name)+'" type="checkbox" style="width:18px;min-height:18px" '+(selected[i]?'checked':'')+' onchange="pmMenuSelectItem('+i+',this.checked)"></td><td>'+esc(x.name)+'</td><td>'+moneyFmt(x.price)+' ج.م</td><td><button class="secondary mini" onclick="pmMenuEditPrice('+i+')">السعر</button> <button class="secondary mini" onclick="pmMenuToggleSold('+i+')">'+(x.soldOut?'متاح':'خلص')+'</button> <button class="secondary mini" onclick="pmMenuChangeImage('+i+')">الصورة</button> <button class="secondary mini" onclick="pmMenuRelink('+i+')">الوصفة</button> <button class="danger mini" onclick="pmMenuWaste('+i+')">حذف القطع</button></td></tr>';
      }).join('')+'</table></div>':'<div class="empty">لم تضف أصنافًا للمنيو بعد.</div>';
    if(cloudActorRole==='kitchen'&&box){ box.querySelectorAll('button').forEach(function(b){ var t=b.textContent.trim(); if(t!=='خلص'&&t!=='متاح') b.style.display='none'; }); box.querySelectorAll('input[type=checkbox]').forEach(function(c){c.disabled=true;}); }

  }

  /* ---------- ضغط الصورة لمربع صغير ---------- */
  function compressMenuImage(file){
    return new Promise(function(resolve,reject){
      var url=URL.createObjectURL(file), img=new Image();
      img.onload=function(){
        try{
          var side=Math.min(img.width,img.height), sx=(img.width-side)/2, sy=(img.height-side)/2;
          var c=document.createElement('canvas'); c.width=PM_MENU_SIDE; c.height=PM_MENU_SIDE;
          c.getContext('2d').drawImage(img,sx,sy,side,side,0,0,PM_MENU_SIDE,PM_MENU_SIDE);
          resolve(c.toDataURL('image/jpeg',0.72));
        }catch(e){ reject(e); }
        finally{ URL.revokeObjectURL(url); }
      };
      img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src=url;
    });
  }

  /* ---------- إدارة المنيو (المدير) ---------- */
  var menuPendingImage='';
  window.pmMenuPickImage=function(input){
    var f=input.files&&input.files[0]; if(!f)return;
    compressMenuImage(f).then(function(data){
      menuPendingImage=data;
      var p=document.getElementById('menuImagePreview');
      if(p)p.innerHTML='<img class="menu-preview" src="'+data+'" alt="">';
    }).catch(function(){
      alert('تعذر قراءة الصورة. جرّب صورة تانية.');
      input.value='';
    });
  };

  window.pmMenuAdd=function(){
    var sel=document.getElementById('menuRecipe'), pr=document.getElementById('menuPrice');
    var name=sel?sel.value:'', price=Number(pr?pr.value:'');
    if(!name){alert('اختر الصنف من الوصفات.');return}
    if(!Number.isFinite(price)||price<=0){alert('أدخل سعر بيع أكبر من صفر.');return}
    state.menu=Array.isArray(state.menu)?state.menu:[];
    if(state.menu.some(function(x){return x.name===name})){alert('الصنف موجود في المنيو بالفعل. استخدم زر السعر لتعديله.');return}
    var __k=(document.getElementById('menuKind')||{}).value==='drink'?'drink':'piece';
    var __od=!!(document.getElementById('menuOnDemand')||{}).checked;
    state.menu.push({name:name,price:price,image:menuPendingImage||'',kind:__k,onDemand:__k==='drink'?__od:false});
    menuPendingImage='';
    if(pr)pr.value='';
    var inp=document.getElementById('menuImage'); if(inp)inp.value='';
    var p=document.getElementById('menuImagePreview'); if(p)p.innerHTML='';
    save();
    renderMenu();
    alert('تمت إضافة الصنف للمنيو.');
  };

  window.pmMenuToggleOnDemand=function(i){
    var x=(state.menu||[])[i]; if(!x||x.kind!=='drink')return;
    x.onDemand=!x.onDemand;
    save(); renderMenu();
    if(window.pmTileRefresh)window.pmTileRefresh();
  };
  window.pmMenuEditPrice=function(i){
    var x=(state.menu||[])[i]; if(!x)return;
    var v=prompt('سعر البيع الجديد لـ '+x.name+' (جنيه)',String(x.price));
    if(v===null)return;
    var n=Number(v);
    if(!Number.isFinite(n)||n<=0){alert('أدخل سعرًا أكبر من صفر.');return}
    x.price=n; save(); renderMenu();
  };

  window.pmMenuWaste=function(i){
    var x=(state.menu||[])[i]; if(!x)return;
    state.readyStock=state.readyStock||{};
    var have=Number(state.readyStock[x.name])||0;
    if(have<=0){alert('مفيش قطع متاحة من «'+x.name+'» لتسجيلها كهالك.');return}
    var v=prompt('كام قطعة من «'+x.name+'» هتتحذف كهالك؟\nالمتاح حاليًا: '+have,String(have));
    if(v===null)return;
    var n=Number(v);
    if(!Number.isInteger(n)||n<=0||n>have){alert('أدخل عددًا صحيحًا بين 1 و '+have+'.');return}
    if(!confirm('تأكيد: تسجيل '+n+' قطعة من «'+x.name+'» كهالك وخصمها من المتاح؟'))return;
    state.readyStock[x.name]=have-n;
    var __c=recipeCost(x.name), __u=__c.unitCost;
    state.wasteLog=Array.isArray(state.wasteLog)?state.wasteLog:[];
    state.wasteLog.unshift({
      date:new Date().toLocaleString('sv-SE'),
      name:x.name,
      qty:n,
      type:'هالك',
      by:cloudActorName||'هذا الجهاز',
      unitCostAtWaste:__u===null?null:__u,
      costAtWaste:__u===null?null:Math.round(__u*n*100)/100
    });
    save(); renderMenu();
  };

  window.pmMenuSelectItem=function(i,checked){
    window.__pmMenuSelected=window.__pmMenuSelected||{};
    if(checked)window.__pmMenuSelected[i]=true;else delete window.__pmMenuSelected[i];
    if(window.pmTileRefresh)window.pmTileRefresh();else renderMenuAdmin();
  };
  window.pmMenuSelectAll=function(checked){
    window.__pmMenuSelected={};
    if(checked)(state.menu||[]).forEach(function(x,i){window.__pmMenuSelected[i]=true;});
    if(window.pmTileRefresh)window.pmTileRefresh();else renderMenuAdmin();
  };
  window.pmMenuClearSelection=function(){window.__pmMenuSelected={};if(window.pmTileRefresh)window.pmTileRefresh();else renderMenuAdmin();};
  window.pmMenuDeleteSelected=function(){
    if(cloudActorRole!=='admin'){alert('حذف المنتجات متاح للمدير فقط.');return;}
    var selected=window.__pmMenuSelected||{}, items=state.menu||[];
    var indices=Object.keys(selected).filter(function(k){return selected[k]&&items[Number(k)];}).map(Number).sort(function(a,b){return b-a;});
    if(!indices.length){renderMenuAdmin();return;}
    var namesToDelete=indices.map(function(i){return items[i].name;});
    if(!confirm('تأكيد حذف '+indices.length+' صنف من قائمة المنيو؟\n\n'+namesToDelete.map(function(n){return '• '+n;}).join('\n')+'\n\nسيتم حذفها من المنيو فقط، ولن تُحذف الوصفات أو سجلات المبيعات.'))return;
    indices.forEach(function(i){items.splice(i,1);});
    window.__pmMenuSelected={};
    save();renderMenu();
    alert('تم حذف '+indices.length+' صنف من المنيو بنجاح.');
  };

  window.pmMenuRemove=function(i){
    var x=(state.menu||[])[i]; if(!x)return;
    if(!confirm('حذف «'+x.name+'» من المنيو؟ الوصفة نفسها لن تُحذف.'))return;
    state.menu.splice(i,1); save(); renderMenu();
  };

  window.pmMenuToggleSold=async function(i){
    var x=(state.menu||[])[i]; if(!x)return;
    var next=!x.soldOut;
    if(cloudActorRole==='kitchen'){
      try{
        var r=await apiCall({action:'set_menu_soldout',employee_name:cloudActorName,pin:cloudActorPin,name:x.name,sold_out:next});
        if(r.error) throw r.error;
        if(r.data&&r.data.revision!=null) cloudRevision=Number(r.data.revision);
        x.soldOut=next;
        try{ localStorage.setItem(KEY,JSON.stringify(state)) }catch(e){}
        renderMenu();
      }catch(e){
        alert('تعذر تحديث حالة الصنف: '+(e.message||'تأكد من الاتصال وحاول تاني.'));
      }
      return;
    }
    x.soldOut=next; save(); renderMenu();
  };

  window.pmMenuChangeImage=function(i){
    var x=(state.menu||[])[i]; if(!x)return;
    var inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=function(){
      var f=inp.files&&inp.files[0]; if(!f)return;
      compressMenuImage(f).then(function(data){
        x.image=data; save(); renderMenu();
      }).catch(function(){ alert('تعذر قراءة الصورة. جرّب صورة تانية.'); });
    };
    inp.click();
  };

  window.pmMenuRelink=function(i){
    var x=(state.menu||[])[i]; if(!x)return;
    var list=names();
    var v=prompt('اكتب اسم الوصفة الجديدة للصنف (لازم تكون موجودة في الوصفات):\n'+list.join(' · '), x.name);
    if(v===null)return;
    var n=String(v).trim();
    if(!n||!Object.prototype.hasOwnProperty.call(state.recipes,n)){alert('الوصفة دي مش موجودة في الوصفات.');return}
    if(n!==x.name&&state.menu.some(function(m){return m&&m.name===n})){alert('الصنف ده موجود في المنيو بالفعل.');return}
    x.name=n; save(); renderMenu();
  };
  window.loadCart=loadCart;
  window.saveCart=saveCart;
})();
