/* School Clerk · Direction 01 — Registry · dashboard.html
   Local simulation only: every action edits in-memory sample data. Nothing is sent anywhere. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var money = SC.money;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ic = function (n, s, c) { return SCIcons.icon(n, s || 16, c); };
  var mq = function (q) { return window.matchMedia(q).matches; };
  var isMobile = function () { return mq("(max-width: 767px)"); };
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
  var pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
  var millions = function (n) { return "₦" + (n / 1e6).toFixed(2) + "m"; };
  var digits = function (el) { return Number(String(el.value).replace(/[^\d]/g, "")) || 0; };

  SC.pill({ id: "01", name: "Registry" });

  /* ------------------------------------------------------------------ state */
  var S = {
    students: D.students.map(function (s) { return Object.assign({}, s); }),
    payments: D.payments.map(function (p) { return Object.assign({}, p); }),
    selected: new Set(),
    q: "", quick: "all", f: { cls: null, status: null, admission: null },
    colQ: "", colQuick: "all",
    collected: D.finance.collected, today: D.finance.todayCollected,
    term: { session: "2026/2027", term: "First Term" },
    unread: [true, true, true],
    nextId: 216, nextRcp: 413,
    page: null, editId: null, payId: null, delId: null, detailId: null, rowMenuId: null,
  };

  var ST = { enrolled: ["Enrolled", "badge-success"], "not-enrolled": ["Not enrolled", "badge-outline"] };
  var ADM = { new: ["New admission", "badge-info"], returning: ["Returning", "badge-neutral"], unclassified: ["Needs classification", "badge-warning"] };
  var FEE = { paid: ["Paid", "badge-success"], part: ["Part-paid", "badge-warning"], owing: ["Owing", "badge-neutral"], overdue: ["Overdue", "badge-destructive"] };
  var dot = function (pair, extra) { return '<span class="badge badge-dot x-dotlabel ' + pair[1] + (extra ? " " + extra : "") + '">' + esc(pair[0]) + "</span>"; };
  var fullName = function (s) { return s.first + " " + s.last; };
  var clsOf = function (s) { return s.cls + " " + s.arm; };
  var find = function (id) { return S.students.filter(function (s) { return s.id === id; })[0]; };
  var payerOf = function (g) { return String(g || "").replace(/^(Mr|Mrs|Ms|Dr|Alh|Mal|Hajiya|Chief)\.?\s+/i, ""); };

  function counts(list) {
    var c = { total: list.length, enrolled: 0, notEnrolled: 0, newAdm: 0, returning: 0, unclassified: 0 };
    list.forEach(function (s) {
      if (s.status === "enrolled") c.enrolled++; else c.notEnrolled++;
      if (s.admission === "new") c.newAdm++; else if (s.admission === "returning") c.returning++; else c.unclassified++;
    });
    return c;
  }
  var BASE = { total: 486, enrolled: 451, notEnrolled: 35, newAdm: 64, returning: 419, unclassified: 3 };
  var INIT = counts(S.students);
  function totals() {
    var c = counts(S.students), t = {};
    Object.keys(BASE).forEach(function (k) { t[k] = BASE[k] + c[k] - INIT[k]; });
    return t;
  }

  /* Fee lines for a student: required fees (+ new-student fees), balanced to the billed total, paid allocated top-down. */
  function feeLines(s) {
    var lines;
    if (s.lines) lines = s.lines.map(function (l) { return { title: l.title, amount: l.amount }; });
    else {
      lines = D.fees.filter(function (f) { return f.type === "Required" && f.audience !== "New students"; }).map(function (f) { return { title: f.title, amount: f.amount }; });
      if (s.admission === "new") D.fees.filter(function (f) { return f.type === "Required" && f.audience === "New students"; }).forEach(function (f) { lines.push({ title: f.title, amount: f.amount }); });
      var sum = lines.reduce(function (a, l) { return a + l.amount; }, 0);
      if (s.billed > sum) lines.push({ title: "Other term charges", amount: s.billed - sum });
    }
    var left = s.paid;
    return lines.map(function (l) { var p = Math.min(left, l.amount); left -= p; return { title: l.title, amount: l.amount, paid: p, due: l.amount - p }; });
  }

  /* --------------------------------------------------------------- elements */
  var app = $("#app"), inset = $("#inset"), sidebar = $("#sidebar"), scrim = $("#scrim"), sbToggle = $("#sb-toggle");
  var sheetDetail = $("#sheet-detail"), sheetStudent = $("#sheet-student"), sheetPay = $("#sheet-pay");
  var dlgDelete = $("#dlg-delete"), dlgSearch = $("#dlg-search");
  var overlayOpen = function () { return !!document.querySelector('.sheet[data-open="true"], .dialog[data-open="true"]'); };

  $$("[data-kbd-k], #search-kbd").forEach(function (k) { k.textContent = isMac ? "⌘K" : "Ctrl K"; });
  sbToggle.title = "Toggle sidebar (" + (isMac ? "⌘B" : "Ctrl B") + ")";

  /* ===================================================== popover manager */
  var Pop = {
    cur: null,
    open: function (el, trg, place) {
      if (this.cur && this.cur.el === el && this.cur.trg === trg) { this.close(true); return; }
      this.close(false);
      el.hidden = false;
      this.cur = { el: el, trg: trg, place: place };
      trg.setAttribute("aria-expanded", "true");
      placePop(el, trg, place);
      var items = popItems(el);
      if (items[0]) items[0].focus({ preventScroll: true });
    },
    close: function (returnFocus) {
      var c = this.cur;
      if (!c) return;
      c.el.hidden = true;
      c.trg.setAttribute("aria-expanded", "false");
      this.cur = null;
      if (returnFocus && document.contains(c.trg)) c.trg.focus({ preventScroll: true });
    },
  };
  function popItems(el) {
    return $$(".menu-item:not([disabled]), .x-note-item, .x-pop-head .btn:not([disabled])", el).filter(function (n) { return n.offsetParent !== null; });
  }
  function placePop(el, trg, place) {
    el.style.left = "0px"; el.style.top = "0px"; el.style.minWidth = "";
    var r = trg.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, m = 8, gap = 6;
    if (place === "sidebar") {
      if (!isMobile() && app.dataset.collapsed === "true") place = "right-end";
      else { place = "top-start"; el.style.minWidth = Math.round(r.width) + "px"; }
    }
    var w = el.offsetWidth, h = el.offsetHeight, left, top;
    if (place === "right-end") { left = r.right + gap + 4; top = r.bottom - h; }
    else if (place === "top-start") { left = r.left; top = r.top - h - gap; if (top < m) top = r.bottom + gap; }
    else if (place === "bottom-end") { left = r.right - w; top = r.bottom + gap; }
    else { left = r.left; top = r.bottom + gap; }
    if (/^bottom/.test(place) && top + h > vh - m && r.top - h - gap > m) top = r.top - h - gap;
    left = Math.max(m, Math.min(left, vw - w - m));
    top = Math.max(m, Math.min(top, vh - h - m));
    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
  }
  document.addEventListener("mousedown", function (e) {
    var c = Pop.cur;
    if (c && !c.el.contains(e.target) && !c.trg.contains(e.target)) Pop.close(false);
  }, true);
  document.addEventListener("keydown", function (e) {
    var c = Pop.cur;
    if (!c) return;
    if (e.key === "Escape") { e.preventDefault(); Pop.close(true); return; }
    if (e.key === "Tab") { Pop.close(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].indexOf(e.key) > -1) {
      var items = popItems(c.el); if (!items.length) return;
      e.preventDefault();
      var i = items.indexOf(document.activeElement);
      if (e.key === "Home") i = 0; else if (e.key === "End") i = items.length - 1;
      else if (e.key === "ArrowDown") i = (i + 1) % items.length; else i = (i - 1 + items.length) % items.length;
      items[i].focus();
    }
  });
  inset.addEventListener("scroll", function () { if (Pop.cur) Pop.close(false); }, { passive: true });
  window.addEventListener("resize", function () { if (Pop.cur) Pop.close(false); });

  /* Tabs keyboard (roving) */
  function tablistKeys(list, onPick) {
    list.addEventListener("keydown", function (e) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) < 0) return;
      var tabs = $$('[role="tab"]', list), i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      if (e.key === "Home") i = 0; else if (e.key === "End") i = tabs.length - 1;
      else i = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[i].focus();
      onPick(tabs[i]);
    });
  }

  /* ============================================================ sidebar */
  var NAV = [];
  D.nav.forEach(function (m, mi) {
    m.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        NAV.push({ key: SC.slugify(m.module) + "/" + SC.slugify(it.label), module: m.module, num: pad2(mi + 1), section: sec.title || "", label: it.label, icon: it.icon, count: it.count });
      });
    });
  });
  var PAGES = { "people/students": "students", "finance/collections": "collections", "overview/dashboard": "dashboard" };

  function renderNav() {
    $("#sb-nav").innerHTML = D.nav.map(function (m, mi) {
      var slug = SC.slugify(m.module);
      var body = m.sections.map(function (sec) {
        var items = sec.items.map(function (it) {
          var key = slug + "/" + SC.slugify(it.label), ext = key === "settings/website";
          return '<li><a class="x-sb-item" href="' + (ext ? "website.html" : "#/" + key) + '" data-key="' + key + '" data-label="' + esc(it.label) + '">' + ic(it.icon) +
            '<span class="x-sb-text">' + esc(it.label) + "</span>" +
            (it.count ? '<span class="x-sb-count">' + it.count + "</span>" : "") +
            (ext ? ic("arrow-up-right", 13, "x-sb-ext") : "") + "</a></li>";
        }).join("");
        return (sec.title ? '<p class="x-sb-sect"><span class="x-sb-text">' + esc(sec.title) + "</span></p>" : "") + '<ul class="x-sb-menu">' + items + "</ul>";
      }).join("");
      return '<div class="x-sb-group" data-open="true" role="group" aria-labelledby="sbl-' + slug + '">' +
        '<button type="button" class="x-sb-label" id="sbl-' + slug + '" aria-expanded="true" aria-controls="sbg-' + slug + '"><span class="x-folio" aria-hidden="true">' + pad2(mi + 1) + '</span><span class="x-sb-text">' + esc(m.module) + "</span>" + ic("chevron-down", 14, "x-chev") + "</button>" +
        '<div class="x-sb-group-body" id="sbg-' + slug + '">' + body + "</div></div>";
    }).join("");
  }
  renderNav();
  $("#sb-nav").addEventListener("click", function (e) {
    var lab = e.target.closest(".x-sb-label");
    if (lab) {
      var g = lab.closest(".x-sb-group"), open = g.dataset.open !== "true";
      g.dataset.open = String(open);
      lab.setAttribute("aria-expanded", String(open));
      return;
    }
    var a = e.target.closest(".x-sb-item");
    if (a && a.getAttribute("href").charAt(0) === "#" && a.getAttribute("href") === location.hash) { e.preventDefault(); route(true); }
  });

  function setCollapsed(c, persist) {
    app.dataset.collapsed = String(!!c);
    $$(".x-sb-item").forEach(function (a) { a.title = c ? a.dataset.label : ""; });
    $("#term-trigger").title = c ? "Switch term" : "";
    $("#user-trigger").title = c ? "Aisha Bello · Administrator" : "";
    if (persist) SC.store("sc-01-sidebar", c ? "rail" : "full");
    syncToggle();
  }
  function syncToggle() {
    var m = isMobile();
    sbToggle.innerHTML = ic(m ? "menu" : "panel-left");
    sbToggle.setAttribute("aria-label", m ? "Open navigation" : "Toggle sidebar");
    sbToggle.setAttribute("aria-expanded", String(m ? app.dataset.drawer === "open" : app.dataset.collapsed !== "true"));
  }
  function openDrawer() {
    app.dataset.drawer = "open";
    scrim.hidden = false;
    inset.inert = true;
    syncToggle();
    setTimeout(function () { var a = $('.x-sb-item[aria-current="page"]') || $(".x-sb-item"); if (a) a.focus({ preventScroll: false }); }, 60);
  }
  function closeDrawer(returnFocus) {
    if (app.dataset.drawer !== "open") return;
    delete app.dataset.drawer;
    scrim.hidden = true;
    inset.inert = false;
    syncToggle();
    if (returnFocus) sbToggle.focus();
  }
  sbToggle.addEventListener("click", function () {
    if (isMobile()) openDrawer();
    else setCollapsed(app.dataset.collapsed !== "true", true);
  });
  scrim.addEventListener("click", function () { closeDrawer(true); });
  $("#drawer-close").addEventListener("click", function () { closeDrawer(true); });
  var wideMq = window.matchMedia("(min-width: 1280px)");
  setCollapsed(wideMq.matches ? SC.store("sc-01-sidebar") === "rail" : !isMobile());
  wideMq.addEventListener("change", function (e) { setCollapsed(e.matches ? SC.store("sc-01-sidebar") === "rail" : true); });
  window.matchMedia("(max-width: 767px)").addEventListener("change", function (e) {
    closeDrawer(false);
    if (!e.matches) setCollapsed(wideMq.matches ? SC.store("sc-01-sidebar") === "rail" : true); else syncToggle();
  });

  /* Term card + switcher */
  function renderWeeks(el, now, done) {
    var h = "";
    for (var i = 1; i <= 13; i++) h += "<i" + (i < now || i <= done ? ' class="is-done"' : i === now ? ' class="is-now"' : "") + "></i>";
    el.innerHTML = h;
  }
  function renderTerm() {
    var cur = S.term.session === "2026/2027" && S.term.term === "First Term";
    var past = S.term.session === "2025/2026";
    $("#term-eyebrow").textContent = cur ? "Current term" : "Viewing term";
    $("#term-title").textContent = S.term.term;
    $("#term-meta").textContent = S.term.session + " · " + (cur ? "Week 4 of 13" : past ? "Closed" : "Not started");
    renderWeeks($("#term-weeks"), cur ? 4 : 0, past ? 13 : 0);
    $("#term-rail").textContent = cur ? "W4" : "T" + (["First Term", "Second Term", "Third Term"].indexOf(S.term.term) + 1);
    $("#term-trigger").style.setProperty("--x-term-pct", cur ? "31%" : past ? "100%" : "0%");
    $("#term-sr").textContent = (cur ? "Current term: " : "Viewing: ") + S.term.term + " " + S.term.session + (cur ? ", week 4 of 13" : "") + ". Switch term.";
    $("#pop-term").innerHTML = D.sessions.map(function (sess) {
      return '<p class="menu-label"><span>' + esc(sess.title) + "</span>" + (sess.current ? "<span>Current session</span>" : "") + "</p>" +
        sess.terms.map(function (t) {
          var on = S.term.session === sess.title && S.term.term === t;
          var isCur = sess.current && t === "First Term";
          return '<button type="button" class="menu-item" role="menuitemradio" aria-checked="' + on + '" data-term="' + esc(sess.title + "|" + t) + '">' + esc(t) +
            (isCur ? '<span class="badge x-current x-menu-badge">Current</span>' : "") + ic("check", 16, "x-check") + "</button>";
        }).join("");
    }).join('<div class="menu-sep" role="separator"></div>');
  }
  renderTerm();
  $("#term-trigger").addEventListener("click", function () { Pop.open($("#pop-term"), this, "sidebar"); });
  $("#pop-term").addEventListener("click", function (e) {
    var b = e.target.closest("[data-term]"); if (!b) return;
    var p = b.dataset.term.split("|");
    S.term = { session: p[0], term: p[1] };
    renderTerm();
    Pop.close(true);
    var cur = p[0] === "2026/2027" && p[1] === "First Term";
    SC.toast((cur ? "Back to " : "Viewing ") + p[1] + " · " + p[0], cur ? "You're on the current term again." : "This preview keeps showing First Term records.", "calendar-range");
  });

  /* User menu + theme */
  function syncTheme() { $("#theme-item").setAttribute("aria-checked", String(document.documentElement.classList.contains("dark"))); }
  syncTheme();
  document.addEventListener("sc:theme", syncTheme);
  $("#user-trigger").addEventListener("click", function () { Pop.open($("#pop-user"), this, "sidebar"); });
  $("#theme-item").addEventListener("click", function () { SC.theme.toggle(); syncTheme(); });
  $("#logout-item").addEventListener("click", function () { Pop.close(true); SC.toast("Logging out isn't part of this preview", "You stay signed in as Aisha Bello.", "log-out"); });

  /* Notifications */
  var NOTES = [
    { t: "Toluwani Adebayo's admission is waiting for approval", m: "Students · Approvals · 25 min ago", go: "#/people/enrollment" },
    { t: "₦60,000 transfer from Kunle Olawale needs allocation", m: "Finance · Collections · 1 h ago", go: "#/finance/collections", rcp: "RCP-26-00410" },
    { t: "JSS 2 Mathematics CA 2 is 80% recorded", m: "Academics · Assessment Recording · Yesterday", go: "#/academics/assessment-recording" },
  ];
  function renderNotes() {
    var n = S.unread.filter(Boolean).length;
    $("#notes-list").innerHTML = NOTES.map(function (x, i) {
      return '<button type="button" class="x-note-item' + (S.unread[i] ? "" : " is-read") + '" data-note="' + i + '"><span>' + esc(x.t) + "<small>" + esc(x.m) + "</small></span></button>";
    }).join("");
    $("#bell-dot").hidden = !n;
    $("#bell-trigger").setAttribute("aria-label", "Notifications" + (n ? ", " + n + " unread" : ""));
    $("#notes-read").disabled = !n;
  }
  renderNotes();
  $("#bell-trigger").addEventListener("click", function () { Pop.open($("#pop-notes"), this, "bottom-end"); });
  $("#notes-read").addEventListener("click", function () { S.unread = [false, false, false]; renderNotes(); var f = popItems($("#pop-notes"))[0]; if (f) f.focus(); });
  $("#notes-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-note]"); if (!b) return;
    var i = +b.dataset.note, x = NOTES[i];
    S.unread[i] = false; renderNotes(); Pop.close(false);
    go(x.go);
    if (x.rcp) setTimeout(function () { flashRow('#col-body tr[data-rcp="' + x.rcp + '"]'); }, 80);
  });

  $("#assistant-btn").addEventListener("click", function () { go("#/overview/assistant"); });
  $("#search-trigger").addEventListener("click", openSearch);

  /* ============================================================== routing */
  function go(hash) { if (location.hash === hash) route(true); else location.hash = hash; }
  window.addEventListener("hashchange", function () { route(true); });

  function titleCase(slug) { return slug.split("-").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" "); }
  function route(user) {
    var key = (location.hash || "").replace(/^#\/?/, "") || "people/students";
    if (key === "finance/receive-payment") {
      history.replaceState(null, "", "#/finance/collections");
      key = "finance/collections";
      setTimeout(function () { openPay(); }, 120);
    }
    var nav = NAV.filter(function (n) { return n.key === key; })[0];
    if (!nav) {
      var parts = key.split("/"), mi = -1;
      D.nav.forEach(function (m, i) { if (SC.slugify(m.module) === parts[0]) mi = i; });
      nav = { key: key, module: mi > -1 ? D.nav[mi].module : "Overview", num: pad2(mi > -1 ? mi + 1 : 1), section: "", label: titleCase(parts[1] || parts[0] || "Page") };
    }
    var page = PAGES[key] || "empty";
    S.page = page;
    $$("[data-page]").forEach(function (sec) { sec.hidden = sec.dataset.page !== page; });
    if (page === "empty") fillEmpty(nav);
    if (page === "dashboard") renderDashboard();
    if (page === "collections") renderCollections();
    $$(".x-sb-item").forEach(function (a) { if (a.dataset.key === key) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var crumbs = [nav.module, nav.section, nav.label].filter(Boolean);
    $("#crumbs").innerHTML = crumbs.map(function (c, i) {
      return i < crumbs.length - 1 ? "<li>" + esc(c) + ic("chevron-right", 14) + "</li>" : '<li aria-current="page">' + esc(c) + "</li>";
    }).join("");
    document.title = nav.label + " · Kingsway Academy";
    syncBulk();
    Pop.close(false);
    inset.scrollTop = 0;
    if (isMobile()) window.scrollTo(0, 0);
    if (user) {
      closeDrawer(false);
      var h = $('[data-page="' + page + '"] h1');
      if (h) h.focus({ preventScroll: true });
    }
  }
  function fillEmpty(nav) {
    $("#empty-eyebrow").innerHTML = '<span class="x-folio">' + nav.num + "</span> — " + esc(nav.module) + (nav.section ? " · " + esc(nav.section) : "");
    $("#h-empty").textContent = nav.label;
    $("#empty-title").textContent = nav.label + " isn't part of this preview";
    $("#empty-body").textContent = "This page exists in School Clerk. The design preview fills in Students, Collections and the Dashboard, so each direction is compared on the same work.";
  }

  /* ============================================================ students */
  var stBody = $("#st-body");
  function filtersActive() { return !!(S.q.trim() || S.f.cls || S.f.status || S.f.admission); }
  function filtered() {
    var q = S.q.trim().toLowerCase(), qd = q.replace(/\s+/g, "");
    return S.students.filter(function (s) {
      if (S.quick === "enrolled" && s.status !== "enrolled") return false;
      if (S.quick === "not-enrolled" && s.status !== "not-enrolled") return false;
      if (S.quick === "unclassified" && s.admission !== "unclassified") return false;
      if (S.f.cls && clsOf(s) !== S.f.cls) return false;
      if (S.f.status && s.status !== S.f.status) return false;
      if (S.f.admission && s.admission !== S.f.admission) return false;
      if (q) {
        var hay = [fullName(s), s.other || "", s.id, s.guardian, clsOf(s)].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0 && String(s.phone).replace(/\s+/g, "").indexOf(qd) < 0) return false;
      }
      return true;
    });
  }
  function renderStats() {
    var t = totals();
    var pct = Math.round((t.enrolled / t.total) * 1000) / 10;
    var cells = [
      ["Total students", t.total, "<b>" + t.enrolled + "</b> enrolled · <b>" + t.notEnrolled + "</b> not yet"],
      ["Enrolled this term", t.enrolled, pct + "% of the register"],
      ["New admissions", t.newAdm, "<b>3</b> waiting for approval"],
      ["Returning", t.returning, "<b>" + t.unclassified + "</b> need classification"],
    ];
    $("#st-stats").innerHTML = cells.map(function (c) {
      return '<div class="x-stat"><p class="x-eyebrow">' + c[0] + '</p><p class="x-stat-value">' + c[1] + '</p><p class="x-stat-note">' + c[2] + "</p></div>";
    }).join("");
    $("#st-lede").textContent = t.total + " on the register";
    var cnt = $('.x-sb-item[data-key="people/students"] .x-sb-count');
    if (cnt) cnt.textContent = t.total;
    var q = [["all", "All", t.total], ["enrolled", "Enrolled", t.enrolled], ["not-enrolled", "Not enrolled", t.notEnrolled], ["unclassified", "Needs classification", t.unclassified]];
    $("#st-quick").innerHTML = q.map(function (x) {
      var on = S.quick === x[0];
      return '<button type="button" class="tabs-trigger" role="tab" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" aria-controls="st-table" data-quick="' + x[0] + '">' + x[1] + ' <span class="x-count">' + x[2] + "</span></button>";
    }).join("");
    return t;
  }
  function rowHtml(s, i) {
    var name = fullName(s), sel = S.selected.has(s.id);
    return '<tr data-id="' + esc(s.id) + '" tabindex="' + (i === 0 ? 0 : -1) + '"' + (sel ? ' data-state="selected"' : "") + ' aria-selected="' + sel + '">' +
      '<td class="x-col-sel"><input type="checkbox" class="checkbox" data-sel aria-label="Select ' + esc(name) + '"' + (sel ? " checked" : "") + "></td>" +
      '<td class="c-stu"><div class="x-person"><span class="avatar" aria-hidden="true">' + esc(SC.initials(name)) + '</span><span class="x-person-text"><span class="x-person-name">' + esc(name) + '</span><span class="x-sub x-sub-id x-id">' + esc(s.id) + "</span></span></div></td>" +
      '<td class="c-id"><span class="x-id">' + esc(s.id) + "</span></td>" +
      '<td class="c-cls">' + esc(clsOf(s)) + "</td>" +
      '<td class="c-gen">' + (s.gender === "F" ? "Female" : "Male") + "</td>" +
      '<td class="c-st">' + dot(ST[s.status]) + '<span class="x-sub x-sub-adm">' + esc(ADM[s.admission][0]) + "</span></td>" +
      '<td class="c-adm">' + dot(ADM[s.admission]) + "</td>" +
      '<td class="c-gd"><span>' + esc(s.guardian) + '</span><span class="x-sub x-sub-ph tnum">' + esc(s.phone) + "</span></td>" +
      '<td class="c-ph tnum">' + esc(s.phone) + "</td>" +
      '<td class="x-col-act"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rowmenu aria-haspopup="menu" aria-expanded="false" aria-controls="pop-row" aria-label="Actions for ' + esc(name) + '">' + ic("ellipsis") + "</button></td></tr>";
  }
  function renderStudents() {
    var t = renderStats();
    var list = filtered();
    stBody.innerHTML = list.map(rowHtml).join("");
    var empty = !list.length;
    $("#st-empty").hidden = !empty;
    $("#st-table").hidden = empty;
    if (empty) $("#st-empty-msg").textContent = S.q.trim() ? "Nothing on this page matches “" + S.q.trim() + "”. Try a name, student ID or guardian, or clear the filters." : "No students on this page match these filters.";
    var quickTotal = { all: t.total, enrolled: t.enrolled, "not-enrolled": t.notEnrolled, unclassified: t.unclassified }[S.quick];
    $("#st-result").textContent = filtersActive() ? list.length + (list.length === 1 ? " match" : " matches") + " on this page" : "";
    $("#st-foot").textContent = filtersActive() ? "Searching page 1 of " + Math.max(1, Math.ceil(quickTotal / 12)) : "Showing 1–" + list.length + " of " + quickTotal + (S.quick === "all" ? " students" : "");
    $("#st-reset").hidden = !filtersActive();
    syncFilters();
    syncSelection();
  }
  function syncSelection() {
    var visible = filtered().map(function (s) { return s.id; });
    // keep the selection to rows that still exist
    S.selected.forEach(function (id) { if (!find(id)) S.selected.delete(id); });
    $$("tr[data-id]", stBody).forEach(function (tr) {
      var on = S.selected.has(tr.dataset.id);
      if (on) tr.setAttribute("data-state", "selected"); else tr.removeAttribute("data-state");
      tr.setAttribute("aria-selected", String(on));
      var cb = tr.querySelector("[data-sel]"); if (cb) cb.checked = on;
    });
    var nSel = visible.filter(function (id) { return S.selected.has(id); }).length;
    [$("#st-all"), $("#st-all-m")].forEach(function (cb) {
      cb.checked = visible.length > 0 && nSel === visible.length;
      cb.indeterminate = nSel > 0 && nSel < visible.length;
    });
    syncBulk();
  }
  function syncBulk() {
    var n = S.selected.size, bar = $("#bulkbar");
    bar.hidden = !(n && S.page === "students");
    $("#bulk-n").textContent = n;
  }
  function toggleAll(cb) {
    var visible = filtered().map(function (s) { return s.id; });
    var all = visible.length && visible.every(function (id) { return S.selected.has(id); });
    visible.forEach(function (id) { if (all) S.selected.delete(id); else S.selected.add(id); });
    syncSelection();
  }
  $("#st-all").addEventListener("change", toggleAll);
  $("#st-all-m").addEventListener("change", toggleAll);

  stBody.addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-id]"); if (!tr) return;
    var id = tr.dataset.id;
    if (e.target.closest("[data-sel]")) {
      if (e.target.checked) S.selected.add(id); else S.selected.delete(id);
      syncSelection();
      return;
    }
    var mb = e.target.closest("[data-rowmenu]");
    if (mb) { S.rowMenuId = id; Pop.open($("#pop-row"), mb, "bottom-end"); return; }
    if (e.target.closest("a,button,input")) return;
    openDetail(id);
  });
  stBody.addEventListener("keydown", function (e) {
    var tr = e.target.closest("tr[data-id]");
    if (!tr || e.target !== tr) return;
    if (e.key === "Enter") { e.preventDefault(); openDetail(tr.dataset.id); }
    else if (e.key === " ") {
      e.preventDefault();
      var id = tr.dataset.id;
      if (S.selected.has(id)) S.selected.delete(id); else S.selected.add(id);
      syncSelection();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var nx = e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling;
      if (nx) { tr.tabIndex = -1; nx.tabIndex = 0; nx.focus(); }
    }
  });
  $("#st-quick").addEventListener("click", function (e) {
    var b = e.target.closest("[data-quick]"); if (!b) return;
    S.quick = b.dataset.quick; renderStudents();
    var nb = $('[data-quick="' + S.quick + '"]'); if (nb) nb.focus();
  });
  tablistKeys($("#st-quick"), function (tab) { S.quick = tab.dataset.quick; renderStudents(); var nb = $('[data-quick="' + S.quick + '"]'); if (nb) nb.focus(); });
  $("#st-search").addEventListener("input", function () { S.q = this.value; renderStudents(); });
  function resetFilters() {
    S.q = ""; S.f = { cls: null, status: null, admission: null }; S.quick = "all";
    $("#st-search").value = "";
    renderStudents();
  }
  $("#st-reset").addEventListener("click", function () { resetFilters(); $("#st-search").focus(); });
  $("#st-empty-reset").addEventListener("click", function () { resetFilters(); $("#st-search").focus(); });
  $("#st-next").addEventListener("click", function () { SC.toast("Only page 1 is part of this preview", "The sample register shows twelve students.", "info"); });

  /* Filters */
  var FILTER_OPTS = {
    cls: function () {
      var seen = {};
      S.students.forEach(function (s) { seen[clsOf(s)] = 1; });
      return Object.keys(seen).sort().map(function (c) { return [c, c]; });
    },
    status: function () { return [["enrolled", "Enrolled"], ["not-enrolled", "Not enrolled"]]; },
    admission: function () { return [["new", "New admission"], ["returning", "Returning"], ["unclassified", "Needs classification"]]; },
  };
  var FILTER_ANY = { cls: "Any class", status: "Any status", admission: "Any admission type" };
  var activeFilter = null;
  $$(".x-filter").forEach(function (b) {
    b.setAttribute("aria-controls", "pop-filter");
    b.addEventListener("click", function () {
      var k = b.dataset.filter, pop = $("#pop-filter");
      activeFilter = k;
      pop.setAttribute("aria-label", b.textContent.trim() + " filter");
      pop.innerHTML = [[null, FILTER_ANY[k]]].concat(FILTER_OPTS[k]()).map(function (o) {
        return '<button type="button" class="menu-item" role="menuitemradio" aria-checked="' + (S.f[k] === o[0]) + '" data-val="' + esc(o[0] == null ? "" : o[0]) + '">' + esc(o[1]) + ic("check", 16, "x-check") + "</button>";
      }).join("");
      Pop.open(pop, b, "bottom-start");
    });
  });
  $("#pop-filter").addEventListener("click", function (e) {
    var it = e.target.closest("[data-val]"); if (!it || !activeFilter) return;
    S.f[activeFilter] = it.dataset.val || null;
    Pop.close(true);
    renderStudents();
  });
  function syncFilters() {
    $$(".x-filter").forEach(function (b) {
      var k = b.dataset.filter, v = S.f[k], val = b.querySelector(".x-filter-val");
      var label = v ? (FILTER_OPTS[k]().filter(function (o) { return o[0] === v; })[0] || [v, v])[1] : "";
      val.textContent = label; val.hidden = !v;
      b.dataset.active = String(!!v);
    });
  }

  /* Row menu */
  $("#pop-row").addEventListener("click", function (e) {
    var it = e.target.closest("[data-row]"); if (!it) return;
    var id = S.rowMenuId, s = find(id); if (!s) return;
    var act = it.dataset.row;
    Pop.close(true);
    if (act === "view") openDetail(id);
    else if (act === "edit") openStudentSheet(id);
    else if (act === "pay") openPay(id);
    else if (act === "delete") openDelete(id);
    else if (act === "remove") {
      if (s.status === "not-enrolled") { SC.toast(fullName(s) + " isn't enrolled this term", "Nothing to remove.", "info"); return; }
      s.status = "not-enrolled";
      renderStudents();
      SC.toast(fullName(s) + " removed from First Term", "They stay on the register and can be enrolled again.", "user-x");
    }
  });

  /* Bulk actions */
  var bulkKind = null;
  $("#bulkbar").addEventListener("click", function (e) {
    var b = e.target.closest("[data-bulk]"); if (!b) return;
    var k = b.dataset.bulk, n = S.selected.size;
    if (k === "clear") { S.selected.clear(); syncSelection(); $("#st-search").focus(); return; }
    if (k === "export") { SC.toast("CSV ready for " + n + " student" + (n === 1 ? "" : "s"), "Preview · no file is created.", "download"); return; }
    if (k === "remove") {
      var c = 0;
      S.selected.forEach(function (id) { var s = find(id); if (s && s.status !== "not-enrolled") { s.status = "not-enrolled"; c++; } });
      S.selected.clear();
      renderStudents();
      SC.toast(c + " student" + (c === 1 ? "" : "s") + " removed from First Term", "They stay on the register and can be enrolled again.", "user-x");
      $("#st-search").focus();
      return;
    }
    bulkKind = k;
    var pop = $("#pop-bulk"), opts;
    if (k === "admission") opts = [["new", "New admission"], ["returning", "Returning"]];
    else {
      opts = [];
      D.classrooms.forEach(function (c) { c.arms.forEach(function (a) { opts.push([c.name + "|" + a, c.name + " " + a]); }); });
    }
    pop.setAttribute("aria-label", k === "admission" ? "Set admission status" : "Move to class");
    pop.innerHTML = '<p class="menu-label">' + (k === "admission" ? "Set admission status" : "Move to class") + "</p>" + opts.map(function (o) {
      return '<button type="button" class="menu-item" role="menuitem" data-bv="' + esc(o[0]) + '">' + esc(o[1]) + "</button>";
    }).join("");
    Pop.open(pop, b, "top-start");
  });
  $("#pop-bulk").addEventListener("click", function (e) {
    var it = e.target.closest("[data-bv]"); if (!it) return;
    var v = it.dataset.bv, n = S.selected.size;
    S.selected.forEach(function (id) {
      var s = find(id); if (!s) return;
      if (bulkKind === "admission") s.admission = v;
      else { var p = v.split("|"); s.cls = p[0]; s.arm = p[1]; }
    });
    Pop.close(true);
    renderStudents();
    if (bulkKind === "admission") SC.toast("Admission status updated", n + " student" + (n === 1 ? "" : "s") + " marked " + ADM[v][0] + ".", "badge-check");
    else SC.toast("Moved " + n + " student" + (n === 1 ? "" : "s"), "Now in " + v.replace("|", " ") + ".", "arrow-up-down");
  });

  $("#btn-new-student").addEventListener("click", function () { openStudentSheet(); });
  $("#btn-import").addEventListener("click", function () { SC.toast("Import isn't part of this preview", "Students are added one at a time here.", "upload"); });
  $("#btn-approvals").addEventListener("click", function () { go("#/people/enrollment"); });

  function flashRow(sel) {
    var tr = document.querySelector(sel); if (!tr) return;
    tr.setAttribute("data-flash", "");
    tr.scrollIntoView({ block: "nearest", behavior: SC.reduced() ? "auto" : "smooth" });
    setTimeout(function () { tr.removeAttribute("data-flash"); }, 2500);
  }

  /* ======================================================= detail sheet */
  var SUBJECTS = ["Mathematics", "English Language", "Basic Science", "Social Studies", "Civic Education", "Yoruba"];
  function rng(s) { var seed = parseInt(String(s.id).slice(-4), 10) || 7; return function (i) { var x = Math.sin(seed * 99.13 + i * 12.97) * 43758.5453; return x - Math.floor(x); }; }
  function fmtDob(v) {
    if (!v) return "—";
    var d = new Date(v + "T00:00:00");
    return isNaN(d) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function detailTab(tab, s) {
    var name = fullName(s);
    if (tab === "overview") {
      var bal = Math.max(0, s.billed - s.paid), pct = s.billed ? Math.round((s.paid / s.billed) * 100) : 0;
      return '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">1</span><span aria-hidden="true">·</span> Enrolment</h3>' +
        '<div class="x-demo-row">' + dot(ST[s.status]) + dot(ADM[s.admission]) + dot(FEE[s.fee] || FEE.owing) + "</div>" +
        '<dl class="x-dl">' +
        "<div><dt>Student ID</dt><dd><span class=\"x-id\">" + esc(s.id) + "</span></dd></div>" +
        "<div><dt>Class</dt><dd>" + esc(clsOf(s)) + "</dd></div>" +
        "<div><dt>Gender</dt><dd>" + (s.gender === "F" ? "Female" : "Male") + "</dd></div>" +
        "<div><dt>Date of birth</dt><dd class=\"tnum\">" + esc(fmtDob(s.dob)) + "</dd></div>" +
        (s.other ? "<div><dt>Other name</dt><dd>" + esc(s.other) + "</dd></div>" : "") +
        "</dl></section>" +
        '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">2</span><span aria-hidden="true">·</span> Guardian</h3><dl class="x-dl">' +
        "<div><dt>Name</dt><dd>" + esc(s.guardian) + "</dd></div>" +
        "<div><dt>Phone</dt><dd class=\"tnum\">" + (s.phone && s.phone !== "—" ? '<a href="tel:' + esc(String(s.phone).replace(/\s+/g, "")) + '">' + esc(s.phone) + "</a>" : "—") + "</dd></div>" +
        (s.phone2 ? "<div><dt>Phone 2</dt><dd class=\"tnum\">" + esc(s.phone2) + "</dd></div>" : "") +
        "</dl></section>" +
        '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">3</span><span aria-hidden="true">·</span> First Term balance</h3><div class="x-balance">' +
        '<div class="x-balance-row"><span class="x-muted">' + (bal ? "Outstanding" : "Fully paid") + '</span><span class="x-display">' + money(bal) + "</span></div>" +
        '<div class="progress" role="img" aria-label="' + pct + '% paid"><span style="width:' + pct + '%"></span></div>' +
        '<div class="x-meter-scale"><span>Paid ' + money(s.paid) + "</span><span>Billed " + money(s.billed) + "</span></div></div></section>";
    }
    if (tab === "academics") {
      var r = rng(s);
      var rows = SUBJECTS.map(function (sub, i) {
        var ca1 = 10 + Math.round(r(i) * 9), ca2 = i < 2 ? 9 + Math.round(r(i + 20) * 10) : null;
        return "<tr><td>" + sub + '</td><td class="num">' + ca1 + '</td><td class="num">' + (ca2 == null ? '<span class="x-muted">—</span>' : ca2) + '</td><td class="num"><span class="x-muted">—</span></td></tr>';
      }).join("");
      return '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">1</span><span aria-hidden="true">·</span> Scores this term · ' + esc(clsOf(s)) + "</h3>" +
        '<div class="table-wrap"><table class="table x-ledger x-mini"><thead><tr><th>Subject</th><th class="num">CA 1 /20</th><th class="num">CA 2 /20</th><th class="num">Exam /60</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<p class="x-note">Scores recorded so far in week 4. Dashes are not yet recorded.</p></section>';
    }
    if (tab === "attendance") {
      var rr = rng(s), p = 0, l = 0, a = 0;
      var weeks = ["14 Sep", "21 Sep", "28 Sep", "5 Oct"];
      var grid = '<span class="x-attend-h"></span>' + ["Mon", "Tue", "Wed", "Thu", "Fri"].map(function (d) { return '<span class="x-attend-h">' + d + "</span>"; }).join("");
      weeks.forEach(function (w, wi) {
        grid += '<span class="x-attend-w">W' + (wi + 1) + '<span class="x-attend-date">&nbsp;· ' + w + "</span></span>";
        for (var di = 0; di < 5; di++) {
          var v = rr(wi * 5 + di + 40), k = v < 0.05 ? "a" : v < 0.12 ? "l" : "p";
          if (k === "a") a++; else if (k === "l") l++; else p++;
          var lab = { p: "Present", l: "Late", a: "Absent" }[k];
          grid += '<span><span class="x-mark is-' + k + '" title="' + lab + '">' + (k === "p" ? ic("check", 13) : k.toUpperCase()) + "</span></span>";
        }
      });
      var rate = Math.round(((p + l) / 20) * 1000) / 10;
      return '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">1</span><span aria-hidden="true">·</span> Register · weeks 1–4</h3>' +
        '<div class="x-balance-row"><span class="x-muted">' + (p + l) + " of 20 days in school</span><span class=\"x-display\">" + rate + "%</span></div>" +
        '<div class="x-attend" aria-hidden="true">' + grid + "</div>" +
        '<div class="x-legend"><span><span class="x-mark is-p">' + ic("check", 13) + "</span>Present " + p + '</span><span><span class="x-mark is-l">L</span>Late ' + l + '</span><span><span class="x-mark is-a">A</span>Absent ' + a + "</span></div></section>";
    }
    // payments
    var lines = feeLines(s);
    var lrows = lines.map(function (ln) {
      return "<tr><td>" + esc(ln.title) + '</td><td class="num">' + money(ln.amount) + '</td><td class="num">' + money(ln.paid) + '</td><td class="num">' + (ln.due ? money(ln.due) : '<span class="x-muted">—</span>') + "</td></tr>";
    }).join("");
    var recs = S.payments.filter(function (pm) { return pm.student === name; });
    var rrows = recs.map(function (pm) {
      return '<tr><td><span class="x-id">' + esc(pm.receipt) + '</span></td><td class="tnum">' + esc(pm.date) + "</td><td>" + esc(pm.method) + '</td><td class="num' + (pm.status === "refunded" ? " x-refunded" : "") + '">' + money(pm.amount) + "</td></tr>";
    }).join("");
    return '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">1</span><span aria-hidden="true">·</span> Fees · First Term</h3>' +
      '<div class="table-wrap"><table class="table x-ledger x-mini"><thead><tr><th>Fee</th><th class="num">Billed</th><th class="num">Paid</th><th class="num">Due</th></tr></thead><tbody>' + lrows +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + money(s.billed) + '</td><td class="num">' + money(s.paid) + '</td><td class="num">' + money(Math.max(0, s.billed - s.paid)) + "</td></tr></tfoot></table></div></section>" +
      '<section class="x-sec"><h3 class="x-sec-head"><span class="x-folio">2</span><span aria-hidden="true">·</span> Receipts</h3>' +
      (recs.length ? '<div class="table-wrap"><table class="table x-ledger x-mini"><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>' + rrows + "</tbody></table></div>"
        : '<p class="x-muted" style="margin:0">No receipts recorded for ' + esc(s.first) + " this term.</p>") + "</section>";
  }
  function setDetailTab(tab) {
    var s = find(S.detailId); if (!s) return;
    $$("#sd-tabs [role=tab]").forEach(function (t) {
      var on = t.dataset.tab === tab;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      if (on) $("#sd-panel").setAttribute("aria-labelledby", t.id);
    });
    var panel = $("#sd-panel");
    panel.innerHTML = detailTab(tab, s);
    panel.scrollTop = 0;
  }
  function openDetail(id, tab) {
    var s = find(id); if (!s) return;
    S.detailId = id;
    var name = fullName(s);
    $("#sd-avatar").textContent = SC.initials(name);
    $("#sd-title").textContent = name;
    $("#sd-desc").textContent = s.id + " · " + clsOf(s) + " · " + ADM[s.admission][0];
    $("#sd-total").innerHTML = "Billed <strong>" + money(s.billed) + '</strong><span class="x-dot-sep">·</span>Paid <strong>' + money(s.paid) + "</strong>";
    setDetailTab(tab || "overview");
    SC.open(sheetDetail);
  }
  $("#sd-tabs").addEventListener("click", function (e) { var t = e.target.closest("[data-tab]"); if (t) setDetailTab(t.dataset.tab); });
  tablistKeys($("#sd-tabs"), function (t) { setDetailTab(t.dataset.tab); });
  $("#sd-edit").addEventListener("click", function () { var id = S.detailId; SC.close(sheetDetail); openStudentSheet(id); });
  $("#sd-pay").addEventListener("click", function () { var id = S.detailId; SC.close(sheetDetail); openPay(id); });

  /* ================================================ create / edit sheet */
  var ssForm = $("#ss-form");
  function setErr(errEl, msg, inputs) {
    inputs = inputs || [];
    if (msg) { errEl.innerHTML = ic("circle-alert", 14) + "<span>" + esc(msg) + "</span>"; errEl.hidden = false; }
    else { errEl.hidden = true; errEl.innerHTML = ""; }
    inputs.forEach(function (i) { if (msg) i.setAttribute("aria-invalid", "true"); else i.removeAttribute("aria-invalid"); });
  }
  function radioVal(name, root) { var r = (root || document).querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function moneyInput(el, cb) {
    el.addEventListener("input", function () {
      var d = el.value.replace(/[^\d]/g, "").slice(0, 10);
      el.value = d ? Number(d).toLocaleString("en-NG") : "";
      if (cb) cb();
    });
  }
  // classroom options
  $("#ss-class").innerHTML = '<option value="">Choose a classroom</option>' + D.classrooms.map(function (c) { return '<option value="' + esc(c.name) + '">' + esc(c.name) + "</option>"; }).join("");
  function fillArms(cls, arm) {
    var c = D.classrooms.filter(function (x) { return x.name === cls; })[0], sel = $("#ss-arm");
    if (!c) { sel.innerHTML = '<option value="">Choose a classroom first</option>'; sel.disabled = true; return; }
    sel.disabled = false;
    sel.innerHTML = c.arms.map(function (a) { return '<option value="' + esc(a) + '"' + (a === arm ? " selected" : "") + ">" + esc(c.name + " " + a) + "</option>"; }).join("");
  }
  $("#ss-class").addEventListener("change", function () { fillArms(this.value); if (this.value) setErr($("#ss-class-err"), "", [this]); });
  function renderFees(admission) {
    $("#ss-fees").innerHTML = D.fees.map(function (f, i) {
      var on = f.type === "Required" && (f.audience !== "New students" || admission === "new");
      return '<label class="x-fee"><input type="checkbox" class="checkbox" data-fee="' + i + '"' + (on ? " checked" : "") + '><span><span class="x-fee-title">' + esc(f.title) + '</span><span class="x-fee-meta">' + esc(f.type) + " · " + esc(f.audience) + '</span></span><span class="x-fee-amt">' + money(f.amount) + "</span></label>";
    }).join("");
  }
  function ssTotals() {
    var assigned = 0;
    $$("[data-fee]:checked").forEach(function (c) { assigned += D.fees[+c.dataset.fee].amount; });
    var paying = digits($("#ss-pay")), pending = Math.max(0, assigned - paying);
    $("#ss-sum-assigned").textContent = money(assigned);
    $("#ss-sum-paying").textContent = money(paying);
    $("#ss-sum-pending").textContent = money(pending);
    if (!S.editId) {
      $("#ss-t-assigned").textContent = money(assigned);
      $("#ss-t-paying").textContent = money(paying);
    }
    if (paying <= assigned && !$("#ss-pay-err").hidden) setErr($("#ss-pay-err"), "", [$("#ss-pay")]);
    return { assigned: assigned, paying: paying };
  }
  $("#ss-fees").addEventListener("change", ssTotals);
  moneyInput($("#ss-pay"), ssTotals);
  $$('input[name="admission"]').forEach(function (r) {
    r.addEventListener("change", function () {
      setErr($("#ss-adm-err"), "", $$('input[name="admission"]'));
      if (S.editId) return;
      $$("[data-fee]").forEach(function (c) { var f = D.fees[+c.dataset.fee]; if (f.audience === "New students" && f.type === "Required") c.checked = r.value === "new"; });
      ssTotals();
    });
  });
  $$('input[name="gender"]').forEach(function (r) { r.addEventListener("change", function () { setErr($("#ss-gender-err"), "", $$('input[name="gender"]')); }); });
  $("#ss-parent-toggle").addEventListener("click", function () {
    var open = this.getAttribute("aria-expanded") !== "true";
    this.setAttribute("aria-expanded", String(open));
    $("#ss-parent").hidden = !open;
    if (open) $("#ss-pname").focus();
  });
  var SS_RULES = {
    first: function () { return $("#ss-first").value.trim() ? "" : "Enter the student's first name."; },
    last: function () { return $("#ss-last").value.trim() ? "" : "Enter the student's surname."; },
  };
  ["first", "last"].forEach(function (k) {
    var el = $("#ss-" + k), err = $("#ss-" + k + "-err");
    el.addEventListener("blur", function () { if (el.dataset.touched || el.value) { el.dataset.touched = "1"; setErr(err, SS_RULES[k](), [el]); } });
    el.addEventListener("input", function () { if (!err.hidden) setErr(err, SS_RULES[k](), [el]); });
  });

  function openStudentSheet(id) {
    var s = id ? find(id) : null;
    S.editId = s ? s.id : null;
    ssForm.reset();
    $$(".field-error", ssForm).forEach(function (e) { e.hidden = true; });
    $$("[aria-invalid]", ssForm).forEach(function (e) { e.removeAttribute("aria-invalid"); });
    $$("[data-touched]", ssForm).forEach(function (e) { delete e.dataset.touched; });
    $("#ss-title").textContent = s ? "Edit student" : "New student";
    $("#ss-desc").textContent = s ? "Update " + fullName(s) + "'s record. Fees stay as assigned." : "Add a student to the register for First Term, 2026/2027.";
    $("#ss-submit").textContent = s ? "Save changes" : "Save student";
    $("#ss-fees-sec").hidden = !!s;
    var open = !!s;
    $("#ss-parent-toggle").setAttribute("aria-expanded", String(open));
    $("#ss-parent").hidden = !open;
    renderFees(s ? s.admission : "");
    fillArms("");
    $("#ss-paydate").value = "2026-10-09";
    if (s) {
      $("#ss-first").value = s.first; $("#ss-last").value = s.last; $("#ss-other").value = s.other || ""; $("#ss-dob").value = s.dob || "";
      var g = $('input[name="gender"][value="' + s.gender + '"]'); if (g) g.checked = true;
      var a = $('input[name="admission"][value="' + (s.admission === "new" ? "new" : "returning") + '"]'); if (a && s.admission !== "unclassified") a.checked = true;
      var known = D.classrooms.some(function (c) { return c.name === s.cls; });
      if (known) { $("#ss-class").value = s.cls; fillArms(s.cls, s.arm); }
      $("#ss-pname").value = s.guardian === "—" ? "" : s.guardian;
      $("#ss-pphone").value = s.phone === "—" ? "" : s.phone;
      $("#ss-pphone2").value = s.phone2 || "";
      $("#ss-total").innerHTML = 'Editing <strong class="x-id">' + esc(s.id) + "</strong>";
    } else {
      $("#ss-total").innerHTML = 'Assigned <strong id="ss-t-assigned">₦0</strong><span class="x-dot-sep">·</span>Paying now <strong id="ss-t-paying">₦0</strong>';
    }
    ssTotals();
    SC.open(sheetStudent);
    $(".sheet-body", sheetStudent).scrollTop = 0;
  }

  ssForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = [];
    var check = function (errEl, msg, inputs) { setErr(errEl, msg, inputs); if (msg) bad.push(inputs[0]); };
    check($("#ss-first-err"), SS_RULES.first(), [$("#ss-first")]);
    check($("#ss-last-err"), SS_RULES.last(), [$("#ss-last")]);
    check($("#ss-gender-err"), radioVal("gender") ? "" : "Choose the student's gender.", $$('input[name="gender"]'));
    check($("#ss-adm-err"), radioVal("admission") ? "" : "Choose New admission or Returning.", $$('input[name="admission"]'));
    check($("#ss-class-err"), $("#ss-class").value ? "" : "Choose a classroom.", [$("#ss-class")]);
    var tot = ssTotals();
    if (!S.editId) check($("#ss-pay-err"), tot.paying > tot.assigned ? "Paying now can't be more than the " + money(tot.assigned) + " assigned." : "", [$("#ss-pay")]);
    if (bad.length) { bad[0].focus(); return; }

    var cls = $("#ss-class").value, arm = $("#ss-arm").value || (D.classrooms.filter(function (c) { return c.name === cls; })[0] || { arms: ["A"] }).arms[0];
    var fields = {
      first: $("#ss-first").value.trim(), last: $("#ss-last").value.trim(), other: $("#ss-other").value.trim(),
      gender: radioVal("gender"), dob: $("#ss-dob").value, admission: radioVal("admission"), cls: cls, arm: arm,
      guardian: $("#ss-pname").value.trim() || "—", phone: $("#ss-pphone").value.trim() || "—", phone2: $("#ss-pphone2").value.trim(),
    };
    if (S.editId) {
      var s = find(S.editId);
      Object.assign(s, fields);
      SC.close(sheetStudent);
      renderStudents();
      flashRow('#st-body tr[data-id="' + s.id + '"]');
      SC.toast("Changes saved", fullName(s) + "'s record is up to date.", "circle-check");
      return;
    }
    var lines = $$("[data-fee]:checked").map(function (c) { var f = D.fees[+c.dataset.fee]; return { title: f.title, amount: f.amount }; });
    var ns = Object.assign(fields, {
      id: "KWA/2026/0" + S.nextId++, status: "enrolled", billed: tot.assigned, paid: tot.paying, lines: lines,
      fee: tot.assigned && tot.paying >= tot.assigned ? "paid" : tot.paying > 0 ? "part" : "owing",
    });
    S.students.unshift(ns);
    if (tot.paying > 0) {
      S.payments.unshift({ receipt: "RCP-26-00" + S.nextRcp++, date: "09 Oct", student: fullName(ns), cls: clsOf(ns), payer: payerOf(ns.guardian === "—" ? fullName(ns) : ns.guardian), method: radioVal("ssmethod") || "Transfer", amount: tot.paying, allocation: allocLabel(lines, tot.paying), status: "paid", by: "Admin · Aisha" });
      S.collected += tot.paying; S.today += tot.paying;
    }
    SC.close(sheetStudent);
    if (S.page !== "students") go("#/people/students");
    resetFilters();
    flashRow('#st-body tr[data-id="' + ns.id + '"]');
    SC.toast("Student saved", fullName(ns) + " added to " + clsOf(ns) + " for First Term" + (tot.paying ? " · " + money(tot.paying) + " received" : "") + ".", "user-check");
  });

  function allocLabel(lines, amount) {
    var dueOf = function (l) { return l.due != null ? l.due : l.amount; };
    var open = lines.filter(function (l) { return dueOf(l) > 0; });
    var total = open.reduce(function (a, l) { return a + dueOf(l); }, 0);
    var left = amount, covered = [];
    open.forEach(function (l) { if (left > 0) { covered.push(l.title); left -= Math.min(left, dueOf(l)); } });
    if (open.length > 2 && amount >= total) return "All term fees";
    return covered.slice(0, 2).join(", ") + (covered.length > 2 ? " +" + (covered.length - 2) : "");
  }

  /* =================================================== receive payment */
  var rpInput = $("#rp-student"), rpList = $("#rp-list"), rpActive = -1, rpMatches = [];
  function rpRender() {
    var q = rpInput.value.trim().toLowerCase();
    rpMatches = S.students.filter(function (s) { return !q || (fullName(s) + " " + s.id + " " + clsOf(s)).toLowerCase().indexOf(q) > -1; }).slice(0, 8);
    rpActive = rpMatches.length ? 0 : -1;
    rpList.innerHTML = rpMatches.length ? rpMatches.map(function (s, i) {
      var bal = Math.max(0, s.billed - s.paid);
      return '<li role="option" id="rp-opt-' + i + '" data-i="' + i + '" aria-selected="' + (i === rpActive) + '"><span class="avatar" aria-hidden="true" style="width:1.5rem;height:1.5rem;font-size:10px">' + esc(SC.initials(fullName(s))) + "</span><span>" + esc(fullName(s)) + ' <span class="x-muted">· ' + esc(clsOf(s)) + (bal ? " · owes " + money(bal) : "") + '</span></span><span class="x-id">' + esc(s.id) + "</span></li>";
    }).join("") : '<li class="x-combo-empty" role="option" aria-disabled="true">No student matches “' + esc(rpInput.value.trim()) + "”</li>";
    rpList.hidden = false;
    rpInput.setAttribute("aria-expanded", "true");
    rpSyncActive();
  }
  function rpSyncActive() {
    $$("li[data-i]", rpList).forEach(function (li) { li.setAttribute("aria-selected", String(+li.dataset.i === rpActive)); });
    if (rpActive > -1) { rpInput.setAttribute("aria-activedescendant", "rp-opt-" + rpActive); var a = $("#rp-opt-" + rpActive); if (a) a.scrollIntoView({ block: "nearest" }); }
    else rpInput.removeAttribute("aria-activedescendant");
  }
  function rpClose() { rpList.hidden = true; rpInput.setAttribute("aria-expanded", "false"); rpInput.removeAttribute("aria-activedescendant"); }
  rpInput.addEventListener("focus", rpRender);
  rpInput.addEventListener("input", rpRender);
  rpInput.addEventListener("blur", function () { setTimeout(rpClose, 120); });
  rpInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (rpList.hidden) { rpRender(); return; }
      if (!rpMatches.length) return;
      rpActive = (rpActive + (e.key === "ArrowDown" ? 1 : -1) + rpMatches.length) % rpMatches.length;
      rpSyncActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!rpList.hidden && rpActive > -1) rpPick(rpMatches[rpActive].id, true);
    } else if (e.key === "Escape" && !rpList.hidden) { e.preventDefault(); e.stopPropagation(); rpClose(); }
  });
  rpList.addEventListener("mousedown", function (e) {
    var li = e.target.closest("li[data-i]"); if (!li) return;
    e.preventDefault();
    rpPick(rpMatches[+li.dataset.i].id, true);
  });
  function rpPick(id, focusAmount) {
    var s = find(id); if (!s) return;
    S.payId = id;
    rpClose();
    setErr($("#rp-student-err"), "", [rpInput]);
    $("#rp-pick").hidden = true;
    $("#rp-picked").hidden = false;
    $("#rp-p-av").textContent = SC.initials(fullName(s));
    $("#rp-p-name").textContent = fullName(s);
    $("#rp-p-meta").textContent = s.id + " · " + clsOf(s) + " · Balance " + money(Math.max(0, s.billed - s.paid));
    var due = rpDue();
    $("#rp-amount").value = due ? due.toLocaleString("en-NG") : "";
    rpUpdate();
    if (focusAmount) $("#rp-amount").focus();
  }
  $("#rp-change").addEventListener("click", function () {
    S.payId = null;
    $("#rp-picked").hidden = true; $("#rp-pick").hidden = false;
    rpInput.value = ""; $("#rp-amount").value = "";
    rpUpdate();
    rpInput.focus();
  });
  function rpLines() {
    var s = find(S.payId);
    if (!s || $("#rp-term").value !== "current") return [];
    return feeLines(s).filter(function (l) { return l.due > 0; });
  }
  function rpDue() { return rpLines().reduce(function (a, l) { return a + l.due; }, 0); }
  function rpUpdate() {
    var s = find(S.payId), cur = $("#rp-term").value === "current";
    $("#rp-current").hidden = !cur;
    var lines = rpLines(), due = rpDue(), amt = digits($("#rp-amount")), left = amt;
    var box = $("#rp-lines");
    if (!s) box.innerHTML = '<p class="x-muted" style="margin:0;font-size:13px">Choose a student to see what is due.</p>';
    else if (!cur) box.innerHTML = '<p class="x-muted" style="margin:0;font-size:13px">No balance was carried from Third Term 2025/2026.</p>';
    else if (!lines.length) box.innerHTML = '<p class="x-muted" style="margin:0;font-size:13px">' + esc(s.first) + "'s First Term fees are fully paid. Nothing is due.</p>";
    else {
      box.innerHTML = '<div class="table-wrap"><table class="table x-ledger x-mini"><thead><tr><th>Fee</th><th class="num">Due</th><th class="num">Allocated</th></tr></thead><tbody>' +
        lines.map(function (l) { var a = Math.min(left, l.due); left -= a; return "<tr><td>" + esc(l.title) + '</td><td class="num">' + money(l.due) + '</td><td class="num">' + (a ? money(a) : '<span class="x-muted">—</span>') + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr><td>Total</td><td class="num">' + money(due) + '</td><td class="num">' + money(Math.min(amt, due)) + "</td></tr></tfoot></table></div>";
    }
    $("#rp-t-due").textContent = money(due);
    $("#rp-t-pay").textContent = money(amt);
    $("#rp-t-bal").textContent = money(Math.max(0, due - amt));
    if (!$("#rp-amount-err").hidden && amt > 0 && amt <= due) setErr($("#rp-amount-err"), "", [$("#rp-amount")]);
  }
  moneyInput($("#rp-amount"), rpUpdate);
  $("#rp-term").addEventListener("change", function () { var d = rpDue(); $("#rp-amount").value = d ? d.toLocaleString("en-NG") : ""; rpUpdate(); });
  function openPay(id) {
    S.payId = null;
    $("#rp-form").reset();
    $$(".field-error", sheetPay).forEach(function (e) { e.hidden = true; });
    $$("[aria-invalid]", sheetPay).forEach(function (e) { e.removeAttribute("aria-invalid"); });
    $("#rp-pick").hidden = false; $("#rp-picked").hidden = true;
    $("#rp-date").value = "2026-10-09";
    rpInput.removeAttribute("autofocus"); $("#rp-amount").removeAttribute("autofocus");
    if (id && find(id)) { rpPick(id, false); $("#rp-amount").setAttribute("autofocus", ""); }
    else rpInput.setAttribute("autofocus", "");
    rpUpdate();
    SC.open(sheetPay);
  }
  $("#btn-receive").addEventListener("click", function () { openPay(); });
  $("#rp-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var s = find(S.payId), amt = digits($("#rp-amount")), due = rpDue();
    if (!s) { setErr($("#rp-student-err"), "Choose the student who is paying.", [rpInput]); rpInput.focus(); return; }
    var msg = !due ? "Nothing is due for this term." : !amt ? "Enter the amount received." : amt > due ? "This is more than the " + money(due) + " due for First Term." : "";
    if (msg) { setErr($("#rp-amount-err"), msg, [$("#rp-amount")]); $("#rp-amount").focus(); return; }
    var lines = rpLines();
    var rec = { receipt: "RCP-26-00" + S.nextRcp++, date: "09 Oct", student: fullName(s), cls: clsOf(s), payer: payerOf(s.guardian === "—" ? fullName(s) : s.guardian), method: radioVal("rpmethod") || "Transfer", amount: amt, allocation: allocLabel(lines, amt), status: "paid", by: "Admin · Aisha" };
    s.paid += amt;
    s.fee = s.paid >= s.billed ? "paid" : "part";
    S.payments.unshift(rec);
    S.collected += amt; S.today += amt;
    SC.close(sheetPay);
    renderStudents();
    if (S.page === "collections") { renderCollections(); flashRow('#col-body tr[data-rcp="' + rec.receipt + '"]'); }
    if (S.page === "dashboard") renderDashboard();
    SC.toast("Payment received · " + rec.receipt, money(amt) + " from " + rec.payer + " for " + fullName(s) + ".", "circle-check");
  });

  /* ======================================================= delete dialog */
  var norm = function (v) { return String(v).trim().replace(/\s+/g, " ").toLowerCase(); };
  function openDelete(id) {
    var s = find(id); if (!s) return;
    S.delId = id;
    var name = fullName(s);
    $("#dd-name").textContent = name;
    $("#dd-name2").textContent = name;
    $("#dd-box").innerHTML = "<span><strong>" + esc(name) + '</strong> · <span class="x-id">' + esc(s.id) + "</span></span><span>" + esc(clsOf(s)) + " · " + esc(ADM[s.admission][0]) + " · Guardian " + esc(s.guardian) + "</span>";
    $("#dd-input").value = "";
    $("#dd-confirm").disabled = true;
    SC.open(dlgDelete);
  }
  $("#dd-input").addEventListener("input", function () { var s = find(S.delId); $("#dd-confirm").disabled = !s || norm(this.value) !== norm(fullName(s)); });
  $("#dd-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !$("#dd-confirm").disabled) { e.preventDefault(); $("#dd-confirm").click(); } });
  $("#dd-confirm").addEventListener("click", function () {
    var s = find(S.delId); if (!s) return;
    S.students = S.students.filter(function (x) { return x.id !== s.id; });
    S.selected.delete(s.id);
    SC.close(dlgDelete);
    renderStudents();
    SC.toast("Student deleted", fullName(s) + " was removed from the register.", "trash-2");
    setTimeout(function () { var f = $("#st-body tr[data-id]") || $("#st-search"); f.focus(); }, 30);
  });

  /* ========================================================= collections */
  var colBody = $("#col-body");
  function colFiltered() {
    var q = S.colQ.trim().toLowerCase();
    return S.payments.filter(function (p) {
      if (S.colQuick === "refunded" && p.status !== "refunded") return false;
      if (["Transfer", "Cash", "POS"].indexOf(S.colQuick) > -1 && p.method !== S.colQuick) return false;
      if (q && [p.receipt, p.student, p.cls, p.payer, p.method, p.allocation].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function payStatus(p) { return p.status === "refunded" ? ["Refunded", "badge-destructive"] : p.status === "cancelled" ? ["Cancelled", "badge-neutral"] : ["Paid", "badge-success"]; }
  function allocCell(p) { return p.allocation === "Pending allocation" ? dot(["Pending allocation", "badge-warning"]) : esc(p.allocation); }
  function renderCollections() {
    var billed = D.finance.billed, pct = Math.round((S.collected / billed) * 1000) / 10;
    $("#col-collected").textContent = millions(S.collected);
    $("#col-billed").textContent = "of " + millions(billed) + " billed";
    $("#col-billed2").textContent = millions(billed);
    $("#col-meter").style.setProperty("--pct", pct + "%");
    $("#col-meter").setAttribute("aria-label", pct + "% of billed fees collected");
    $("#col-rate").innerHTML = "<b>" + pct + "%</b> collected";
    $("#col-out").textContent = millions(billed - S.collected);
    $("#col-today").textContent = money(S.today);
    $("#col-week").textContent = S.payments.length;
    $("#col-alloc").textContent = money(S.payments.filter(function (p) { return p.allocation === "Pending allocation"; }).reduce(function (a, p) { return a + p.amount; }, 0));
    var cnt = function (f) { return S.payments.filter(f).length; };
    var q = [["all", "All", S.payments.length], ["Transfer", "Transfer", cnt(function (p) { return p.method === "Transfer"; })], ["Cash", "Cash", cnt(function (p) { return p.method === "Cash"; })], ["POS", "POS", cnt(function (p) { return p.method === "POS"; })], ["refunded", "Refunded", cnt(function (p) { return p.status === "refunded"; })]];
    $("#col-quick").innerHTML = q.map(function (x) {
      var on = S.colQuick === x[0];
      return '<button type="button" class="tabs-trigger" role="tab" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" aria-controls="col-table" data-cq="' + x[0] + '">' + x[1] + ' <span class="x-count">' + x[2] + "</span></button>";
    }).join("");
    var list = colFiltered();
    colBody.innerHTML = list.map(function (p, i) {
      var ref = p.status === "refunded";
      return '<tr data-rcp="' + esc(p.receipt) + '" data-student="' + esc(p.student) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' +
        '<td class="c-rcp"><span class="x-id">' + esc(p.receipt) + '</span><span class="x-sub x-sub-date tnum"> · ' + esc(p.date) + "</span></td>" +
        '<td class="c-date tnum">' + esc(p.date) + "</td>" +
        '<td class="c-stu"><span class="x-person-text"><span class="x-person-name">' + esc(p.student) + '</span><span class="x-line2">' + esc(p.cls) + '</span><span class="x-sub x-sub-payer">Paid by ' + esc(p.payer) + "</span></span></td>" +
        '<td class="c-payer">' + esc(p.payer) + "</td>" +
        '<td class="c-method">' + esc(p.method) + '<span class="x-sub-alloc-inline"> · ' + esc(p.allocation) + "</span></td>" +
        '<td class="c-amt num x-cell-amt"><span' + (ref ? ' class="x-refunded"' : "") + ">" + money(p.amount) + '</span><span class="x-sub x-sub-method">' + esc(p.method) + "</span></td>" +
        '<td class="c-alloc">' + allocCell(p) + "</td>" +
        '<td class="c-st">' + dot(payStatus(p)) + '<span class="x-sub x-sub-alloc">' + esc(p.allocation) + "</span></td></tr>";
    }).join("");
    var received = list.filter(function (p) { return p.status !== "refunded"; }).reduce(function (a, p) { return a + p.amount; }, 0);
    var refunded = list.filter(function (p) { return p.status === "refunded"; }).reduce(function (a, p) { return a + p.amount; }, 0);
    $("#col-foot").innerHTML = list.length ? '<tr><td class="c-rcp x-tf-label">Total received</td><td class="c-date x-tf-pad"></td><td class="c-stu x-tf-pad"><span class="x-count">' + list.length + " receipt" + (list.length === 1 ? "" : "s") + '</span></td><td class="c-payer x-tf-pad"></td><td class="c-method x-tf-pad"></td><td class="c-amt num x-tf-amt">' + money(received) + '</td><td class="c-alloc x-tf-pad"></td><td class="c-st x-tf-pad">' + (refunded ? '<span class="x-muted" style="font-weight:500">Refunded ' + money(refunded) + "</span>" : "") + "</td></tr>" : "";
    $("#col-empty").hidden = !!list.length;
    $("#col-table").hidden = !list.length;
    $("#col-result").textContent = S.colQ.trim() ? list.length + (list.length === 1 ? " receipt" : " receipts") + " match" : "";
  }
  $("#col-quick").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cq]"); if (!b) return;
    S.colQuick = b.dataset.cq; renderCollections();
    var nb = $('[data-cq="' + S.colQuick + '"]'); if (nb) nb.focus();
  });
  tablistKeys($("#col-quick"), function (t) { S.colQuick = t.dataset.cq; renderCollections(); var nb = $('[data-cq="' + S.colQuick + '"]'); if (nb) nb.focus(); });
  $("#col-search").addEventListener("input", function () { S.colQ = this.value; renderCollections(); });
  $("#col-empty-reset").addEventListener("click", function () { S.colQ = ""; S.colQuick = "all"; $("#col-search").value = ""; renderCollections(); $("#col-search").focus(); });
  function openReceipt(tr) {
    var s = S.students.filter(function (x) { return fullName(x) === tr.dataset.student; })[0];
    if (s) openDetail(s.id, "payments");
    else SC.toast(tr.dataset.rcp, "This student is no longer on the register.", "info");
  }
  colBody.addEventListener("click", function (e) { var tr = e.target.closest("tr[data-rcp]"); if (tr) openReceipt(tr); });
  colBody.addEventListener("keydown", function (e) {
    var tr = e.target.closest("tr[data-rcp]"); if (!tr || e.target !== tr) return;
    if (e.key === "Enter") { e.preventDefault(); openReceipt(tr); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var nx = e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling;
      if (nx) { tr.tabIndex = -1; nx.tabIndex = 0; nx.focus(); }
    }
  });
  $("#btn-export-rcp").addEventListener("click", function () { SC.toast("Receipts export ready", "Preview · no file is created.", "download"); });

  /* ============================================================ dashboard */
  var TASK_GO = ["#/people/enrollment", "#/overview/attendance", "#/finance/collections", "#/academics/assessment-recording"];
  function renderDashboard() {
    var hr = new Date().getHours();
    $("#dash-greet").textContent = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    renderWeeks($("#dash-weeks"), 4, 0);
    var t = totals(), billed = D.finance.billed, pct = Math.round((S.collected / billed) * 1000) / 10;
    var at = D.attendance;
    var k = [
      ["Students", t.total, "<b>" + t.enrolled + "</b> enrolled this term"],
      ["Attendance today", at.rate + "<small>%</small>", "<b>" + at.present + "</b> present · " + at.absent + " absent · " + at.late + " late"],
      ["Collected this term", millions(S.collected), "<b>" + pct + "%</b> of " + millions(billed) + " billed"],
      ["Outstanding", millions(billed - S.collected), at.classesMarked + " of " + at.classesTotal + " classes marked today"],
    ];
    k[3][2] = "<b>" + (Math.round((100 - pct) * 10) / 10) + "%</b> of billed fees";
    $("#dash-kpis").innerHTML = k.map(function (c) {
      return '<div class="x-stat"><p class="x-eyebrow">' + c[0] + '</p><p class="x-stat-value">' + c[1] + '</p><p class="x-stat-note">' + c[2] + "</p></div>";
    }).join("");
    $("#dash-attn").innerHTML = D.tasks.map(function (x, i) {
      return '<li><a class="x-rlist-btn" href="' + TASK_GO[i] + '"><span class="x-tone" data-tone="' + x.tone + '">' + ic(x.icon) + "</span><span>" + esc(x.text) + "<small>" + esc(x.meta) + "</small></span>" + ic("arrow-right") + "</a></li>";
    }).join("");
    $("#attn-count").textContent = D.tasks.length + " items";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.dataset.act;
    if (a === "search") openSearch();
    else if (a === "new-student") openStudentSheet();
    else if (a === "receive") openPay();
  });

  /* ======================================================= search (⌘K) */
  var cmdInput = $("#cmd-input"), cmdList = $("#cmd-list"), CMD = { items: [], active: 0 };
  function hl(text, q) {
    var raw = String(text), i = q ? raw.toLowerCase().indexOf(q) : -1;
    if (i < 0) return esc(raw);
    return esc(raw.slice(0, i)) + "<mark>" + esc(raw.slice(i, i + q.length)) + "</mark>" + esc(raw.slice(i + q.length));
  }
  function cmdGroups(q) {
    var match = function (it) { return !q || (it.label + " " + (it.meta || "") + " " + (it.id || "")).toLowerCase().indexOf(q) > -1; };
    var actions = [
      { label: "New student", meta: "People › Students", icon: "user-plus", run: function () { openStudentSheet(); } },
      { label: "Receive payment", meta: "Finance › Collections", icon: "hand-coins", run: function () { openPay(); } },
      { label: document.documentElement.classList.contains("dark") ? "Switch to light theme" : "Switch to dark theme", meta: "Appearance", icon: "moon", run: function () { SC.theme.toggle(); syncTheme(); } },
    ];
    var pages = NAV.map(function (n) {
      return { label: n.label, meta: n.module + (n.section ? " › " + n.section : ""), icon: n.icon, run: function () { if (n.key === "settings/website") location.href = "website.html"; else go("#/" + n.key); } };
    });
    var students = S.students.map(function (s) {
      return { label: fullName(s), meta: clsOf(s) + " · " + s.guardian, id: s.id, avatar: SC.initials(fullName(s)), run: function () { openDetail(s.id); } };
    });
    var receipts = S.payments.map(function (p) {
      return { label: p.receipt, meta: p.student + " · " + p.method + " · " + p.date, amount: p.amount, icon: "receipt", run: function () { go("#/finance/collections"); setTimeout(function () { flashRow('#col-body tr[data-rcp="' + p.receipt + '"]'); }, 80); } };
    });
    var staff = D.staff.map(function (st) {
      return { label: st.name, meta: st.role + " · " + st.email, icon: "briefcase", run: function () { go(st.role === "Teacher" ? "#/people/teachers" : "#/people/non-teaching-staff"); } };
    });
    if (!q) {
      return [
        ["Actions", actions.slice(0, 2)],
        ["Pages", pages.filter(function (p) { return ["Students", "Collections", "Dashboard"].indexOf(p.label) > -1; })],
        ["Recent students", students.slice(0, 4)],
      ];
    }
    return [
      ["Actions", actions.filter(match)],
      ["Pages", pages.filter(match).slice(0, 6)],
      ["Students", students.filter(match).slice(0, 6)],
      ["Receipts", receipts.filter(match).slice(0, 5)],
      ["Staff", staff.filter(match).slice(0, 4)],
    ].filter(function (g) { return g[1].length; });
  }
  function cmdRender() {
    var q = cmdInput.value.trim().toLowerCase(), groups = cmdGroups(q), idx = 0;
    CMD.items = [];
    if (!groups.length) {
      cmdList.innerHTML = '<div class="x-cmd-empty">Nothing matches “' + esc(cmdInput.value.trim()) + "”. Try a student's name, a receipt number or a page.</div>";
      cmdInput.removeAttribute("aria-activedescendant");
      return;
    }
    cmdList.innerHTML = groups.map(function (g, gi) {
      return '<div class="x-cmd-group" role="group" aria-labelledby="cmd-g' + gi + '"><div class="x-cmd-group-label" id="cmd-g' + gi + '">' + esc(g[0]) + "</div>" +
        g[1].map(function (it) {
          var i = idx++;
          CMD.items.push(it);
          var lead = it.avatar ? '<span class="avatar" aria-hidden="true">' + esc(it.avatar) + "</span>" : ic(it.icon || "arrow-right");
          var tail = it.id ? '<span class="x-id">' + hl(it.id, q) + "</span>" : it.amount ? '<span class="x-money">' + money(it.amount) + "</span>" : "";
          return '<div class="x-cmd-item" role="option" id="cmd-o' + i + '" data-i="' + i + '" aria-selected="false">' + lead + '<span class="x-cmd-item-text"><b style="font-weight:550">' + hl(it.label, q) + "</b><span>" + hl(it.meta || "", q) + "</span></span>" + tail + "</div>";
        }).join("") + "</div>";
    }).join("");
    CMD.active = 0;
    cmdSync();
  }
  function cmdSync() {
    $$(".x-cmd-item", cmdList).forEach(function (el) { el.setAttribute("aria-selected", String(+el.dataset.i === CMD.active)); });
    var a = $("#cmd-o" + CMD.active);
    if (a) { cmdInput.setAttribute("aria-activedescendant", a.id); a.scrollIntoView({ block: "nearest" }); }
  }
  function cmdRun(i) {
    var it = CMD.items[i]; if (!it) return;
    SC.close(dlgSearch);
    setTimeout(it.run, 20);
  }
  function openSearch() {
    if (dlgSearch.getAttribute("data-open") === "true") return;
    Pop.close(false);
    closeDrawer(false);
    cmdInput.value = "";
    cmdRender();
    SC.open(dlgSearch);
  }
  cmdInput.addEventListener("input", cmdRender);
  cmdInput.addEventListener("keydown", function (e) {
    var n = CMD.items.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!n) return;
      CMD.active = (CMD.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n; cmdSync();
    } else if (e.key === "Home" && n) { e.preventDefault(); CMD.active = 0; cmdSync(); }
    else if (e.key === "End" && n) { e.preventDefault(); CMD.active = n - 1; cmdSync(); }
    else if (e.key === "Enter") { e.preventDefault(); cmdRun(CMD.active); }
  });
  cmdList.addEventListener("mousemove", function (e) { var it = e.target.closest(".x-cmd-item"); if (it && +it.dataset.i !== CMD.active) { CMD.active = +it.dataset.i; cmdSync(); } });
  cmdList.addEventListener("click", function (e) { var it = e.target.closest(".x-cmd-item"); if (it) cmdRun(+it.dataset.i); });

  /* ======================================================= global keys */
  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey, k = (e.key || "").toLowerCase();
    if (mod && k === "k") {
      e.preventDefault();
      if (dlgSearch.getAttribute("data-open") === "true") SC.close(dlgSearch);
      else if (!overlayOpen()) openSearch();
      return;
    }
    if (mod && k === "b" && !overlayOpen() && !isMobile()) { e.preventDefault(); setCollapsed(app.dataset.collapsed !== "true", true); return; }
    if (e.key === "Escape" && !e.defaultPrevented && app.dataset.drawer === "open") closeDrawer(true);
  });

  /* ================================================================ boot */
  if (!location.hash) history.replaceState(null, "", "#/people/students");
  renderStudents();
  renderCollections();
  route(false);
})();
