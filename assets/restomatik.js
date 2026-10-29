/* Table booking by Restomatik (replaces the Uniiti iframe, 29 Oct 2026).
   Public ID f2304ce44188e99ae0a1. Restomatik only loads the module on the
   domains allowed in its panel, so on a preview or on localhost the box stays
   empty: that is expected, the phone line below it is the fallback.

   The module is not an iframe: it mounts inline, inside our own box
   (#rm-booking on reserve.html and fr/reserver.html), so Restomatik's own
   floating button never shows and the site keeps its Reserve button.

   The attribution block is Restomatik's code, unchanged, with one exception:
   the source of the visit is only written to the browser after "Accept" on
   the cookie banner, which promises nothing is stored without consent.
   Booking steps and the confirmed booking are measured in ds-analytics.js. */
(function () {
  var ID = 'f2304ce44188e99ae0a1';
  var BASE = 'https://booking.restomatik.app';
  var COLOUR = '#c2472e';   /* --verm, the colour of the Reserve button */
  var LANG = document.documentElement.lang === 'fr' ? 'fr' : 'en';

  var rmAttribution = (function () {
    var safe = function (value, max) {
      return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
    };
    var hostFromUrl = function (value) {
      try { return value ? new URL(value).host.toLowerCase().slice(0, 255) : null; }
      catch (_) { return null; }
    };
    var cleanSource = function (value) {
      var normalized = String(value || "").toLowerCase();
      if (normalized.indexOf("instagram") >= 0 || normalized === "ig") return "instagram";
      if (normalized.indexOf("facebook") >= 0 || normalized === "fb" || normalized.indexOf("meta") >= 0) return "facebook";
      if (normalized.indexOf("tiktok") >= 0) return "tiktok";
      if (normalized.indexOf("google") >= 0 || normalized === "g") return "google";
      if (normalized.indexOf("chatgpt") >= 0 || normalized.indexOf("openai") >= 0 || normalized.indexOf("perplexity") >= 0 || normalized.indexOf("claude") >= 0 || normalized.indexOf("gemini") >= 0 || normalized.indexOf("copilot") >= 0) return "ai";
      if (normalized.indexOf("whatsapp") >= 0) return "whatsapp";
      return null;
    };
    var readJson = function (key) {
      try {
        var raw = window.localStorage ? window.localStorage.getItem(key) : null;
        return raw ? JSON.parse(raw) : null;
      } catch (_) { return null; }
    };
    /* Only change to Restomatik's code: write after cookie consent. */
    var writeJson = function (key, value) {
      try {
        if (window.localStorage && window.localStorage.getItem('debs_cookie_consent') === 'accepted') {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (_) {}
    };
    var params = new URLSearchParams(window.location.search || "");
    var referrerHost = hostFromUrl(document.referrer);
    var detectedSource = cleanSource(params.get("rm_source")) || cleanSource(params.get("utm_source")) || cleanSource(referrerHost);
    var clickIds = {
      gclid: safe(params.get("gclid"), 256),
      gbraid: safe(params.get("gbraid"), 256),
      wbraid: safe(params.get("wbraid"), 256),
      fbclid: safe(params.get("fbclid"), 256),
      ttclid: safe(params.get("ttclid"), 256),
      msclkid: safe(params.get("msclkid"), 256),
      li_fat_id: safe(params.get("li_fat_id"), 256)
    };
    var hasClickIds = Object.keys(clickIds).some(function (key) { return !!clickIds[key]; });
    var touchTtlMs = 30 * 24 * 60 * 60 * 1000;
    var now = Date.now();
    var firstTouchKey = "restomatik:booking:first-touch";
    var lastTouchKey = "restomatik:booking:last-touch";
    var firstTouch = readJson(firstTouchKey);
    var lastTouch = readJson(lastTouchKey);
    if (firstTouch && firstTouch.createdAt && now - new Date(firstTouch.createdAt).getTime() > touchTtlMs) firstTouch = null;
    if (lastTouch && lastTouch.createdAt && now - new Date(lastTouch.createdAt).getTime() > touchTtlMs) lastTouch = null;
    if (detectedSource && detectedSource !== "direct") {
      var currentTouch = {
        source: detectedSource,
        channel: detectedSource,
        utmSource: safe(params.get("utm_source"), 64),
        utmMedium: safe(params.get("utm_medium"), 64),
        utmCampaign: safe(params.get("utm_campaign"), 128),
        referrerHost: referrerHost,
        createdAt: new Date(now).toISOString()
      };
      if (!firstTouch) { firstTouch = currentTouch; writeJson(firstTouchKey, firstTouch); }
      lastTouch = currentTouch;
      writeJson(lastTouchKey, lastTouch);
    }
    return {
      schemaVersion: 1,
      source: detectedSource || "website_widget",
      marketingChannel: detectedSource || safe(params.get("utm_source"), 32),
      conversionSurface: "WIDGET",
      isEmbeddedWidget: true,
      utmSource: safe(params.get("utm_source"), 64),
      utmMedium: safe(params.get("utm_medium"), 64),
      utmCampaign: safe(params.get("utm_campaign"), 128),
      utmContent: safe(params.get("utm_content"), 128),
      utmTerm: safe(params.get("utm_term"), 128),
      referrerHost: referrerHost,
      pageHost: safe(window.location.host, 255),
      pagePath: safe(window.location.pathname, 512),
      pageUrl: window.location.origin + window.location.pathname,
      clickIds: hasClickIds ? clickIds : null,
      firstTouch: firstTouch,
      lastTouch: lastTouch
    };
  })();

  /* If the module does not come, the phone line under the box is shown. */
  function failed() {
    document.documentElement.classList.add('rm-failed');
  }
  window.addEventListener('restomatik-booking:load_error', failed);

  function mount() {
    var box = document.getElementById('rm-booking');
    if (!box) return;
    var s = document.createElement('script');
    s.src = BASE + '/embed.js';
    s.async = true;
    s.onload = function () {
      try {
        window.RestomatikBookingWidget = window.RestomatikBooking.mount({
          restaurant: ID,
          restaurantIdType: 'public-id',
          baseUrl: BASE,
          lang: LANG,
          mode: 'inline',
          container: box,
          primaryColor: COLOUR,
          attribution: rmAttribution
        });
      } catch (e) { failed(); }
    };
    s.onerror = failed;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
