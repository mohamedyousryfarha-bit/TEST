/* دمج تلقائي لملفات متتالية من نفس الميزة بالترتيب الأصلي. كل جزء معزول بـ try/catch عشان فشل جزء ما يوقفش الباقي. */
/* ---- 083-invoices-language.js ---- */
try{
/* اختيار لغة الفاتورة (عربي / English) من شاشة الفاتورة قبل الطباعة */
(function(){
  var ORIG=window.pmShowInvoice;
  if(typeof ORIG!=='function') return;
  var EN=[
    ['<small>رقم الفاتورة</small>','<small>Invoice No.</small>'],
    ['<small>التاريخ</small>','<small>Date</small>'],
    ['<small>البائع</small>','<small>Cashier</small>'],
    ['<th class="nm">الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th>','<th class="nm">Item</th><th>Qty</th><th>Price</th><th>Total</th>'],
    ['<span>الإجمالي</span>','<span>Total</span>'],
    ['<span>الإجمالي قبل الضريبة</span>','<span>Subtotal before tax</span>'],
    ['<span>ضريبة القيمة المضافة ','<span>VAT '],
    ['العميل: <b>','Customer: <b>'],
    ['التليفون: <b','Phone: <b'],
    ['ملاحظة: ','Note: '],
    ['السجل التجاري: ','Commercial Reg.: '],
    ['البطاقة الضريبية: ','Tax Card: '],
    [' ج.م</b>',' EGP</b>'],
    ['شكراً لزيارتكم','Thank you for your visit']
  ];
  var AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
  function toWestern(h){
    return h.replace(/[٠-٩]/g,function(c){return String(AR_DIGITS.indexOf(c))})
            .replace(/٫/g,'.').replace(/٬/g,',');
  }
  function toEnglish(h){
    EN.forEach(function(p){ h=h.split(p[0]).join(p[1]); });
    h=toWestern(h);
    return h.replace('<div class="inv">','<div class="inv" dir="ltr" lang="en">');
  }
  window.pmShowInvoice=function(rc){
    ORIG.apply(this,arguments);
    var ovs=document.querySelectorAll('.pmv-ov'), ov=ovs[ovs.length-1];
    if(!ov) return;
    var paper=ov.querySelector('#pmInvPrint'), box=ov.querySelector('.pmv-box'), acts=ov.querySelector('.pmv-acts');
    if(!paper||!box||!acts) return;
    var arHTML=paper.innerHTML;
    var bar=document.createElement('div');
    bar.className='pmv-lang';
    bar.innerHTML='<button type="button" data-l="ar" class="on">عربي</button><button type="button" data-l="en">English</button>';
    box.insertBefore(bar,acts);
    bar.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('button[data-l]'); if(!b) return;
      var l=b.getAttribute('data-l');
      paper.innerHTML = l==='en' ? toEnglish(arHTML) : arHTML;
      bar.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
    });
  };
})();
}catch(e){console.error('[PastryMY] 083-invoices-language.js failed',e)}
/* ---- 084-invoices-english-names.js ---- */
try{
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
    'حبيبة':'Habiba','نرمين':'Nermeen','داليا':'Dalia','غادة':'Ghada','إسلام':'Islam','اسلام':'Islam',
    /* ---- توسعة قاموس الحلويات العالمية ---- */
    /* ===== حلويات عربية ومصرية ===== */
    'بقلاوة':'Baklava',
    'باقلاوة':'Baklava',
    'بقلاوة بالفستق':'Pistachio Baklava',
    'بقلاوة بالجوز':'Walnut Baklava',
    'كنافة ناعمة':'Shredded Kunafa',
    'كنافة بالجبنة':'Cheese Kunafa',
    'كنافة بالقشطة':'Kunafa with Cream',
    'كنافة بالمكسرات':'Nut Kunafa',
    'كنافة بالفستق':'Pistachio Kunafa',
    'قطايف':'Qatayef',
    'عطايف':'Atayef',
    'قطايف بالقشطة':'Qatayef with Cream',
    'قطايف بالجوز':'Walnut Qatayef',
    'أم علي':'Om Ali',
    'مهلبية':'Mahalabia',
    'مهلبية بالفستق':'Pistachio Mahalabia',
    'مهلبية بالكراميل':'Caramel Mahalabia',
    'رز بلبن':'Rice Pudding',
    'أرز بالحليب':'Rice Pudding',
    'رز بالحليب':'Rice Pudding',
    'عيش السرايا':'Eish el Saraya',
    'لقيمات':'Luqaimat',
    'لقمة القاضي':'Luqmat al-Qadi',
    'زلابية':'Zalabia',
    'مشبك':'Mushabak',
    'غريبة':'Ghorayeba',
    'برازق':'Barazek',
    'معمول':'Maamoul',
    'معمول بالتمر':'Date Maamoul',
    'معمول بالجوز':'Walnut Maamoul',
    'معمول بالفستق':'Pistachio Maamoul',
    'حلاوة الجبن':'Cheese Halawa',
    'حلاوة طحينية':'Tahini Halva',
    'حلاوة طحينة':'Tahini Halva',
    'حلاوة':'Halva',
    'حلاوة مولد':'Mawlid Halva',
    'سميد':'Semolina Cake',
    'نمورة':'Namoura',
    'عوامة':'Awwama',
    'ألماظية':'Almaza',
    'بسبوسة بالقشطة':'Basbousa with Cream',
    'بسبوسة بالجوز':'Walnut Basbousa',
    'بسبوسة بالفستق':'Pistachio Basbousa',
    'بسبوسة بجوز الهند':'Coconut Basbousa',
    'هريسة':'Harisa (Semolina Dessert)',
    'مدلوقة':'Madlouqa',
    'خبيصة':'Khabisa',
    'شباكية':'Chebakia',
    'كعب الغزال':'Kaab el Ghazal',
    'كعب غزال':'Kaab el Ghazal',
    'بريوات':'Briouats',
    'بريوات باللوز':'Almond Briouats',
    'سلو':'Sellou',
    'مقروض':'Makroud',
    'مخروض':'Makroud',
    'مكرود':'Makroud',
    'بسيسة':'Bsissa',
    'كليجة':'Kleicha',
    'كعك':'Kaak (Eid Cookies)',
    'كعك العيد':'Eid Kaak',
    'سفوف':'Sfouf',
    'زردة':'Zarda (Sweet Rice)',
    'شيرينية':'Sweets',
    'حلويات':'Sweets',
    'حلوى':'Dessert',
    'حلويات شرقية':'Oriental Sweets',
    'حلويات عربية':'Arabic Sweets',
    'حلويات مصرية':'Egyptian Sweets',
    'حلويات افرنجي':'Western Pastry',
    'حلويات غربية':'Western Pastry',
    'ملبن':'Nougat',
    'قمر الدين':'Qamar al-Din Apricot',
    'عجوة':'Ajwa Date',
    'بلح':'Dates',
    'تمر':'Dates',
    'تمر هندي':'Tamarind',
    'تمر مجفف':'Dried Dates',
    /* ===== تركي وفارسي وشامي ===== */
    'لوكوم':'Turkish Delight',
    'لوقوم':'Turkish Delight',
    'راحة الحلقوم':'Turkish Delight',
    'حلوى تركية':'Turkish Delight',
    'كنافة تركية':'Künefe',
    'كونافة':'Künefe',
    'سوتلاش':'Sütlaç',
    'سوتلاج':'Sütlaç',
    'ريفاني':'Revani',
    'توليمبة':'Tulumba',
    'طولومبا':'Tulumba',
    'توليمبا':'Tulumba',
    'كازاندبي':'Kazandibi',
    'قزاندبي':'Kazandibi',
    'شكر باره':'Şekerpare',
    'شيكربارة':'Şekerpare',
    'فالوده':'Faloodeh',
    'زولبية':'Zoolbia',
    'زولبيا':'Zoolbia',
    'سوهان':'Sohan',
    'حلوى زعفران':'Saffron Sweets',
    /* ===== هندي ===== */
    'جلاب جامون':'Gulab Jamun',
    'جولاب جامون':'Gulab Jamun',
    'راسغولا':'Rasgulla',
    'راسجولا':'Rasgulla',
    'جلابي':'Jalebi',
    'جلبي':'Jalebi',
    'برفي':'Barfi',
    'بارفي':'Barfi',
    'كير':'Kheer',
    'لادو':'Laddu',
    'كولفي':'Kulfi',
    'قلفي':'Kulfi',
    'راسمالاي':'Rasmalai',
    'شريخند':'Shrikhand',
    'جاجر هلوة':'Gajar Halwa',
    'هلوة الجزر':'Carrot Halwa',
    'ميسور باك':'Mysore Pak',
    'حلوى هندية':'Indian Sweets',
    'زردة هندية':'Indian Sweet Rice',
    /* ===== آسيوي ===== */
    'موشي':'Mochi',
    'موتشي':'Mochi',
    'دوراياكي':'Dorayaki',
    'تايياكي':'Taiyaki',
    'واغاشي':'Wagashi',
    'ماتشا':'Matcha',
    'دايفوكو':'Daifuku',
    'داي فوكو':'Daifuku',
    'أنمتسو':'Anmitsu',
    'بينغسو':'Bingsu',
    'بينج سو':'Bingsu',
    'هوتوك':'Hotteok',
    'حلوى هوتوك':'Hotteok',
    'كعكة القمر':'Mooncake',
    'مونكيك':'Mooncake',
    'تارت البيض':'Egg Tart',
    'تارت بيض':'Egg Tart',
    'أونديه أونديه':'Ondeh Ondeh',
    'اوندي اوندي':'Ondeh Ondeh',
    'مانجو ستيكي رايس':'Mango Sticky Rice',
    'ستيكي رايس':'Sticky Rice',
    'كوي':'Kuih',
    'كعكة المدخنة':'Chimney Cake',
    'لامينغتون':'Lamington',
    'لامنغتون':'Lamington',
    'بافلوفا':'Pavlova',
    'أنزاك':'Anzac Biscuits',
    'شاي أخضر':'Green Tea',
    'زعفران':'Saffron',
    'هيل':'Cardamom',
    'حبهان':'Cardamom',
    'قرفة':'Cinnamon',
    'يانسون':'Anise',
    'ورد':'Rose',
    'ماء ورد':'Rose Water',
    'ماء الزهر':'Orange Blossom Water',
    'ماء زهر':'Orange Blossom Water',
    'جوز الطيب':'Nutmeg',
    /* ===== إيطالي ===== */
    'تيراميسو':'Tiramisu',
    'تيراميزو':'Tiramisu',
    'بانا كوتا':'Panna Cotta',
    'باناكوتا':'Panna Cotta',
    'كانولي':'Cannoli',
    'كانوليه':'Cannoli',
    'جيلاتو':'Gelato',
    'جيلاتي':'Gelato',
    'بوظة':'Ice Cream',
    'آيس كريم':'Ice Cream',
    'سفوجليا':'Sfogliatella',
    'سفوغليانيا':'Sfogliatella',
    'زابايوني':'Zabaglione',
    'زبايوني':'Zabaglione',
    'بينيه':'Bignè',
    'بروفيتيرول':'Profiteroles',
    'بروفيترول':'Profiteroles',
    'بروفيتيرولز':'Profiteroles',
    'زوكوتو':'Zuccotto',
    'بانيتون':'Panettone',
    'بانيتوني':'Panettone',
    'باندورو':'Pandoro',
    'بيسكوتي':'Biscotti',
    'بسكوتي':'Biscotti',
    'سيميفريدو':'Semifreddo',
    'سيمي فريدو':'Semifreddo',
    'أفوجاتو':'Affogato',
    'تورتا':'Torta',
    /* ===== فرنسي ===== */
    'كريم بروليه':'Crème Brûlée',
    'كريم بريوليه':'Crème Brûlée',
    'كرم بروليه':'Crème Brûlée',
    'إيكلير':'Éclair',
    'إكلير':'Éclair',
    'ماكرون':'Macaron',
    'ماكارون':'Macaron',
    'ماكرونز':'Macarons',
    'ميل فوي':'Mille-feuille',
    'ميلفوي':'Mille-feuille',
    'ميل فيي':'Mille-feuille',
    'تارت تاتان':'Tarte Tatin',
    'تارت تاتين':'Tarte Tatin',
    'مادلين':'Madeleine',
    'مادلان':'Madeleine',
    'فينانسييه':'Financier',
    'كريب سوزيت':'Crêpe Suzette',
    'ريليجيوز':'Religieuse',
    'باريس برست':'Paris-Brest',
    'باريس بريست':'Paris-Brest',
    'أوبرا':'Opera Cake',
    'فوندان':'Fondant',
    'كروكمبوش':'Croquembouche',
    'كروكانبوش':'Croquembouche',
    'كلافوتي':'Clafoutis',
    'فار بريتون':'Far Breton',
    'شارلوت':'Charlotte',
    'شارلوط':'Charlotte',
    'سافارين':'Savarin',
    'سان أونوريه':'Saint-Honoré',
    'كرواسان':'Croissant',
    'بريوش':'Brioche',
    'بريوشا':'Brioche',
    'بان أو شوكولا':'Pain au Chocolat',
    'كانيليه':'Canelé',
    'نوغا':'Nougat',
    'نوجا':'Nougat',
    'نوغة':'Nougat',
    'بيتي فور':'Petit Four',
    'بتي فور':'Petit Four',
    'كريم كراميل':'Crème Caramel',
    'فلان':'Flan',
    'فلن':'Flan',
    'فلان كراميل':'Caramel Flan',
    'موس':'Mousse',
    'موس شوكولاتة':'Chocolate Mousse',
    /* ===== إسباني ولاتيني و برتغالي ===== */
    'تشوروس':'Churros',
    'شوروس':'Churros',
    'تشورو':'Churro',
    'ألفاخور':'Alfajor',
    'الفاخورس':'Alfajores',
    'دولسي دي ليتشي':'Dulce de Leche',
    'دولشي دي ليتشي':'Dulce de Leche',
    'بولفورون':'Polvorón',
    'بولبورون':'Polvorón',
    'تورون':'Turrón',
    'توترون':'Turrón',
    'تارتا دي سانتياغو':'Tarta de Santiago',
    'أرز كون ليتشي':'Arroz con Leche',
    'تريس ليتشيس':'Tres Leches',
    'ثلاث حليب':'Tres Leches',
    'كيك ثلاث حليب':'Tres Leches Cake',
    'كيكة ثلاث حليب':'Tres Leches Cake',
    'بريغادييرو':'Brigadeiro',
    'بريجادير':'Brigadeiro',
    'بيجينيو':'Beijinho',
    'بيجنيو':'Beijinho',
    'باستيل دي ناتا':'Pastel de Nata',
    'بستيل دي ناتا':'Pastel de Nata',
    'كابيروتادا':'Capirotada',
    'كونتشاس':'Conchas',
    'كوكادا':'Cocada',
    /* ===== ألماني ونمساوي وشرق أوروبي ===== */
    'شتولين':'Stollen',
    'شتولن':'Stollen',
    'ليبكوخن':'Lebkuchen',
    'لبكوخن':'Lebkuchen',
    'بلاك فورست':'Black Forest Cake',
    'الغابة السوداء':'Black Forest Cake',
    'كيكة الغابة السوداء':'Black Forest Cake',
    'كعكة الغابة السوداء':'Black Forest Cake',
    'أبفيل شترودل':'Apfelstrudel',
    'شترودل':'Strudel',
    'ستروديل':'Strudel',
    'بينينشتيش':'Bienenstich',
    'كيز كيخن':'Käsekuchen',
    'كيسكوخن':'Käsekuchen',
    'بانكيك':'Pancake',
    'بان كيكس':'Pancakes',
    'كرابفن':'Krapfen',
    'ساشرتورتا':'Sachertorte',
    'زاخر توتن':'Sachertorte',
    'دوبوش':'Dobos Torte',
    'استرهازي':'Esterházy Torte',
    'كوليتش':'Kulich',
    'بابكا':'Babka',
    'ميدوفيك':'Medovik',
    'نابوليون':'Napoleon Cake',
    'هامانتاشن':'Hamantaschen',
    'روجالاش':'Rugelach',
    'روجيلاخ':'Rugelach',
    'كوجل':'Kugel',
    'بلينتز':'Blintzes',
    /* ===== بريطاني وأسترالي ===== */
    'ترايفل':'Trifle',
    'تريفل':'Trifle',
    'إيتون ميس':'Eton Mess',
    'سكون':'Scone',
    'سكونز':'Scones',
    'كرمبل':'Crumble',
    'كرامبل':'Crumble',
    'ستيكي توفي بودينج':'Sticky Toffee Pudding',
    'توفي':'Toffee',
    'تافي':'Toffee',
    'باكويل':'Bakewell Tart',
    'بيكويل':'Bakewell Tart',
    'شورت بريد':'Shortbread',
    'شورتبريد':'Shortbread',
    'فلابجاك':'Flapjack',
    'إسفنج':'Sponge',
    'كيك الإسفنج':'Sponge Cake',
    'كيك اسفنج':'Sponge Cake',
    'فيكتوريا سبونج':'Victoria Sponge',
    'بودينج':'Pudding',
    'بودنج':'Pudding',
    'بودينج الخبز':'Bread Pudding',
    'بودينج اللبن':'Milk Pudding',
    'كسترد':'Custard',
    'كاستارد':'Custard',
    'كاستر':'Custard',
    /* ===== أمريكي ===== */
    'تشيزكيك':'Cheesecake',
    'شيزكيك':'Cheesecake',
    'كعكة الجبنة':'Cheesecake',
    'كيكة الجبنة':'Cheesecake',
    'باي بيكان':'Pecan Pie',
    'بيكان باي':'Pecan Pie',
    'تفاح باي':'Apple Pie',
    'فطيرة التفاح':'Apple Pie',
    'فطيرة اليقطين':'Pumpkin Pie',
    'بامبكن باي':'Pumpkin Pie',
    'سمورز':'S\'mores',
    'فانل كيك':'Funnel Cake',
    'كيك الجزر':'Carrot Cake',
    'كيك كاروت':'Carrot Cake',
    'ريد فيلفيت':'Red Velvet',
    'ريد فلفت':'Red Velvet',
    'كي لايم باي':'Key Lime Pie',
    'سنيكرز دودل':'Snickerdoodle',
    'ويبي باي':'Whoopie Pie',
    'شوكولاتة تشيب كوكيز':'Chocolate Chip Cookies',
    'كوكيز شوكولاتة':'Chocolate Chip Cookies',
    'كوكيز بالشوكولاتة':'Chocolate Chip Cookies',
    'كيك الشوكولاتة':'Chocolate Cake',
    'كيك فانيليا':'Vanilla Cake',
    'كيك ليمون':'Lemon Cake',
    'كيك برتقال':'Orange Cake',
    'كيك موز':'Banana Cake',
    'كيك الموز':'Banana Cake',
    'كيك فراولة':'Strawberry Cake',
    'كيك الفراولة':'Strawberry Cake',
    'كيك اليقطين':'Pumpkin Cake',
    'كوكي':'Cookie',
    'وافلز':'Waffles',
    'كريبات':'Crepes',
    'تارت':'Tart',
    'تارتة':'Tart',
    'تارت فواكه':'Fruit Tart',
    'تارت فراولة':'Strawberry Tart',
    'تارت ليمون':'Lemon Tart',
    'تارت شوكولاتة':'Chocolate Tart',
    'كاب كيك':'Cupcake',
    'كب كيكس':'Cupcakes',
    'ماففن':'Muffin',
    'ويفر':'Wafer',
    'ويفرز':'Wafers',
    'ويفر كيك':'Wafer Cake',
    'كيك الويفر':'Wafer Cake',
    /* ===== أفريقي ===== */
    'بوف بوف':'Puff Puff',
    'بف بف':'Puff Puff',
    'شين شين':'Chin Chin',
    /* ===== مثلجات و مشروبات حلوة ===== */
    'سوربيه':'Sorbet',
    'سوربيت':'Sorbet',
    'فروزن يوجورت':'Frozen Yogurt',
    'بوب سيكل':'Popsicle',
    'بوبسيكل':'Popsicle',
    'ايس بوب':'Popsicle',
    'سندوتش آيس كريم':'Ice Cream Sandwich',
    'سموذي':'Smoothie',
    'سموثي':'Smoothie',
    /* ===== عجائن ومعجنات ===== */
    'عجينة الفيلو':'Phyllo Dough',
    'فيلو':'Phyllo',
    'عجينة ورق':'Phyllo Dough',
    'عجينة بف':'Puff Pastry',
    'بف بيسترى':'Puff Pastry',
    'بيف بيسترى':'Puff Pastry',
    'بفاف':'Puff Pastry',
    'معجنات':'Pastries',
    'فطير':'Pastry',
    'عجينة':'Dough',
    'مارشميلو':'Marshmallow',
    'ماشمالو':'Marshmallow',
    'مارشمالو':'Marshmallow',
    'جيلي':'Jelly',
    'جيلاتين':'Gelatin',
    /* ===== شوكولاتة ومكسرات وفواكه ===== */
    'شيكولاتة':'Chocolate',
    'شوكولاتة داكنة':'Dark Chocolate',
    'شيكولاتة داكنة':'Dark Chocolate',
    'شوكولاتة بالحليب':'Milk Chocolate',
    'شوكولاتة بيضاء':'White Chocolate',
    'شيكولاتة بيضاء':'White Chocolate',
    'كاكاو':'Cocoa',
    'بودرة كاكاو':'Cocoa Powder',
    'نوتيلا':'Nutella',
    'لوتس':'Lotus',
    'بيسكويت لوتس':'Lotus Biscuit',
    'كاراميل مملح':'Salted Caramel',
    'كراميل مملح':'Salted Caramel',
    'مملح':'Salted',
    'كاجو':'Cashew',
    'بيكان':'Pecan',
    'مكسرات':'Nuts',
    'مكسرات مشكلة':'Mixed Nuts',
    'جوز الهند':'Coconut',
    'جوز هند':'Coconut',
    'نارجيل':'Coconut',
    'لوز مطحون':'Ground Almond',
    'سمسم':'Sesame',
    'طحينة':'Tahini',
    'زبدة الفول السوداني':'Peanut Butter',
    'زبدة فول سوداني':'Peanut Butter',
    'فول سوداني':'Peanut',
    'تين':'Fig',
    'تين مجفف':'Dried Fig',
    'رمان':'Pomegranate',
    'توت':'Berries',
    'توت أزرق':'Blueberry',
    'بلوبيري':'Blueberry',
    'توت العليق':'Raspberry',
    'راسبري':'Raspberry',
    'توت بري':'Wild Berries',
    'كرز':'Cherry',
    'فريز':'Strawberry',
    'كيوي':'Kiwi',
    'باشن فروت':'Passion Fruit',
    'باشن':'Passion Fruit',
    'أناناس':'Pineapple',
    'جوافة':'Guava',
    'يوسفي':'Tangerine',
    'مندرين':'Tangerine',
    'مشمش':'Apricot',
    'مربى':'Jam',
    'مربى مشمش':'Apricot Jam',
    'مربى فراولة':'Strawberry Jam',
    'مربى توت':'Berry Jam',
    'تفاح أخضر':'Green Apple',
    'مانجا':'Mango',
    'ليمون حامض':'Lemon',
    /* ===== ألبان وبيض ومكونات خبز ===== */
    'صفار':'Egg Yolk',
    'صفار البيض':'Egg Yolk',
    'بياض البيض':'Egg White',
    'كريمة مخفوقة':'Whipped Cream',
    'كريمة خفاقة':'Whipped Cream',
    'كريمة طازجة':'Fresh Cream',
    'حليب مكثف':'Condensed Milk',
    'لبن مكثف':'Condensed Milk',
    'حليب بودرة':'Milk Powder',
    'لبن بودرة':'Milk Powder',
    'حليب':'Milk',
    'جبنة كريمية':'Cream Cheese',
    'جبنة كريمة':'Cream Cheese',
    'كريمة شيز':'Cream Cheese',
    'جبنة موزاريلا':'Mozzarella',
    'ماسكاربوني':'Mascarpone',
    'ماسكربوني':'Mascarpone',
    'ريكوتا':'Ricotta',
    'جبنة ريكوتا':'Ricotta',
    'تشيز':'Cheese',
    'صوص':'Sauce',
    'صوص شوكولاتة':'Chocolate Sauce',
    'صوص كراميل':'Caramel Sauce',
    'سكر بودرة':'Powdered Sugar',
    'سكر ناعم':'Powdered Sugar',
    'سكر بني':'Brown Sugar',
    'سكر أسمر':'Brown Sugar',
    'سكر نبات':'Rock Sugar',
    'نشا الذرة':'Cornstarch',
    'دقيق الذرة':'Cornflour',
    'سميد ناعم':'Fine Semolina',
    'سميد خشن':'Coarse Semolina',
    'دقيق كيك':'Cake Flour',
    'دقيق قمح':'Wheat Flour',
    'بيكنج بودر':'Baking Powder',
    'بيكنج باودر':'Baking Powder',
    'بيكنج صودا':'Baking Soda',
    'صودا':'Baking Soda',
    'فانيلا':'Vanilla',
    'زيت نباتي':'Vegetable Oil',
    'زيت زيتون':'Olive Oil',
    'زبدة غير مملحة':'Unsalted Butter',
    'زبدة مملحة':'Salted Butter',
    'مارجرين':'Margarine',
    'شورتنينج':'Shortening',
    'زبادي':'Yogurt',
    'لبن زبادي':'Yogurt',
    'زبادي يوناني':'Greek Yogurt',
    'لبن رايب':'Buttermilk',
    'جلوكوز':'Glucose',
    'جلوكوز شراب':'Glucose Syrup',
    'شراب':'Syrup',
    'قطر':'Syrup',
    'عسل نحل':'Honey',
    'بودرة':'Powder',
    /* ===== قوالب وحجم وتغليف ===== */
    'صغيرة':'Small',
    'كبيرة':'Large',
    'متوسطة':'Medium',
    'كيلو':'Kilo',
    'نص كيلو':'Half Kilo',
    'ربع كيلو':'Quarter Kilo',
    'كيس':'Bag',
    'صينية':'Tray',
    'طبق':'Plate',
    'كوب':'Cup',
    'كوب كبير':'Large Cup',
    'قالب':'Mold',
    'قالب كيك':'Cake Mold',
    'كعكة':'Cake',
    'كيكة صغيرة':'Mini Cake',
    /* ===== وصف وتجهيز ===== */
    'مغطى':'Coated',
    'مغطى بالشوكولاتة':'Chocolate Coated',
    'محشي':'Filled',
    'محشية':'Filled',
    'محشي بالكريمة':'Cream Filled',
    'دونات محشي':'Filled Donut',
    'بالمكسرات':'With Nuts',
    'بالكريمة':'With Cream',
    'بالقشطة':'With Cream',
    'بالشوكولاتة':'With Chocolate',
    'بالعسل':'With Honey',
    'بالفواكه':'With Fruit',
    'بالفستق':'With Pistachio',
    'بالجوز':'With Walnut',
    'بالتمر':'With Dates',
    'بالجبنة':'With Cheese',
    'بالجبن':'With Cheese',
    'بالليمون':'With Lemon',
    'بالفانيليا':'With Vanilla',
    'بالكراميل':'With Caramel',
    'بالزبدة':'With Butter',
    'بالقرفة':'With Cinnamon',
    'بالورد':'With Rose',
    'بماء الورد':'With Rose Water',
    'بالحليب':'With Milk',
    'باللبن':'With Milk',
    'بلبن':'With Milk',
    'بالسمسم':'With Sesame',
    'بالنوتيلا':'With Nutella',
    'بالمربى':'With Jam',
    'بالتوت':'With Berries',
    'بالفراولة':'With Strawberry',
    'بالمانجو':'With Mango',
    'بجوز الهند':'With Coconut',
    'ناعم':'Fine',
    'ناعمة':'Shredded',
    'مقرمش':'Crispy',
    'مقرمشة':'Crispy',
    'طري':'Soft',
    'طرية':'Soft',
    'لينة':'Soft',
    'ساخن':'Hot',
    'ساخنة':'Hot',
    'مثلج':'Frozen',
    'مثلجة':'Frozen',
    'مجمد':'Frozen',
    'مصغر':'Mini',
    'مصغرة':'Mini',
    'ميني':'Mini',
    'جامبو':'Jumbo',
    'دبل':'Double',
    'ملون':'Colored',
    'ملونة':'Colored',
    'أبيض':'White',
    'بيضاء':'White',
    'أسود':'Black',
    'أحمر':'Red',
    'أخضر':'Green',
    'أصفر':'Yellow',
    'بني':'Brown',
    'وردي':'Pink',
    'بنفسجي':'Purple',
    'أزرق':'Blue',
    'بدون سكر':'Sugar Free',
    'خالي من السكر':'Sugar Free',
    'دايت':'Diet',
    'لايت':'Light',
    'بدون جلوتين':'Gluten Free',
    'نباتي':'Vegan',
    'فيجان':'Vegan',
    'جلاسيه':'Glaze',
    'تزيين':'Decoration',
    'ديكور':'Decoration',
    'ديكورات':'Decorations',
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
}catch(e){console.error('[PastryMY] 084-invoices-english-names.js failed',e)}
