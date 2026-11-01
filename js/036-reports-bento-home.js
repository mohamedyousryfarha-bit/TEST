(function(){
  function pad(n){return String(n).padStart(2,'0')}
  function keyOf(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function amount(z){return z.revenue!=null?(Number(z.revenue)||0):(Number(z.qty)||0)*(Number(z.unitPrice)||0)}
  function fmt(v){return Math.round(v).toLocaleString('ar-EG')}
  function $(id){return document.getElementById(id)}
  var bars=$('pmBars'), first=$('pmBarsFirst');
  if(!bars)return;
  for(var i=0;i<8;i++){ bars.appendChild(document.createElement('span')); }
  function update(){
    if(document.body.classList.contains('auth-required'))return;
    var logs=(typeof state!=='undefined'&&state&&Array.isArray(state.salesLog))?state.salesLog:[];
    var today=new Date(); today.setHours(0,0,0,0);
    var days=[], totals={};
    for(var i=7;i>=0;i--){ var d=new Date(today); d.setDate(today.getDate()-i); var k=keyOf(d); days.push({k:k,d:d}); totals[k]=0; }
    logs.forEach(function(z){ var k=String(z.date||'').slice(0,10); if(k in totals) totals[k]+=amount(z); });
    var t=totals[keyOf(today)], y=totals[days[days.length-2].k];
    $('pmHeroSales').textContent=fmt(t)+' ج.م';
    var dl=$('pmHeroDelta');
    if(y>0){ var p=Math.round((t-y)/y*100); dl.textContent=(p>=0?'▲ ':'▼ ')+Math.abs(p)+'% عن أمس'; }
    else { dl.textContent=t>0?'أول يوم بمبيعات':'لا توجد مبيعات بعد'; }
    var max=Math.max.apply(null,days.map(function(x){return totals[x.k]}).concat([1]));
    var spans=bars.children;
    days.forEach(function(x,idx){
      var sp=spans[idx]; sp.style.height=Math.max(6,(totals[x.k]/max)*100)+'%';
      sp.classList.toggle('today', idx===days.length-1);
      sp.title=fmt(totals[x.k])+' ج.م';
    });
    first.textContent=days[0].d.getDate()+'/'+(days[0].d.getMonth()+1);
    // جاهز للتسليم: مجموع الأصناف الجاهزة
    var ready=0; var rs=(typeof state!=='undefined'&&state&&state.readyStock)||{};
    Object.keys(rs).forEach(function(n){ ready+=Math.max(0,Number(rs[n])||0) });
    $('pmTileReady').textContent=fmt(ready);
    // تنبيهات المخزون: من الأرقام الموجودة في الصفحة
    var a=(Number(($('statZero')||{}).textContent)||0)+(Number(($('statLow')||{}).textContent)||0);
    $('pmTileAlerts').textContent=fmt(a);
  }
  update();
  setInterval(update,1500);
  document.addEventListener('click',function(){ setTimeout(update,120) });
})();
