/*
 * ANDALUS GO — smart app download redirect
 *
 * Android  → Google Play   (automatic)
 * iOS      → App Store     (automatic, incl. iPadOS that reports itself as "Macintosh")
 * Anything else → stays on this page with both buttons + a QR code to scan
 *
 * Store URLs live in index.html (the href of #link-android and #link-ios),
 * so the buttons keep working even if JavaScript is disabled or fails.
 *
 * Testing helpers:
 *   ?noredirect   → never auto-redirect (preview the page on a phone)
 *   ?platform=android|ios|other → simulate a platform
 */
(function () {
  "use strict";

  var REDIRECT_DELAY_MS = 250;   // short pause so the status message paints first
  var FALLBACK_HINT_MS = 2500;   // if we are still here after this, the redirect was blocked

  var androidLink = document.getElementById("link-android");
  var iosLink = document.getElementById("link-ios");
  var statusEl = document.getElementById("status");
  var params = new URLSearchParams(window.location.search);

  document.getElementById("year").textContent = String(new Date().getFullYear());

  function detectPlatform() {
    var forced = (params.get("platform") || "").toLowerCase();
    if (forced === "android" || forced === "ios" || forced === "other") return forced;

    var ua = navigator.userAgent || "";

    // Windows Phone / old Edge Mobile put "Android" and "iPhone" in their UA.
    if (/Windows Phone|IEMobile/i.test(ua)) return "other";

    if (/Android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";

    // iPadOS 13+ in default "desktop" mode reports as a Mac; real Macs have no multi-touch.
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";

    // Chromium client hints (some Android browsers trim the UA string).
    var uaData = navigator.userAgentData;
    if (uaData && typeof uaData.platform === "string" && /android/i.test(uaData.platform)) {
      return "android";
    }

    return "other";
  }

  function isConfigured(url) {
    return /^https:\/\//i.test(url) && url.indexOf("REPLACE_WITH") === -1;
  }

  function showStatus(text) {
    statusEl.textContent = text;
    statusEl.hidden = false;
  }

  function redirect(link, storeName) {
    link.classList.add("is-primary");
    // Put the matching store first.
    link.parentNode.insertBefore(link, link.parentNode.firstChild);

    if (params.has("noredirect")) return;

    if (!isConfigured(link.href)) {
      console.warn("[ANDALUS GO] " + storeName + " link is not set in index.html — auto-redirect skipped.");
      return;
    }

    showStatus("Opening " + storeName + "…");

    window.setTimeout(function () {
      // replace() keeps this page out of history, so "Back" from the store does not bounce here again.
      window.location.replace(link.href);
    }, REDIRECT_DELAY_MS);

    // Fallback: some in-app browsers (Instagram, Facebook, etc.) block automatic navigation.
    window.setTimeout(function () {
      if (document.visibilityState === "visible") {
        showStatus("Didn’t open? Tap the " + storeName + " button below.");
      }
    }, FALLBACK_HINT_MS);
  }

  // Returning via the back/forward cache: show the page instead of redirecting again.
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

  var platform = detectPlatform();
  document.documentElement.setAttribute("data-platform", platform);

  if (platform === "android") {
    redirect(androidLink, "Google Play");
  } else if (platform === "ios") {
    redirect(iosLink, "App Store");
  } else {
    renderDesktopQr();
  }
})();
