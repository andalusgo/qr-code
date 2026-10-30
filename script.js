/*
 * ANDALUS GO — landing page UI
 *
 * The redirect itself happens as early as possible:
 *   1. middleware.js  — on Vercel's edge, before the page is sent (Android / iPhone)
 *   2. inline script in <head> of index.html — in the browser, before CSS and images
 * This file only handles what the visitor sees if they stay on the page.
 *
 * Testing helpers:
 *   ?noredirect   → never auto-redirect (preview the page on a phone)
 *   ?platform=android|ios|other → simulate a platform
 *   ?inapp        → simulate an in-app browser (with ?platform=ios)
 *   ?debug        → show the detected platform and the browser's user-agent
 */
(function () {
  "use strict";

  var FALLBACK_HINT_MS = 2500; // still here after this → the redirect was blocked (some in-app browsers)

  var statusEl = document.getElementById("status");
  var platform = document.documentElement.getAttribute("data-platform") || "other";
  var inApp = document.documentElement.hasAttribute("data-inapp");
  var redirecting = platform !== "other" && !/[?&]noredirect\b/.test(window.location.search);

  document.getElementById("year").textContent = String(new Date().getFullYear());

  function showStatus(text) {
    statusEl.textContent = text;
    statusEl.hidden = false;
  }

  function highlight(link, storeName) {
    link.classList.add("is-primary");
    link.parentNode.insertBefore(link, link.parentNode.firstChild); // matching store first

    if (!redirecting) return;
    showStatus("Opening " + storeName + "…");
    window.setTimeout(function () {
      if (document.visibilityState === "visible") {
        showStatus(inApp
          ? "Didn’t open? Tap the " + storeName + " button below, or open this link in Safari."
          : "Didn’t open? Tap the " + storeName + " button below.");
      }
    }, FALLBACK_HINT_MS);
  }

  // Inside Telegram/Instagram/etc. on iPhone the https App Store link gets stuck — open the App Store app directly.
  if (inApp) document.getElementById("link-ios").href = "itms-apps://apps.apple.com/app/id6757116995";

  // ?debug — show what this browser reports, to diagnose a new in-app browser.
  if (/[?&]debug\b/.test(window.location.search)) {
    var dbg = document.createElement("pre");
    dbg.className = "debug";
    dbg.textContent = "platform: " + platform + (inApp ? " (in-app)" : "") + "\n" + navigator.userAgent;
    document.querySelector(".hero__text").appendChild(dbg);
  }

  // Returning via the back/forward cache: just show the page.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) statusEl.hidden = true;
  });

  function renderDesktopQr() {
    var target = document.getElementById("scan-code");
    var pageUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
    if (!/^https?:/.test(pageUrl)) return; // opened from file:// — nothing scannable

    var script = document.createElement("script");
    script.src = "assets/vendor/qrcode.js";
    script.async = true;
    script.onload = function () {
      var qr = window.qrcode(0, "M");
      qr.addData(pageUrl, "Byte");
      qr.make();
      var n = qr.getModuleCount();
      var quiet = 2;
      var d = "";
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) d += "M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z";
        }
      }
      var size = n + quiet * 2;
      target.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + " " + size +
        '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>' +
        '<path fill="#000" d="' + d + '"/></svg>';
      document.getElementById("scan").hidden = false;
    };
    document.body.appendChild(script);
  }

  if (platform === "android") {
    highlight(document.getElementById("link-android"), "Google Play");
  } else if (platform === "ios") {
    highlight(document.getElementById("link-ios"), "App Store");
  } else {
    renderDesktopQr();
  }
})();
