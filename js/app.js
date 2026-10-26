// الشغل الفعلي: تسجيل دخول محلي، تنقل بين الأقسام، والأحداث، والحفظ على الجهاز.
import { seedState } from './seed.js';
import * as V from './views.js';
import { startBatch, recordSale, addBooking, payBooking, bookingRemaining, uid, ROLE_SECTIONS } from './logic.js';

const KEY = 'mise_app_v1';
const SECTIONS = [
  ['home', 'الرئيسية', '◉', V.home], ['recipes', 'الوصفات', '▦', V.recipes], ['production', 'الإنتاج', '⚗', V.production],
  ['stock', 'المخزون', '⬡', V.stock], ['sales', 'المبيعات', '🧾', V.sales], ['customers', 'العملاء', '◎', V.customers],
  ['pricing', 'التسعير', '％', V.pricing], ['reports', 'التقارير', '▤', V.reports], ['team', 'الفريق', '✦', V.team], ['settings', 'الإعدادات', '⚙', V.settings]
];

let st = load();
const ctx = { user: null, role: null, tab: 'home', openRecipe: null, query: '', prodRecipe: null, prodBatches: 1 };
const app = document.getElementById('app');

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (_) {}
  return seedState();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) { toast('الحفظ على الجهاز فشل'); } }
function toast(t) { const el = document.getElementById('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2400); }
function logLine(text) { st.log = [{ at: new Date().toISOString(), text }, ...st.log].slice(0, 200); }

/* ---------- تسجيل الدخول (محلي للتجربة) ---------- */
function login() {
  app.innerHTML = `<section class="login"><div class="card">
    <div class="brand" style="justify-content:center;margin-bottom:14px"><div class="mark">M</div><div><b>Mise</b><small>تسجيل الدخول</small></div></div>
    <label class="f">الموظف</label><select class="inp" id="emp">${st.employees.map(e => `<option>${e.name}</option>`).join('')}</select>
    <label class="f">PIN الشخصي</label><input class="inp" id="pin" type="password" inputmode="numeric" maxlength="5" placeholder="••••">
    <button class="btn" id="go">دخول</button><div class="msg" id="lmsg"></div>
    <p class="muted">تجربة محلية: الـ PIN متخزن على الجهاز، ومش بديل عن التحقق على السيرفر.</p></div></section>`;
  document.getElementById('go').onclick = () => {
    const name = document.getElementById('emp').value;
    const pin = document.getElementById('pin').value;
    const e = st.employees.find(x => x.name === name);
    if (!e || String(e.pin) !== pin) { document.getElementById('lmsg').textContent = 'PIN غير صحيح'; return; }
    ctx.user = e.name; ctx.role = e.role; ctx.tab = 'home';
    render();
  };
}

/* ---------- الهيكل ---------- */
function shell() {
  const allowed = ROLE_SECTIONS[ctx.role] || ['home'];
  const secs = SECTIONS.filter(s => allowed.includes(s[0]));
  if (!allowed.includes(ctx.tab)) ctx.tab = 'home';
  const cur = SECTIONS.find(s => s[0] === ctx.tab);
  app.innerHTML = `
    <div class="wrap">
      <header><div class="brand"><div class="mark">M</div><div><b>Mise</b><small>${ctx.user} · ${V.roleName(ctx.role)}</small></div></div>
        <button class="ib" data-act="logout">خروج</button></header>
      <nav class="tabs">${secs.map(s => `<button class="tab ${s[0] === ctx.tab ? 'on' : ''}" data-act="tab" data-t="${s[0]}">${s[1]}</button>`).join('')}</nav>
      <main id="view" class="screen">${cur[3](st, ctx)}</main>
    </div><div class="toast" id="toast"></div>`;
}

function render() {
  if (!ctx.user) return login();
  shell();
}

/* ---------- الأحداث ---------- */
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) handle(el.dataset.act, el);
  const stageH = e.target.closest('.stage-h');
  if (stageH) stageH.parentElement.classList.toggle('closed');
});
app.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.act === 'prod-recipe') { ctx.prodRecipe = el.value; render(); }
  if (el.dataset.act === 'import') importFile(el.files[0]);
  if (el.dataset.act === 'set-price') { setPrice(el.dataset.name, el.value); }
});
app.addEventListener('input', e => {
  if (e.target.dataset.act === 'search') { ctx.query = e.target.value; render(); const i = document.querySelector('[data-act=search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
});

function val(role) { const el = document.querySelector(`[data-role="${role}"]`); return el ? el.value.trim() : ''; }

function handle(act, el) {
  switch (act) {
    case 'logout': ctx.user = null; ctx.role = null; render(); break;
    case 'tab': ctx.tab = el.dataset.t; ctx.openRecipe = null; ctx.query = ''; render(); window.scrollTo(0, 0); break;
    case 'open': ctx.openRecipe = el.dataset.name; ctx.tab = 'recipes'; render(); window.scrollTo(0, 0); break;
    case 'back': ctx.openRecipe = null; render(); break;
    case 'produce-from': ctx.prodRecipe = el.dataset.name; ctx.tab = 'production'; render(); break;
    case 'prod-plus': ctx.prodBatches = Math.min(20, ctx.prodBatches + 1); render(); break;
    case 'prod-minus': ctx.prodBatches = Math.max(1, ctx.prodBatches - 1); render(); break;
    case 'start-batch': {
      const r = startBatch(st, el.dataset.name, ctx.prodBatches);
      if (!r.ok) { toast('ما اتخصمش أي حاجة. فيه خامات ناقصة.'); render(); break; }
      st = r.state; logLine(`بدأت ${el.dataset.name} × ${ctx.prodBatches}`); save();
      toast(`تمت الدفعة وخصمت الخامات ✓ (${r.produced} قطعة جاهزة)`); render(); break;
    }
    case 'add-sale': {
      const paid = Number(val('paid')) || 0;
      const r = recordSale(st, { customer: val('cust'), lines: [{ item: val('sitem'), qty: Number(val('sqty')) || 0 }], paid });
      if (!r.ok) { toast(r.error); break; }
      st = r.state; save(); toast(`تم تسجيل البيع: ${r.sale.total} ج`); render(); break;
    }
    case 'add-cust': {
      const name = val('cname'); if (!name) { toast('اكتب اسم العميل'); break; }
      st.customers = [{ id: uid(), name, phone: val('cphone') }, ...st.customers]; logLine(`عميل جديد: ${name}`); save(); render(); break;
    }
    case 'add-booking': {
      const r = addBooking(st, { customer: val('bcust'), recipe: val('brecipe'), qty: Number(val('bqty')) || 0, date: val('bdate'), deposit: Number(val('bdep')) || 0 });
      if (!r.ok) break; st = r.state; save(); toast('تم تسجيل الحجز'); render(); break;
    }
    case 'pay-booking': {
      const amt = Number(document.querySelector(`[data-role="pay-${el.dataset.id}"]`)?.value) || 0;
      if (amt <= 0) { toast('اكتب مبلغ الدفعة'); break; }
      const bk = st.bookings.find(b => b.id === el.dataset.id);
      if (bk && amt > bookingRemaining(bk)) { toast(`المتبقي ${bookingRemaining(bk)} ج بس`); break; }
      st = payBooking(st, el.dataset.id, amt); logLine(`دفعة حجز ${amt} ج`); save(); render(); break;
    }
    case 'new-recipe': {
      const name = (prompt('اسم الوصفة الجديدة:') || '').trim(); if (!name || st.recipes[name]) { toast('الاسم فاضي أو موجود'); break; }
      st.recipes[name] = { yieldQty: 1, marginPct: 30, extraCost: 0, actualPrice: 0, category: '', stages: [{ key: 'prep', items: [] }] };
      st.finished[name] = 0; logLine(`وصفة جديدة: ${name}`); save(); ctx.openRecipe = name; render(); break;
    }
    case 'edit-recipe': {
      const r = st.recipes[el.dataset.name];
      const y = Number(prompt('عدد القطع الناتجة من الدفعة:', r.yieldQty)); if (y > 0) r.yieldQty = y;
      const mg = Number(prompt('هامش الربح المستهدف ٪:', r.marginPct)); if (mg >= 0 && mg < 95) r.marginPct = mg;
      const ex = Number(prompt('تكلفة إضافية للدفعة (ج):', r.extraCost)); if (ex >= 0) r.extraCost = ex;
      logLine(`تعديل ${el.dataset.name}`); save(); render(); break;
    }
    case 'new-ing': {
      const name = (prompt('اسم الخامة:') || '').trim(); if (!name || st.ingredients[name]) { toast('الاسم فاضي أو موجود'); break; }
      const unit = (prompt('الوحدة (جرام / مل / بيضة / واحدة):', 'جرام') || 'جرام').trim();
      const price = Number(prompt('سعر الوحدة (ج):', '0')) || 0;
      const stock = Number(prompt('الرصيد الحالي:', '0')) || 0;
      const min = Number(prompt('الحد الأدنى:', '0')) || 0;
      const daily = Number(prompt('الاستهلاك اليومي التقريبي:', '0')) || 0;
      st.ingredients[name] = { unit, price, stock, min, daily }; logLine(`خامة جديدة: ${name}`); save(); render(); break;
    }
    case 'edit-ing': {
      const v = st.ingredients[el.dataset.name];
      const n = Number(prompt(`الرصيد الجديد لـ ${el.dataset.name} (${v.unit}):`, v.stock));
      if (!isNaN(n) && n >= 0) { v.stock = n; logLine(`تعديل رصيد ${el.dataset.name}`); save(); render(); }
      break;
    }
    case 'set-price': break;
    case 'add-emp': {
      const name = val('ename'), role = val('erole'), pin = val('epin');
      if (!name || !/^\d{4,5}$/.test(pin)) { toast('الاسم مطلوب، والـ PIN ٤ أو ٥ أرقام'); break; }
      if (st.employees.some(e => e.name === name)) { toast('الاسم موجود'); break; }
      st.employees.push({ name, role, pin }); logLine(`موظف جديد: ${name}`); save(); render(); break;
    }
    case 'export': {
      const blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mise-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      toast('اتنزلت النسخة الاحتياطية'); break;
    }
    case 'reset-demo': {
      if (!confirm('ده هيمسح كل البيانات على الجهاز ويرجّع التجريبية. متأكد؟')) break;
      st = seedState(); save(); toast('رجعت البيانات التجريبية'); render(); break;
    }
    case 'print': window.print(); break;
  }
}

function setPrice(name, v) {
  const n = Number(v);
  st.recipes[name].actualPrice = n > 0 ? n : 0;
  logLine(`سعر ${name}: ${n > 0 ? n + ' ج' : 'مقترح'}`); save(); render();
}

function importFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.recipes || !data.ingredients) throw new Error('الملف مش نسخة Mise صحيحة');
      if (!confirm('هيستبدل البيانات الحالية بالنسخة دي. متأكد؟')) return;
      st = data; save(); toast('اتسترجعت النسخة'); render();
    } catch (err) { toast(err.message || 'الملف غير صالح'); }
  };
  reader.readAsText(file);
}

render();
