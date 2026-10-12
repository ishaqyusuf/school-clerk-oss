/* Direction 02 — Timetable · dashboard.js
   The live two-tier shell: module tabs, sub-nav, Students / Collections / Dashboard pages,
   ⌘K palette, term switcher, notifications, user menu, inspector sheets and compact confirms.
   Local simulation only — nothing is sent anywhere. Depends on shared data.js, icons.js, workshop.js. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var money = SC.money;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function ic(n, s, c) { return SCIcons.icon(n, s || 16, c); }
  var IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  var MOD = IS_MAC ? "⌘" : "Ctrl";
  function kbd(keys) {
    return '<span class="kbd-row" aria-hidden="true">' + keys.map(function (k) { return '<kbd class="kbd">' + esc(k === "mod" ? MOD : k) + "</kbd>"; }).join("") + "</span>";
  }
  function mil(n) { return "₦" + (n / 1e6).toFixed(2) + "m"; }
  function pct(n) { return (Math.round(n * 10) / 10).toFixed(1) + "%"; }
  function int(n) { return Number(n).toLocaleString("en-NG"); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) { var p = String(iso || "").split("-"); if (p.length !== 3) return "—"; return p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0]; }
  function fmtShort(iso) { var p = String(iso || "").split("-"); if (p.length !== 3) return "—"; return p[2] + " " + MONTHS[+p[1] - 1]; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function announce(msg) { var l = $("#live"); l.textContent = ""; setTimeout(function () { l.textContent = msg; }, 40); }
  function isTyping(t) { return !!(t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")); }

  var TODAY = "2026-10-09";

  /* ------------------------------------------------------------------ data */
  var students = D.students.map(function (s) { return Object.assign({ other: "" }, s); });
  var payments = D.payments.map(function (p) {
    var q = Object.assign({}, p);
    if (!D.paymentStatusLabels[q.status]) q.status = "paid"; // sample row with a stray status: it is a received payment awaiting allocation
    return q;
  });
  var fin = { billed: D.finance.billed, collected: D.finance.collected, today: D.finance.todayCollected };
  var BASE = { total: D.school.students, enrolled: 451, newAdm: 64, returning: 419, unclassified: 3 };
  function counts(list) {
    var c = { total: list.length, enrolled: 0, newAdm: 0, returning: 0, unclassified: 0 };
    list.forEach(function (s) {
      if (s.status === "enrolled") c.enrolled++;
      if (s.admission === "new") c.newAdm++; else if (s.admission === "returning") c.returning++; else c.unclassified++;
    });
    return c;
  }
  var INITIAL = counts(students);
  function stats() {
    var now = counts(students), o = {};
    Object.keys(BASE).forEach(function (k) { o[k] = BASE[k] + (now[k] - INITIAL[k]); });
    return o;
  }
  function fullName(s) { return s.first + " " + s.last; }
  function initials(s) { return (s.first[0] + s.last[0]).toUpperCase(); }
  function tint(s) { return [1, 3, 4, 5][hash(s.id) % 4]; }
  function findStudent(id) { for (var i = 0; i < students.length; i++) if (students[i].id === id) return students[i]; return null; }
  function findStudentByName(n) { for (var i = 0; i < students.length; i++) if (fullName(students[i]) === n) return students[i]; return null; }

  var FEES = D.fees;
  function defaultFeeIdx(admission) {
    var out = [];
    FEES.forEach(function (f, i) { if ((f.type === "Required" && f.audience !== "New students") || (admission === "new" && f.audience === "New students")) out.push(i); });
    return out;
  }
  function account(s) {
    var idx = s.fees || defaultFeeIdx(s.admission);
    var left = Math.max(0, s.paid || 0);
    var lines = idx.map(function (i) { var f = FEES[i]; var a = Math.min(left, f.amount); left -= a; return { title: f.title, amount: f.amount, paid: a, due: f.amount - a }; });
    var billed = 0, paid = 0;
    lines.forEach(function (l) { billed += l.amount; paid += l.paid; });
    return { lines: lines, billed: billed, paid: paid, due: billed - paid };
  }

  var STATUS = { enrolled: ["Enrolled", "success"], "not-enrolled": ["Not enrolled", "neutral"] };
  var ADM = { new: ["New admission", "info"], returning: ["Returning", "outline"], unclassified: ["Needs classification", "warning"] };
  var PAY = { paid: ["Paid", "success"], refunded: ["Refunded", "destructive"], cancelled: ["Cancelled", "neutral badge-struck"] };
  function tag(pair) { return '<span class="badge badge-' + pair[1] + '">' + esc(pair[0]) + "</span>"; }
  function chargeTag(acc) {
    if (acc.billed > 0 && acc.due === 0) return tag(["Paid", "success"]);
    if (acc.paid > 0) return tag(["Partially paid", "warning"]);
    return tag(["Pending", "info"]);
  }
  var METHOD_ICON = { Transfer: "arrow-up-right", Cash: "banknote", POS: "credit-card" };

  /* ---------------------------------------------------------------- routes */
  var ROUTES = {}, ORDER = [];
  D.nav.forEach(function (m) {
    m.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        var key = SC.slugify(m.module) + "/" + SC.slugify(it.label);
        ROUTES[key] = { key: key, module: m.module, section: sec.title || "", label: it.label, icon: it.icon, count: it.count };
        ORDER.push(key);
      });
    });
  });
  var HOME = { Overview: "overview/dashboard", People: "people/students", Academics: "academics/overview", Finance: "finance/collections", Operations: "operations/inventory", Settings: "settings/school-profile" };
  var EXTERNAL = { "settings/website": "website.html" };
  var route = ROUTES["people/students"];

  /* ----------------------------------------------------------------- state */
  var ui = {
    filters: [{ key: "class", value: "JSS 2" }],
    q: "",
    group: false,
    selected: {},
    anchor: null,
    cursor: null,
    pendingCursor: null,
    rq: "",
    rfilters: [],
    detailId: null,
    detailTab: "overview",
    editId: null,
    term: { session: D.session.title, term: D.session.term },
    unread: 3,
    flash: null,
  };
  function isCurrentTerm() { return ui.term.session === D.session.title && ui.term.term === D.session.term; }
  var flashTimer = null;
  function flash(id) {
    ui.flash = id;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { ui.flash = null; $$("#rows tr.is-new").forEach(function (r) { r.classList.remove("is-new"); }); }, 1900);
  }

  /* -------------------------------------------------------- overlay stack */
  var panels = [];
  function openPanel(el, opts) {
    opts = opts || {};
    if (el.getAttribute("data-open") === "true") return;
    if (el.getAttribute("data-open") === "false" && !el.hidden) { setTimeout(function () { openPanel(el, opts); }, 300); return; } // still closing
    closePop(false);
    el.hidden = false;
    void el.offsetWidth; // flush the closed state so the slide/fade transition runs
    panels.push(el);
    SC.open(el, { onClose: function () { var i = panels.lastIndexOf(el); if (i > -1) panels.splice(i, 1); if (opts.onClose) opts.onClose(); } });
  }
  function topPanel() { return panels[panels.length - 1] || null; }
  function closeAll() { var guard = 10; while (panels.length && guard--) SC.close(topPanel()); }

  /* --------------------------------------------------- popover controller */
  var popEl = $("#pop");
  var pop = null; // { trigger, items, cfg }
  function openMenu(trigger, cfg) {
    if (pop && pop.trigger === trigger) { closePop(true); return; }
    closePop(false);
    popEl.className = "popover tt-pop" + (cfg.cls ? " " + cfg.cls : "");
    popEl.setAttribute("role", cfg.role || "menu");
    popEl.setAttribute("aria-label", cfg.label || "Menu");
    popEl.style.width = cfg.width ? cfg.width + "px" : "";
    pop = { trigger: trigger, items: cfg.items || [], cfg: cfg };
    popEl.innerHTML = cfg.render ? cfg.render() : menuHTML(pop.items);
    popEl.hidden = false;
    placePop(trigger, cfg.align);
    trigger.setAttribute("aria-expanded", "true");
    var first = popEl.querySelector('[aria-checked="true"]') || popEl.querySelector("[data-i]");
    if (first) first.focus({ preventScroll: true });
  }
  function rerenderPop() { if (!pop) return; popEl.innerHTML = pop.cfg.render ? pop.cfg.render() : menuHTML(pop.items); }
  function placePop(trigger, align) {
    var r = trigger.getBoundingClientRect();
    var w = popEl.offsetWidth, h = popEl.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    var top = r.bottom + 6;
    if (top + h > vh - 8 && r.top - 6 - h > 8) top = r.top - 6 - h;
    popEl.style.left = Math.round(left) + "px";
    popEl.style.top = Math.round(Math.max(8, top)) + "px";
  }
  function closePop(returnFocus) {
    if (!pop) return;
    var t = pop.trigger;
    pop = null;
    popEl.hidden = true;
    popEl.innerHTML = "";
    t.setAttribute("aria-expanded", "false");
    if (returnFocus && document.contains(t)) t.focus({ preventScroll: true });
  }
  function menuHTML(items) {
    return items.map(function (o, i) {
      if (o.sep) return '<div class="menu-sep" role="separator"></div>';
      if (o.heading) return '<div class="menu-label" role="presentation"><span>' + esc(o.heading) + "</span>" + (o.meta ? "<span>" + esc(o.meta) + "</span>" : "") + "</div>";
      var role = o.role || "menuitem";
      var lead = o.icon ? ic(o.icon, 15) : (o.checked != null ? '<span class="mi-check">' + (o.checked ? ic("check", 14) : "") + "</span>" : "");
      return '<button type="button" class="menu-item' + (o.danger ? " is-destructive" : "") + '" role="' + role + '"' +
        (o.checked != null ? ' aria-checked="' + !!o.checked + '"' : "") + ' data-i="' + i + '" tabindex="-1">' + lead +
        '<span class="mi-label">' + esc(o.label) + "</span>" +
        (o.badge ? '<span class="badge badge-info">' + esc(o.badge) + "</span>" : "") +
        (o.meta ? '<span class="menu-shortcut">' + esc(o.meta) + "</span>" : "") +
        (o.kbd ? '<span class="menu-shortcut">' + kbd(o.kbd) + "</span>" : "") + "</button>";
    }).join("");
  }
  popEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-i]");
    if (!b || !pop) return;
    var it = pop.items[+b.getAttribute("data-i")];
    if (!it || !it.run) return;
    if (it.keepOpen) { it.run(b); return; }
    closePop(true);
    it.run();
  });
  popEl.addEventListener("keydown", function (e) {
    var items = $$("[data-i]", popEl);
    var i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var n = items.length; if (!n) return;
      i = e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n;
      items[i].focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault(); if (items.length) items[e.key === "Home" ? 0 : items.length - 1].focus();
    } else if (e.key === "Tab") {
      closePop(true);
    }
  });
  document.addEventListener("pointerdown", function (e) {
    if (pop && !popEl.contains(e.target) && !pop.trigger.contains(e.target)) closePop(false);
  }, true);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pop) { e.preventDefault(); e.stopPropagation(); closePop(true); }
  }, true);
  window.addEventListener("resize", function () { closePop(false); });
  document.addEventListener("scroll", function (e) { if (pop && e.target !== popEl && !popEl.contains(e.target)) closePop(false); }, true);

  /* ------------------------------------------------------------- chrome */
  function renderChrome() {
    var mod = route.module;
    $("#modtabs").innerHTML = D.nav.map(function (m) {
      return '<a class="modtab" href="#' + HOME[m.module] + '"' + (m.module === mod ? ' aria-current="page"' : "") + ">" + esc(m.module) + "</a>";
    }).join("");
    $("#modselect").innerHTML = D.nav.map(function (m) {
      return '<option value="' + HOME[m.module] + '"' + (m.module === mod ? " selected" : "") + ">" + esc(m.module) + "</option>";
    }).join("");
    renderSubnav();
  }
  function renderSubnav() {
    var m = D.nav.filter(function (x) { return x.module === route.module; })[0];
    var html = '<div class="subnav-head"><span class="subnav-module">' + esc(m.module) + "</span>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-xs" data-act="toggle-subnav" aria-label="Hide section navigation" title="Hide (' + MOD + ' B)">' + ic("panel-left-close", 15) + "</button></div>";
    m.sections.forEach(function (sec, si) {
      var tid = "sn-" + si;
      html += '<div class="subnav-section">' + (sec.title ? '<p class="subnav-title" id="' + tid + '">' + esc(sec.title) + "</p>" : "") +
        '<ul role="list"' + (sec.title ? ' aria-labelledby="' + tid + '"' : "") + ">";
      sec.items.forEach(function (it) {
        var key = SC.slugify(m.module) + "/" + SC.slugify(it.label);
        var ext = EXTERNAL[key];
        var count = key === "people/students" ? int(stats().total) : it.count;
        html += '<li><a class="subnav-item" href="' + (ext || "#" + key) + '"' + (route.key === key ? ' aria-current="page"' : "") + ">" +
          ic(it.icon, 15) + "<span>" + esc(it.label) + "</span>" +
          (count != null ? '<span class="count">' + esc(count) + "</span>" : "") +
          (ext ? ic("arrow-up-right", 13, "ext") : "") + "</a></li>";
      });
      html += "</ul></div>";
    });
    html += '<div class="subnav-foot"><span class="addr" title="Workspace address">' + esc(D.school.dashboard) + '</span><span class="hint">' + kbd(["mod", "B"]) + " Hide panel</span></div>";
    var nav = $("#subnav");
    nav.innerHTML = html;
    nav.setAttribute("aria-label", m.module + " sections");
  }
  function toggleSubnav(force, quiet) {
    var app = $("#app");
    var open = force != null ? force : app.getAttribute("data-subnav") !== "open";
    if (!open && $("#subnav").contains(document.activeElement)) $("#main").focus({ preventScroll: true });
    app.setAttribute("data-subnav", open ? "open" : "closed");
    if (!quiet) { SC.store("tt-subnav", open ? "open" : "closed"); announce(open ? "Section navigation shown" : "Section navigation hidden"); }
  }

  /* -------------------------------------------------------------- routing */
  function fromHash() { var k = decodeURIComponent(location.hash.replace(/^#/, "")); return ROUTES[k] ? k : "people/students"; }
  function navigate(key) {
    if (EXTERNAL[key]) { location.href = EXTERNAL[key]; return; }
    if (location.hash.slice(1) === key) setRoute(key, true); else location.hash = key;
  }
  function setRoute(key, focusTitle) {
    var prev = route ? route.key : null;
    route = ROUTES[key] || ROUTES["people/students"];
    if (prev !== route.key) { ui.cursor = null; if (route.key !== "people/students") ui.selected = {}; }
    if (ui.pendingCursor) { ui.cursor = ui.pendingCursor; ui.pendingCursor = null; }
    closePop(false);
    renderChrome();
    renderPage();
    document.title = route.label + " · " + D.school.name;
    if (focusTitle) { var h = $("#pageTitle"); if (h) h.focus({ preventScroll: true }); $("#main").scrollTop = 0; if (window.innerWidth < 768) window.scrollTo(0, 0); }
    var chip = $("#subnav [aria-current]");
    if (chip && window.innerWidth < 768) { var sn = $("#subnav"); sn.scrollLeft = Math.max(0, chip.offsetLeft - 12); }
    if (route.key === "finance/receive-payment") openPay();
  }
  window.addEventListener("hashchange", function () { closeAll(); setRoute(fromHash(), true); });

  function crumbs() {
    var parts = [route.module];
    if (route.section) parts.push(route.section);
    parts.push(route.label);
    return '<div class="crumb-row"><button type="button" class="btn btn-ghost btn-icon btn-xs subnav-open" data-act="toggle-subnav" aria-label="Show section navigation" title="Show (' + MOD + ' B)">' + ic("panel-left", 15) + "</button>" +
      '<nav aria-label="Breadcrumb"><ol class="crumbs">' + parts.map(function (x, i) { return "<li" + (i === parts.length - 1 ? ' aria-current="page"' : "") + ">" + esc(x) + "</li>"; }).join("") + "</ol></nav></div>";
  }
  function termBanner() {
    if (isCurrentTerm()) return "";
    return '<div class="term-banner" role="status">' + ic("calendar-range", 15) +
      "<span>Viewing <strong>" + esc(ui.term.session + " · " + ui.term.term) + "</strong>. This preview only holds records for the current term, so the figures below are unchanged.</span>" +
      '<button type="button" class="btn btn-outline btn-xs" data-act="term-current">Back to current term</button></div>';
  }
  function hints(withSelect) {
    return '<span class="hint">' + kbd(["↑", "↓"]) + " Move</span>" +
      (withSelect ? '<span class="hint">' + kbd(["X"]) + " Select</span>" : "") +
      '<span class="hint">' + kbd(["↵"]) + " Open</span>" +
      '<span class="hint">' + kbd(["/"]) + " Search</span>" +
      '<span class="hint">' + kbd(["mod", "K"]) + " Find anything</span>";
  }
  function stat(label, value, foot, extra, cls) {
    return '<div class="stat' + (cls ? " " + cls : "") + '"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p><p class="stat-foot">' + foot + "</p>" + (extra || "") + "</div>";
  }
  function hl(text, q) {
    text = String(text == null ? "" : text);
    q = String(q || "").trim();
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark class="hit">' + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  function renderPage() {
    var p = $("#page");
    if (route.key === "people/students") renderStudents(p);
    else if (route.key === "finance/collections" || route.key === "finance/receive-payment") renderCollections(p);
    else if (route.key === "overview/dashboard") renderDashboard(p);
    else renderEmpty(p);
    if (ui.cursor) { var tr = rowEl(ui.cursor); if (tr) tr.scrollIntoView({ block: "nearest" }); }
  }

  /* ============================================================ STUDENTS */
  function renderStudents(p) {
    p.className = "page page--fill";
    p.innerHTML = termBanner() +
      '<header class="page-head"><div class="page-head-main">' + crumbs() +
        '<h1 class="page-title" id="pageTitle" tabindex="-1">Students</h1></div>' +
        '<div class="page-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-act="import">' + ic("upload", 15) + "Import</button>" +
          '<button type="button" class="btn btn-outline btn-sm" data-act="approvals">' + ic("user-check", 15) + 'Approvals <span class="count-tag" aria-label="3 waiting">3</span></button>' +
          '<button type="button" class="btn btn-default btn-sm" data-act="new-student" aria-keyshortcuts="N">' + ic("plus", 15) + "New student" + kbd(["N"]) + "</button>" +
        "</div></header>" +
      '<section class="strip" id="studentStats" aria-label="Student totals"></section>' +
      '<section class="datacard" aria-labelledby="pageTitle">' +
        '<div class="toolbar" id="toolbar">' +
          '<div class="input-group find"><span class="input-addon is-icon" aria-hidden="true">' + ic("search", 14) + "</span>" +
            '<input class="input" type="search" id="studentSearch" placeholder="Search students…" aria-label="Search students by name, ID, guardian or phone. Type a filter like status:enrolled and press Enter." autocomplete="off" spellcheck="false" value="' + esc(ui.q) + '">' +
            '<span class="input-addon find-kbd">' + kbd(["/"]) + "</span></div>" +
          '<div class="qchips" id="qchips" role="list" aria-label="Active filters"></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="add-filter" aria-haspopup="menu" aria-expanded="false">' + ic("list-filter", 14) + "Add filter</button>" +
          '<span class="rcount" id="rcount" role="status"></span>' +
          '<button type="button" class="btn btn-outline btn-sm btn-toggle" data-act="group" aria-pressed="' + ui.group + '">' + ic("rows-3", 14) + "Group by arm</button>" +
        "</div>" +
        '<div class="bulkbar" id="bulkbar" role="region" aria-label="Bulk actions" hidden>' +
          '<strong class="bulk-count" id="bulkCount">0 selected</strong><span class="bulk-sep" aria-hidden="true"></span>' +
          '<button type="button" class="btn btn-sm" data-act="bulk-export">' + ic("download", 14) + '<span class="btn-label">Export CSV</span></button>' +
          '<button type="button" class="btn btn-sm" data-act="bulk-admission" aria-haspopup="menu" aria-expanded="false">' + ic("tag", 14) + '<span class="btn-label">Set admission status</span>' + ic("chevron-down", 13) + "</button>" +
          '<button type="button" class="btn btn-sm" data-act="bulk-move" aria-haspopup="menu" aria-expanded="false">' + ic("arrow-right", 14) + '<span class="btn-label">Move class</span>' + ic("chevron-down", 13) + "</button>" +
          '<button type="button" class="btn btn-sm" data-act="bulk-remove">' + ic("user-x", 14) + '<span class="btn-label">Remove from term</span></button>' +
          '<button type="button" class="btn btn-sm bulk-clear" data-act="bulk-clear" aria-label="Clear selection">' + kbd(["Esc"]) + ic("x", 14) + "</button>" +
        "</div>" +
        '<div class="grid-pane" id="gridPane" tabindex="0" role="region" aria-label="Students table. Arrow keys move the cursor, X selects, Enter opens.">' +
          '<table class="table tt-grid" id="grid"><thead><tr>' +
            '<th class="col-check sticky-col" scope="col"><input type="checkbox" class="checkbox" id="selAll" aria-label="Select all visible students"></th>' +
            '<th class="col-student sticky-col sticky-col-2 sticky-edge" scope="col">Student</th>' +
            '<th scope="col">Student ID</th><th scope="col">Class</th><th scope="col" class="c">Gender</th><th scope="col">Status</th><th scope="col">Admission</th><th scope="col">Guardian</th><th scope="col">Guardian phone</th>' +
            '<th class="col-actions" scope="col"><span class="sr-only">Actions</span></th>' +
          '</tr></thead><tbody id="rows"></tbody></table>' +
        "</div>" +
        '<footer class="grid-foot">' + hints(true) + '<span class="right" id="pageInfo"></span></footer>' +
      "</section>";
    renderStudentStats();
    renderChips();
    renderStudentRows();
  }
  function renderStudentStats() {
    var el = $("#studentStats"); if (!el) return;
    var st = stats();
    el.innerHTML =
      stat("Total students", int(st.total), st.unclassified + " need classification") +
      stat("Enrolled this term", int(st.enrolled), pct(st.enrolled / st.total * 100) + " of roll") +
      stat("New admissions", int(st.newAdm), "First Term intake") +
      stat("Returning", int(st.returning), "From 2025/2026");
  }
  function matchStudent(s) {
    for (var i = 0; i < ui.filters.length; i++) {
      var f = ui.filters[i], v = String(f.value).toLowerCase();
      if (f.key === "class" && (s.cls + " " + s.arm).toLowerCase().indexOf(v) !== 0) return false;
      if (f.key === "status" && s.status !== v) return false;
      if (f.key === "admission" && s.admission !== v) return false;
      if (f.key === "gender" && s.gender.toLowerCase() !== v) return false;
    }
    var q = ui.q.trim().toLowerCase();
    if (!q) return true;
    return [fullName(s), s.id, s.guardian, s.phone].some(function (x) { return String(x).toLowerCase().indexOf(q) > -1; });
  }
  function visibleStudents() {
    var list = students.filter(matchStudent);
    if (ui.group) {
      list = list.slice().sort(function (a, b) {
        var x = (a.cls + " " + a.arm).localeCompare(b.cls + " " + b.arm);
        return x || students.indexOf(a) - students.indexOf(b);
      });
    }
    return list;
  }
  function studentRow(s, q) {
    var name = fullName(s), sel = !!ui.selected[s.id];
    return '<tr data-id="' + esc(s.id) + '" class="' + (sel ? "is-selected " : "") + (ui.cursor === s.id ? "is-cursor " : "") + (ui.flash === s.id ? "is-new" : "") + '">' +
      '<td class="col-check sticky-col"><input type="checkbox" class="checkbox" data-sel' + (sel ? " checked" : "") + ' aria-label="Select ' + esc(name) + '"></td>' +
      '<td class="col-student sticky-col sticky-col-2 sticky-edge"><div class="cell-person"><span class="avatar avatar-xs" data-tint="' + tint(s) + '" aria-hidden="true">' + esc(initials(s)) + "</span>" +
        '<button type="button" class="cell-link" data-act="open">' + hl(name, q) + "</button></div></td>" +
      '<td class="mono">' + hl(s.id, q) + "</td>" +
      "<td>" + esc(s.cls + " " + s.arm) + "</td>" +
      '<td class="mono c">' + esc(s.gender) + "</td>" +
      "<td>" + tag(STATUS[s.status]) + "</td>" +
      "<td>" + tag(ADM[s.admission]) + "</td>" +
      "<td>" + hl(s.guardian, q) + "</td>" +
      '<td class="mono">' + hl(s.phone, q) + "</td>" +
      '<td class="col-actions"><button type="button" class="btn btn-ghost btn-icon btn-xs" data-act="row-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + esc(name) + '">' + ic("ellipsis", 15) + "</button></td></tr>";
  }
  function renderStudentRows() {
    var tb = $("#rows"); if (!tb) return;
    var list = visibleStudents(), q = ui.q.trim(), html = "";
    var vis = {};
    list.forEach(function (s) { vis[s.id] = true; });
    Object.keys(ui.selected).forEach(function (id) { if (!vis[id]) delete ui.selected[id]; });
    if (ui.cursor && !vis[ui.cursor]) ui.cursor = null;
    if (!list.length) {
      var desc = ui.filters.map(function (f) { return "<code>" + esc(f.key + ":" + f.value) + "</code>"; }).join(" ") + (q ? " <code>“" + esc(q) + "”</code>" : "");
      html = '<tr class="empty-row"><td colspan="10"><div class="grid-empty"><strong>No students match</strong>' + desc +
        '<button type="button" class="btn btn-outline btn-xs" data-act="clear-filters">Clear filters and search</button></div></td></tr>';
    } else if (ui.group) {
      var groups = {}, order = [];
      list.forEach(function (s) { var g = s.cls + " " + s.arm; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(s); });
      order.forEach(function (g) {
        var enrolled = groups[g].filter(function (s) { return s.status === "enrolled"; }).length;
        html += '<tr class="group-row" data-group="' + esc(g) + '"><td class="col-check sticky-col"><input type="checkbox" class="checkbox" data-sel-group aria-label="Select everyone in ' + esc(g) + '"></td>' +
          '<td class="sticky-col sticky-col-2 sticky-edge group-label">' + esc(g) + "</td>" +
          '<td colspan="8" class="group-meta">' + groups[g].length + " students · " + enrolled + " enrolled</td></tr>";
        groups[g].forEach(function (s) { html += studentRow(s, q); });
      });
    } else {
      list.forEach(function (s) { html += studentRow(s, q); });
    }
    tb.innerHTML = html;
    syncStudentRows();
    var total = stats().total;
    $("#rcount").textContent = list.length + (list.length === 1 ? " result" : " results");
    $("#pageInfo").textContent = list.length + " of " + int(total) + " shown · sample page";
  }
  function syncStudentRows() {
    var list = visibleStudents();
    $$("#rows tr[data-id]").forEach(function (tr) {
      var id = tr.getAttribute("data-id"), sel = !!ui.selected[id];
      tr.classList.toggle("is-selected", sel);
      tr.classList.toggle("is-cursor", ui.cursor === id);
      var cb = tr.querySelector("input[data-sel]"); if (cb) cb.checked = sel;
    });
    $$("#rows tr.group-row").forEach(function (tr) {
      var g = tr.getAttribute("data-group");
      var ids = list.filter(function (s) { return s.cls + " " + s.arm === g; }).map(function (s) { return s.id; });
      var n = ids.filter(function (id) { return ui.selected[id]; }).length;
      var cb = tr.querySelector("input"); cb.checked = n > 0 && n === ids.length; cb.indeterminate = n > 0 && n < ids.length;
    });
    var all = $("#selAll");
    var n = list.filter(function (s) { return ui.selected[s.id]; }).length;
    if (all) { all.checked = n > 0 && n === list.length; all.indeterminate = n > 0 && n < list.length; }
    var count = Object.keys(ui.selected).length;
    var bar = $("#bulkbar"), tool = $("#toolbar");
    if (!bar) return;
    var wasShown = !bar.hidden, show = count > 0;
    var focusInBar = bar.contains(document.activeElement);
    bar.hidden = !show; tool.hidden = show;
    $("#bulkCount").textContent = count + " selected";
    if (show && !wasShown) announce(count + " selected. Bulk actions available.");
    if (!show && wasShown) { announce("Selection cleared"); if (focusInBar) $("#gridPane").focus({ preventScroll: true }); }
  }
  function toggleSel(id, on, shift) {
    var list = visibleStudents().map(function (s) { return s.id; });
    if (shift && ui.anchor && list.indexOf(ui.anchor) > -1) {
      var a = list.indexOf(ui.anchor), b = list.indexOf(id);
      list.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(function (x) { if (on) ui.selected[x] = true; else delete ui.selected[x]; });
    } else {
      if (on) ui.selected[id] = true; else delete ui.selected[id];
    }
    ui.anchor = id;
    syncStudentRows();
  }
  function clearSelection() { ui.selected = {}; syncStudentRows(); }
  function renderChips() {
    var c = $("#qchips"); if (!c) return;
    c.innerHTML = ui.filters.map(function (f) {
      return '<span class="qchip" role="listitem"><span class="qchip-key">' + esc(f.key) + ':</span><span class="qchip-val">' + esc(f.value) + "</span>" +
        '<button type="button" class="qchip-x" data-act="rm-filter" data-k="' + esc(f.key) + '" aria-label="Remove filter ' + esc(f.key + ":" + f.value) + '">' + ic("x", 12) + "</button></span>";
    }).join("");
  }
  var FILTER_ALIASES = { "not enrolled": "not-enrolled", "new admission": "new", "new-admission": "new", "needs classification": "unclassified", "needs-classification": "unclassified", female: "f", male: "m" };
  function addFilter(key, value) {
    key = key.toLowerCase();
    if (["class", "status", "admission", "gender"].indexOf(key) < 0) return false;
    value = String(value).trim();
    if (key !== "class") { value = value.toLowerCase(); value = FILTER_ALIASES[value] || value.replace(/\s+/g, "-"); }
    else value = value.toUpperCase().replace(/\s+/g, " ");
    ui.filters = ui.filters.filter(function (f) { return f.key !== key; });
    ui.filters.push({ key: key, value: value });
    renderChips(); renderStudentRows();
    announce("Filter " + key + ":" + value + " added");
    return true;
  }
  function openFilterMenu(trigger) {
    var classes = [], seen = {};
    students.forEach(function (s) {
      [s.cls, s.cls + " " + s.arm].forEach(function (c) { if (!seen[c]) { seen[c] = true; classes.push(c); } });
    });
    classes.sort();
    function n(fn) { return students.filter(fn).length; }
    var items = [{ heading: "class" }];
    classes.forEach(function (c) { items.push({ label: "class:" + c, meta: String(n(function (s) { return (s.cls + " " + s.arm).indexOf(c) === 0; })), run: function () { addFilter("class", c); } }); });
    items.push({ heading: "status" });
    ["enrolled", "not-enrolled"].forEach(function (v) { items.push({ label: "status:" + v, meta: String(n(function (s) { return s.status === v; })), run: function () { addFilter("status", v); } }); });
    items.push({ heading: "admission" });
    ["new", "returning", "unclassified"].forEach(function (v) { items.push({ label: "admission:" + v, meta: String(n(function (s) { return s.admission === v; })), run: function () { addFilter("admission", v); } }); });
    items.push({ heading: "gender" });
    ["f", "m"].forEach(function (v) { items.push({ label: "gender:" + v, meta: String(n(function (s) { return s.gender.toLowerCase() === v; })), run: function () { addFilter("gender", v); } }); });
    openMenu(trigger, { label: "Add filter", items: items, width: 240, cls: "mono-menu" });
  }

  /* row actions */
  function openRowMenu(id, trigger) {
    var s = findStudent(id); if (!s) return;
    setCursor(id, false);
    openMenu(trigger, {
      label: "Actions for " + fullName(s), align: "end", width: 228,
      items: [
        { label: "View details", icon: "eye", kbd: ["↵"], run: function () { openDetail(id); } },
        { label: "Edit information", icon: "pencil", kbd: ["E"], run: function () { openStudentForm(id); } },
        { label: "Remove from current term", icon: "user-x", run: function () { confirmRemove([id]); } },
        { sep: true },
        { label: "Delete student", icon: "trash-2", danger: true, run: function () { confirmDelete(id); } },
      ],
    });
  }
  function confirmDelete(id) {
    var s = findStudent(id); if (!s) return;
    var acc = account(s), name = fullName(s);
    confirmAction({
      tone: "destructive",
      eyebrow: "Delete student · 1 record",
      title: "Delete " + name + "?",
      desc: "This permanently removes the student record from Kingsway Academy. It can’t be undone.",
      rows: [["Student", name], ["Student ID", s.id], ["Class", s.cls + " " + s.arm], ["Guardian", s.guardian], ["Paid this term", money(acc.paid)]],
      confirm: "Delete student",
      run: function () {
        var vis = $$("#rows tr[data-id]").map(function (r) { return r.getAttribute("data-id"); });
        var i = vis.indexOf(id);
        students = students.filter(function (x) { return x.id !== id; });
        delete ui.selected[id];
        if (ui.cursor === id) ui.cursor = vis[i + 1] || vis[i - 1] || null;
        if (ui.detailId === id && $("#detailSheet").getAttribute("data-open") === "true") SC.close($("#detailSheet"));
        refreshStudents();
        SC.toast("Student deleted", name + " · " + s.id, "trash-2");
      },
    });
  }
  function confirmRemove(ids) {
    var list = ids.map(findStudent).filter(Boolean);
    if (!list.length) return;
    var n = list.length, name = fullName(list[0]);
    var classes = [];
    list.forEach(function (s) { var c = s.cls + " " + s.arm; if (classes.indexOf(c) < 0) classes.push(c); });
    confirmAction({
      tone: "neutral",
      eyebrow: "Remove from term · " + n + (n === 1 ? " record" : " records"),
      title: n === 1 ? "Remove " + name + " from First Term?" : "Remove " + n + " students from First Term?",
      desc: "They’ll show as Not enrolled for 2026/2027 · First Term. Their student records stay in place.",
      rows: [["Term", "2026/2027 · First Term"], ["Students", n === 1 ? name : n + " selected"], ["Classes", classes.join(", ")], ["Status after", "Not enrolled"]],
      confirm: "Remove from term",
      run: function () {
        list.forEach(function (s) { s.status = "not-enrolled"; });
        ui.selected = {};
        refreshStudents();
        SC.toast("Removed from First Term", n === 1 ? name + " · now Not enrolled" : n + " students · now Not enrolled", "user-x");
      },
    });
  }
  function refreshStudents() {
    renderStudentStats(); renderStudentRows(); renderSubnav();
    if (route.key === "overview/dashboard") renderPage();
    var ae = document.activeElement;
    if (!ae || ae === document.body || !document.contains(ae)) { var gp = $("#gridPane"); if (gp) gp.focus({ preventScroll: true }); }
  }

  /* keyboard cursor (shared by Students and Collections tables) */
  function rowEl(id) { return $$("#rows tr[data-id]").filter(function (r) { return r.getAttribute("data-id") === id; })[0] || null; }
  function syncCursor() { $$("#rows tr[data-id]").forEach(function (tr) { tr.classList.toggle("is-cursor", tr.getAttribute("data-id") === ui.cursor); }); }
  function setCursor(id, scroll) {
    ui.cursor = id;
    syncCursor();
    var rows = $$("#rows tr[data-id]"), tr = rowEl(id);
    if (tr && scroll) {
      tr.scrollIntoView({ block: "nearest" });
      var label = route.key === "people/students" ? fullName(findStudent(id) || { first: "", last: "" }) : id;
      announce(label + ", row " + (rows.indexOf(tr) + 1) + " of " + rows.length);
    }
  }
  function moveCursor(d) {
    var ids = $$("#rows tr[data-id]").map(function (r) { return r.getAttribute("data-id"); });
    if (!ids.length) return;
    var i = ids.indexOf(ui.cursor);
    i = i < 0 ? (d > 0 ? 0 : ids.length - 1) : Math.max(0, Math.min(ids.length - 1, i + d));
    setCursor(ids[i], true);
  }
  function openCursorRow() {
    if (!ui.cursor) return;
    if (route.key === "people/students") openDetail(ui.cursor);
    else openReceipt(ui.cursor);
  }

  /* ========================================================= COLLECTIONS */
  function renderCollections(p) {
    p.className = "page page--fill";
    var rate = fin.collected / fin.billed * 100;
    var todayCount = payments.filter(function (x) { return x.date === "09 Oct"; }).length;
    p.innerHTML = termBanner() +
      '<header class="page-head"><div class="page-head-main">' + crumbs() +
        '<h1 class="page-title" id="pageTitle" tabindex="-1">Collections</h1>' +
        '<p class="page-sub">2026/2027 · First Term · to Fri 09 Oct</p></div>' +
        '<div class="page-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-act="export-receipts">' + ic("download", 15) + "Export CSV</button>" +
          '<button type="button" class="btn btn-default btn-sm" data-act="receive" aria-keyshortcuts="R">' + ic("hand-coins", 15) + "Receive payment" + kbd(["R"]) + "</button>" +
        "</div></header>" +
      '<section class="panel" aria-label="Term collection position" style="flex:none">' +
        '<div class="strip strip--flush strip--5">' +
          stat("Collected", mil(fin.collected), money(fin.collected)) +
          stat("Billed", mil(fin.billed), int(stats().total) + " students") +
          stat("Outstanding", mil(fin.billed - fin.collected), pct(100 - rate) + " of billed") +
          stat("Collection rate", pct(rate), "Week 4 of 13") +
          stat("Today", money(fin.today), todayCount + " receipts") +
        "</div>" +
        '<div class="ruler-wrap"><div class="ruler" role="meter" aria-label="Collected of billed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + rate.toFixed(1) + '" aria-valuetext="' + pct(rate) + ' collected">' +
          '<span class="ruler-fill" style="width:' + rate.toFixed(2) + '%"></span><span class="ruler-mark" style="left:' + rate.toFixed(2) + '%"></span></div>' +
          '<div class="ruler-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div></div>' +
      "</section>" +
      '<section class="datacard" aria-labelledby="receiptsTitle">' +
        '<h2 class="sr-only" id="receiptsTitle">Receipts</h2>' +
        '<div class="toolbar">' +
          '<div class="input-group find"><span class="input-addon is-icon" aria-hidden="true">' + ic("search", 14) + "</span>" +
            '<input class="input" type="search" id="receiptSearch" placeholder="Search receipts…" aria-label="Search receipts by number, student or payer. Type a filter like method:cash and press Enter." autocomplete="off" spellcheck="false" value="' + esc(ui.rq) + '">' +
            '<span class="input-addon find-kbd">' + kbd(["/"]) + "</span></div>" +
          '<div class="qchips" id="rchips" role="list" aria-label="Active filters"></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="add-rfilter" aria-haspopup="menu" aria-expanded="false">' + ic("list-filter", 14) + "Add filter</button>" +
          '<span class="rcount" id="rcount" role="status"></span>' +
        "</div>" +
        '<div class="grid-pane" id="gridPane" tabindex="0" role="region" aria-label="Receipts table. Arrow keys move the cursor, Enter opens the student.">' +
          '<table class="table tt-grid" id="grid"><thead><tr>' +
            '<th class="sticky-col sticky-edge" scope="col">Receipt</th><th scope="col">Date</th><th scope="col">Student</th><th scope="col">Payer</th><th scope="col">Method</th>' +
            '<th scope="col" class="num">Amount</th><th scope="col">Allocation</th><th scope="col">Status</th><th scope="col">Recorded by</th>' +
          '</tr></thead><tbody id="rows"></tbody><tfoot id="rfoot"></tfoot></table>' +
        "</div>" +
        '<footer class="grid-foot">' + hints(false) + '<span class="right" id="pageInfo"></span></footer>' +
      "</section>";
    renderRChips();
    renderReceiptRows();
  }
  function matchReceipt(r) {
    for (var i = 0; i < ui.rfilters.length; i++) {
      var f = ui.rfilters[i];
      if (f.key === "method" && r.method.toLowerCase() !== f.value) return false;
      if (f.key === "status" && r.status !== f.value) return false;
    }
    var q = ui.rq.trim().toLowerCase();
    if (!q) return true;
    return [r.receipt, r.student, r.payer, r.cls, r.allocation].some(function (x) { return String(x).toLowerCase().indexOf(q) > -1; });
  }
  function renderReceiptRows() {
    var tb = $("#rows"); if (!tb) return;
    var list = payments.filter(matchReceipt), q = ui.rq.trim();
    if (ui.cursor && !list.some(function (r) { return r.receipt === ui.cursor; })) ui.cursor = null;
    var html = list.map(function (r) {
      var flagged = /pending|refund/i.test(r.allocation);
      return '<tr data-id="' + esc(r.receipt) + '" class="' + (r.status === "refunded" ? "is-refunded " : "") + (ui.cursor === r.receipt ? "is-cursor " : "") + (ui.flash === r.receipt ? "is-new" : "") + '">' +
        '<td class="sticky-col sticky-edge"><button type="button" class="cell-link mono" data-act="open">' + hl(r.receipt, q) + "</button></td>" +
        '<td class="mono">' + esc(r.date) + "</td>" +
        '<td><span class="cell-strong">' + hl(r.student, q) + '</span><span class="cell-sub">' + esc(r.cls) + "</span></td>" +
        "<td>" + hl(r.payer, q) + "</td>" +
        '<td><span class="method">' + ic(METHOD_ICON[r.method] || "wallet", 14) + esc(r.method) + "</span></td>" +
        '<td class="num">' + money(r.amount) + "</td>" +
        "<td>" + (flagged ? '<span class="badge badge-warning">' + hl(r.allocation, q) + "</span>" : hl(r.allocation, q)) + "</td>" +
        "<td>" + tag(PAY[r.status] || PAY.paid) + "</td>" +
        '<td class="muted">' + esc(r.by) + "</td></tr>";
    }).join("");
    if (!list.length) {
      html = '<tr class="empty-row"><td colspan="9"><div class="grid-empty"><strong>No receipts match</strong>' +
        ui.rfilters.map(function (f) { return "<code>" + esc(f.key + ":" + f.value) + "</code>"; }).join(" ") + (q ? " <code>“" + esc(q) + "”</code>" : "") +
        '<button type="button" class="btn btn-outline btn-xs" data-act="clear-rfilters">Clear filters and search</button></div></td></tr>';
    }
    tb.innerHTML = html;
    var sum = 0, refunds = 0;
    list.forEach(function (r) { if (r.status === "paid") sum += r.amount; else refunds++; });
    $("#rfoot").innerHTML = list.length ? '<tr><td class="sticky-col sticky-edge">Total · ' + list.length + '</td><td colspan="4"></td><td class="num">' + money(sum) + '</td><td colspan="3" class="muted">' + (refunds ? "Refunds excluded (" + refunds + ")" : "All paid") + "</td></tr>" : "";
    $("#rcount").textContent = list.length + (list.length === 1 ? " receipt" : " receipts");
    $("#pageInfo").textContent = list.length + " of " + payments.length + " receipts this week";
  }
  function renderRChips() {
    var c = $("#rchips"); if (!c) return;
    c.innerHTML = ui.rfilters.map(function (f) {
      return '<span class="qchip" role="listitem"><span class="qchip-key">' + esc(f.key) + ':</span><span class="qchip-val">' + esc(f.value) + "</span>" +
        '<button type="button" class="qchip-x" data-act="rm-rfilter" data-k="' + esc(f.key) + '" aria-label="Remove filter ' + esc(f.key + ":" + f.value) + '">' + ic("x", 12) + "</button></span>";
    }).join("");
  }
  function addRFilter(key, value) {
    key = key.toLowerCase(); value = String(value).trim().toLowerCase();
    if (["method", "status"].indexOf(key) < 0) return false;
    ui.rfilters = ui.rfilters.filter(function (f) { return f.key !== key; });
    ui.rfilters.push({ key: key, value: value });
    renderRChips(); renderReceiptRows();
    announce("Filter " + key + ":" + value + " added");
    return true;
  }
  function openRFilterMenu(trigger) {
    function n(fn) { return String(payments.filter(fn).length); }
    var items = [{ heading: "method" }];
    ["transfer", "cash", "pos"].forEach(function (v) { items.push({ label: "method:" + v, meta: n(function (r) { return r.method.toLowerCase() === v; }), run: function () { addRFilter("method", v); } }); });
    items.push({ heading: "status" });
    ["paid", "refunded"].forEach(function (v) { items.push({ label: "status:" + v, meta: n(function (r) { return r.status === v; }), run: function () { addRFilter("status", v); } }); });
    openMenu(trigger, { label: "Add filter", items: items, width: 220 });
  }
  function openReceipt(receipt) {
    var r = payments.filter(function (x) { return x.receipt === receipt; })[0];
    if (!r) return;
    var s = findStudentByName(r.student);
    if (s) openDetail(s.id, "payments");
    else SC.toast("Student record not found", r.student + " · " + r.receipt, "circle-alert");
  }
  function gotoReceipt(receipt) {
    ui.rq = ""; ui.rfilters = []; flash(receipt); ui.pendingCursor = receipt;
    navigate("finance/collections");
  }

  /* =========================================================== DASHBOARD */
  function renderDashboard(p) {
    p.className = "page";
    var st = stats();
    var hr = new Date().getHours();
    var greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    var rate = fin.collected / fin.billed * 100;
    var att = D.attendance;
    var attBar = '<div class="stat-bar" aria-hidden="true"><span style="width:' + (att.present / BASE.total * 100) + '%;background:var(--success)"></span><span style="width:' + (att.late / BASE.total * 100) + '%;background:var(--warning)"></span><span style="width:' + (att.absent / BASE.total * 100) + '%;background:var(--destructive)"></span></div>';
    var tones = { warning: "tone-warning", info: "tone-info", neutral: "tone-neutral" };
    p.innerHTML = termBanner() +
      '<header class="page-head"><div class="page-head-main">' + crumbs() +
        '<h1 class="page-title page-title--lg" id="pageTitle" tabindex="-1">' + greet + ", " + esc(D.user.first) + "</h1>" +
        '<p class="page-sub">Fri 09 Oct 2026 · Week 4 of 13 · ' + esc(D.session.title + " " + D.session.term) + "</p></div>" +
        '<div class="page-actions"><button type="button" class="btn btn-outline btn-sm" data-act="palette">' + ic("search", 15) + "Find anything" + kbd(["mod", "K"]) + "</button></div></header>" +
      termPanel() +
      '<section class="strip" aria-label="Key figures">' +
        stat("Students", int(st.total), int(st.enrolled) + " enrolled · " + int(st.total - st.enrolled) + " not enrolled") +
        stat("Attendance today", pct(att.rate), att.classesMarked + " of " + att.classesTotal + " classes marked · " + att.late + " late", attBar) +
        stat("Collected this term", mil(fin.collected), pct(rate) + " of " + mil(fin.billed) + " billed", '<div class="progress" aria-hidden="true"><span style="width:' + rate.toFixed(1) + '%"></span></div>') +
        stat("Outstanding", mil(fin.billed - fin.collected), pct(100 - rate) + " of billed") +
      "</section>" +
      '<div class="dash-grid">' +
        '<section class="panel" aria-labelledby="attnHead"><div class="panel-head"><h2 id="attnHead">Needs attention</h2><span class="meta">' + D.tasks.length + " items</span></div>" +
          '<ul class="rowlist">' + D.tasks.map(function (t, i) {
            return '<li><button type="button" class="rowbtn ' + (tones[t.tone] || "tone-neutral") + '" data-act="task" data-i="' + i + '"><span class="ico">' + ic(t.icon, 15) + '</span><span><span class="txt">' + esc(t.text) + '</span><span class="sub">' + esc(t.meta) + '</span></span><span class="end">' + ic("chevron-right", 15) + "</span></button></li>";
          }).join("") + "</ul></section>" +
        '<section class="panel" aria-labelledby="qaHead"><div class="panel-head"><h2 id="qaHead">Quick actions</h2><span class="meta">Keyboard</span></div>' +
          '<ul class="rowlist">' +
            qa("user-plus", "New student", "People › Students", ["N"], "new-student") +
            qa("hand-coins", "Receive payment", "Finance › Collections", ["R"], "receive") +
            qa("search", "Find anything", "Students, receipts, pages", ["mod", "K"], "palette") +
            qa("calendar-range", "Switch term", "Sessions and terms", ["T"], "term") +
            qa("keyboard", "Keyboard shortcuts", "Every key in one list", ["?"], "keys") +
          "</ul></section>" +
      "</div>";
  }
  function qa(icon, label, sub, keys, act) {
    return '<li><button type="button" class="rowbtn compact" data-act="' + act + '"><span class="ico">' + ic(icon, 15) + '</span><span><span class="txt">' + esc(label) + '</span><span class="sub">' + esc(sub) + '</span></span><span class="end">' + kbd(keys) + "</span></button></li>";
  }
  function termPanel() {
    var cells = "";
    for (var w = 1; w <= 13; w++) {
      var d = new Date(2026, 8, 14 + (w - 1) * 7);
      var label = pad2(d.getDate()) + " " + MONTHS[d.getMonth()].toUpperCase();
      var cls = w < 4 ? "is-past" : w === 4 ? "is-now" : "";
      if (w === 7) cls += " break-end";
      if (w === 8) cls += " break-start";
      cells += '<li class="wk ' + cls + '"' + (w === 4 ? ' aria-current="date"' : "") + ' aria-label="Week ' + w + ", from " + label + (w < 4 ? ", done" : w === 4 ? ", this week" : "") + '">' +
        '<span class="wk-n"><span class="wk-w">W</span>' + pad2(w) + '</span><span class="wk-d">' + label + "</span>" +
        (w === 4 ? '<span class="wk-now-line" style="--at:88%" aria-hidden="true"></span><span class="wk-now-tag" aria-hidden="true">Now</span>' : "") + "</li>";
    }
    return '<section class="panel" aria-labelledby="termHead" style="flex:none"><div class="panel-head"><h2 id="termHead">Term progress · ' + esc(D.session.title + " " + D.session.term) + '</h2><span class="meta">W04 / 13 · 31%</span></div>' +
      '<div class="term-body"><ol class="weeks">' + cells + "</ol>" +
      '<div class="term-legend"><span class="lg lg-past">Done</span><span class="lg lg-now">Now · Fri 09 Oct</span><span class="lg lg-break">Mid-term break · 30 Oct – 2 Nov</span><span class="end">' + esc(D.session.start + " → " + D.session.end) + "</span></div></div></section>";
  }

  /* =============================================================== EMPTY */
  function renderEmpty(p) {
    p.className = "page";
    p.innerHTML = termBanner() +
      '<header class="page-head"><div class="page-head-main">' + crumbs() + '<h1 class="page-title" id="pageTitle" tabindex="-1">' + esc(route.label) + "</h1></div></header>" +
      '<section class="empty-slot" aria-labelledby="emptyTitle"><div class="empty-card">' +
        '<span class="empty-icon" aria-hidden="true">' + ic(route.icon, 18) + "</span>" +
        '<p class="eyebrow">' + esc(route.module + (route.section ? " / " + route.section : "")) + " · not in this preview</p>" +
        '<h2 class="empty-title" id="emptyTitle">' + esc(route.label) + " isn’t part of this preview</h2>" +
        '<p class="empty-body">This preview covers Students, Collections and the Dashboard. ' + esc(route.label) + " would use the same shell, spreadsheet tables and inspector sheets.</p>" +
        '<div class="empty-actions"><a class="btn btn-default btn-sm" href="#people/students">' + ic("users", 15) + "Go to Students</a>" +
        '<button type="button" class="btn btn-outline btn-sm" data-act="palette">' + ic("search", 15) + "Find anything" + kbd(["mod", "K"]) + "</button></div>" +
      "</div></section>";
  }

  /* ======================================================= DETAIL SHEET */
  function openDetail(id, tab) {
    if (!findStudent(id)) return;
    ui.detailId = id;
    ui.detailTab = tab || (ui.detailId === id && $("#detailSheet").getAttribute("data-open") === "true" ? ui.detailTab : "overview");
    if (route.key === "people/students") setCursor(id, true);
    renderDetail();
    var sh = $("#detailSheet");
    if (sh.getAttribute("data-open") !== "true") openPanel(sh);
  }
  function renderDetail() {
    var s = findStudent(ui.detailId); if (!s) return;
    var acc = account(s);
    $("#dsId").textContent = s.id + " · " + s.cls + " " + s.arm;
    $("#dsTitle").textContent = fullName(s);
    $("#dsTags").innerHTML = tag(STATUS[s.status]) + tag(ADM[s.admission]) + chargeTag(acc);
    $$("#dsTabs [role=tab]").forEach(function (t) {
      var on = t.getAttribute("data-tab") === ui.detailTab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    var panel = $("#dsPanel");
    panel.setAttribute("aria-labelledby", "dsTab-" + ui.detailTab);
    panel.innerHTML = { overview: dOverview, academics: dAcademics, attendance: dAttendance, payments: dPayments }[ui.detailTab](s, acc);
    panel.scrollTop = 0;
  }
  function age(dob) {
    var p = String(dob || "").split("-"); if (p.length !== 3) return "—";
    var a = 2026 - +p[0];
    if (+p[1] > 10 || (+p[1] === 10 && +p[2] > 9)) a--;
    return String(a);
  }
  function dOverview(s, acc) {
    var paidPct = acc.billed ? acc.paid / acc.billed * 100 : 0;
    var last = payments.filter(function (r) { return r.student === fullName(s); })[0];
    return '<div class="ds-section"><h3 class="insp-head"><span>Record</span><span class="insp-meta">' + esc(D.session.title) + "</span></h3>" +
      '<dl class="kv-grid">' +
        "<div><dt>Class</dt><dd>" + esc(s.cls + " " + s.arm) + "</dd></div>" +
        "<div><dt>Gender</dt><dd>" + (s.gender === "F" ? "Female" : "Male") + "</dd></div>" +
        '<div><dt>Date of birth</dt><dd class="mono">' + esc(fmtDate(s.dob)) + "</dd></div>" +
        '<div><dt>Age</dt><dd class="mono">' + esc(age(s.dob)) + "</dd></div>" +
        "<div><dt>Admission</dt><dd>" + esc(ADM[s.admission][0]) + "</dd></div>" +
        "<div><dt>Status · First Term</dt><dd>" + esc(STATUS[s.status][0]) + "</dd></div>" +
        '<div class="span2"><dt>Guardian</dt><dd>' + esc(s.guardian) + "</dd></div>" +
        '<div class="span2"><dt>Guardian phone</dt><dd class="mono">' + esc(s.phone) + "</dd></div>" +
      "</dl></div>" +
      '<div class="ds-section"><h3 class="insp-head"><span>Fees · First Term</span><span class="insp-meta">' + pct(paidPct) + " paid</span></h3>" +
        '<dl class="strip strip-3"><div class="stat stat-sm"><dt class="stat-label">Billed</dt><dd class="stat-value">' + money(acc.billed) + '</dd></div><div class="stat stat-sm"><dt class="stat-label">Paid</dt><dd class="stat-value">' + money(acc.paid) + '</dd></div><div class="stat stat-sm"><dt class="stat-label">Balance</dt><dd class="stat-value">' + money(acc.due) + "</dd></div></dl>" +
        '<div class="progress" aria-hidden="true"><span style="width:' + paidPct.toFixed(1) + '%"></span></div>' +
        (last ? '<p class="legend-row">Last receipt ' + esc(last.receipt) + " · " + esc(last.date) + " · " + money(last.amount) + "</p>" : '<p class="legend-row">No receipts recorded this term.</p>') +
      "</div>" +
      '<div class="ds-section"><h3 class="insp-head"><span>This week</span><span class="insp-meta">Week 4 · 05–09 Oct</span></h3>' + attendanceTable(s, 4, 4) + "</div>";
  }
  var SUBJECTS = ["Mathematics", "English Language", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "Computer Studies"];
  function dAcademics(s) {
    var rows = SUBJECTS.map(function (sub, i) {
      var h = hash(s.id + sub);
      var ca1 = 10 + (h % 10), ca2 = 9 + ((h >>> 5) % 12);
      var ca2Missing = sub === "Mathematics" && h % 5 === 0;
      var total = ca1 + (ca2Missing ? 0 : ca2);
      return "<tr><td>" + esc(sub) + '</td><td class="num">' + ca1 + '</td><td class="num">' + (ca2Missing ? '<span class="muted">—</span>' : ca2) + '</td><td class="num muted">—</td><td class="num">' + total + "<span class=\"muted\"> /40</span></td></tr>";
    }).join("");
    return '<div class="ds-section"><h3 class="insp-head"><span>Assessment · First Term</span><span class="insp-meta">CA 1 · CA 2 · /20 each</span></h3>' +
      '<div class="mini-wrap"><table class="table tt-grid tt-grid--mini"><thead><tr><th scope="col">Subject</th><th scope="col" class="num">CA 1</th><th scope="col" class="num">CA 2</th><th scope="col" class="num">Exam</th><th scope="col" class="num">So far</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<p class="legend-row">Exam scores aren’t recorded yet. Sample scores for this preview.</p></div>';
  }
  function attMark(s, w, d) {
    if (w === 4 && d === 4) return "now";
    var h = hash(s.id + ":" + w + ":" + d) % 23;
    return h === 0 ? "a" : h === 1 ? "l" : "p";
  }
  function attendanceTable(s, from, to) {
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri"], body = "";
    for (var w = from; w <= to; w++) {
      var start = new Date(2026, 8, 14 + (w - 1) * 7);
      body += '<tr><th scope="row">W' + pad2(w) + "<span>" + pad2(start.getDate()) + " " + MONTHS[start.getMonth()].toUpperCase() + "</span></th>";
      for (var d = 0; d < 5; d++) {
        var m = attMark(s, w, d);
        var txt = { p: "P", l: "L", a: "A", now: "P" }[m];
        var lbl = { p: "Present", l: "Late", a: "Absent", now: "Present, today" }[m];
        body += '<td class="att-' + m + '" aria-label="' + days[d] + ": " + lbl + '">' + txt + "</td>";
      }
      body += "</tr>";
    }
    return '<table class="att-grid"><thead><tr><th scope="col"><span class="sr-only">Week</span></th>' + days.map(function (d) { return '<th scope="col">' + d + "</th>"; }).join("") + "</tr></thead><tbody>" + body + "</tbody></table>";
  }
  function dAttendance(s) {
    var p = 0, l = 0, a = 0;
    for (var w = 1; w <= 4; w++) for (var d = 0; d < 5; d++) { var m = attMark(s, w, d); if (m === "a") a++; else if (m === "l") l++; else p++; }
    return '<div class="ds-section"><h3 class="insp-head"><span>Attendance · weeks 1–4</span><span class="insp-meta">' + (p + l) + "/20 days · " + pct((p + l) / 20 * 100) + "</span></h3>" +
      attendanceTable(s, 1, 4) +
      '<p class="legend-row"><span>P Present · ' + p + "</span><span>L Late · " + l + "</span><span>A Absent · " + a + "</span><span>Yellow · today</span></p></div>";
  }
  function dPayments(s, acc) {
    var rec = payments.filter(function (r) { return r.student === fullName(s); });
    var lines = acc.lines.map(function (l) {
      return "<tr><td>" + esc(l.title) + '</td><td class="num">' + money(l.amount) + '</td><td class="num">' + money(l.paid) + '</td><td class="num">' + (l.due ? money(l.due) : '<span class="muted">—</span>') + "</td></tr>";
    }).join("");
    return '<div class="ds-section"><h3 class="insp-head"><span>Fees · First Term</span>' + chargeTag(acc) + "</h3>" +
      '<div class="mini-wrap"><table class="table tt-grid tt-grid--mini"><thead><tr><th scope="col">Fee</th><th scope="col" class="num">Amount</th><th scope="col" class="num">Paid</th><th scope="col" class="num">Due</th></tr></thead><tbody>' + lines + "</tbody>" +
      '<tfoot><tr><td>Total</td><td class="num">' + money(acc.billed) + '</td><td class="num">' + money(acc.paid) + '</td><td class="num">' + money(acc.due) + "</td></tr></tfoot></table></div></div>" +
      '<div class="ds-section"><h3 class="insp-head"><span>Receipts</span><span class="insp-meta">' + rec.length + " on file</span></h3>" +
      (rec.length ? '<ul class="receipt-list">' + rec.map(function (r) {
        return '<li><span class="mono">' + esc(r.receipt) + '</span><span class="mono muted">' + esc(r.date) + " · " + esc(r.method) + '</span><span class="mono">' + money(r.amount) + "</span></li>";
      }).join("") + "</ul>" : '<p class="lines-empty">No receipts this term yet.</p>') +
      '<div><button type="button" class="btn btn-outline btn-sm" data-act="ds-pay">' + ic("hand-coins", 15) + "Receive payment</button></div></div>";
  }
  function detailStep(d) {
    var ids = route.key === "people/students" ? visibleStudents().map(function (s) { return s.id; }) : students.map(function (s) { return s.id; });
    var i = ids.indexOf(ui.detailId);
    if (i < 0) return;
    var n = ids[Math.max(0, Math.min(ids.length - 1, i + d))];
    if (n === ui.detailId) return;
    ui.detailId = n;
    if (route.key === "people/students") setCursor(n, true);
    renderDetail();
    announce(fullName(findStudent(n)));
  }
  $("#dsTabs").addEventListener("click", function (e) {
    var t = e.target.closest("[role=tab]"); if (!t) return;
    ui.detailTab = t.getAttribute("data-tab"); renderDetail();
  });
  $("#dsTabs").addEventListener("keydown", function (e) {
    var tabs = $$("#dsTabs [role=tab]"), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var n = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n == null) return;
    e.preventDefault();
    ui.detailTab = tabs[n].getAttribute("data-tab");
    renderDetail();
    tabs[n].focus();
  });

  /* =================================================== CREATE / EDIT SHEET */
  var sfTried = false;
  function val(id) { var el = $("#" + id); return el ? String(el.value).trim() : ""; }
  function radioVal(form, name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function setRadio(form, name, v) { $$('input[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === v; }); }
  function parseAmt(v) { var n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return isNaN(n) ? 0 : n; }
  function setErr(id, msg) {
    var el = $("#" + id), err = $("#" + id + "-err");
    if (!el || !err) return !msg;
    if (msg) { err.textContent = msg; err.hidden = false; el.setAttribute("aria-invalid", "true"); }
    else { err.textContent = ""; err.hidden = true; el.removeAttribute("aria-invalid"); }
    return !msg;
  }
  function clearErrors(form) { $$(".field-error", form).forEach(function (e) { e.hidden = true; e.textContent = ""; }); $$("[aria-invalid]", form).forEach(function (e) { e.removeAttribute("aria-invalid"); }); }
  function focusField(id) { var el = $("#" + id); if (!el) return; if (el.classList.contains("seg")) { var r = el.querySelector("input:checked") || el.querySelector("input"); if (r) r.focus(); } else el.focus(); }
  function fillClassOptions(selected) {
    $("#sf-class").innerHTML = '<option value="">Choose a classroom</option>' + D.classrooms.map(function (c) {
      return '<option value="' + esc(c.name) + '"' + (c.name === selected ? " selected" : "") + ">" + esc(c.name) + " · level " + c.level + "</option>";
    }).join("");
  }
  function fillArmOptions(arm) {
    var c = D.classrooms.filter(function (x) { return x.name === val("sf-class"); })[0];
    var sel = $("#sf-arm");
    if (!c) { sel.innerHTML = '<option value="">Choose a classroom first</option>'; sel.disabled = true; return; }
    sel.disabled = false;
    sel.innerHTML = c.arms.map(function (a) { return '<option value="' + esc(a) + '"' + (a === arm ? " selected" : "") + ">" + esc(c.name + " " + a) + "</option>"; }).join("");
  }
  function renderFeeList(admission) {
    var on = defaultFeeIdx(admission || "returning");
    $("#sfFees").innerHTML = FEES.map(function (f, i) {
      return '<label class="fee-row"><input type="checkbox" class="checkbox" name="fee" value="' + i + '"' + (on.indexOf(i) > -1 ? " checked" : "") + ">" +
        '<span><span class="fee-title">' + esc(f.title) + '</span><span class="fee-aud">' + esc(f.type + " · " + f.audience) + "</span></span>" +
        '<span class="fee-amt">' + money(f.amount) + "</span></label>";
    }).join("");
  }
  function sfTotals() {
    var checked = $$('#sfFees input[name="fee"]:checked');
    var assigned = checked.reduce(function (a, c) { return a + FEES[+c.value].amount; }, 0);
    var paying = parseAmt($("#sf-amount").value);
    $("#sfAssigned").textContent = money(assigned);
    $("#sfPaying").textContent = money(paying);
    $("#sfPending").textContent = money(Math.max(0, assigned - paying));
    $("#sfFeeCount").textContent = checked.length + " of " + FEES.length + " applied";
    return { assigned: assigned, paying: paying, idx: checked.map(function (c) { return +c.value; }) };
  }
  function openStudentForm(id) {
    var form = $("#studentForm");
    var s = id ? findStudent(id) : null;
    if ($("#detailSheet").getAttribute("data-open") === "true") SC.close($("#detailSheet"));
    form.reset(); clearErrors(form); sfTried = false;
    delete $("#sf-first").dataset.touched; delete $("#sf-last").dataset.touched;
    ui.editId = s ? s.id : null;
    $("#ssTitle").textContent = s ? "Edit information" : "New student";
    $("#ssEyebrow").textContent = s ? "People / Students / " + s.id : "People / Students / New";
    $("#ssDesc").textContent = s ? "Changes apply to this student’s record." : "Adds a student to 2026/2027 · First Term.";
    $("#ssSubmit").textContent = s ? "Save changes" : "Save student";
    $("#ssFees").hidden = !!s;
    fillClassOptions(s ? s.cls : "");
    fillArmOptions(s ? s.arm : "");
    if (s) {
      $("#sf-first").value = s.first; $("#sf-last").value = s.last; $("#sf-other").value = s.other || "";
      setRadio(form, "gender", s.gender); setRadio(form, "admission", s.admission);
      $("#sf-dob").value = s.dob || "";
      $("#sf-pname").value = s.guardian === "—" ? "" : s.guardian; $("#sf-pphone").value = s.phone === "—" ? "" : s.phone; $("#sf-pphone2").value = s.phone2 || "";
      $("#ssParent").open = true;
    } else {
      $("#ssParent").open = false;
      $("#sf-date").value = TODAY;
    }
    renderFeeList(s ? s.admission : "returning");
    sfTotals();
    openPanel($("#studentSheet"));
  }
  function fieldMsg(id) {
    var form = $("#studentForm");
    switch (id) {
      case "sf-first": return val(id) ? "" : "Enter the student’s first name.";
      case "sf-last": return val(id) ? "" : "Enter the student’s surname.";
      case "sf-gender": return radioVal(form, "gender") ? "" : "Choose Female or Male.";
      case "sf-admission": return radioVal(form, "admission") ? "" : "Choose an admission status for this term.";
      case "sf-class": return val(id) ? "" : "Choose a classroom.";
      case "sf-pphone": var ph = val(id); return ph && !/^\+?[\d\s()-]{7,}$/.test(ph) ? "Use digits only, for example +234 803 412 7781." : "";
      case "sf-amount": if (ui.editId) return ""; var t = sfTotals(); return t.paying > t.assigned ? "Paying now can’t be more than the assigned fees (" + money(t.assigned) + ")." : "";
    }
    return "";
  }
  var SF_FIELDS = ["sf-first", "sf-last", "sf-gender", "sf-admission", "sf-class", "sf-pphone", "sf-amount"];
  function validateStudent(focus) {
    var ok = true, first = null;
    SF_FIELDS.forEach(function (id) { if (!setErr(id, fieldMsg(id))) { ok = false; first = first || id; } });
    if (!ok && first === "sf-pphone") $("#ssParent").open = true;
    if (!ok && focus) focusField(first);
    return ok;
  }
  function nextId() {
    var max = 0;
    students.concat(D.students).forEach(function (s) { var n = parseInt(s.id.split("/").pop(), 10); if (n > max) max = n; });
    return "KWA/2026/" + String(max + 1).padStart(4, "0");
  }
  function nextReceipt() {
    var max = 0;
    payments.forEach(function (p) { var n = parseInt(p.receipt.split("-").pop(), 10); if (n > max) max = n; });
    return "RCP-26-" + String(max + 1).padStart(5, "0");
  }
  function payerName(s) { return String(s.guardian || "").replace(/^(Mr|Mrs|Ms|Miss|Dr|Alh|Hajiya|Mal|Chief)\.?\s+/i, "") || fullName(s); }
  function addReceipt(s, amount, method, dateIso, allocation) {
    var r = { receipt: nextReceipt(), date: fmtShort(dateIso), student: fullName(s), cls: s.cls + " " + s.arm, payer: s.guardian && s.guardian !== "—" ? payerName(s) : fullName(s), method: method, amount: amount, allocation: allocation, status: "paid", by: "Admin · Aisha" };
    payments.unshift(r);
    fin.collected += amount;
    if (dateIso === TODAY) fin.today += amount;
    return r;
  }
  function saveStudent() {
    sfTried = true;
    if (!validateStudent(true)) { announce("Check the highlighted fields."); return; }
    var form = $("#studentForm");
    var data = {
      first: val("sf-first"), last: val("sf-last"), other: val("sf-other"),
      gender: radioVal(form, "gender"), admission: radioVal(form, "admission"), dob: val("sf-dob"),
      cls: val("sf-class"), arm: val("sf-arm"),
      guardian: val("sf-pname") || "—", phone: val("sf-pphone") || "—", phone2: val("sf-pphone2"),
    };
    var s;
    if (ui.editId) {
      s = findStudent(ui.editId);
      Object.assign(s, data);
      SC.close($("#studentSheet"));
      flash(s.id);
      afterStudentChange(s);
      SC.toast("Changes saved", fullName(s) + " · " + s.id, "circle-check");
      return;
    }
    var t = sfTotals();
    s = Object.assign({ id: nextId(), status: "enrolled", fees: t.idx, paid: t.paying, billed: t.assigned }, data);
    if (!s.arm) s.arm = (D.classrooms.filter(function (c) { return c.name === s.cls; })[0] || { arms: ["A"] }).arms[0];
    students.unshift(s);
    fin.billed += t.assigned;
    var receipt = null;
    if (t.paying > 0) {
      var alloc = account(s).lines.filter(function (l) { return l.paid > 0; }).map(function (l) { return l.title; });
      receipt = addReceipt(s, t.paying, radioVal(form, "method") || "Transfer", val("sf-date") || TODAY, alloc.length > 2 ? alloc.slice(0, 2).join(", ") + " +" + (alloc.length - 2) : alloc.join(", "));
    }
    SC.close($("#studentSheet"));
    flash(s.id);
    afterStudentChange(s);
    SC.toast("Student saved", fullName(s) + " · " + s.id + " · " + s.cls + " " + s.arm + (receipt ? " · " + receipt.receipt : ""), "user-check");
  }
  function afterStudentChange(s) {
    if (route.key === "people/students") {
      renderStudentStats(); renderStudentRows(); renderSubnav();
      if (rowEl(s.id)) setCursor(s.id, true);
      else announce(fullName(s) + " saved but hidden by the current filters.");
    } else {
      renderSubnav(); renderPage();
    }
    if ($("#detailSheet").getAttribute("data-open") === "true") renderDetail();
  }
  $("#studentForm").addEventListener("submit", function (e) { e.preventDefault(); saveStudent(); });
  $("#studentForm").addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "sf-amount") { var n = parseAmt(t.value); t.value = n ? int(n) : ""; }
    if (t.name === "fee" || t.id === "sf-amount") sfTotals();
    if (sfTried) validateStudent(false);
    else {
      var fid = t.closest(".seg") ? t.closest(".seg").id : t.id;
      if (fid && $("#" + fid) && $("#" + fid).getAttribute("aria-invalid") === "true") setErr(fid, fieldMsg(fid));
    }
  });
  $("#studentForm").addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "sf-class") fillArmOptions("");
    if (t.name === "admission") {
      var adm = t.value;
      $$('#sfFees input[name="fee"]').forEach(function (c) { var f = FEES[+c.value]; if (f.audience === "New students") c.checked = adm === "new"; });
      sfTotals();
    }
    if (t.name === "fee") sfTotals();
    if (sfTried) validateStudent(false);
  });
  $("#studentForm").addEventListener("focusout", function (e) {
    var t = e.target;
    if ((t.id === "sf-first" || t.id === "sf-last") && t.dataset.touched) setErr(t.id, fieldMsg(t.id));
  });
  $("#studentForm").addEventListener("keydown", function (e) { if (e.target.id === "sf-first" || e.target.id === "sf-last") e.target.dataset.touched = "1"; });

  /* ===================================================== RECEIVE PAYMENT */
  var pay = { studentId: null, active: -1, opts: [] };
  function openPay(studentId) {
    var form = $("#payForm");
    form.reset(); clearErrors(form);
    pay.studentId = null;
    $("#ps-date").value = TODAY;
    $("#ps-term").value = "2026/2027|First Term";
    closeCombo();
    if (studentId) pickStudent(studentId, true); else { $("#ps-student").value = ""; renderPayStudent(); renderPayLines(); }
    if ($("#detailSheet").getAttribute("data-open") === "true") SC.close($("#detailSheet"));
    openPanel($("#paySheet"), { onClose: function () { if (location.hash.slice(1) === "finance/receive-payment") navigate("finance/collections"); } });
    if (studentId) setTimeout(function () { var a = $("#ps-amount"); if (a && $("#paySheet").getAttribute("data-open") === "true") a.focus({ preventScroll: true }); }, 60);
  }
  function comboMatches(q) {
    q = q.trim().toLowerCase();
    return students.filter(function (s) { return !q || (fullName(s) + " " + s.id + " " + s.cls + " " + s.arm).toLowerCase().indexOf(q) > -1; }).slice(0, 8);
  }
  function renderCombo() {
    var input = $("#ps-student"), list = $("#psList");
    pay.opts = comboMatches(input.value);
    if (pay.active >= pay.opts.length) pay.active = pay.opts.length - 1;
    list.innerHTML = pay.opts.length ? pay.opts.map(function (s, i) {
      var acc = account(s);
      return '<li class="combo-opt" role="option" id="ps-opt-' + i + '" data-id="' + esc(s.id) + '" aria-selected="' + (i === pay.active) + '">' +
        '<span class="avatar avatar-xs" data-tint="' + tint(s) + '" aria-hidden="true">' + esc(initials(s)) + "</span>" +
        "<span>" + hl(fullName(s), input.value) + ' <span class="mono">' + esc(s.id) + " · " + esc(s.cls + " " + s.arm) + "</span></span>" +
        '<span class="mono">' + (acc.due ? money(acc.due) + " due" : "Paid") + "</span></li>";
    }).join("") : '<li class="combo-empty" role="presentation">No student matches “' + esc(input.value) + "”.</li>";
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (pay.active > -1) { input.setAttribute("aria-activedescendant", "ps-opt-" + pay.active); var a = $("#ps-opt-" + pay.active); if (a) a.scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  }
  function closeCombo() { $("#psList").hidden = true; $("#ps-student").setAttribute("aria-expanded", "false"); $("#ps-student").removeAttribute("aria-activedescendant"); pay.active = -1; }
  function pickStudent(id, quiet) {
    var s = findStudent(id); if (!s) return;
    pay.studentId = id;
    $("#ps-student").value = fullName(s);
    closeCombo();
    setErr("ps-student", "");
    renderPayStudent(); renderPayLines();
    if (!quiet) $("#ps-amount").focus();
  }
  function renderPayStudent() {
    var box = $("#psPicked"), s = pay.studentId && findStudent(pay.studentId);
    if (!s) { box.hidden = true; box.innerHTML = ""; return; }
    var acc = account(s);
    box.hidden = false;
    box.innerHTML = "<div><dt>Student ID</dt><dd>" + esc(s.id) + "</dd></div><div><dt>Class</dt><dd>" + esc(s.cls + " " + s.arm) + "</dd></div><div><dt>Balance</dt><dd>" + money(acc.due) + "</dd></div>";
  }
  function payTermIsCurrent() { return $("#ps-term").value === "2026/2027|First Term"; }
  function payDue() { var s = pay.studentId && findStudent(pay.studentId); return s && payTermIsCurrent() ? account(s).due : 0; }
  function renderPayLines() {
    var wrap = $("#psLines"), s = pay.studentId && findStudent(pay.studentId);
    $("#psCurrent").hidden = !payTermIsCurrent();
    var termLabel = $("#ps-term").selectedOptions[0].textContent;
    if (!s) { wrap.innerHTML = '<p class="lines-empty">Choose a student to see what’s due.</p>'; $("#psDue").textContent = ""; return; }
    if (!payTermIsCurrent()) { wrap.innerHTML = '<p class="lines-empty">Nothing is billed for ' + esc(termLabel) + " yet.</p>"; $("#psDue").textContent = "₦0 due"; return; }
    var acc = account(s), lines = acc.lines.filter(function (l) { return l.due > 0; });
    $("#psDue").textContent = money(acc.due) + " due";
    if (!lines.length) { wrap.innerHTML = '<p class="lines-empty">Nothing outstanding for First Term.</p>'; return; }
    var left = parseAmt($("#ps-amount").value), allocated = 0;
    var rows = lines.map(function (l) {
      var a = Math.min(left, l.due); left -= a; allocated += a;
      return "<tr><td>" + esc(l.title) + '</td><td class="num">' + money(l.due) + '</td><td class="num">' + (a ? money(a) : '<span class="muted">—</span>') + "</td></tr>";
    }).join("");
    wrap.innerHTML = '<div class="mini-wrap"><table class="table tt-grid tt-grid--mini"><thead><tr><th scope="col">Fee</th><th scope="col" class="num">Amount due</th><th scope="col" class="num">Paying</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + money(acc.due) + '</td><td class="num">' + money(allocated) + "</td></tr></tfoot></table></div>";
  }
  function validatePay(focus) {
    var ok = true, first = null;
    function chk(id, msg) { if (!setErr(id, msg)) { ok = false; first = first || id; } }
    chk("ps-student", pay.studentId ? "" : "Choose a student from the list.");
    var amt = parseAmt($("#ps-amount").value), due = payDue();
    var msg = "";
    if (!amt) msg = "Enter the amount being paid.";
    else if (pay.studentId && !payTermIsCurrent()) msg = "Nothing is billed for this term yet, so there is nothing to pay against.";
    else if (pay.studentId && amt > due) msg = due ? "That’s more than the outstanding balance of " + money(due) + "." : "This student has nothing outstanding this term.";
    chk("ps-amount", msg);
    if (!ok && focus) focusField(first);
    return ok;
  }
  $("#payForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validatePay(true)) { announce("Check the highlighted fields."); return; }
    var form = $("#payForm"), s = findStudent(pay.studentId), amt = parseAmt($("#ps-amount").value);
    var before = account(s);
    s.paid = (s.paid || 0) + amt;
    var after = account(s);
    var alloc = after.lines.filter(function (l, i) { return l.paid > before.lines[i].paid; }).map(function (l) { return l.title; });
    var allocation = after.due === 0 && alloc.length === after.lines.length ? "All term fees" : alloc.length > 2 ? alloc.slice(0, 2).join(", ") + " +" + (alloc.length - 2) : alloc.join(", ");
    var r = addReceipt(s, amt, radioVal(form, "method") || "Transfer", val("ps-date") || TODAY, allocation);
    flash(r.receipt);
    if (route.key === "finance/collections" || route.key === "finance/receive-payment") { ui.pendingCursor = r.receipt; ui.rq = ""; ui.rfilters = []; }
    SC.close($("#paySheet"));
    if (route.key !== "finance/receive-payment") { if (ui.pendingCursor) { ui.cursor = ui.pendingCursor; ui.pendingCursor = null; } renderPage(); }
    SC.toast("Payment confirmed", money(amt) + " · " + r.receipt + " · " + fullName(s), "circle-check");
  });
  $("#ps-student").addEventListener("input", function () { pay.studentId = null; pay.active = 0; renderPayStudent(); renderPayLines(); renderCombo(); });
  $("#ps-student").addEventListener("keydown", function (e) {
    var open = !$("#psList").hidden;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { renderCombo(); }
      var n = pay.opts.length; if (!n) return;
      pay.active = e.key === "ArrowDown" ? (pay.active + 1) % n : (pay.active - 1 + n) % n;
      renderCombo();
    } else if (e.key === "Enter" && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (open && pay.opts[pay.active < 0 ? 0 : pay.active]) pickStudent(pay.opts[pay.active < 0 ? 0 : pay.active].id);
    } else if (e.key === "Escape" && open) {
      e.preventDefault(); e.stopPropagation(); closeCombo();
    }
  });
  $("#ps-student").addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== $("#ps-student")) closeCombo(); }, 120); });
  $("#psList").addEventListener("mousedown", function (e) { e.preventDefault(); });
  $("#psList").addEventListener("click", function (e) { var o = e.target.closest("[data-id]"); if (o) pickStudent(o.getAttribute("data-id")); });
  $("#payForm").addEventListener("input", function (e) {
    if (e.target.id === "ps-amount") { var n = parseAmt(e.target.value); e.target.value = n ? int(n) : ""; renderPayLines(); if (e.target.getAttribute("aria-invalid")) validatePay(false); }
  });
  $("#ps-term").addEventListener("change", function () { renderPayLines(); if ($("#ps-amount").getAttribute("aria-invalid")) validatePay(false); });

  /* Enter moves to the next field inside sheet forms (no accidental submits); ⌘↵ submits. */
  function enterAdvances(e) {
    if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t.matches("input") || t.type === "checkbox" || t.type === "radio" || t.id === "ps-student") return;
    e.preventDefault();
    var form = t.form;
    var fields = $$("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea", form).filter(function (f) {
      if (f.type === "radio" && !f.checked && form.querySelector('input[name="' + f.name + '"]:checked')) return false;
      return f.offsetParent !== null;
    });
    var i = fields.indexOf(t);
    if (fields[i + 1]) fields[i + 1].focus();
  }
  $("#studentForm").addEventListener("keydown", enterAdvances);
  $("#payForm").addEventListener("keydown", enterAdvances);

  /* ============================================================= CONFIRM */
  var confirmRun = null;
  function confirmAction(o) {
    var d = $("#confirmDialog");
    d.classList.toggle("is-destructive", o.tone === "destructive");
    $("#cdEyebrow").textContent = o.eyebrow;
    $("#cdTitle").textContent = o.title;
    $("#cdDesc").textContent = o.desc;
    $("#cdTable tbody").innerHTML = o.rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("");
    var b = $("#cdConfirm");
    b.textContent = o.confirm;
    b.className = "btn btn-sm " + (o.tone === "destructive" ? "btn-destructive" : "btn-default");
    confirmRun = o.run;
    openPanel(d, { onClose: function () { confirmRun = null; } });
  }
  $("#cdConfirm").addEventListener("click", function () {
    var r = confirmRun;
    confirmRun = null;
    SC.close($("#confirmDialog"));
    if (r) r();
  });

  /* ===================================================== COMMAND PALETTE */
  var pal = { items: [], active: 0 };
  function paletteSource() {
    var actions = [
      { group: "Actions", label: "New student", icon: "user-plus", kbd: ["N"], run: function () { openStudentForm(); } },
      { group: "Actions", label: "Receive payment", icon: "hand-coins", kbd: ["R"], run: function () { openPay(); } },
      { group: "Actions", label: "Switch term", icon: "calendar-range", kbd: ["T"], run: function () { openTermMenu($("#termBtn")); } },
      { group: "Actions", label: "Switch light / dark theme", icon: "moon", run: function () { SC.theme.toggle(); } },
      { group: "Actions", label: "Keyboard shortcuts", icon: "keyboard", kbd: ["?"], run: openShortcuts },
    ];
    var pages = ORDER.map(function (k) {
      var r = ROUTES[k];
      return { group: "Pages", key: k, label: r.label, meta: r.module + (r.section ? " › " + r.section : ""), icon: r.icon, run: function () { navigate(k); } };
    });
    var studs = students.map(function (s) {
      return { group: "Students", label: fullName(s), meta: s.id + " · " + s.cls + " " + s.arm, avatar: s, run: function () { openDetail(s.id); } };
    });
    var recs = payments.map(function (p) {
      return { group: "Receipts", label: p.receipt, mono: true, meta: p.student + " · " + money(p.amount) + " · " + p.date, icon: "receipt", run: function () { gotoReceipt(p.receipt); } };
    });
    return { actions: actions, pages: pages, students: studs, receipts: recs };
  }
  function renderPalette() {
    var raw = $("#cmdkInput").value.trim().toLowerCase();
    var tokens = raw.split(/\s+/).filter(Boolean);
    var src = paletteSource(), out = [];
    function matches(it) { var hay = (it.label + " " + (it.meta || "")).toLowerCase(); return tokens.every(function (t) { return hay.indexOf(t) > -1; }); }
    function rank(list) { return list.filter(matches).sort(function (a, b) { var x = a.label.toLowerCase().indexOf(tokens[0]) === 0 ? 0 : 1, y = b.label.toLowerCase().indexOf(tokens[0]) === 0 ? 0 : 1; return x - y; }); }
    if (!tokens.length) {
      var featured = ["overview/dashboard", "people/students", "people/enrollment", "finance/collections", "finance/student-balances", "academics/classes"];
      out = src.actions.concat(src.pages.filter(function (p) { return featured.indexOf(p.key) > -1; }), src.students.slice(0, 4), src.receipts.slice(0, 3));
    } else {
      out = rank(src.actions).slice(0, 4).concat(rank(src.students).slice(0, 6), rank(src.receipts).slice(0, 5), rank(src.pages).slice(0, 8));
    }
    pal.items = out;
    if (pal.active >= out.length) pal.active = 0;
    var q = tokens[0] || "", html = "", last = null;
    out.forEach(function (it, i) {
      if (it.group !== last) {
        if (last) html += "</div>";
        html += '<div role="group" aria-labelledby="cg-' + i + '"><p class="cmdk-group-label" id="cg-' + i + '">' + esc(it.group) + "</p>";
        last = it.group;
      }
      var lead = it.avatar ? '<span class="avatar avatar-xs" data-tint="' + tint(it.avatar) + '" aria-hidden="true">' + esc(initials(it.avatar)) + "</span>" : ic(it.icon || "arrow-right", 16);
      html += '<div class="cmdk-item" role="option" id="cmdk-opt-' + i + '" data-i="' + i + '" aria-selected="' + (i === pal.active) + '">' + lead +
        '<span class="cmdk-label' + (it.mono ? " mono" : "") + '">' + hl(it.label, q) + "</span>" +
        '<span class="cmdk-meta">' + hl(it.meta || "", q) + "</span>" +
        (it.kbd ? kbd(it.kbd) : '<span class="cmdk-enter" aria-hidden="true">↵</span>') + "</div>";
    });
    if (last) html += "</div>";
    if (!out.length) html = '<div class="cmdk-empty"><p class="eyebrow">No matches</p><p>Nothing matches “' + esc(raw) + "”. Try a student’s name, a Student ID like KWA/2026/0142, or a receipt number.</p></div>";
    $("#cmdkList").innerHTML = html;
    $("#cmdkCount").textContent = out.length + (out.length === 1 ? " result" : " results");
    syncPalette();
  }
  function syncPalette() {
    $$("#cmdkList .cmdk-item").forEach(function (el) { el.setAttribute("aria-selected", String(+el.getAttribute("data-i") === pal.active)); });
    var a = $("#cmdk-opt-" + pal.active);
    if (a) { $("#cmdkInput").setAttribute("aria-activedescendant", a.id); a.scrollIntoView({ block: "nearest" }); }
    else $("#cmdkInput").removeAttribute("aria-activedescendant");
  }
  function runPalette(i) {
    var it = pal.items[i]; if (!it) return;
    SC.close($("#cmdk"));
    setTimeout(function () { it.run(); }, 0);
  }
  function openPalette() {
    var d = $("#cmdk");
    if (d.getAttribute("data-open") === "true") { $("#cmdkInput").focus(); return; }
    $("#cmdkInput").value = "";
    pal.active = 0;
    renderPalette();
    openPanel(d);
  }
  $("#cmdkInput").addEventListener("input", function () { pal.active = 0; renderPalette(); });
  $("#cmdkInput").addEventListener("keydown", function (e) {
    var n = pal.items.length;
    if (e.key === "ArrowDown") { e.preventDefault(); if (n) { pal.active = (pal.active + 1) % n; syncPalette(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (n) { pal.active = (pal.active - 1 + n) % n; syncPalette(); } }
    else if (e.key === "Home" && n) { e.preventDefault(); pal.active = 0; syncPalette(); }
    else if (e.key === "End" && n) { e.preventDefault(); pal.active = n - 1; syncPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); runPalette(pal.active); }
  });
  $("#cmdkList").addEventListener("mousemove", function (e) {
    var o = e.target.closest("[data-i]"); if (!o) return;
    var i = +o.getAttribute("data-i"); if (i !== pal.active) { pal.active = i; syncPalette(); }
  });
  $("#cmdkList").addEventListener("click", function (e) { var o = e.target.closest("[data-i]"); if (o) runPalette(+o.getAttribute("data-i")); });

  /* ===================================================== SHORTCUTS DIALOG */
  function openShortcuts() {
    var rows = [
      ["Anywhere", null],
      [["mod", "K"], "Find anything"], [["/"], "Search this table"], [["N"], "New student"], [["R"], "Receive payment"], [["T"], "Switch term"], [["mod", "B"], "Show or hide section navigation"], [["?"], "This list"],
      ["Tables", null],
      [["↑", "↓"], "Move the cursor row (J and K work too)"], [["X"], "Select the cursor row"], [["Shift", "click"], "Select a range"], [["↵"], "Open the cursor row"], [["Esc"], "Clear the selection"],
      ["Sheets", null],
      [["mod", "↵"], "Save or confirm"], [["↵"], "Next field"], [["J", "K"], "Next / previous student"], [["E"], "Edit the open student"], [["Esc"], "Close"],
    ];
    $("#keysTable").innerHTML = "<tbody>" + rows.map(function (r) {
      if (!r[1]) return '<tr><th colspan="2" scope="colgroup">' + esc(r[0]) + "</th></tr>";
      return "<tr><td>" + kbd(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>";
    }).join("") + "</tbody>";
    openPanel($("#keysDialog"));
  }

  /* ============================================================ TOP BAR */
  function termCode(t) { return "T" + (["First Term", "Second Term", "Third Term"].indexOf(t) + 1); }
  function updateTermChip() {
    var cur = isCurrentTerm();
    var sess = ui.term.session.replace(/^20(\d\d)\/20(\d\d)$/, "$1/$2");
    $("#termChipText").innerHTML = '<span class="term-session">' + esc(sess) + " · </span>" + termCode(ui.term.term) + (cur ? " · W4" : "");
    $("#termBtn").setAttribute("aria-label", "Term: " + ui.term.session + " " + ui.term.term + (cur ? ", week 4 of 13" : "") + ". Change term");
    $("#termBtn").classList.toggle("is-other", !cur);
  }
  function setTerm(session, term) {
    ui.term = { session: session, term: term };
    updateTermChip();
    renderPage();
    if (isCurrentTerm()) SC.toast("Back to the current term", session + " · " + term + " · week 4 of 13", "calendar-check");
    else SC.toast("Viewing " + session + " · " + term, "Switch back from the term chip or press T.", "calendar-range");
  }
  function openTermMenu(trigger) {
    var items = [];
    D.sessions.forEach(function (ses) {
      items.push({ heading: ses.title, meta: ses.current ? "Current session" : "" });
      ses.terms.forEach(function (t) {
        var isNow = ses.current && t === D.session.term;
        items.push({ label: t, role: "menuitemradio", checked: ui.term.session === ses.title && ui.term.term === t, badge: isNow ? "Current" : "", meta: isNow ? "W4/13" : "", run: function () { setTerm(ses.title, t); } });
      });
    });
    openMenu(trigger, { label: "Switch term", items: items, align: "end", width: 264 });
  }
  var NOTIFS = [
    { task: 0, time: "08:42" },
    { task: 1, time: "07:58" },
    { task: 2, time: "Yesterday" },
  ];
  function openNotifs(trigger) {
    var items = NOTIFS.map(function (n) { return { run: function () { runTask(n.task); } }; });
    items.push({ keepOpen: true, run: function () { ui.unread = 0; updateBadge(); rerenderPop(); var b = popEl.querySelector("[data-i]"); if (b) b.focus(); announce("All notifications marked as read"); } });
    openMenu(trigger, {
      role: "dialog", label: "Notifications", align: "end", width: 352, items: items,
      render: function () {
        return '<div class="pop-head"><span class="pop-title">Notifications · ' + ui.unread + ' new</span>' +
          (ui.unread ? '<button type="button" class="btn btn-ghost btn-xs" data-i="' + NOTIFS.length + '">Mark all as read</button>' : "") + "</div>" +
          NOTIFS.map(function (n, i) {
            var t = D.tasks[n.task];
            return '<button type="button" class="notif' + (ui.unread ? " is-unread" : "") + '" data-i="' + i + '"><span class="notif-ico">' + ic(t.icon, 15) + '</span><span class="notif-text">' + esc(t.text) + '</span><span class="notif-time">' + esc(n.time) + '</span><span class="notif-meta">' + esc(t.meta) + "</span></button>";
          }).join("");
      },
    });
  }
  function updateBadge() {
    var b = $("#notifBadge");
    b.hidden = !ui.unread; b.textContent = ui.unread;
    $("#notifBtn").setAttribute("aria-label", "Notifications" + (ui.unread ? ", " + ui.unread + " unread" : ""));
  }
  function openUserMenu(trigger) {
    var dark = document.documentElement.classList.contains("dark");
    var items = [
      { label: "Dark theme", role: "menuitemcheckbox", checked: dark, keepOpen: true, run: function () { SC.theme.toggle(); } },
      { label: "Keyboard shortcuts", icon: "keyboard", kbd: ["?"], run: openShortcuts },
      { sep: true },
      { label: "Log out", icon: "log-out", run: function () { SC.toast("Log out isn’t simulated", "Preview · nothing is sent", "log-out"); } },
    ];
    openMenu(trigger, {
      label: "Account", align: "end", width: 280, items: items,
      render: function () {
        var u = D.user, isDark = document.documentElement.classList.contains("dark");
        items[0].checked = isDark;
        return '<div class="pop-user" role="presentation"><span class="avatar" aria-hidden="true">' + esc(u.initials) + "</span><div><strong>" + esc(u.name) + '</strong><span class="mono">' + esc(u.email) + "</span></div></div>" +
          '<div class="pop-meta" role="presentation"><span class="badge badge-info">' + esc(u.role) + "</span><span>" + esc(D.school.subdomain) + "</span></div>" +
          '<div class="menu-sep" role="separator"></div>' +
          '<button type="button" class="menu-item" role="menuitemcheckbox" aria-checked="' + isDark + '" data-i="0" tabindex="-1">' + ic(isDark ? "moon" : "sun", 15) + '<span class="mi-label">Dark theme</span><span class="menu-shortcut">' + (isDark ? "On" : "Off") + "</span></button>" +
          menuHTML(items).replace(/^<button[^]*?<\/button>/, "");
      },
    });
  }
  document.addEventListener("sc:theme", function () {
    if (pop && pop.cfg.label === "Account") { rerenderPop(); var b = popEl.querySelector('[data-i="0"]'); if (b) b.focus(); }
  });
  function runTask(i) {
    if (i === 0) { ui.filters = [{ key: "class", value: "JSS 2" }, { key: "status", value: "not-enrolled" }]; ui.q = ""; navigate("people/students"); }
    else if (i === 2) { ui.rfilters = []; ui.rq = ""; gotoReceipt("RCP-26-00410"); }
    else if (i === 3) navigate("academics/assessment-recording");
    else SC.toast("Attendance isn’t part of this preview", "4 classes still need to mark today’s register.", "clipboard-check");
  }

  /* ============================================================== EVENTS */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-act]");
    if (a) {
      var act = a.getAttribute("data-act");
      switch (act) {
        case "toggle-subnav": toggleSubnav(); return;
        case "new-student": openStudentForm(); return;
        case "receive": openPay(); return;
        case "palette": openPalette(); return;
        case "term": openTermMenu($("#termBtn")); return;
        case "keys": openShortcuts(); return;
        case "import": SC.toast("Import isn’t part of this preview", "This preview covers the Students list, sheets and dialogs.", "upload"); return;
        case "approvals": ui.filters = [{ key: "class", value: "JSS 2" }, { key: "status", value: "not-enrolled" }]; ui.q = ""; renderPage(); announce("Showing students waiting for approval"); return;
        case "add-filter": openFilterMenu(a); return;
        case "add-rfilter": openRFilterMenu(a); return;
        case "rm-filter": {
          var k = a.getAttribute("data-k");
          ui.filters = ui.filters.filter(function (f) { return f.key !== k; });
          renderChips(); renderStudentRows();
          var nx = $("#qchips .qchip-x") || $('[data-act="add-filter"]'); if (nx) nx.focus();
          announce("Filter removed"); return;
        }
        case "rm-rfilter": {
          var rk = a.getAttribute("data-k");
          ui.rfilters = ui.rfilters.filter(function (f) { return f.key !== rk; });
          renderRChips(); renderReceiptRows();
          var rn = $("#rchips .qchip-x") || $('[data-act="add-rfilter"]'); if (rn) rn.focus();
          announce("Filter removed"); return;
        }
        case "clear-filters": ui.filters = []; ui.q = ""; var si = $("#studentSearch"); if (si) si.value = ""; renderChips(); renderStudentRows(); if (si) si.focus(); return;
        case "clear-rfilters": ui.rfilters = []; ui.rq = ""; var ri = $("#receiptSearch"); if (ri) ri.value = ""; renderRChips(); renderReceiptRows(); if (ri) ri.focus(); return;
        case "group": ui.group = !ui.group; a.setAttribute("aria-pressed", String(ui.group)); renderStudentRows(); announce(ui.group ? "Grouped by arm" : "Grouping off"); return;
        case "open": {
          var tr = a.closest("tr[data-id]"); if (!tr) return;
          var id = tr.getAttribute("data-id");
          setCursor(id, false);
          if (route.key === "people/students") openDetail(id); else openReceipt(id);
          return;
        }
        case "row-menu": openRowMenu(a.closest("tr").getAttribute("data-id"), a); return;
        case "bulk-export": {
          var n = Object.keys(ui.selected).length;
          SC.toast("CSV ready · " + n + (n === 1 ? " student" : " students"), "Preview · no file is downloaded", "download"); return;
        }
        case "bulk-admission": {
          var ids = Object.keys(ui.selected);
          openMenu(a, {
            label: "Set admission status", width: 240,
            items: [{ heading: "Admission · First Term" }].concat(["new", "returning", "unclassified"].map(function (v) {
              return { label: ADM[v][0], role: "menuitem", run: function () { ids.forEach(function (id) { var s = findStudent(id); if (s) s.admission = v; }); refreshStudents(); SC.toast("Admission status updated", ids.length + (ids.length === 1 ? " student · " : " students · ") + ADM[v][0], "tag"); } };
            })),
          });
          return;
        }
        case "bulk-move": {
          var mids = Object.keys(ui.selected), items = [];
          D.classrooms.forEach(function (c) {
            items.push({ heading: c.name, meta: c.students + " students" });
            c.arms.forEach(function (arm) {
              items.push({ label: c.name + " " + arm, run: function () { mids.forEach(function (id) { var s = findStudent(id); if (s) { s.cls = c.name; s.arm = arm; } }); refreshStudents(); SC.toast("Moved to " + c.name + " " + arm, mids.length + (mids.length === 1 ? " student" : " students") + (ui.filters.some(function (f) { return f.key === "class"; }) ? " · hidden by the class filter" : ""), "arrow-right"); } });
            });
          });
          openMenu(a, { label: "Move class", width: 240, items: items });
          return;
        }
        case "bulk-remove": confirmRemove(Object.keys(ui.selected)); return;
        case "bulk-clear": clearSelection(); return;
        case "term-current": setTerm(D.session.title, D.session.term); return;
        case "export-receipts": SC.toast("CSV ready · " + payments.filter(matchReceipt).length + " receipts", "Preview · no file is downloaded", "download"); return;
        case "task": runTask(+a.getAttribute("data-i")); return;
        case "ds-edit": openStudentForm(ui.detailId); return;
        case "ds-pay": openPay(ui.detailId); return;
        case "ps-full": {
          if (!pay.studentId) { setErr("ps-student", "Choose a student from the list."); focusField("ps-student"); return; }
          var due = payDue(); $("#ps-amount").value = due ? int(due) : ""; renderPayLines(); validatePay(false); $("#ps-amount").focus(); return;
        }
      }
      return;
    }
    // checkbox selection (click carries shiftKey for range select)
    var cb = e.target.closest("#rows input[data-sel]");
    if (cb) { toggleSel(cb.closest("tr").getAttribute("data-id"), cb.checked, e.shiftKey); return; }
    var gcb = e.target.closest("#rows input[data-sel-group]");
    if (gcb) {
      var g = gcb.closest("tr").getAttribute("data-group");
      visibleStudents().forEach(function (s) { if (s.cls + " " + s.arm === g) { if (gcb.checked) ui.selected[s.id] = true; else delete ui.selected[s.id]; } });
      syncStudentRows(); return;
    }
    if (e.target.id === "selAll") {
      var on = e.target.checked;
      visibleStudents().forEach(function (s) { if (on) ui.selected[s.id] = true; else delete ui.selected[s.id]; });
      syncStudentRows(); return;
    }
    // row click → open
    var row = e.target.closest("#rows tr[data-id]");
    if (row && !e.target.closest("button, input, a, label")) {
      var rid = row.getAttribute("data-id");
      setCursor(rid, false);
      if (route.key === "people/students") openDetail(rid); else openReceipt(rid);
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "studentSearch") { ui.q = e.target.value; renderStudentRows(); }
    else if (e.target.id === "receiptSearch") { ui.rq = e.target.value; renderReceiptRows(); }
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if ((t.id === "studentSearch" || t.id === "receiptSearch") && !e.metaKey && !e.ctrlKey) {
      if (e.key === "Enter") {
        var m = t.value.trim().match(/^([a-z]+):\s*(.+)$/i);
        if (m) {
          var ok = t.id === "studentSearch" ? addFilter(m[1], m[2]) : addRFilter(m[1], m[2]);
          if (ok) { e.preventDefault(); t.value = ""; if (t.id === "studentSearch") { ui.q = ""; renderStudentRows(); } else { ui.rq = ""; renderReceiptRows(); } }
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault(); $("#gridPane").focus({ preventScroll: true }); moveCursor(1);
      } else if (e.key === "Escape" && t.value) {
        e.preventDefault(); t.value = ""; t.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (e.key === "Escape") { t.blur(); $("#gridPane").focus({ preventScroll: true }); }
    }
  });
  $("#modselect").addEventListener("change", function (e) { navigate(e.target.value); });
  $(".skip-link").addEventListener("click", function (e) { e.preventDefault(); var h = $("#pageTitle") || $("#main"); h.focus(); });
  $("#searchBtn").addEventListener("click", openPalette);
  $("#termBtn").addEventListener("click", function (e) { openTermMenu(e.currentTarget); });
  $("#notifBtn").addEventListener("click", function (e) { openNotifs(e.currentTarget); });
  $("#userBtn").addEventListener("click", function (e) { openUserMenu(e.currentTarget); });
  $("#assistantBtn").addEventListener("click", function () { navigate("overview/assistant"); });

  /* Global keyboard map */
  document.addEventListener("keydown", function (e) {
    var t = e.target, mod = e.metaKey || e.ctrlKey, k = e.key;
    if (mod && (k === "k" || k === "K")) { e.preventDefault(); openPalette(); return; }
    var top = topPanel();
    if (top) {
      if (mod && k === "Enter") {
        if (top.id === "studentSheet") { e.preventDefault(); var f = $("#studentForm"); if (f.requestSubmit) f.requestSubmit(); else saveStudent(); }
        else if (top.id === "paySheet") { e.preventDefault(); var pf = $("#payForm"); if (pf.requestSubmit) pf.requestSubmit(); else pf.dispatchEvent(new Event("submit", { cancelable: true })); }
        else if (top.id === "confirmDialog") { e.preventDefault(); $("#cdConfirm").click(); }
        return;
      }
      if (top.id === "detailSheet" && !mod && !e.altKey && !isTyping(t) && !pop) {
        if (k === "j" || k === "J") { e.preventDefault(); detailStep(1); }
        else if (k === "k" || k === "K") { e.preventDefault(); detailStep(-1); }
        else if (k === "e" || k === "E") { e.preventDefault(); openStudentForm(ui.detailId); }
      }
      return;
    }
    if (mod && (k === "b" || k === "B")) { e.preventDefault(); toggleSubnav(); return; }
    if (mod || e.altKey || pop || isTyping(t)) return;
    var onTable = route.key === "people/students" || route.key === "finance/collections" || route.key === "finance/receive-payment";
    var main = $("#main");
    var neutral = t === document.body || t === document.documentElement || t === main || (main.contains(t) && !t.closest("a, button, [role=tab]")) || !!t.closest(".grid-pane");
    if (k === "/") { e.preventDefault(); var s = $("#studentSearch") || $("#receiptSearch"); if (s) { s.focus(); s.select(); } else openPalette(); return; }
    if (k === "?") { e.preventDefault(); openShortcuts(); return; }
    if (k === "n" || k === "N") { e.preventDefault(); openStudentForm(); return; }
    if (k === "r" || k === "R") { e.preventDefault(); openPay(); return; }
    if (k === "t" || k === "T") { e.preventDefault(); openTermMenu($("#termBtn")); return; }
    if (!onTable) return;
    if ((k === "ArrowDown" || k === "j" || k === "J") && (neutral || k !== "ArrowDown")) { e.preventDefault(); moveCursor(1); return; }
    if ((k === "ArrowUp" || k === "k" || k === "K") && (neutral || k !== "ArrowUp")) { e.preventDefault(); moveCursor(-1); return; }
    if ((k === "x" || k === "X") && route.key === "people/students" && ui.cursor) {
      e.preventDefault(); toggleSel(ui.cursor, !ui.selected[ui.cursor], false); announce((ui.selected[ui.cursor] ? "Selected " : "Deselected ") + fullName(findStudent(ui.cursor))); return;
    }
    if (k === "Enter" && ui.cursor && !t.closest("button, a, input")) { e.preventDefault(); openCursorRow(); return; }
    if (k === "Escape") {
      if (Object.keys(ui.selected).length) { e.preventDefault(); clearSelection(); }
      else if (ui.cursor) { ui.cursor = null; syncCursor(); }
    }
  });

  /* ================================================================ INIT */
  function init() {
    SC.pill({ id: "02", name: "Timetable" });
    $$("[data-mod]").forEach(function (el) { el.textContent = MOD; });
    var stored = SC.store("tt-subnav");
    toggleSubnav(stored ? stored === "open" : window.innerWidth >= 1024, true);
    updateTermChip();
    updateBadge();
    setRoute(fromHash(), false);
    SCIcons.hydrate();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
