/* 01 — Registry · marketing.html
   Renders the data-driven sections from SC.data, runs the living register page,
   the role index tablist, the prospectus → website moment, header and mobile menu.
   Local only: nothing here calls a network service. */
(function () {
  "use strict";
  var D = SC.data;
  var esc = SC.esc;
  var icon = function (n, s) { return SCIcons.icon(n, s || 16); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var ROMAN = ["i", "ii", "iii", "iv", "v"];

  // ---------- Seal + crest (SVG strings; text escaped) ----------
  var uid = 0;
  function sealSVG(ring, mono) {
    var id = "seal-arc-" + (++uid);
    var text = String(ring).toUpperCase();
    return '<svg class="seal-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      '<defs><path id="' + id + '" d="M60,60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0"/></defs>' +
      '<circle class="seal-edge" cx="60" cy="60" r="56"/>' +
      '<circle class="seal-disc" cx="60" cy="60" r="53"/>' +
      '<circle class="seal-line" cx="60" cy="60" r="49"/>' +
      '<circle class="seal-line" cx="60" cy="60" r="31"/>' +
      '<text class="seal-text"><textPath href="#' + id + '" textLength="252" lengthAdjust="spacing">' + esc(text) + "</textPath></text>" +
      '<text class="seal-mono" x="60" y="69" text-anchor="middle">' + esc(mono) + "</text>" +
      "</svg>";
  }
  function crestSVG(initials) {
    return '<svg class="crest-svg" viewBox="0 0 64 72" aria-hidden="true" focusable="false">' +
      '<path class="crest-shield" d="M32 3 L59 11 V35 C59 52 47 64 32 69 C17 64 5 52 5 35 V11 Z"/>' +
      '<path class="crest-keyline" d="M32 8.5 L54 15 V35 C54 49 44.5 59 32 63.5 C19.5 59 10 49 10 35 V15 Z"/>' +
      '<text class="crest-ini" x="32" y="43" text-anchor="middle">' + esc(initials) + "</text>" +
      "</svg>";
  }

  // ---------- Data-driven sections ----------
  function renderFit() {
    var el = $("#fit-list");
    if (el) el.innerHTML = D.institutionFit.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  }

  function renderContents() {
    var el = $("#contents");
    if (!el) return;
    el.innerHTML = D.modules.map(function (m, i) {
      return '<li><span class="c-no">' + pad(i + 1) + '</span><div>' +
        '<div class="c-line"><h3 class="c-name">' + esc(m.name) + '</h3><span class="c-leader" aria-hidden="true"></span><span class="c-icon">' + icon(m.icon, 18) + "</span></div>" +
        '<p class="c-body">' + esc(m.body) + "</p></div></li>";
    }).join("");
  }

  function renderChapters() {
    var el = $("#chapters");
    if (!el) return;
    el.innerHTML = D.workflows.map(function (w, i) {
      var chain = w.chain.map(function (c, k) {
        var last = k === w.chain.length - 1;
        var mark = last
          ? '<span class="cf-m cf-done">' + icon("check", 13) + "entered</span>"
          : '<span class="cf-m"><abbr title="carried forward">c/f</abbr>' + icon("arrow-down", 12) + "</span>";
        return '<li><span class="cf-i">' + ROMAN[k] + '</span><span class="cf-l">' + esc(c) + "</span>" + mark + "</li>";
      }).join("");
      return '<li class="chapter">' +
        '<p class="chapter-no"><b>' + pad(i + 1) + "</b>Chapter</p>" +
        '<h3 class="chapter-title">' + esc(w.title) + "</h3>" +
        '<p class="chapter-body">' + esc(w.body) + "</p>" +
        '<ol class="cf" aria-label="' + esc(w.title) + ': carried forward">' + chain + "</ol>" +
        "</li>";
    }).join("");
  }

  function renderFees() {
    var el = $("#fee-rows");
    if (!el) return;
    el.innerHTML = D.plans.map(function (p, i) {
      return "<tr" + (p.featured ? " data-featured" : "") + ">" +
        '<td class="f-no">' + pad(i + 1) + "</td>" +
        '<td class="f-item">' + esc(p.eyebrow) + "</td>" +
        '<td class="f-desc">' + esc(p.desc) + "</td>" +
        '<td class="f-amt num">' + esc(p.price) + "</td></tr>";
    }).join("");
  }

  function renderFaq() {
    var el = $("#faq-list");
    if (!el) return;
    el.innerHTML = D.faqs.map(function (f, i) {
      return '<details class="faq-item"' + (i === 0 ? " open" : "") + ">" +
        '<summary><span class="faq-n">' + pad(i + 1) + '</span><span class="faq-q">' + esc(f.q) + '</span><span class="faq-pm">' + icon("plus", 18) + "</span></summary>" +
        "<p>" + esc(f.a) + "</p></details>";
    }).join("");
  }

  // ---------- Role index (accessible tablist, arrow keys) ----------
  function renderRoles() {
    var list = $("#role-tabs"), panels = $("#role-panels");
    if (!list || !panels) return;
    var letters = "ABCD";
    list.innerHTML = D.roles.map(function (r, i) {
      return '<button type="button" role="tab" class="role-tab" id="role-tab-' + r.id + '" aria-controls="role-panel-' + r.id + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' +
        '<span class="ix" aria-hidden="true">' + letters[i] + '</span><span class="rl">' + esc(r.label) + "</span>" + icon("arrow-right", 16) + "</button>";
    }).join("");
    panels.innerHTML = D.roles.map(function (r, i) {
      return '<div class="role-panel" role="tabpanel" id="role-panel-' + r.id + '" aria-labelledby="role-tab-' + r.id + '" tabindex="0"' + (i ? " hidden" : "") + ">" +
        '<p class="eyebrow">For the ' + esc(r.label.toLowerCase()) + "</p>" +
        "<h3>" + esc(r.title) + "</h3>" +
        "<p>" + esc(r.body) + "</p>" +
        '<div class="desk"><p class="eyebrow">First on the desk</p><ol class="desk-list">' +
        r.actions.map(function (a) { return '<li><span class="desk-box" aria-hidden="true"></span><span>' + esc(a) + "</span>" + icon("arrow-up-right", 15) + "</li>"; }).join("") +
        "</ol></div></div>";
    }).join("");

    var tabs = $$(".role-tab", list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      if (tab.scrollIntoView && list.scrollWidth > list.clientWidth) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    list.addEventListener("click", function (e) {
      var t = e.target.closest(".role-tab");
      if (t) select(t, false);
    });
    list.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  }

  // ---------- The living register page ----------
  function initRegister() {
    var fig = $("#register");
    if (!fig) return;
    var page = $("[data-reg-page]", fig);
    var seal = $("[data-seal]", fig);
    if (seal) seal.innerHTML = sealSVG("Kingsway Academy · First Term · 2026/27 · ", "KA");

    var cues = $$("[data-at]", page).map(function (el) { return { el: el, t: +el.getAttribute("data-at") }; });
    var lines = $$(".rline", page);
    var legend = $$("[data-legend]", fig);
    var week = $("[data-reg-week]", fig);
    var toggle = $("#reg-toggle"), replay = $("#reg-replay");
    var FINAL = 10800, TURN = 11900, LOOP = 12600;

    var elapsed = 0, startAt = 0, raf = 0, playing = false, userPaused = false, inView = true, lastLine = null;

    function render(t) {
      for (var i = 0; i < cues.length; i++) cues[i].el.classList.toggle("is-on", t >= cues[i].t);
      var cur = null;
      lines.forEach(function (l) { if (t >= +l.getAttribute("data-from")) cur = l; });
      var turning = t >= TURN;
      lines.forEach(function (l) { l.toggleAttribute("data-current", l === cur && !turning); });
      page.classList.toggle("is-turning", turning);
      if (cur !== lastLine) {
        lastLine = cur;
        page.style.setProperty("--term", cur ? cur.getAttribute("data-term") : "0");
        if (week) week.textContent = "Week " + (cur ? cur.getAttribute("data-week") : "1") + " of 13";
        var key = cur ? cur.getAttribute("data-line") : "";
        legend.forEach(function (li) {
          if (li.getAttribute("data-legend") === key) li.setAttribute("aria-current", "step");
          else li.removeAttribute("aria-current");
        });
      }
    }
    function snap(t) {
      page.classList.add("is-resetting");
      render(t);
      void page.offsetWidth; // commit styles without transitions
      requestAnimationFrame(function () { page.classList.remove("is-resetting"); });
    }
    function frame(now) {
      var t = elapsed + (now - startAt);
      if (t >= FINAL && SC.reduced()) {
        // Reduced motion never loops: stop on the finished record.
        render(FINAL); playing = false; elapsed = FINAL; userPaused = true; setButton(); return;
      }
      if (t >= LOOP) { elapsed = 0; startAt = now; lastLine = undefined; snap(0); raf = requestAnimationFrame(frame); return; }
      render(t);
      raf = requestAnimationFrame(frame);
    }
    function setButton() {
      var label = playing ? "Pause" : "Play";
      toggle.innerHTML = icon(playing ? "pause" : "play", 14) + "<span>" + label + "</span>";
      toggle.setAttribute("aria-label", (playing ? "Pause" : "Play") + " the register animation");
    }
    function play() {
      if (playing) return;
      playing = true;
      startAt = performance.now();
      raf = requestAnimationFrame(frame);
      setButton();
    }
    function stop() {
      if (!playing) return;
      playing = false;
      cancelAnimationFrame(raf);
      elapsed += performance.now() - startAt;
      setButton();
    }
    function maybeRun() { if (!userPaused && inView && !document.hidden) play(); else stop(); }

    toggle.addEventListener("click", function () {
      if (playing) { userPaused = true; stop(); }
      else {
        userPaused = false;
        if (elapsed >= FINAL) { elapsed = 0; lastLine = undefined; snap(0); }
        play();
      }
    });
    replay.addEventListener("click", function () {
      cancelAnimationFrame(raf);
      playing = false;
      elapsed = 0;
      lastLine = undefined;
      snap(0);
      userPaused = false;
      play();
    });

    if (SC.reduced()) {
      // Reduced motion: show the finished record; Play steps through it without movement.
      userPaused = true;
      elapsed = FINAL;
      snap(FINAL);
      setButton();
      return;
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        maybeRun();
      }, { threshold: 0.2 }).observe(fig);
    }
    document.addEventListener("visibilitychange", maybeRun);
    snap(0);
    maybeRun();
  }

  // ---------- Prospectus → website ----------
  function initWebsite() {
    var stage = $("#web-stage");
    if (!stage) return;
    $$("[data-tenant-crest]", stage).forEach(function (el) { el.innerHTML = crestSVG("KA"); });
    var btns = $$("[data-view-btn]");
    function setView(v) {
      stage.setAttribute("data-view", v);
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view-btn") === v)); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { touched = true; setView(b.getAttribute("data-view-btn")); });
    });
    var touched = false;
    if (SC.reduced() || !("IntersectionObserver" in window)) { setView("site"); return; }
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      setTimeout(function () { if (!touched) setView("site"); }, 900);
    }, { threshold: 0.45 });
    io.observe(stage);
  }

  // ---------- Header: scrolled rule, section highlight, mobile menu ----------
  function initHeader() {
    var header = $("#site-header");
    var onScroll = function () { header.setAttribute("data-scrolled", String(window.scrollY > 8)); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var navLinks = $$(".site-nav a");
    if ("IntersectionObserver" in window) {
      var map = {};
      navLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var a = map[en.target.id];
          if (!a) return;
          if (en.isIntersecting) { navLinks.forEach(function (x) { x.classList.toggle("is-active", x === a); }); }
          else if (a.classList.contains("is-active")) a.classList.remove("is-active");
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    }

    var btn = $("#menu-btn"), sheet = $("#menu-sheet");
    btn.addEventListener("click", function () {
      btn.setAttribute("aria-expanded", "true");
      SC.open(sheet, { onClose: function () { btn.setAttribute("aria-expanded", "false"); } });
    });
    $$("[data-menu-link]", sheet).forEach(function (a) {
      a.addEventListener("click", function () { SC.close(sheet); });
    });
    // Close the sheet if the viewport grows past the mobile breakpoint.
    window.addEventListener("resize", function () {
      if (window.innerWidth > 960 && sheet.getAttribute("data-open") === "true") SC.close(sheet);
    });
  }

  // ---------- Boot ----------
  renderFit();
  renderContents();
  renderChapters();
  renderFees();
  renderFaq();
  renderRoles();
  SCIcons.hydrate(document);
  initRegister();
  initWebsite();
  initHeader();
  SC.pill({ id: "01", name: "Registry" });
})();
