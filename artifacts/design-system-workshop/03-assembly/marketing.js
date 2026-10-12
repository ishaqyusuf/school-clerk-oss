/* Direction 03 — Assembly · marketing.html behaviour.
   Renders sections from SC.data, runs the hero "assembly" collage (pause / replay),
   the role tablist and the mobile menu. Everything is local; nothing is sent. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var REDUCED = SC.reduced();
  var TINTS = ["sky", "teal", "violet", "amber", "rose"];

  function ic(name, size) { return SCIcons.icon(name, size || 16); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function avatar(name, c) { return '<span class="avatar" data-c="' + c + '">' + esc(SC.initials(name)) + "</span>"; }
  function find(list, key, val) { for (var i = 0; i < list.length; i++) if (list[i][key] === val) return list[i]; return null; }

  SC.pill({ id: "03", name: "Assembly" });

  /* ---------- Header: lift on scroll, mobile menu sheet ---------- */
  var header = $("#mkHeader");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = $("#menuBtn");
  menuBtn.addEventListener("click", function () {
    menuBtn.setAttribute("aria-expanded", "true");
    SC.open("#mobileMenu", { onClose: function () { menuBtn.setAttribute("aria-expanded", "false"); } });
  });

  /* ---------- Hero collage: product cards assemble around the mark, then drift ---------- */
  var stage = $("#collage");
  var cardsEl = $("#collageCards");
  var pauseBtn = $("#collagePause");
  var replayBtn = $("#collageReplay");
  var timers = [];
  var paused = false;

  function cc(key, inner) {
    return '<div class="cc cc-' + key + '"><div class="cc-float"><article class="c-card">' + inner + "</article></div></div>";
  }

  function collageHTML() {
    var att = D.attendance, pay = D.payments[0], u = D.user, s = D.session;
    var ward = D.students[0];
    var wardName = ward.first + " " + ward.last;
    var arm = D.students.filter(function (x) { return x.cls === "JSS 2" && x.arm === "A"; });
    var enrolled = arm.filter(function (x) { return x.status === "enrolled"; }).length;
    var jss2 = find(D.classrooms, "name", "JSS 2");
    var C = 2 * Math.PI * 32;
    var grades = [["Mathematics", 82, "A"], ["English Language", 71, "B"], ["Basic Science", 88, "A"]];

    var greet = '<div class="cc cc-greet"><div class="cc-float"><div class="c-chip">' +
      '<span class="avatar">' + esc(u.initials) + "</span><b>Good morning, " + esc(u.first) + "</b>" +
      '<span class="c-chip-sep greet-term"></span><span class="amber-dot greet-term"></span>' +
      '<span class="greet-term">' + esc(s.term) + " · Week " + s.week + "</span></div></div></div>";

    var attCard = cc("att",
      '<header class="c-head"><span class="tile tile-sm" data-c="sky">' + ic("clipboard-check", 15) + "</span>" +
      '<div><p class="c-title">Attendance today</p><p class="c-meta">' + att.classesMarked + " of " + att.classesTotal + " classes marked</p></div></header>" +
      '<div class="c-att"><div class="c-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="track" cx="40" cy="40" r="32"/>' +
      '<circle class="arc" cx="40" cy="40" r="32" stroke-dasharray="' + (C * att.rate / 100).toFixed(1) + " " + C.toFixed(1) + '"/></svg>' +
      '<span class="c-ring-num"><span><span data-count="' + att.rate + '">' + att.rate.toFixed(1) + "</span>%</span><small>present</small></span></div>" +
      '<ul class="c-legend"><li data-c="teal"><i></i>Present<b>' + att.present + '</b></li><li data-c="rose"><i></i>Absent<b>' + att.absent +
      '</b></li><li data-c="amber"><i></i>Late<b>' + att.late + "</b></li></ul></div>");

    var recCard = cc("rec",
      '<header class="c-head"><span class="tile tile-sm" data-c="teal">' + ic("receipt", 15) + "</span>" +
      '<div><p class="c-title">Payment received</p><p class="c-meta mono">' + esc(pay.receipt) + "</p></div>" +
      '<span class="badge badge-success badge-dot">Paid</span></header>' +
      '<p class="c-amount">' + SC.money(pay.amount) + "</p>" +
      '<p class="c-sub">' + esc(pay.student) + " · " + esc(pay.cls) + "</p>" +
      '<p class="c-foot"><span>' + esc(pay.method) + " · " + esc(pay.date) + "</span><span>" + esc(pay.allocation) + "</span></p>");

    var repCard = cc("rep",
      '<header class="c-head"><span class="tile tile-sm" data-c="violet">' + ic("file-text", 15) + "</span>" +
      '<div><p class="c-title">Report card · ' + esc(s.term) + '</p><p class="c-meta">' + esc(wardName) + " · " + esc(ward.cls + " " + ward.arm) + "</p></div>" +
      '<span class="badge badge-neutral">Draft</span></header>' +
      '<div class="c-grades">' + grades.map(function (g) {
        return '<div class="c-grade"><span>' + g[0] + '</span><span class="c-bar"><i style="width:' + g[1] + '%"></i></span><b>' + g[1] + '</b><span class="c-gp">' + g[2] + "</span></div>";
      }).join("") + "</div>" +
      '<p class="c-foot"><span>Class teacher · ' + esc(jss2 ? jss2.teacher : "") + "</span><span>Continuous assessment</span></p>");

    var msgCard = cc("msg",
      '<header class="c-head">' + avatar(pay.payer, "amber") +
      '<div><p class="c-title">' + esc(pay.payer) + '</p><p class="c-meta">Parent · ' + esc(ward.first) + ", " + esc(ward.cls + " " + ward.arm) + "</p></div>" +
      '<span class="c-time">9:14</span></header>' +
      '<p class="c-bubble">Good morning. I’ve paid ' + esc(ward.first) + "’s first-term fees by transfer — thank you for the quick receipt.</p>");

    var rosCard = cc("ros",
      '<header class="c-head"><span class="tile tile-sm" data-c="navy">' + ic("users", 15) + "</span>" +
      '<div><p class="c-title">JSS 2 A · Class roster</p><p class="c-meta">' + esc(jss2 ? jss2.teacher : "") + "</p></div></header>" +
      '<div class="c-faces">' + arm.map(function (st, i) { return avatar(st.first + " " + st.last, TINTS[i % TINTS.length]); }).join("") + "</div>" +
      '<p class="c-meta">' + arm.length + " students · " + enrolled + " enrolled this term</p>");

    return greet + attCard + recCard + repCard + msgCard + rosCard;
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function countEl() { return $("[data-count]", cardsEl); }
  function countUp() {
    var el = countEl();
    if (!el) return;
    var target = parseFloat(el.getAttribute("data-count"));
    var t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 1100);
      if (paused) p = 1;
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(1);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function finalState() {
    clearTimers();
    $$(".cc", cardsEl).forEach(function (c) { c.classList.add("is-in"); });
    stage.classList.remove("is-travel");
    stage.classList.add("is-landed");
    var el = countEl();
    if (el) el.textContent = parseFloat(el.getAttribute("data-count")).toFixed(1);
    if (!paused && !REDUCED) stage.classList.add("is-drifting");
  }

  function assemble() {
    clearTimers();
    stage.classList.remove("is-drifting", "is-travel", "is-landed");
    $$(".cc", cardsEl).forEach(function (c) { c.classList.remove("is-in"); });
    if (REDUCED) { finalState(); return; }
    void stage.offsetWidth; // restart transitions from the scattered state
    var order = [".cc-greet", ".cc-att", ".cc-rec", ".cc-ros", ".cc-msg", ".cc-rep"];
    var gap = 170, start = 180;
    order.forEach(function (sel, i) {
      later(function () {
        var el = $(sel, cardsEl);
        if (el) el.classList.add("is-in");
        if (sel === ".cc-att") countUp();
      }, start + i * gap);
    });
    var travelAt = start + order.length * gap + 250;
    later(function () { stage.classList.add("is-travel"); }, travelAt);
    later(function () {
      stage.classList.remove("is-travel");
      stage.classList.add("is-landed");
      if (!paused) stage.classList.add("is-drifting");
    }, travelAt + 1500);
  }

  function setPaused(p) {
    paused = p;
    stage.classList.toggle("is-paused", p);
    pauseBtn.innerHTML = ic(p ? "play" : "pause", 14) + "<span>" + (p ? "Play motion" : "Pause motion") + "</span>";
    if (p) { if (!stage.classList.contains("is-landed")) finalState(); }
    else if (stage.classList.contains("is-landed") && !REDUCED) stage.classList.add("is-drifting");
  }

  cardsEl.innerHTML = collageHTML();
  pauseBtn.addEventListener("click", function () { setPaused(!paused); });
  replayBtn.addEventListener("click", function () { if (paused) setPaused(false); assemble(); });
  if (REDUCED) {
    pauseBtn.hidden = true; // nothing loops when motion is reduced; Replay still shows the final state
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { stage.classList.toggle("is-offscreen", !e.isIntersecting); });
    }).observe(stage);
  }
  assemble();

  /* ---------- Institution fit ---------- */
  var FIT_C = ["navy", "sky", "teal", "amber"];
  $("#fitList").innerHTML = D.institutionFit.map(function (n, i) {
    return '<li data-c="' + FIT_C[i % FIT_C.length] + '"><span class="sq"></span>' + esc(n) + "</li>";
  }).join("");

  /* ---------- Modules as colour tiles (colour = the workspace module it lives in) ---------- */
  var MOD_LAYOUT = [
    { name: "Students", c: "sky", peek: "students" },
    { name: "Attendance", c: "violet" },
    { name: "Inventory", c: "amber" },
    { name: "Assessments & results", c: "violet" },
    { name: "Fees & finance", c: "teal", peek: "fees" },
    { name: "Staff", c: "sky" },
    { name: "School website", c: "slate" },
    { name: "Announcements", c: "sky" },
  ];
  function markMotif() {
    return '<svg viewBox="20 20 92 92" aria-hidden="true" focusable="false"><rect class="cta-sq-1" x="28" y="28" width="28" height="28" rx="8"/>' +
      '<rect class="cta-sq-2" x="72" y="28" width="28" height="28" rx="8"/><rect class="cta-sq-3" x="28" y="72" width="28" height="28" rx="8"/>' +
      '<path class="cta-path" d="m53 53 22 22h11l13 13"/><circle class="cta-dot" cx="100" cy="100" r="10"/></svg>';
  }
  function peekHTML(kind) {
    if (kind === "students") {
      return '<div class="mod-peek" aria-hidden="true"><div class="c-faces">' +
        D.students.slice(0, 5).map(function (s, i) { return avatar(s.first + " " + s.last, TINTS[i % TINTS.length]); }).join("") +
        "</div><div><strong>" + D.school.students + '</strong> students</div><span class="c-meta">' + D.classrooms.length + " classrooms · " + esc(D.session.title) + "</span></div>";
    }
    var f = D.finance;
    return '<div class="mod-peek" aria-hidden="true"><div><strong>' + SC.compact(f.collected) + '</strong> collected</div>' +
      '<div class="progress"><span style="width:' + f.rate + '%"></span></div>' +
      '<span class="c-meta">' + f.rate + "% of " + SC.compact(f.billed) + " billed this term</span></div>";
  }
  $("#mods").innerHTML = MOD_LAYOUT.map(function (m) {
    var mod = find(D.modules, "name", m.name);
    if (!mod) return "";
    var text = '<span class="mod-icon">' + ic(mod.icon, 22) + "</span><h3>" + esc(mod.name) + "</h3><p>" + esc(mod.body) + "</p>";
    if (!m.peek) return '<li class="mod" data-c="' + m.c + '">' + text + "</li>";
    return '<li class="mod mod-wide" data-c="' + m.c + '"><div class="mod-text">' + text + "</div>" + peekHTML(m.peek) + "</li>";
  }).join("") +
    '<li class="mod mod-wide mod-more"><div class="mod-text"><span class="mod-num">20+</span><h3>operational modules in all</h3>' +
    "<p>Start with what you need this term. Each school keeps its own configuration as it grows.</p></div>" + markMotif() + "</li>";

  /* ---------- Workflows: a school day ---------- */
  var DAY = [
    { when: "Before the bell", c: "sky", icon: "sun", sun: [70, 42] },
    { when: "During lessons", c: "amber", icon: "clock", sun: [170, 18] },
    { when: "After school", c: "teal", icon: "moon", sun: [270, 42] },
  ];
  var SQ = ["var(--x-tile-navy)", "var(--brand-sky)", "var(--brand-teal)"];
  $("#day").innerHTML = D.workflows.map(function (w, i) {
    var d = DAY[i] || DAY[0];
    return '<li class="day-card"><div class="day-sky" data-c="' + d.c + '">' +
      '<svg viewBox="0 0 340 96" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path class="day-arc" vector-effect="non-scaling-stroke" d="M20 78 A217.5 217.5 0 0 1 320 78"/>' +
      '<line class="day-horizon" vector-effect="non-scaling-stroke" x1="0" y1="78" x2="340" y2="78"/></svg>' +
      '<span class="day-sun" aria-hidden="true" style="left:' + (d.sun[0] / 340 * 100).toFixed(2) + "%;top:" + (d.sun[1] / 96 * 100).toFixed(2) + '%"></span>' +
      '<span class="day-time">' + ic(d.icon, 14) + d.when + "</span></div>" +
      '<div class="day-body"><h3>' + esc(w.title) + "</h3><p>" + esc(w.body) + "</p></div>" +
      '<div class="chain" role="img" aria-label="' + esc(w.chain.join(", then ")) + '">' +
      w.chain.map(function (step, k) {
        return '<span class="chain-step"><span class="chain-sq" style="--q:' + SQ[k % SQ.length] + '"></span>' + esc(step) + "</span>";
      }).join("") + '<span class="chain-end"></span></div></li>';
  }).join("");

  /* ---------- Roles: pill tablist (arrow keys, Home/End) ---------- */
  var ROLE_C = { admin: "navy", bursar: "teal", teacher: "violet", parent: "amber" };
  var TONE_C = { warning: "amber", info: "sky", neutral: "slate" };
  function rpHead(c, icon, title, meta) {
    return '<div class="rp-head"><span class="tile tile-sm" data-c="' + c + '">' + ic(icon, 15) + '</span><div><p class="c-title">' + title + '</p><p class="c-meta">' + meta + "</p></div></div>";
  }
  function rolePreview(id) {
    var f = D.finance, ward = D.students[0];
    if (id === "admin") {
      return '<div class="rp" aria-hidden="true">' + rpHead("navy", "layout-dashboard", "Needs attention", "Today at " + esc(D.school.name)) +
        D.tasks.map(function (t) {
          return '<div class="rp-row"><span class="tile tile-sm" data-c="' + (TONE_C[t.tone] || "slate") + '">' + ic(t.icon, 15) + "</span><div>" + esc(t.text) + "<small>" + esc(t.meta) + "</small></div></div>";
        }).join("") + "</div>";
    }
    if (id === "bursar") {
      return '<div class="rp" aria-hidden="true">' + rpHead("teal", "wallet", "Collection position", esc(D.session.term + " · " + D.session.title)) +
        '<div class="rp-row rp-stack"><div><span class="rp-big">' + SC.compact(f.collected) + "</span> <small>collected of " + SC.compact(f.billed) + " billed</small></div>" +
        '<div class="progress"><span style="width:' + f.rate + '%"></span></div><small>' + f.rate + "% collected · " + SC.compact(f.outstanding) + " outstanding</small></div>" +
        D.payments.slice(0, 2).map(function (p) {
          return '<div class="rp-row"><span class="tile tile-sm" data-c="teal">' + ic("receipt", 15) + "</span><div>" + esc(p.student) + "<small>" + esc(p.receipt + " · " + p.method) + "</small></div><b>" + SC.money(p.amount) + "</b></div>";
        }).join("") + "</div>";
    }
    if (id === "teacher") {
      var marks = ["p", "p", "l", "p"];
      var arm = D.students.filter(function (x) { return x.cls === "JSS 2" && x.arm === "A"; }).slice(0, 4);
      return '<div class="rp" aria-hidden="true">' + rpHead("violet", "clipboard-check", "Morning attendance", "JSS 2 A · " + esc(D.session.term)) +
        arm.map(function (s, i) {
          var m = marks[i];
          return '<div class="rp-row">' + avatar(s.first + " " + s.last, TINTS[i % TINTS.length]) + "<div>" + esc(s.first + " " + s.last) + "<small>" + esc(s.id) + '</small></div><span class="rp-marks">' +
            ["p", "a", "l"].map(function (k) { return '<span class="rp-mark' + (k === m ? " on-" + k : "") + '">' + k.toUpperCase() + "</span>"; }).join("") + "</span></div>";
        }).join("") + '<p class="c-meta">' + D.attendance.classesMarked + " of " + D.attendance.classesTotal + " classes marked so far today</p></div>";
    }
    var pay = D.payments[0];
    return '<div class="rp" aria-hidden="true">' + rpHead("amber", "users", "Your ward", esc(D.school.name)) +
      '<div class="rp-row">' + avatar(ward.first + " " + ward.last, "sky") + "<div>" + esc(ward.first + " " + ward.last) + "<small>" + esc(ward.cls + " " + ward.arm) + '</small></div><span class="badge badge-success badge-dot">' + D.statusLabels[ward.status] + "</span></div>" +
      '<div class="rp-row rp-stack"><small>Fee summary · ' + esc(D.session.term) + '</small><div class="rp-figs">' +
      "<div><small>Billed</small><b>" + SC.money(ward.billed) + "</b></div><div><small>Paid</small><b>" + SC.money(ward.paid) + "</b></div><div><small>Balance</small><b>" + SC.money(ward.billed - ward.paid) + "</b></div></div></div>" +
      '<div class="rp-row"><span class="tile tile-sm" data-c="teal">' + ic("receipt", 15) + "</span><div>Latest receipt<small>" + esc(pay.receipt + " · " + pay.date) + "</small></div><b>" + SC.money(pay.amount) + "</b></div></div>";
  }

  var tabsEl = $("#roleTabs"), panelsEl = $("#rolePanels");
  tabsEl.innerHTML = D.roles.map(function (r, i) {
    return '<button class="tabs-trigger role-tab" type="button" role="tab" id="tab-' + r.id + '" aria-controls="panel-' + r.id + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-c="' + ROLE_C[r.id] + '"><span class="sq"></span>' + esc(r.label) + "</button>";
  }).join("");
  panelsEl.innerHTML = D.roles.map(function (r, i) {
    return '<div class="role-panel" role="tabpanel" id="panel-' + r.id + '" aria-labelledby="tab-' + r.id + '" tabindex="0"' + (i ? " hidden" : "") + ">" +
      '<div class="role-text"><h3>' + esc(r.title) + "</h3><p>" + esc(r.body) + '</p><ul class="role-actions" aria-label="First things a ' + esc(r.label.toLowerCase()) + ' does">' +
      r.actions.map(function (a) { return '<li><span class="amber-dot"></span>' + esc(a) + "</li>"; }).join("") + "</ul></div>" + rolePreview(r.id) + "</div>";
  }).join("");

  var tabs = $$('[role="tab"]', tabsEl);
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabsEl.addEventListener("click", function (e) {
    var t = e.target.closest('[role="tab"]');
    if (t) selectTab(t, false);
  });
  tabsEl.addEventListener("keydown", function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); selectTab(next, true); }
  });

  /* ---------- School website moment (tenant theme, not the platform palette) ---------- */
  (function devices() {
    var secs = D.website.sections;
    var hero = find(secs, "key", "hero").fields;
    var feats = find(secs, "key", "features").items;
    var stats = find(secs, "key", "stats").items;
    var ann = find(secs, "key", "announcements").items;
    var s = D.school;
    var shortBody = hero.body.split(" with ")[0] + ".";
    var img = function (extra) {
      return '<div class="sl-img' + (extra || "") + '"><span class="sun"></span><span class="hill"></span><span class="hill"></span><span class="ph">' + ic("image", 12) + "Image</span></div>";
    };
    var laptop = '<div class="laptop" aria-hidden="true"><div class="laptop-lid"><div class="screen"><div class="site">' +
      '<div class="bbar"><i></i><i></i><i></i><span>' + ic("lock", 12) + esc(s.site) + "</span></div>" +
      '<div class="sl-nav"><span class="sl-crest">' + esc(s.initials) + '</span><span class="sl-name">' + esc(s.name) + "</span>" +
      '<span class="sl-links">' + D.website.pages.slice(1, 6).map(function (p) { return "<span>" + esc(p) + "</span>"; }).join("") + '</span><span class="sl-btn">Apply</span></div>' +
      '<div class="sl-hero"><div><span class="sl-kicker">' + esc(hero.kicker) + '</span><div class="sl-title">' + esc(hero.title) + "</div>" +
      '<p class="sl-body">' + esc(hero.body) + '</p><div class="sl-ctas"><span class="sl-btn">' + esc(hero.cta) + "</span></div></div>" + img() + "</div>" +
      '<div class="sl-feats">' + feats.map(function (f) { return '<div class="sl-feat"><i></i>' + esc(f) + "</div>"; }).join("") + "</div>" +
      '<div class="sl-stats">' + stats.map(function (st) { return "<div><b>" + esc(st[0]) + "</b>" + esc(st[1]) + "</div>"; }).join("") + "</div>" +
      '</div></div></div><div class="laptop-base"></div></div>';
    var phone = '<div class="phone" aria-hidden="true"><div class="screen"><div class="site"><div class="sp-notch"></div>' +
      '<div class="sp-nav"><span class="sl-crest">' + esc(s.initials) + '</span><span class="sl-name">' + esc(s.short) + '</span><span class="sp-menu"><i></i><i></i><i></i></span></div>' +
      '<div class="sp-hero"><span class="sl-kicker">Admissions open</span><div class="sl-title">' + esc(hero.title) + '</div><p class="sl-body">' + esc(shortBody) + '</p><span class="sl-btn">' + esc(hero.cta) + "</span></div>" +
      img(" sp-img") + '<div class="sp-news"><b>Announcements</b>' + esc(ann[0]) + "</div></div></div></div>";
    $("#devices").insertAdjacentHTML("afterbegin", laptop + phone);
  })();

  /* ---------- Pricing ---------- */
  var PLAN_X = [
    { unit: "one-time", list: ["Configuration", "Guided onboarding", "Data migration"], cta: ["Book a demo", "#", "btn-outline"] },
    { unit: "per month", list: ["The platform", "Updates", "Ongoing support"], cta: ["Create your school", "signup.html", "btn-default"], flag: "The everyday plan" },
    { unit: "when you're ready", list: ["AI assistance", "SMS notifications", "White-label mobile app"], cta: ["Ask about add-ons", "#", "btn-outline"] },
  ];
  $("#plans").innerHTML = D.plans.map(function (p, i) {
    var x = PLAN_X[i] || PLAN_X[0];
    return '<li class="plan' + (p.featured ? " is-featured" : "") + '">' +
      (x.flag && p.featured ? '<span class="plan-flag"><span class="amber-dot"></span>' + x.flag + "</span>" : "") +
      '<p class="plan-eyebrow">' + esc(p.eyebrow) + '</p><p class="plan-price">' + esc(p.price) + '<span class="plan-unit">' + esc(x.unit) + "</span></p>" +
      '<p class="plan-desc">' + esc(p.desc) + '</p><ul class="plan-list">' + x.list.map(function (l) { return "<li>" + ic("circle-check", 16) + esc(l) + "</li>"; }).join("") + "</ul>" +
      '<a class="btn btn-lg ' + x.cta[2] + '" href="' + x.cta[1] + '">' + x.cta[0] + "</a></li>";
  }).join("");

  /* ---------- FAQ (native details) ---------- */
  $("#faqList").innerHTML = D.faqs.map(function (f, i) {
    return '<details class="faq-item"' + (i === 0 ? " open" : "") + "><summary>" + esc(f.q) +
      '<span class="faq-plus" aria-hidden="true">' + ic("plus", 16) + "</span></summary><p>" + esc(f.a) + "</p></details>";
  }).join("");
})();
