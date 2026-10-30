/*
 * ANDALUS GO — print QR code generator (PNG + SVG)
 * Uses qrcode-generator by Kazuhiko Arase (MIT), vendored in assets/vendor/qrcode.js.
 *
 * Optional: set DEFAULT_URL to your permanent landing page so it is pre-filled.
 */
(function () {
  "use strict";

  var DEFAULT_URL = "";

  var LABEL_PREFIX = "SCAN TO DOWNLOAD ";
  var LABEL_BRAND = "ANDALUS GO";
  var MIN_PNG_QR_PX = 2000;    // QR area (incl. quiet zone) is at least this many px wide
  var QUIET = 4;               // quiet zone in modules (QR spec minimum)
  var INK = "#000000";
  var BRAND = "#ec2826";
  var FONT = "Arial, Helvetica, sans-serif";

  var $ = function (id) { return document.getElementById(id); };
  var urlInput = $("url");
  var msg = $("msg");
  var preview = $("preview");
  var meta = $("meta");
  var buttons = ["dl-png", "dl-svg", "dl-png-plain", "dl-svg-plain"].map($);
  var current = null; // { url, qr }

  // ---------- Validation ----------

  function validate(raw) {
    var value = raw.trim();
    if (!value) return { level: "empty" };
    var u;
    try { u = new URL(value); } catch (e) { return { level: "err", text: "This is not a valid URL." }; }
    if (u.protocol !== "https:") {
      return { level: "err", text: "Use an https:// address — cameras and stores trust secure links." };
    }
    if (/(^|\.)(play\.google\.com|apps\.apple\.com|itunes\.apple\.com)$/i.test(u.hostname)) {
      return { level: "err", text: "This is a store link. The QR code must point to your landing page, not to a store." };
    }
    if (/(localhost|127\.0\.0\.1|\.local$|ngrok|trycloudflare|loca\.lt)/i.test(u.hostname)) {
      return { level: "err", text: "This looks like a temporary/local address. Use your permanent domain." };
    }
    if (/\.(netlify\.app|vercel\.app|github\.io|pages\.dev|web\.app|firebaseapp\.com)$/i.test(u.hostname)) {
      return { level: "warn", url: u.href,
        text: "Works, but this is a hosting provider’s subdomain. A domain you own (e.g. get.andalusgo.com) lets you change hosting later without reprinting." };
    }
    return { level: "ok", url: u.href, text: "Ready for print. Test-scan the downloaded file with an Android and an iPhone before printing." };
  }

  // ---------- QR geometry ----------

  function makeQr(url) {
    var qr = window.qrcode(0, $("opt-ecc").value);
    qr.addData(url, "Byte");
    qr.make();
    return qr;
  }

  // All sizes in module units; full = QR width including quiet zone.
  function layout(qr, withLabel) {
    var full = qr.getModuleCount() + QUIET * 2;
    var fontSize = full * 0.052;
    var labelH = withLabel ? fontSize * 2.6 : 0;
    return {
      n: qr.getModuleCount(),
      full: full,
      height: full + labelH,
      fontSize: fontSize,
      textWidth: full * 0.86,
      textY: full + labelH * 0.32 + fontSize * 0.36 // quiet zone above already gives breathing room
    };
  }

  function modulePath(qr) {
    var n = qr.getModuleCount();
    var d = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d.push("M" + (c + QUIET) + " " + (r + QUIET) + "h1v1h-1z");
      }
    }
    return d.join("");
  }

  // ---------- SVG ----------

  function buildSvg(qr, withLabel, accent) {
    var L = layout(qr, withLabel);
    var label = "";
    if (withLabel) {
      label =
        '<text x="' + (L.full / 2) + '" y="' + L.textY.toFixed(3) + '" text-anchor="middle"' +
        ' font-family="' + FONT + '" font-weight="700" font-size="' + L.fontSize.toFixed(3) + '"' +
        ' textLength="' + L.textWidth.toFixed(3) + '" lengthAdjust="spacingAndGlyphs" fill="' + INK + '">' +
        LABEL_PREFIX + '<tspan fill="' + (accent ? BRAND : INK) + '">' + LABEL_BRAND + '</tspan></text>';
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.full + ' ' + L.height.toFixed(3) + '"' +
      ' width="' + (L.full * 20) + '" height="' + (L.height * 20).toFixed(0) + '" shape-rendering="crispEdges">' +
      '<title>ANDALUS GO — scan to download</title>' +
      '<rect width="100%" height="100%" fill="#ffffff"/>' +
      '<path fill="' + INK + '" d="' + modulePath(qr) + '"/>' +
      label + '</svg>\n';
  }

  // ---------- PNG ----------

  function buildPng(qr, withLabel, accent, done) {
    var L = layout(qr, withLabel);
    var scale = Math.ceil(MIN_PNG_QR_PX / L.full); // whole pixels per module → perfectly sharp edges
    var canvas = document.createElement("canvas");
    canvas.width = L.full * scale;
    canvas.height = Math.round(L.height * scale);
    var ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = INK;
    for (var r = 0; r < L.n; r++) {
      for (var c = 0; c < L.n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
      }
    }

    if (withLabel) {
      ctx.font = "700 " + (L.fontSize * scale) + "px " + FONT;
      ctx.textBaseline = "alphabetic";
      var wPrefix = ctx.measureText(LABEL_PREFIX).width;
      var wBrand = ctx.measureText(LABEL_BRAND).width;
      var stretch = (L.textWidth * scale) / (wPrefix + wBrand); // same fit as SVG textLength
      ctx.save();
      ctx.translate((L.full * scale - L.textWidth * scale) / 2, L.textY * scale);
      ctx.scale(stretch, 1);
      ctx.fillStyle = INK;
      ctx.fillText(LABEL_PREFIX, 0, 0);
      ctx.fillStyle = accent ? BRAND : INK;
      ctx.fillText(LABEL_BRAND, wPrefix, 0);
      ctx.restore();
    }

    canvas.toBlob(function (blob) { done(blob, canvas.width, canvas.height); }, "image/png");
  }

  // ---------- UI ----------

  function download(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function setMessage(result) {
    if (result.level === "empty") { msg.hidden = true; return; }
    msg.className = "msg " + result.level;
    msg.textContent = result.text;
    msg.hidden = false;
  }

  function render() {
    var result = validate(urlInput.value);
    setMessage(result);
    var ok = result.level === "ok" || result.level === "warn";
    buttons.forEach(function (b) { b.disabled = !ok; });

    if (!ok) {
      current = null;
      preview.innerHTML = '<p class="empty">Enter your landing page URL to preview the QR code.</p>';
      meta.textContent = "";
      return;
    }

    var qr = makeQr(result.url);
    current = { url: result.url, qr: qr };
    preview.innerHTML = buildSvg(qr, $("opt-label").checked, $("opt-accent").checked)
      .replace(/^<\?xml[^>]*>\s*/, "");
    var L = layout(qr, true);
    var px = L.full * Math.ceil(MIN_PNG_QR_PX / L.full);
    meta.textContent = "Encodes: " + result.url + " · version " + Math.floor((qr.getModuleCount() - 17) / 4) +
      " (" + qr.getModuleCount() + "×" + qr.getModuleCount() + " modules) · PNG QR area " + px + "×" + px + " px";

    try { localStorage.setItem("andalusgo.qr.url", urlInput.value.trim()); } catch (e) { /* storage unavailable */ }
  }

  $("dl-svg").addEventListener("click", function () {
    if (!current) return;
    var svg = buildSvg(current.qr, $("opt-label").checked, $("opt-accent").checked);
    download(new Blob([svg], { type: "image/svg+xml" }), "andalus-go-qr" + ($("opt-label").checked ? "-labeled" : "") + ".svg");
  });

  $("dl-svg-plain").addEventListener("click", function () {
    if (!current) return;
    download(new Blob([buildSvg(current.qr, false, false)], { type: "image/svg+xml" }), "andalus-go-qr.svg");
  });

  $("dl-png").addEventListener("click", function () {
    if (!current) return;
    var withLabel = $("opt-label").checked;
    buildPng(current.qr, withLabel, $("opt-accent").checked, function (blob, w, h) {
      download(blob, "andalus-go-qr" + (withLabel ? "-labeled" : "") + "-" + w + "x" + h + ".png");
    });
  });

  $("dl-png-plain").addEventListener("click", function () {
    if (!current) return;
    buildPng(current.qr, false, false, function (blob, w, h) {
      download(blob, "andalus-go-qr-" + w + "x" + h + ".png");
    });
  });

  urlInput.addEventListener("input", render);
  ["opt-label", "opt-accent", "opt-ecc"].forEach(function (id) { $(id).addEventListener("change", render); });

  var saved = null;
  try { saved = localStorage.getItem("andalusgo.qr.url"); } catch (e) { /* storage unavailable */ }
  urlInput.value = new URLSearchParams(location.search).get("url") || saved || DEFAULT_URL;
  render();
})();
