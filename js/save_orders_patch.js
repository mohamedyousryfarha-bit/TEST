// ============================================================
// إضافة action جديد: save_orders (JavaScript عادي، بدون TypeScript)
// داخل دالة pastry-api الموجودة في Supabase.
// الأجزاء المعلّمة بـ <-- لازم تستبدلها بنفس الدوال اللي save_state بيستخدمها عندك.
// ============================================================

// 1) ضيف الحالة دي جوه switch(body.action):
case 'save_orders': {
  // التحقق من الموظف والـ PIN بنفس طريقة save_state
  const emp = await verifyEmployee(body.employee_name, body.pin); // <--
  if (!emp) {
    return json({ error: 'رفض الخادم التحقق من الموظف. أعد تسجيل الدخول.' }, 401);
  }

  // الصلاحية: المطبخ والبار والأدمن بس
  if (!['kitchen', 'barista', 'admin'].includes(emp.role)) {
    return json({ error: 'رفض الخادم صلاحية الموظف.' }, 403);
  }

  const orders = Array.isArray(body.orders) ? body.orders : [];

  // اقرأ الحالة الحالية وغيّر الأوردرات بس
  const current = await loadState(); // <--
  const next = { ...current.state, orders };

  const saved = await saveState(next, current.revision); // <--
  return json({ ok: true, revision: saved.revision, orders_count: orders.length });
}

// ============================================================
// ملاحظات:
// - الـ action ده ممنوع يكتب المخزون أو الأسعار أو الوصفات، بيغيّر orders بس.
// - لو save_state بيستخدم جدول أو RLS معين، اكتب بيه نفس الطريقة.
// - بعد الإضافة: supabase functions deploy pastry-api
// ============================================================
