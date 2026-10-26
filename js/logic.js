// منطق الأعمال كله في ملف واحد نقي (بدون DOM ولا تخزين). كل الأقسام بتعتمد عليه.
import { num, round2 } from './core/money.js';
import { unitCost, actualPrice, suggestedPrice, achievedMargin, baseNeeds, checkStock } from './core/recipes.js';
import { applyDeduction } from './core/stock.js';

export const STAGE_ORDER = ['prep', 'oven', 'stove', 'fin'];
export const STAGE_LABEL = { prep: 'التحضير', oven: 'الفرن', stove: 'النار', fin: 'التبريد والفنش' };

const uid = () => Math.random().toString(36).slice(2, 10);
export { uid };

// أسعار الخامات للحسابات
export const priceMap = st => Object.fromEntries(Object.entries(st.ingredients).map(([k, v]) => [k, num(v.price)]));
export const stockMap = st => Object.fromEntries(Object.entries(st.ingredients).map(([k, v]) => [k, num(v.stock)]));

// تكلفة وسعر صنف
export const costOf = (st, name) => unitCost(st.recipes[name], priceMap(st), st.subs);
export const priceOf = (st, name) => actualPrice(st.recipes[name], priceMap(st), st.subs);
export const marginOf = (st, name) => achievedMargin(st.recipes[name], priceMap(st), st.subs);
export const suggestOf = (st, name) => suggestedPrice(st.recipes[name], priceMap(st), st.subs);

// تكلفة الدفعة لكل مرحلة (للعرض وتوزيع التكلفة)
export function stageCosts(st, name) {
  const r = st.recipes[name];
  const p = priceMap(st);
  const out = {};
  STAGE_ORDER.forEach(k => out[k] = 0);
  r.stages.forEach(s => {
    s.items.forEach(it => {
      const single = { ...r, stages: [{ key: s.key, items: [it] }], extraCost: 0 };
      out[s.key] = (out[s.key] || 0) + unitCost({ ...single, yieldQty: 1 }, p, st.subs);
    });
  });
  return out;
}

// خامات لازم تكفي لدفعة (قبل الخصم)
export function batchNeeds(st, name, batches) {
  return baseNeeds(st.recipes[name], st.subs, batches);
}

// بدء دفعة: فحص ثم خصم ذري، والناتج بيدخل المخزون الجاهز
export function startBatch(st, name, batches = 1) {
  const need = batchNeeds(st, name, batches);
  const check = checkStock(need, stockMap(st));
  if (!check.ok) return { ok: false, short: check.short, state: st };
  const res = applyDeduction(stockMap(st), need);
  const ingredients = { ...st.ingredients };
  Object.keys(res.stock).forEach(k => { ingredients[k] = { ...ingredients[k], stock: res.stock[k] }; });
  const produced = num(st.recipes[name].yieldQty) * batches;
  const next = {
    ...st,
    ingredients,
    finished: { ...st.finished, [name]: num(st.finished[name]) + produced },
    batches: [{ id: uid(), recipe: name, batches, produced, at: new Date().toISOString() }, ...st.batches],
    log: [{ at: new Date().toISOString(), text: `دفعة ${name} × ${batches} (${produced} قطعة)` }, ...st.log]
  };
  return { ok: true, state: next, produced };
}

// بيع: بيخصم من الجاهز، وبيسجل المدفوع والمتبقي
export function recordSale(st, { customer, lines, paid }) {
  const have = s => num(st.finished[s]);
  for (const l of lines) {
    if (num(l.qty) <= 0) return { ok: false, error: 'الكمية لازم تكون أكبر من صفر' };
    if (have(l.item) < num(l.qty)) return { ok: false, error: `الجاهز من ${l.item} مش كفاية (${have(l.item)})` };
  }
  const finished = { ...st.finished };
  lines.forEach(l => { finished[l.item] = have(l.item) - num(l.qty); });
  const priced = lines.map(l => ({ item: l.item, qty: num(l.qty), price: priceOf(st, l.item), cost: costOf(st, l.item) }));
  const total = round2(priced.reduce((a, l) => a + l.qty * l.price, 0));
  const sale = { id: uid(), customer: customer || 'بدون اسم', lines: priced, total, paid: round2(Math.min(num(paid), total)), at: new Date().toISOString() };
  return { ok: true, state: { ...st, finished, sales: [sale, ...st.sales], log: [{ at: sale.at, text: `بيع لـ ${sale.customer} (${total} ج)` }, ...st.log] }, sale };
}

export const saleRemaining = s => round2(s.total - s.paid);

// حجوزات الحفلات: العربون والدفعات والمتبقي
export function addBooking(st, { customer, recipe, qty, date, deposit }) {
  const unit = priceOf(st, recipe);
  const total = round2(num(qty) * unit);
  const b = { id: uid(), customer, recipe, qty: num(qty), date, total, paid: round2(Math.min(num(deposit), total)), payments: [] };
  return { ok: true, state: { ...st, bookings: [b, ...st.bookings], log: [{ at: new Date().toISOString(), text: `حجز ${customer} (${total} ج)` }, ...st.log] }, booking: b };
}
export function payBooking(st, id, amount) {
  const bookings = st.bookings.map(b => {
    if (b.id !== id) return b;
    const paid = round2(Math.min(b.total, b.paid + num(amount)));
    return { ...b, paid, payments: [...b.payments, { amount: num(amount), at: new Date().toISOString() }] };
  });
  return { ...st, bookings };
}
export const bookingRemaining = b => round2(b.total - b.paid);

// تقرير الربح
export function report(st) {
  const rev = st.sales.reduce((a, s) => a + s.total, 0);
  const cost = st.sales.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.qty * l.cost, 0), 0);
  const gross = rev - cost;
  const opex = st.expenses.reduce((a, e) => a + num(e.amount), 0);
  const net = gross - opex - num(st.ownerDraw);
  const perItem = {};
  st.sales.forEach(s => s.lines.forEach(l => {
    const o = perItem[l.item] || (perItem[l.item] = { qty: 0, rev: 0, cost: 0 });
    o.qty += l.qty; o.rev += l.qty * l.price; o.cost += l.qty * l.cost;
  }));
  const items = Object.entries(perItem).map(([k, o]) => ({ item: k, ...o, margin: o.rev ? round2((o.rev - o.cost) / o.rev * 100) : 0 }))
    .sort((a, b) => a.margin - b.margin);
  return { rev: round2(rev), cost: round2(cost), gross: round2(gross), opex: round2(opex), net: round2(net), items };
}

// المستحقات حسب العميل (فواتير + حجوزات)
export function receivables(st) {
  const m = {};
  st.sales.forEach(s => { const r = saleRemaining(s); if (r > 0) m[s.customer] = round2((m[s.customer] || 0) + r); });
  st.bookings.forEach(b => { const r = bookingRemaining(b); if (r > 0) m[b.customer] = round2((m[b.customer] || 0) + r); });
  return m;
}

// توقع نفاد الخامة بالمعدل اليومي
export const daysLeft = (ing) => {
  const d = num(ing.daily);
  return d > 0 ? Math.floor(num(ing.stock) / d) : Infinity;
};

// صلاحيات الأدوار
export const ROLE_SECTIONS = {
  admin: ['home', 'recipes', 'production', 'stock', 'sales', 'customers', 'pricing', 'reports', 'team', 'settings'],
  kitchen: ['home', 'recipes', 'production', 'stock'],
  sales: ['home', 'sales', 'customers'],
  barista: ['home', 'production']
};
