(function(){
  /* ---- ترتيب الصفحات: السلة في المنيو، والمصروفات في تبويب المصروفات التشغيلية ---- */
  function moveLayout(){
    var menu=document.getElementById('menu'), expSec=document.getElementById('expenses');
    var ec=document.getElementById('expenseCategory'), et=document.getElementById('expensesTable');
    if(expSec&&ec&&et){
      var formCard=ec.closest('.card'), logCard=et.closest('.card');
      if(formCard&&logCard){
        expSec.insertBefore(formCard, expSec.firstChild);
        expSec.insertBefore(logCard, formCard.nextSibling);
      }
    }
  }
  moveLayout();

  /* ---- الرسم البياني للمبيعات (للمالك بس) ---- */
  var home=document.getElementById('home');
  if(!home)return;
  var RANGE=7;
  var card=document.createElement('div');
  card.className='card'; card.id='pmSalesChart';
  card.innerHTML='<div class="sectionhead"><h2>المبيعات</h2>'+
    '<div class="pm-seg" role="tablist" aria-label="المدة">'+
    '<button type="button" data-d="7" class="on">7 أيام</button>'+
    '<button type="button" data-d="14">14 يوم</button>'+
    '<button type="button" data-d="30">30 يوم</button></div></div>'+
    '<div class="pm-kpis" id="pmKpis"></div>'+
    '<div class="pm-chart" id="pmChartBox"></div>'+
    '<div class="pm-legend"><span><i class="lg-rev"></i>الإيراد</span><span><i class="lg-prof"></i>الربح التقديري</span></div>';
  home.insertBefore(card, home.firstChild);

  var TZ='Africa/Cairo';
  function isOwner(){ return cloudActorRole==='admin'; }
  function money(v){ return Number(v||0).toLocaleString('ar-EG',{maximumFractionDigits:0})+' ج.م'; }
  function compact(v){ v=Number(v)||0; return v>=1000 ? (v/1000).toFixed(v>=10000?0:1).replace(/\.0$/,'')+'k' : String(Math.round(v)); }
  function lineTotal(x){ return Number(x.revenue!=null?x.revenue:(Number(x.qty||0)*Number(x.unitPrice||0))); }
  function dayOf(d){ return d.toLocaleDateString('sv-SE',{timeZone:TZ}); }
  function dayKey(x){
    if(x.at){ var d=new Date(x.at); if(!isNaN(d))return dayOf(d); }
    var s=String(x.date||''); return s.length>=10?s.slice(0,10):null;
  }
  function niceCeil(v){
    if(v<=0)return 1;
    var p=Math.pow(10,Math.floor(Math.log10(v))), n=v/p;
    return (n<=1?1:n<=2?2:n<=5?5:10)*p;
  }

  function build(days){
    var now=new Date(), keys=[], map={};
    for(var i=days-1;i>=0;i--){
      var k=dayOf(new Date(now.getTime()-i*86400000));
      keys.push(k); map[k]={rev:0,cost:0,costKnown:true,n:0};
    }
    (Array.isArray(state.salesLog)?state.salesLog:[]).forEach(function(x){
      if(!x)return;
      var k=dayKey(x); if(!k||!map[k])return;
      var m=map[k]; m.rev+=lineTotal(x); m.n+=1;
      if(x.costAtSale==null)m.costKnown=false; else m.cost+=Number(x.costAtSale)||0;
    });
    return keys.map(function(k){
      var m=map[k];
      return {k:k, rev:m.rev, prof:m.costKnown?m.rev-m.cost:null, n:m.n};
    });
  }

  function render(){
    if(!isOwner()){ card.style.display='none'; return; }
    card.style.display='';
    var data=build(RANGE);
    var totRev=0, totN=0, totCost=0, complete=true;
    data.forEach(function(d){ totRev+=d.rev; totN+=d.n; if(d.prof===null)complete=false; else totCost+=d.rev-d.prof; });
    var kpis=document.getElementById('pmKpis');
    kpis.innerHTML=
      '<div class="pm-kpi"><b>'+money(totRev)+'</b><span>إجمالي المبيعات</span></div>'+
      '<div class="pm-kpi"><b>'+(complete?money(totRev-totCost):'غير مكتمل')+'</b><span>ربح المبيعات (بدون الحفلات والهالك والمصروفات)</span></div>'+
      '<div class="pm-kpi"><b>'+totN+'</b><span>أصناف مباعة</span></div>';

    var box=document.getElementById('pmChartBox');
    if(!totN){ box.innerHTML='<div class="pm-chart-empty">مفيش مبيعات في الفترة دي لسه.</div>'; return; }

    var W=640, H=240, pad={l:46,r:10,t:14,b:34};
    var iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
    var maxV=Math.max.apply(null, data.map(function(d){ return Math.max(d.rev, d.prof||0); }));
    var top=niceCeil(maxV);
    var band=iw/data.length, bw=Math.max(4,Math.min(20,band*0.34));
    var parts=[];
    parts.push('<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="رسم بياني للمبيعات">');
    for(var g=0;g<=4;g++){
      var y=pad.t+ih-ih*g/4;
      parts.push('<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+y+'" y2="'+y+'" stroke="#1E3A5F" stroke-width="1"/>');
      parts.push('<text x="'+(pad.l-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="#4A6583">'+compact(top*g/4)+'</text>');
    }
    var step=Math.ceil(data.length/7);
    data.forEach(function(d,i){
      var cx=pad.l+band*i+band/2;
      var hr=ih*d.rev/top;
      parts.push('<rect class="pm-bar" style="animation-delay:'+(i*25)+'ms" x="'+(cx-bw-1)+'" y="'+(pad.t+ih-hr)+'" width="'+bw+'" height="'+Math.max(hr,0)+'" rx="4" fill="#1E3A5F"><title>'+d.k+' · الإيراد '+money(d.rev)+'</title></rect>');
      if(d.prof!==null){
        var hp=ih*Math.max(0,d.prof)/top;
        parts.push('<rect class="pm-bar" style="animation-delay:'+(i*25+60)+'ms" x="'+(cx+1)+'" y="'+(pad.t+ih-hp)+'" width="'+bw+'" height="'+Math.max(hp,0)+'" rx="4" fill="#16A34A"><title>'+d.k+' · الربح '+money(d.prof)+'</title></rect>');
      }
      if(i%step===0||i===data.length-1){
        var p=d.k.split('-');
        parts.push('<text x="'+cx+'" y="'+(H-12)+'" text-anchor="middle" font-size="10" fill="#4A6583">'+p[2]+'/'+p[1]+'</text>');
      }
    });
    parts.push('</svg>');
    box.innerHTML=parts.join('');
  }

  card.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.pm-seg button'); if(!b)return;
    RANGE=Number(b.dataset.d)||7;
    card.querySelectorAll('.pm-seg button').forEach(function(x){ x.classList.toggle('on',x===b); });
    render();
  });

  // نحدّث الرسم مع الرئيسية وتغيير الصفحة وأي تحديث للبيانات
  var origHome=window.renderHome;
  if(typeof origHome==='function'){ window.renderHome=function(){ var r=origHome.apply(this,arguments); render(); return r; }; }
  window.__goPost.push(function(id,origId){ if(origId==='home')render(); });
  /* المسار الوحيد اللي بيغلّف window.go: pre-hooks ← الدالة الأساسية ← post-hooks بنفس الترتيب القديم */
  (function(){
    var base=window.go;
    window.go=function(id){
      var origId=id, i, r;
      var pre=window.__goPre||[], post=window.__goPost||[];
      for(i=0;i<pre.length;i++) id=pre[i](id);
      r=base.call(this,id);
      for(i=0;i<post.length;i++) post[i](id,origId);
      return r;
    };
  })();
  var origRenderSales=window.renderSales;
  if(typeof origRenderSales==='function'){ window.renderSales=function(){ var r=origRenderSales.apply(this,arguments); render(); return r; }; }

  render();
})();
