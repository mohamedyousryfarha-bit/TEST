(function(){
  var CATS={
    'كيك':'#D9779A','تورتات':'#9B6BB0','بسكويت':'#C98B3C','معجنات':'#D9A441','أخرى':'#B49F92'
  };
  function norm(t){return String(t||'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[\u064B-\u065F]/g,'')}
  /* التصنيف التلقائي حسب اسم الصنف */
  window.pmAutoCategory=function(name){
    var n=norm(name);
    if(/تورت/.test(n))return 'تورتات';
    if(/بسكويت|بسكوت|كوكيز|سابلي|ماكرون/.test(n))return 'بسكويت';
    if(/معجن|كرواسون|فطير|بقلاوه|عجينه/.test(n))return 'معجنات';
    if(/كيك|براونيز|براوني|مفروكه|فكتوريا|كرمبل|سبونج|كب ?كيك/.test(n))return 'كيك';
    return 'أخرى';
  };
  function categoryOf(name){
    var m=(typeof state!=='undefined'&&state.recipeMeta)?state.recipeMeta[name]:null;
    return (m&&m.category&&CATS[m.category])?m.category:window.pmAutoCategory(name);
  }
  function legend(){
    var html='<div class="pm-cat-legend">'+Object.keys(CATS).map(function(k){
      return '<span><i class="pm-cat-dot" style="background:'+CATS[k]+'"></i>'+k+'</span>';
    }).join('')+'</div>';
    return html;
  }
  /* تلوين شريط كل وصفة في جدول التكلفة */
  function decorate(){
    var box=document.getElementById('allRecipeCosts'); if(!box)return;
    var table=box.querySelector('table'); if(!table)return;
    if(!box.querySelector('.pm-cat-legend')) box.insertAdjacentHTML('afterbegin',legend());
    var rows=table.querySelectorAll('tr');
    for(var i=1;i<rows.length;i++){
      var td=rows[i].querySelector('td'); if(!td)continue;
      var cat=categoryOf(td.textContent.trim());
      td.style.boxShadow='inset 4px 0 0 '+CATS[cat];
      td.style.paddingInlineStart='12px';
    }
  }
  /* تغليف الدالة الأصلية عشان التلوين يتطبق بعد كل إعادة رسم */
  function wrap(){
    if(typeof window.renderAllRecipeCosts!=='function'||window.renderAllRecipeCosts.__pmWrapped)return false;
    var orig=window.renderAllRecipeCosts;
    window.renderAllRecipeCosts=function(){ var r=orig.apply(this,arguments); try{decorate()}catch(e){} return r };
    window.renderAllRecipeCosts.__pmWrapped=true;
    return true;
  }
  if(!wrap()) window.addEventListener('load',wrap);
  setTimeout(wrap,0);
})();
