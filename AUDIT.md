# تقرير الصيانة

## دوال متكررة (`function` معرّفة أكتر من مرة)

الملاحظة دي تنطبق بس لو الدالة في النطاق العام (global). لو الدالة جوه IIFE (`(function(){...})()`) فكل بلوك بيشتغل بنسخته المحلية، وده مش تكرار فعلي. قبل أي حذف لازم تتأكد من النطاق وتختبر.

- `money` (10 مرات): الفعّالة في `js/078-admin-self-check.js`
- `render` (10 مرات): الفعّالة في `js/077-reports-accountant-alerts.js`
- `esc` (9 مرات): الفعّالة في `js/085-ui-notifications-bell.js`
- `build` (8 مرات): الفعّالة في `js/076-reports-accountant.js`
- `apply` (7 مرات): الفعّالة في `js/080-admin-only-tools.js`
- `isAdmin` (7 مرات): الفعّالة في `js/080-admin-only-tools.js`
- `tick` (6 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `place` (5 مرات): الفعّالة في `js/090-ui-folds-placement.js`
- `save` (4 مرات): الفعّالة في `js/085-ui-notifications-bell.js`
- `norm` (4 مرات): الفعّالة في `js/084-invoices-english-names.js`
- `decorate` (4 مرات): الفعّالة في `js/071-customers-blocked-sync.js`
- `close` (4 مرات): الفعّالة في `js/061-ui-toast-v2.js`
- `sync` (4 مرات): الفعّالة في `js/058-invoices-manual-close.js`
- `fmt` (4 مرات): الفعّالة في `js/077-reports-accountant-alerts.js`
- `role` (4 مرات): الفعّالة في `js/073-auth-view-only.js`
- `paint` (4 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `start` (4 مرات): الفعّالة في `js/077-reports-accountant-alerts.js`
- `S` (4 مرات): الفعّالة في `js/078-admin-self-check.js`
- `sig` (3 مرات): الفعّالة في `js/059-reports-analytics.js`
- `closeSheet` (3 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `isOwner` (3 مرات): الفعّالة في `js/018-ui-home-layout.js`
- `digits` (3 مرات): الفعّالة في `js/071-customers-blocked-sync.js`
- `refresh` (3 مرات): الفعّالة في `js/064-invoices-open-badge.js`
- `$` (3 مرات): الفعّالة في `js/043-messages-read-ticks.js`
- `keyOf` (3 مرات): الفعّالة في `js/071-customers-blocked-sync.js`
- `arr` (3 مرات): الفعّالة في `js/078-admin-self-check.js`
- `E` (3 مرات): الفعّالة في `js/078-admin-self-check.js`
- `move` (3 مرات): الفعّالة في `js/089-admin-maintenance-fold.js`
- `esc2` (2 مرات): الفعّالة في `js/028-invoices-settings.js`
- `go` (2 مرات): الفعّالة في `js/039-auth-autologin-pin.js`
- `num` (2 مرات): الفعّالة في `js/059-reports-analytics.js`
- `report` (2 مرات): الفعّالة في `js/075-admin-diagnostics.js`
- `call` (2 مرات): الفعّالة في `js/030-messages-core.js`
- `buildSheet` (2 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `bad` (2 مرات): الفعّالة في `js/008-ui-smooth-nav.js`
- `lineTotal` (2 مرات): الفعّالة في `js/018-ui-home-layout.js`
- `dayOf` (2 مرات): الفعّالة في `js/059-reports-analytics.js`
- `addButton` (2 مرات): الفعّالة في `js/025-ui-fullscreen.js`
- `later` (2 مرات): الفعّالة في `js/082-ui-dark-contrast.js`
- `toggle` (2 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `label` (2 مرات): الفعّالة في `js/041-ui-dock-icons.js`
- `fill` (2 مرات): الفعّالة في `js/035-ui-bottom-dock.js`
- `renderPanel` (2 مرات): الفعّالة في `js/085-ui-notifications-bell.js`
- `openSheet` (2 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `pad` (2 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `watch` (2 مرات): الفعّالة في `js/062-ui-dock-v3.js`
- `normName` (2 مرات): الفعّالة في `js/071-customers-blocked-sync.js`
- `bind` (2 مرات): الفعّالة في `js/066-customers-phone-autofill.js`
- `ensure` (2 مرات): الفعّالة في `js/078-admin-self-check.js`
- `note` (2 مرات): الفعّالة في `js/074-admin-maintenance.js`
- `showModal` (2 مرات): الفعّالة في `js/078-admin-self-check.js`
- `pct` (2 مرات): الفعّالة في `js/077-reports-accountant-alerts.js`
- `remember` (2 مرات): الفعّالة في `js/084-invoices-english-names.js`

## ملاحظات

- `js/085-ui-notifications-bell.js`: فيه `window.toast` wrapper بيبان إنه no-op، لكن شيله بيغيّر الـ DOM (اختبرت ده). **ما تشيلوش** من غير اختبار.
- `css/087-*` اتشال لأنه كان فاضي.
- الملفات الجاية من بلوكات `pm-*` الأصلية متراكمة، والتعديل في الطبقات الأقدم ممكن يتعارض مع الأحدث. التنظيف الكامل يحتاج اختبار بعد كل خطوة.

## نتيجة التحقق من التعارضات (تشغيل فعلي في المتصفح)

من 53 اسم مكرر، بس 5 أسماء ظاهرة كدوال عامة (global) وقت التشغيل: `save` و`esc` و`norm` و`go` و`close`. الباقي كله داخل IIFE أو نطاق محلي، فمفيش تعارض بينه.

- `save`: الدالة الحية wrapper فوق `_save` (نمط patch متعمد). ما تتشالش.
- `go`: wrapper فوق `oldGo` (نمط patch متعمد). ما تتشالش.
- `norm`: الحية هي `norm(q,u)` في `006-inline.js` (تحويل الوحدات، والاختبار أكد إن `norm(2,'كيلو')` = 2000). النسخ التانية في 008 و010 و084 محلية جوه IIFE، فمفيش bug.
- `esc`: الحية تعريف واحد واضح، والتكرار محلي.
- `close`: مفيش تعريف عام، الاسم بيشاور على `window.close` الأصلي، والنسخ محلية.

**الخلاصة:** مفيش bug حالي من تكرار الدوال. التكرار كله إما محلي (IIFE) أو wrappers متعمدة، فالحذف مش مطلوب ويحتاج حذر.

## المرحلة 1 من التنظيف (اتعملت)
- حذف 28 قاعدة CSS بتستهدف classes أو IDs مش موجودة في المشروع (من 001 و002 و003 و005 و019).
- حذف دالة `minus()` غير المستخدمة من `js/070-ui-nav-filter-by-role.js`.
- التحقق: أخطاء الكونسول مطابقة للنسخة الأصلية، والـ DOM مطابق بعد استبعاد الـ `<style>`/`<link>`.

## ملاحظة عن عدم الثبات (race)
`--i` في أزرار التبويب بيتحسب في `decorateAll` (js/007)، وزرار `msgsPanel` بيتضاف لاحقاً من js/044. ترتيب الإضافة ممكن يختلف حسب توقيت التحميل، فقيمة `--i` بتتغير أحياناً. ده تأثيره شكلي بس (تأخير حركة الظهور)، وهو موجود في الكود الأصلي كمان.

## المتبقي (مراحل جاية)
- دمج الطبقات `pm-*` المتراكمة (أكتر من 100 ملف CSS/JS).
- اختبار الشاشات بعد تسجيل الدخول (محتاج بيئة فيها اتصال بـ Supabase).
- تجميع الملفات حسب الوظيفة.

## تنظيف المراجعة الثانية
- حذف `css/077-sales-invoices.css`: كان فيه تعليق بس ومفيهوش أي قاعدة.
- حذف `css/011-ui-counter.css`: قاعدة `.pm-cnt` مش مستخدمة في أي مكان في الصفحة ولا في الـ JS.
- الدالة `migrate` في `071-customers-blocked-sync.js` مش ميتة: دي IIFE بتتنفذ على طول، فاتسابت.
