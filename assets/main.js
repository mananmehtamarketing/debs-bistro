/* Deb's Bistro : shared behaviour (vanilla, progressive enhancement) */
(function () {
  "use strict";

  /* mobile nav */
  var burger = document.querySelector(".burger");
  var links = document.querySelector(".nav-links");
  if (burger && links) {
    var close = document.createElement("button");
    close.className = "nav-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "Close menu");
    links.appendChild(close);
    burger.addEventListener("click", function () { links.classList.add("open"); });
    close.addEventListener("click", function () { links.classList.remove("open"); });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  /* duplicate ticker content for seamless loop */
  document.querySelectorAll(".ticker-track").forEach(function (t) {
    t.innerHTML += t.innerHTML;
  });

  /* reveal on scroll */
  var io = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 })
    : null;
  document.querySelectorAll(".rv").forEach(function (el) {
    if (io) io.observe(el); else el.classList.add("in");
  });

  /* reels: tap to play with sound; pause all others; autopause offscreen */
  var reels = Array.prototype.slice.call(document.querySelectorAll(".reel video"));
  function pauseOthers(current) {
    reels.forEach(function (v) {
      if (v !== current && !v.paused) { v.pause(); v.closest(".reel").classList.remove("playing"); }
    });
  }
  reels.forEach(function (v) {
    v.addEventListener("click", function () {
      if (v.paused) {
        pauseOthers(v);
        v.muted = false;
        v.play();
        v.closest(".reel").classList.add("playing");
      } else {
        v.pause();
        v.closest(".reel").classList.remove("playing");
      }
    });
    v.addEventListener("ended", function () {
      v.closest(".reel").classList.remove("playing");
    });
  });
  if ("IntersectionObserver" in window && reels.length) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (!e.isIntersecting && !v.paused) { v.pause(); v.closest(".reel").classList.remove("playing"); }
      });
    }, { threshold: 0.2 });
    reels.forEach(function (v) { vio.observe(v); });
  }

  /* ambient videos (muted loops) : play only when visible, save battery */
  var ambients = Array.prototype.slice.call(document.querySelectorAll("video[data-ambient]"));
  if ("IntersectionObserver" in window && ambients.length) {
    var aio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { v.play().catch(function () {}); }
        else { v.pause(); }
      });
    }, { threshold: 0.15 });
    ambients.forEach(function (v) { aio.observe(v); });
  }

  /* lightbox for gallery */
  var lb = document.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    document.querySelectorAll("[data-zoom]").forEach(function (img) {
      img.addEventListener("click", function () {
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || "";
        lb.classList.add("open");
      });
    });
    lb.addEventListener("click", function () { lb.classList.remove("open"); lbImg.src = ""; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") lb.classList.remove("open");
    });
  }


  /* ---------- REBUILD 2026-08-21 ---------- */

  /* hero: reduced-motion users get the static poster, never the video (brief §03) */
  var heroVid = document.querySelector(".hero video");
  if (heroVid) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      var poster = heroVid.getAttribute("poster");
      heroVid.pause();
      heroVid.removeAttribute("autoplay");
      heroVid.remove();
      if (poster) {
        var img = document.createElement("img");
        img.className = "hero-img";
        img.src = poster;
        img.alt = "The dining room at Deb's Bistro, Lyon";
        document.querySelector(".hero").insertBefore(img, document.querySelector(".hero").firstChild);
      }
    } else {
      /* poster paints first, source attaches after load so the title and Reserve never wait */
      var src = heroVid.getAttribute("data-src");
      if (src) {
        var start = function () {
          if (heroVid.querySelector("source")) return;
          var s = document.createElement("source");
          s.src = src; s.type = "video/mp4";
          heroVid.appendChild(s);
          heroVid.load();
          heroVid.play().catch(function () {});
        };
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start);
      }
    }
  }

  /* menu page: render from assets/menu.json so the team edits data, not code */
  var menuRoot = document.getElementById("menu-root");
  if (menuRoot) {
    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    };
    /* The menu is edited by the restaurant in the editor at admin.debsbistro.com,
       which stores it in Supabase. We read that first and fall back to the file
       in this repo if the network or the service is unavailable, so the menu page
       can never end up empty. */
    var SB_URL = "https://cpyjjydwpdonokdveeft.supabase.co/rest/v1/debs_site_content?key=eq.menu&select=data";
    var SB_KEY = "sb_publishable_neJnfwF1A2LQJ7HP8OCnkQ_qE-8HXWr";
    var fromEditor = function () {
      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 4000) : null;
      return fetch(SB_URL, { headers: { apikey: SB_KEY }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (rows) {
          if (timer) clearTimeout(timer);
          var d = rows && rows[0] && rows[0].data;
          if (!d || !d.sections || !d.sections.length) throw new Error("empty payload");
          return d;
        });
    };
    var fromFile = function () {
      return fetch("assets/menu.json")
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    };
    fromEditor()
      .catch(function (err) {
        if (window.console) console.warn("menu editor unavailable, using bundled menu:", err);
        return fromFile();
      })
      .then(function (data) {
        var nav = document.getElementById("menu-jump");
        var navHtml = "", bodyHtml = "";
        data.sections.forEach(function (sec) {
          navHtml += '<a href="#' + esc(sec.id) + '">' + esc(sec.title.en) + "</a>";
          var items = sec.items.map(function (d) {
            var dot = d.veg ? '<span class="veg-dot" title="Vegetarian"></span>'
                            : '<span class="nonveg-dot" title="Contains meat or fish"></span>';
            var neu = d.new ? '<span class="new-flag">New</span>' : "";
            var tags = (d.tags || []).map(function (t) {
              return '<span class="tag-chip">' + esc(t) + "</span>";
            }).join("");
            var al = (d.allergens && d.allergens.length)
              ? '<div class="al">Allergens: ' + d.allergens.map(esc).join(", ") + "</div>" : "";
            var lunch = d.priceLunch
              ? '<div class="al">Lunch portion ' + esc(d.priceLunch) + " &euro;</div>" : "";
            return '<div class="dish">'
              + '<div class="dish-line"><h3>' + dot + esc(d.name) + neu + "</h3>"
              + '<span class="dots"></span><span class="price">' + esc(d.price) + " &euro;</span></div>"
              + "<p>" + esc(d.en) + "</p>"
              + (tags ? '<div class="tags">' + tags + "</div>" : "")
              + al + lunch + "</div>";
          }).join("");
          bodyHtml += '<section class="menu-section" id="' + esc(sec.id) + '">'
            + '<div class="wrap"><div class="menu-title"><h2>' + esc(sec.title.en) + "</h2>"
            + (sec.script ? '<span class="script hindi" lang="hi">' + esc(sec.script) + "</span>" : "")
            + "</div>"
            + (sec.note ? '<p class="menu-note">' + esc(sec.note.en) + "</p>" : "")
            + (sec.chefNote ? '<p class="menu-note">&ldquo;' + esc(sec.chefNote.en) + '&rdquo; <b>Deb</b></p>' : "")
            + '<div class="dishes">' + items + "</div></div></section>";
        });
        if (nav) nav.innerHTML = navHtml;
        var keys = Object.keys(data.allergenKey).map(function (k) {
          return "<b>" + esc(k) + "</b> " + esc(data.allergenKey[k].en);
        }).join(" &middot; ");
        bodyHtml += '<div class="wrap"><div class="glossary"><b>Allergens</b><br>' + keys
          + "<br><br>" + esc(data.meatOrigin.en) + "</div></div>";
        menuRoot.innerHTML = bodyHtml;
      })
      .catch(function (err) {
        menuRoot.innerHTML = '<div class="wrap menu-fallback"><p class="lead">The menu could not be loaded. '
          + 'Please call us on <a href="tel:+33472714911">+33 4 72 71 49 11</a>.</p></div>';
        if (window.console) console.error("menu.json failed:", err);
      });
  }

  /* catering enquiry form */
  var ef = document.getElementById("enquiry-form");
  if (ef) {
    var msg = document.getElementById("enquiry-msg");
    ef.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = ef.querySelector("button[type=submit]");
      btn.disabled = true;
      var payload = {};
      new FormData(ef).forEach(function (v, k) { payload[k] = v; });
      fetch(ef.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        msg.className = "form-msg ok show";
        msg.textContent = "Thank you. Deb's team has received your event brief and will come back to you directly.";
        ef.reset();
      }).catch(function () {
        /* LEDGER F20: the endpoint intentionally returns 501 until a recipient inbox exists.
           It must never report success while nothing is delivered. */
        msg.className = "form-msg err show";
        msg.innerHTML = "This form is not connected yet. Please email "
          + '<a href="mailto:contact@debsbistro.fr">contact@debsbistro.fr</a> or call '
          + '<a href="tel:+33472714911">+33 4 72 71 49 11</a> and we will come straight back to you.';
      }).then(function () { btn.disabled = false; });
    });
  }


  /* Food Trails clips: tap to play with sound, one at a time, pause when scrolled away.
     Muted by default and understandable without sound (brief §10). */
  var trails = Array.prototype.slice.call(document.querySelectorAll(".trail video"));
  if (trails.length) {
    var stopAll = function (except) {
      trails.forEach(function (v) {
        if (v !== except && !v.paused) { v.pause(); v.closest(".trail").classList.remove("playing"); }
      });
    };
    trails.forEach(function (v) {
      v.addEventListener("click", function () {
        if (v.paused) { stopAll(v); v.muted = false; v.play().catch(function () {}); v.closest(".trail").classList.add("playing"); }
        else { v.pause(); v.closest(".trail").classList.remove("playing"); }
      });
      v.addEventListener("ended", function () { v.closest(".trail").classList.remove("playing"); });
    });
    if ("IntersectionObserver" in window) {
      var tio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting && !e.target.paused) { e.target.pause(); e.target.closest(".trail").classList.remove("playing"); }
        });
      }, { threshold: 0.25 });
      trails.forEach(function (v) { tio.observe(v); });
    }
  }


  /* Instagram reel band: nothing downloads until the band is scrolled into view,
     then every clip autoplays muted and loops. Audio tracks were stripped at encode
     time, so there is no way for this to make noise. Reduced-motion users get a
     normal horizontal scroller with static posters instead of a moving marquee. */
  var band = document.querySelector(".reel-marquee");
  if (band) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var vids = Array.prototype.slice.call(band.querySelectorAll("video[data-src]"));
    var boot = function () {
      vids.forEach(function (v) {
        if (v.getAttribute("src")) return;
        if (reduce) return;                 /* leave the poster showing */
        v.setAttribute("src", v.getAttribute("data-src"));
        v.muted = true; v.loop = true; v.playsInline = true;
        v.play().catch(function () {});
      });
    };
    if ("IntersectionObserver" in window) {
      var bio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { boot(); bio.disconnect(); }
        });
      }, { rootMargin: "300px" });
      bio.observe(band);
    } else { boot(); }
  }

  /* highlight today's row in the hours table */
  var day = new Date().getDay(); /* 0 sun .. 6 sat */
  var row = document.querySelector('.hours tr[data-day="' + day + '"]');
  if (row) row.classList.add("today");
})();
