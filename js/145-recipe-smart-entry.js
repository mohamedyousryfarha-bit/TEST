/* إدخال الوصفة: الوحدة تتملى تلقائياً من الخامة
   (المخزون ← أسعار الخامات ← آخر وصفة استخدمتها) لو الشيف ما اختارش وحدة بنفسه. */
(function(){
  if(window.__pmRecipeSmart) return; window.__pmRecipeSmart=true;

  function validUnit(u){
    var list=(typeof UNITS!=='undefined' && Array.isArray(UNITS)) ? UNITS : [];
    return !!u && list.indexOf(u)>=0;
  }

  function unitFor(name){
    var n=String(name||'').trim();
    if(!n || typeof state==='undefined' || !state) return null;
    var inv=(state.inventory||[]).find(function(x){ return x && x.name===n && validUnit(x.unit); });
    if(inv) return inv.unit;
    var p=(state.prices||{})[n];
    if(p && validUnit(p.packUnit)) return p.packUnit;
    var last=null;
    Object.keys(state.recipes||{}).forEach(function(k){
      (state.recipes[k]||[]).forEach(function(c){ if(c && c.name===n && validUnit(c.unit)) last=c.unit; });
    });
    return last;
  }

  function applyUnit(row){
    if(!row || row.dataset.unitTouched==='1') return;
    var nameEl=row.querySelector('.cname'), unitEl=row.querySelector('.cunit');
    if(!nameEl || !unitEl) return;
    var u=unitFor(nameEl.value);
    if(u) unitEl.value=u;
  }

  // الشيف غيّر الوحدة بنفسه → ما نغيّرهاش تاني
  document.addEventListener('change', function(e){
    var t=e.target;
    if(!t || !t.closest || !t.closest('#recipeEditor')) return;
    if(t.matches('.cunit')){
      var r=t.closest('.comp-row'); if(r) r.dataset.unitTouched='1';
    } else if(t.matches('.cname')){
      applyUnit(t.closest('.comp-row'));
    }
  }, true);

  // اختيار خامة من الاقتراحات بيضيف صف فيه الاسم، فنملّي الوحدة فوراً
  var oAdd=window.pmAddRow;
  if(typeof oAdd==='function'){
    window.pmAddRow=function(stage,name){
      oAdd.apply(this,arguments);
      if(name){
        var box=document.querySelector('[data-rows="'+stage+'"]');
        var r=box && box.lastElementChild;
        if(r) applyUnit(r);
      }
    };
  }

  // تنظيف: حذف أي مسودات اتخزنت من النسخة اللي اتلغت
  try{ localStorage.removeItem('pm_recipe_draft_v1'); }catch(e){}
  if(typeof state!=='undefined' && state && state.recipeDrafts) delete state.recipeDrafts;
})();

/* ---- 201: ألوان مميزة لكل مرحلة + اقتراحات المكونات حسب الحروف المكتوبة ---- */
(function(){
  if(window.__pmRecipeSuggest) return; window.__pmRecipeSuggest=true;

  /* ألوان المراحل (التبويبات + العناوين) */
  var st=document.createElement('style');
  st.textContent =
    '#recipeEditor .stage-tabs .stage-btn.s-prep{background:#E8F5E9;border-color:#2E7D32;color:#1B5E20}'+
    '#recipeEditor .stage-tabs .stage-btn.s-oven{background:#FFF3E0;border-color:#E65100;color:#E65100}'+
    '#recipeEditor .stage-tabs .stage-btn.s-stove{background:#FDECEA;border-color:#C62828;color:#B71C1C}'+
    '#recipeEditor .stage-tabs .stage-btn.s-fin{background:#F3E5F5;border-color:#6A1B9A;color:#4A148C}'+
    '#recipeEditor .stage-tabs .stage-btn.s-prep.active{background:#2E7D32;border-color:#2E7D32;color:#FFFFFF}'+
    '#recipeEditor .stage-tabs .stage-btn.s-oven.active{background:#E65100;border-color:#E65100;color:#FFFFFF}'+
    '#recipeEditor .stage-tabs .stage-btn.s-stove.active{background:#C62828;border-color:#C62828;color:#FFFFFF}'+
    '#recipeEditor .stage-tabs .stage-btn.s-fin.active{background:#6A1B9A;border-color:#6A1B9A;color:#FFFFFF}'+
    'html body #recipeEditor .ph.ph-prep{color:#1B5E20!important;border-inline-start:6px solid #2E7D32}'+
    'html body #recipeEditor .ph.ph-oven{color:#E65100!important;border-inline-start:6px solid #E65100}'+
    'html body #recipeEditor .ph.ph-stove{color:#B71C1C!important;border-inline-start:6px solid #C62828}'+
    'html body #recipeEditor .ph.ph-fin{color:#4A148C!important;border-inline-start:6px solid #6A1B9A}'+
    /* قايمة الاقتراحات */
    '.pm-ing-sug{position:fixed;z-index:99999;background:#fff;border:1px solid rgba(0,0,0,.18);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:260px;overflow-y:auto;display:none;direction:rtl}'+
    '.pm-ing-sug.open{display:block}'+
    '.pm-ing-sug .it{padding:11px 14px;font-size:15px;color:#1B1B1B;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.06)}'+
    '.pm-ing-sug .it:last-child{border-bottom:0}'+
    '.pm-ing-sug .it.on,.pm-ing-sug .it:hover{background:#E3F2FD}'+
    '.pm-ing-sug .it b{font-weight:800;color:#0067B8}';
  document.head.appendChild(st);

  function normAr(s){
    return String(s||'').normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
      .replace(/[\u0623\u0625\u0622]/g,'\u0627')
      .replace(/\u0649/g,'\u064A')
      .replace(/\u0629/g,'\u0647')
      .toLowerCase().trim();
  }
  function escH(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }

  var box=document.createElement('div');
  box.className='pm-ing-sug'; box.setAttribute('role','listbox');
  document.body.appendChild(box);
  var target=null, items=[], active=-1;

  function allNames(){
    try{ return (typeof allIngredientNames==='function')?allIngredientNames():[]; }catch(e){ return []; }
  }

  function matchesFor(q){
    var nq=normAr(q); if(!nq) return [];
    var starts=[], inside=[];
    allNames().forEach(function(n){
      if(!n) return;
      var nn=normAr(n);
      if(nn.indexOf(nq)===0) starts.push(n);
      else if(nn.indexOf(nq)>0) inside.push(n);
    });
    starts.sort(function(a,b){return a.localeCompare(b,'ar')});
    inside.sort(function(a,b){return a.localeCompare(b,'ar')});
    return starts.concat(inside).slice(0,8).map(function(n){ return {name:n, prefix: normAr(n).indexOf(nq)===0} });
  }

  function render(q){
    box.innerHTML = items.map(function(it,i){
      var name=it.name, label;
      if(it.prefix){
        label='<b>'+escH(name.slice(0,q.length))+'</b>'+escH(name.slice(q.length));
      } else label=escH(name);
      return '<div class="it'+(i===active?' on':'')+'" data-i="'+i+'">'+label+'</div>';
    }).join('');
  }

  function position(){
    if(!target) return;
    var r=target.getBoundingClientRect();
    box.style.left=Math.max(8,r.left)+'px';
    box.style.width=Math.min(r.width, window.innerWidth-16)+'px';
    var spaceBelow=window.innerHeight-r.bottom;
    if(spaceBelow<200 && r.top>spaceBelow){
      box.style.top='auto'; box.style.bottom=(window.innerHeight-r.top+4)+'px';
    } else {
      box.style.bottom='auto'; box.style.top=(r.bottom+4)+'px';
    }
  }

  function hide(){ box.classList.remove('open'); items=[]; active=-1; target=null; }

  function show(input){
    var q=input.value;
    items=matchesFor(q);
    if(!items.length){ hide(); return; }
    target=input; active=0;
    render(q); position();
    box.classList.add('open');
  }

  function pick(i){
    if(!target||!items[i]) return;
    var input=target;
    input.value=items[i].name;
    hide();
    /* change عشان الوحدة تتملى تلقائياً (145) */
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  document.addEventListener('input',function(e){
    var t=e.target;
    if(t&&t.matches&&t.matches('#recipeEditor .cname')) show(t);
  },true);

  document.addEventListener('keydown',function(e){
    var t=e.target;
    if(!(t&&t.matches&&t.matches('#recipeEditor .cname'))) return;
    if(!box.classList.contains('open')) return;
    if(e.key==='ArrowDown'){ e.preventDefault(); active=(active+1)%items.length; render(t.value); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); active=(active-1+items.length)%items.length; render(t.value); }
    else if(e.key==='Enter'){ e.preventDefault(); pick(active); }
    else if(e.key==='Escape'){ hide(); }
  },true);

  box.addEventListener('mousedown',function(e){
    var el=e.target.closest('.it'); if(!el) return;
    e.preventDefault();
    pick(Number(el.getAttribute('data-i')));
  });
  box.addEventListener('touchstart',function(e){
    var el=e.target.closest('.it'); if(!el) return;
    e.preventDefault();
    pick(Number(el.getAttribute('data-i')));
  },{passive:false});

  document.addEventListener('focusout',function(e){
    var t=e.target;
    if(t&&t.matches&&t.matches('#recipeEditor .cname')) setTimeout(hide,180);
  },true);

  window.addEventListener('scroll',function(){ if(box.classList.contains('open')) position(); },true);
  window.addEventListener('resize',function(){ if(box.classList.contains('open')) position(); });
})();
