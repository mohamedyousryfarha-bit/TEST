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
