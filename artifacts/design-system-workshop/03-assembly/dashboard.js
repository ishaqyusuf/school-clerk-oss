/* School Clerk · Direction 03 — Assembly · dashboard.js
   The live floating-sidebar shell on the shared sample data (SC.data).
   Every action is a local simulation: nothing is sent, saved, printed or downloaded. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var money = SC.money;
  var TODAY = "2026-10-09";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

  function I(name, size) { return SCIcons.icon(name, size || 16); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---------------------------------------------------------------------------
  // Vocabulary: module tones, arm tints, status → badge variant
  // ---------------------------------------------------------------------------
  var TONE = { Overview: "navy", People: "sky", Academics: "violet", Finance: "teal", Operations: "amber", Settings: "slate" };
  var ARM_TONE = { A: "sky", B: "teal", C: "violet", Emerald: "teal", Gold: "amber", Science: "sky", Arts: "rose" };
  var STATUS = { enrolled: ["Enrolled", "success"], "not-enrolled": ["Not enrolled", "neutral"] };
  var ADMISSION = { new: ["New admission", "info"], returning: ["Returning", "violet"], unclassified: ["Needs classification", "warning"] };
  var FEE = { paid: ["Fees paid", "success"], part: ["Fees part-paid", "info"], owing: ["Fees owing", "warning"], overdue: ["Fees overdue", "destructive"] };
  var PAY = { paid: ["Paid", "success"], refunded: ["Refunded", "destructive"], pending: ["Pending", "warning"] };
  var METHOD_ICON = { Transfer: "landmark", Cash: "banknote", POS: "credit-card" };
  var TASK_TONE = { warning: "amber", info: "sky", neutral: "slate" };

  function armTone(arm) { return ARM_TONE[arm] || "slate"; }

  // ---------------------------------------------------------------------------
  // Routes from SC.data.nav (exact labels)
  // ---------------------------------------------------------------------------
  var ROUTES = {};
  var ORDER = [];
  function routeId(mod, label) {
    if (mod === "People" && label === "Students") return "students";
    if (mod === "Finance" && label === "Collections") return "collections";
    if (mod === "Overview" && label === "Dashboard") return "dashboard";
    return SC.slugify(mod + " " + label);
  }
  D.nav.forEach(function (m) {
    m.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        var id = routeId(m.module, it.label);
        ROUTES[id] = { id: id, module: m.module, section: sec.title || "", label: it.label, icon: it.icon, count: it.count, tone: TONE[m.module] };
        ORDER.push(id);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // State (sample data, normalised so fee lines and balances agree)
  // ---------------------------------------------------------------------------
  function feeLines(s) {
    if (s.feeIdx) return s.feeIdx.map(function (i) { return D.fees[i]; });
    return D.fees.filter(function (f) {
      if (f.audience === "New students") return s.admission === "new";
      return f.type === "Required";
    });
  }
  function sum(list) { return list.reduce(function (t, n) { return t + n; }, 0); }
  function billedFor(s) { return sum(feeLines(s).map(function (f) { return f.amount; })); }

  var state = {
    route: "students",
    students: D.students.map(function (src) {
      var s = Object.assign({}, src, { other: "", phone2: "" });
      s.billed = billedFor(s);
      s.paid = Math.min(s.paid, s.billed);
      return s;
    }),
    payments: D.payments.map(function (src) {
      var p = Object.assign({}, src);
      if (!PAY[p.status]) p.status = "pending";
      return p;
    }),
    totals: { all: D.school.students, enrolled: 451, newAdm: 64, returning: 419, unclassified: 3 },
    finance: Object.assign({}, D.finance),
    quick: "all",
    search: "",
    filters: { cls: "", status: "", admission: "" },
    selected: new Set(),
    payQuick: "all",
    paySearch: "",
    collapsed: null,
    openModules: {},
    term: { session: D.session.title, term: D.session.term },
    nextReceipt: 413,
    nextStudent: 216,
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function byId(id) { return state.students.filter(function (s) { return s.id === id; })[0]; }
  function byName(n) { return state.students.filter(function (s) { return nameOf(s) === n; })[0]; }
  function nameOf(s) { return s.first + " " + s.last; }
  function classOf(s) { return s.cls + " " + s.arm; }
  function initialsOf(s) { return (s.first.charAt(0) + s.last.charAt(0)).toUpperCase(); }
  function pct(a, b) { return b ? Math.round((a / b) * 1000) / 10 : 0; }
  function mil(n) { return "₦" + (n / 1e6).toFixed(2) + "m"; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }
  function parseAmount(v) { return parseInt(String(v || "").replace(/[^\d]/g, ""), 10) || 0; }
  function payerFrom(g) { return String(g || "").replace(/^(Mr|Mrs|Ms|Dr|Alh|Mal|Hajiya|Chief|Prof)\.?\s+/i, ""); }
  function shortDate(iso) { var p = String(iso || TODAY).split("-"); return pad(+p[2], 2) + " " + MONTHS[+p[1] - 1]; }
  function longDate(iso) { var p = String(iso).split("-"); return +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0]; }
  function ageOn(iso) {
    var b = String(iso).split("-").map(Number), t = TODAY.split("-").map(Number);
    var a = t[0] - b[0];
    if (t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) a--;
    return a;
  }
  function radioVal(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function feeStatus(s) {
    if (s.paid >= s.billed) return "paid";
    if (s.fee === "overdue") return "overdue";
    return s.paid > 0 ? "part" : "owing";
  }
  function admKey(a) { return a === "new" ? "newAdm" : a === "returning" ? "returning" : "unclassified"; }
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  }
  function isTyping(el) { return !!(el && el.closest && el.closest("input, textarea, select, [contenteditable]")); }
  function overlayOpen() { return !!document.querySelector('.sheet[data-open="true"], .dialog[data-open="true"]'); }

  function badge(pair, dot, extra) {
    return '<span class="badge badge-' + pair[1] + (dot ? " badge-dot" : "") + (extra ? " " + extra : "") + '">' + esc(pair[0]) + "</span>";
  }
  // Badge rule (see components.html): dot = live state, icon = waiting on someone, plain = classification.
  function payBadge(st) {
    if (st === "pending") return '<span class="badge badge-warning">' + I("clock", 12) + "Pending</span>";
    return badge(PAY[st] || PAY.pending, true);
  }
  function avatar(s, size) {
    return '<span class="avatar' + (size ? " avatar-" + size : "") + " tone-" + armTone(s.arm) + '" aria-hidden="true">' + esc(initialsOf(s)) + "</span>";
  }
  function tile(icon, tone, size) {
    return '<span class="tile' + (size ? " tile-" + size : "") + " tone-" + tone + '" aria-hidden="true">' + I(icon, size === "sm" ? 13 : size === "lg" ? 20 : 16) + "</span>";
  }
  // Progress ring with the brand mark's amber endpoint dot.
  function ring(p, size, sw, ink, inner) {
    size = size || 44; sw = sw || 5;
    var r = (size - sw) / 2, c = 2 * Math.PI * r, cx = size / 2;
    var f = Math.max(0, Math.min(100, p)) / 100;
    var a = (f * 360 - 90) * Math.PI / 180;
    var dx = cx + r * Math.cos(a), dy = cx + r * Math.sin(a);
    return '<span class="ring-wrap ink-' + (ink || "teal") + '" style="width:' + size + "px;height:" + size + 'px">' +
      '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true" focusable="false">' +
      '<circle class="ring-track" cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke-width="' + sw + '" fill="none"/>' +
      '<circle class="ring-bar" cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke-width="' + sw + '" fill="none" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - f)).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cx + ')"/>' +
      (f > 0 ? '<circle class="ring-dot" cx="' + dx.toFixed(2) + '" cy="' + dy.toFixed(2) + '" r="' + (sw * 0.72).toFixed(2) + '"/>' : "") +
      "</svg>" + (inner != null ? '<span class="ring-label">' + inner + "</span>" : "") + "</span>";
  }
  function weeksHTML(cur, total) {
    var h = "";
    for (var i = 1; i <= total; i++) h += '<i class="' + (i < cur ? "done" : i === cur ? "now" : "") + '"></i>';
    return '<span class="weeks" style="--n:' + total + '" aria-hidden="true">' + h + "</span>";
  }
  function busy(btn, on, label) {
    if (on) {
      btn.setAttribute("data-label", btn.innerHTML);
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML = SCIcons.icon("loader-circle", 16, "spin") + esc(label);
    } else {
      btn.removeAttribute("aria-busy");
      btn.innerHTML = btn.getAttribute("data-label") || btn.innerHTML;
    }
  }
  // Open a sheet/dialog with a style flush first so the slide-in transition runs.
  function openPanel(el, opts) {
    if (el.getAttribute("data-open") === "true") return;
    el.hidden = false;
    void el.offsetWidth;
    SC.open(el, opts);
    setTimeout(function () { if (el.getAttribute("data-open") === "true") el.hidden = false; }, 320);
  }

  // ---------------------------------------------------------------------------
  // Popover manager (fixed positioning, outside click, Esc, arrow keys)
  // ---------------------------------------------------------------------------
  var pop = null;
  function placePop(el, anchor, place) {
    var r = anchor.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, m = 8;
    el.style.left = "0px"; el.style.top = "0px";
    var w = el.offsetWidth, h = el.offsetHeight, x, y;
    if (place === "right") { x = r.right + 12; y = r.top - 6; }
    else if (place === "top") { x = r.left + r.width / 2 - w / 2; y = r.top - h - 10; }
    else {
      y = r.bottom + 8;
      x = place === "bottom-start" ? r.left : r.right - w;
      if (y + h > vh - m && r.top - h - 8 > m) y = r.top - h - 8;
    }
    x = Math.max(m, Math.min(x, vw - w - m));
    y = Math.max(m, Math.min(y, vh - h - m));
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
  }
  function showPop(el, anchor, opts) {
    opts = opts || {};
    if (pop && pop.el === el && pop.anchor === anchor) { hidePop(false); return; }
    hidePop(false);
    el.hidden = false;
    pop = { el: el, anchor: anchor, place: opts.place || "bottom-end", onPick: opts.onPick };
    placePop(el, anchor, pop.place);
    anchor.setAttribute("aria-expanded", "true");
    if (opts.focus !== false) {
      var f = el.querySelector('[role="menuitemradio"][aria-checked="true"]') || el.querySelector('[aria-current="page"]') ||
        el.querySelector(".menu-item:not(:disabled), .notif-item") || el.querySelector("button:not(:disabled)");
      if (f) f.focus({ preventScroll: true });
    }
  }
  function hidePop(restore) {
    if (!pop) return;
    var p = pop; pop = null;
    p.el.hidden = true;
    p.anchor.setAttribute("aria-expanded", "false");
    if (restore && p.anchor.isConnected && p.anchor.offsetParent !== null) p.anchor.focus({ preventScroll: true });
  }
  document.addEventListener("pointerdown", function (e) {
    if (pop && !pop.el.contains(e.target) && !pop.anchor.contains(e.target)) hidePop(false);
  });
  document.addEventListener("click", function (e) {
    if (!pop) return;
    var item = e.target.closest && e.target.closest(".menu-item, .notif-item");
    if (!item || !pop.el.contains(item) || item.disabled) return;
    var cb = pop.onPick;
    if (!item.hasAttribute("data-keep")) hidePop(item.tagName !== "A");
    if (cb) cb(item);
  });
  document.addEventListener("keydown", function (e) {
    if (!pop) return;
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); hidePop(true); return; }
    if (e.key === "Tab") { hidePop(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].indexOf(e.key) > -1 && pop.el.contains(document.activeElement)) {
      var items = $$(".menu-item:not(:disabled), .notif-item", pop.el);
      if (!items.length) return;
      e.preventDefault();
      var i = items.indexOf(document.activeElement);
      if (e.key === "Home") i = 0;
      else if (e.key === "End") i = items.length - 1;
      else i = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[i].focus();
    }
  }, true);
  window.addEventListener("resize", function () { if (pop) placePop(pop.el, pop.anchor, pop.place); });
  window.addEventListener("scroll", function (e) {
    if (pop && !(e.target && e.target.nodeType === 1 && pop.el.contains(e.target))) placePop(pop.el, pop.anchor, pop.place);
  }, true);

  function mi(val, icon, label, opts) {
    opts = opts || {};
    return '<button type="button" class="menu-item' + (opts.destructive ? " is-destructive" : "") + '" role="' + (opts.radio ? "menuitemradio" : "menuitem") + '" data-val="' + esc(val) + '"' +
      (opts.radio ? ' aria-checked="' + !!opts.checked + '"' : "") + (opts.disabled ? " disabled" : "") + ">" +
      (opts.radio ? '<span class="mi-check">' + I("check") + "</span>" : I(icon)) + "<span>" + esc(label) + (opts.hint ? "<small>" + esc(opts.hint) + "</small>" : "") + "</span></button>";
  }

  // ---------------------------------------------------------------------------
  // Sidebar (floating card · module tiles · navy active pill · icon rail)
  // ---------------------------------------------------------------------------
  var mqWide = window.matchMedia("(min-width: 1280px)");
  var mqMobile = window.matchMedia("(max-width: 767px)");

  function navLink(mod, it, cls) {
    var id = routeId(mod, it.label), cur = id === state.route;
    var href = id === "settings-website" ? "website.html" : "#" + id;
    var count = id === "students" ? state.totals.all : it.count;
    return '<a class="' + cls + '" href="' + href + '" data-route="' + id + '"' + (cls === "menu-item" ? ' role="menuitem"' : "") + (cur ? ' aria-current="page"' : "") + ">" +
      I(it.icon, 16) + '<span class="sb-label">' + esc(it.label) + "</span>" +
      (count ? '<span class="sb-count">' + count + "</span>" : "") +
      (id === "settings-website" ? I("arrow-up-right", 14) : "") + "</a>";
  }
  function navHTML(ctx) {
    var cur = ROUTES[state.route];
    return D.nav.map(function (m) {
      var active = !!cur && cur.module === m.module;
      var open = ctx === "more" ? true : (Object.prototype.hasOwnProperty.call(state.openModules, m.module) ? state.openModules[m.module] : active);
      var gid = ctx + "-grp-" + SC.slugify(m.module);
      var body = m.sections.map(function (sec) {
        return (sec.title ? '<p class="sb-section">' + esc(sec.title) + "</p>" : "") +
          '<ul class="sb-list">' + sec.items.map(function (it) { return "<li>" + navLink(m.module, it, "sb-item") + "</li>"; }).join("") + "</ul>";
      }).join("");
      return '<div class="sb-group' + (active ? " is-active" : "") + '">' +
        '<button type="button" class="sb-module" data-module="' + esc(m.module) + '" aria-expanded="' + open + '" aria-controls="' + gid + '" aria-label="' + esc(m.module) + (active ? ", current module" : "") + '">' +
        '<span class="tile tone-' + TONE[m.module] + '" aria-hidden="true">' + I(m.icon, 16) + "</span>" +
        '<span class="sb-module-label">' + esc(m.module) + "</span>" +
        '<span class="sb-chev" aria-hidden="true">' + I("chevron-down", 16) + "</span></button>" +
        '<div class="sb-items" id="' + gid + '"' + (open ? "" : " hidden") + ">" + body + "</div></div>";
    }).join("");
  }
  function renderSidebar() {
    $("#sb-nav").innerHTML = navHTML("sb");
    $("#more-nav").innerHTML = navHTML("more");
  }
  function isCurrentTerm() { return state.term.session === D.session.title && state.term.term === D.session.term; }
  function termLabel() { return isCurrentTerm() ? D.session.term + " · Week " + D.session.week : state.term.term + " · " + state.term.session; }
  function renderTermCard() {
    var s = D.session, cur = isCurrentTerm();
    $("#sb-term").innerHTML =
      '<span class="term-full"><span class="tc-top"><strong>' + esc(state.term.term) + '</strong><span class="dot-amber" aria-hidden="true"></span></span>' +
      "<small>" + esc(state.term.session) + (cur ? " · Week " + s.week + " of " + s.weeks : " · viewing") + "</small>" +
      (cur ? weeksHTML(s.week, s.weeks) : "") + "</span>" +
      '<span class="term-mini">' + ring(pct(s.week, s.weeks), 38, 4, "navy", String(s.week)) + "</span>";
    $("#sb-term").setAttribute("aria-label", "Switch term. Now: " + termLabel());
    $("#term-chip-label").textContent = termLabel();
    $("#more-term-label").textContent = termLabel();
  }
  function isCollapsed() { return $("#app").getAttribute("data-collapsed") === "true" && !mqMobile.matches; }
  function applyCollapse() {
    var c = state.collapsed === null ? !mqWide.matches : state.collapsed;
    $("#app").setAttribute("data-collapsed", String(c));
    document.body.setAttribute("data-rail", String(c));
    var t = $("#sb-toggle");
    t.setAttribute("aria-expanded", String(!c));
    t.setAttribute("aria-label", c ? "Expand sidebar" : "Collapse sidebar");
    t.title = (c ? "Expand" : "Collapse") + " sidebar (" + (IS_MAC ? "⌘B" : "Ctrl B") + ")";
  }
  function toggleSidebar() {
    state.collapsed = !($("#app").getAttribute("data-collapsed") === "true");
    hidePop(false);
    applyCollapse();
    renderSidebar();
  }
  function onWideChange() { state.collapsed = null; hidePop(false); applyCollapse(); renderSidebar(); }
  if (mqWide.addEventListener) mqWide.addEventListener("change", onWideChange); else mqWide.addListener(onWideChange);

  function toggleGroup(btn) {
    var mod = btn.getAttribute("data-module");
    var open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    var body = document.getElementById(btn.getAttribute("aria-controls"));
    if (body) body.hidden = !open;
    if (btn.closest("#sb-nav")) state.openModules[mod] = open;
  }
  function openFlyout(btn, mod) {
    var m = D.nav.filter(function (x) { return x.module === mod; })[0];
    var el = $("#pop-menu");
    el.setAttribute("aria-label", mod);
    el.innerHTML = '<p class="menu-label">' + tile(m.icon, TONE[mod], "sm") + esc(mod) + "</p>" + m.sections.map(function (sec) {
      return (sec.title ? '<p class="menu-sub">' + esc(sec.title) + "</p>" : "") + sec.items.map(function (it) { return navLink(mod, it, "menu-item"); }).join("");
    }).join("");
    showPop(el, btn, { place: "right" });
  }
  $("#sb-nav").addEventListener("click", function (e) {
    var b = e.target.closest(".sb-module");
    if (!b) return;
    if (isCollapsed()) openFlyout(b, b.getAttribute("data-module"));
    else toggleGroup(b);
  });
  $("#more-nav").addEventListener("click", function (e) {
    var b = e.target.closest(".sb-module");
    if (b) { toggleGroup(b); return; }
    if (e.target.closest("a")) SC.close($("#sheet-more"));
  });
  $("#sb-toggle").addEventListener("click", toggleSidebar);

  // ---------------------------------------------------------------------------
  // Router + header row
  // ---------------------------------------------------------------------------
  function routeTo(id) {
    if (location.hash.slice(1) === id) route(id);
    else location.hash = id;
  }
  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (ROUTES[id] || id === "finance-receive-payment") route(id);
  });
  function route(id, initial) {
    hidePop(false);
    if (id === "finance-receive-payment") {
      history.replaceState(null, "", "#collections");
      id = "collections";
      setTimeout(function () { openReceive(); }, 40);
    }
    if (!ROUTES[id] || id === "settings-website") id = "students";
    state.route = id;
    var r = ROUTES[id];
    var view = id === "students" || id === "collections" || id === "dashboard" ? id : "empty";
    $$("[data-view]").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== view; });
    renderHeader(r);
    renderSidebar();
    renderTabbar();
    if (view === "students") renderStudents();
    else if (view === "collections") renderCollections();
    else if (view === "dashboard") renderDashboard();
    else renderEmpty(r);
    renderBulk();
    if (!initial) {
      window.scrollTo(0, 0);
      if (!overlayOpen()) $("#main").focus({ preventScroll: true });
    }
  }
  function renderHeader(r) {
    var t = $("#page-tile"), crumb = $("#page-crumb"), title = $("#page-title");
    var chev = " " + I("chevron-right", 12) + " ";
    if (r.id === "dashboard") {
      title.textContent = "Good morning, " + D.user.first;
      crumb.innerHTML = "Friday 9 October" + chev + esc(D.session.title) + " · " + esc(D.session.term);
      t.className = "tile tile-lg tone-amber page-tile";
      t.innerHTML = I("sun", 20);
      document.title = "Dashboard · Kingsway Academy";
    } else {
      title.textContent = r.label;
      crumb.innerHTML = esc(r.module) + (r.section ? chev + esc(r.section) : "");
      t.className = "tile tile-lg tone-" + r.tone + " page-tile";
      t.innerHTML = I(r.icon, 20);
      document.title = r.label + " · Kingsway Academy";
    }
  }
  function renderTabbar() {
    var r = ROUTES[state.route];
    var key = state.route === "dashboard" ? "dashboard" : state.route === "students" ? "students" : r.module === "Finance" ? "collections" : "more";
    $$(".tab[data-tab]").forEach(function (t) {
      if (t.getAttribute("data-tab") === key) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
  }
  function refresh() {
    renderSidebar();
    if (state.route === "students") renderStudents();
    else if (state.route === "collections") renderCollections();
    else if (state.route === "dashboard") renderDashboard();
    renderBulk();
  }

  // ---------------------------------------------------------------------------
  // Students page
  // ---------------------------------------------------------------------------
  var QUICK = [
    { id: "all", label: "All", n: function () { return state.totals.all; } },
    { id: "enrolled", label: "Enrolled", n: function () { return state.totals.enrolled; } },
    { id: "new", label: "New", n: function () { return state.totals.newAdm; } },
    { id: "unclassified", label: "Needs classification", n: function () { return state.totals.unclassified; } },
  ];
  var FILTERS = {
    cls: { label: "Class", all: "All classes", icon: "school", options: function () {
      var seen = {};
      state.students.forEach(function (s) { seen[classOf(s)] = 1; });
      return Object.keys(seen).sort().map(function (c) { return [c, c]; });
    } },
    status: { label: "Status", all: "Any status", icon: "circle-check", options: function () { return [["enrolled", "Enrolled"], ["not-enrolled", "Not enrolled"]]; } },
    admission: { label: "Admission", all: "Any admission", icon: "user-check", options: function () { return [["new", "New admission"], ["returning", "Returning"], ["unclassified", "Needs classification"]]; } },
  };

  function renderStudents() {
    renderStats();
    renderQuick();
    renderFilterButtons();
    renderStudentRows();
    $("#lede-enrolled").textContent = state.totals.enrolled;
  }
  function stat(label, value, side, meta) {
    return '<article class="card stat"><p class="stat-label">' + esc(label) + '</p><span class="stat-side">' + side + "</span>" +
      '<p class="stat-value">' + value + '</p><p class="stat-meta">' + meta + "</p></article>";
  }
  function renderStats() {
    var t = state.totals;
    $("#student-stats").innerHTML =
      stat("Total students", t.all, tile("users", "navy"), esc(D.session.title) + " · " + esc(D.session.term)) +
      stat("Enrolled this term", t.enrolled, ring(pct(t.enrolled, t.all), 40, 5, "teal"), pct(t.enrolled, t.all) + "% of " + t.all + " students") +
      stat("New admissions", t.newAdm, tile("user-plus", "sky"), '<span class="dot-amber" aria-hidden="true"></span>3 waiting for approval') +
      stat("Returning", t.returning, tile("refresh-cw", "violet"), "Continuing from 2025/2026");
  }
  function renderQuick() {
    $("#student-quick").innerHTML = QUICK.map(function (q) {
      return '<button type="button" class="seg-btn" data-quick="' + q.id + '" aria-pressed="' + (state.quick === q.id) + '">' + esc(q.label) + '<span class="n">' + q.n() + "</span></button>";
    }).join("");
  }
  function optLabel(k, v) {
    var o = FILTERS[k].options().filter(function (x) { return x[0] === v; })[0];
    return o ? o[1] : v;
  }
  function renderFilterButtons() {
    $$(".filter-btn").forEach(function (b) {
      var k = b.getAttribute("data-filter"), f = FILTERS[k], v = state.filters[k];
      var label = v ? optLabel(k, v) : f.label;
      b.setAttribute("data-active", String(!!v));
      b.setAttribute("aria-label", f.label + " filter: " + (v ? label : f.all));
      b.innerHTML = I(f.icon) + "<span>" + esc(label) + "</span>" + I("chevron-down", 14);
    });
  }
  function filtered() {
    var q = state.search.trim().toLowerCase(), f = state.filters;
    return state.students.filter(function (s) {
      if (state.quick === "enrolled" && s.status !== "enrolled") return false;
      if (state.quick === "new" && s.admission !== "new") return false;
      if (state.quick === "unclassified" && s.admission !== "unclassified") return false;
      if (f.cls && classOf(s) !== f.cls) return false;
      if (f.status && s.status !== f.status) return false;
      if (f.admission && s.admission !== f.admission) return false;
      if (q) {
        var hay = [nameOf(s), s.other, s.id, s.guardian, s.phone, classOf(s)].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function studentRow(s) {
    var sel = state.selected.has(s.id), name = nameOf(s);
    var st = STATUS[s.status], ad = ADMISSION[s.admission];
    var tel = s.phone ? '<a class="phone" data-stop href="tel:' + esc(s.phone.replace(/\s+/g, "")) + '">' + esc(s.phone) + "</a>" : '<span class="muted">—</span>';
    return '<tr data-id="' + esc(s.id) + '" tabindex="0"' + (sel ? ' data-state="selected"' : "") + (s.flash ? ' class="is-flash"' : "") + ">" +
      '<td class="c-sel"><input type="checkbox" class="checkbox" data-select aria-label="Select ' + esc(name) + '"' + (sel ? " checked" : "") + "></td>" +
      '<td class="c-who"><div class="who">' + avatar(s) + '<div class="who-text"><strong>' + esc(name) + "</strong><small>" + esc(s.guardian || "No guardian added yet") + "</small></div></div>" +
        '<div class="m-extra">' + badge(st, true) + badge(ad) + '<span class="m-meta"><span class="id-mono">' + esc(s.id) + "</span><span>" + esc(classOf(s)) + "</span>" + (s.phone ? "<span>" + esc(s.phone) + "</span>" : "") + "</span></div></td>" +
      '<td class="c-id"><span class="id-mono">' + esc(s.id) + "</span></td>" +
      '<td class="c-class"><span class="cls-pill ink-' + armTone(s.arm) + '"><i aria-hidden="true"></i><span>' + esc(classOf(s)) + "</span></span></td>" +
      '<td class="c-gender">' + (s.gender === "F" ? "Female" : "Male") + "</td>" +
      '<td class="c-status">' + badge(st, true) + "</td>" +
      '<td class="c-adm">' + badge(ad) + "</td>" +
      '<td class="c-phone">' + tel + "</td>" +
      '<td class="c-act"><div class="row-actions">' +
        '<button type="button" class="ra ra-hover" data-act="view" aria-label="View ' + esc(name) + '" title="View details">' + I("eye") + "</button>" +
        '<button type="button" class="ra ra-hover" data-act="edit" aria-label="Edit ' + esc(name) + '" title="Edit information">' + I("pencil") + "</button>" +
        '<button type="button" class="ra" data-act="more" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ' + esc(name) + '">' + I("ellipsis") + "</button>" +
      "</div></td></tr>";
  }
  function renderStudentRows() {
    var list = filtered(), tb = $("#student-table tbody");
    if (!list.length) {
      var q = state.search.trim();
      tb.innerHTML = '<tr class="is-empty"><td colspan="9" class="c-empty"><div class="empty-mini">' + tile("search", "sky", "lg") +
        "<strong>" + (q ? "No students match “" + esc(q) + "”" : "No students in this view") + "</strong>" +
        "<p>Try another name, student ID or guardian, or clear the filters to see everyone.</p>" +
        '<button type="button" class="btn btn-outline btn-sm" data-clear-filters>' + I("rotate-ccw") + "Clear filters</button></div></td></tr>";
    } else {
      tb.innerHTML = list.map(studentRow).join("");
    }
    list.forEach(function (s) { if (s.flash) setTimeout(function () { s.flash = false; }, 2000); });
    var base = { all: state.totals.all, enrolled: state.totals.enrolled, new: state.totals.newAdm, unclassified: state.totals.unclassified }[state.quick];
    $("#student-count").innerHTML = "Showing <strong>" + list.length + "</strong> sample rows of " + base +
      (state.selected.size ? " · <strong>" + state.selected.size + "</strong> selected" : "");
    syncSelectAll(list);
    renderBulk();
  }
  function syncSelectAll(list) {
    list = list || filtered();
    var n = list.filter(function (s) { return state.selected.has(s.id); }).length;
    var all = $("#select-all");
    all.checked = n > 0 && n === list.length;
    all.indeterminate = n > 0 && n < list.length;
  }
  function toggleSelect(id, on) {
    if (on) state.selected.add(id); else state.selected.delete(id);
    var tr = $('#student-table tr[data-id="' + id + '"]');
    if (tr) { if (on) tr.setAttribute("data-state", "selected"); else tr.removeAttribute("data-state"); }
    var list = filtered(), base = { all: state.totals.all, enrolled: state.totals.enrolled, new: state.totals.newAdm, unclassified: state.totals.unclassified }[state.quick];
    $("#student-count").innerHTML = "Showing <strong>" + list.length + "</strong> sample rows of " + base +
      (state.selected.size ? " · <strong>" + state.selected.size + "</strong> selected" : "");
    syncSelectAll(list);
    renderBulk();
  }
  function renderBulk() {
    var n = state.selected.size, show = n > 0 && state.route === "students";
    $("#bulkbar").hidden = !show;
    $("#bulk-n").textContent = n;
    if (!show && pop && pop.anchor.closest && pop.anchor.closest("#bulkbar")) hidePop(false);
  }
  function clearSelection() { state.selected.clear(); renderStudentRows(); }

  $("#student-quick").addEventListener("click", function (e) {
    var b = e.target.closest("[data-quick]");
    if (!b) return;
    state.quick = b.getAttribute("data-quick");
    $$("[data-quick]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    renderStudentRows();
  });
  $("#student-search").addEventListener("input", function (e) { state.search = e.target.value; renderStudentRows(); });
  $$(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var k = btn.getAttribute("data-filter"), f = FILTERS[k], v = state.filters[k];
      var el = $("#pop-menu");
      el.setAttribute("aria-label", f.label);
      el.innerHTML = [["", f.all]].concat(f.options()).map(function (o) { return mi(o[0], "", o[1], { radio: true, checked: v === o[0] }); }).join("");
      showPop(el, btn, { place: "bottom-start", onPick: function (item) {
        state.filters[k] = item.getAttribute("data-val");
        renderFilterButtons();
        renderStudentRows();
      } });
    });
  });
  $("#select-all").addEventListener("change", function (e) {
    filtered().forEach(function (s) { if (e.target.checked) state.selected.add(s.id); else state.selected.delete(s.id); });
    renderStudentRows();
  });

  var tbody = $("#student-table tbody");
  tbody.addEventListener("click", function (e) {
    if (e.target.closest("[data-clear-filters]")) {
      state.quick = "all"; state.search = ""; state.filters = { cls: "", status: "", admission: "" };
      $("#student-search").value = "";
      renderStudents();
      return;
    }
    var tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    var id = tr.getAttribute("data-id");
    var cb = e.target.closest("[data-select]");
    if (cb) { toggleSelect(id, cb.checked); return; }
    if (e.target.closest("a[data-stop]")) return;
    var act = e.target.closest("[data-act]");
    if (act) {
      var a = act.getAttribute("data-act");
      if (a === "view") openDetail(id);
      else if (a === "edit") openCreate(id);
      else openRowMenu(act, id);
      return;
    }
    if (e.target.closest(".c-sel")) {
      var box = tr.querySelector("[data-select]");
      box.checked = !box.checked;
      toggleSelect(id, box.checked);
      return;
    }
    openDetail(id);
  });
  tbody.addEventListener("keydown", function (e) {
    var tr = e.target.closest("tr[data-id]");
    if (!tr || e.target !== tr) return;
    var id = tr.getAttribute("data-id");
    if (e.key === "Enter") { e.preventDefault(); openDetail(id); }
    else if (e.key === " ") {
      e.preventDefault();
      var box = tr.querySelector("[data-select]");
      box.checked = !box.checked;
      toggleSelect(id, box.checked);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      var sib = e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling;
      if (sib && sib.hasAttribute("data-id")) { e.preventDefault(); sib.focus(); }
    }
  });

  function openRowMenu(btn, id) {
    var s = byId(id), el = $("#pop-menu");
    el.setAttribute("aria-label", "Actions for " + nameOf(s));
    el.innerHTML = mi("view", "eye", "View details") + mi("edit", "pencil", "Edit information") +
      mi("remove", "user-x", "Remove from current term", { disabled: s.status !== "enrolled", hint: s.status !== "enrolled" ? "Not enrolled this term" : "" }) +
      '<div class="menu-sep" role="separator"></div>' + mi("delete", "trash-2", "Delete student", { destructive: true });
    showPop(el, btn, { place: "bottom-end", onPick: function (item) {
      var a = item.getAttribute("data-val");
      if (a === "view") openDetail(id);
      else if (a === "edit") openCreate(id);
      else if (a === "remove") {
        removeFromTerm([id]);
        refresh();
        SC.toast("Removed from First Term", nameOf(s) + " stays on record and can be re-enrolled.", "user-x");
      } else if (a === "delete") askDelete(id);
    } });
  }
  function removeFromTerm(ids) {
    var n = 0;
    ids.forEach(function (id) {
      var s = byId(id);
      if (s && s.status === "enrolled") { s.status = "not-enrolled"; state.totals.enrolled--; n++; }
    });
    return n;
  }
  function setAdmission(s, a) {
    if (s.admission === a) return;
    state.totals[admKey(s.admission)]--;
    state.totals[admKey(a)]++;
    s.admission = a;
    if (!s.feeIdx) { s.billed = billedFor(s); s.paid = Math.min(s.paid, s.billed); s.fee = feeStatus(s); }
  }

  // Bulk actions (navy pill)
  $("#bulk-export").addEventListener("click", function () {
    SC.toast("Export ready", state.selected.size + " students · preview, nothing is downloaded", "download");
  });
  $("#bulk-admission").addEventListener("click", function () {
    var btn = this, el = $("#pop-menu");
    el.setAttribute("aria-label", "Set admission status");
    el.innerHTML = '<p class="menu-label">Set admission status</p>' + mi("new", "user-plus", "New admission") + mi("returning", "refresh-cw", "Returning");
    showPop(el, btn, { place: "top", onPick: function (item) {
      var v = item.getAttribute("data-val"), n = state.selected.size;
      state.selected.forEach(function (id) { var s = byId(id); if (s) setAdmission(s, v); });
      state.selected.clear();
      refresh();
      SC.toast("Admission status updated", n + " student" + (n === 1 ? "" : "s") + " set to " + ADMISSION[v][0] + ".", "badge-check");
    } });
  });
  $("#bulk-move").addEventListener("click", function () {
    var btn = this, el = $("#pop-menu"), opts = "";
    D.classrooms.forEach(function (c) {
      opts += '<p class="menu-sub">' + esc(c.name) + "</p>";
      c.arms.forEach(function (a) { opts += mi(c.name + "|" + a, "school", c.name + " " + a); });
    });
    el.setAttribute("aria-label", "Move class");
    el.innerHTML = '<p class="menu-label">Move to class</p>' + opts;
    showPop(el, btn, { place: "top", onPick: function (item) {
      var v = item.getAttribute("data-val").split("|"), n = state.selected.size;
      state.selected.forEach(function (id) { var s = byId(id); if (s) { s.cls = v[0]; s.arm = v[1]; s.flash = true; } });
      state.selected.clear();
      if (state.filters.cls) state.filters.cls = "";
      refresh();
      SC.toast("Moved to " + v[0] + " " + v[1], n + " student" + (n === 1 ? "" : "s") + " moved.", "arrow-up-down");
    } });
  });
  $("#bulk-remove").addEventListener("click", function () {
    var ids = Array.from(state.selected), n = removeFromTerm(ids);
    state.selected.clear();
    refresh();
    SC.toast("Removed from First Term", n ? n + " student" + (n === 1 ? "" : "s") + " stay on record and can be re-enrolled." : "Those students weren’t enrolled this term.", "user-x");
  });
  $("#bulk-clear").addEventListener("click", function () { clearSelection(); $("#select-all").focus(); });

  // Page actions
  $("#btn-new-student").addEventListener("click", function () { openCreate(); });
  $("#btn-approvals").addEventListener("click", function () { routeTo("people-enrollment"); });
  $("#lede-approvals").addEventListener("click", function () { routeTo("people-enrollment"); });
  $("#btn-import").addEventListener("click", function () {
    SC.toast("Import isn’t part of this preview", "In School Clerk it opens the CSV importer.", "upload");
  });

  // ---------------------------------------------------------------------------
  // Student detail sheet (Overview / Academics / Attendance / Payments)
  // ---------------------------------------------------------------------------
  var detail = { id: null };
  var TABS = ["overview", "academics", "attendance", "payments"];
  var SUBJECTS = ["Mathematics", "English Language", "Basic Science", "Social Studies", "Civic Education", "Yoruba"];

  function attendanceOf(s) {
    var rnd = seeded(s.id + "·att"), list = [], present = 0, late = 0, absent = 0;
    for (var w = 1; w <= D.session.week; w++) {
      for (var d = 0; d < 5; d++) {
        var r = rnd(), st = r < 0.86 ? "p" : r < 0.95 ? "l" : "a";
        if (w === D.session.week && d === 4) st = "p";
        list.push(st);
        if (st === "p") present++; else if (st === "l") late++; else absent++;
      }
    }
    return { list: list, days: list.length, present: present, late: late, absent: absent, rate: Math.round(((present + late) / list.length) * 1000) / 10 };
  }
  function dl(label, value) { return "<div><dt>" + esc(label) + "</dt><dd>" + value + "</dd></div>"; }
  function overviewHTML(s) {
    var att = attendanceOf(s);
    var dob = s.dob ? longDate(s.dob) + " · " + ageOn(s.dob) + " yrs" : "Not recorded";
    return '<section class="soft-card" aria-labelledby="sd-about"><div class="soft-card-head"><h3 id="sd-about">About</h3></div><dl class="dl-grid">' +
        dl("Student ID", '<span class="id-mono">' + esc(s.id) + "</span>") + dl("Class", esc(classOf(s))) +
        dl("Gender", s.gender === "F" ? "Female" : "Male") + dl("Date of birth", esc(dob)) +
        dl("Admission", badge(ADMISSION[s.admission])) + dl("This term", badge(STATUS[s.status], true)) +
        (s.other ? dl("Other name", esc(s.other)) : "") + "</dl></section>" +
      '<section class="soft-card" aria-labelledby="sd-guardian"><div class="soft-card-head"><h3 id="sd-guardian">Parent or guardian</h3></div>' +
        (s.guardian
          ? '<div class="guardian"><span class="avatar tone-slate" aria-hidden="true">' + esc(SC.initials(payerFrom(s.guardian))) + '</span><div class="grow"><strong>' + esc(s.guardian) + "</strong><small>" + esc(s.phone || "No phone yet") + (s.phone2 ? " · " + esc(s.phone2) : "") + "</small></div>" +
            (s.phone ? '<a class="btn btn-outline btn-sm" href="tel:' + esc(s.phone.replace(/\s+/g, "")) + '">' + I("phone") + "Call</a>" : "") + "</div>"
          : '<p class="muted">No parent or guardian yet. Use Edit information to add one.</p>') + "</section>" +
      '<div class="split-2">' +
        '<section class="soft-card"><div class="ring-row">' + ring(pct(s.paid, s.billed), 52, 6, "teal") + "<div><small>Fees this term</small><strong>" + money(s.paid) + "</strong><small>of " + money(s.billed) + " paid</small></div></div></section>" +
        '<section class="soft-card"><div class="ring-row">' + ring(att.rate, 52, 6, "sky") + "<div><small>Attendance</small><strong>" + att.rate + "%</strong><small>" + (att.present + att.late) + " of " + att.days + " days in school</small></div></div></section>" +
      "</div>";
  }
  function academicsHTML(s) {
    var rnd = seeded(s.id + "·ca");
    var rows = SUBJECTS.map(function (sub, i) {
      var ca1 = 11 + Math.floor(rnd() * 9);
      var ca2 = i === 0 && rnd() < 0.8 ? 10 + Math.floor(rnd() * 10) : 0;
      return '<div class="subject-row"><span>' + esc(sub) + '</span><span class="sc-cell">' + ca1 + '<span class="muted">/20</span></span>' +
        '<span class="sc-cell' + (ca2 ? "" : " is-pending") + '">' + (ca2 ? ca2 + '<span class="muted">/20</span>' : "—") + "</span></div>";
    }).join("");
    return '<section class="soft-card" aria-labelledby="sd-ca"><div class="soft-card-head"><h3 id="sd-ca">Continuous assessment</h3><span class="badge badge-info badge-sm">' + esc(D.session.term) + "</span></div>" +
        '<div><div class="subject-row is-head"><span>Subject</span><span class="sc-cell">CA 1</span><span class="sc-cell">CA 2</span></div>' + rows + "</div></section>" +
      '<section class="soft-card"><div class="guardian">' + tile("notebook-pen", "violet") + '<div class="grow"><strong>CA 2 is still being recorded</strong><small>' +
        (s.cls === "JSS 2" ? "JSS 2 Mathematics is 80% recorded. " : "") + "Term reports are prepared after the exams.</small></div></div></section>";
  }
  function attendanceHTML(s) {
    var a = attendanceOf(s), days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    var tone = { p: "teal", l: "amber", a: "rose" }, icon = { p: "check", l: "clock", a: "x" }, word = { p: "Present", l: "Late", a: "Absent" };
    var g = "<span></span>" + days.map(function (d) { return '<span class="att-h">' + d + "</span>"; }).join("");
    for (var w = 1; w <= D.session.week; w++) {
      g += '<span class="att-w">Week ' + w + "</span>";
      for (var d = 0; d < 5; d++) {
        var st = a.list[(w - 1) * 5 + d], today = w === D.session.week && d === 4;
        g += '<span class="att-day tone-' + tone[st] + (today ? " is-today" : "") + '" title="' + days[d] + ", week " + w + ": " + word[st] + (today ? " (today)" : "") + '">' + I(icon[st], 14) + "</span>";
      }
    }
    return '<section class="soft-card"><div class="ring-row">' + ring(a.rate, 64, 7, "sky", "") +
        "<div><small>This term so far</small><strong>" + a.rate + "% attendance</strong><small>" + a.present + " present · " + a.late + " late · " + a.absent + " absent</small></div></div></section>" +
      '<section class="soft-card" aria-labelledby="sd-att"><div class="soft-card-head"><h3 id="sd-att">Weeks 1–' + D.session.week + "</h3>" + '<span class="t-eyebrow is-here">Today</span></div>' +
        '<p class="sr-only">' + a.present + " days present, " + a.late + " late, " + a.absent + " absent out of " + a.days + " school days.</p>" +
        '<div class="att-grid" aria-hidden="true">' + g + "</div>" +
        '<div class="legend-row"><span><i class="tone-teal"></i>Present</span><span><i class="tone-amber"></i>Late</span><span><i class="tone-rose"></i>Absent</span></div></section>';
  }
  function dueLines(s) {
    var left = s.paid;
    return feeLines(s).map(function (f) {
      var take = Math.min(left, f.amount);
      left -= take;
      return { title: f.title, amount: f.amount, due: f.amount - take };
    });
  }
  function receiptLine(p) {
    return '<div class="receipt-line">' + tile("receipt", p.status === "refunded" ? "rose" : "teal", "sm") +
      '<div class="grow"><strong class="id-mono">' + esc(p.receipt) + "</strong><small>" + esc(p.date) + " · " + esc(p.method) + " · " + esc(p.allocation) + "</small></div>" +
      '<strong class="tnum">' + money(p.amount) + "</strong>" + payBadge(p.status) + "</div>";
  }
  function paymentsHTML(s) {
    var out = Math.max(0, s.billed - s.paid);
    var receipts = state.payments.filter(function (p) { return p.student === nameOf(s); });
    return '<section class="soft-card"><div class="ring-row">' + ring(pct(s.paid, s.billed), 64, 7, "teal", "") +
        "<div><small>" + esc(D.session.term) + " fees</small><strong>" + money(s.paid) + " paid</strong><small>" + (out ? money(out) + " outstanding" : "Fully paid") + "</small></div></div>" +
        '<div class="mini-figs"><div><small>Billed</small><strong>' + money(s.billed) + "</strong></div><div><small>Paid</small><strong>" + money(s.paid) + "</strong></div><div><small>Outstanding</small><strong>" + money(out) + "</strong></div></div></section>" +
      '<section class="soft-card" aria-labelledby="sd-lines"><div class="soft-card-head"><h3 id="sd-lines">Fee lines</h3>' + badge(FEE[feeStatus(s)], false, "badge-sm") + '</div><ul class="fee-list">' +
        dueLines(s).map(function (l) {
          return '<li class="fee-row' + (l.due ? "" : " is-paid") + '"><span class="fee-name">' + esc(l.title) + "<small>" + (l.due ? money(l.due) + " due" : "Paid") + '</small></span><span class="fee-amt">' + money(l.amount) + "</span></li>";
        }).join("") + "</ul></section>" +
      '<section class="soft-card" aria-labelledby="sd-rcpts"><div class="soft-card-head"><h3 id="sd-rcpts">Receipts</h3><span class="t-small">' + receipts.length + "</span></div>" +
        (receipts.length ? receipts.map(receiptLine).join("") : '<p class="muted">No receipts yet this term.</p>') + "</section>";
  }
  function fillDetail(s) {
    var av = $("#sd-avatar");
    av.className = "avatar avatar-xl tone-" + armTone(s.arm);
    av.textContent = initialsOf(s);
    $("#sd-title").textContent = nameOf(s);
    $("#sd-sub").innerHTML = '<span class="id-mono">' + esc(s.id) + "</span> · " + esc(classOf(s)) + " · " + (s.gender === "F" ? "Female" : "Male");
    $("#sd-badges").innerHTML = badge(STATUS[s.status], true) + badge(ADMISSION[s.admission]) + badge(FEE[feeStatus(s)]);
    $("#sd-p-overview").innerHTML = overviewHTML(s);
    $("#sd-p-academics").innerHTML = academicsHTML(s);
    $("#sd-p-attendance").innerHTML = attendanceHTML(s);
    $("#sd-p-payments").innerHTML = paymentsHTML(s);
  }
  function selectTab(name, focus) {
    TABS.forEach(function (t) {
      var on = t === name, tab = $("#sd-t-" + t);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      $("#sd-p-" + t).hidden = !on;
      if (on && focus) tab.focus();
    });
    $("#sheet-student .sheet-body").scrollTop = 0;
  }
  function openDetail(id, tab) {
    var s = byId(id);
    if (!s) return;
    detail.id = id;
    fillDetail(s);
    selectTab(tab || "overview", false);
    TABS.forEach(function (t) { $("#sd-t-" + t).toggleAttribute("autofocus", t === (tab || "overview")); });
    openPanel($("#sheet-student"));
  }
  $("#sd-tablist").addEventListener("click", function (e) {
    var t = e.target.closest('[role="tab"]');
    if (t) selectTab(t.id.replace("sd-t-", ""), true);
  });
  $("#sd-tablist").addEventListener("keydown", function (e) {
    var cur = TABS.indexOf(document.activeElement.id.replace("sd-t-", ""));
    if (cur < 0) return;
    var next = null;
    if (e.key === "ArrowRight") next = (cur + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (cur - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next !== null) { e.preventDefault(); selectTab(TABS[next], true); }
  });
  $("#sd-edit").addEventListener("click", function () { var id = detail.id; SC.close($("#sheet-student")); openCreate(id); });
  $("#sd-pay").addEventListener("click", function () { var id = detail.id; SC.close($("#sheet-student")); openReceive(id); });
  $("#sd-delete").addEventListener("click", function () { askDelete(detail.id); });

  // ---------------------------------------------------------------------------
  // Create / edit student sheet
  // ---------------------------------------------------------------------------
  var form = { mode: "create", id: null };
  var csForm = $("#sheet-create");

  $("#cs-cls").innerHTML = '<option value="">Choose a class</option>' + D.classrooms.map(function (c) {
    return '<option value="' + esc(c.name) + '">' + esc(c.name) + "</option>";
  }).join("");
  function fillStreams(selected) {
    var c = D.classrooms.filter(function (x) { return x.name === $("#cs-cls").value; })[0];
    var st = $("#cs-stream");
    if (!c) { st.innerHTML = '<option value="">Choose a class first</option>'; st.disabled = true; return; }
    st.disabled = false;
    st.innerHTML = '<option value="">Choose a stream</option>' + c.arms.map(function (a) {
      return '<option value="' + esc(a) + '"' + (a === selected ? " selected" : "") + ">" + esc(c.name) + " " + esc(a) + "</option>";
    }).join("");
  }
  function renderCsFees() {
    var adm = radioVal("admission");
    $("#cs-fees").innerHTML = D.fees.map(function (f, i) {
      var applies = f.audience === "New students" ? adm === "new" : f.type === "Required";
      return '<li><label class="fee-row"><input type="checkbox" class="checkbox" data-fee="' + i + '"' + (applies ? " checked" : "") + '>' +
        '<span class="fee-name">' + esc(f.title) + "<small>" + esc(f.type) + " · " + esc(f.audience) + '</small></span><span class="fee-amt">' + money(f.amount) + "</span></label></li>";
    }).join("");
    updateCsTotals();
  }
  function csChecked() { return $$("#cs-fees [data-fee]:checked").map(function (c) { return +c.getAttribute("data-fee"); }); }
  function csAssigned() { return sum(csChecked().map(function (i) { return D.fees[i].amount; })); }
  function updateCsTotals() {
    var a = csAssigned(), p = parseAmount($("#cs-pay").value), pend = Math.max(0, a - p);
    $("#cs-totals").innerHTML = "<div><small>Assigned</small><strong>" + money(a) + "</strong></div>" +
      "<div><small>Paying now</small><strong>" + money(p) + "</strong></div>" +
      '<div class="is-pending"><small>Pending</small><strong>' + money(pend) + "</strong></div>";
  }
  function setParentOpen(open) {
    $("#cs-parent-toggle").setAttribute("aria-expanded", String(open));
    $("#cs-parent-body").hidden = !open;
  }
  var CS_RULES = {
    first: function () { return $("#cs-first").value.trim() ? "" : "Enter the student’s first name."; },
    last: function () { return $("#cs-last").value.trim() ? "" : "Enter the student’s surname."; },
    gender: function () { return radioVal("gender") ? "" : "Choose Female or Male."; },
    admission: function () { return radioVal("admission") ? "" : "Choose New admission or Returning."; },
    cls: function () { return $("#cs-cls").value ? "" : "Choose a classroom."; },
    stream: function () { return !$("#cs-cls").value || $("#cs-stream").value ? "" : "Choose a stream for " + $("#cs-cls").value + "."; },
    pay: function () {
      if (form.mode === "edit") return "";
      var p = parseAmount($("#cs-pay").value), a = csAssigned();
      return p > a ? "Paying now can’t be more than the " + money(a) + " assigned." : "";
    },
  };
  function csCheck(key) {
    var msg = CS_RULES[key](), err = $("#cs-" + key + "-err"), ctl = $("#cs-" + key);
    err.textContent = msg;
    err.hidden = !msg;
    ctl.setAttribute("aria-invalid", msg ? "true" : "false");
    return msg;
  }
  function clearErrors(root) {
    $$(".field-error", root).forEach(function (p) { p.hidden = true; p.textContent = ""; });
    $$('[aria-invalid="true"]', root).forEach(function (el) { el.setAttribute("aria-invalid", "false"); });
  }
  function openCreate(id) {
    var s = id ? byId(id) : null;
    csForm.reset();
    clearErrors(csForm);
    form.mode = s ? "edit" : "create";
    form.id = s ? s.id : null;
    $("#cs-title").textContent = s ? "Edit student" : "New student";
    $("#cs-desc").textContent = s ? "Update " + s.first + "’s details. Fees are managed from Finance." : "Adds a student to Kingsway Academy for " + D.session.title + " · " + D.session.term + ".";
    $("#cs-submit").textContent = s ? "Save changes" : "Save student";
    $("#cs-fees-section").hidden = !!s;
    if (s) {
      $("#cs-first").value = s.first;
      $("#cs-last").value = s.last;
      $("#cs-other").value = s.other || "";
      $("#cs-dob").value = s.dob || "";
      $$('input[name="gender"]').forEach(function (r) { r.checked = r.value === s.gender; });
      $$('input[name="admission"]').forEach(function (r) { r.checked = r.value === s.admission; });
      $("#cs-cls").value = s.cls;
      fillStreams(s.arm);
      $("#cs-gname").value = s.guardian || "";
      $("#cs-gphone").value = s.phone || "";
      $("#cs-gphone2").value = s.phone2 || "";
      setParentOpen(true);
    } else {
      fillStreams("");
      setParentOpen(false);
    }
    $("#cs-paydate").value = TODAY;
    renderCsFees();
    openPanel(csForm);
  }
  ["first", "last"].forEach(function (k) {
    $("#cs-" + k).addEventListener("blur", function () { if (csForm.getAttribute("data-open") === "true") csCheck(k); });
    $("#cs-" + k).addEventListener("input", function () { if ($("#cs-" + k).getAttribute("aria-invalid") === "true") csCheck(k); });
  });
  $("#cs-gender").addEventListener("change", function () { csCheck("gender"); });
  $("#cs-admission").addEventListener("change", function () { csCheck("admission"); if (form.mode === "create") renderCsFees(); });
  $("#cs-cls").addEventListener("change", function () { fillStreams(""); csCheck("cls"); $("#cs-stream-err").hidden = true; $("#cs-stream").setAttribute("aria-invalid", "false"); });
  $("#cs-stream").addEventListener("change", function () { csCheck("stream"); });
  $("#cs-fees").addEventListener("change", function () { updateCsTotals(); if ($("#cs-pay").getAttribute("aria-invalid") === "true") csCheck("pay"); });
  $("#cs-pay").addEventListener("input", updateCsTotals);
  $("#cs-pay").addEventListener("blur", function () {
    var v = parseAmount(this.value);
    this.value = v ? v.toLocaleString("en-NG") : "";
    updateCsTotals();
    csCheck("pay");
  });
  $("#cs-parent-toggle").addEventListener("click", function () { setParentOpen(this.getAttribute("aria-expanded") !== "true"); });

  csForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var keys = ["first", "last", "gender", "admission", "cls", "stream"];
    if (form.mode === "create") keys.push("pay");
    var bad = keys.filter(function (k) { return csCheck(k); });
    if (bad.length) {
      var el = $("#cs-" + bad[0]);
      var target = el.matches("input, select") ? el : el.querySelector("input");
      if (target) target.focus();
      return;
    }
    var btn = $("#cs-submit");
    busy(btn, true, "Saving…");
    setTimeout(function () { busy(btn, false); saveStudent(); }, SC.reduced() ? 0 : 500);
  });
  function saveStudent() {
    var v = {
      first: $("#cs-first").value.trim(), last: $("#cs-last").value.trim(), other: $("#cs-other").value.trim(),
      dob: $("#cs-dob").value, gender: radioVal("gender"), admission: radioVal("admission"),
      cls: $("#cs-cls").value, arm: $("#cs-stream").value,
      guardian: $("#cs-gname").value.trim(), phone: $("#cs-gphone").value.trim(), phone2: $("#cs-gphone2").value.trim(),
    };
    var s;
    if (form.mode === "edit") {
      s = byId(form.id);
      if (!s) return;
      setAdmission(s, v.admission);
      ["first", "last", "other", "dob", "gender", "cls", "arm", "guardian", "phone", "phone2"].forEach(function (k) { s[k] = v[k]; });
      s.flash = true;
      SC.close(csForm);
      refresh();
      SC.toast("Changes saved", nameOf(s) + " · " + classOf(s), "circle-check");
      return;
    }
    var idx = csChecked(), assigned = csAssigned(), paying = parseAmount($("#cs-pay").value);
    s = Object.assign(v, {
      id: "KWA/2026/" + pad(state.nextStudent++, 4), status: "enrolled", feeIdx: idx,
      billed: assigned, paid: paying, fee: paying >= assigned ? "paid" : paying > 0 ? "part" : "owing", flash: true,
    });
    state.students.unshift(s);
    state.totals.all++;
    state.totals.enrolled++;
    state.totals[admKey(s.admission)]++;
    state.finance.billed += assigned;
    state.finance.outstanding = Math.max(0, state.finance.billed - state.finance.collected);
    if (paying > 0) {
      addPayment({
        student: s, amount: paying, method: radioVal("cs-method"), dateIso: $("#cs-paydate").value || TODAY,
        allocation: idx.length ? "New student fees" : "Unallocated", ref: $("#cs-ref").value.trim(),
      });
    }
    state.quick = "all"; state.search = ""; state.filters = { cls: "", status: "", admission: "" };
    $("#student-search").value = "";
    SC.close(csForm);
    if (state.route !== "students") routeTo("students"); else refresh();
    SC.toast("Student saved", nameOf(s) + " added to " + classOf(s) + (paying ? " · " + money(paying) + " received" : "") + ".", "circle-check");
  }

  // ---------------------------------------------------------------------------
  // Friendly destructive confirm
  // ---------------------------------------------------------------------------
  var pendingDelete = null;
  function askDelete(id) {
    var s = byId(id);
    if (!s) return;
    pendingDelete = id;
    $("#del-title").textContent = "Delete " + nameOf(s) + "?";
    $("#del-desc").textContent = s.first + "’s student record and class history will be removed from Kingsway Academy. You can’t undo this.";
    $(".dialog-hint", $("#dlg-delete")).hidden = s.status !== "enrolled";
    openPanel($("#dlg-delete"));
  }
  function afterRemoval() {
    if ($("#sheet-student").getAttribute("data-open") === "true" && detail.id === pendingDelete) SC.close($("#sheet-student"));
    pendingDelete = null;
    refresh();
    setTimeout(function () { if (!overlayOpen()) $("#main").focus({ preventScroll: true }); }, 0);
  }
  $("#del-confirm").addEventListener("click", function () {
    var s = byId(pendingDelete);
    if (!s) return;
    state.students = state.students.filter(function (x) { return x !== s; });
    state.selected.delete(s.id);
    state.totals.all--;
    if (s.status === "enrolled") state.totals.enrolled--;
    state.totals[admKey(s.admission)]--;
    SC.close($("#dlg-delete"));
    afterRemoval();
    SC.toast("Student deleted", nameOf(s) + " was removed from Kingsway Academy.", "trash-2");
  });
  $("#del-instead").addEventListener("click", function () {
    var s = byId(pendingDelete);
    if (!s) return;
    removeFromTerm([s.id]);
    SC.close($("#dlg-delete"));
    if ($("#sheet-student").getAttribute("data-open") === "true") fillDetail(s);
    pendingDelete = null;
    refresh();
    SC.toast("Removed from First Term", nameOf(s) + " stays on record and can be re-enrolled.", "user-x");
  });

  // ---------------------------------------------------------------------------
  // Collections page
  // ---------------------------------------------------------------------------
  var PAY_Q = [["all", "All"], ["paid", "Paid"], ["refunded", "Refunded"], ["pending", "Pending"]];
  function renderCollections() {
    var f = state.finance, rate = pct(f.collected, f.billed);
    $("#lede-today").textContent = money(f.todayCollected);
    $("#coll-pos").innerHTML = ring(rate, 132, 12, "teal", "<strong>" + rate.toFixed(1) + "%</strong><small>collected</small>") +
      '<div class="pos-text"><p class="t-eyebrow is-here">Term collection position</p>' +
      '<p class="pos-figure">' + mil(f.collected) + " <span>collected</span></p>" +
      '<p class="pos-sub">of ' + mil(f.billed) + " billed for " + esc(D.session.title) + " · " + esc(D.session.term) + "</p>" +
      '<dl class="pos-figs"><div><dt>Outstanding</dt><dd>' + mil(f.outstanding) + "</dd></div><div><dt>Collected today</dt><dd>" + money(f.todayCollected) + "</dd></div><div><dt>Billed</dt><dd>" + mil(f.billed) + "</dd></div></dl></div>";
    var by = { Transfer: 0, Cash: 0, POS: 0 }, tot = 0, n = 0;
    state.payments.forEach(function (p) { if (p.status === "paid") { by[p.method] = (by[p.method] || 0) + p.amount; tot += p.amount; n++; } });
    $("#coll-mix").innerHTML = '<div class="panel-head"><h2 class="card-title">By payment method</h2>' + tile("coins", "teal", "sm") + "</div>" +
      ["Transfer", "Cash", "POS"].map(function (m, i) {
        return '<div class="mix-row">' + tile(METHOD_ICON[m], ["sky", "teal", "amber"][i], "sm") + "<span>" + m + "</span><strong>" + money(by[m]) + "</strong>" +
          '<span class="bar" aria-hidden="true"><span style="width:' + pct(by[m], tot) + "%;background:var(--chart-" + (i + 1) + ')"></span></span></div>';
      }).join("") + '<p class="mix-foot">' + money(tot) + " across " + n + " paid receipts below</p>";
    renderPayQuick();
    renderPayRows();
  }
  function payCount(k) { return k === "all" ? state.payments.length : state.payments.filter(function (p) { return p.status === k; }).length; }
  function renderPayQuick() {
    $("#pay-quick").innerHTML = PAY_Q.map(function (q) {
      return '<button type="button" class="seg-btn" data-pq="' + q[0] + '" aria-pressed="' + (state.payQuick === q[0]) + '">' + q[1] + '<span class="n">' + payCount(q[0]) + "</span></button>";
    }).join("");
  }
  function payRow(p) {
    var s = byName(p.student), arm = p.cls.split(" ").pop();
    var who = { first: p.student.split(" ")[0], last: p.student.split(" ").slice(-1)[0], arm: arm };
    return '<tr data-receipt="' + esc(p.receipt) + '" tabindex="0"' + (p.flash ? ' class="is-flash"' : "") + ">" +
      '<td class="c-rcpt"><span class="id-mono">' + esc(p.receipt) + "</span></td>" +
      '<td class="c-date nowrap">' + esc(p.date) + "</td>" +
      '<td class="c-who"><div class="who">' + avatar(s || who) + '<div class="who-text"><strong>' + esc(p.student) + "</strong><small>" + esc(p.cls) + "</small></div></div>" +
        '<div class="m-extra">' + payBadge(p.status) + '<span class="m-meta"><span class="id-mono">' + esc(p.receipt) + "</span><span>" + esc(p.date) + "</span><span>" + esc(p.method) + "</span></span></div></td>" +
      '<td class="c-payer">' + esc(p.payer) + "</td>" +
      '<td class="c-method"><span class="method">' + I(METHOD_ICON[p.method] || "wallet") + esc(p.method) + "</span></td>" +
      '<td class="c-amt num"><strong class="tnum">' + money(p.amount) + "</strong></td>" +
      '<td class="c-alloc"><span class="alloc" title="' + esc(p.allocation) + '">' + esc(p.allocation) + "</span></td>" +
      '<td class="c-pstatus">' + payBadge(p.status) + "</td>" +
      '<td class="c-act"><div class="row-actions">' +
        '<button type="button" class="ra ra-hover" data-pact="print" aria-label="Print receipt ' + esc(p.receipt) + '" title="Print receipt">' + I("printer") + "</button>" +
        '<button type="button" class="ra" data-pact="student" aria-label="View ' + esc(p.student) + '" title="View student">' + I("eye") + "</button>" +
      "</div></td></tr>";
  }
  function renderPayRows() {
    var q = state.paySearch.trim().toLowerCase();
    var list = state.payments.filter(function (p) {
      if (state.payQuick !== "all" && p.status !== state.payQuick) return false;
      if (!q) return true;
      return [p.receipt, p.student, p.payer, p.method, p.allocation, p.cls].join(" ").toLowerCase().indexOf(q) > -1;
    });
    var tb = $("#pay-table tbody");
    tb.innerHTML = list.length ? list.map(payRow).join("") :
      '<tr class="is-empty"><td colspan="9" class="c-empty"><div class="empty-mini">' + tile("receipt", "teal", "lg") + "<strong>No receipts match</strong><p>Try a receipt number, student or payer.</p></div></td></tr>";
    list.forEach(function (p) { if (p.flash) setTimeout(function () { p.flash = false; }, 2000); });
    $("#pay-count").innerHTML = "Showing <strong>" + list.length + "</strong> receipt" + (list.length === 1 ? "" : "s");
  }
  $("#pay-quick").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pq]");
    if (!b) return;
    state.payQuick = b.getAttribute("data-pq");
    $$("#pay-quick [data-pq]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    renderPayRows();
  });
  $("#pay-search").addEventListener("input", function (e) { state.paySearch = e.target.value; renderPayRows(); });
  function openReceiptStudent(tr) {
    var p = state.payments.filter(function (x) { return x.receipt === tr.getAttribute("data-receipt"); })[0];
    var s = p && byName(p.student);
    if (s) openDetail(s.id, "payments");
    else if (p) SC.toast(p.student + " isn’t in the sample list", "Receipts still keep the student’s name.", "info");
  }
  $("#pay-table tbody").addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-receipt]");
    if (!tr) return;
    var act = e.target.closest("[data-pact]");
    if (act && act.getAttribute("data-pact") === "print") {
      SC.toast("Receipt ready to print", tr.getAttribute("data-receipt") + " · preview, nothing is printed", "printer");
      return;
    }
    openReceiptStudent(tr);
  });
  $("#pay-table tbody").addEventListener("keydown", function (e) {
    var tr = e.target.closest("tr[data-receipt]");
    if (!tr || e.target !== tr) return;
    if (e.key === "Enter") { e.preventDefault(); openReceiptStudent(tr); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      var sib = e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling;
      if (sib && sib.hasAttribute("data-receipt")) { e.preventDefault(); sib.focus(); }
    }
  });
  $("#btn-receive").addEventListener("click", function () { openReceive(); });
  $("#btn-export-receipts").addEventListener("click", function () {
    SC.toast("Export ready", state.payments.length + " receipts · preview, nothing is downloaded", "download");
  });

  function addPayment(o) {
    var s = o.student;
    var p = {
      receipt: "RCP-26-" + pad(state.nextReceipt++, 5), date: shortDate(o.dateIso), student: nameOf(s), cls: classOf(s),
      payer: payerFrom(s.guardian) || nameOf(s), method: o.method || "Transfer", amount: o.amount,
      allocation: o.allocation, status: "paid", by: "Admin · " + D.user.first, ref: o.ref || "", flash: true,
    };
    state.payments.unshift(p);
    var f = state.finance;
    f.collected += o.amount;
    f.outstanding = Math.max(0, f.billed - f.collected);
    if (o.dateIso === TODAY) f.todayCollected += o.amount;
    return p;
  }

  // ---------------------------------------------------------------------------
  // Receive payment sheet
  // ---------------------------------------------------------------------------
  var rp = { student: null, active: -1, opts: [], lines: [] };
  var payForm = $("#sheet-pay");
  function closeOpts() {
    $("#rp-options").hidden = true;
    $("#rp-student").setAttribute("aria-expanded", "false");
    $("#rp-student").removeAttribute("aria-activedescendant");
  }
  function setActiveOpt() {
    $$("#rp-options .combo-opt").forEach(function (o, i) { o.setAttribute("aria-selected", String(i === rp.active)); });
    var cur = $("#rp-opt-" + rp.active);
    if (cur) { $("#rp-student").setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
    else $("#rp-student").removeAttribute("aria-activedescendant");
  }
  function renderOpts(q) {
    q = String(q || "").trim().toLowerCase();
    rp.opts = state.students.filter(function (s) {
      return !q || [nameOf(s), s.id, classOf(s), s.guardian].join(" ").toLowerCase().indexOf(q) > -1;
    }).slice(0, 6);
    rp.active = rp.opts.length ? 0 : -1;
    $("#rp-options").innerHTML = rp.opts.length ? rp.opts.map(function (s, i) {
      var out = s.billed - s.paid;
      return '<li class="combo-opt" role="option" id="rp-opt-' + i + '" data-i="' + i + '" aria-selected="false">' + avatar(s, "sm") +
        '<span class="grow"><strong>' + esc(nameOf(s)) + "</strong><small>" + esc(classOf(s)) + " · " + esc(s.id) + "</small></span>" +
        (out > 0 ? '<span class="badge badge-warning badge-sm">' + money(out) + " due</span>" : '<span class="badge badge-success badge-sm">Paid</span>') + "</li>";
    }).join("") : '<li class="combo-empty" role="presentation">No student matches “' + esc(q) + "”.</li>";
    $("#rp-options").hidden = false;
    $("#rp-student").setAttribute("aria-expanded", "true");
    setActiveOpt();
  }
  function showCombo() {
    $("#rp-combo").hidden = false;
    $("#rp-picked").hidden = true;
    $("#rp-student").value = "";
    closeOpts();
  }
  function pickStudent(s, focusAmount) {
    rp.student = s;
    $("#rp-combo").hidden = true;
    closeOpts();
    var pk = $("#rp-picked");
    pk.hidden = false;
    pk.innerHTML = avatar(s) + '<span class="grow"><strong>' + esc(nameOf(s)) + "</strong><small>" + esc(classOf(s)) + " · " + esc(s.id) + (s.guardian ? " · " + esc(s.guardian) : "") + "</small></span>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="rp-change">Change</button>';
    $("#rp-student-err").hidden = true;
    renderLines();
    if (focusAmount) $("#rp-amount").focus();
  }
  function selectedDue() { return sum($$("#rp-lines [data-line]:checked").map(function (c) { return rp.lines[+c.getAttribute("data-line")].due; })); }
  function syncAmount() {
    var d = selectedDue();
    $("#rp-amount").value = d ? d.toLocaleString("en-NG") : "";
    $("#rp-amount-desc").textContent = "Outstanding for the selected fees: " + money(d);
  }
  function renderLines() {
    var ul = $("#rp-lines"), note = $("#rp-lines-note"), s = rp.student;
    rp.lines = [];
    if (!s) { ul.innerHTML = ""; note.textContent = "Choose a student to see what is due."; syncAmount(); return; }
    if (radioVal("rp-term") === "previous") { ul.innerHTML = ""; note.textContent = "Nothing is owed for Third Term, 2025/2026."; syncAmount(); return; }
    rp.lines = dueLines(s);
    var owing = rp.lines.some(function (l) { return l.due > 0; });
    note.textContent = owing ? D.session.term + " fees for " + s.first + ". Untick anything not being paid today." : "All " + D.session.term + " fees are paid.";
    ul.innerHTML = rp.lines.map(function (l, i) {
      if (!l.due) {
        return '<li class="fee-row is-paid">' + tile("check", "teal", "sm") + '<span class="fee-name">' + esc(l.title) + '<small>Paid</small></span><span class="fee-amt">' + money(l.amount) + "</span></li>";
      }
      return '<li><label class="fee-row"><input type="checkbox" class="checkbox" data-line="' + i + '" checked><span class="fee-name">' + esc(l.title) +
        "<small>" + (l.due < l.amount ? money(l.due) + " left of " + money(l.amount) : "Not paid yet") + '</small></span><span class="fee-amt">' + money(l.due) + "</span></label></li>";
    }).join("");
    syncAmount();
  }
  function openReceive(id) {
    payForm.reset();
    clearErrors(payForm);
    $("#rp-date").value = TODAY;
    rp.student = null;
    var s = id ? byId(id) : null;
    $("#rp-student").toggleAttribute("autofocus", !s);
    $("#rp-amount").toggleAttribute("autofocus", !!s);
    if (s) pickStudent(s, false); else { showCombo(); renderLines(); }
    openPanel(payForm);
  }
  var rpInput = $("#rp-student");
  rpInput.addEventListener("input", function () { renderOpts(rpInput.value); });
  rpInput.addEventListener("focus", function () { renderOpts(rpInput.value); });
  rpInput.addEventListener("blur", function () { setTimeout(closeOpts, 150); });
  rpInput.addEventListener("keydown", function (e) {
    var open = !$("#rp-options").hidden;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { renderOpts(rpInput.value); return; }
      if (!rp.opts.length) return;
      rp.active = (rp.active + (e.key === "ArrowDown" ? 1 : -1) + rp.opts.length) % rp.opts.length;
      setActiveOpt();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && rp.opts[rp.active]) pickStudent(rp.opts[rp.active], true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      closeOpts();
    }
  });
  $("#rp-options").addEventListener("mousedown", function (e) { e.preventDefault(); });
  $("#rp-options").addEventListener("click", function (e) {
    var o = e.target.closest(".combo-opt");
    if (o) pickStudent(rp.opts[+o.getAttribute("data-i")], true);
  });
  $("#rp-picked").addEventListener("click", function (e) {
    if (!e.target.closest("#rp-change")) return;
    rp.student = null;
    showCombo();
    renderLines();
    rpInput.focus();
  });
  payForm.addEventListener("change", function (e) {
    if (e.target.name === "rp-term") renderLines();
    if (e.target.hasAttribute("data-line")) syncAmount();
  });
  $("#rp-amount").addEventListener("blur", function () {
    var v = parseAmount(this.value);
    this.value = v ? v.toLocaleString("en-NG") : "";
  });
  function rpCheck() {
    var errs = {}, s = rp.student, amt = parseAmount($("#rp-amount").value);
    var owed = sum(rp.lines.map(function (l) { return l.due; }));
    if (!s) errs.student = "Choose a student to receive payment for.";
    if (s && radioVal("rp-term") === "previous") errs.amount = "Nothing is owed for that term. Choose First Term.";
    else if (s && !owed) errs.amount = "All First Term fees are already paid.";
    else if (!amt) errs.amount = "Enter the amount received.";
    else if (s && amt > owed) errs.amount = "That’s more than the " + money(owed) + " outstanding.";
    [["student", "#rp-student"], ["amount", "#rp-amount"]].forEach(function (x) {
      var err = $("#rp-" + x[0] + "-err"), msg = errs[x[0]] || "";
      err.textContent = msg;
      err.hidden = !msg;
      $(x[1]).setAttribute("aria-invalid", msg ? "true" : "false");
    });
    return errs;
  }
  payForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var errs = rpCheck();
    if (errs.student) { rpInput.focus(); return; }
    if (errs.amount) { $("#rp-amount").focus(); return; }
    var btn = $("#rp-submit");
    busy(btn, true, "Confirming…");
    setTimeout(function () { busy(btn, false); confirmPayment(); }, SC.reduced() ? 0 : 500);
  });
  function confirmPayment() {
    var s = rp.student, amt = parseAmount($("#rp-amount").value);
    var picked = $$("#rp-lines [data-line]:checked").map(function (c) { return rp.lines[+c.getAttribute("data-line")].title; });
    var dueCount = rp.lines.filter(function (l) { return l.due > 0; }).length;
    var p = addPayment({
      student: s, amount: amt, method: radioVal("rp-method"), dateIso: $("#rp-date").value || TODAY,
      allocation: picked.length && picked.length === dueCount ? "All term fees" : picked.join(", ") || "Unallocated",
      ref: $("#rp-ref").value.trim(),
    });
    s.paid = Math.min(s.billed, s.paid + amt);
    s.fee = feeStatus(s);
    SC.close(payForm);
    state.payQuick = "all";
    state.paySearch = "";
    $("#pay-search").value = "";
    if (state.route !== "collections") routeTo("collections"); else refresh();
    SC.toast("Payment confirmed", money(amt) + " from " + p.payer + " · " + p.receipt, "circle-check");
  }

  // ---------------------------------------------------------------------------
  // Dashboard (Overview)
  // ---------------------------------------------------------------------------
  var TASK_GO = ["people-enrollment", "academics-classes", "collections", "academics-assessment-recording"];
  function kpi(label, value, side, meta) {
    return '<article class="card kpi"><div class="kpi-top"><p class="kpi-label">' + esc(label) + "</p>" + side + "</div>" +
      '<p class="kpi-value">' + value + '</p><p class="kpi-meta">' + meta + "</p></article>";
  }
  function renderDashboard() {
    var f = state.finance, a = D.attendance, t = state.totals, s = D.session, rate = pct(f.collected, f.billed);
    var h = '<div class="dash-grid">' +
      '<section class="card is-navy term-hero" aria-labelledby="th-title">' +
        '<div><p class="t-eyebrow is-here">' + esc(s.title) + " · " + esc(s.term) + "</p>" +
        '<h2 class="th-title" id="th-title">Week ' + s.week + " <span>of " + s.weeks + "</span></h2>" +
        '<p class="th-sub">' + (s.weeks - s.week) + " weeks to go · " + Math.round((s.week / s.weeks) * 100) + "% of the term behind you</p></div>" +
        '<div class="th-track">' + weeksHTML(s.week, s.weeks) +
        '<div class="th-ends"><span>Started <strong>' + esc(s.start) + "</strong></span><span>Ends <strong>" + esc(s.end) + "</strong></span></div></div>" +
      "</section>" +
      kpi("Students", t.all, tile("users", "navy"), '<span class="badge badge-success badge-dot badge-sm">' + t.enrolled + " enrolled</span>") +
      kpi("Attendance today", a.rate + "%", ring(a.rate, 48, 5, "sky"), "<strong>" + a.present + "</strong> present · " + a.absent + " absent · " + a.late + " late<br>" + a.classesMarked + " of " + a.classesTotal + " classes marked") +
      kpi("Collected this term", mil(f.collected), ring(rate, 48, 5, "teal"), "<strong>" + rate + "%</strong> of " + mil(f.billed) + " billed") +
      kpi("Outstanding", mil(f.outstanding), tile("hand-coins", "amber"), '<button type="button" class="btn-link" data-go="collections">See collections</button>') +
      '<section class="card panel attn" aria-labelledby="attn-title"><div class="panel-head"><h2 id="attn-title">Needs attention</h2><span class="badge badge-warning badge-sm">' + D.tasks.length + "</span></div>" +
        '<ul class="attn-list">' + D.tasks.map(function (task, i) {
          return '<li><button type="button" class="attn-item" data-go="' + TASK_GO[i] + '"' + (i === 2 ? ' data-pq="pending"' : "") + ">" + tile(task.icon, TASK_TONE[task.tone] || "slate") +
            '<span class="grow"><span>' + esc(task.text) + "</span><small>" + esc(task.meta) + "</small></span>" + I("chevron-right") + "</button></li>";
        }).join("") + "</ul></section>" +
      '<section class="card panel quick" aria-labelledby="qa-title"><div class="panel-head"><h2 id="qa-title">Quick actions</h2></div><div class="qa-grid">' +
        '<button type="button" class="qa" data-qa="new">' + tile("user-plus", "sky", "lg") + "<span><strong>New student</strong><small>Add and enrol in one go</small></span></button>" +
        '<button type="button" class="qa" data-qa="pay">' + tile("hand-coins", "teal", "lg") + "<span><strong>Receive payment</strong><small>Record a receipt</small></span></button>" +
        '<button type="button" class="qa" data-qa="search">' + tile("search", "navy", "lg") + "<span><strong>Find anything</strong><small>Students, receipts, pages · " + (IS_MAC ? "⌘K" : "Ctrl K") + "</small></span></button>" +
        '<a class="qa" href="website.html">' + tile("globe", "slate", "lg") + "<span><strong>School website</strong><small>" + esc(D.school.site) + "</small></span></a>" +
      "</div></section></div>";
    $("#dash").innerHTML = h;
  }
  $("#dash").addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]");
    if (g) {
      if (g.hasAttribute("data-pq")) { state.payQuick = g.getAttribute("data-pq"); state.paySearch = ""; $("#pay-search").value = ""; }
      routeTo(g.getAttribute("data-go"));
      return;
    }
    var q = e.target.closest("[data-qa]");
    if (!q) return;
    var k = q.getAttribute("data-qa");
    if (k === "new") openCreate();
    else if (k === "pay") openReceive();
    else openCmdk();
  });

  // ---------------------------------------------------------------------------
  // Not part of this preview
  // ---------------------------------------------------------------------------
  function renderEmpty(r) {
    $("#empty").innerHTML =
      '<div class="empty-art" aria-hidden="true"><span class="ea ea-1"></span><span class="tile tone-' + r.tone + '">' + I(r.icon, 28) + '</span><span class="ea ea-2"></span><span class="ea-dot"></span></div>' +
      '<h2 class="empty-title">' + esc(r.label) + " isn’t part of this preview</h2>" +
      '<p class="empty-text">In School Clerk it lives under ' + esc(r.module) + (r.section ? " › " + esc(r.section) : "") +
      ". This workshop builds Students, Collections and the Dashboard so the three directions can be compared on the same pages.</p>" +
      '<div class="empty-actions"><a class="btn btn-default" href="#students">' + I("users") + 'Go to Students</a><a class="btn btn-outline" href="#dashboard">Back to Dashboard</a></div>';
  }

  // ---------------------------------------------------------------------------
  // ⌘K search
  // ---------------------------------------------------------------------------
  var cmd = { list: [], active: 0 };
  function cmdGroups(raw) {
    var q = String(raw || "").trim().toLowerCase();
    var m = function (str) { return !q || str.toLowerCase().indexOf(q) > -1; };
    var groups = [];
    var pages = q
      ? ORDER.filter(function (id) { var r = ROUTES[id]; return m(r.label + " " + r.module + " " + r.section); }).slice(0, 6)
      : ["students", "collections", "dashboard"];
    if (pages.length) {
      groups.push(["Pages", pages.map(function (id) {
        var r = ROUTES[id];
        return { label: r.label, sub: r.module + (r.section ? " · " + r.section : ""), icon: r.icon, tone: r.tone, run: function () {
          if (id === "settings-website") location.href = "website.html";
          else if (id === "finance-receive-payment") { routeTo("collections"); setTimeout(function () { openReceive(); }, 40); }
          else routeTo(id);
        } };
      })]);
    }
    var studs = state.students.filter(function (s) { return m([nameOf(s), s.id, classOf(s), s.guardian].join(" ")); }).slice(0, q ? 6 : 3);
    if (studs.length) {
      groups.push(["Students", studs.map(function (s) {
        return { label: nameOf(s), sub: classOf(s) + " · " + s.id, student: s, run: function () {
          if (state.route !== "students") routeTo("students");
          openDetail(s.id);
        } };
      })]);
    }
    var rcpts = state.payments.filter(function (p) { return m([p.receipt, p.student, p.payer, p.method].join(" ")); }).slice(0, q ? 5 : 2);
    if (rcpts.length) {
      groups.push(["Receipts", rcpts.map(function (p) {
        return { label: p.receipt + " · " + money(p.amount), sub: p.student + " · " + p.date + " · " + p.method, icon: "receipt", tone: "teal", run: function () {
          state.payQuick = "all";
          state.paySearch = p.receipt;
          $("#pay-search").value = p.receipt;
          p.flash = true;
          routeTo("collections");
        } };
      })]);
    }
    var acts = [
      { label: "New student", sub: "People · Students", icon: "user-plus", tone: "sky", run: function () { openCreate(); } },
      { label: "Receive payment", sub: "Finance · Collections", icon: "hand-coins", tone: "teal", run: function () { openReceive(); } },
      { label: "Switch light or dark theme", sub: "Appearance", icon: "moon", tone: "slate", run: function () { SC.theme.toggle(); } },
    ].filter(function (a) { return m(a.label + " " + a.sub); });
    if (acts.length) groups.push(["Actions", acts]);
    return groups;
  }
  function renderCmd() {
    var raw = $("#cmdk-q").value, groups = cmdGroups(raw), h = "";
    cmd.list = [];
    groups.forEach(function (g) {
      h += '<div role="group" aria-labelledby="cmdk-g-' + SC.slugify(g[0]) + '"><p class="cmdk-group" id="cmdk-g-' + SC.slugify(g[0]) + '">' + esc(g[0]) + "</p>";
      g[1].forEach(function (it) {
        var i = cmd.list.length;
        cmd.list.push(it);
        h += '<div class="cmdk-opt" role="option" id="cmdk-o-' + i + '" data-i="' + i + '" aria-selected="false">' +
          (it.student ? avatar(it.student, "sm") : tile(it.icon, it.tone, "sm")) +
          '<span class="grow"><span>' + esc(it.label) + "</span><small>" + esc(it.sub) + '</small></span><span class="kbd cmdk-enter" aria-hidden="true">↵</span></div>';
      });
      h += "</div>";
    });
    $("#cmdk-list").innerHTML = h || '<p class="cmdk-none">Nothing matches “' + esc(raw.trim()) + "”. Try a student name, receipt number or page.</p>";
    cmd.active = 0;
    setCmdActive();
  }
  function setCmdActive() {
    $$(".cmdk-opt").forEach(function (o, i) { o.setAttribute("aria-selected", String(i === cmd.active)); });
    var cur = $("#cmdk-o-" + cmd.active), q = $("#cmdk-q");
    if (cur) { q.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
    else q.removeAttribute("aria-activedescendant");
  }
  function runCmd(i) {
    var it = cmd.list[i];
    if (!it) return;
    SC.close($("#cmdk"));
    setTimeout(it.run, 10);
  }
  function openCmdk() {
    hidePop(false);
    $("#cmdk-q").value = "";
    renderCmd();
    openPanel($("#cmdk"));
  }
  $("#cmdk-q").addEventListener("input", renderCmd);
  $("#cmdk-q").addEventListener("keydown", function (e) {
    var n = cmd.list.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!n) return;
      cmd.active = (cmd.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      setCmdActive();
    } else if (e.key === "Home" && n) { e.preventDefault(); cmd.active = 0; setCmdActive(); }
    else if (e.key === "End" && n) { e.preventDefault(); cmd.active = n - 1; setCmdActive(); }
    else if (e.key === "Enter") { e.preventDefault(); runCmd(cmd.active); }
  });
  $("#cmdk-list").addEventListener("mousemove", function (e) {
    var o = e.target.closest(".cmdk-opt");
    if (o && +o.getAttribute("data-i") !== cmd.active) { cmd.active = +o.getAttribute("data-i"); setCmdActive(); }
  });
  $("#cmdk-list").addEventListener("click", function (e) {
    var o = e.target.closest(".cmdk-opt");
    if (o) runCmd(+o.getAttribute("data-i"));
  });
  $("#open-search").addEventListener("click", openCmdk);
  $("#tab-search").addEventListener("click", openCmdk);

  // ---------------------------------------------------------------------------
  // Header popovers: term switcher, notifications, user menu
  // ---------------------------------------------------------------------------
  function renderTermPop() {
    $("#pop-term").innerHTML = D.sessions.map(function (ss) {
      return '<p class="menu-label">' + esc(ss.title) + (ss.current ? ' <span class="badge badge-info badge-sm">Current session</span>' : "") + "</p>" +
        ss.terms.map(function (t) {
          var on = state.term.session === ss.title && state.term.term === t;
          var isNow = ss.current && t === D.session.term;
          return '<button type="button" class="menu-item" role="menuitemradio" aria-checked="' + on + '" data-session="' + esc(ss.title) + '" data-term="' + esc(t) + '">' +
            '<span class="mi-check">' + I("check") + "</span><span>" + esc(t) + (isNow ? "<small>Week " + D.session.week + " of " + D.session.weeks + " · today</small>" : "") + "</span>" +
            (isNow ? '<span class="dot-amber" aria-hidden="true"></span>' : "") + "</button>";
        }).join("");
    }).join('<div class="menu-sep" role="separator"></div>');
  }
  function showTermPop(anchor) {
    renderTermPop();
    showPop($("#pop-term"), anchor, { place: anchor.id === "sb-term" ? "right" : "bottom-end", onPick: function (item) {
      state.term = { session: item.getAttribute("data-session"), term: item.getAttribute("data-term") };
      renderTermCard();
      SC.toast("Viewing " + state.term.term + ", " + state.term.session, isCurrentTerm() ? "Back to the current term." : "Sample data stays the same in this preview.", "calendar");
    } });
  }
  $("#term-chip").addEventListener("click", function () { showTermPop(this); });
  $("#sb-term").addEventListener("click", function () { showTermPop(this); });

  var NOTIFS = [
    { task: 0, when: "8 min ago", go: "people-enrollment", read: false },
    { task: 2, when: "26 min ago", go: "collections", pq: "pending", read: false },
    { task: 1, when: "1 h ago", go: "academics-classes", read: false },
  ];
  function renderNotifs() {
    $("#notif-list").innerHTML = NOTIFS.map(function (n, k) {
      var t = D.tasks[n.task];
      return '<li><button type="button" class="notif-item' + (n.read ? " is-read" : "") + '" data-n="' + k + '">' + tile(t.icon, TASK_TONE[t.tone] || "slate") +
        '<span class="grow"><span>' + esc(t.text) + "</span><small>" + esc(t.meta) + " · " + esc(n.when) + "</small></span>" +
        '<span class="dot-amber" aria-hidden="true"></span>' + (n.read ? "" : '<span class="sr-only">Unread</span>') + "</button></li>";
    }).join("");
    var unread = NOTIFS.filter(function (n) { return !n.read; }).length;
    $("#notif-dot").hidden = !unread;
    $("#notif-btn").setAttribute("aria-label", "Notifications" + (unread ? ", " + unread + " unread" : ""));
    $("#notif-read").disabled = !unread;
  }
  $("#notif-btn").addEventListener("click", function () {
    showPop($("#pop-notif"), this, { place: "bottom-end", onPick: function (item) {
      var n = NOTIFS[+item.getAttribute("data-n")];
      n.read = true;
      renderNotifs();
      if (n.pq) { state.payQuick = n.pq; state.paySearch = ""; $("#pay-search").value = ""; }
      routeTo(n.go);
    } });
  });
  $("#notif-read").addEventListener("click", function () {
    NOTIFS.forEach(function (n) { n.read = true; });
    renderNotifs();
    var first = $(".notif-item", $("#pop-notif"));
    if (first) first.focus();
  });

  function syncTheme() {
    var dark = document.documentElement.classList.contains("dark");
    $("#menu-theme").setAttribute("aria-checked", String(dark));
  }
  document.addEventListener("sc:theme", syncTheme);
  $("#user-btn").addEventListener("click", function () {
    syncTheme();
    showPop($("#pop-user"), this, { place: "bottom-end", onPick: function (item) {
      if (item.id === "menu-theme") SC.theme.toggle();
      else if (item.id === "menu-logout") SC.toast("You’re still signed in", "Log out is turned off in this preview.", "log-out");
    } });
  });
  $("#open-assistant").addEventListener("click", function () { routeTo("overview-assistant"); });

  // ---------------------------------------------------------------------------
  // Mobile: More sheet
  // ---------------------------------------------------------------------------
  $("#tab-more").addEventListener("click", function () { openPanel($("#sheet-more")); });
  $("#more-term").addEventListener("click", function () {
    SC.close($("#sheet-more"));
    setTimeout(function () { showTermPop($("#term-chip")); }, 60);
  });
  $("#more-theme").addEventListener("click", function () { SC.theme.toggle(); });

  // ---------------------------------------------------------------------------
  // Global shortcuts
  // ---------------------------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey, k = String(e.key || "").toLowerCase();
    if (mod && k === "k") {
      e.preventDefault();
      if ($("#cmdk").getAttribute("data-open") === "true") SC.close($("#cmdk")); else openCmdk();
      return;
    }
    if (mod && k === "b" && !mqMobile.matches && !overlayOpen()) { e.preventDefault(); toggleSidebar(); return; }
    if (e.key === "/" && !mod && !isTyping(e.target) && state.route === "students" && !overlayOpen()) {
      e.preventDefault();
      $("#student-search").focus();
    }
  });

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  SC.pill({ id: "03", name: "Assembly" });
  $("#kbd-k").textContent = IS_MAC ? "⌘K" : "Ctrl K";
  applyCollapse();
  renderTermCard();
  renderNotifs();
  syncTheme();
  var start = location.hash.slice(1);
  route(ROUTES[start] || start === "finance-receive-payment" ? start : "students", true);
})();
