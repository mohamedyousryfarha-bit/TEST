# RMY PRO 3.5.0 — Design Upgrade v1

## What changed
- Added `css/rmy-design-system.css` as a visual-only layer loaded after the existing stylesheets.
- Refreshed the main application palette, header, cards, buttons, fields, tables, login surface, dashboard tiles, navigation surfaces and bottom dock.
- Added a coordinated dark palette using the existing `data-theme="dark"` switch.
- Improved responsive spacing and touch targets for narrow screens while preserving existing application IDs and data attributes.
- Refreshed invoice screen presentation while retaining the existing thermal receipt print rules.
- Updated the service worker cache key and added the new stylesheet to its offline shell.
- Updated visible app version metadata to 3.5.0.

## Safety notes
- Existing JavaScript business logic, database configuration, role checks, and data schemas were not intentionally changed.
- No live browser, Supabase backend, physical printer, or mobile device was available in this file-based task. The result still requires runtime acceptance testing before production deployment.
- Keep the original ZIP as rollback. To roll back, redeploy the original archive and clear/reload the site's service-worker cache.

## Recommended acceptance tests
1. Sign in as each role and confirm role-based visibility and navigation.
2. Switch light/dark themes and inspect all major panels and dialogs.
3. Test sales/cart, inventory, customer, recipe, purchase, and party workflows.
4. Test 360px, 390px, 768px, 1024px, and desktop widths.
5. Print a thermal receipt and a browser/PDF invoice; confirm totals, Arabic shaping, and page breaks.
6. Verify offline app shell loading and online sync after reconnecting.
