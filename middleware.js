/*
 * Vercel Routing Middleware — the fastest path.
 * Phones are sent to their store straight from Vercel's edge, before any HTML is downloaded.
 * Anything not recognised here (desktops, iPads in "desktop mode", ?noredirect, ?platform=…)
 * falls through to index.html, which detects the platform again in the browser.
 *
 * STORE LINKS: keep in sync with the two links in index.html.
 */
const STORES = {
  android: "https://play.google.com/store/apps/details?id=uz.prod.andalus.customer_app",
  ios: "https://apps.apple.com/app/andalus-go/id6757116995",
};

export const config = { matcher: ["/", "/index.html"] };

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store", Vary: "User-Agent" },
  });
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.search) return; // testing parameters → let the page handle it

  const ua = request.headers.get("user-agent") || "";
  if (/Windows Phone|IEMobile/i.test(ua)) return;
  if (/Android/i.test(ua)) return redirect(STORES.android);
  if (/iPhone|iPad|iPod/i.test(ua)) return redirect(STORES.ios);
}
