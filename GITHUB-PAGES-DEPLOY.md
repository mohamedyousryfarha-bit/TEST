# RMY PRO — GitHub Pages deployment (v2)

## Important: upload the CONTENTS of this ZIP
This archive is intentionally flattened. After extracting it, `index.html` must be
in the root of the GitHub repository — not inside another `rmypro.com-main` folder.

Expected root:
- index.html
- invoice.html
- sw.js
- manifest.webmanifest
- ICONS/
- css/
- js/

## Publish
1. Open the repository used by GitHub Pages.
2. Upload all extracted files and folders (including `index.html`) to the repository root.
3. Commit the changes to the branch/folder configured in Settings → Pages.
4. Open the published site and hard-refresh it. On Android Chrome, clear the site's
   stored data once if an old service worker keeps showing the previous version.

## Quick asset checks
After publishing, these should open directly:
- `https://YOUR-SITE/ICONS/rmy-logo-256.png`
- `https://YOUR-SITE/css/rmy-design-system.css`
- `https://YOUR-SITE/js/001-core-boot.js`

The startup splash now dismisses itself if the logo fails to load, so a missing image
will no longer cover the login screen. The service-worker cache was bumped to v173.

## Scope
This package preserves the existing application logic and adds deployment/startup
resilience on top of the earlier visual refresh. It has not been tested against your
live Supabase project or production data; test login, sales, inventory, and reports
before using it operationally.
