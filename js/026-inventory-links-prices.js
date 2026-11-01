(function(){
  if(window.__pmLink)return; window.__pmLink=true;

  /* الخامات في المخزون وسجل الأسعار مربوطين بالوصفات:
     - خامة اتضافت في وصفة → تتضاف للمخزون وسجل الأسعار تلقائياً
     - خامة مبقاش ليها وصفة خالص → تتشال من المخزون وسجل الأسعار */
  var lastSig=null;

  function sig(){
    var out=[];
    Object.keys(state.recipes||{}).sort().forEach(function(n){
      var comps=(state.recipes[n]||[]).map(function(c){ return (c.name||'')+'|'+(c.unit||'') }).sort();
      out.push(n+'::'+comps.join(';'));
    });
    return out.join('\n');
  }
  function neededNames(){
    var set={};
    Object.keys(state.recipes||{}).forEach(function(n){
      set[n]=true;
      (state.recipes[n]||[]).forEach(function(c){ if(c&&c.name)set[c.name]=true });
    });
    return set;
  }
  function plan(){
    var need=neededNames();
    var have={};
    (state.inventory||[]).forEach(function(x){ if(x&&x.name)have[x.name]=true });
    var removals=(state.inventory||[]).map(function(x){return x&&x.name}).filter(function(n){ return n && !need[n] });
    removals=removals.filter(function(n,i,a){return a.indexOf(n)===i});
    var additions=[];
    Object.keys(state.recipes||{}).forEach(function(n){
      (state.recipes[n]||[]).forEach(function(c){
        if(c&&c.name&&!have[c.name]&&additions.every(function(a){return a.name!==c.name})) additions.push({name:c.name,unit:c.unit||'جرام'});
      });
    });
    return {removals:removals,additions:additions};
  }
  function apply(pl,removeToo){
    if(removeToo&&pl.removals.length){
      state.inventory=(state.inventory||[]).filter(function(x){ return !(x&&pl.removals.indexOf(x.name)!==-1) });
      if(state.prices) pl.removals.forEach(function(n){ delete state.prices[n] });
    }
    pl.additions.forEach(function(a){
      state.inventory=state.inventory||[];
      state.inventory.push({name:a.name,qty:0,unit:a.unit});
    });
  }

  function reconcile(){
    var cur=sig();
    if(lastSig===null){ lastSig=cur; return }
    if(cur===lastSig)return;
    lastSig=cur;
    var pl=plan();
    if(!pl.removals.length && !pl.additions.length)return;

    var removeToo=false;
    if(pl.removals.length){
      if(window.__pmSilentReconcile){ removeToo=true }
      else {
        removeToo=confirm('الخامات دي مبقاش ليها وصفة، هتتشال من المخزون وسجل أسعار الخامات:\n\n'+pl.removals.join('، ')+'\n\nتأكيد الحذف؟ (لو لأ، هتفضل في المخزون)');
      }
    }
    apply(pl,removeToo);
    if(pl.removals.length&&!removeToo&&!window.__pmSilentReconcile){
      /* الخامات اللي اتأكد بقاؤها بتفضل، بس نسيب الـ sig يتحدث عشان مايسألش تاني */
    }
  }

  var _save=window.save;
  if(typeof _save==='function'){
    window.save=function(){
      try{ reconcile() }catch(e){}
      return _save.apply(this,arguments);
    };
  }

  /* ابدأ التتبع بعد ما البيانات السحابية تتحمل */
  new MutationObserver(function(){
    if(lastSig===null && !document.body.classList.contains('auth-required')) lastSig=sig();
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
