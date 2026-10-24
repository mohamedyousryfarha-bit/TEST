(function(){
  var sel=-1, q='';
  function esc2(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function money(v){return Number(v||0).toLocaleString('ar-EG')}
  function items(){return (typeof state!=='undefined'&&state&&Array.isArray(state.menu))?state.menu:[]}
  function sig(){var role=(typeof cloudActorRole!=='undefined'?String(cloudActorRole||''):'')||(document.body&&document.body.dataset?String(document.body.dataset.role||''):'');return JSON.stringify([role,items().map(function(x){return [x.name,x.price,!!x.soldOut,x.image?x.image.length:0,x.active!==false]}),q,sel,Object.keys(window.__pmMenuSelected||{}).sort()])}
  function thumb(x,cls){return x.image?'<img src="'+esc2(x.image)+'" alt="" class="'+cls+'">':'<span class="pm-tile-emoji">🍽️</span>'}
  function tile(i){
    var x=items()[i], chosen=!!((window.__pmMenuSelected||{})[i]);
    return '<div class="pm-tile-wrap"><label class="pm-tile-check"><input type="checkbox" aria-label="تحديد '+esc2(x.name)+'" '+(chosen?'checked':'')+' onchange="pmMenuSelectItem('+i+',this.checked)"> تحديد</label><button type="button" class="pm-tile'+(sel===i?' on':'')+'" onclick="pmTileOpen('+i+')">'+thumb(x,'')+
      '<b>'+esc2(x.name)+'</b><span class="pm-price">'+money(x.price)+' ج.م</span>'+
      (x.soldOut?'<span class="pm-st bad">خلص</span>':'<span class="pm-st ok">متاح</span>')+'</button></div>';
  }
  function detail(i){
    var x=items()[i];
    var img=x.image?'<img class="pm-detail-img" src="'+esc2(x.image)+'" alt="">':'<div class="pm-detail-noimg">🍽️</div>';
    return '<div class="pm-detail"><div class="pm-detail-top"><button type="button" class="secondary mini" onclick="pmTileClose()">→ رجوع للأصناف</button></div>'+
      img+'<h3>'+esc2(x.name)+'</h3><div class="pm-d-price">'+money(x.price)+' ج.م</div>'+
      '<span class="pm-st '+(x.soldOut?'bad':'ok')+'">'+(x.soldOut?'خلص حالياً':'متاح للبيع')+'</span>'+
      '<div class="pm-detail-acts pm-owner-only">'+(x.kind==='drink'?'<button type="button" class="secondary" onclick="pmMenuToggleOnDemand('+i+')">'+(x.onDemand?'إلغاء حسب الطلب':'تفعيل حسب الطلب')+'</button>':'')+'<button type="button" class="secondary" onclick="pmMenuEditPrice('+i+')">تعديل السعر</button>'+'<button type="button" class="secondary" onclick="pmMenuChangeImage('+i+')">تغيير الصورة</button>'+'<button type="button" class="danger" style="grid-column:1/-1" onclick="pmMenuWaste('+i+')">حذف القطع</button>'+'</div></div>';
  }
  window.pmTileOpen=function(i){sel=i;render();var d=document.querySelector('.pm-detail');if(d)d.scrollIntoView({behavior:'smooth',block:'start'})};
  window.pmTileClose=function(){sel=-1;render()};
  function ensureSearch(box){
    var inp=document.getElementById('pmAdminSearch');
    if(!inp){
      inp=document.createElement('input');inp.id='pmAdminSearch';inp.type='search';inp.className='pm-admin-search';
      inp.placeholder='ابحث عن صنف في المنيو...';
      inp.addEventListener('input',function(){q=inp.value.trim().toLowerCase();render()});
      box.parentNode.insertBefore(inp,box);
    }
  }
  function render(){
    var box=document.getElementById('menuAdminList'); if(!box) return;
    var all=items(); ensureSearch(box);
    if(!all.length){box.innerHTML='<div class="empty">لم تضف أصنافًا للمنيو بعد.</div>';box.dataset.pmSig=sig();return}
    var list=[];all.forEach(function(x,i){if(!q||String(x.name).toLowerCase().indexOf(q)!==-1)list.push(i)});
    var selected=window.__pmMenuSelected||{};
    var chosen=Object.keys(selected).filter(function(k){return selected[k]&&all[Number(k)]});
    var role=(typeof cloudActorRole!=='undefined'?String(cloudActorRole||''):'')||(document.body&&document.body.dataset?String(document.body.dataset.role||''):'');var isAdmin=role.toLowerCase()==='admin';var bulk=isAdmin?'<div class="pm-menu-bulk"><label><input type="checkbox" '+(all.length&&chosen.length===all.length?'checked':'')+' onchange="pmMenuSelectAll(this.checked)"> تحديد كل الأصناف</label><span>'+(chosen.length?'تم تحديد '+chosen.length+' صنف':'حدد مربع الصنف ثم اضغط حذف المحدد')+'</span>'+(chosen.length?'<button type="button" class="danger mini" onclick="pmMenuDeleteSelected()">حذف المحدد ('+chosen.length+')</button><button type="button" class="secondary mini" onclick="pmMenuClearSelection()">إلغاء التحديد</button>':'')+'</div>':'';
    var html=bulk+((sel>=0&&all[sel])?detail(sel):'');
    html+='<div class="pm-tiles">'+(list.length?list.map(tile).join(''):'<div class="empty" style="grid-column:1/-1">لا توجد أصناف مطابقة للبحث.</div>')+'</div>';
    box.innerHTML=html; box.dataset.pmSig=sig();
  }
  window.pmTileRefresh=render;
  setInterval(function(){
    var box=document.getElementById('menuAdminList'); if(!box) return;
    if(!box.querySelector('.pm-tiles')||box.dataset.pmSig!==sig()) render();
  },400);
})();
