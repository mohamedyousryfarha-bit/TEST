(function(){
  var orig = window.renderRecipeCostResult;
  if(typeof orig!=='function') return;
  var box = function(){ return document.getElementById('recipeCostResult'); };
  var sel = function(){ return document.getElementById('costRecipe'); };

  function decorate(){
    var b = box(); if(!b) return;
    var name = sel() && sel().value; if(!name) return;
    var table = b.querySelector('.tablewrap table'); if(!table) return;
    var comps = (state.recipes && state.recipes[name]) || [];
    var valid = [];
    comps.forEach(function(c, i){ if(c && c.name && Number(c.qty) > 0) valid.push(i); });
    var rows = [].slice.call(table.querySelectorAll('tr')).slice(1, 1 + valid.length);
    rows.forEach(function(tr, k){
      var idx = valid[k], td = tr.children[1];
      if(!td || td.querySelector('input')) return;
      var inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.step = 'any';
      inp.value = comps[idx].qty; inp.dataset.comp = idx;
      inp.setAttribute('aria-label', 'كمية ' + comps[idx].name);
      inp.style.cssText = 'width:90px;min-height:38px;padding:6px 8px;text-align:center';
      td.innerHTML = ''; td.appendChild(inp);
    });
  }

  function refresh(){ orig(); decorate(); }
  window.renderRecipeCostResult = refresh;

  // الحسابات الحالية بتتعمل على الإدخال نفسه (من غير زرار)
  ['costYield','costMargin','costExtra','costActualPrice'].forEach(function(id){
    var el = document.getElementById(id); if(!el) return;
    el.removeEventListener('input', orig);
    el.addEventListener('input', refresh);
  });
  var calcBtn = document.getElementById('calcRecipeCost');
  if(calcBtn) calcBtn.onclick = refresh;

  // تعديل الكمية في الجدول: بيتحفظ في الوصفة ويتحسب على طول عند الخروج من الخانة
  box().addEventListener('change', function(e){
    var inp = e.target;
    if(!inp || inp.dataset.comp === undefined) return;
    var name = sel().value, idx = Number(inp.dataset.comp), v = Number(inp.value);
    if(!name || !(v > 0) || !state.recipes[name] || !state.recipes[name][idx]) { refresh(); return; }
    state.recipes[name][idx].qty = v;
    try { save(); } catch(err) {}
    refresh();
    if(typeof renderAllRecipeCosts === 'function') renderAllRecipeCosts();
  });

  // تحديث تلقائي لو أسعار الخامات اتغيرت وانت في شاشة التكلفة
  setInterval(function(){
    var sec = document.getElementById('costing');
    if(!sec || !sec.classList.contains('active')) return;
    if(!sel() || !sel().value) return;
    if(box().contains(document.activeElement)) return;
    refresh();
  }, 1500);
})();
