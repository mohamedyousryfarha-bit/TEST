// بيانات تجريبية للتشغيل الأول. مش بيانات حقيقية.
export function seedState() {
  return {
    ingredients: {
      flour: { unit: 'جرام', price: 0.04, stock: 1800, min: 800, daily: 260 },
      sugar: { unit: 'جرام', price: 0.03, stock: 2400, min: 900, daily: 300 },
      egg: { unit: 'بيضة', price: 5, stock: 60, min: 24, daily: 22 },
      butter: { unit: 'جرام', price: 0.11, stock: 500, min: 300, daily: 150 },
      cream: { unit: 'جرام', price: 0.09, stock: 900, min: 400, daily: 280 },
      cocoa: { unit: 'جرام', price: 0.12, stock: 220, min: 120, daily: 40 },
      milk: { unit: 'مل', price: 0.02, stock: 1500, min: 600, daily: 200 },
      honey: { unit: 'جرام', price: 0.08, stock: 260, min: 100, daily: 60 }
    },
    subs: {
      'شراب العسل': { yield: 300, items: [{ name: 'sugar', qty: 150 }, { name: 'honey', qty: 100 }, { name: 'milk', qty: 50 }] }
    },
    recipes: {
      'كاروت كيك': { yieldQty: 12, marginPct: 30, extraCost: 6, actualPrice: 0, category: 'كيك', stages: [
        { key: 'prep', items: [{ name: 'flour', qty: 250 }, { name: 'butter', qty: 100 }, { name: 'sugar', qty: 200 }] },
        { key: 'oven', tag: '180° · ٣٥ د', note: 'تُدهن الصينية وتُبطّن بورق الزبدة', items: [{ name: 'egg', qty: 4 }, { name: 'cocoa', qty: 30 }] },
        { key: 'stove', tag: 'هادية · ١٠ د', items: [{ sub: 'شراب العسل', qty: 60 }] },
        { key: 'fin', tag: 'بعد التبريد', items: [{ name: 'cream', qty: 300 }] }
      ]},
      'موس الفستق': { yieldQty: 8, marginPct: 40, extraCost: 0, actualPrice: 0, category: 'موس', stages: [
        { key: 'prep', items: [{ name: 'milk', qty: 200 }, { name: 'sugar', qty: 90 }] },
        { key: 'fin', tag: 'تبريد ساعتين', items: [{ name: 'cream', qty: 450 }, { name: 'honey', qty: 40 }] }
      ]}
    },
    finished: { 'كاروت كيك': 12, 'موس الفستق': 8 },
    batches: [],
    sales: [],
    customers: [{ id: 'c1', name: 'أحمد', phone: '' }],
    bookings: [],
    expenses: [{ name: 'إيجار المطبخ', amount: 900 }, { name: 'كهرباء وغاز', amount: 400 }, { name: 'عمالة', amount: 1200 }],
    ownerDraw: 800,
    employees: [
      { name: 'Admin', role: 'admin', pin: '1234' },
      { name: 'مطبخ', role: 'kitchen', pin: '1234' },
      { name: 'Sales 1', role: 'sales', pin: '12345' }
    ],
    log: []
  };
}
