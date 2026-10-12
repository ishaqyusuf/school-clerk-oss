/* 02 · Timetable — marketing page. Local simulation only; nothing here calls a service. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var I = function (n, s) { return SCIcons.icon(n, s || 16); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  SC.pill({ id: "02", name: "Timetable" });

  /* ---------- Institution fit strip ---------- */
  $("#fit-grid").insertAdjacentHTML("beforeend", D.institutionFit.map(function (f) {
    return '<div class="mk-fit-cell">' + esc(f) + "</div>";
  }).join(""));

  /* ---------- Workflows: lanes into one record ---------- */
  (function () {
    var tone = { admit: "ink", day: "success", money: "primary" };
    var tags = { admit: '<span class="tag" style="--c:var(--foreground)">', day: '<span class="tag tag-success">', money: '<span class="tag tag-info">' };
    var lanes = D.workflows.map(function (w) {
      var nodes = w.chain.map(function (step, i) {
        return '<li class="wf-node"><span class="wf-node-step">Step ' + (i + 1) + '</span><span class="wf-node-name">' + esc(step) + "</span>" +
          (i === w.chain.length - 1 ? '<span class="wf-port" aria-hidden="true"></span>' : "") + "</li>";
      }).join("");
      var tag = tags[w.key] || '<span class="tag tag-info">';
      return '<div class="wf-lane" data-c="' + (tone[w.key] || "primary") + '">' +
        '<div class="wf-label">' + tag + esc(w.key) + '</span><h3 class="wf-title">' + esc(w.title) + '</h3><p class="wf-body">' + esc(w.body) + "</p></div>" +
        '<ol class="wf-chain" aria-label="' + esc(w.title) + ' — steps">' + nodes + "</ol></div>";
    }).join("");

    var s = D.students[0];
    var spine =
      '<aside class="wf-spine" aria-label="One student record">' +
        '<p class="eyebrow">One student record</p>' +
        '<div><span class="wf-rec-id">' + esc(s.id) + '</span><p class="wf-rec-name">' + esc(s.first + " " + s.last) + "</p>" +
        '<span class="wf-rec-cls">' + esc(s.cls + " " + s.arm) + " · " + esc(s.guardian) + "</span></div>" +
        '<dl class="wf-rec">' +
          '<dt><span class="tag" style="--c:var(--foreground)">admit</span></dt><dd>' + esc(D.statusLabels[s.status]) + "<small>" + esc(D.admissionLabels[s.admission]) + "</small></dd>" +
          '<dt><span class="tag tag-success">day</span></dt><dd>' + esc(s.cls + " " + s.arm) + "<small>Class roster</small></dd>" +
          '<dt><span class="tag tag-info">money</span></dt><dd>' + SC.money(s.paid) + " paid<small>of " + SC.money(s.billed) + " billed</small></dd>" +
        "</dl>" +
      "</aside>";

    $("#wf").innerHTML =
      '<div class="wf-main"><div class="wf-colhead" aria-hidden="true"><span>Lane</span><span>Step 1</span><span>Step 2</span><span>Step 3</span></div>' + lanes + "</div>" + spine;
  })();

  /* ---------- Modules: M01–M08 ---------- */
  $("#mods").innerHTML = D.modules.map(function (m, i) {
    return '<article class="mod"><div class="mod-top"><span class="mod-code">M' + pad(i + 1) + "</span>" + I(m.icon, 18) + "</div>" +
      '<div><h3 class="mod-name">' + esc(m.name) + '</h3><p class="mod-body">' + esc(m.body) + "</p></div></article>";
  }).join("");

  /* ---------- Roles: split view with accessible tabs ---------- */
  (function () {
    var finance = D.nav.filter(function (m) { return m.module === "Finance"; })[0];
    var scope = {
      admin: D.nav.map(function (m) { return m.module; }),
      bursar: ["Finance"].concat(finance.sections.filter(function (s) { return s.title; }).map(function (s) { return s.title; })),
      teacher: ["Teaching", "My Classes", "My Students", "Attendance", "Score Entry", "Reports"],
      parent: ["Parent portal"],
    };
    var tabsEl = $("#roles-tabs");
    var panel = $("#role-panel");
    tabsEl.innerHTML = D.roles.map(function (r, i) {
      return '<button type="button" class="role-tab" role="tab" id="rt-' + r.id + '" aria-controls="role-panel" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-i="' + i + '">' +
        '<span class="role-key">R' + (i + 1) + '</span><span class="role-name">' + esc(r.label) + '</span><span class="role-meta">' + r.actions.length + " tasks</span></button>";
    }).join("");
    var tabs = $$(".role-tab", tabsEl);

    function show(i, focus) {
      var r = D.roles[i];
      tabs.forEach(function (t, k) {
        t.setAttribute("aria-selected", String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      if (focus) tabs[i].focus();
      panel.setAttribute("aria-labelledby", "rt-" + r.id);
      var sc = scope[r.id] || [];
      panel.innerHTML = '<div class="role-anim">' +
        '<p class="eyebrow"><b>R' + (i + 1) + '</b><span class="sep"></span>' + esc(r.label) + "</p>" +
        '<h3 class="role-title">' + esc(r.title) + '</h3><p class="role-body">' + esc(r.body) + "</p>" +
        '<ol class="role-acts">' + r.actions.map(function (a, k) {
          return '<li><span class="n">' + pad(k + 1) + "</span><span>" + esc(a) + "</span>" + I("arrow-right", 15) + "</li>";
        }).join("") + "</ol>" +
        '<div class="role-scope"><span class="eyebrow">Opens to</span>' + sc.map(function (s, k) {
          return '<span class="tag ' + (k === 0 ? "tag-info" : "tag-muted") + '">' + esc(s) + "</span>";
        }).join("") + "</div></div>";
    }
    tabsEl.addEventListener("click", function (e) {
      var t = e.target.closest(".role-tab");
      if (t) show(+t.getAttribute("data-i"), false);
    });
    tabsEl.addEventListener("keydown", function (e) {
      var cur = tabs.indexOf(document.activeElement);
      if (cur < 0) return;
      var n = tabs.length, next = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (cur + 1) % n;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (cur - 1 + n) % n;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      if (next === null) return;
      e.preventDefault();
      show(next, true);
    });
    function orient() { tabsEl.setAttribute("aria-orientation", window.matchMedia("(max-width: 860px)").matches ? "horizontal" : "vertical"); }
    orient();
    window.addEventListener("resize", orient);
    show(0, false);
  })();

  /* ---------- School website moment (tenant's own theme) ---------- */
  (function () {
    var W = D.website, S = D.school;
    var find = function (k) { return W.sections.filter(function (s) { return s.key === k; })[0] || {}; };
    var hero = find("hero").fields || {};
    var feats = find("features").items || [];
    var stats = find("stats").items || [];
    var news = find("announcements").items || [];
    var links = ["Home", "About", "Admissions", "Events", "Contact"];
    $("#site").innerHTML =
      '<div class="site-nav"><span class="site-crest">' + esc(S.initials) + '</span><span class="site-name">' + esc(S.name) + "</span>" +
        '<span class="site-links">' + links.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + '</span><span class="site-apply">Apply</span></div>' +
      '<div class="site-hero"><div><span class="site-kicker">' + esc(hero.kicker) + '</span><p class="site-title">' + esc(hero.title) + '</p><p class="site-body">' + esc(hero.body) + '</p><span class="site-cta">' + esc(hero.cta) + "</span></div>" +
        '<div class="site-img"><i></i><i></i><i></i><i></i><span>Image</span></div></div>' +
      '<div class="site-feats">' + feats.map(function (f) { return '<div class="site-feat">' + esc(f) + "</div>"; }).join("") + "</div>" +
      '<div class="site-band"><div class="site-stats">' + stats.map(function (s) { return "<div><b>" + esc(s[0]) + "</b><span>" + esc(s[1]) + "</span></div>"; }).join("") + "</div>" +
        '<ul class="site-news">' + news.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="site-foot"><span>' + esc(S.name) + " · " + esc(S.city) + ", " + esc(S.state) + "</span><span>" + esc(S.motto) + "</span></div>";
    var t = W.templates;
    $("#site-tpls").innerHTML = "Four templates to start from: " + t.map(function (x, i) {
      return "<b>" + esc(x.name) + "</b>" + (x.plan !== "All plans" ? " (" + esc(x.plan) + ")" : "") + (i < t.length - 2 ? ", " : i === t.length - 2 ? " and " : ".");
    }).join("");
  })();

  /* ---------- Pricing table ---------- */
  (function () {
    var tags = ["Once", "Recurring", "Opt-in"];
    var ctas = [["Plan your setup", "#"], ["Create your school", "signup.html"], ["Ask about add-ons", "#"]];
    $("#price").innerHTML = D.plans.map(function (p, i) {
      var c = ctas[i] || ctas[0];
      return '<article class="plan' + (p.featured ? " is-featured" : "") + '" aria-labelledby="plan-' + i + '">' +
        '<div class="plan-head"><h3 class="eyebrow" id="plan-' + i + '">' + esc(p.eyebrow) + '</h3><span class="tag ' + (p.featured ? "tag-info" : "tag-muted") + '">' + tags[i] + "</span></div>" +
        '<div class="plan-price"><span class="plan-k">Range</span><strong>' + esc(p.price) + "</strong></div>" +
        '<p class="plan-desc"><span class="plan-k">Covers</span>' + esc(p.desc) + "</p>" +
        '<div class="plan-cta"><a class="btn ' + (p.featured ? "btn-default" : "btn-outline") + '" href="' + c[1] + '">' + esc(c[0]) + "</a></div>" +
        "</article>";
    }).join("");
  })();

  /* ---------- FAQ: two-column index (native details) ---------- */
  (function () {
    var half = Math.ceil(D.faqs.length / 2);
    var item = function (f, i) {
      return '<details><summary><span class="faq-key">Q' + pad(i + 1) + '</span><span class="faq-q">' + esc(f.q) + "</span>" + I("plus", 18) + '</summary><p class="faq-a">' + esc(f.a) + "</p></details>";
    };
    $("#faq-list").innerHTML =
      '<div class="faq-col">' + D.faqs.slice(0, half).map(function (f, i) { return item(f, i); }).join("") + "</div>" +
      '<div class="faq-col">' + D.faqs.slice(half).map(function (f, i) { return item(f, i + half); }).join("") + "</div>";
  })();

  /* ---------- Mobile menu sheet ---------- */
  var menu = $("#mk-menu");
  var menuBtn = $("#menu-btn");
  menuBtn.addEventListener("click", function () {
    menuBtn.setAttribute("aria-expanded", "true");
    SC.open(menu, { onClose: function () { menuBtn.setAttribute("aria-expanded", "false"); } });
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("[data-menu-link]")) SC.close(menu);
  });

  /* ---------- Hero: live week timetable ---------- */
  (function () {
    var START = 7 * 60;          // grid starts 07:00
    var T0 = 7 * 60 + 30;        // animation from 07:30
    var T1 = 15 * 60 + 45;       // … to 15:45
    var RUN = 14000, HOLD = 2800;
    var toMin = function (t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; };
    var fmt = function (m) { m = Math.floor(m); return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };

    var pay = D.payments;
    var r0 = pay[0];
    var days = [
      { k: "mon", d: "Mon", n: "05" }, { k: "tue", d: "Tue", n: "06" }, { k: "wed", d: "Wed", n: "07" },
      { k: "thu", d: "Thu", n: "08" }, { k: "fri", d: "Fri", n: "09", today: true },
    ];
    var past = {
      mon: [{ t: "07:45", title: "Attendance", c: "success", icon: "clipboard-check" }, { t: "11:30", title: "Admission approved", c: "ink", icon: "user-check" }],
      tue: [{ t: "07:45", title: "Attendance", c: "success", icon: "clipboard-check" }, { t: "10:30", title: "Receipt " + SC.money(pay[7].amount), c: "primary", icon: "receipt" }],
      wed: [{ t: "07:45", title: "Attendance", c: "success", icon: "clipboard-check" }, { t: "10:00", title: "Receipt " + SC.money(pay[5].amount), c: "primary", icon: "receipt" }, { t: "13:30", title: "PTA notice sent", c: "ink", icon: "megaphone" }],
      thu: [{ t: "07:45", title: "Attendance", c: "success", icon: "clipboard-check" }, { t: "11:00", title: "Receipt " + SC.money(pay[3].amount), c: "primary", icon: "receipt" }, { t: "14:00", title: "CA 2 · 80% in", c: "violet", icon: "notebook-pen" }],
    };
    var live = [
      { t: "07:45", title: "Attendance · JSS 2 A", meta: "Register marked", c: "success", icon: "clipboard-check",
        log: "Attendance marked · <b>JSS 2 A</b> · register complete" },
      { t: "10:00", title: "Receipt " + SC.money(r0.amount), meta: r0.receipt + " · " + r0.method, c: "primary", icon: "receipt",
        log: "Receipt <b>" + esc(r0.receipt) + "</b> · " + SC.money(r0.amount) + " · " + esc(r0.method) + " · " + esc(r0.student) + ", " + esc(r0.cls) },
      { t: "13:00", title: "CA scores recorded", meta: "JSS 2 Maths · CA 2", c: "violet", icon: "notebook-pen",
        log: "CA 2 scores recorded · <b>JSS 2 Mathematics</b> · 100%" },
      { t: "15:00", title: "Report cards ready", meta: "JSS 2 A · class sheet", c: "orange", icon: "file-text",
        log: "Report cards ready · <b>JSS 2 A</b> class report sheet" },
    ];

    function blk(b, isLive) {
      var at = toMin(b.t);
      return '<div class="tt-blk ' + (isLive ? "is-live" : "is-past") + '" data-c="' + b.c + '" style="--t:' + (at - START) + '"' + (isLive ? ' data-at="' + at + '"' : "") + ">" +
        '<span class="tt-blk-time">' + I(b.icon, 11) + b.t + "</span>" +
        '<span class="tt-blk-t">' + esc(b.title) + "</span>" +
        (isLive && b.meta ? '<span class="tt-blk-m">' + esc(b.meta) + "</span>" : "") + "</div>";
    }
    var hours = "";
    for (var h = 0; h <= 9; h++) hours += '<span class="tt-hour" style="--i:' + h + '">' + pad(7 + h) + ":00</span>";

    $("#tt-grid").innerHTML =
      '<div class="tt-head" aria-hidden="true"><div class="tt-corner">Wk 4</div>' + days.map(function (d) {
        return '<div class="tt-day' + (d.today ? " is-today" : "") + '" data-day="' + d.k + '">' + d.d + " <b>" + d.n + "</b>" + (d.today ? '<span class="tag tag-info">Today</span>' : "") + "</div>";
      }).join("") + "</div>" +
      '<div class="tt-body" id="tt-body" aria-hidden="true"><div class="tt-gutter">' + hours + "</div>" +
      days.map(function (d) {
        var inner = d.today ? live.map(function (b) { return blk(b, true); }).join("") + '<div class="tt-now-today"></div>' : (past[d.k] || []).map(function (b) { return blk(b, false); }).join("");
        return '<div class="tt-col' + (d.today ? " is-today" : "") + '" data-day="' + d.k + '">' + inner + "</div>";
      }).join("") +
      '<div class="tt-now"><span class="tt-now-tag" id="tt-now-tag">07:30</span></div></div>';

    var tt = $("#tt"), body = $("#tt-body"), clock = $("#tt-clock"), nowTag = $("#tt-now-tag");
    var logEl = $("#tt-log"), countEl = $("#tt-count"), toggle = $("#tt-toggle"), replay = $("#tt-replay");
    var blocks = $$(".tt-blk.is-live", body);
    var reduced = SC.reduced();
    var elapsed = 0, last = 0, raf = 0, playing = !reduced, inView = true, logKey = null;

    function setLog(key, html) {
      if (key === logKey) return;
      logKey = key;
      logEl.innerHTML = '<span class="tt-log-line">' + html + "</span>";
    }
    function setTime(m) {
      body.style.setProperty("--now-m", (m - START).toFixed(2));
      var label = fmt(m);
      clock.textContent = label;
      nowTag.textContent = label;
      var n = 0, newest = -1;
      blocks.forEach(function (el, i) {
        var on = m >= +el.getAttribute("data-at");
        if (on) { n++; newest = i; }
        if (on && !el.classList.contains("is-landed")) {
          el.classList.add("is-landed", "is-fresh");
          setTimeout(function () { el.classList.remove("is-fresh"); }, 700);
        } else if (!on && el.classList.contains("is-landed")) {
          el.classList.remove("is-landed", "is-fresh");
        }
      });
      if (m >= T1 - 1) setLog("end", '<span class="t">' + fmt(T1) + "</span><b>Day recorded</b> · " + blocks.length + " entries, each in its place");
      else if (newest < 0) setLog("start", '<span class="t">' + fmt(T0) + "</span>School day starts · nothing recorded yet");
      else setLog(newest, '<span class="t">' + live[newest].t + "</span>" + live[newest].log);
      countEl.textContent = n + "/" + blocks.length + " today";
    }
    function tick(ts) {
      raf = 0;
      if (!playing || !inView || document.hidden) { last = 0; return; }
      if (last) elapsed += Math.min(ts - last, 100);
      last = ts;
      if (elapsed > RUN + HOLD) elapsed = 0;
      setTime(T0 + (T1 - T0) * Math.min(elapsed / RUN, 1));
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf && playing && inView && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
    function renderToggle() {
      var label = playing ? "Pause" : "Play";
      toggle.setAttribute("aria-label", label + " timetable animation");
      toggle.innerHTML = I(playing ? "pause" : "play", 16) + '<span class="tt-ctrl-l">' + label + "</span>";
      tt.classList.toggle("is-paused", !playing);
    }

    if (reduced) {
      // Reduced motion: final state, no loop, no controls.
      setTime(15 * 60 + 20);
      setLog("end", '<span class="t">' + fmt(T1) + "</span><b>Day recorded</b> · " + blocks.length + " entries, each in its place");
      $("#tt-ctrl").hidden = true;
      tt.classList.add("is-paused");
      return;
    }

    setTime(T0);
    toggle.addEventListener("click", function () { playing = !playing; renderToggle(); start(); });
    replay.addEventListener("click", function () {
      elapsed = 0;
      setTime(T0);
      playing = true;
      renderToggle();
      start();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        start();
      }, { threshold: 0.1 }).observe(tt);
    }
    document.addEventListener("visibilitychange", start);
    renderToggle();
    start();
  })();
})();
