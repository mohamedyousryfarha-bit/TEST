/* أسماء الصنف والعميل بالإنجليزي + الرجوع للمنيو بعد قفل الفاتورة أو طباعتها */
(function(){
  var PREV=window.pmShowInvoice;
  if(typeof PREV!=='function') return;
  var KEY='pmInvEnNames';
  function getMap(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } }
  function remember(k,v){
    v=(v||'').trim(); if(!v) return;
    try{ var m=getMap(); m[k]=v; localStorage.setItem(KEY,JSON.stringify(m)); }catch(e){}
  }
  /* ترجمة الأسماء: قاموس للأصناف والخامات والأسماء الشائعة، والكلمة اللي مش موجودة بتتحول تقريبيًا */
  function norm(t){
    return String(t||'').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا')
      .replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/\s+/g,' ').trim().toLowerCase();
  }
  var DICT_RAW={
    /* أصناف */
    'برتقال فرش':'Fresh Orange Juice','عصير برتقال':'Orange Juice','فراولة فرش':'Fresh Strawberry Juice','مانجو فرش':'Fresh Mango Juice','ليمون فرش':'Fresh Lemon Juice',
    'كيكه':'Cake','كيك':'Cake','تورتة':'Torte','تورتة فاكهة':'Fruit Torte','تشيز كيك':'Cheesecake',
    'كب كيك':'Cupcake','براونيز':'Brownies','براوني':'Brownie','كوكيز':'Cookies','بسكويت':'Biscuits',
    'كرواسون':'Croissant','مافن':'Muffin','بان كيك':'Pancake','وافل':'Waffle','دونات':'Donut',
    'كريب':'Crepe','كنافة':'Kunafa','بسبوسة':'Basbousa','فطيرة':'Pie','بيتزا':'Pizza','سندوتش':'Sandwich',
    /* مشروبات */
    'قهوة':'Coffee','شاي':'Tea','نسكافيه':'Nescafe','كابتشينو':'Cappuccino','لاتيه':'Latte',
    'إسبريسو':'Espresso','اسبريسو':'Espresso','موكا':'Mocha','شيكولاتة ساخنة':'Hot Chocolate',
    'عصير':'Juice','ميلك شيك':'Milkshake','كوكتيل':'Cocktail','فرش':'Fresh','بارد':'Iced','سادة':'Plain',
    /* فواكه */
    'برتقال':'Orange','فراولة':'Strawberry','مانجو':'Mango','موز':'Banana','تفاح':'Apple',
    'ليمون':'Lemon','نعناع':'Mint','فاكهة':'Fruit','فاكهه':'Fruit',
    /* خامات */
    'دقيق':'Flour','سكر':'Sugar','بيض':'Eggs','زبدة':'Butter','لبن':'Milk','كريمة':'Cream','قشطة':'Cream',
    'شوكولاتة':'Chocolate','شوكولاته':'Chocolate','شوكولاتة بيضا':'White Chocolate','فانيليا':'Vanilla',
    'كراميل':'Caramel','جبنة':'Cheese','عسل':'Honey','لوز':'Almond','فستق':'Pistachio','بندق':'Hazelnut',
    'جوز':'Walnut','ملح':'Salt','خميرة':'Yeast','نشا':'Starch','زيت':'Oil','ماء':'Water',
    /* مقاسات وصفات */
    'صغير':'Small','وسط':'Medium','كبير':'Large','قطعة':'Piece','علبة':'Box','بدون':'Without','مع':'With',
    /* أسماء شائعة */
    'محمد':'Mohamed','أحمد':'Ahmed','احمد':'Ahmed','علي':'Ali','محمود':'Mahmoud','مصطفى':'Mostafa',
    'إبراهيم':'Ibrahim','ابراهيم':'Ibrahim','حسن':'Hassan','حسين':'Hussein','يوسف':'Youssef','عمر':'Omar',
    'خالد':'Khaled','كريم':'Karim','مريم':'Mariam','فاطمة':'Fatma','ياسمين':'Yasmine','سارة':'Sara',
    'نورهان':'Nourhan','منى':'Mona','هدى':'Hoda','نهى':'Noha','شيماء':'Shaimaa','آية':'Aya','اية':'Aya',
    'دينا':'Dina','رنا':'Rana','ليلى':'Layla','سلمى':'Salma','هناء':'Hanaa','أميرة':'Amira','اميرة':'Amira',
    'نادية':'Nadia','سعاد':'Soad','إيمان':'Iman','ايمان':'Iman','هبة':'Heba','مروة':'Marwa','ريم':'Reem',
    'زينب':'Zeinab','نور':'Nour','هاجر':'Hagar','حنان':'Hanan','وفاء':'Wafaa','عبدالله':'Abdallah',
    'عبد الله':'Abdallah','عبدالرحمن':'Abdelrahman','عبد الرحمن':'Abdelrahman','سعيد':'Said','طارق':'Tarek',
    'هشام':'Hesham','أشرف':'Ashraf','اشرف':'Ashraf','وائل':'Wael','تامر':'Tamer','شريف':'Sherif',
    'عماد':'Emad','ماجد':'Majed','فادي':'Fady','مينا':'Mina','بيشوي':'Bishoy','جورج':'George','مارى':'Mary',
    'ماري':'Mary','سلوى':'Salwa','رانيا':'Rania','مها':'Maha','أسماء':'Asmaa','اسماء':'Asmaa','نجلاء':'Naglaa',
    'حبيبة':'Habiba','نرمين':'Nermeen','داليا':'Dalia','غادة':'Ghada','إسلام':'Islam','اسلام':'Islam'
  };
  var DICT={};
  Object.keys(DICT_RAW).forEach(function(k){ DICT[norm(k)]=DICT_RAW[k]; });
  function letters(str){
    var TR={'ا':'a','ب':'b','ت':'t','ث':'th','ج':'g','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'g','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y'};
    var chars=Array.from(str), out='', lastCons=false;
    chars.forEach(function(ch,i){
      var r=TR[ch]; if(r===undefined){ out+=ch; lastCons=false; return; }
      if(ch==='ي') r=(i===0||!lastCons)?'y':'i';
      if(ch==='ه' && i===chars.length-1) r='a';
      var cons=!/^[aeiouy]/.test(r);
      if(cons && lastCons) out+='a';
      out+=r; lastCons=cons;
    });
    return out;
  }
  function translit(ar){
    var n=norm(ar); if(!n) return '';
    var out=DICT[n];
    if(!out){
      out=n.split(' ').map(function(w){ return DICT[w]||letters(w); }).join(' ');
    }
    return out.charAt(0).toUpperCase()+out.slice(1);
  }
  /* ترجمة أونلاين دقيقة: لو الاسم مش في القاموس، بيتترجم عن طريق خدمة الترجمة (MyMemory). الأسماء بتتحفظ في الكاش عشان ما تتترجمش مرتين */
  var ONLINE_TRANSLATE=true;   /* غيّرها لـ false لو مش عايز أي اسم يتبعت لخدمة خارجية */
  var TR_CACHE_KEY='pmInvTrCache';
  function trCache(){ try{ return JSON.parse(localStorage.getItem(TR_CACHE_KEY)||'{}')||{}; }catch(e){ return {}; } }
  function trCacheSet(k,v){ try{ var c=trCache(); c[k]=v; localStorage.setItem(TR_CACHE_KEY,JSON.stringify(c)); }catch(e){} }
  function dictOnly(ar){ var n=norm(ar); return DICT[n]?(DICT[n].charAt(0).toUpperCase()+DICT[n].slice(1)):null; }
  function onlineTranslate(ar){
    var n=norm(ar); if(!n) return Promise.resolve(null);
    var c=trCache(); if(c['ar:'+n]) return Promise.resolve(c['ar:'+n]);
    if(!ONLINE_TRANSLATE||!navigator.onLine) return Promise.resolve(null);
    var url='https://api.mymemory.translated.net/get?langpair=ar|en&q='+encodeURIComponent(String(ar).trim());
    return fetch(url).then(function(r){ return r.json(); }).then(function(j){
      var t=j&&j.responseData&&j.responseData.translatedText;
      if(!t||/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(t)) return null;
      t=String(t).trim().replace(/^["']+|["']+$/g,'');
      if(!t) return null;
      t=t.charAt(0).toUpperCase()+t.slice(1);
      trCacheSet('ar:'+n,t);
      return t;
    }).catch(function(){ return null; });
  }
  function mk(kind,ar){
    var el=document.createElement('span');
    el.className=(kind==='cust')?'pm-en-cust':'pm-en-in';
    el.setAttribute('contenteditable','true');
    el.setAttribute('spellcheck','false');
    el.setAttribute('data-kind',kind);
    el.setAttribute('data-ar',ar);
    var saved=getMap()[kind+':'+ar];
    var start=saved||dictOnly(ar)||translit(ar);
    el.textContent=start;
    el.addEventListener('input',function(){ el.setAttribute('data-edited','1'); });
    el.addEventListener('blur',function(){ remember(kind+':'+ar, el.textContent); });
    el.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); el.blur(); } });
    if(!saved && !dictOnly(ar)){
      onlineTranslate(ar).then(function(t){
        if(t && el.getAttribute('data-edited')!=='1' && el.isConnected) el.textContent=t;
      });
    }
    return el;
  }
  function enize(paper){
    paper.querySelectorAll('td.nm').forEach(function(td){
      var ar=td.textContent.trim();
      if(!ar||td.querySelector('.pm-en-in')) return;
      td.textContent=''; td.appendChild(mk('item',ar));
    });
    paper.querySelectorAll('div').forEach(function(d){
      if(d.querySelector('.pm-en-cust')) return;
      if(d.textContent.trim().indexOf('Customer:')!==0) return;
      var b=d.querySelector('b'); if(!b) return;
      var ar=b.textContent.trim(); if(!ar||ar==='—') return;
      b.parentNode.replaceChild(mk('cust',ar),b);
    });
  }
  function finalize(paper){
    paper.querySelectorAll('.pm-en-in,.pm-en-cust').forEach(function(el){
      var ar=el.getAttribute('data-ar')||'', kind=el.getAttribute('data-kind');
      var v=(el.textContent||'').trim();
      remember(kind+':'+ar, v);
      var sp=document.createElement('span');
      sp.textContent=v||translit(ar);
      el.parentNode.replaceChild(sp,el);
    });
  }
  /* بعد قفل الفاتورة أو طباعتها: نقفل السلة وأي نافذة مفتوحة */
  function isVisible(el){
    if(!el||el.hidden) return false;
    var cs=getComputedStyle(el);
    return cs.display!=='none' && cs.visibility!=='hidden' && el.getBoundingClientRect().height>0;
  }
  function closeAllWindows(){
    var ov=document.getElementById('drawerOverlay');
    if(ov && !ov.hidden){ var dc=document.getElementById('drawerClose'); if(dc) dc.click(); }
    document.querySelectorAll('.pm-sheet.show').forEach(function(x){
      var b=x.querySelector('#pmSheetX,.pm-x');
      if(b) b.click(); else x.classList.remove('show');
    });
    document.querySelectorAll('.pm-msheet').forEach(function(x){ if(isVisible(x)) x.hidden=true; });
    document.querySelectorAll('.msg-overlay.show').forEach(function(x){ x.classList.remove('show'); });
    var pal=document.querySelector('.pm-pal');
    if(isVisible(pal)){ pal.hidden=true; pal.classList.remove('show','open'); }
    var bell=document.getElementById('pmBellPanel');
    if(isVisible(bell)){ var bb=document.getElementById('pmBell'); if(bb) bb.click(); }
    var fabs=document.getElementById('pmFabs');
    if(fabs) fabs.classList.remove('open');
  }
  function goMenu(){
    var t=document.querySelector('nav.tabs .tab[data-tab="menu"]');
    if(t) t.click();
  }
  var wasOpen=false;
  new MutationObserver(function(){
    var open=!!document.querySelector('.pmv-ov');
    if(wasOpen && !open) setTimeout(function(){ closeAllWindows(); goMenu(); },50);
    wasOpen=open;
  }).observe(document.body,{childList:true});

  window.pmShowInvoice=function(rc){
    PREV.apply(this,arguments);
    var ovs=document.querySelectorAll('.pmv-ov'), ov=ovs[ovs.length-1];
    if(!ov) return;
    var paper=ov.querySelector('#pmInvPrint'), bar=ov.querySelector('.pmv-lang');
    if(!paper||!bar) return;
    /* لغة الـ QR: لو الفاتورة معروضة بالإنجليزي، رابط صفحة الـ QR بيتفتح بالإنجليزي */
    var qrBox=ov.querySelector('#pmvQrBox');
    bar.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('button[data-l]'); if(!b) return;
      paper.setAttribute('data-lang',b.getAttribute('data-l'));
      if(qrBox){ qrBox.innerHTML=''; delete qrBox.dataset.done; }
    });
    if(qrBox){
      /* رابط الـ QR بالإنجليزي: بنضيف أسماء الأصناف والعميل المترجمة جوه البيانات */
      var b64enc=function(obj){
        var bytes=new TextEncoder().encode(JSON.stringify(obj)), bin='';
        for(var i=0;i<bytes.length;i++) bin+=String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      };
      var b64dec=function(b64){
        b64=b64.replace(/-/g,'+').replace(/_/g,'/');
        while(b64.length%4) b64+='=';
        var bin=atob(b64), bytes=new Uint8Array(bin.length);
        for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
      };
      var enNames=function(){
        var names=Array.prototype.map.call(paper.querySelectorAll('td.nm'),function(td){ return (td.textContent||'').trim(); });
        var c=paper.querySelector('.pm-en-cust');
        return {l:names, cn:c?(c.textContent||'').trim():''};
      };
      new MutationObserver(function(){
        if(paper.getAttribute('data-lang')!=='en') return;
        qrBox.querySelectorAll('img').forEach(function(img){
          try{
            var u=new URL(img.src);
            var d=u.searchParams.get('data');
            if(!d||d.indexOf('invoice.html#')===-1||d.indexOf('lang=en')!==-1) return;
            var i=d.indexOf('#');
            var base=d.slice(0,i), obj=b64dec(d.slice(i+1));
            obj.en=enNames();
            u.searchParams.set('data', base+'?lang=en#'+b64enc(obj));
            img.src=u.toString();
          }catch(err){}
        });
      }).observe(qrBox,{childList:true,subtree:true});
    }
    bar.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('button[data-l]'); if(!b) return;
      if(b.getAttribute('data-l')==='en') enize(paper);
    });
    ov.addEventListener('click',function(e){
      if(!(e.target.closest&&e.target.closest('#pmvPrint'))) return;
      finalize(paper);
      setTimeout(function(){ var c=ov.querySelector('#pmvClose'); if(c) c.click(); },400);
    },true);
  };
})();
