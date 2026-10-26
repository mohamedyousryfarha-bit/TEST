// طبقة الاتصال بالسيرفر. القراءة فقط في هذه المرحلة.
// نفس الـ action المستخدم في البرنامج الحالي: get_state (في pastry-api).
export async function getState({ client, name, pin }) {
  if (!client) throw new Error('إعدادات Supabase مش متحمّلة.');
  const { data, error } = await client.functions.invoke('pastry-api', {
    body: { action: 'get_state', employee_name: name, pin }
  });
  if (error) throw new Error('تعذّر الاتصال بالخادم، حاول تاني.');
  if (!data || data.error) throw new Error(data && data.error ? String(data.error) : 'الدخول مش صحيح.');
  if (!data.state) throw new Error('الخادم ما رجعش بيانات.');
  return data.state;
}
