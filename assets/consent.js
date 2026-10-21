/* Cookie consent, Google Analytics and the Meta Pixel.
   Nothing is sent to Google or Meta before the visitor says yes, and only on
   debsbistro.com (never on a Vercel preview). The two IDs live in the <head>
   of each page (DS_GA4, DS_PIXEL). The banner is built here, in the page
   language, so it is the same on every page. */
(function () {
  var KEY = 'debs_cookie_consent';
  var FR = document.documentElement.lang === 'fr';
  var PROD = /(^|\.)debsbistro\.com$/i.test(location.hostname);

  function google() {
    if (!window.gtag || !/^G-/.test(window.DS_GA4 || '')) return;
    gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted',
      ad_personalization: 'granted', analytics_storage: 'granted' });
    if (window.DS_GA4_CHARGE) return;
    window.DS_GA4_CHARGE = true;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + window.DS_GA4;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', window.DS_GA4);
  }

  function pixel() {
    if (window.fbq || !/^[0-9]{6,}$/.test(window.DS_PIXEL || '')) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', window.DS_PIXEL); fbq('track', 'PageView');
  }

  function load() { if (!PROD) return; google(); pixel(); }

  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', FR ? 'Gestion des cookies' : 'Cookie settings');
  banner.hidden = true;
  banner.innerHTML =
    '<div class="cb-in"><p class="cb-desc">' +
    (FR ? 'Nous mesurons la fréquentation du site et nos publicités. Rien n’est déposé sans votre accord. <a href="confidentialite.html">En savoir plus</a>'
        : 'We measure visits to this site and our ads. Nothing is stored without your consent. <a href="privacy.html">Learn more</a>') +
    '</p><div class="cb-btns">' +
    '<button type="button" class="cb-btn" id="cookie-refuse">' + (FR ? 'Refuser' : 'Decline') + '</button>' +
    '<button type="button" class="cb-btn" id="cookie-accept">' + (FR ? 'Accepter' : 'Accept') + '</button>' +
    '</div></div>';
  document.body.appendChild(banner);

  function answer(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    banner.hidden = true;
    if (v === 'accepted') load();
  }
  document.getElementById('cookie-accept').addEventListener('click', function () { answer('accepted'); });
  document.getElementById('cookie-refuse').addEventListener('click', function () { answer('refused'); });

  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}
  if (choice === 'accepted') load();
  if (choice === null) banner.hidden = false;

  /* "Cookie settings" in the footer opens the banner again. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$="#cookies"]');
    if (!a) return;
    e.preventDefault();
    banner.hidden = false;
  });
})();
