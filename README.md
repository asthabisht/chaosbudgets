# Quote Generator — standalone offline app

Separate app from review-enigma. Builds Enigma-branded estimated quotes and produces
the fully styled Excel and client PDF entirely on your device — no server, works offline.

## Deploy
Drag this folder onto Netlify as its OWN new site. Install it as a Chrome app from the
address bar to use it like a desktop / offline app.

## How it works
- On open it pulls the shared rate library from review-enigma.com/api/rates and caches it
  in the browser. It re-syncs each time you open it (and when you tap the status line), so
  new supplier rates added on review-enigma are picked up automatically.
- Offline: the app shell + the export libraries are cached; it uses the last-synced library.
- Export Excel → internal working budget (green section bars, blue cost columns, live
  formulas, margin %, centred header, T&C). Export PDF → client quote (ENIGMA wordmark,
  centred title block, green SUB TOTAL bars, totals, footer, T&C page).
  Both are generated locally and look identical online or offline. The client PDF is
embedded with your Proxima Nova so it renders in the real brand font on any device.

## Config (already set)
  API_BASE = https://review-enigma.com   (top of app.js — where the library is read from)
If review-enigma is on its Netlify subdomain instead of the custom domain, change that one
line to the subdomain and redeploy. There is no export server to configure.
