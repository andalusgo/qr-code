# ANDALUS GO — Universal QR Code & Smart App Redirect

One QR code for all printed materials. When scanned:

| Visitor device | What happens |
|---|---|
| Android phone / tablet | Redirected to **Google Play** automatically |
| iPhone / iPad (incl. iPadOS "desktop mode") | Redirected to the **App Store** automatically |
| Windows, macOS, Linux, anything else | Landing page with both store buttons + a QR code to scan with a phone |

The QR code points to **your landing page**, never directly to a store, so it stays valid forever — even if store links change.

---

## Project structure

```
andalusgoqrcode/
├── middleware.js           Vercel edge redirect for phones (fastest path)
├── index.html              Landing page + instant in-browser redirect in <head>
├── style.css               Styles (white + ANDALUS GO red, matched to the logo)
├── script.js               Page UI: highlighted store, fallback hint, desktop QR
├── assets/
│   ├── logo.png            ANDALUS GO logo
│   └── vendor/qrcode.js    QR library (qrcode-generator 1.4.4, MIT, Kazuhiko Arase)
├── qr-generator/
│   ├── index.html          Print QR generator (PNG + SVG)
│   └── generator.js
└── print/                  Ready print files for https://uz-rho.vercel.app/
```

No build step, no dependencies, no framework. Phones never download the page at all on Vercel; the QR library and fonts are only loaded by visitors who stay on the page.

---

## Step 1 — Store links (already set)

The links appear in **three places** — change all of them together:

1. `middleware.js` — the `STORES` object (edge redirect)
2. `index.html` — the `STORES` object in the `<script>` inside `<head>` (browser redirect)
3. `index.html` — the `href` of `#link-android` and `#link-ios` (buttons, also work without JavaScript)

Current links:

- Google Play: `https://play.google.com/store/apps/details?id=uz.prod.andalus.customer_app`
- App Store: `https://apps.apple.com/app/andalus-go/id6757116995`

The App Store link has no country code (`/ru/`, `/uz/`…) on purpose, so every visitor gets the App Store of their own country.


## Step 2 — Logo (already set)

The logo is `assets/logo.png`. To update it, replace that file and keep the name. The page accent colour (`--brand` in `style.css`, `BRAND` in `qr-generator/generator.js`) is the logo red `#ec2826`.

## Step 3 — Choose a permanent URL (most important decision)

The printed QR code can never change, so the URL inside it must live forever. Use a domain **you own**, for example:

- `https://get.andalusgo.com` (recommended — a short subdomain just for this), or
- `https://andalusgo.com/app`

Do **not** use temporary or provider addresses (`*.netlify.app`, `*.vercel.app`, `*.github.io`, ngrok, localhost, URL shorteners like bit.ly). If you ever move hosting, you only update DNS — the QR code keeps working.

Keep the domain on **auto-renew**. If the domain expires, every printed QR code stops working.

## Step 4 — Deploy

Upload these files/folders to any static host: `index.html`, `style.css`, `script.js`, `assets/`, `qr-generator/`. (The `.claude/` folder and `README.md` are not needed.) HTTPS is required.

### Option A — Cloudflare Pages (free, fast worldwide — recommended)
1. Create an account at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Drag the project folder in and deploy.
3. **Custom domains** → add `get.andalusgo.com`. If your domain's DNS is on Cloudflare this is automatic; otherwise add the CNAME record it shows you at your domain registrar.
4. HTTPS is issued automatically.

### Option B — Netlify (free)
1. <https://app.netlify.com> → **Add new site** → **Deploy manually** → drag the folder in.
2. **Domain management** → **Add a domain** → `get.andalusgo.com` → create the CNAME record shown at your registrar.
3. HTTPS: **Domain management → HTTPS → Verify DNS / Provision certificate**.

### Option C — GitHub Pages (free)
1. Push the files to a GitHub repository → **Settings → Pages** → deploy from the `main` branch, root folder.
2. Set **Custom domain** to `get.andalusgo.com`, add a CNAME record pointing to `<your-user>.github.io`, then tick **Enforce HTTPS**.

### Option D — Your existing web hosting (cPanel, VPS, nginx, Apache)
Upload the files into the web root of the subdomain (or into an `/app` folder on the main site). Make sure an SSL certificate (e.g. Let's Encrypt) is active.

After deployment, open the URL on a computer: you should see the landing page with both buttons and a QR code.

## Step 5 — Generate the print QR code

1. Open `https://YOUR-DOMAIN/qr-generator/` (or open `qr-generator/index.html` locally from a small web server).
2. Enter the permanent URL from Step 3, e.g. `https://get.andalusgo.com`.
   The tool refuses store links, `http://`, and temporary/local addresses, and warns about provider subdomains.
3. Download:
   - **PNG** — labeled "SCAN TO DOWNLOAD ANDALUS GO", ≥ 2000 × 2000 px QR area, white background, pure black modules.
   - **SVG** — the same design as vector, scales to any print size (billboards, banners).
   - **PNG / SVG (QR only)** — without the label, if the designer places their own text.
4. Error correction defaults to **H (30%)** — the most resistant to scratches, dirt and glare on printed materials.

> Tip: set `DEFAULT_URL` at the top of `qr-generator/generator.js` so the field is pre-filled for your team.
>
> For professional print shops: the SVG label uses Arial/Helvetica. If the printer requests it, open the SVG in Illustrator/Inkscape and convert the text to outlines.

## Step 6 — Test before printing

- [ ] Scan the downloaded PNG from a screen with an **Android** phone → Google Play opens on the ANDALUS GO page.
- [ ] Scan with an **iPhone** (Camera app) → App Store opens on the ANDALUS GO page.
- [ ] Open the URL on a **computer** → landing page with both buttons.
- [ ] Scan from inside **Telegram / Instagram / WhatsApp** in-app browsers → redirect, or the "Didn't open? Tap the button" fallback appears.
- [ ] Print one test copy at the final size and scan it from a normal distance.

### Testing helpers
- `https://YOUR-DOMAIN/?noredirect` — show the page on a phone without redirecting (for screenshots/review).
- `https://YOUR-DOMAIN/?platform=android` | `ios` | `other` — simulate a platform.

## Print guidelines

- Minimum printed size: **2.5 × 2.5 cm** for flyers/stickers. For larger distances use the rule *QR width ≈ scanning distance ÷ 10* (scanned from 3 m → at least 30 cm).
- Keep the white margin (quiet zone) around the code — do not crop it or place other graphics on it.
- Always dark code on a light background. Do not invert colors, and do not place it on photos or patterns.
- Avoid glossy lamination under strong lights where possible.

---

## How it works

The redirect happens as early as possible, in two layers:

1. **Edge redirect** (`middleware.js`, Vercel only): Vercel reads the phone's user-agent and answers with a `302` straight to the store. The landing page is never downloaded, so the store opens right after the scan.
2. **Browser redirect** (inline `<script>` at the top of `index.html`): catches what the edge cannot see — iPads in "desktop mode" and hosts other than Vercel. It runs before any CSS, fonts or images load.
   - `Android` in the user-agent → Android (after excluding Windows Phone, whose UA also contains "Android").
   - `iPhone|iPad|iPod` → iOS.
   - iPadOS 13+ pretends to be a Mac; it is detected as iOS when the UA says `Macintosh` **and** the device has multi-touch (`navigator.maxTouchPoints > 1`). Real Macs have no touch screen.
   - Chromium User-Agent Client Hints are used as an extra Android check.
   - Everything else → landing page.
   - Uses `location.replace()`, so "Back" from the store does not bounce the visitor into the store again.
3. **Fallbacks**
   - The store buttons are plain links in the HTML, so they work even if JavaScript is disabled or fails to load.
   - If a redirect is blocked (some in-app browsers), after 2.5 seconds the page shows "Didn't open? Tap the … button below." with the correct store button highlighted and listed first.
   - Returning to the page through the browser's back/forward cache shows the page instead of redirecting again.

## Updating later

- **Store links changed?** Edit the three places listed in Step 1 and push to GitHub (Vercel redeploys automatically). The printed QR code does not change.
- **Moving to another host?** Deploy the same files there and point the domain's DNS to the new host. The printed QR code does not change.
- **Never** change the URL that is encoded in the printed QR code.

## License notes

- `assets/vendor/qrcode.js` — QR Code Generator for JavaScript © Kazuhiko Arase, MIT license. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
- Google Play and the Apple logo are trademarks of Google LLC and Apple Inc. The buttons follow the familiar badge style; if you want the official badges, download them from Google's and Apple's badge pages and replace the button contents, following their brand guidelines.
