// كل الشاشات. كل شاشة بترجع HTML، والأحداث بتتربط في app.js عن طريق data-act.
import { fmt, num } from './core/money.js';
import { STAGE_LABEL, STAGE_ORDER, costOf, priceOf, marginOf, suggestOf, stageCosts, batchNeeds, stockMap, saleRemaining, bookingRemaining, report, receivables, daysLeft } from './logic.js';
import { checkStock } from './core/recipes.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const m = n => `${fmt(n)} ج`;
const card = (inner, extra = '') => `<div class="card" ${extra}>${inner}</div>`;
const kpi = (k, v, cls = '') => `<div class="card kpi"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
const pill = (t, cls) => `<span class="pill ${cls}">${t}</span>`;

export function home(st, ctx) {
  const low = Object.entries(st.ingredients).filter(([, v]) => v.min > 0 && v.stock <= v.min);
  const rep = report(st);
  const open = st.bookings.filter(b => bookingRemaining(b) > 0).length;
  return `
  <div class="hero"><div class="lbl">مرحباً ${esc(ctx.user)}</div><h3>${new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
    <p>${low.length ? `فيه ${low.length} خامة تحت الحد الأدنى.` : 'كل الخامات فوق الحد الأدنى.'} ${open ? `وفيه ${open} حجز لسه عليه متبقي.` : ''}</p></div>
  <h2>أرقام اليوم والفترة</h2>
  <div class="kpis">
    ${kpi('المبيعات', m(rep.rev))}
    ${kpi('الربح الإجمالي', m(rep.gross), 'good')}
    ${kpi('الصافي', m(rep.net), rep.net >= 0 ? 'good' : 'bad')}
    ${kpi('مستحقات', m(Object.values(receivables(st)).reduce((a, b) => a + b, 0)), 'warnc')}
  </div>
  <h2>دفعات الإنتاج <span>${st.batches.length}</span></h2>
  ${card(st.batches.slice(0, 5).map(b => `<div class="row"><div><b>${esc(b.recipe)} × ${b.batches}</b><small>${b.produced} قطعة</small></div><span class="muted">${new Date(b.at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('') || '<div class="muted">لسه ما فيش دفعات.</div>')}
  <h2>الجاهز للبيع</h2>
  ${card(Object.entries(st.finished).map(([k, v]) => `<div class="row"><b>${esc(k)}</b><span class="pill ${v > 0 ? 'ok' : 'bad'}">${v} قطعة</span></div>`).join(''))}
  ${low.length ? `<h2>تحتاج متابعة</h2>${card(low.map(([k, v]) => `<div class="row"><b>${esc(k)}</b>${pill(`${fmt(v.stock)} ${v.unit}`, 'bad')}</div>`).join(''))}` : ''}`;
}

export function recipes(st, ctx) {
  if (ctx.openRecipe && st.recipes[ctx.openRecipe]) return recipeDetail(st, ctx.openRecipe);
  const q = (ctx.query || '').trim();
  const names = Object.keys(st.recipes).filter(n => !q || n.includes(q));
  return `
  <h2>الوصفات <span>${names.length}</span></h2>
  <input class="search" data-act="search" placeholder="ابحث عن وصفة…" value="${esc(q)}">
  <div class="list">${names.map(n => `<div class="card rrow" data-act="open" data-name="${esc(n)}">
    <div class="thumb"></div><div><b>${esc(n)}</b><small>${st.recipes[n].stages.length} مراحل · ناتج ${st.recipes[n].yieldQty}</small></div>
    <div class="price">${fmt(costOf(st, n))}<small>تكلفة الوحدة</small></div></div>`).join('')}</div>
  <div class="card" style="margin-top:12px"><button class="btn" data-act="new-recipe">+ وصفة جديدة</button></div>`;
}

export function recipeDetail(st, name) {
  const r = st.recipes[name];
  const sc = stageCosts(st, name);
  const total = Object.values(sc).reduce((a, b) => a + b, 0) || 1;
  return `
  <button class="back" data-act="back">← كل الوصفات</button>
  <h2 style="margin-top:4px">${esc(name)}</h2>
  <div class="card"><div class="muted">توزيع تكلفة الدفعة على المراحل</div>
    <div class="costbar">${STAGE_ORDER.map(k => `<i style="width:${(sc[k] || 0) / total * 100}%;background:${{ prep: '#2F7D57', oven: '#B9773C', stove: '#8C74C9', fin: '#3D5A80' }[k]}"></i>`).join('')}</div>
    <div class="legend">${STAGE_ORDER.map(k => `<span>${STAGE_LABEL[k]} · ${fmt(sc[k] || 0)}</span>`).join('')}</div></div>
  ${r.stages.map((s, i) => `<div class="stage ${s.key}"><div class="stage-h" data-act="toggle-stage" data-i="${i}"><span>مرحلة ${STAGE_LABEL[s.key]}</span>${s.tag ? `<span class="tag">${esc(s.tag)}</span>` : ''}</div>
    <div class="sb">${s.items.map(it => it.sub ? `<div class="comp"><span>${esc(it.sub)} <em class="sub">وصفة فرعية</em></span><span class="q">${it.qty} جم</span></div>` : `<div class="comp"><span>${esc(it.name)}</span><span class="q">${it.qty} ${esc(st.ingredients[it.name]?.unit || '')}</span></div>`).join('')}
    ${s.note ? `<div class="note">ملحوظة: ${esc(s.note)}</div>` : ''}</div></div>`).join('')}
  <div class="card kpis2">${kpi('تكلفة الوحدة', m(costOf(st, name)))}${kpi('السعر المقترح', m(suggestOf(st, name)))}${kpi('الهامش', fmt(marginOf(st, name)) + '٪', marginOf(st, name) >= r.marginPct ? 'good' : 'warnc')}</div>
  <div class="row2"><button class="btn ghost" data-act="edit-recipe" data-name="${esc(name)}">تعديل</button><button class="btn ghost" data-act="produce-from" data-name="${esc(name)}">ابدأ دفعة</button></div>`;
}

export function production(st, ctx) {
  if (!Object.keys(st.recipes).length) return card('<div class="muted">ضيف وصفة الأول من قسم الوصفات عشان تبدأ دفعة.</div>');
  const name = ctx.prodRecipe && st.recipes[ctx.prodRecipe] ? ctx.prodRecipe : Object.keys(st.recipes)[0];
  const batches = ctx.prodBatches || 1;
  const need = batchNeeds(st, name, batches);
  const check = checkStock(need, stockMap(st));
  return `
  <h2>بدء دفعة إنتاج</h2>
  ${card(`<label class="f">الوصفة</label><select class="inp" data-act="prod-recipe">${Object.keys(st.recipes).map(n => `<option ${n === name ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
    <label class="f">عدد الدفعات</label><div class="stepper"><button data-act="prod-minus">−</button><b>${batches}</b><button data-act="prod-plus">+</button></div>
    <div class="muted" style="margin-top:8px">الناتج: ${st.recipes[name].yieldQty * batches} قطعة</div>`)}
  <h2>الخامات المطلوبة</h2>
  ${card(check.rows.map(r => `<div class="row"><div>${esc(r.name)}<small>المتاح ${fmt(r.have)}</small></div><div>${fmt(r.need)} ${pill(r.ok ? 'يكفي' : `ناقص ${fmt(r.need - r.have)}`, r.ok ? 'ok' : 'bad')}</div></div>`).join(''))}
  ${check.ok ? '' : `<div class="alert bad">مش هينفع تبدأ الدفعة دي. الخصم ما بيحصلش جزئي.</div>`}
  <button class="btn" data-act="start-batch" data-name="${esc(name)}" ${check.ok ? '' : 'disabled'}>ابدأ الدفعة وخصم الخامات</button>
  <h2>سجل الدفعات</h2>
  ${card(st.batches.slice(0, 15).map(b => `<div class="row"><div><b>${esc(b.recipe)} × ${b.batches}</b><small>${new Date(b.at).toLocaleString('ar-EG')}</small></div><span class="muted">${b.produced} قطعة</span></div>`).join('') || '<div class="muted">فاضي.</div>')}`;
}

export function stock(st, ctx) {
  const q = (ctx.query || '').trim();
  const rows = Object.entries(st.ingredients).filter(([k]) => !q || k.includes(q));
  return `
  <h2>المخزون <span>${rows.length}</span></h2>
  <input class="search" data-act="search" placeholder="ابحث عن خامة…" value="${esc(q)}">
  ${card(rows.map(([k, v]) => {
    const low = v.min > 0 && v.stock <= v.min;
    const d = daysLeft(v);
    return `<div class="stock-row" data-act="edit-ing" data-name="${esc(k)}">
      <div class="r1"><span>${esc(k)}</span><small>${fmt(v.stock)} ${esc(v.unit)}</small></div>
      <div class="bar"><i style="width:${Math.min(100, v.stock / Math.max(1, v.min * 2.2) * 100)}%;${low ? 'background:#B4452F' : ''}"></i></div>
      <div class="r2"><span>الحد الأدنى ${fmt(v.min)}</span><span class="${low ? 'bad' : 'good'}">${d === Infinity ? '—' : `يكفي ${d} يوم`}</span></div></div>`;
  }).join(''))}
  <div class="card" style="margin-top:12px"><button class="btn ghost" data-act="new-ing">+ خامة جديدة</button></div>`;
}

export function sales(st, ctx) {
  const customers = st.customers.map(c => `<option value="${esc(c.name)}">`).join('');
  return `
  <h2>فاتورة جديدة</h2>
  ${card(`<label class="f">العميل</label><input class="inp" list="cust" data-role="cust" placeholder="اكتب أو اختار">
    <datalist id="cust">${customers}</datalist>
    <label class="f">الصنف والكمية</label>
    <div class="row2"><select class="inp" data-role="sitem">${Object.keys(st.recipes).map(n => `<option>${esc(n)}</option>`).join('')}</select>
    <input class="inp" data-role="sqty" type="number" min="1" value="1"></div>
    <div class="muted" style="margin-top:8px">الجاهز: ${Object.entries(st.finished).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')}</div>
    <label class="f">المدفوع الآن</label><input class="inp" data-role="paid" type="number" min="0" value="0">
    <button class="btn" data-act="add-sale">سجّل البيع</button>`)}
  <h2>آخر الفواتير</h2>
  ${st.sales.slice(0, 20).map(s => `<div class="card"><div class="row"><div><b>${esc(s.customer)}</b><small>${s.lines.map(l => `${esc(l.item)} × ${l.qty}`).join(' · ')}</small></div>
    <div class="amt">${m(s.total)}${saleRemaining(s) > 0 ? pill(`متبقي ${m(saleRemaining(s))}`, 'warn') : pill('مسدد', 'ok')}</div></div></div>`).join('') || `<div class="muted">لسه ما فيش فواتير.</div>`}`;
}

export function customers(st) {
  const rec = receivables(st);
  return `
  <h2>العملاء <span>${st.customers.length}</span></h2>
  ${card(st.customers.map(c => `<div class="row"><div><b>${esc(c.name)}</b><small>${esc(c.phone || '—')}</small></div>${rec[c.name] ? pill(`مستحق ${m(rec[c.name])}`, 'warn') : pill('لا يوجد مستحق', 'ok')}</div>`).join(''))}
  <div class="card" style="margin-top:12px"><label class="f">اسم العميل</label><input class="inp" data-role="cname"><label class="f">التليفون</label><input class="inp" data-role="cphone"><button class="btn" data-act="add-cust">أضف عميل</button></div>
  <h2>حجوزات الحفلات</h2>
  ${card(`<label class="f">العميل</label><input class="inp" data-role="bcust">
    <label class="f">الصنف</label><select class="inp" data-role="brecipe">${Object.keys(st.recipes).map(n => `<option>${esc(n)}</option>`).join('')}</select>
    <div class="row2"><div><label class="f">الكمية</label><input class="inp" type="number" min="1" data-role="bqty" value="10"></div><div><label class="f">العربون</label><input class="inp" type="number" min="0" data-role="bdep" value="0"></div></div>
    <label class="f">التاريخ</label><input class="inp" type="date" data-role="bdate"><button class="btn" data-act="add-booking">سجّل الحجز</button>`)}
  ${st.bookings.map(b => `<div class="card"><div class="row"><div><b>${esc(b.customer)}</b><small>${esc(b.recipe)} × ${b.qty} · ${esc(b.date || '')}</small></div><div class="amt">${m(bookingRemaining(b))}<small>متبقي من ${m(b.total)}</small></div></div>
    ${bookingRemaining(b) > 0 ? `<div class="row2"><input class="inp" type="number" data-role="pay-${b.id}" placeholder="مبلغ الدفعة"><button class="btn ghost" data-act="pay-booking" data-id="${b.id}">سجّل دفعة</button></div>` : pill('مسدد', 'ok')}</div>`).join('')}`;
}

export function pricing(st) {
  const names = Object.keys(st.recipes).sort((a, b) => marginOf(st, a) - marginOf(st, b));
  return `
  <h2>التسعير وهوامش الربح</h2>
  <div class="card" style="overflow-x:auto"><table>
    <tr><th>الصنف</th><th class="n">التكلفة</th><th class="n">المقترح</th><th class="n">الفعلي</th><th class="n">الهامش</th></tr>
    ${names.map(n => { const r = st.recipes[n]; const mg = marginOf(st, n); return `<tr>
      <td>${esc(n)}</td><td class="n">${fmt(costOf(st, n))}</td><td class="n">${fmt(suggestOf(st, n))}</td>
      <td class="n"><input class="mini" type="number" step="0.5" min="0" data-act="set-price" data-name="${esc(n)}" value="${r.actualPrice || ''}" placeholder="${fmt(suggestOf(st, n))}"></td>
      <td class="n"><span class="pill ${mg >= r.marginPct ? 'ok' : mg >= r.marginPct - 10 ? 'warn' : 'bad'}">${fmt(mg)}٪</span></td></tr>`; }).join('')}
  </table></div>
  <div class="card muted">السعر المقترح = التكلفة ÷ (١ − الهامش). لو سجلت سعر فعلي، هو اللي بيتحسب في الفواتير والتقارير.</div>`;
}

export function reports(st) {
  const r = report(st);
  return `
  <h2>تقرير الربح</h2>
  <div class="kpis">${kpi('المبيعات', m(r.rev))}${kpi('تكلفة المبيعات', m(r.cost))}${kpi('الربح الإجمالي', m(r.gross), 'good')}${kpi('الصافي', m(r.net), r.net >= 0 ? 'good' : 'bad')}</div>
  <h2>من أين يخرج الربح</h2>
  ${card(`<div class="line"><span>المبيعات</span><b>${m(r.rev)}</b></div><div class="line"><span>تكلفة الخامات المباعة</span><b>− ${m(r.cost)}</b></div>
    <div class="line"><span><b>الربح الإجمالي</b></span><b class="good">${m(r.gross)}</b></div>
    ${st.expenses.map(e => `<div class="line"><span>${esc(e.name)}</span><b>− ${m(e.amount)}</b></div>`).join('')}
    <div class="line"><span>مسحوبات المالك</span><b>− ${m(st.ownerDraw)}</b></div>
    <div class="line"><span><b>الصافي</b></span><b class="${r.net >= 0 ? 'good' : 'bad'}">${m(r.net)}</b></div>`)}
  <h2>أداء كل صنف (الأضعف أولاً)</h2>
  ${card(r.items.map(x => `<div class="row"><div>${esc(x.item)}<small>${x.qty} قطعة · ربح ${m(x.rev - x.cost)}</small></div><span class="pill ${x.margin >= 30 ? 'ok' : x.margin >= 15 ? 'warn' : 'bad'}">${fmt(x.margin)}٪</span></div>`).join('') || '<div class="muted">لسه ما فيش مبيعات.</div>')}
  <button class="btn ghost" data-act="print">طباعة التقرير</button>`;
}

export function team(st) {
  return `
  <h2>الفريق <span>${st.employees.length}</span></h2>
  ${card(st.employees.map(e => `<div class="row"><div class="who"><span class="av">${esc(e.name.charAt(0).toUpperCase())}</span><div><b>${esc(e.name)}</b><small>${esc(roleName(e.role))}</small></div></div><small class="muted">PIN ${'•'.repeat(String(e.pin).length)}</small></div>`).join(''))}
  <div class="card" style="margin-top:12px"><label class="f">الاسم</label><input class="inp" data-role="ename"><label class="f">الدور</label>
    <select class="inp" data-role="erole"><option value="kitchen">مطبخ</option><option value="sales">مبيعات</option><option value="barista">بار</option><option value="admin">مدير</option></select>
    <label class="f">PIN (٤ أو ٥ أرقام)</label><input class="inp" data-role="epin" inputmode="numeric" maxlength="5"><button class="btn" data-act="add-emp">أضف موظف</button></div>`;
}
export const roleName = r => ({ admin: 'مدير', kitchen: 'مطبخ', sales: 'مبيعات', barista: 'بار' }[r] || r);

export function settings(st) {
  return `
  <h2>إدارة البيانات</h2>
  ${card(`<button class="btn" data-act="export">تنزيل نسخة احتياطية (JSON)</button>
    <label class="f">استرجاع من ملف</label><input type="file" accept="application/json" data-act="import">
    <button class="btn ghost" data-act="reset-demo">رجوع للبيانات التجريبية</button>`)}
  <h2>سجل العمليات</h2>
  ${card(st.log.slice(0, 25).map(l => `<div class="row"><span>${esc(l.text)}</span><small class="muted">${new Date(l.at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') || '<div class="muted">فاضي.</div>')}`;
}
