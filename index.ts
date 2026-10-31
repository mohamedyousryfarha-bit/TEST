import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

// لازم يتطابق مع الرقم اللي في دالة pastrymy_verify_employee_pin (>= 2)
const MAX_FAILED_ATTEMPTS = 2;

// يرجّع رسالة الخطأ المناسبة مع بيانات الحظر أو المحاولات المتبقية
function authFail(result: any) {
  const body: Record<string, unknown> = { error: result.error };
  if (result.error === 'INVALID_EMPLOYEE_PIN') body.attempts_left = result.attempts_left;
  if (result.error === 'EMPLOYEE_LOCKED') {
    body.locked_until = result.locked_until;
    body.retry_after_seconds = result.retry_after_seconds;
  }
  return respond(body, 403);
}

// ===== الوحدات والتكلفة: مطابقة لمنطق الواجهة (unitBase / factor / norm / costOf / recipeCost) =====
// الوحدات اللي معاملها 1 مش مكتوبة هنا: factor() بيرجع 1 كقيمة افتراضية.
const UNIT_FACTORS: Record<string, number> = {
  'جرام': 1, 'كيلو جرام': 1000, 'كيلو': 1000,
  'لتر': 1, 'ملليلتر': 0.001, 'كوب': 0.24, 'نصف كوب': 0.12, 'ربع كوب': 0.06,
  'ملعقة كبيرة': 0.015, 'ملعقة صغيرة': 0.005,
};

function unitBase(u: unknown): string {
  const x = String(u ?? '');
  if (x === 'جرام' || x === 'كيلو جرام' || x === 'كيلو') return 'جرام';
  if (['لتر', 'ملليلتر', 'كوب', 'نصف كوب', 'ربع كوب', 'ملعقة كبيرة', 'ملعقة صغيرة'].includes(x)) return 'لتر';
  if (x === 'واحدة' || x === 'بيضة' || x === 'قطعة') return 'واحدة';
  return x || 'جرام';
}

function factor(u: unknown): number {
  const f = UNIT_FACTORS[String(u ?? '')];
  return f ?? 1;
}

function norm(q: unknown, u: unknown): number {
  return Number(q || 0) * factor(u);
}

function costOf(prices: any, name: string, unit: string, qty: number): number | null {
  const p = prices?.[name];
  if (!p || !(Number(p.purchasePrice) > 0 && Number(p.packSize) > 0)) return null;
  const pack = norm(p.packSize, p.packUnit || unit);
  if (!pack) return null;
  if (unitBase(unit) !== unitBase(p.packUnit || unit)) return null;
  return qty * Number(p.purchasePrice) / pack;
}

// تكلفة الوحدة الواحدة للصنف من الحالة الكاملة على السيرفر. null لو فيه خامة غير مسعّرة.
function recipeUnitCost(payload: any, name: string): { unitCost: number | null; unknown: string[] } {
  const comps = Array.isArray(payload?.recipes?.[name]) ? payload.recipes[name] : [];
  let total = 0;
  const unknown: string[] = [];
  for (const c of comps) {
    if (!c?.name || !(Number(c.qty) > 0)) continue;
    const base = unitBase(c.unit);
    const qty = norm(c.qty, c.unit);
    const cost = costOf(payload.prices, c.name, base, qty);
    if (cost === null) unknown.push(c.name);
    else total += cost;
  }
  const meta = payload?.recipeMeta?.[name] ?? {};
  const extra = Math.max(0, Number(meta.extraCost) || 0);
  const yieldQty = Math.max(0.001, Number(meta.yieldQty) || 1);
  const uniqueUnknown = [...new Set(unknown)];
  const complete = uniqueUnknown.length === 0;
  return { unitCost: complete ? (total + extra) / yieldQty : null, unknown: uniqueUnknown };
}

// تكلفة الوزنة الواحدة (قبل تقسيمها على عدد القطع الناتجة) — مستخدمة في سجل الإنتاج
function recipeBatchCost(payload: any, name: string): { batchCost: number | null; unknown: string[]; yieldQty: number } {
  const comps = Array.isArray(payload?.recipes?.[name]) ? payload.recipes[name] : [];
  let total = 0;
  const unknown: string[] = [];
  for (const c of comps) {
    if (!c?.name || !(Number(c.qty) > 0)) continue;
    const base = unitBase(c.unit);
    const qty = norm(c.qty, c.unit);
    const cost = costOf(payload.prices, c.name, base, qty);
    if (cost === null) unknown.push(c.name);
    else total += cost;
  }
  const meta = payload?.recipeMeta?.[name] ?? {};
  const extra = Math.max(0, Number(meta.extraCost) || 0);
  const yieldQty = Math.max(0.001, Number(meta.yieldQty) || 1);
  const uniqueUnknown = [...new Set(unknown)];
  return { batchCost: uniqueUnknown.length === 0 ? total + extra : null, unknown: uniqueUnknown, yieldQty };
}

// ===== رقم الفاتورة: عداد دايم في الحالة (مش بيتصفر مع تقفيل الشهر) =====
// سلسلتين منفصلين: الأكل (invoiceSeq) والمشروبات (drinkInvoiceSeq).
// سطر البيع بيتعلّم group:'drink' لو الصنف من مجموعة المشروبات. الأسطر القديمة من غير group بتعتبر أكل.
function isDrinkLine(x: any): boolean {
  return !!x && typeof x === 'object' && x.group === 'drink';
}
function drinkNamesOf(payload: any): Set<string> {
  return new Set(Array.isArray(payload?.drinkNames) ? payload.drinkNames.map((n: any) => String(n)) : []);
}
function seqOf(payload: any): number {
  const seq = Number(payload?.invoiceSeq) || 0;
  const maxLog = (Array.isArray(payload?.salesLog) ? payload.salesLog : [])
    .filter((x: any) => !isDrinkLine(x))
    .reduce((m: number, x: any) => Math.max(m, Number(x?.receiptNo) || 0), 0);
  return Math.max(seq, maxLog);
}
function drinkSeqOf(payload: any): number {
  const seq = Number(payload?.drinkInvoiceSeq) || 0;
  const maxLog = (Array.isArray(payload?.salesLog) ? payload.salesLog : [])
    .filter((x: any) => isDrinkLine(x))
    .reduce((m: number, x: any) => Math.max(m, Number(x?.receiptNo) || 0), 0);
  return Math.max(seq, maxLog);
}

// ===== دمج متعدد المستخدمين (3-way merge) =====
// base = النسخة اللي الجهاز اشتغل عليها، mine = اللي الجهاز بيحفظه، cur = اللي على السيرفر دلوقتي.
// كل جهاز بيغيّر حاجته بس، والباقي بيفضل زي ما السيرفر فيه.

const APPEND_LOGS = new Set(['salesLog', 'history', 'productionLog', 'productionPieces', 'expensesLog', 'purchasesLog']);
const KEYED_ARRAYS: Record<string, string> = { inventory: 'name', menu: 'name', partyMenu: 'name' };

// مقارنة ثابتة مستقلة عن ترتيب المفاتيح (jsonb في Postgres بيغيّر الترتيب)
function canon(v: any): string {
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map((item: any) => canon(item)).join(',') + ']';

  // نفصل خطوات ترتيب المفاتيح عن بعضها لتجنب أي التباس في محلل TypeScript أثناء النشر.
  const keys = Object.keys(v).sort();
  const parts: string[] = [];
  for (const key of keys) {
    if (v[key] === undefined) continue;
    parts.push(JSON.stringify(key) + ':' + canon(v[key]));
  }
  return '{' + parts.join(',') + '}';
}
const same = (a: any, b: any) => canon(a) === canon(b);
const isPlainObject = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v);

function mergeObjectByKey(b: any, m: any, c: any): any {
  const out: any = {};
  const keys = new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(c)]);
  for (const k of keys) {
    const bk = b[k], mk = m[k], ck = c[k];
    let r;
    if (same(mk, bk)) r = ck;        // ما غيّرتش الحاجة دي
    else if (same(ck, bk)) r = mk;   // غيّرتها بس، فبحفظ تغييري
    else r = mk;                     // الاتنين غيّروها: آخر حفظ بيكسب على الحتة دي بس
    if (r !== undefined) out[k] = r;
  }
  return out;
}

function mergeArrayByKey(b: any[], m: any[], c: any[], key: string): any[] {
  const bm = new Map(b.map((x) => [x?.[key], x]));
  const mm = new Map(m.map((x) => [x?.[key], x]));
  const cm = new Map(c.map((x) => [x?.[key], x]));
  const order: any[] = [];
  const seen = new Set<any>();
  for (const x of [...c, ...m]) {
    const k = x?.[key];
    if (!seen.has(k)) { seen.add(k); order.push(k); }
  }
  const out: any[] = [];
  for (const k of order) {
    const bi = bm.get(k), mi = mm.get(k), ci = cm.get(k);
    let r;
    if (same(mi, bi)) r = ci;
    else if (same(ci, bi)) r = mi;
    else r = mi;
    if (r !== undefined) out.push(r);
  }
  return out;
}

// سجلات بتتضاف: الإضافات بتاعت الجهاز بتتحط فوق، والحذف بيتطبق على اللي موجود على السيرفر
function mergeAppendLog(b: any[], m: any[], c: any[]): any[] {
  const bSet = new Set(b.map(canon));
  const mSet = new Set(m.map(canon));
  const cSet = new Set(c.map(canon));
  const added = m.filter((x) => { const k = canon(x); return !bSet.has(k) && !cSet.has(k); });
  const removed = new Set(b.filter((x) => !mSet.has(canon(x))).map(canon));
  const kept = c.filter((x) => !removed.has(canon(x)));
  return [...added, ...kept];
}

function mergeStates(base: any, mine: any, cur: any): any {
  const b0 = isPlainObject(base) ? base : {};
  const m0 = isPlainObject(mine) ? mine : {};
  const c0 = isPlainObject(cur) ? cur : {};
  const out: any = {};
  const keys = new Set([...Object.keys(b0), ...Object.keys(m0), ...Object.keys(c0)]);
  for (const k of keys) {
    const b = b0[k], m = m0[k], c = c0[k];
    if (same(m, b)) { if (c !== undefined) out[k] = c; continue; }   // الجهاز ما غيّرش الحاجة دي
    if (same(c, b)) { if (m !== undefined) out[k] = m; continue; }   // الجهاز غيّرها بس
    // الاتنين غيّروا الحاجة دي
    if (APPEND_LOGS.has(k) && Array.isArray(m) && Array.isArray(c)) {
      out[k] = mergeAppendLog(Array.isArray(b) ? b : [], m, c); continue;
    }
    if (KEYED_ARRAYS[k] && Array.isArray(m) && Array.isArray(c)) {
      out[k] = mergeArrayByKey(Array.isArray(b) ? b : [], m, c, KEYED_ARRAYS[k]); continue;
    }
    if (isPlainObject(m) && isPlainObject(c)) {
      out[k] = mergeObjectByKey(isPlainObject(b) ? b : {}, m, c); continue;
    }
    if (m !== undefined) out[k] = m;
  }
  return out;
}

// ===== المنيو =====
// publicOnly = true: للمبيعات (الأصناف الفعّالة بس، من غير حالة active).
// publicOnly = false: للمطبخ (كل الأصناف مع حالة active).
function mapMenu(payload: any, publicOnly: boolean) {
  if (!Array.isArray(payload?.menu)) return [];
  return payload.menu
    .filter((x: any) => x && typeof x.name === 'string' && x.name && (!publicOnly || x.active !== false))
    .map((x: any) => {
      const item: any = {
        name: String(x.name),
        image: typeof x.image === 'string' ? x.image : '',
        unit: typeof x.unit === 'string' ? x.unit : '',
        soldOut: x.soldOut === true,
        kind: x.kind === 'party' ? 'party' : (x.kind === 'drink' ? 'drink' : 'piece'),
        onDemand: x.kind === 'drink' && x.onDemand === true,
      };
      if (publicOnly) item.price = Number(x.price) || 0;
      if (x.kind === 'party' && Array.isArray(x.parts)) {
        item.parts = x.parts.filter((p: any) => p && typeof p.name === 'string' && p.name)
          .map((p: any) => ({ name: String(p.name), qty: Number(p.qty) || 0 }));
      }
      return publicOnly ? item : { ...item, active: x.active !== false };
    });
}

// ===== أصناف الحفلات (تبويب مستقل بمخزون منفصل) =====
// sales: الأسعار والأصناف الفعّالة بس، من غير التكلفة.
// kitchen: الأصناف مع حالة active، من غير الأسعار ولا التكلفة.
// admin: بيقرا الحالة الكاملة من get_state مباشرة.
function mapPartyMenu(payload: any, mode: 'sales' | 'kitchen') {
  if (!Array.isArray(payload?.partyMenu)) return [];
  return payload.partyMenu
    .filter((x: any) => x && typeof x.name === 'string' && x.name && (mode === 'kitchen' || x.active !== false))
    .map((x: any) => {
      const base = {
        name: String(x.name),
        image: typeof x.image === 'string' ? x.image : '',
        unit: x.unit === 'cake' ? 'cake' : 'piece',
        soldOut: x.soldOut === true,
      };
      if (mode === 'kitchen') return { ...base, active: x.active !== false };
      return { ...base, price: Number(x.price) || 0 };
    });
}
function partyStockOf(payload: any): Record<string, number> {
  const src = payload?.partyStock && typeof payload.partyStock === 'object' && !Array.isArray(payload.partyStock)
    ? payload.partyStock : {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(src)) {
    const n = Math.floor(Number(v) || 0);
    if (n > 0) out[k] = n;
  }
  return out;
}

// الفواتير والمبيعات: المبيعات مش بيشوف التكلفة ولا الربح ولا رقم الموبايل: بنشيل الحقول دي من أي سطر قبل ما يتبعت.
function publicLine(l: any) {
  if (!l || typeof l !== 'object') return l;
  const { unitCostAtSale, costAtSale, unpricedComponents, customerPhone, ...rest } = l;
  return rest;
}

// رسالة النقص للمستخدم
function readyMsg(name: string, have: number, want: number): string {
  if (have <= 0) return `مفيش قطع متاحة من «${name}» دلوقتي.`;
  return `مفيش قطع كفاية من «${name}» للطلب ده. المتاح: ${have} قطعة، والمطلوب: ${want}.`;
}

// رقم موبايل العميل: أرقام وعلامات + و- ومسافات بس، بحد أقصى 30 حرف
function cleanPhone(v: unknown): string {
  return String(v ?? '').replace(/[^\d+\-\s]/g, '').trim().slice(0, 30);
}

// الحالة اللي بتتبعت لأي دور من غير بيانات الإدارة
function blankState(payload: any) {
  return {
    inventory: [], prices: {}, orders: [], history: [], monthlyArchives: [], partyOrders: [],
    productionLog: [], salesLog: [], expensesLog: [], purchasesLog: [], recipeMeta: {},
    version: payload?.version ?? 1,
  };
}

// ينظّم قايمة الأصناف المطلوب إنتاجها
function normalizeOrders(input: any): { name: string; qty: number }[] {
  const out: { name: string; qty: number }[] = [];
  for (const o of input) {
    if (!o) continue;
    const name = String(o.name ?? '').trim();
    const qty = Number(o.qty);
    if (!name || name.length > 200 || !Number.isFinite(qty) || qty <= 0 || qty > 100000) continue;
    out.push({ name, qty });
  }
  return out;
}

// ينظّف خريطة القطع الجاهزة اللي الشيف كتبها
function cleanReadyMap(input: any): Record<string, number> {
  const clean: Record<string, number> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return clean;
  for (const [k, v] of Object.entries(input)) {
    const name = String(k).trim();
    const n = Number(v);
    if (!name || name.length > 200 || !Number.isInteger(n) || n < 0 || n > 100000) continue;
    clean[name] = (clean[name] || 0) + n;
  }
  return clean;
}

// ===== تنفيذ الإنتاج جوه الـ Edge Function (بديل آمن لو مفيش دالة SQL) =====
type LocalProdResult =
  | { kind: 'ok'; body: Record<string, unknown> }
  | { kind: 'respond'; res: Response }
  | { kind: 'conflict' };

async function applyProductionLocally(admin: any, o: {
  orders: { name: string; qty: number }[];
  ready: Record<string, number>;
  requestId: string;
  actor: string;
  authUserId: string;
}): Promise<LocalProdResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await readStateOf(admin);
    if (!cur) return { kind: 'respond', res: respond({ error: 'STATE_NOT_INITIALIZED' }, 409) };
    const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
    const done: string[] = Array.isArray(payload.readyRequests) ? payload.readyRequests : [];
    if (done.includes(o.requestId)) {
      return { kind: 'ok', body: { ok: true, duplicate: true, revision: cur.revision ?? 0, production_mode: 'edge' } };
    }

    const recipes = payload.recipes && typeof payload.recipes === 'object' ? payload.recipes : {};

    // 1) نحسب احتياج كل خامة بالوحدة الأساسية
    const needs = new Map<string, { name: string; base: string; qty: number }>();
    for (const ord of o.orders) {
      const comps = Array.isArray(recipes[ord.name]) ? recipes[ord.name] : null;
      if (!comps) {
        return { kind: 'respond', res: respond({ error: 'RECIPE_NOT_FOUND', message: `الوصفة «${ord.name}» غير موجودة على الخادم.` }, 409) };
      }
      for (const c of comps) {
        if (!c || !c.name) continue;
        const base = unitBase(c.unit);
        const q = norm(c.qty, c.unit) * ord.qty;
        if (!(q > 0)) continue;
        const key = String(c.name) + '||' + base;
        const prev = needs.get(key);
        needs.set(key, { name: String(c.name), base, qty: (prev?.qty || 0) + q });
      }
    }

    // 2) نخصم من المخزون (بنفس منطق unitBase/factor بتاع الواجهة)
    const inventory: any[] = Array.isArray(payload.inventory) ? payload.inventory.map((x: any) => ({ ...x })) : [];
    const oldHistory: any[] = Array.isArray(payload.history) ? payload.history : [];
    const date = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' });
    const historyRows: any[] = [];
    for (const need of needs.values()) {
      let remaining = need.qty;
      for (const item of inventory) {
        if (remaining <= 1e-9) break;
        if (!item || item.name !== need.name) continue;
        if (unitBase(item.unit) !== need.base) continue;
        const haveBase = norm(item.qty, item.unit);
        if (haveBase <= 0) continue;
        const takeBase = Math.min(haveBase, remaining);
        const f = factor(item.unit) || 1;
        const takeItem = takeBase / f;
        item.qty = Number(item.qty || 0) - takeItem;
        if (item.qty < 0) item.qty = 0;
        remaining -= takeBase;
        const balanceBase = norm(item.qty, item.unit);
        historyRows.push({
          date, name: need.name, add: 0, deduct: takeItem, balance: balanceBase / f,
          unit: item.unit, note: 'خصم بعد تأكيد الإنتاج', by: o.actor,
        });
      }
      if (remaining > Math.max(1e-6, need.qty * 1e-9)) {
        return { kind: 'respond', res: respond({ error: 'INSUFFICIENT_STOCK', message: `المخزون لا يكفي: «${need.name}» ناقص ${Number(remaining.toFixed(3))} ${need.base}.` }, 409) };
      }
    }

    // 3) نزوّد عدد القطع الجاهزة ون سجّل القطع
    const readyStock: Record<string, number> = { ...(payload.readyStock || {}) };
    const batchMap: Record<string, number> = {};
    for (const ord of o.orders) batchMap[ord.name] = (batchMap[ord.name] || 0) + ord.qty;
    const nowIso = new Date().toISOString();
    const pieces: any[] = [];
    for (const name of Object.keys(o.ready)) {
      if (!Object.prototype.hasOwnProperty.call(recipes, name)) continue;
      readyStock[name] = (Number(readyStock[name]) || 0) + o.ready[name];
      pieces.push({ name, pieces: o.ready[name], batches: batchMap[name] || 0, at: nowIso, by: o.actor, requestId: o.requestId });
    }

    // 4) سجل الإنتاج (نفس شكل السجلات اللي الواجهة بتقراه)
    let totalCost = 0, unpriced = 0, costKnown = true;
    for (const ord of o.orders) {
      const bc = recipeBatchCost(payload, ord.name);
      if (bc.batchCost === null) { costKnown = false; unpriced += bc.unknown.length * ord.qty; }
      else totalCost += bc.batchCost * ord.qty;
    }
    const batches = o.orders.reduce((s, x) => s + x.qty, 0);
    const productionLogRow = {
      date,
      name: o.orders.length === 1 ? o.orders[0].name : (o.orders.map((x) => x.name).join('، ').slice(0, 200)),
      recipeCount: batches,
      totalCost: costKnown ? Number(totalCost.toFixed(2)) : 0,
      unpricedComponents: unpriced,
      by: o.actor,
      at: nowIso,
      requestId: o.requestId,
      items: o.orders.map((x) => ({ name: x.name, qty: x.qty })),
    };

    const oldPieces: any[] = Array.isArray(payload.productionPieces) ? payload.productionPieces : [];
    const oldLog: any[] = Array.isArray(payload.productionLog) ? payload.productionLog : [];
    const newRevision = (cur.revision ?? 0) + 1;
    const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
      .update({
        payload: {
          ...payload,
          inventory,
          history: [...historyRows, ...oldHistory].slice(-5000),
          readyStock,
          readyRequests: [...done, o.requestId].slice(-50),
          productionPieces: [...oldPieces, ...pieces].slice(-3000),
          productionLog: [...oldLog, productionLogRow].slice(-3000),
        },
        revision: newRevision,
        updated_at: nowIso,
        updated_by: o.authUserId,
      })
      .eq('id', 1).eq('revision', cur.revision ?? 0).select('revision').maybeSingle();
    if (updErr) {
      console.error('PastryMY production write failed', updErr);
      return { kind: 'respond', res: respond({ error: 'PRODUCTION_FAILED', message: 'تعذر حفظ الإنتاج، حاول مرة أخرى.' }, 500) };
    }
    if (!upd) continue; // حد كتب في نفس اللحظة: نقرأ تاني ونحاول

    try {
      await admin.from('pastrymy_audit_log').insert({
        actor_name: o.actor, action: 'confirm_production', revision: newRevision, auth_user_id: o.authUserId,
        client_note: `تأكيد إنتاج (تنفيذ محلي في السيرفر): ${o.orders.map((x) => x.name + ' × ' + x.qty).join('، ').slice(0, 200)}`,
      });
    } catch (e) { console.error('PastryMY production audit failed', e); }

    return {
      kind: 'ok',
      body: { ok: true, revision: newRevision, production_mode: 'edge', readyStock, inventoryDeducted: true },
    };
  }
  return { kind: 'conflict' };
}

// قراءة الحالة (مستخدمة من الدوال المساعدة بره نطاق الطلب)
async function readStateOf(admin: any) {
  const { data, error } = await admin.from('pastrymy_app_state')
    .select('payload,revision').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return respond({ error: 'SERVER_NOT_CONFIGURED' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return respond({ error: 'AUTH_REQUIRED' }, 401);

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond({ error: 'INVALID_SESSION' }, 401);
  const userId = authData.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  async function verifiedEmployee(nameInput: unknown, pinInput: unknown) {
    const name = String(nameInput || '').trim();
    const pin = String(pinInput || '');
    if (!name || !pin) return { error: 'EMPLOYEE_PIN_REQUIRED' as const };

    const { data: ok, error } = await admin.rpc('pastrymy_verify_employee_pin', { p_employee_name: name, p_pin: pin });
    if (error) throw error;

    if (ok !== true) {
      // نقرأ حالة الموظف بعد الفشل عشان نعرف هل هو مقفول ولا لسه عنده محاولات
      const { data: row, error: rowErr } = await admin.from('pastrymy_employees')
        .select('failed_attempts, locked_until').eq('display_name', name).eq('active', true).maybeSingle();
      if (rowErr) throw rowErr;

      const lockedUntilMs = row?.locked_until ? new Date(row.locked_until).getTime() : 0;
      if (lockedUntilMs > Date.now()) {
        return {
          error: 'EMPLOYEE_LOCKED' as const,
          locked_until: new Date(lockedUntilMs).toISOString(),
          retry_after_seconds: Math.ceil((lockedUntilMs - Date.now()) / 1000),
        };
      }

      const failed = Number(row?.failed_attempts) || 0;
      return {
        error: 'INVALID_EMPLOYEE_PIN' as const,
        attempts_left: Math.max(0, MAX_FAILED_ATTEMPTS - failed),
      };
    }

    // الـ PIN صح، بس لازم نجيب بيانات الموظف (الدور) عشان نعرف صلاحياته
    const { data: employee, error: employeeError } = await admin.from('pastrymy_employees')
      .select('display_name, role, active').eq('display_name', name).eq('active', true).maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return { error: 'EMPLOYEE_NOT_FOUND' as const };
    return { employee, pin };
  }

  // ===== تنفيذ تأكيد الإنتاج: مسار واحد محلي محمي بالإصدار (revision) =====
  async function runProduction(o: {
    orders: any[]; ready: any; requestId: string;
    employeeName: string; pin: string; actor: string;
  }): Promise<Response> {
    const orders = normalizeOrders(o.orders);
    if (!orders.length) return respond({ error: 'INVALID_ORDERS', message: 'قائمة الإنتاج فارغة أو بياناتها غير صحيحة.' }, 400);
    const ready = cleanReadyMap(o.ready);
    const local = await applyProductionLocally(admin, {
      orders, ready, requestId: o.requestId, actor: o.actor, authUserId: userId,
    });
    if (local.kind === 'respond') return local.res;
    if (local.kind === 'conflict') return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    return respond({ ...local.body, readyWarning: false });
  }

  function mapPartyOrders(payload: any, mode: 'sales' | 'kitchen' | 'barista') {
    const rows = Array.isArray(payload?.partyOrders) ? payload.partyOrders : [];
    return rows.filter((o: any) => o && typeof o === 'object' && (mode === 'sales' || o.status === 'pending'))
      .map((o: any) => {
        const safe: any = {
          id: String(o.id || ''), name: String(o.name || ''), customer: String(o.customer || ''),
          customerPhone: String(o.customerPhone || ''), date: String(o.date || ''), time: String(o.time || ''),
          qty: Number(o.qty) || 0, parts: Array.isArray(o.parts) ? o.parts : [],
          status: String(o.status || 'pending'), by: String(o.by || ''), at: String(o.at || ''),
          producedAt: String(o.producedAt || ''), deliveredAt: String(o.deliveredAt || ''),
          note: String(o.note || ''), statusHistory: Array.isArray(o.statusHistory) ? o.statusHistory : [],
          // حالة كل محطة (الحلويات / المشروبات): من غيرها الواجهة بتفضل تعرض "مستني" حتى بعد التجهيز
          doneStations: (o.doneStations && typeof o.doneStations === 'object')
            ? { kitchen: o.doneStations.kitchen === true, bar: o.doneStations.bar === true } : {},
        };
        if (mode === 'sales') {
          safe.price = Number(o.price) || 0;
          safe.total = Number(o.total) || 0;
          safe.deliveredBy = String(o.deliveredBy || '');
        }
        return safe;
      });
  }

  // المطبخ: الوصفات والخامات والمنيو وعدد الجاهز وأصناف الحفلات. من غير أسعار ولا مبيعات ولا مصروفات ولا مشتريات.
  function kitchenSafeState(payload: any) {
    return {
      ...blankState(payload),
      recipes: payload?.recipes && typeof payload.recipes === 'object' ? payload.recipes : {},
      drinkNames: Array.isArray(payload?.drinkNames) ? payload.drinkNames : [],
      inventory: Array.isArray(payload?.inventory) ? payload.inventory : [],
      readyStock: payload?.readyStock && typeof payload.readyStock === 'object' ? payload.readyStock : {},
      menu: mapMenu(payload, false),
      partyMenu: mapPartyMenu(payload, 'kitchen'),
      partyOrders: mapPartyOrders(payload, 'kitchen'),
      partyStock: partyStockOf(payload),
    };
  }

  // المبيعات: أسماء الأصناف والمنيو للبيع وعدد الجاهز وأصناف الحفلات ومخزونها. سجل الفواتير مش بيتبعت خالص.
  function salesSafeState(payload: any) {
    const recipeNames: Record<string, never[]> = {};
    for (const n of Object.keys(payload?.recipes ?? {})) recipeNames[n] = [];
    return {
      ...blankState(payload),
      recipes: recipeNames,
      drinkNames: Array.isArray(payload?.drinkNames) ? payload.drinkNames : [],
      readyStock: payload?.readyStock && typeof payload.readyStock === 'object' ? payload.readyStock : {},
      menu: mapMenu(payload, true),
      drinkOrders: drinkOrdersOf(payload, 'sales'),
      inventory: [],
      partyMenu: mapPartyMenu(payload, 'sales'),
      partyOrders: mapPartyOrders(payload, 'sales'),
      partyStock: partyStockOf(payload),
    };
  }

  // طلبات المشروبات: المبيعات بيشوفوا الكل (آخر 50)، الباريستا بيشوف المنتظر بس
  function drinkOrdersOf(payload: any, mode: 'sales' | 'barista') {
    const rows = Array.isArray(payload?.drinkOrders) ? payload.drinkOrders : [];
    return rows
      .filter((o: any) => o && typeof o === 'object' && (mode === 'sales' || o.status === 'pending'))
      .slice(-50)
      .map((o: any) => ({
        id: String(o.id || ''), name: String(o.name || ''), qty: Number(o.qty) || 0,
        status: String(o.status || 'pending'), by: String(o.by || ''), at: String(o.at || ''),
        note: String(o.note || ''), preparedAt: String(o.preparedAt || ''),
      }));
  }

  // الباريستا: وصفات المشروبات بس (من غير أسعار)، وأرصدة الخامات، وطلبات المشروبات المنتظرة
  function baristaSafeState(payload: any) {
    const drinkNames = Array.isArray(payload?.drinkNames) ? payload.drinkNames.map((n: any) => String(n)) : [];
    const drinkSet = new Set(drinkNames);
    const recipes: Record<string, any[]> = {};
    for (const [n, comps] of Object.entries(payload?.recipes ?? {})) {
      if (drinkSet.has(n) && Array.isArray(comps)) {
        recipes[n] = (comps as any[]).map((c) => ({
          name: String(c?.name ?? ''), qty: Number(c?.qty) || 0, unit: String(c?.unit ?? ''), time: c?.time ?? null,
        }));
      }
    }
    return {
      ...blankState(payload),
      recipes,
      drinkNames,
      inventory: Array.isArray(payload?.inventory)
        ? payload.inventory.map((x: any) => ({ name: String(x?.name ?? ''), unit: String(x?.unit ?? ''), qty: Number(x?.qty) || 0 }))
        : [],
      drinkOrders: drinkOrdersOf(payload, 'barista'),
      partyOrders: mapPartyOrders(payload, 'barista'),
    };
  }

  try {
    const body = await req.json();
    const action = String(body?.action || '');

    if (action === 'list_employees') {
      const { data, error } = await admin.from('pastrymy_employees')
        .select('display_name').eq('active', true).order('display_name');
      if (error) throw error;
      return respond({ employees: (data || []).map((x) => x.display_name) });
    }

    if (action === 'verify_employee') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      return respond({ ok: true, actor_name: result.employee.display_name, role: result.employee.role });
    }

    if (action === 'get_state' || action === 'get_audit') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (action === 'get_audit' && result.employee.role !== 'admin') return respond({ error: 'ROLE_FORBIDDEN' }, 403);

      if (action === 'get_state') {
        const { data, error } = await admin.from('pastrymy_app_state')
          .select('payload,revision,updated_at,updated_by').eq('id', 1).maybeSingle();
        if (error) throw error;
        const role = result.employee.role;
        const state = role === 'barista'
          ? (data?.payload ? baristaSafeState(data.payload) : null)
          : role === 'kitchen'
          ? (data?.payload ? kitchenSafeState(data.payload) : null)
          : role === 'sales'
            ? (data?.payload ? salesSafeState(data.payload) : null)
            : (data?.payload ?? null);
        return respond({ state, revision: data?.revision ?? 0, updated_at: data?.updated_at ?? null, role });
      }

      const { data, error } = await admin.from('pastrymy_audit_log')
        .select('id,actor_name,action,revision,changed_at,client_note')
        .order('changed_at', { ascending: false }).limit(100);
      if (error) throw error;
      return respond({ entries: data || [] });
    }

    // ===== حفظ الأوردرات فقط (المطبخ والبار): ما بيلمسش المخزون أو الأسعار أو الوصفات =====
    if (action === 'save_orders') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['kitchen', 'barista', 'admin'].includes(result.employee.role)) {
        return respond({ error: 'ROLE_FORBIDDEN', message: 'صلاحية حفظ الأوردرات غير متاحة لهذا الموظف.' }, 403);
      }
      if (!Array.isArray(body?.orders)) return respond({ error: 'INVALID_REQUEST' }, 400);
      const orders: any[] = body.orders.filter((x: any) => x && typeof x === 'object' && !Array.isArray(x));

      for (let attempt = 0; attempt < 4; attempt++) {
        const cur = await readStateOf(admin);
        const current = cur?.payload ?? null;
        if (!current || typeof current !== 'object') return respond({ error: 'STATE_MISSING' }, 500);
        // ناخد الحالة الحالية من السيرفر ونغيّر الأوردرات بس
        const { data, error } = await admin.rpc('pastrymy_save_orders', {
          p_orders: orders,
          p_role: result.employee.role,
          p_employee_name: result.employee.display_name,
          p_auth_user_id: userId,
          p_expected_revision: cur?.revision ?? 0,
        });
        if (error) {
          const msg = String(error.message || '');
          if (msg.includes('REVISION_CONFLICT')) continue;
          if (msg.includes('INVALID_EMPLOYEE_PIN')) return respond({ error: 'INVALID_EMPLOYEE_PIN' }, 403);
          if (msg.includes('STATE_TOO_LARGE')) return respond({ error: 'STATE_TOO_LARGE' }, 413);
          // خطأ غير متوقع من قاعدة البيانات: نسجّله ونرجّع رسالته للتشخيص
          console.error('save_orders RPC error', msg, error);
          return respond({ error: 'RPC_ERROR', message: 'تعذر حفظ الأوردرات على الخادم، حاول مرة أخرى.' }, 500);
        }
        return respond({
          ok: true,
          ...(data || {}),
          revision: (data && data.revision) ?? (cur?.revision ?? 0) + 1,
          orders_count: orders.length,
        });
      }
      return respond({ error: 'REVISION_CONFLICT', message: 'حصل تعارض في الحفظ، حاول مرة تانية.' }, 409);
    }

    // ===== حفظ الحالة الكاملة (المدير): دمج مع اللي على السيرفر، من غير ما يمسح تعديلات غيره =====
    // الحماية: الدمج (3-way merge) + الكتابة الشرطية على revision اللي اتقرأ جوه الحلقة.
    if (action === 'save_state') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (result.employee.role !== 'admin') {
        return respond({ error: 'ROLE_FORBIDDEN', message: 'حفظ الحالة الكاملة متاح للمدير فقط.' }, 403);
      }
      const state = body?.state;
      if (!state || typeof state !== 'object' || Array.isArray(state)) return respond({ error: 'INVALID_REQUEST' }, 400);
      const base = body?.base_state && typeof body.base_state === 'object' && !Array.isArray(body.base_state)
        ? body.base_state : null;

      for (let attempt = 0; attempt < 4; attempt++) {
        const cur = await readStateOf(admin);
        const current = cur?.payload ?? null;
        // لو الجهاز ما عندوش نسخة أساس، بنحفظ زي ما هو (السلوك القديم)
        const merged: any = current && base ? mergeStates(base, state, current) : { ...state };
        merged.invoiceSeq = Math.max(seqOf(state), seqOf(current));
        merged.drinkInvoiceSeq = Math.max(drinkSeqOf(state), drinkSeqOf(current));
        // إزالة الحقول القديمة فقط، مع إبقاء سجل أوردرات الحفلات الخادمي وعدم السماح لنسخة جهاز قديمة بمسحه.
        delete merged.parties;
        // أصناف الحفلات بتتحفظ في menu بنوع party (الكلاينت ما بيبعتش partyMenu)، فنشتق منها partyMenu.
        // والأصناف اللي اتعرّفت تلقائي من أوردرات التحويل (auto) بتفضل حتى لو مش في المنيو.
        const menuPartyRows = (Array.isArray(merged.menu) ? merged.menu : [])
          .filter((x: any) => x && x.kind === 'party' && typeof x.name === 'string' && x.name)
          .map((x: any) => ({ ...x, kind: 'party', active: x.active !== false, soldOut: x.soldOut === true }));
        const prevParty: any[] = Array.isArray(merged.partyMenu) ? merged.partyMenu
          : (Array.isArray(current?.partyMenu) ? current.partyMenu : []);
        const menuNames = new Set(menuPartyRows.map((x: any) => x.name));
        const autoKept = prevParty.filter((x: any) => x && x.auto === true && !menuNames.has(x.name));
        const derivedParty = [...menuPartyRows, ...autoKept];
        if (derivedParty.length) merged.partyMenu = derivedParty;
        merged.partyOrders = Array.isArray(current?.partyOrders) ? current.partyOrders : (Array.isArray(merged.partyOrders) ? merged.partyOrders : []);
        if (Array.isArray(merged.salesLog)) merged.salesLog = merged.salesLog.filter((x: any) => !(x && x.source === 'parties'));
        // حماية: ممنوع الحفظ لو المنيو أو أصناف الحفلات اتمسحوا كلهم فجأة (غالباً نسخة قديمة أو فاضية من جهاز)
        const curMenuCount = Array.isArray(current?.menu) ? current.menu.length : 0;
        const newMenuCount = Array.isArray(merged?.menu) ? merged.menu.length : 0;
        if (curMenuCount > 0 && newMenuCount === 0) {
          return respond({ error: 'MENU_WIPE_BLOCKED', message: 'تم منع الحفظ: المنيو هيبقى فاضي. اعمل تحديث للصفحة أو استرجع نسخة احتياطية.' }, 409);
        }
        const curPartyCount = Array.isArray(current?.partyMenu) ? current.partyMenu.length : 0;
        const newPartyCount = Array.isArray(merged?.partyMenu) ? merged.partyMenu.length : 0;
        if (curPartyCount > 0 && newPartyCount === 0) {
          return respond({ error: 'MENU_WIPE_BLOCKED', message: 'تم منع الحفظ: أصناف الحفلات هتبقى فاضية. اعمل تحديث للصفحة أو استرجع نسخة احتياطية.' }, 409);
        }

        const { data, error } = await admin.rpc('pastrymy_save_state', {
          p_state: merged, p_employee_name: result.employee.display_name, p_pin: result.pin,
          p_auth_user_id: userId, p_expected_revision: cur?.revision ?? 0,
        });
        if (error) {
          const msg = String(error.message || '');
          if (msg.includes('REVISION_CONFLICT')) continue; // حد كتب في نفس اللحظة: نعيد الدمج
          if (msg.includes('INVALID_EMPLOYEE_PIN')) return respond({ error: 'INVALID_EMPLOYEE_PIN' }, 403);
          if (msg.includes('STATE_TOO_LARGE')) return respond({ error: 'STATE_TOO_LARGE' }, 413);
          throw error;
        }
        return respond({
          ok: true,
          ...(data || {}),
          revision: (data && data.revision) ?? (cur?.revision ?? 0) + 1,
          state: merged,
        });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== تأكيد الإنتاج: خصم الخامات + زيادة القطع الجاهزة =====
    if (action === 'confirm_production') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'kitchen'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      if (!Array.isArray(body?.orders) || !body.orders.length) return respond({ error: 'INVALID_ORDERS' }, 400);

      // معرّف الطلب: أي نص معقول مقبول (ولو مش موجود نولّد واحد) بدل شرط UUID صارم كان بيرفض الطلب
      const requestId = String(body?.request_id || '').trim() || crypto.randomUUID();
      if (requestId.length > 100) return respond({ error: 'INVALID_REQUEST_ID' }, 400);

      return await runProduction({
        orders: body.orders,
        ready: body?.ready ?? null,
        requestId,
        employeeName: result.employee.display_name,
        pin: result.pin,
        actor: result.employee.display_name,
      });
    }

    // ===== إغلاق الفاتورة يدويًا: المبيعات أو الأدمن فقط، دون أي خصم مخزون =====
    if (action === 'close_invoice') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'sales'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const receiptId = String(body?.receipt_id || '').trim();
      if (!receiptId || receiptId.length > 100) return respond({ error: 'INVALID_RECEIPT_ID' }, 400);
      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const oldLines = Array.isArray(payload.salesLog) ? payload.salesLog : [];
        const linked = oldLines.filter((x: any) => x && x.receiptId === receiptId);
        if (!linked.length) return respond({ error: 'INVOICE_NOT_FOUND', message: 'الفاتورة غير موجودة.' }, 404);
        if (linked.every((x: any) => x.invoiceStatus === 'closed')) {
          return respond({ ok: true, duplicate: true, revision: cur.revision, receipt_id: receiptId, status: 'closed' });
        }
        const now = new Date().toISOString();
        const by = result.employee.display_name;
        const salesLog = oldLines.map((x: any) => x && x.receiptId === receiptId
          ? { ...x, invoiceStatus: 'closed', invoiceClosedAt: now, invoiceClosedBy: by }
          : x);
        const newRevision = Number(cur.revision || 0) + 1;
        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({ payload: { ...payload, salesLog }, revision: newRevision, updated_at: now, updated_by: userId })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue;
        const no = linked[0]?.receiptNo ?? '';
        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: by, action: 'invoice_manually_closed', revision: newRevision, auth_user_id: userId,
          client_note: `إغلاق يدوي للفاتورة ${no ? '#' + no : receiptId} · دون خصم مخزون`
        });
        if (auditErr) console.error('PastryMY invoice close audit failed', auditErr);
        return respond({ ok: true, revision: newRevision, receipt_id: receiptId, receipt_no: no, status: 'closed', closed_by: by, closed_at: now, inventoryDeducted: false });
      }
      return respond({ error: 'BUSY', message: 'الفاتورة اتغيرت من جهاز آخر. حدّث البيانات وحاول مرة أخرى.' }, 409);
    }

    // ===== إتمام السلة: فاتورة واحدة بكل الأصناف (بدون تعارض مع أجهزة تانية) =====
    // التعارض بيتمنع بالكتابة الشرطية على revision (.eq('revision')) بدل رفض الفاتورة.
    if (action === 'checkout_cart') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'sales'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const isAdmin = result.employee.role === 'admin';

      const cartIn = body?.cart;
      if (!Array.isArray(cartIn) || cartIn.length === 0 || cartIn.length > 50) {
        return respond({ error: 'INVALID_CART', message: 'السلة فاضية أو فيها أكتر من 50 صنف.' }, 400);
      }
      const cart: { name: string; qty: number }[] = [];
      for (const c of cartIn) {
        const name = String(c?.name ?? '').trim();
        const qty = Number(c?.qty);
        if (!name || name.length > 200 || !Number.isInteger(qty) || qty <= 0 || qty > 999) {
          return respond({ error: 'INVALID_CART', message: 'كمية صنف في السلة غير صحيحة.' }, 400);
        }
        cart.push({ name, qty });
      }
      const note = String(body?.note ?? '').trim().slice(0, 300);
      const customerPhone = cleanPhone(body?.customer_phone);
      const checkoutRequestId = String(body?.request_id || crypto.randomUUID());
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutRequestId)) {
        return respond({ error: 'INVALID_REQUEST_ID', message: 'معرّف محاولة البيع غير صحيح.' }, 400);
      }

      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const menu = Array.isArray(payload.menu) ? payload.menu : [];
        const salesOld = Array.isArray(payload.salesLog) ? payload.salesLog : [];
        // إعادة نفس طلب البيع بعد انقطاع الاتصال تُرجع الفاتورة الموجودة بدل إنشاء فاتورة مكررة.
        const priorLines = salesOld.filter((x: any) => x && x.checkoutRequestId === checkoutRequestId);
        if (priorLines.length) {
          const first: any = priorLines[0];
          const priorTotal = priorLines.reduce((sum: number, x: any) => sum + (Number(x.revenue) || 0), 0);
          const priorOpen = priorLines.some((x: any) => x.invoiceStatus === 'open');
          return respond({ ok: true, duplicate: true, revision: cur.revision, receipt: {
            id: first.receiptId, no: first.receiptNo, date: first.date, by: first.by, note: first.note || '',
            customerPhone: first.customerPhone || '', total: priorTotal, status: priorOpen ? 'open' : 'closed', lines: isAdmin ? priorLines : priorLines.map(publicLine)
          }});
        }
        const readyCount: Record<string, number> = { ...(payload.readyStock || {}) };
        const drinkOrdersOld = Array.isArray(payload.drinkOrders) ? payload.drinkOrders : [];
        const newDrinkOrders: any[] = [];
        // الفاتورة ممكن تكون أكل ومشروبات مع بعض. كل سطر بياخد مجموعته (أكل/مشروب) عشان التقارير.
        // الفاتورة اللي كلها مشروبات بتاخد رقم فاتورة المشروبات، والمختلطة بتاخد رقم فاتورة الأكل.
        const drinkNames = drinkNamesOf(payload);
        const flags = cart.map((c) => drinkNames.has(c.name));
        const isDrinkSale = flags.length > 0 && flags.every((f) => f);
        const receiptNo = (isDrinkSale ? drinkSeqOf(payload) : seqOf(payload)) + 1;
        const receiptId = crypto.randomUUID();
        const now = new Date();
        const date = now.toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' });
        const at = now.toISOString();
        const by = result.employee.display_name;

        const lines: any[] = [];
        for (const c of cart) {
          const item = menu.find((x: any) => x && x.name === c.name && x.active !== false);
          if (!item) {
            return respond({ error: 'MENU_ITEM_NOT_FOUND', message: `الصنف «${c.name}» مش موجود في المنيو. شيله من السلة وأعد المحاولة.` }, 409);
          }
          if (item.soldOut) {
            return respond({ error: 'ITEM_SOLD_OUT', message: `الصنف «${c.name}» خلص حالياً. شيله من السلة.` }, 409);
          }
          if (!payload.recipes || !Object.prototype.hasOwnProperty.call(payload.recipes, c.name)) {
            return respond({ error: 'RECIPE_NOT_FOUND', message: `الصنف «${c.name}» مش موجود في الوصفات.` }, 409);
          }
          const price = Number(item.price) || 0;
          const onDemand = item.kind === 'drink' && item.onDemand === true;
          const haveReady = Number(readyCount[c.name]) || 0;
          if (!onDemand) {
            if (haveReady < c.qty) {
              return respond({ error: 'READY_SHORT', available: haveReady, message: readyMsg(c.name, haveReady, c.qty) }, 409);
            }
            readyCount[c.name] = haveReady - c.qty;
          } else {
            if (!drinkNames.has(c.name)) {
              return respond({ error: 'INVALID_DRINK_ORDER', message: `المشروب «${c.name}» مش مسجل ضمن مشروبات التحضير عند الطلب.` }, 409);
            }
            newDrinkOrders.push({
              id: crypto.randomUUID(), name: c.name, qty: c.qty, note: note.slice(0, 200),
              status: 'pending', by, at: date, receiptId, receiptNo, checkoutRequestId
            });
          }
          const cost = recipeUnitCost(payload, c.name);
          lines.push({
            date, name: c.name, qty: c.qty,
            unitPrice: price, revenue: c.qty * price,
            unitCostAtSale: cost.unitCost,
            costAtSale: cost.unitCost === null ? null : c.qty * cost.unitCost,
            unpricedComponents: cost.unknown.length,
            note, customerPhone, by, at, receiptId, receiptNo, checkoutRequestId,
            onDemand,
            invoiceStatus: 'open',
            group: drinkNames.has(c.name) ? 'drink' : 'food',
          });
        }

        // كل فاتورة تظل مفتوحة حتى يضغط المبيعات أو الأدمن على إغلاق الفاتورة يدويًا.
        const total = lines.reduce((s, l) => s + l.revenue, 0);
        const totalCost = lines.every((l) => l.costAtSale !== null)
          ? lines.reduce((s, l) => s + l.costAtSale, 0)
          : null;
        const newRevision = (cur.revision ?? 0) + 1;

        const seqField = isDrinkSale ? { drinkInvoiceSeq: receiptNo } : { invoiceSeq: receiptNo };
        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({
            payload: { ...payload, salesLog: [...salesOld, ...lines], drinkOrders: [...newDrinkOrders, ...drinkOrdersOld], ...seqField, readyStock: readyCount },
            revision: newRevision,
            updated_at: now.toISOString(),
            updated_by: userId,
          })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue; // حد كتب في نفس اللحظة: نقرأ تاني ونحاول

        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: by, action: 'checkout_cart', revision: newRevision,
          client_note: `فاتورة ${receiptNo} · ${lines.length} صنف · ${total} · مفتوحة بانتظار الإغلاق اليدوي`,
        });
        if (auditErr) console.error('PastryMY audit insert failed', auditErr);

        return respond({
          ok: true,
          revision: newRevision,
          receipt: {
            id: receiptId, no: receiptNo, date, by, note, customerPhone, total,
            status: 'open',
            cost: isAdmin ? totalCost : undefined,
            lines: isAdmin ? lines : lines.map(publicLine),
          },
        });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== دورة أوردرات الحفلات: إنشاء، تأكيد تجهيز، وتأكيد تسليم =====
    if (action === 'party_order_action') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      const partyAction = String(body?.party_action || '');
      const allowed = partyAction === 'create' ? ['admin', 'sales']
        : partyAction === 'produce' ? (String(body?.station || '') === 'bar' ? ['admin', 'barista'] : ['admin', 'kitchen'])
        : partyAction === 'deliver' ? ['admin', 'sales'] : [];
      if (!allowed.length) return respond({ error: 'INVALID_PARTY_ACTION' }, 400);
      if (!allowed.includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      let requestId: string | null = null;
      if (partyAction === 'produce') {
        requestId = String(body?.request_id || '');
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
          return respond({ error: 'INVALID_REQUEST_ID' }, 400);
        }
      }
      // المحطة كانت بتتبعت من الواجهة لكن ما كانتش بتوصل لقاعدة البيانات (السبب في INVALID_STATION)
      let produceOrder: Record<string, unknown> = {};
      if (partyAction === 'produce') {
        const station = String(body?.station || '');
        if (station !== 'kitchen' && station !== 'bar') {
          return respond({ error: 'INVALID_STATION', message: 'محطة التجهيز غير صحيحة.' }, 400);
        }
        produceOrder = { station };
      }
      // أوردر الإنشاء: لو الصنف مش موجود كصنف حفلة وجاي معاه اسم الصنف الأصلي (base_name)،
      // السيرفر بيعرّفه كصنف حفلة بوصفة الصنف الأصلي نفسه، ويحفظه في أصناف الحفلات قبل الأوردر.
      if (partyAction === 'create') {
        const ordName = String((body?.order && body.order.name) || '');
        const baseName = String((body?.order && body.order.base_name) || '');
        const isPartyNow = (pl: any[]) => pl.find((x: any) => x && x.name === ordName && x.active !== false);
        let found = false;
        for (let attempt = 0; attempt < 3 && !found; attempt++) {
          const curState = await readStateOf(admin);
          const curPayload: any = curState?.payload && typeof curState.payload === 'object' ? curState.payload : {};
          const partyList: any[] = Array.isArray(curPayload.partyMenu) ? curPayload.partyMenu : [];
          if (isPartyNow(partyList)) { found = true; break; }
          const menuList: any[] = Array.isArray(curPayload.menu) ? curPayload.menu : [];
          const base = baseName ? menuList.find((x: any) => x && x.name === baseName) : null;
          if (!base || !baseName) {
            const onMenu = menuList.find((x: any) => x && x.name === ordName);
            if (onMenu && onMenu.kind !== 'party') {
              return respond({ error: 'NOT_PARTY_ITEM', message: `«${ordName}» صنف منيو عادي مش صنف حفلة، ومينفعش يتسجل كحجز حفلة.` }, 409);
            }
            return respond({ error: 'PARTY_ITEM_NOT_FOUND', message: `صنف الحفلة «${ordName}» غير موجود أو غير متاح في المنيو.` }, 409);
          }
          const recipes = curPayload.recipes && typeof curPayload.recipes === 'object' ? curPayload.recipes : {};
          if (!Object.prototype.hasOwnProperty.call(recipes, baseName)) {
            return respond({ error: 'RECIPE_NOT_FOUND', message: `مفيش وصفة إنتاج للصنف «${baseName}».` }, 409);
          }
          const defined = {
            name: ordName, price: Number(base.price) || 0, image: '', unit: '', soldOut: false,
            kind: 'party', parts: [{ name: baseName, qty: 1 }], active: true, auto: true,
          };
          const nextPayload = { ...curPayload, partyMenu: [...partyList.filter((x: any) => x && x.name !== ordName), defined] };
          const { error: saveErr } = await admin.rpc('pastrymy_save_state', {
            p_state: nextPayload, p_employee_name: result.employee.display_name, p_pin: result.pin,
            p_auth_user_id: userId, p_expected_revision: curState?.revision ?? 0,
          });
          if (saveErr) {
            if (String(saveErr.message || '').includes('REVISION_CONFLICT')) continue;
            console.error('define party item failed', saveErr);
            return respond({ error: 'RPC_ERROR', message: 'تعذر تعريف صنف الحفلة على السحابة.' }, 500);
          }
          found = true;
        }
        if (!found) return respond({ error: 'BUSY', message: 'السحابة مشغولة، حاول مرة تانية.' }, 409);
      }
      const { data, error } = await admin.rpc('pastrymy_party_order_action', {
        p_action: partyAction,
        p_order: partyAction === 'produce' ? produceOrder : (body?.order && typeof body.order === 'object' ? body.order : {}),
        p_order_id: String(body?.order_id || ''),
        p_employee_name: result.employee.display_name,
        p_pin: result.pin,
        p_auth_user_id: userId,
        p_request_id: requestId,
      });
      if (error) {
        const msg = String(error.message || '');
        if (msg.includes('INVALID_EMPLOYEE_PIN')) return respond({ error: 'INVALID_EMPLOYEE_PIN' }, 403);
        if (msg.includes('ROLE_FORBIDDEN')) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
        if (msg.includes('PARTY_ITEM_NOT_FOUND')) return respond({ error: 'PARTY_ITEM_NOT_FOUND', message: 'صنف الحفلة غير موجود أو غير متاح في المنيو.' }, 409);
        if (msg.includes('RECIPE_NOT_FOUND')) return respond({ error: 'RECIPE_NOT_FOUND', message: 'إحدى الوصفات المطلوبة غير موجودة على الخادم.' }, 409);
        if (msg.includes('INSUFFICIENT_STOCK')) return respond({ error: 'INSUFFICIENT_STOCK', message: 'الخامات لا تكفي لتجهيز هذا الأوردر. لم يتم اعتماد التجهيز.' }, 409);
        if (msg.includes('PARTY_ORDER_NOT_FOUND')) return respond({ error: 'PARTY_ORDER_NOT_FOUND', message: 'الأوردر غير موجود على الخادم.' }, 404);
        if (msg.includes('PARTY_ORDER_STATUS')) return respond({ error: 'PARTY_ORDER_STATUS', message: 'حالة الأوردر لا تسمح بتنفيذ هذه الخطوة.' }, 409);
        if (msg.includes('INVALID_PARTY_ORDER')) return respond({ error: 'INVALID_PARTY_ORDER', message: 'بيانات الأوردر غير صحيحة.' }, 400);
        // خطأ غير متوقع من قاعدة البيانات: نسجّله ونرجّع رسالته عشان تظهر للمدير (ولازم تتشال بعد التشخيص)
        console.error('party_order_action RPC error', partyAction, msg, error);
        return respond({ error: 'RPC_ERROR', message: 'تعذر تنفيذ العملية على الخادم، حاول مرة أخرى.' }, 500);
      }
      return respond(data || { ok: true });
    }

    // ===== طلبات المشروبات: المبيعات بتعمل طلب، والباريستا بيحضّر ويتخصم الخامات =====
    if (action === 'drink_order_action') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      const drinkAction = String(body?.drink_action || '');
      const allowed = drinkAction === 'create' ? ['admin', 'sales']
        : drinkAction === 'prepare' ? ['admin', 'barista'] : [];
      if (!allowed.length) return respond({ error: 'INVALID_DRINK_ACTION' }, 400);
      if (!allowed.includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);

      let order: Record<string, unknown> = {};
      let requestId: string | null = null;
      if (drinkAction === 'create') {
        const raw = body?.order && typeof body.order === 'object' ? body.order : {};
        const name = String(raw.name || '').trim();
        const qty = Number(raw.qty);
        if (!name || !Number.isInteger(qty) || qty < 1 || qty > 50) {
          return respond({ error: 'INVALID_DRINK_ORDER', message: 'اختر مشروبًا وعدد صحيح من 1 لـ 50.' }, 400);
        }
        order = { name, qty, note: String(raw.note || '').slice(0, 200) };
      }
      if (drinkAction === 'prepare') {
        requestId = String(body?.request_id || '');
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
          return respond({ error: 'INVALID_REQUEST_ID' }, 400);
        }
      }
      const { data, error } = await admin.rpc('pastrymy_drink_order_action', {
        p_action: drinkAction,
        p_order: order,
        p_order_id: String(body?.order_id || ''),
        p_employee_name: result.employee.display_name,
        p_pin: result.pin,
        p_auth_user_id: userId,
        p_request_id: requestId,
      });
      if (error) {
        const msg = String(error.message || '');
        if (msg.includes('INVALID_EMPLOYEE_PIN')) return respond({ error: 'INVALID_EMPLOYEE_PIN' }, 403);
        if (msg.includes('ROLE_FORBIDDEN')) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
        if (msg.includes('RECIPE_NOT_FOUND')) return respond({ error: 'RECIPE_NOT_FOUND', message: 'وصفة المشروب غير موجودة على الخادم.' }, 409);
        if (msg.includes('INSUFFICIENT_STOCK')) return respond({ error: 'INSUFFICIENT_STOCK', message: 'الخامات لا تكفي لتحضير الطلب. لم يتم خصم أي خامة.' }, 409);
        if (msg.includes('DRINK_ORDER_NOT_FOUND')) return respond({ error: 'DRINK_ORDER_NOT_FOUND', message: 'الطلب غير موجود على الخادم.' }, 404);
        if (msg.includes('DRINK_ORDER_STATUS')) return respond({ error: 'DRINK_ORDER_STATUS', message: 'حالة الطلب لا تسمح بهذه الخطوة.' }, 409);
        if (msg.includes('INVALID_DRINK_ORDER')) return respond({ error: 'INVALID_DRINK_ORDER', message: 'بيانات الطلب غير صحيحة.' }, 400);
        throw error;
      }
      return respond(data || { ok: true });
    }

    // ===== إنتاج المشروبات: الباريستا (أو المدير) بيسجّل مشروب متحضّر، فيتخصم الخامات ويبقى متاح في المنيو =====
    if (action === 'drink_produce') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'barista'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const name = String(body?.name ?? '').trim();
      const qty = Number(body?.qty);
      if (!name || name.length > 200 || !Number.isInteger(qty) || qty < 1 || qty > 50) {
        return respond({ error: 'INVALID_DRINK_PRODUCTION', message: 'اختر مشروبًا وعدد صحيح من 1 لـ 50.' }, 400);
      }
      const requestId = String(body?.request_id || '').trim() || crypto.randomUUID();
      if (requestId.length > 100) return respond({ error: 'INVALID_REQUEST_ID' }, 400);

      // نتأكد إن الصنف فعلاً مشروب
      const curCheck = await readStateOf(admin);
      if (!curCheck) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
      const payloadCheck = curCheck.payload && typeof curCheck.payload === 'object' ? curCheck.payload : {};
      if (!drinkNamesOf(payloadCheck).has(name)) {
        return respond({ error: 'NOT_A_DRINK', message: 'الصنف ده مش مشروب من وصفات المشروبات.' }, 400);
      }

      return await runProduction({
        orders: [{ name, qty }],
        ready: { [name]: qty },
        requestId,
        employeeName: result.employee.display_name,
        pin: result.pin,
        actor: result.employee.display_name,
      });
    }

    // ===== بيع أصناف الحفلات القديمة: مخزون منفصل؛ محفوظ للتوافق مع الفواتير السابقة =====
    if (action === 'checkout_party') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'sales'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const isAdmin = result.employee.role === 'admin';

      const cartIn = body?.cart;
      if (!Array.isArray(cartIn) || cartIn.length === 0 || cartIn.length > 50) {
        return respond({ error: 'INVALID_CART', message: 'السلة فاضية أو فيها أكتر من 50 صنف.' }, 400);
      }
      const cart: { name: string; qty: number }[] = [];
      for (const c of cartIn) {
        const name = String(c?.name ?? '').trim();
        const qty = Number(c?.qty);
        if (!name || name.length > 200 || !Number.isInteger(qty) || qty <= 0 || qty > 999) {
          return respond({ error: 'INVALID_CART', message: 'كمية صنف في السلة غير صحيحة.' }, 400);
        }
        cart.push({ name, qty });
      }
      const note = String(body?.note ?? '').trim().slice(0, 300);
      const customerPhone = cleanPhone(body?.customer_phone);

      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const partyMenu = Array.isArray(payload.partyMenu) ? payload.partyMenu : [];
        const salesOld = Array.isArray(payload.salesLog) ? payload.salesLog : [];
        const stock: Record<string, number> = partyStockOf(payload);
        const receiptNo = seqOf(payload) + 1;
        const receiptId = crypto.randomUUID();
        const now = new Date();
        const date = now.toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' });
        const at = now.toISOString();
        const by = result.employee.display_name;

        const lines: any[] = [];
        for (const c of cart) {
          const item = partyMenu.find((x: any) => x && x.name === c.name && x.active !== false);
          if (!item) {
            return respond({ error: 'PARTY_ITEM_NOT_FOUND', message: `الصنف «${c.name}» مش موجود في أصناف الحفلات. شيله من السلة وأعد المحاولة.` }, 409);
          }
          if (item.soldOut) {
            return respond({ error: 'ITEM_SOLD_OUT', message: `الصنف «${c.name}» خلص حالياً. شيله من السلة.` }, 409);
          }
          const have = Number(stock[c.name]) || 0;
          if (have < c.qty) {
            return respond({ error: 'PARTY_STOCK_SHORT', available: have, message: readyMsg(c.name, have, c.qty) }, 409);
          }
          stock[c.name] = have - c.qty;
          const price = Number(item.price) || 0;
          const cost = item.cost === null || item.cost === undefined ? null : (Number(item.cost) || 0);
          lines.push({
            date, name: c.name, qty: c.qty,
            unitPrice: price, revenue: c.qty * price,
            unitCostAtSale: cost,
            costAtSale: cost === null ? null : c.qty * cost,
            unpricedComponents: 0,
            note, customerPhone, by, at, receiptId, receiptNo, source: 'party',
          });
        }

        const total = lines.reduce((s, l) => s + l.revenue, 0);
        const totalCost = lines.every((l) => l.costAtSale !== null)
          ? lines.reduce((s, l) => s + l.costAtSale, 0)
          : null;
        const newRevision = (cur.revision ?? 0) + 1;

        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({
            payload: { ...payload, salesLog: [...salesOld, ...lines], invoiceSeq: receiptNo, partyStock: stock },
            revision: newRevision,
            updated_at: now.toISOString(),
            updated_by: userId,
          })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue;

        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: by, action: 'checkout_party', revision: newRevision,
          client_note: `فاتورة حفلات ${receiptNo} · ${lines.length} صنف · ${total}`,
        });
        if (auditErr) console.error('PastryMY audit insert failed', auditErr);

        return respond({
          ok: true,
          revision: newRevision,
          partyStock: partyStockOf({ partyStock: stock }),
          receipt: {
            id: receiptId, no: receiptNo, date, by, note, customerPhone, total,
            cost: isAdmin ? totalCost : undefined,
            lines: isAdmin ? lines : lines.map(publicLine),
          },
        });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== مخزون الحفلات: التصنيع (المدير والمطبخ) =====
    if (action === 'add_party_stock') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'kitchen'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const name = String(body?.name ?? '').trim();
      const qty = Number(body?.qty);
      if (!name || name.length > 200 || !Number.isInteger(qty) || qty <= 0 || qty > 100000) {
        return respond({ error: 'INVALID_REQUEST', message: 'بيانات التصنيع غير صحيحة.' }, 400);
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const partyMenu = Array.isArray(payload.partyMenu) ? payload.partyMenu : [];
        if (!partyMenu.some((x: any) => x && x.name === name)) {
          return respond({ error: 'PARTY_ITEM_NOT_FOUND', message: 'الصنف مش موجود في أصناف الحفلات.' }, 409);
        }
        const stock = partyStockOf(payload);
        stock[name] = (Number(stock[name]) || 0) + qty;
        const newRevision = (cur.revision ?? 0) + 1;
        const now = new Date();
        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({
            payload: { ...payload, partyStock: stock },
            revision: newRevision,
            updated_at: now.toISOString(),
            updated_by: userId,
          })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue;

        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: result.employee.display_name, action: 'add_party_stock', revision: newRevision,
          client_note: `${name} · +${qty}`,
        });
        if (auditErr) console.error('PastryMY audit insert failed', auditErr);
        return respond({ ok: true, revision: newRevision, partyStock: stock });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== تصحيح كمية مخزون الحفلات: المدير بس =====
    if (action === 'set_party_stock') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (result.employee.role !== 'admin') return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const name = String(body?.name ?? '').trim();
      const qty = Number(body?.qty);
      if (!name || name.length > 200 || !Number.isInteger(qty) || qty < 0 || qty > 100000) {
        return respond({ error: 'INVALID_REQUEST', message: 'الكمية لازم تكون رقم صحيح من 0 لـ 100000.' }, 400);
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const partyMenu = Array.isArray(payload.partyMenu) ? payload.partyMenu : [];
        if (!partyMenu.some((x: any) => x && x.name === name)) {
          return respond({ error: 'PARTY_ITEM_NOT_FOUND', message: 'الصنف مش موجود في أصناف الحفلات.' }, 409);
        }
        const stock = partyStockOf(payload);
        if (qty > 0) stock[name] = qty; else delete stock[name];
        const newRevision = (cur.revision ?? 0) + 1;
        const now = new Date();
        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({
            payload: { ...payload, partyStock: stock },
            revision: newRevision,
            updated_at: now.toISOString(),
            updated_by: userId,
          })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue;

        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: result.employee.display_name, action: 'set_party_stock', revision: newRevision,
          client_note: `${name} · = ${qty}`,
        });
        if (auditErr) console.error('PastryMY audit insert failed', auditErr);
        return respond({ ok: true, revision: newRevision, partyStock: partyStockOf({ partyStock: stock }) });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== تغيير حالة صنف الحفلات (خلص / متاح): المدير والمطبخ =====
    if (action === 'set_party_soldout') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'kitchen'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const name = String(body?.name ?? '').trim();
      if (!name || name.length > 200 || typeof body?.sold_out !== 'boolean') {
        return respond({ error: 'INVALID_REQUEST' }, 400);
      }
      const soldOut = body.sold_out === true;

      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const partyMenu = Array.isArray(payload.partyMenu) ? payload.partyMenu : [];
        const pos = partyMenu.findIndex((x: any) => x && x.name === name);
        if (pos === -1) return respond({ error: 'PARTY_ITEM_NOT_FOUND', message: 'الصنف مش موجود في أصناف الحفلات.' }, 409);

        const newMenu = partyMenu.map((x: any, i: number) => (i === pos ? { ...x, soldOut } : x));
        const newRevision = (cur.revision ?? 0) + 1;
        const now = new Date();
        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({
            payload: { ...payload, partyMenu: newMenu },
            revision: newRevision,
            updated_at: now.toISOString(),
            updated_by: userId,
          })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue;

        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: result.employee.display_name, action: 'set_party_soldout', revision: newRevision,
          client_note: `${name} · ${soldOut ? 'خلص' : 'متاح'}`,
        });
        if (auditErr) console.error('PastryMY audit insert failed', auditErr);

        return respond({ ok: true, revision: newRevision, name, soldOut });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== تغيير حالة الصنف (خلص / متاح): المدير والمطبخ =====
    if (action === 'set_menu_soldout') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'kitchen'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const name = String(body?.name ?? '').trim();
      if (!name || name.length > 200 || typeof body?.sold_out !== 'boolean') {
        return respond({ error: 'INVALID_REQUEST' }, 400);
      }
      const soldOut = body.sold_out === true;

      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await readStateOf(admin);
        if (!cur) return respond({ error: 'STATE_NOT_INITIALIZED' }, 409);
        const payload = cur.payload && typeof cur.payload === 'object' ? cur.payload : {};
        const menu = Array.isArray(payload.menu) ? payload.menu : [];
        const pos = menu.findIndex((x: any) => x && x.name === name);
        if (pos === -1) return respond({ error: 'MENU_ITEM_NOT_FOUND', message: 'الصنف مش موجود في المنيو.' }, 409);

        const newMenu = menu.map((x: any, i: number) => (i === pos ? { ...x, soldOut } : x));
        const newRevision = (cur.revision ?? 0) + 1;
        const now = new Date();
        const { data: upd, error: updErr } = await admin.from('pastrymy_app_state')
          .update({
            payload: { ...payload, menu: newMenu },
            revision: newRevision,
            updated_at: now.toISOString(),
            updated_by: userId,
          })
          .eq('id', 1).eq('revision', cur.revision).select('revision').maybeSingle();
        if (updErr) throw updErr;
        if (!upd) continue; // حد كتب في نفس اللحظة: نقرأ تاني ونحاول

        const { error: auditErr } = await admin.from('pastrymy_audit_log').insert({
          actor_name: result.employee.display_name, action: 'set_menu_soldout', revision: newRevision,
          client_note: `${name} · ${soldOut ? 'خلص' : 'متاح'}`,
        });
        if (auditErr) console.error('PastryMY audit insert failed', auditErr);

        return respond({ ok: true, revision: newRevision, name, soldOut });
      }
      return respond({ error: 'BUSY', message: 'السيرفر مشغول، جرّب تاني بعد لحظات.' }, 503);
    }

    // ===== رسايل المدير للموظفين =====
    if (action === 'send_message') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (result.employee.role !== 'admin') return respond({ error: 'ROLE_FORBIDDEN' }, 403);

      const to = String(body?.to ?? '').trim();
      const text = String(body?.body ?? '').trim();
      if (!to || to.length > 200 || !text || text.length > 2000) {
        return respond({ error: 'INVALID_REQUEST' }, 400);
      }
      if (to !== 'all') {
        const { data: target, error: targetErr } = await admin.from('pastrymy_employees')
          .select('display_name').eq('display_name', to).eq('active', true).maybeSingle();
        if (targetErr) throw targetErr;
        if (!target) return respond({ error: 'EMPLOYEE_NOT_FOUND', message: 'الموظف ده مش موجود.' }, 404);
      }

      const { error: insErr } = await admin.from('employee_messages').insert({
        to_employee: to,
        from_employee: result.employee.display_name,
        body: text,
      });
      if (insErr) throw insErr;
      return respond({ ok: true });
    }

    // ===== مسح الرسايل القديمة (أكتر من 48 ساعة): المدير بس، منفصل عن القراءة =====
    if (action === 'purge_old_messages') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (result.employee.role !== 'admin') return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { error: delErr } = await admin.from('employee_messages').delete().lt('created_at', cutoff);
      if (delErr) throw delErr;
      return respond({ ok: true });
    }

    // ===== الرسايل: آخر 48 ساعة بس (الفلترة في الاستعلام، والمسح بيتم في purge_old_messages) =====
    if (action === 'get_my_messages') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      const me = result.employee.display_name;
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data, error } = await admin.from('employee_messages')
        .select('id,from_employee,body,created_at,read_by')
        .in('to_employee', [me, 'all'])
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const messages = (data || [])
        .filter((m: any) => m.from_employee !== me)
        .map((m: any) => ({
          id: m.id,
          from_employee: m.from_employee,
          body: m.body,
          created_at: m.created_at,
          read: (m.read_by || []).includes(me),
        }));
      return respond({ messages });
    }

    // ===== تسجيل القراءة: بيضيف اسم الموظف لقايمة القارئين بشكل ذري (من غير ما يمسح قراءة حد تاني) =====
    if (action === 'mark_read') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      const me = result.employee.display_name;

      const id = String(body?.id ?? '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return respond({ error: 'INVALID_REQUEST' }, 400);
      }

      // الفحص ده لازم عشان الموظف ميقدرش يسجل قراءة على رسالة مش ليه
      const { data: row, error: rowErr } = await admin.from('employee_messages')
        .select('to_employee').eq('id', id).maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) return respond({ error: 'MESSAGE_NOT_FOUND' }, 404);
      if (row.to_employee !== me && row.to_employee !== 'all') return respond({ error: 'ROLE_FORBIDDEN' }, 403);

      const { error: rpcErr } = await admin.rpc('pastrymy_mark_message_read', { p_id: id, p_name: me });
      if (rpcErr) throw rpcErr;
      return respond({ ok: true });
    }

    // ===== الرسايل اللي المدير بعتها + أسماء اللي قروها =====
    if (action === 'get_sent_messages') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (result.employee.role !== 'admin') return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const me = result.employee.display_name;
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data, error } = await admin.from('employee_messages')
        .select('id,to_employee,body,created_at,read_by')
        .eq('from_employee', me)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const messages = (data || []).map((m: any) => {
        const readBy: string[] = Array.isArray(m.read_by) ? m.read_by : [];
        return {
          id: m.id,
          to_employee: m.to_employee,
          body: m.body,
          created_at: m.created_at,
          read: readBy.length > 0,
          read_by: readBy,
        };
      });
      return respond({ messages });
    }

    // ===== تحصيل الحفلة: تسجيل الدفعة ثم تسليم الأوردرات =====
    if (action === 'party_collect') {
      const result = await verifiedEmployee(body?.employee_name, body?.pin);
      if ('error' in result) return authFail(result);
      if (!['admin', 'sales'].includes(result.employee.role)) return respond({ error: 'ROLE_FORBIDDEN' }, 403);
      const ids: string[] = Array.isArray(body?.order_ids)
        ? body.order_ids.map((x: unknown) => String(x || '')).filter((x: string) => x.length > 0)
        : [];
      const amount = Math.round(Number(body?.amount) * 100) / 100;
      if (!ids.length || !(amount > 0)) {
        return respond({ error: 'INVALID_COLLECT', message: 'بيانات التحصيل غير صحيحة.' }, 400);
      }
      // 1) توزيع المبلغ على مجموعات الحجز (groupId): الـ RPC بيحسب المتبقي لكل مجموعة لوحدها،
      //    والحجز اللي في الواجهة ممكن يكون مكوّن من أكتر من مجموعة (كل إرسال ليه groupId).
      const st0 = await readStateOf(admin);
      const pl0: any = st0?.payload && typeof st0.payload === 'object' ? st0.payload : {};
      const allOrders: any[] = Array.isArray(pl0.partyOrders) ? pl0.partyOrders : [];
      const isLive = (o: any) => !!o && String(o.status || '') !== 'cancelled';
      const groupKeyOf = (o: any) => {
        const gid = String(o.groupId || '');
        return gid ? 'g:' + gid : 'o:' + String(o.id || '');
      };
      const selected = allOrders.filter((o: any) => o && ids.includes(String(o.id)));
      if (selected.length !== ids.length) {
        return respond({ error: 'PARTY_ORDER_NOT_FOUND', message: 'بعض أوردرات الحجز مش موجودة.' }, 404);
      }
      if (selected.some((o: any) => String(o.status || '') === 'pending')) {
        return respond({ error: 'ORDERS_NOT_READY', message: 'فيه أصناف في الحجز لسه مستنية التجهيز، ومينفعش يتحصّل ويتسلّم دلوقتي. استنى لحد ما تخلص.' }, 409);
      }
      const deliverIds: string[] = selected.filter((o: any) => String(o.status || '') === 'ready').map((o: any) => String(o.id));
      if (!deliverIds.length) {
        return respond({ error: 'NOTHING_TO_DELIVER', message: 'مفيش أصناف جاهزة للتسليم في الحجز ده.' }, 409);
      }
      const groups: { key: string; rep: string; remaining: number }[] = [];
      for (const o of selected) {
        const key = groupKeyOf(o);
        if (groups.some((g) => g.key === key)) continue;
        const members = allOrders.filter((x: any) => isLive(x) && groupKeyOf(x) === key);
        const total = members.reduce((a: number, x: any) => a + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
        const paid = members.reduce((a: number, x: any) => a + (Number(x.paid) || 0), 0);
        groups.push({ key, rep: String(o.id), remaining: Math.round((total - paid) * 100) / 100 });
      }
      const totalRemaining = groups.reduce((a, g) => a + Math.max(0, g.remaining), 0);
      if (amount > totalRemaining + 0.005) {
        return respond({ error: 'AMOUNT_EXCEEDS_TOTAL', message: 'المبلغ أكبر من المتبقي.' }, 409);
      }
      let left = amount;
      const plan: { rep: string; amt: number }[] = [];
      for (const g of groups) {
        const pay = Math.min(Math.max(0, g.remaining), left);
        if (pay > 0) {
          plan.push({ rep: g.rep, amt: Math.round(pay * 100) / 100 });
          left = Math.round((left - pay) * 100) / 100;
        }
      }
      // 2) تسجيل الدفعات (الـ RPC بيتأكد من المتبقي والـ PIN)
      for (const p of plan) {
        const pay = await admin.rpc('pastrymy_record_party_payment', {
          p_employee_name: result.employee.display_name,
          p_pin: result.pin,
          p_order_id: p.rep,
          p_amount: p.amt,
        });
        if (pay.error) {
          const msg = String(pay.error.message || '');
          if (msg.includes('INVALID_EMPLOYEE_PIN')) return respond({ error: 'INVALID_EMPLOYEE_PIN' }, 403);
          if (msg.includes('AMOUNT_EXCEEDS_TOTAL')) return respond({ error: 'AMOUNT_EXCEEDS_TOTAL', message: 'المبلغ أكبر من المتبقي.' }, 409);
          throw pay.error;
        }
      }
      // 3) تسليم كل أوردرات الحجز
      for (const id of deliverIds) {
        const del = await admin.rpc('pastrymy_party_order_action', {
          p_action: 'deliver',
          p_order: {},
          p_order_id: id,
          p_employee_name: result.employee.display_name,
          p_pin: result.pin,
          p_auth_user_id: userId,
          p_request_id: null,
        });
        if (del.error) {
          console.error('deliver failed', id, del.error);
          return respond({ error: 'DELIVER_FAILED', message: 'تم تحصيل المبلغ لكن تعذر تسليم بعض الأوردرات. راجع المدير.' }, 409);
        }
      }
      // نسجّل اسم اللي سلّم كل أوردر على الأوردر نفسه، عشان الفاتورة تعرضه من أي جهاز
      const deliverer = String(result.employee.display_name || '');
      for (let attempt = 0; attempt < 3; attempt++) {
        const st = await readStateOf(admin);
        const pl: any = st?.payload && typeof st.payload === 'object' ? st.payload : {};
        const orders: any[] = Array.isArray(pl.partyOrders) ? pl.partyOrders : [];
        let changed = false;
        const nextOrders = orders.map((o: any) => {
          if (o && deliverIds.includes(String(o.id)) && !o.deliveredBy) { changed = true; return { ...o, deliveredBy: deliverer }; }
          return o;
        });
        if (!changed) break;
        const { error: stampErr } = await admin.rpc('pastrymy_save_state', {
          p_state: { ...pl, partyOrders: nextOrders }, p_employee_name: deliverer, p_pin: result.pin,
          p_auth_user_id: userId, p_expected_revision: st?.revision ?? 0,
        });
        if (!stampErr) break;
        if (!String(stampErr.message || '').includes('REVISION_CONFLICT')) { console.error('stamp deliverer failed', stampErr); break; }
      }
      return respond({ ok: true, delivered: deliverIds.length, amount });
    }

    return respond({ error: 'UNKNOWN_ACTION' }, 400);
  } catch (e) {
    console.error('PastryMY API error', e);
    return respond({ error: 'SERVER_ERROR', message: 'تعذر تنفيذ العملية على الخادم. راجع سجلات Edge Function.' }, 500);
  }
});
