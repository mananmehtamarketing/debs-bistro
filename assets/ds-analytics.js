/* ══════════════════════════════════════════════════════════════════════════
   ds-analytics.js — mesure des actions, Double Shift
   Source de vérité : doubleshift/_tools/ds-analytics.js
   Copie de travail : <site>/assets/js/ds-analytics.js

   AUCUNE CONFIGURATION. Le fichier ne contient pas d'identifiant de mesure :
   il se contente d'envoyer des événements au gtag déjà chargé par la page.
   On le copie tel quel d'un site à l'autre, sans rien éditer.

   ── Ce qu'il détecte tout seul, sans toucher au HTML ──
     tel:…                → click_phone
     mailto:…             → click_email
     instagram.com/…      → click_instagram
     calendly.com/…       → click_calendly
     borneoapp.com/…      → click_order     (commande à emporter)
     usellweb.co/…        → click_order     (commande à emporter Uniiti)
     message Calendly     → schedule_call   (le rendez-vous réellement pris)

   ── Ce qu'il faut déclarer dans le HTML ──
     <a href="/reservation" data-ds-event="click_reserve">Réserver</a>
     <a href="/carte.pdf"   data-ds-event="download_menu">La carte</a>
     <body data-ds-page="menu">   → envoie view_menu au chargement
     <body data-ds-page="reservation"> → envoie view_reservation

   ── Vocabulaire ──
     Restaurant : view_menu · view_reservation · view_groupes · view_contact
                  click_reserve · click_phone
                  click_directions · download_menu · click_order
                  open_calendar · reservation_started
                  reservation_submitted · groupe_submitted · contact_submitted

   ── Le tunnel de reservation, identique sur TOUS nos widgets ──
     Regle de Gian, 04/09/2026 : « ogni volta che costruiamo questo sistema
     noi deve essere uguale ». Quand le widget est le notre, il envoie :
       click_reserve        clic sur Reserver, n'importe ou sur le site  -> ViewContent
       view_reservation     arrivee sur la page                          -> (rien : PageView suffit)
       open_calendar        choix du jour, ou ouverture du calendrier    -> (GA4 seulement)
       reservation_started  clic sur Continuer, ecran des coordonnees    -> InitiateCheckout
       reservation_submitted  envoi confirme                             -> Schedule
     open_calendar et reservation_started ne partent qu'UNE fois par visite :
     un client qui change d'avis trois fois n'a pas trois intentions.
     Agence     : generate_lead · click_calendly · schedule_call
                  click_instagram · click_email · click_phone

   ── Les trois envois de formulaire ──
     Un seul nom par type de formulaire, sur tous les clients et sur toutes
     les pages. Une page SEO par commune avec son propre formulaire groupes
     envoie groupe_submitted, comme les autres : le nom ne se décline pas.
       reservation_submitted → réservation de table confirmée
       groupe_submitted      → formulaire groupes / privatisation envoyé
       contact_submitted     → formulaire de contact envoyé
     À appeler au succès de l'envoi, jamais au clic sur le bouton :
       DSA.evenement('groupe_submitted')

   Le consentement n'est pas géré ici : gtag le gère déjà via Consent Mode v2.
   Sans consentement l'événement part en ping anonyme, ce qui est le
   comportement voulu.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var CLE_PROVENANCE = 'ds_provenance';

  /* ── Provenance ─────────────────────────────────────────────────────────
     Mêmes règles que les champs cachés du formulaire : utm, puis fbclid /
     gclid, puis le référent normalisé. Un référent interne ne compte pas. */
  function origine() {
    var p = new URLSearchParams(location.search);
    var utm = p.get('utm_source');
    if (utm) {
      var jolis = { instagram: 'Instagram', facebook: 'Facebook', meta: 'Meta',
                    google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn',
                    email: 'Email', newsletter: 'Newsletter' };
      var s = jolis[utm.toLowerCase()] || utm;
      var m = p.get('utm_medium');
      var c = p.get('utm_campaign');
      return s + (m ? ' (' + m + ')' : '') + (c ? ' · ' + c : '');
    }
    if (p.get('fbclid')) return 'Meta (clic sur une annonce)';
    if (p.get('gclid')) return 'Google Ads';
    var r = document.referrer;
    if (!r) return 'Direct ou application';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (h === location.hostname) return 'Direct ou application';
      if (/instagram/.test(h)) return 'Instagram';
      if (/facebook|^fb\./.test(h)) return 'Facebook';
      if (/google\./.test(h)) return 'Google (recherche)';
      if (/linkedin/.test(h)) return 'LinkedIn';
      if (/tiktok/.test(h)) return 'TikTok';
      return h;
    } catch (e) { return 'Direct ou application'; }
  }

  /* Le premier contact est écrit par le bloc PROVENANCE de la page.
     On le lit, on ne l'écrit pas : une seule source pour cette valeur. */
  function premierContact() {
    try {
      var v = JSON.parse(localStorage.getItem(CLE_PROVENANCE) || 'null');
      return v && v.source ? v.source + ', le ' + v.date : 'Première visite connue';
    } catch (e) { return 'Première visite connue'; }
  }

  var PROVENANCE = null;
  function parametres(extra) {
    if (!PROVENANCE) {
      PROVENANCE = { origine: origine(), premier_contact: premierContact() };
    }
    var o = {
      origine: PROVENANCE.origine,
      premier_contact: PROVENANCE.premier_contact,
      page: location.pathname + (location.hash || '')
    };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    return o;
  }

  /* ── Correspondance vers les événements standards de Meta ───────────────
     Le même geste porte deux noms : le nôtre pour GA4, celui de Meta pour le
     Pixel. Un nom absent de cette table ne part pas vers Meta, et c'est
     voulu : Meta n'optimise que sur ses événements standards.

     schedule_call est volontairement absent. Sur le site de l'agence le
     Pixel écoute déjà le postMessage de Calendly de son côté (voir plus
     bas) : l'ajouter ici compterait le rendez-vous deux fois. */
  var META = {
    reservation_submitted: 'Schedule',
    groupe_submitted:      'Lead',
    contact_submitted:     'Lead',
    reservation_started:   'InitiateCheckout',
    click_order:           'InitiateCheckout',
    click_reserve:         'ViewContent',
    click_phone:           'Contact',
    click_email:           'Contact'
  };

  /* `click_order` (clic vers l'outil de commande à emporter : Borneo…)
     partage InitiateCheckout avec `reservation_started`. Décidé par Gian le
     14/10/2026 (Yushithaï). Pour que Meta sépare les deux dans une
     conversion personnalisée, chacun part avec son content_category. */
  var META_CATEGORIE = {
    click_order:         'commande',
    reservation_started: 'reservation'
  };

  /* ⚠️ `view_reservation` n'est PLUS un InitiateCheckout, et `open_calendar`
     n'a pas de contrepartie Meta. Décidé par Gian le 04/09/2026.
     Arriver sur la page de réservation n'est pas une intention : c'est la même
     chose que le `navigated` de Zenchef, écarté sur La Marée parce qu'il part
     trois fois par session. L'intention commence au moment où l'on donne ses
     coordonnées, donc `reservation_started`, qui est l'exact équivalent du
     `choose_slot` de Zenchef : le dernier barreau avant le formulaire.
     Les deux restent envoyés à GA4, où le tunnel entier a de la valeur. */

  /* ── Envoi ────────────────────────────────────────────────────────────
     Deux destinations, jamais liées : si le Pixel n'est pas sur la page,
     ou s'il échoue, GA4 reçoit quand même. Et ce fichier ne touche pas à
     l'envoi du formulaire lui-même, qui part côté serveur. */
  function envoyer(nom, extra) {
    var p = parametres(extra);
    if (typeof window.gtag === 'function') window.gtag('event', nom, p);
    if (META[nom] && typeof window.fbq === 'function') {
      try {
        if (META_CATEGORIE[nom]) window.fbq('track', META[nom], { content_category: META_CATEGORIE[nom] });
        else window.fbq('track', META[nom]);
      } catch (e) {}
    }
  }

  /* Le libellé du bouton : sans lui on sait qu'on a cliqué, pas sur quoi.
     Coupé à 60 caractères, GA4 n'en garde pas davantage utilement. */
  function libelle(el) {
    var t = (el.getAttribute('aria-label') || el.textContent || '')
              .replace(/\s+/g, ' ').trim();
    return t.length > 60 ? t.slice(0, 60) : (t || '(sans libellé)');
  }

  /* ── Détection automatique par destination ──────────────────────────── */
  function evenementAutomatique(href, el) {
    if (!href) return null;
    if (/^tel:/i.test(href)) return 'click_phone';
    if (/^mailto:/i.test(href)) return 'click_email';
    if (/instagram\.com/i.test(href)) return 'click_instagram';
    if (/calendly\.com/i.test(href)) return 'click_calendly';
    /* usellweb.co : la commande à emporter Uniiti (Deb's Bistro, 21/10/2026). */
    if (/(borneoapp\.com|usellweb\.co)/i.test(href)) return 'click_order';
    if (el.id === 'ctCal') return 'click_calendly';
    /* maps.google.com/?cid=… est le format imposé au pied : sans lui,
       click_directions restait à zéro (relevé le 14/10/2026). */
    if (/(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(href)) {
      return 'click_directions';
    }
    return null;
  }

  /* Un seul écouteur sur le document : les éléments ajoutés après le
     chargement (menu mobile, blocs révélés au scroll) sont couverts sans
     avoir à réattacher quoi que ce soit. */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-ds-event], a') : null;
    if (!el) return;

    var declare = el.getAttribute('data-ds-event');
    var nom = declare || evenementAutomatique(el.getAttribute('href') || '', el);
    if (!nom) return;

    envoyer(nom, { libelle: libelle(el) });
  }, true);

  /* ── Calendly : le rendez-vous réellement pris ──────────────────────────
     La page de remerciement de Calendly s'ouvre dans leur iframe, sur leur
     domaine : invisible. Le seul signal fiable est le postMessage, avec
     contrôle de l'origine. Le Pixel Meta écoute déjà de son côté, cet
     écouteur-ci est indépendant et ne le remplace pas. */
  window.addEventListener('message', function (e) {
    if (String(e.origin || '').indexOf('calendly.com') === -1) return;
    var d = e.data;
    if (!d || typeof d.event !== 'string' || d.event !== 'calendly.event_scheduled') return;
    envoyer('schedule_call');
  });

  /* ── Widgets de réservation en iframe (Zenchef) ─────────────────────────
     La réservation se termine sur le domaine du prestataire : rien n'est
     visible dans la page. Le SDK Zenchef, lui, rediffuse ses étapes en
     événements sur window, avec les données dans e.detail. Noms relevés
     dans sdk.zenchef.com/v1/sdk.min.js le 03/09/2026.

     Écouteurs inoffensifs : si le widget n'est pas sur la page, ils ne se
     déclenchent jamais. Rien à déclarer dans le HTML. */
  var ZENCHEF = {
    'zc-widget-booking-completed': 'reservation_submitted',
    'zc-widget-slot-selected':     'view_reservation'
  };
  for (var evt in ZENCHEF) {
    if (!ZENCHEF.hasOwnProperty(evt)) continue;
    (function (nomZenchef, nomNotre) {
      window.addEventListener(nomZenchef, function (e) {
        /* On ne recopie pas e.detail : ce sont les données du prestataire,
           elles peuvent contenir un nom ou un email. Le widget suffit. */
        envoyer(nomNotre, { widget: 'zenchef' });
      });
    })(evt, ZENCHEF[evt]);
  }

  /* ── Restomatik : le module se monte DANS la page, pas d'iframe ─────────
     Relevé dans booking.restomatik.app/embed-widget.js le 06/10/2026
     (Échalote). Le module rediffuse ses étapes sur window :
     `restomatik-booking:step_change`, e.detail.step = date → people → time
     → (allergies) → details. « details » est l'écran des coordonnées, donc
     le `reservation_started` de notre tunnel.

     ⚠️ Son `restomatik-booking:submit_success` n'est PAS la réservation : il
     part aussi quand on choisit un jour (appel day-decision) et pendant la
     saisie des coordonnées (guarantee/preview). La seule preuve est le
     POST …/api/public/restaurants/<id>/requests qui répond 2xx. On l'écoute
     en enveloppant fetch, et seulement sur une page où le module s'est
     chargé : ailleurs fetch n'est jamais touché.

     Une fois par visite, comme notre widget (vuCal, vuDebut). */
  var rmVu = {};
  function rmUneFois(nom) {
    if (rmVu[nom]) return;
    rmVu[nom] = true;
    envoyer(nom, { widget: 'restomatik' });
  }
  window.addEventListener('restomatik-booking:step_change', function (e) {
    var etape = e && e.detail && e.detail.step;
    if (etape === 'people' || etape === 'time') rmUneFois('open_calendar');
    if (etape === 'details') rmUneFois('reservation_started');
  });
  var rmEcoute = false;
  function rmEcouterEnvoi() {
    if (rmEcoute || typeof window.fetch !== 'function') return;
    rmEcoute = true;
    var origine = window.fetch;
    window.fetch = function (entree, init) {
      var reponse = origine.apply(this, arguments);
      try {
        var url = typeof entree === 'string' ? entree : (entree && entree.url) || '';
        var methode = String((init && init.method) || (entree && entree.method) || 'GET').toUpperCase();
        if (methode === 'POST' &&
            /restomatik\.app\/api\/public\/restaurants\/[^\/?]+\/requests(\?|$)/.test(url)) {
          reponse.then(function (r) { if (r && r.ok) rmUneFois('reservation_submitted'); },
                       function () {});
        }
      } catch (e) {}
      return reponse;
    };
  }
  if (window.__RestomatikBookingWidget) rmEcouterEnvoi();
  window.addEventListener('restomatik-booking:widget_loaded', rmEcouterEnvoi);

  /* ── Pages à valeur (restaurants) ───────────────────────────────────── */
  function pageAValeur() {
    var t = document.body && document.body.getAttribute('data-ds-page');
    if (t === 'menu') envoyer('view_menu');
    else if (t === 'reservation') envoyer('view_reservation');
    else if (t === 'groupes') envoyer('view_groupes');
    /* ajouté le 04/09/2026 : sans lui, data-ds-page="contact" ne déclenchait
       rien et la page semblait couverte alors qu'elle ne l'était pas. Le
       formulaire de contact a besoin d'un dénominateur dans REMY, comme
       groupes. GA4 seul : il n'entre pas dans la table META. */
    else if (t === 'contact') envoyer('view_contact');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pageAValeur);
  } else {
    pageAValeur();
  }

  /* Exposé pour les cas qui ne sont ni un clic ni une page : envoi de
     formulaire maison, confirmation de réservation interne, etc.
     Usage : DSA.evenement('reservation_submitted', { couverts: 4 })
             DSA.evenement('groupe_submitted')
             DSA.evenement('contact_submitted') */
  window.DSA = { evenement: envoyer, parametres: parametres };
})();
