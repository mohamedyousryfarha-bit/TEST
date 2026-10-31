/* ==================================================================
   PastryMY Pro · طبقة تحسين الواجهة
   - أيقونات SVG متحركة تعبّر عن وظيفة كل زر / قسم
   - نظام تنبيهات احترافي (Toast + نافذة حوار + شريط حالة)
   - لا يتم تعديل أي دالة حسابية أو منطق عمل؛ كل ما يلي التفاف عرضي فقط
   ================================================================== */
(function(){
'use strict';
if(window.__PMUI__)return;

var $=function(id){return document.getElementById(id)};
var escT=(typeof window.esc==='function')?window.esc:function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};

/* ============================ 1) مكتبة الأيقونات ============================ */
function svg(i){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+i+'</svg>'}
var ICONS={
/* أقسام */
cup:svg('<path d="M5 8.2h12.5l-1.1 11a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8z"/><path d="M8.2 8.2 7.2 5.4h7.2l-1.2 2.8"/><path d="M15.2 5.4l3.1-2.1"/><circle class="a-pulse" cx="9.1" cy="12.1" r=".8"/><circle class="a-pulse" style="animation-delay:.2s" cx="12.2" cy="14.1" r=".8"/><path d="M7.4 16.8h7.8"/>'),
drinkProduction:svg('<path d="M4.5 8h11.8l-1 10.2a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8z"/><path d="M16.3 10h1.2a2.6 2.6 0 0 1 0 5.2h-2"/><path d="M7.4 4.2c1.2.8 1.2 1.8 0 2.6M11.2 3.6c1.2.8 1.2 1.8 0 2.6"/><path class="a-pulse" d="M8 12.2h4.8"/>'),
home:svg('<path d="M3 10.6 12 3.2l9 7.4"/><path d="M5.6 9.6V19a2 2 0 0 0 2 2h2.6v-5.4h3.6V21h2.6a2 2 0 0 0 2-2V9.6"/><rect class="a-blink" x="10.5" y="14" width="3" height="3.4" rx=".7"/>'),
clipboard:svg('<rect x="5.4" y="4.4" width="13.2" height="16.2" rx="2.2"/><path d="M9.2 4.4V3.1h5.6v1.3"/><path class="a-draw" style="--len:26" d="M8.8 12.2l2.3 2.3 4.1-4.4"/>'),
hat:svg('<path d="M5.6 13.4h12.8v3.2a3.4 3.4 0 0 1-3.4 3.4H9a3.4 3.4 0 0 1-3.4-3.4z"/><path class="a-float" d="M7.2 13.2a3 3 0 1 1 .8-5.9 3.6 3.6 0 0 1 6.6-1.3 3 3 0 0 1 3.6 3.9 2.8 2.8 0 0 1-.4 3.3"/><path d="M8.6 17.2h6.8"/>'),
boxes:svg('<path class="a-float" d="M12 3.2 20.4 7.4 12 11.6 3.6 7.4z"/><path d="M3.6 7.4v8.2L12 19.8l8.4-4.2V7.4"/><path d="M12 11.6v8.2"/>'),
tag:svg('<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2.4 12.4V2.6h9.8l8.4 8.4a2 2 0 0 1 0 2.8z"/><circle class="a-pulse" cx="7.2" cy="7.2" r="1.6"/>'),
calc:svg('<rect x="4.6" y="2.8" width="14.8" height="18.4" rx="2.4"/><rect x="7.6" y="5.6" width="8.8" height="4" rx="1.2"/><path class="a-blink" d="M9.2 14h.01"/><path class="a-blink" style="animation-delay:.15s" d="M12.6 14h.01"/><path class="a-blink" style="animation-delay:.3s" d="M16 14h.01"/><path class="a-blink" style="animation-delay:.45s" d="M9.2 17.6h.01"/><path class="a-blink" style="animation-delay:.6s" d="M12.6 17.6h.01"/><path class="a-blink" style="animation-delay:.75s" d="M16 17.6h.01"/>'),
cart:svg('<circle class="a-spin-fast" cx="9.6" cy="19.6" r="1.7"/><circle class="a-spin-fast" style="animation-delay:.12s" cx="17.6" cy="19.6" r="1.7"/><path d="M2.6 3.6H5l2.6 11.2h9.6l2.2-8.4H6.4"/>'),
wallet:svg('<path d="M3.4 7.6a2.4 2.4 0 0 1 2.4-2.4h11.4a2.4 2.4 0 0 1 2.4 2.4v9.2a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4z"/><path d="M3.4 9.6h17.2"/><circle class="a-pulse" cx="16.6" cy="14.4" r="1.5"/>'),
clock:svg('<circle cx="12" cy="12" r="8.8"/><path class="a-hand" d="M12 6.6V12l3.6 2.2"/>'),
archive:svg('<rect x="3" y="3.6" width="18" height="5" rx="1.6"/><path d="M4.6 8.6V19a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2V8.6"/><path class="a-bounce-y" d="M9.4 13.2h5.2"/>'),
shield:svg('<path d="M12 2.8 20 5.8v6.2c0 4.6-3.2 8-8 9.2-4.8-1.2-8-4.6-8-9.2V5.8z"/><path class="a-draw" style="--len:24" d="M8.8 12.2l2.3 2.3 4.1-4.4"/>'),
database:svg('<ellipse cx="12" cy="5.8" rx="7.2" ry="3"/><path d="M4.8 5.8v6.2c0 1.7 3.2 3 7.2 3s7.2-1.3 7.2-3V5.8"/><path class="a-float" d="M4.8 12v6.2c0 1.7 3.2 3 7.2 3s7.2-1.3 7.2-3V12"/>'),
/* إجراءات */
plus:svg('<path class="a-draw" style="--len:30" d="M12 5.4v13.2M5.4 12h13.2"/>'),
save:svg('<path d="M5 4.6A1.6 1.6 0 0 1 6.6 3h8.2L19 8.8V19a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 19z"/><path d="M8.4 3v5.4h7.2V3"/><rect class="a-blink" x="7.6" y="12.6" width="8.8" height="7.8" rx="1.2"/>'),
trash:svg('<path d="M3.8 6.6h16.4"/><path d="M9.4 6.6V3.8h5.2v2.8"/><path class="a-lid" d="M6 6.6l1.2 13.2a1.6 1.6 0 0 0 1.6 1.4h6.4a1.6 1.6 0 0 0 1.6-1.4L18 6.6"/><path d="M10.4 10.6v6.4M13.6 10.6v6.4"/>'),
download:svg('<path class="a-bounce-y" d="M12 3.6v11"/><path class="a-bounce-y" style="animation-delay:.12s" d="M7.6 10.4 12 14.8l4.4-4.4"/><path class="a-draw" style="--len:22" d="M4.4 19.6h15.2"/>'),
upload:svg('<path class="a-bounce-y" d="M12 15.4V4.4"/><path class="a-bounce-y" style="animation-delay:.12s" d="M7.6 8.8 12 4.4l4.4 4.4"/><path class="a-draw" style="--len:22" d="M4.4 19.6h15.2"/>'),
print:svg('<path d="M7 8.6V3.8h10v4.8"/><path d="M7 16.4H5.2a2 2 0 0 1-2-2v-3.2a2 2 0 0 1 2-2h13.6a2 2 0 0 1 2 2v3.2a2 2 0 0 1-2 2H17"/><path class="a-slide" d="M7 13.4h10v6.6H7z"/>'),
refresh:svg('<path class="a-rev" d="M20.4 12a8.4 8.4 0 1 1-2.5-6"/><path d="M20.4 4.4v4.4H16"/>'),
check:svg('<circle cx="12" cy="12" r="8.8"/><path class="a-draw" style="--len:26" d="M8 12.4l2.8 2.8 5.2-5.6"/>'),
close:svg('<circle cx="12" cy="12" r="8.8"/><path class="a-draw" style="--len:18" d="M9 9l6 6M15 9l-6 6"/>'),
error:svg('<circle cx="12" cy="12" r="8.8"/><path d="M12 7.4v5.4"/><circle class="a-pulse" cx="12" cy="16.4" r="1.15" fill="currentColor" stroke="none"/>'),
alertTri:svg('<path d="M12 3.6 21.4 20H2.6z"/><path d="M12 9.4v4.6"/><circle class="a-pulse" cx="12" cy="17" r="1.15" fill="currentColor" stroke="none"/>'),
info:svg('<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.4"/><circle cx="12" cy="7.9" r="1.15" fill="currentColor" stroke="none"/>'),
cloud:svg('<path class="a-float" d="M7.2 18.4h9.6a3.9 3.9 0 0 0 .6-7.7 5.7 5.7 0 0 0-11-1.4 4 4 0 0 0 .8 9.1z"/>'),
sync:svg('<path class="a-rev" d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M20 7.6V12h-4.4"/><path class="a-rev" style="animation-direction:reverse" d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M4 16.4V12h4.4"/>'),
spinner:svg('<path class="a-spin-fast" d="M12 3.6a8.4 8.4 0 1 0 8.4 8.4"/>'),
login:svg('<path d="M14.6 3.6h3.2a2 2 0 0 1 2 2v12.8a2 2 0 0 1-2 2h-3.2"/><path class="a-slide" d="M9.6 8.4 5.6 12l4 3.6"/><path d="M5.6 12h9"/>'),
logout:svg('<path d="M9.4 3.6H6.2a2 2 0 0 0-2 2v12.8a2 2 0 0 1 2 2h3.2"/><path class="a-slide" d="M14.4 8.4 18.4 12l-4 3.6"/><path d="M18.4 12H9.4"/>'),
unlock:svg('<rect x="4.4" y="10.4" width="15.2" height="10.4" rx="2.2"/><path class="a-lid" d="M7.8 10.4V7.6a4.2 4.2 0 0 1 8.2-1"/><circle class="a-pulse" cx="12" cy="15.6" r="1.5"/>'),
user:svg('<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20.4a7.4 7.4 0 0 1 14.8 0"/>'),
restore:svg('<path class="a-rev" d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M3.6 4.4v4.4H8"/><path class="a-draw" style="--len:22" d="M9 12.6l2.2 2.2 4-4.4"/>'),
search:svg('<circle cx="10.8" cy="10.8" r="6.8"/><path d="M15.8 15.8 20.6 20.6"/>'),
edit:svg('<path d="M4 20h4.2L19 9.2a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8z"/><path class="a-slide" d="M13.8 5.4 18.6 10.2"/>'),
back:svg('<path d="M20.4 12H6"/><path class="a-slide" d="M10.8 6.4 4.8 12l6 5.6"/>'),
bell:svg('<path class="a-lid" d="M6.4 16.4V10.6a5.6 5.6 0 1 1 11.2 0v5.8l1.6 2.6H4.8z"/><path d="M9.8 19.6a2.4 2.4 0 0 0 4.4 0"/>'),
gauge:svg('<path d="M3.6 17.4a8.6 8.6 0 1 1 16.8 0"/><path class="a-draw" style="--len:18" d="M12 17.4 16 11"/><circle class="a-pulse" cx="12" cy="17.4" r="1.5"/>'),
chart:svg('<path d="M3.6 20.4h16.8"/><rect class="a-float" x="5.8" y="12" width="3.4" height="5.6" rx=".9"/><rect class="a-float" style="animation-delay:.16s" x="10.8" y="7.4" width="3.4" height="10.2" rx=".9"/><rect class="a-float" style="animation-delay:.32s" x="15.8" y="9.6" width="3.4" height="8" rx=".9"/>'),
list:svg('<path d="M8.6 6.4h11M8.6 12h11M8.6 17.6h11"/><circle class="a-pulse" cx="4.6" cy="6.4" r="1.2" fill="currentColor" stroke="none"/><circle class="a-pulse" style="animation-delay:.2s" cx="4.6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle class="a-pulse" style="animation-delay:.4s" cx="4.6" cy="17.6" r="1.2" fill="currentColor" stroke="none"/>'),
bag:svg('<path d="M5.4 8h13.2l-1.2 11.2a1.8 1.8 0 0 1-1.8 1.6H8.4a1.8 1.8 0 0 1-1.8-1.6z"/><path d="M8.8 8V6.4a3.2 3.2 0 0 1 6.4 0V8"/><path class="a-draw" style="--len:18" d="M9.6 12.6l1.6 1.6 3.2-3.4"/>'),
receipt:svg('<path d="M5.4 3.6h13.2v16.8l-2.2-1.6-2.2 1.6-2.2-1.6-2.2 1.6-2.2-1.6-2.2 1.6z"/><path d="M8.8 8.4h6.4M8.8 12.4h6.4"/>'),
money:svg('<circle cx="12" cy="12" r="8.8"/><path class="a-float" d="M12 6.8v10.4"/><path d="M14.6 9.4c0-1.1-1.2-2-2.6-2s-2.6.9-2.6 2 .9 1.7 2.6 2.1 2.8.9 2.8 2.3-.9 2.1-2.8 2.1-2.8-.9-2.8-2.1"/>'),
folder:svg('<path d="M3.4 6.4a2 2 0 0 1 2-2h4l2 2.6h7.2a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"/>'),
excel:svg('<path d="M4.4 3.6h10.2l4.8 4.8v11.8a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2V4.8a1.2 1.2 0 0 1 1.2-1.2z"/><path d="M14.2 3.8v5h5"/><path class="a-draw" style="--len:16" d="M8.2 13.4l4 4.4M12.2 13.4l-4 4.4"/>'),
support:svg('<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19a5 5 0 0 1-5 3h-1"/>'),
customers:svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
expenses:svg('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16 15h2"/><path d="M7 6V5a2 2 0 0 1 2-2h8"/>'),
parties:svg('<path d="M3 21V11l9-7 9 7v10"/><path d="M9 21v-6h6v6"/>'),
partyInvoices:svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
partyTemplate:svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>'),
salesInvoices:svg('<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>'),
openInvoices:svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
invoice:svg('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
analytics:svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
drinkQueue:svg('<path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c0 1 1 1 1 2M11.5 3.5c0 1 1 1 1 2"/>'),
expand:svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
gear:svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
devices:svg('<rect x="3" y="4" width="13" height="10" rx="2"/><path d="M7 20h5M9.5 14v6"/><rect x="17" y="8" width="4" height="12" rx="1.5"/>'),
chat:svg('<path d="M4 5h16v11H8l-4 4z"/>'),
history:svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>'),
arrowUp:svg('<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>')
};
var ICON_COLORS={
  home:'#1E3A5F',cup:'#1E3A5F',drinkProduction:'#0F766E',clipboard:'#7C3AED',hat:'#DB2777',boxes:'#D97706',tag:'#1E3A5F',calc:'#1E3A5F',cart:'#EA580C',
  wallet:'#16A34A',list:'#E11D48',clock:'#1E3A5F',archive:'#9333EA',shield:'#059669',database:'#0D9488',
  plus:'#16A34A',save:'#1E3A5F',trash:'#DC2626',download:'#1E3A5F',upload:'#1E3A5F',print:'#1E3A5F',refresh:'#1E3A5F',
  check:'#16A34A',close:'#DC2626',error:'#DC2626',alertTri:'#D97706',info:'#1E3A5F',cloud:'#1E3A5F',sync:'#1E3A5F',
  spinner:'#1E3A5F',login:'#1E3A5F',logout:'#DC2626',unlock:'#16A34A',user:'#7C3AED',restore:'#D97706',search:'#1E3A5F',
  edit:'#D97706',back:'#4A6583',bell:'#F59E0B',gauge:'#0D9488',chart:'#1E3A5F',bag:'#DB2777',receipt:'#CA8A04',
  money:'#15803D',folder:'#CA8A04',excel:'#15803D'
};
function iconHTML(key,extra){
  var c=ICON_COLORS[key];
  return '<span class="ui-ico'+(extra?' '+extra:'')+'" aria-hidden="true"'+(c?' style="--ic:'+c+'"':'')+'>'+(ICONS[key]||'')+'</span>';
}

/* ============================ 2) تحديد الأيقونة المناسبة ============================ */
var TAB_ICONS={home:'home',drinkProduce:'drinkProduction',drinkQueue:'clock',order:'clipboard',recipes:'hat',stock:'boxes',prices:'tag',costing:'calc',purchases:'cart',sales:'wallet',menu:'list',cartpage:'bag',history:'history',monthly:'archive',audit:'shield',backup:'database',invoice:'invoice',analytics:'analytics',customers:'customers',expenses:'expenses',msgsPanel:'chat',openInvoices:'openInvoices',parties:'parties',partyInvoices:'partyInvoices',partyTemplate:'partyTemplate',salesInvoices:'salesInvoices'};
var BUTTON_ICONS={
  addOrder:'plus',clearOrder:'trash',calcOrder:'calc',showPurchases:'cart',deductOrder:'check',
  addStock:'plus',savePrice:'save',newRecipe:'plus',saveRecipe:'save',deleteRecipe:'trash',
  saveCostSettings:'save',calcRecipeCost:'calc',exportCostReport:'excel',refreshPurchases:'refresh',exportPurchases:'excel',
  addPurchase:'bag',exportPurchaseLog:'excel',addSale:'money',exportSales:'excel',addExpense:'receipt',exportExpenses:'excel',
  closeMonth:'archive',refreshAudit:'refresh',exportBackup:'excel',exportJsonBackup:'database',
  signInButton:'login',unlockButton:'unlock',backToLoginButton:'back',reloadCloudButton:'cloud',signOutButton:'logout'
};
var TEXT_RULES=[
  [/جارٍ|جارى|جاري|من الخادم/, 'spinner'],
  [/تصدير|تنزيل|نسخة Excel|نسخة استرداد/, 'download'],
  [/طباعة/, 'print'],
  [/استعادة|إعادة بيانات/, 'restore'],
  [/تحديث/, 'refresh'],
  [/حفظ/, 'save'],
  [/حذف|مسح/, 'trash'],
  [/تأكيد/, 'check'],
  [/حساب|تكلفة/, 'calc'],
  [/إضافة|إنشاء|\+\s/, 'plus'],
  [/تعديل/, 'edit'],
  [/بحث/, 'search'],
  [/النواقص|قائمة المشتريات/, 'cart'],
  [/العملاء/, 'customers'],
  [/الرئيسية/, 'home'],
  [/الفواتير المفتوحة/, 'openInvoices'],
  [/المصروفات/, 'receipt'],
  [/هيكل الفاتورة/, 'invoice'],
  [/خروج/, 'logout']
];
var HEAD_RULES=[
  [/إنتاج المشروبات|تجهيز المشروبات/, 'cup'],
  [/ملخص التشغيل|ملخص مالي/, 'gauge'],
  [/تنبيهات/, 'bell'],
  [/الأكثر احتياجًا/, 'alertTri'],
  [/تجهيز طلب/, 'clipboard'],
  [/قاعدة الوصفات/, 'hat'],
  [/أرصدة المخزون/, 'boxes'],
  [/إضافة رصيد|إنشاء خامة|صنف جديد/, 'plus'],
  [/أسعار/, 'tag'],
  [/تكلفة/, 'calc'],
  [/النواقص/, 'cart'],
  [/تسجيل شراء/, 'bag'],
  [/سجل المشتريات|سجل المبيعات|سجل المصروفات|حركة المخزون/, 'list'],
  [/المبيعات|مالي/, 'money'],
  [/المصروفات/, 'receipt'],
  [/تقفيل/, 'archive'],
  [/الأرشيف|أرشيف/, 'folder'],
  [/سجل التعديلات/, 'shield'],
  [/النسخ الاحتياطي/, 'database'],
  [/عن النسخة/, 'info']
];
function matchRules(text,rules){
  for(var i=0;i<rules.length;i++){ if(rules[i][0].test(text))return rules[i][1]; }
  return null;
}

/* ============================ 3) تزيين العناصر ============================ */
function childIcon(el){
  var kids=el.children||[];
  for(var i=0;i<kids.length;i++) if(kids[i].classList&&kids[i].classList.contains('ui-ico'))return kids[i];
  return null;
}
function decorateButton(el){
  if(!el||el.dataset.uiSkip)return;
  var label=(el.textContent||'').trim();
  if(!label)return;
  var key=/جارٍ|جارى|جاري|من الخادم/.test(label)?'spinner':(BUTTON_ICONS[el.id]||matchRules(label,TEXT_RULES));
  if(!key){ var old=childIcon(el); if(old)old.remove(); delete el.dataset.uiIcon; return; }
  var cur=childIcon(el);
  if(cur&&el.dataset.uiIcon===key)return;
  if(cur)cur.remove();
  el.dataset.uiIcon=key;
  el.insertAdjacentHTML('afterbegin',iconHTML(key,key==='refresh'?'refresh':''));
}
function decorateHead(el){
  if(el.dataset.uiIcon)return;
  var key=matchRules((el.textContent||'').trim(),HEAD_RULES);
  if(!key)return;
  el.dataset.uiIcon=key;
  el.insertAdjacentHTML('afterbegin',iconHTML(key));
}
var decorating=false;
function decorateAll(){
  decorating=true;
  try{
    var tabs=document.querySelectorAll('nav.tabs .tab');
    for(var i=0;i<tabs.length;i++){
      var t=tabs[i]; t.style.setProperty('--i',i);
      var tk=TAB_ICONS[t.dataset.tab];
      if(tk){var existing=childIcon(t);if(existing&&t.dataset.tab==='drinkProduce'){existing.outerHTML=iconHTML(tk);}else if(!existing){t.insertAdjacentHTML('afterbegin',iconHTML(tk));}}
    }
    var heads=document.querySelectorAll('.card > h2, .sectionhead h2');
    for(var h=0;h<heads.length;h++)decorateHead(heads[h]);
    var btns=document.querySelectorAll('main button, main label.secondary, .login-card button');
    for(var b=0;b<btns.length;b++){
      var el=btns[b];
      if(el.classList.contains('tab'))continue;
      decorateButton(el);
    }
  }catch(e){}
  decorating=false;
}

/* ============================ 4) نظام التنبيهات الاحترافي ============================ */
var notifySeq=0;
/* كل رسالة = نوع (بلونه وأيقونته الخاصة) + عنوان يصف العملية + نص واضح.
   القاعدة الذهبية: لا نقول «نجاح» إلا بعد التحقق من أن البيانات تغيّرت فعلًا. */

var KINDS={
  success :{n:'نجاح',         d:4200, icon:'check'},
  error   :{n:'خطأ',          d:8000, icon:'error'},
  warn    :{n:'تنبيه',        d:6500, icon:'alertTri'},
  info    :{n:'معلومة',       d:4500, icon:'info'},
  progress:{n:'جارٍ التنفيذ',  d:0,    icon:'sync'},
  undo    :{n:'قابل للتراجع',  d:11000,icon:'restore'},
  nochange:{n:'لم يحدث تغيير', d:5400, icon:'dash'}
};
ICONS.dash=svg('<circle cx="12" cy="12" r="8.8"/><path class="a-draw" style="--len:16" d="M8.4 12h7.2"/>');
ICONS.pause=svg('<circle cx="12" cy="12" r="8.8"/><path d="M10 9.4v5.2M14 9.4v5.2"/>');

function stackEl(){
  var s=$('toastStack');
  if(!s){ s=document.createElement('div'); s.id='toastStack'; s.className='toast-stack'; s.setAttribute('role','status'); s.setAttribute('aria-live','polite'); document.body.appendChild(s); }
  return s;
}
function pillEl(){
  var p=$('syncPill');
  if(!p){ p=document.createElement('div'); p.id='syncPill'; p.className='sync-pill'; document.body.appendChild(p); }
  return p;
}
var pillTimer=null;
function showPill(msg,state){
  var p=pillEl();
  p.className='sync-pill show '+(state||'');
  p.innerHTML=iconHTML(state==='ok'?'check':state==='err'?'alertTri':'sync',state==='ok'?'':'spin')+'<span>'+escT(msg)+'</span>';
  clearTimeout(pillTimer);
  pillTimer=setTimeout(function(){p.classList.remove('show')},state?'4500':'2800');
}
function dismiss(t){
  if(!t||t.classList.contains('out'))return;
  clearTimeout(t._t);
  t.classList.add('out');
  setTimeout(function(){ if(t.parentNode)t.parentNode.removeChild(t) },280);
}

/* ---------- Toast: يقبل كائنًا {t:عنوان,x:نص,k:نوع,d:مدة} أو (نص,نوع,مدة,عنوان) ---------- */
function toast(o,kind,duration,title){
  if(o==null)return null;
  if(typeof o==='string')o={x:o,k:kind,d:duration,t:title};
  var k=(o.k&&KINDS[o.k])?o.k:'info', K=KINDS[k];
  var text=String(o.x==null?'':o.x);
  var ttl=String(o.t==null?'':o.t).trim()||K.n;
  var stack=stackEl(), now=Date.now(), key=k+'|'+ttl+'|'+text;
  for(var i=0;i<stack.children.length;i++){
    var ex=stack.children[i];
    if(ex._key===key&&now-ex._born<7000&&!ex.classList.contains('out')){
      ex._count=(ex._count||1)+1; ex._born=now;
      ex._badge.textContent='×'+ex._count; ex._badge.style.display='';
      restart(ex,o.d);
      return ex;
    }
  }
  var live=[].slice.call(stack.children).filter(function(c){ return !c.classList.contains('out') });
  while(live.length>=4)dismiss(live.shift());
  var el=document.createElement('div');
  el.className='toast '+k;
  el._key=key; el._born=now; el._count=1;
  el.innerHTML='<span class="toast-edge"></span>'+
    '<div class="toast-ico"><span class="ui-ring"></span>'+iconHTML(K.icon,k==='progress'?'spin':'ui-live')+'</div>'+
    '<div class="toast-body">'+
      '<div class="toast-head"><span class="toast-kind">'+escT(K.n)+'</span>'+
      '<span class="toast-title">'+escT(ttl)+'</span>'+
      '<span class="toast-count" style="display:none"></span></div>'+
      '<div class="toast-text">'+escT(text)+'</div>'+
    '</div>'+
    '<button class="toast-x" type="button" aria-label="إغلاق التنبيه">×</button>'+
    '<span class="toast-progress"></span>';
  stack.appendChild(el);
  el._badge=el.querySelector('.toast-count');
  el.querySelector('.toast-x').onclick=function(){dismiss(el)};
  restart(el,o.d);
  return el;
}
function restart(el,duration){
  var k='info';
  for(var n in KINDS){ if(el.classList.contains(n)){k=n;break} }
  el._sticky=(duration===0);
  var d=(typeof duration==='number'&&duration>0)?duration:KINDS[k].d;
  clearTimeout(el._t);
  var bar=el.querySelector('.toast-progress');
  if(bar){ bar.style.animation='none'; void bar.offsetWidth; if(d>0)bar.style.animation='toastBar '+d+'ms linear forwards'; else bar.style.animation=''; }
  if(d>0)el._t=setTimeout(function(){dismiss(el)},d+120);
}
document.addEventListener('pointerdown',function(e){
  var s=$('toastStack'); if(!s)return;
  if(e.target&&e.target.closest&&e.target.closest('.toast'))return;
  for(var i=s.children.length-1;i>=0;i--){
    var t=s.children[i];
    if(t._sticky)continue;
    dismiss(t);
  }
},true);
function buzz(kind){ try{ if(navigator.vibrate)navigator.vibrate(kind==='error'?[26,45,26]:12) }catch(e){} }

/* ---------- تصنيف ذكي: الافتراضي «معلومة» وليس «نجاح» ---------- */
var RX={
  error:/تعذر|تعذّر|فشل|فشلت|خطأ|أخطاء|لا يمكن|لم يتم|لم تُحمّل|لم يكتمل|لا تستخدم|لا يقل|لا تقل|لا يكفي|لا يكفى|غير صالح|غير صحيح|غير متوافق|غير متوافقة|غير موجود|غير قابلة|لا يحتوي|مرفوض|تم رفض|انقطع|غير متصل|يلزم الاتصال|فقدت|فُقدت/,
  warn :/أدخل|اكتب|اختر|أضف|تأكد|راجع|تنبيه|احذر|انتبه|لا توجد|لا يوجد|موجود بالفعل|مكرر|سالبة|سالب|أكبر من صفر|أولًا|أولا|من فضلك|برجاء|منع المتصفح|المتصفح منع|ناقص|لم تضف|لم تختر|يلزم|يجب/,
  progress:/جارٍ|جارى|جاري|جاريًا|يتم الآن|انتظر|جار التحميل|تحميل\.\.\.|مزامنة/
};
function classify(t){
  if(RX.error.test(t))return 'error';
  if(RX.progress.test(t))return 'progress';
  if(RX.warn.test(t))return 'warn';
  if(/^(تم|تمت|أُضيف|أضيف|حُذف|حذف|أُنشئ|أنشئ)\b/.test(t))return 'success';
  return 'info';
}

/* ---------- فهرس الرسائل المعروفة: عنوان + نوع دقيق لكل عملية ---------- */
var CATALOG=[
  [/^تم حذف الخامة من أرصدة المخزون فقط/,'success','حذف خامة من المخزون'],
  [/^أدخل رصيدًا صحيحًا/,'warn','رصيد غير صالح'],
  [/^أضف أصنافًا للطلب أولًا/,'warn','الطلب فارغ'],
  [/^يلزم الاتصال بالسحابة/,'error','السحابة غير متصلة'],
  [/^تغيّرت البيانات على جهاز آخر/,'error','تعارض في البيانات'],
  [/^المخزون على الخادم لا يكفي/,'error','المخزون لا يكفي الطلب'],
  [/^لم يتم تأكيد الإنتاج/,'error','الإنتاج لم يُؤكّد'],
  [/^تحقق من الاتصال ثم راجع حالة المخزون/,'error','فشل الاتصال بالخادم'],
  [/^راجع القيم: الناتج أكبر من صفر/,'warn','إعدادات تكلفة غير صالحة'],
  [/^تم حفظ إعدادات تكلفة/,'success','حفظ إعدادات التكلفة'],
  [/^اختر صنفًا وأدخل كمية موجبة وسعر بيع/,'warn','بيانات بيع ناقصة'],
  [/^تم حفظ عملية البيع/,'success','تسجيل عملية بيع'],
  [/^أدخل قيمة مصروف أكبر من صفر/,'warn','قيمة مصروف غير صالحة'],
  [/^تم تسجيل المصروف التشغيلي/,'success','تسجيل مصروف'],
  [/^اكتب اسم الصنف/,'warn','اسم الصنف مطلوب'],
  [/^أضف مكونًا واحدًا على الأقل/,'warn','الوصفة بلا مكونات'],
  [/^تم حفظ الوصفة/,'success','حفظ الوصفة'],
  [/^الصنف موجود بالفعل/,'warn','صنف مكرر'],
  [/^أدخل قيمًا رقمية صحيحة للسعر/,'warn','قيم سعر غير صالحة'],
  [/^القيم لا يمكن أن تكون سالبة/,'warn','قيم سالبة مرفوضة'],
  [/^تم حفظ بيانات السعر والتنبيه/,'success','حفظ السعر وحد التنبيه'],
  [/^اختر خامة وأدخل كمية وسعر شراء/,'warn','بيانات شراء ناقصة'],
  [/^الخامة غير موجودة في المخزون/,'error','خامة غير موجودة'],
  [/وحدة الشراء .* غير متوافقة/,'error','وحدات غير متوافقة'],
  [/^تم تسجيل الشراء وإضافة الكمية/,'success','تسجيل شراء خامة'],
  [/^تم حذف أرشيف التقفيل/,'success','حذف أرشيف شهر'],
  [/^المتصفح منع نافذة الأرشيف/,'warn','نافذة الأرشيف محجوبة'],
  [/^لا توجد حركات أو وصفات/,'warn','لا يوجد ما يُقفل'],
  [/^تم تقفيل الشهر/,'success','تقفيل الشهر'],
  [/^مكتبة Excel لم تُحمّل/,'error','مكتبة Excel غير متاحة'],
  [/^اختر صنفًا واكتب عدد وزنات/,'warn','بيانات الطلب ناقصة'],
  [/^اختر خامة وأدخل كمية أكبر من صفر/,'warn','بيانات الإضافة ناقصة'],
  [/^الخامة غير موجودة\./,'error','خامة غير موجودة'],
  [/وحدة الإضافة .* غير متوافقة/,'error','وحدات غير متوافقة'],
  [/^تم تسجيل الإضافة/,'success','إضافة رصيد للمخزون'],
  [/^اكتب اسم الخامة/,'warn','اسم الخامة مطلوب'],
  [/^الخامة موجودة بالفعل في المخزون/,'warn','خامة مكررة'],
  [/^لا تستخدم قيمًا سالبة/,'warn','قيم سالبة مرفوضة'],
  [/^تم إنشاء الخامة/,'success','إنشاء خامة جديدة'],
  [/^تمت استعادة نسخة JSON/,'success','استيراد نسخة JSON'],
  [/^ملف JSON لا يحتوي على بيانات/,'error','ملف JSON غير صالح'],
  [/^تعذر قراءة ملف JSON/,'error','تعذر قراءة الملف'],
  [/^تمت استعادة ملف Excel/,'success','استيراد نسخة Excel'],
  [/^ملف Excel غير صالح/,'error','ملف Excel غير صالح'],
  [/^تمت إعادة البيانات الأصلية/,'success','إرجاع البيانات الأصلية'],
  [/^لا توجد نسخة سحابية بعد/,'warn','لا توجد نسخة سحابية'],
  [/^تم فتح التطبيق/,'success','جاهز للعمل'],
  [/^تم تحديث سجل التعديلات/,'info','تحديث سجل التعديلات'],
  [/^وضع المعاينة/,'warn','وضع المعاينة المحلية'],
  [/^تم تجهيز التقرير للطباعة/,'success','تجهيز الطباعة'],
  [/^تم تنزيل نسخة استرداد/,'success','نسخة استرداد'],
  [/^تم إصلاح/,'success','إصلاح البيانات'],
  [/^تم التراجع عن/,'undo','تم التراجع'],
  [/^تعذّر عرض/,'warn','تعذّر عرض جزء من الشاشة'],
  [/^تعذّر الحفظ التلقائي/,'error','تعذّر الحفظ التلقائي'],
  [/^مساحة التخزين على الجهاز ممتلئة/,'warn','التخزين ممتلئ'],
  [/^تم تشغيل الوضع/,'success','تبديل المظهر']
];
function lookup(text){
  for(var i=0;i<CATALOG.length;i++){ if(CATALOG[i][0].test(text))return {k:CATALOG[i][1],t:CATALOG[i][2]} }
  return null;
}
var TITLE_HINT=[
  [/حفظ|سجّل|سجل/,'حفظ البيانات'],
  [/حذف|أزال|مسح/,'حذف'],
  [/تصدير|تنزيل|نسخة Excel|نسخة استرداد/,'تصدير ملف'],
  [/استيراد|استعادة|استرداد/,'استيراد واستعادة'],
  [/تحديث|مزامنة|تحميل آخر/,'تحديث ومزامنة'],
  [/طباعة/,'طباعة'],
  [/حساب|تكلفة/,'حساب'],
  [/إضافة|إنشاء/,'إضافة جديدة'],
  [/تقفيل|أرشفة/,'تقفيل الفترة'],
  [/إصلاح|فحص/,'فحص وإصلاح'],
  [/تراجع/,'تراجع'],
  [/خروج/,'تسجيل الخروج'],
  [/دخول/,'تسجيل الدخول']
];
function guessTitle(t,kind){
  for(var i=0;i<TITLE_HINT.length;i++){ if(TITLE_HINT[i][0].test(t))return TITLE_HINT[i][1] }
  return KINDS[kind]?KINDS[kind].n:'تنبيه';
}

/* ---------- نافذة الحوار (للأخطاء والنصوص الطويلة) ---------- */
function openDialog(o){
  var box=$('messageBox'),ov=$('messageDialog');
  if(!box||!ov)return;
  var K=KINDS[o.k]||KINDS.info;
  box.className='msg-box '+o.k;
  var sym=$('messageSymbol');
  if(sym)sym.innerHTML='<span class="ui-halo"></span>'+iconHTML(K.icon,'ui-live');
  var badge=$('msgKindBadge');
  if(!badge){
    badge=document.createElement('span'); badge.id='msgKindBadge'; badge.className='msg-kind';
    var ti=$('messageTitle'); if(ti&&ti.parentNode)ti.parentNode.insertBefore(badge,ti);
  }
  badge.className='msg-kind '+o.k; badge.textContent=K.n;
  var tt=$('messageTitle'); if(tt)tt.textContent=String(o.t||K.n);
  var tx=$('messageText'); if(tx)tx.textContent=String(o.x||'');
  var ok=$('messageOk');
  if(ok)ok.textContent=(o.k==='error'||o.k==='warn')?'حسنًا، سأراجع ذلك':(o.k==='success'?'تمام':'إغلاق');
  ov.classList.add('show');
  box.style.animation='none'; void box.offsetWidth; box.style.animation='';
  if(ok)try{ok.focus()}catch(e){}
}

/* ---------- نقطة الدخول الموحّدة ---------- */
function showNotification(text,forced){
  var t=String(text==null?'':text).trim();
  if(!t)return;
  var meta=lookup(t)||{};
  var kind=meta.k||((forced&&KINDS[forced])?forced:null)||classify(t);
  var title=meta.t||guessTitle(t,kind);
  notifySeq++;
  if(kind==='error'||t.length>150||t.indexOf('\n')>=0)openDialog({k:kind,t:title,x:t});
  else toast({k:kind,t:title,x:t});
  buzz(kind);
}
window.alert=showNotification;
window.showMessage=showNotification;

/* ============================ 5) تغطية كل العمليات + تحقق النتيجة ============================ */
var confirmCount=0,confirmLast=null,promptCount=0,promptCancelled=false;
var _confirm=window.confirm,_prompt=window.prompt;
window.confirm=function(m){confirmCount++;var r=_confirm.call(window,m);confirmLast=r;return r};
window.prompt=function(m,d){promptCount++;var r=_prompt.call(window,m,d);promptCancelled=(r===null||r===undefined);return r};

/* ملاحظة مهمة: `state` مُعرّفة بـ let في السكربت الأصلي، لذا لا تظهر على window.
   القراءة المباشرة بالاسم هي الوحيدة الموثوقة؛ window.state تبقى كخطة بديلة. */
function curState(){
  try{ if(typeof state!=='undefined'&&state)return state }catch(e){}
  try{ return window.state||null }catch(e){}
  return null;
}
function snapOf(){
  try{ return JSON.stringify(curState()||null) }catch(e){ return '' }
}
function num(v){ var n=Number(v); return isFinite(n)?String(Number(n.toFixed(2))):String(v) }
function q(s){ return '«'+s+'»' }
/* يصف بدقة ما الذي تغيّر في البيانات — ليكون النص معبّرًا عن العملية */
function deltaText(a,b){
  try{
    var A=JSON.parse(a||'null'), B=JSON.parse(b||'null');
    if(!A||!B)return '';
    var parts=[];
    var ai={},bi={};
    (A.inventory||[]).forEach(function(x){ai[String(x.name)]=Number(x.qty)||0});
    (B.inventory||[]).forEach(function(x){bi[String(x.name)]=Number(x.qty)||0});
    var addI=[],chgI=[],delI=[];
    Object.keys(bi).forEach(function(k){ if(ai[k]===undefined)addI.push(k); else if(ai[k]!==bi[k])chgI.push({k:k,f:ai[k],t:bi[k]}) });
    Object.keys(ai).forEach(function(k){ if(bi[k]===undefined)delI.push(k) });
    if(addI.length)parts.push('أُضيفت للمخزون: '+addI.slice(0,2).map(q).join('، ')+(addI.length>2?' +'+(addI.length-2):''));
    if(chgI.length)parts.push('تغيّر رصيد '+(chgI.length>1?chgI.length+' خامات':q(chgI[0].k))+(chgI.length===1?(' من '+num(chgI[0].f)+' إلى '+num(chgI[0].t)):''));
    if(delI.length)parts.push('حُذفت من المخزون: '+delI.slice(0,2).map(q).join('، ')+(delI.length>2?' +'+(delI.length-2):''));
    [['orders','صنف في الطلب'],['salesLog','عملية بيع'],['expensesLog','مصروف'],
     ['purchasesLog','سجل شراء'],['history','حركة مخزون'],['monthlyArchives','أرشيف شهر']].forEach(function(L){
      var d=(B[L[0]]||[]).length-(A[L[0]]||[]).length;
      if(d>0)parts.push('+'+d+' '+L[1]); else if(d<0)parts.push('−'+(-d)+' '+L[1]);
    });
    var dR=Object.keys(B.recipes||{}).length-Object.keys(A.recipes||{}).length;
    if(dR>0)parts.push('+'+dR+' وصفة'); else if(dR<0)parts.push('−'+(-dR)+' وصفة');
    var dP=Object.keys(B.prices||{}).length-Object.keys(A.prices||{}).length;
    if(dP>0)parts.push('+'+dP+' سعر خامة'); else if(dP<0)parts.push('−'+(-dP)+' سعر خامة');
    return parts.slice(0,3).join(' · ');
  }catch(e){ return '' }
}
function report(kind,title,text,dur){
  var o={k:kind,t:title,x:text};
  if(dur)o.d=dur;
  if(kind==='error'||String(text).length>150)openDialog(o); else toast(o);
  buzz(kind);
  notifySeq++;
}
function finishOp(seq,cc,pc,spec,before){
  if(window.__PMSUPPRESS__){window.__PMSUPPRESS__--;return}      /* طبقة التراجع تتولى الرسالة */
  if(notifySeq!==seq)return;                                     /* العملية أبلغت المستخدم بنفسها */
  if(confirmCount>cc&&confirmLast===false){
    report('info','تم إلغاء العملية','لم يُجرَ أي تغيير لأنك اخترت «إلغاء» في رسالة التأكيد.'); return;
  }
  if(promptCount>pc&&promptCancelled){
    report('info','تم إلغاء العملية','لم يُجرَ أي تغيير لأنك ألغيت إدخال البيانات.'); return;
  }
  var after=snapOf();
  var changed=(before!==after);
  if(spec.check===0){
    report(spec.kind||'info',spec.title,spec.text);
    return;
  }
  if(changed){
    var extra=deltaText(before,after);
    report('success',spec.title,spec.text+(extra?(' — '+extra):''));
  }else{
    report('nochange',spec.title,(spec.none||'تم تنفيذ الأمر لكن لم يتغيّر شيء في البيانات. تحقق من القيم المدخلة ثم أعد المحاولة.'));
  }
}
function guard(fn,spec){
  return function(){
    var s=notifySeq,c=confirmCount,p=promptCount;
    var before=snapOf(), r=null, err=null;
    try{ r=fn.apply(this,arguments) }catch(e){ err=e; logSafe(e) }
    if(err){
      if(window.__PMSUPPRESS__){window.__PMSUPPRESS__--;return r}
      report('error',spec.title,'تعذّر إتمام العملية بسبب خطأ غير متوقع، ولم تُفقد بياناتك. يمكنك متابعة العمل أو استخدام «فحص وإصلاح».');
      return r;
    }
    var done=function(){ finishOp(s,c,p,spec,before) };
    if(r&&typeof r.then==='function')r.then(done,done); else done();
    return r;
  };
}
function logSafe(e){ try{ (window.__PM_LOGERR__||function(){})(String(e&&e.message||e)) }catch(_){} }
function wrapHandler(id,title,text,opt){
  var el=$(id);
  if(!el||typeof el.onclick!=='function')return;
  var spec={title:title,text:text,kind:(opt&&opt.kind)||'success',check:(opt&&opt.check!==undefined)?opt.check:1,none:opt&&opt.none};
  el.onclick=guard(el.onclick,spec);
}
function wrapFn(name,title,text,opt){
  if(typeof window[name]!=='function')return;
  var spec={title:title,text:text,kind:(opt&&opt.kind)||'success',check:(opt&&opt.check!==undefined)?opt.check:1,none:opt&&opt.none};
  window[name]=guard(window[name],spec);
}

/* عمليات لم تكن تُصدر أي رسالة — كل واحدة بعنوانها ونوعها الخاص */
[
 ['addOrder','إضافة صنف','أُضيف الصنف إلى الطلب الحالي.'],
 ['clearOrder','مسح الطلب','تم مسح كل أصناف الطلب.'],
 ['calcOrder','حساب مكونات الطلب','تم حساب مكونات الطلب وتحديد النواقص المطلوبة.',{check:0,kind:'info'}],
 ['showPurchases','قائمة نواقص المخزون','تم فتح قائمة الخامات غير الموجودة بالمخزون أو ذات الرصيد الصفري.',{check:0,kind:'info'}],
 ['newRecipe','إنشاء صنف جديد','تم إنشاء الصنف. أضف مكوناته ثم احفظ الوصفة.'],
 ['deleteRecipe','حذف صنف','تم حذف الصنف ووصفته من قاعدة الوصفات.'],
 ['calcRecipeCost','حساب تكلفة الوصفة','تم حساب تكلفة الوصفة وسعر البيع المقترح.',{check:0,kind:'info'}],
 ['exportCostReport','تصدير تقرير التكلفة','تم تنزيل تقرير تكلفة الوصفات بصيغة Excel.',{check:0,kind:'success'}],
 ['refreshPurchases','تحديث نواقص المخزون','تم تحديث قائمة الخامات غير الموجودة بالمخزون أو ذات الرصيد الصفري.',{check:0,kind:'info'}],
 ['exportPurchases','تصدير النواقص','تم تنزيل قائمة النواقص بصيغة Excel.',{check:0,kind:'success'}],
 ['exportPurchaseLog','تصدير سجل المشتريات','تم تنزيل سجل المشتريات بصيغة Excel.',{check:0,kind:'success'}],
 ['exportSales','تصدير سجل المبيعات','تم تنزيل سجل المبيعات بصيغة Excel.',{check:0,kind:'success'}],
 ['exportExpenses','تصدير سجل المصروفات','تم تنزيل سجل المصروفات بصيغة Excel.',{check:0,kind:'success'}],
 ['exportBackup','تصدير نسخة Excel','تم تنزيل نسخة Excel الاحتياطية الكاملة.',{check:0,kind:'success'}],
 ['exportJsonBackup','تصدير نسخة JSON','تم تنزيل نسخة الاسترداد JSON الكاملة.',{check:0,kind:'success'}],
 ['reloadCloudButton','آخر نسخة سحابية','تم تحميل آخر نسخة محفوظة على السحابة.',{check:0}],
 ['signOutButton','تسجيل الخروج','تم تسجيل الخروج. لن تُحفظ تعديلات جديدة قبل تسجيل الدخول مرة أخرى.',{check:0,kind:'info'}]
].forEach(function(r){ wrapHandler(r[0],r[1],r[2],r[3]) });

[
 ['removeOrder','حذف صنف من الطلب','تم حذف الصنف من الطلب الحالي.'],
 ['deleteSale','حذف عملية بيع','تم حذف عملية البيع من السجل.'],
 ['deleteExpense','حذف مصروف','تم حذف المصروف من السجل.'],
 ['deletePurchase','حذف سجل شراء','تم حذف سجل الشراء. رصيد المخزون لم يتغير.',{kind:'warn'}],
 ['adjustStock','تعديل رصيد خامة','تم تحديث رصيد الخامة وتسجيل الحركة في السجل.'],
 ['viewArchive','فتح أرشيف الفترة','تم فتح تفاصيل أرشيف الفترة في نافذة جديدة.',{check:0,kind:'info'}],
 ['exportExcelTable','تصدير الجدول','تم تنزيل الجدول بصيغة Excel.',{check:0,kind:'success'}]
].forEach(function(r){ wrapFn(r[0],r[1],r[2],r[3]) });

/* تأكيد الإنتاج: إشعار تقدّم بنفسجي ثم نتيجة محقّقة فعليًا من أرصدة المخزون */
(function(){
  var el=$('deductOrder');
  if(!el||typeof el.onclick!=='function')return;
  var base=el.onclick;
  function invOf(snap){
    try{
      var d=JSON.parse(snap||'null');
      if(!d||!Array.isArray(d.inventory))return null;
      var m={};
      d.inventory.forEach(function(x){ m[String(x.name)]=Number(x.qty)||0 });
      return m;
    }catch(e){ return null }
  }
  el.onclick=function(){
    var s=notifySeq,c=confirmCount,p=promptCount;
    var before=snapOf();
    var prog=toast({k:'progress',t:'تأكيد الإنتاج',x:'جارٍ التحقق من الوصفات والمخزون على الخادم ثم خصم الخامات…',d:0});
    var r=base.apply(this,arguments);
    var done=function(){
      dismiss(prog);
      if(window.__PMSUPPRESS__){ window.__PMSUPPRESS__--; return }
      if(notifySeq!==s)return;                       /* العملية أبلغت المستخدم بنفسها (خطأ/نقص مخزون/…) */
      if(confirmCount>c&&confirmLast===false){
        report('info','تم إلغاء العملية','لم يُخصم أي شيء من المخزون لأنك اخترت «إلغاء» في رسالة التأكيد.');
        return;
      }
      var after=snapOf();
      var A=invOf(before),B=invOf(after);
      if(!A||!B){ finishOp(s,c,p,{title:'تأكيد الإنتاج',text:'تم تأكيد الإنتاج وخصم الخامات من المخزون.',check:1},before); return }
      var dropped=[];
      Object.keys(A).forEach(function(k){
        var now=(B[k]===undefined?0:B[k]);
        var d=A[k]-now;
        if(d>0.0001)dropped.push({k:k,d:d});
      });
      if(dropped.length){
        var list=dropped.slice(0,3).map(function(x){ return q(x.k)+' −'+num(x.d) }).join('، ');
        var more=dropped.length>3?(' +'+(dropped.length-3)+' خامة'):'';
        report('success','تأكيد الإنتاج','تم تأكيد الإنتاج وخصم '+dropped.length+' خامة من المخزون: '+list+more+'.');
      }else if(before!==after){
        var ex=deltaText(before,after);
        report('success','تأكيد الإنتاج','تم تأكيد الإنتاج على الخادم وتحديث البيانات'+(ex?(' — '+ex):'')+'.');
      }else{
        report('warn','تأكيد الإنتاج','تم إرسال الطلب للخادم لكن أرصدة المخزون لم تتغيّر. حمّل آخر نسخة سحابية وراجع الاتصال ثم أعد التأكيد.');
      }
    };
    if(r&&typeof r.then==='function')r.then(done,done); else done();
    return r;
  };
})();

/* الطباعة + التنزيلات التلقائية */
var _print=window.print;
window.print=function(){ showNotification('تم تجهيز التقرير للطباعة؛ اختر الطابعة ثم أكّد.','success'); return _print.apply(window,arguments) };
var _download=window.download;
if(typeof _download==='function'){
  window.download=function(name,content,type){
    var r=_download.apply(this,arguments);
    if(String(name||'').indexOf('recovery')>=0)toast({k:'success',t:'نسخة استرداد تلقائية',x:'تم تنزيل نسخة استرداد JSON من بياناتك الحالية قبل استبدالها.'});
    return r;
  };
}

/* رسائل الحالة والمزامنة */
var statusCache={};
var SILENT=/^(التعديلات محفوظة محليًا|في انتظار|جارٍ|تم حفظ نسخة مؤقتة|الحفظ التلقائي|المطبخ لا يحفظ)/;
var _lsm=window.localSaveMessage;
if(typeof _lsm==='function'){
  window.localSaveMessage=function(msg,err){
    try{_lsm(msg,err)}catch(e){}
    var m=String(msg==null?'':msg);
    var state=err?'err':(/✓|تمت المزامنة|تم تأكيد|تم تحميل/.test(m)?'ok':'');
    showPill(m,state);
    if(err&&!SILENT.test(m)){
      var now=Date.now();
      if(now-(statusCache[m]||0)>20000){ statusCache[m]=now; toast({k:'error',t:'مشكلة في الحفظ',x:m}); }
    }
  };
}
/* رسائل شاشة الدخول */
var _slm=window.setLoginMessage;
if(typeof _slm==='function'){
  window.setLoginMessage=function(msg,type){
    try{_slm(msg,type)}catch(e){}
    if(type==='error')toast({k:'error',t:'تسجيل الدخول',x:String(msg||'')});
    else if(type==='ok')toast({k:'success',t:'تسجيل الدخول',x:String(msg||'')});
  };
}

/* ============================ 6) لمسات أخيرة ============================ */
/* نبضة على أرقام الملخص عند تغيّرها */
['statRecipes','statIngredients','statZero','statLow'].forEach(function(id){
  var el=$(id); if(!el)return;
  var last=el.textContent;
  new MutationObserver(function(){
    if(el.textContent!==last){
      last=el.textContent;
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }
  }).observe(el,{childList:true,characterData:true,subtree:true});
});
/* ترحيب بعد فتح التطبيق */
var welcomed=false;
new MutationObserver(function(){
  if(welcomed)return;
  if(!document.body.classList.contains('auth-required')){
    welcomed=true;
    var who=(typeof cloudActorName!=='undefined'&&cloudActorName)?(' · '+cloudActorName):'';
    toast({k:'success',t:'جاهز للعمل',x:'تم فتح التطبيق وجاهز للعمل'+who+'.'});
  }
}).observe(document.body,{attributes:true,attributeFilter:['class']});
/* سجل التعديلات */
(function(){
  var btn=$('refreshAudit'),box=$('auditTable');
  if(!btn||!box)return;
  var pending=false;
  btn.addEventListener('click',function(){pending=true});
  new MutationObserver(function(){
    if(!pending)return;
    if(String(box.textContent||'').indexOf('جارٍ')>=0)return;
    pending=false; toast({k:'info',t:'تحديث سجل التعديلات',x:'تم تحديث سجل التعديلات من الخادم.'});
  }).observe(box,{childList:true,subtree:true});
})();

/* زر معاينة الواجهة عندما لا يكون Supabase مُعدًّا */
try{
  if(typeof isConfigured==='function'&&!isConfigured()){
    var card=document.querySelector('.login-card');
    if(card&&!$('demoPreviewButton')){
      var b=document.createElement('button');
      b.type='button'; b.id='demoPreviewButton'; b.className='primary login-button';
      b.innerHTML=iconHTML('login')+'معاينة الواجهة بدون سحابة';
      b.onclick=function(){
        document.body.classList.remove('auth-required');
        $('loginScreen').classList.add('hide');
        try{ renderAll(); go('home'); }catch(e){}
        toast({k:'warn',t:'وضع المعاينة المحلية',x:'البيانات محلية على هذا الجهاز فقط ولن تُرفع للسحابة.'});
      };
      card.appendChild(b);
    }
  }
}catch(e){}

/* واجهة برمجية لطبقات التحسين الأعلى (التراجع، الفحص، لوحة الأوامر) */
window.__PMUI__={ICONS:ICONS,TAB_ICONS:TAB_ICONS,svg:svg,toast:toast,dismiss:dismiss,openDialog:openDialog,iconHTML:iconHTML,showPill:showPill,notify:showNotification,buzz:buzz,delta:deltaText,report:report,seq:function(){return notifySeq},restart:restart};

/* تزيين مستمر لأي عناصر تُولّد dynamically */
decorateAll();
var moTimer=null;
new MutationObserver(function(){
  if(decorating)return;
  clearTimeout(moTimer);
  moTimer=setTimeout(decorateAll,150);
}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',function(){setTimeout(decorateAll,120)});
})();
