# Co Chaos — Quote Generator (offline PWA)

Line items in → Enigma-branded estimated quote out. Pulls the shared rate library from
review-enigma `/api/rates`, caches it, works offline, and installs as a Chrome app.
Light/dark, grey corporate theme. Deploy as its OWN site.

## 1. Configure  (edit `app.js`, top of file)
```
var API_BASE    = "https://YOUR-review-enigma-domain";  // shared rate library (/api/rates)
var EXPORT_BASE = "https://YOUR-export-service";         // branded xlsx/pdf (/generate)
```
- `API_BASE` "" → uses bundled starter rates until the watcher fills the library.
- `EXPORT_BASE` "" → exports use the plain in-browser path (no green fills / styled PDF).
  Set it to the export-service URL to get the branded files.

## 2. Deploy (its own URL)
Drag this folder into Netlify (new site) or any static host. No build step.

## 3. Install as a Chrome app
Open the URL in Chrome → install icon in the address bar. Opens standalone, works offline.

## Exports
- **Export Excel** → internal working budget (BUY/sell/profit, green section bars, blue
  cost columns, live formulas, margin %, T&C).
- **PDF** → client-facing quote (ENIGMA wordmark, centered title block, 4-col table,
  green SUB TOTAL bars, totals, footer address, T&C page).
Both come from the export-service when `EXPORT_BASE` is set. If it's unreachable (offline),
the app falls back to a plain in-browser Excel / browser-print PDF so you're never blocked.

## Offline behaviour
- App shell cached by the service worker (`sw.js`) — opens with no connection.
- Rates cached in the browser from the last sync; tap the status line to re-sync.
- Theme choice, current quote, and rates persist in the browser (localStorage).

## The export-service
See `../export-service` — a small FastAPI app (openpyxl + reportlab) that produces the
branded files. Deploy it alongside your rate watcher (Render / Railway) and point
`EXPORT_BASE` at it.
