# Cartabase (on-device app)

A vehicle database and camera-recognition tool that runs **entirely
on your phone** — no server, no laptop needed day-to-day, works
offline. Everything (records, photos) is stored locally in your
browser's on-device database.

This is a full rebuild of the original localhost version: instead of
a Node.js server + SQLite, this version does license-plate OCR and
color detection directly in the browser (via a self-hosted copy of
tesseract.js — no cloud calls needed for that part), and stores
everything in IndexedDB on your device.

---

## Why a one-time laptop step is still needed

Phone browsers only allow camera access (`getUserMedia`) on pages
loaded over **HTTPS** (or `localhost`) — never from a file sitting
directly on your phone, and never over a plain local-network address.
So this needs to be hosted at a real `https://` URL once. After that,
**you never need a laptop again** — you just open the URL (or the
installed home-screen icon) on your phone, and it works, including
fully offline, forever.

You can do the one-time hosting step for free with **GitHub Pages**
(permanent, recommended) or **Netlify Drop** (fastest, drag-and-drop).

### Option A: GitHub Pages (recommended — permanent, free forever)

1. Go to https://github.com and create a free account if you don't
   have one.
2. Click **New repository**. Name it anything (e.g. `cartabase`).
   Make it **Public**. Create it.
3. On the new repo's page, click **"uploading an existing file"**
   (or **Add file → Upload files**).
4. Drag in **every file and folder** from this project (keep the
   folder structure: `index.html`, `manifest.json`, `sw.js`, `css/`,
   `js/`, `vendor/`, `tessdata/`, `icons/`). GitHub's uploader
   preserves folder structure when you drag a whole folder in most
   browsers; if it flattens things, upload folder-by-folder instead.
5. Commit the files.
6. Go to the repo's **Settings → Pages**.
7. Under "Build and deployment", set **Source: Deploy from a
   branch**, branch **main**, folder **/ (root)**. Save.
8. Wait a minute or two, then refresh — GitHub shows you a live URL
   like `https://yourname.github.io/cartabase/`.
9. Open that URL **on your phone**. That's it — it's permanent.

### Option B: Netlify Drop (fastest, no account required to try)

1. On your laptop, go to https://app.netlify.com/drop
2. Drag the whole `cartabase-pwa` folder onto the page.
3. It gives you a live `https://something.netlify.app` URL
   immediately.
4. Open that URL on your phone.
5. (To make it permanent instead of temporary, create a free Netlify
   account when prompted and claim the site.)

## Installing it as an app on your phone

Once you open the hosted URL on your phone:
- **Android (Chrome)**: you should see an "Install Cartabase" banner
  at the top, or use the browser menu → **"Add to Home screen" /
  "Install app"**.
- **iPhone (Safari)**: tap the Share icon → **"Add to Home Screen"**.

Once installed, it opens full-screen like a real app, and — after
that first successful load — **works with no internet connection at
all**, including the camera capture and OCR.

## What works fully offline, and what doesn't

| Feature | Works offline? |
|---|---|
| Camera capture | ✅ Yes |
| License plate OCR | ✅ Yes (self-hosted, no cloud) |
| Color detection | ✅ Yes (on-device pixel analysis) |
| Brand / model / vehicle type | ⚠️ "Unknown" by default — see below |
| Database search/view/edit/delete | ✅ Yes |
| Optional cloud brand/model detection | ❌ No — needs internet + API key |

**Brand, model, and vehicle type honestly show "Unknown"** out of the
box. Telling a Toyota from a Honda from pixels alone needs an actual
trained image-classification model, which isn't something that can
run reasonably in a phone browser offline. You can:
- Type these in manually on the review screen (fastest, always
  available), or
- Turn on the **optional cloud vision provider** in Settings (needs
  an OpenAI-compatible API key and internet access for that one
  step) — see the in-app note for the privacy trade-off before
  enabling it: since there's no server, the key lives in your
  browser's local storage and is sent straight from your phone.

## Where your data lives, and backing it up

Everything is stored in this browser's **IndexedDB**, un-synced,
on this device only. This means:
- Uninstalling the app, or clearing this browser/site's storage,
  **permanently deletes everything**. There's no cloud backup.
- Go to **Settings → Export all data as JSON** periodically to save
  a backup file (includes photos, base64-encoded) somewhere safe.
- Data does not sync between devices — if you install this on a
  second phone, it starts with an empty database.

## Updating the app later

If you want to change anything (add a feature, tweak plate-pattern
regex for your region, etc.), edit the files and re-upload/re-drop
them to GitHub Pages/Netlify. Bump the `CACHE_NAME` constant at the
top of `sw.js` (e.g. `cartabase-v2`) so phones that already installed
the app pick up the new version instead of serving their old cached
copy.

## Project structure

```
cartabase-pwa/
├── index.html              Single-page app shell (Database/Capture/Settings tabs)
├── manifest.json            Makes it installable
├── sw.js                    Service worker — precaches everything for offline use
├── css/styles.css
├── js/
│   ├── db.js                 IndexedDB storage layer
│   ├── color-detect.js       Canvas-based color detection
│   ├── plate-ocr.js           tesseract.js wrapper (self-hosted, offline)
│   ├── analyzer.js            Combines detectors + optional cloud vision path
│   ├── settings.js            Local settings storage (vision API config)
│   ├── ui-helpers.js
│   ├── database-view.js
│   ├── capture-view.js
│   ├── settings-view.js
│   └── app.js                 Tab routing, service worker registration, install prompt
├── vendor/tesseract/         Self-hosted tesseract.js + WASM OCR engine (~7.7MB)
└── tessdata/eng.traineddata   English OCR language data (~4MB)
```

## A note on how thoroughly this was tested

The OCR and color-detection logic is the same, verified-working code
from the server version (tested live: 94% plate-read accuracy, 94%
color-match accuracy on a test image) — just ported from Node.js APIs
to their browser equivalents (Canvas instead of Jimp, tesseract.js's
browser build instead of its Node build, using the exact same
underlying library and version).

**What could NOT be tested in this build environment:** actual
execution in a real mobile browser (no browser was available to test
in). The code was verified by careful inspection of tesseract.js's
own source code to confirm the browser-specific API paths (image
input handling, local `corePath`/`langPath`/`workerPath` overrides)
match what's used here — but please treat the first real run on your
phone as the real test. If OCR or the camera doesn't work as
expected, open your phone browser's developer console (or use
`chrome://inspect` from a laptop connected via USB) to see the actual
error, and let me know what it says.
