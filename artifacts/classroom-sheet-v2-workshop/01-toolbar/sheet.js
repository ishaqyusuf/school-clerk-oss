/* 01 · Quiet toolbar
   Same tabs as today, but every section follows one rhythm:
   header (title switcher + one summary sentence) → tabs → ONE toolbar row → ONE clean list.
   Detail panels open beside the list on desktop and replace it on phone. */
(function () {
  "use strict";

  var I = function (n, s) { return window.SCIcons.icon(n, s || 16); };
  var esc = window.SC.esc, money = window.SC.money;

  var SECTIONS = [
    { id: "students", label: "Students" },
    { id: "attendance", label: "Attendance" },
    { id: "subjects", label: "Subjects" },
    { id: "payments", label: "Payments" },
    { id: "performance", label: "Performance" }
  ];
  var ADM = { NEW: "New admission", RETURNING: "Returning", NEEDS_CLASSIFICATION: "Needs classification" };
  var STATUS = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late" };
  var SEARCH_IDS = { "stu.q": "stu-q", "hist.q": "hist-q", "sub.q": "sub-q", "pay.q": "pay-q" };

  var H = null, C = null, S = null, io = null, press = null;
  var timers = [];

  /* ---------------- timers ---------------- */
  function later(fn, ms) {
    var t = setTimeout(function () { var i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); fn(); }, ms);
    timers.push(t); return t;
  }
  function cancel(t) { clearTimeout(t); var i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------------- state ---------------- */
  function freshAtt(mode) {
    return { mode: mode || "take", date: window.SC.data.today, type: "GENERAL", title: "Daily attendance", subject: "", period: "",
      marks: {}, remarks: {}, error: "", saving: false, highlight: null, limit: 40, loadingMore: false };
  }
  function initState() {
    var tab = null;
    try { tab = new URLSearchParams(location.search).get("classroomTab"); } catch (e) { tab = null; }
    return {
      d: window.SC.fresh(), classId: "jss1a",
      section: SECTIONS.some(function (s) { return s.id === tab; }) ? tab : "students",
      closed: false, loading: true, error: false, booted: false, booting: false, tok: 0, uid: 0,
      detail: null, menu: null, dialog: null, focusKey: null, returnKey: null, lastKey: null,
      dupCheck: "loading",
      stu: { q: "", sort: "name", dir: 1, view: "list", sel: {}, selecting: false, limit: 20, loadingMore: false, highlight: null },
      att: freshAtt(), hist: { q: "" },
      sub: { q: "", adding: false, name: "", desc: "", error: "", added: "", highlight: null },
      pay: { q: "", filter: "outstanding" },
      scores: {}, save: "idle", saveErr: 0, saveT: null,
      nform: null, aform: null, payForm: null, corr: null, ov: { dest: "" },
      bulkWas: false, suppress: false
    };
  }

  /* ---------------- data helpers ---------------- */
  function cls(id) { var k = id || S.classId; return S.d.classrooms.filter(function (c) { return c.id === k; })[0]; }
  function roster(id) { return S.d.rosters[id || S.classId] || (S.d.rosters[id || S.classId] = []); }
  function enrolled() { return roster().filter(function (s) { return s.enrolled; }); }
  function sessions() { return S.d.attendanceSessions[S.classId] || (S.d.attendanceSessions[S.classId] = []); }
  function charges(id) { return S.d.charges[id || S.classId] || (S.d.charges[id || S.classId] = []); }
  function subjects() { return S.d.subjects[S.classId] || (S.d.subjects[S.classId] = []); }
  function dups() { return S.d.duplicates[S.classId] || []; }
  function student(id) { return roster().filter(function (s) { return s.id === id; })[0]; }
  function sessionById(id) { return sessions().filter(function (s) { return s.id === id; })[0]; }
  function subjectById(id) { return subjects().filter(function (s) { return s.id === id; })[0]; }
  function shortId(id) { return String(id).replace(/^[^-]+-/, "").replace(/-/g, "").slice(0, 8); }
  function isPhone() { return !!C && C.viewport === "phone"; }
  function plural(n, a, b) { return n + " " + (n === 1 ? a : (b || a + "s")); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function uid(p) { S.uid += 1; return (p || "n") + S.uid.toString(36) + Date.now().toString(36).slice(-5); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function addDays(iso, n) { var d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function nowStamp() { var d = new Date(); return S.d.today + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
  function actor() { return C && C.role === "Admin" ? S.d.viewer.name : "You (" + (C ? C.role : "Staff") + ")"; }
  function termLabel() { return S.d.session.term.title + " · " + S.d.session.title; }
  function slug() { return cls().displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function filteredStudents() {
    var st = S.stu, q = st.q.trim().toLowerCase();
    var list = roster().filter(function (s) {
      if (!q) return true;
      return (s.studentName + " " + (s.otherName || "")).toLowerCase().indexOf(q) >= 0 || shortId(s.id).toLowerCase().indexOf(q) >= 0 || s.id.toLowerCase().indexOf(q) >= 0;
    });
    var key = { name: "studentName", gender: "gender", dob: "dob", created: "createdAt" }[st.sort];
    return list.slice().sort(function (a, b) {
      return String(a[key] || "").localeCompare(String(b[key] || "")) * st.dir || a.studentName.localeCompare(b.studentName);
    });
  }

  function sessStats(s) {
    var p = 0, l = 0, a = 0;
    s.records.forEach(function (r) { if (r.status === "PRESENT") p++; else if (r.status === "LATE") l++; else if (r.status === "ABSENT") a++; });
    var n = s.records.length;
    return { n: n, onlyPresent: p, late: l, present: p + l, absent: a, rate: pct(p + l, n) };
  }
  function attTotals() {
    var t = { sessions: 0, records: 0, attended: 0, absent: 0 };
    sessions().forEach(function (s) { var x = sessStats(s); t.sessions++; t.records += x.n; t.attended += x.present; t.absent += x.absent; });
    t.attPct = pct(t.attended, t.records); t.absPct = pct(t.absent, t.records);
    return t;
  }
  function sortedSessions() {
    return sessions().map(function (s, i) { return { s: s, i: i }; })
      .sort(function (a, b) { return b.s.date.localeCompare(a.s.date) || b.i - a.i; })
      .map(function (x) { return x.s; });
  }
  function payTotals(id) {
    var t = { billed: 0, received: 0, outstanding: 0, count: 0, paid: 0 };
    charges(id).forEach(function (c) { t.billed += c.amount; t.received += c.amountPaid; t.outstanding += c.outstanding; t.count++; if (c.status === "PAID") t.paid++; });
    t.collected = pct(t.received, t.billed);
    return t;
  }
  function chargeStatus(c) { c.outstanding = Math.max(0, c.amount - c.amountPaid); c.status = c.outstanding === 0 ? "PAID" : c.amountPaid ? "PART_PAID" : "PENDING"; }

  /* subjects / assessments */
  function aWeight(a) { return a.children && a.children.length ? a.children.reduce(function (n, c) { return n + (+c.weight || 0); }, 0) : (+a.weight || 0); }
  function totalWeight(sub) { return sub.assessments.reduce(function (n, a) { return n + aWeight(a); }, 0); }
  function leafItems(sub) {
    var out = [];
    sub.assessments.forEach(function (a) {
      if (a.children && a.children.length) a.children.forEach(function (c) { out.push({ id: c.id, title: c.title, parent: a.title, max: c.obtainable == null ? null : c.obtainable, weight: +c.weight || 0 }); });
      else out.push({ id: a.id, title: a.title, parent: null, max: a.obtainable == null ? null : a.obtainable, weight: +a.weight || 0 });
    });
    return out;
  }
  function sKey(subId, stuId, itemId) { return subId + "|" + stuId + "|" + itemId; }
  function isBad(v, max) { if (v === "" || v == null) return false; var n = Number(v); return isNaN(n) || n < 0 || (max != null && n > max); }
  function hasScore(v) { return v !== undefined && v !== "" && !isNaN(Number(v)); }
  function itemSubs(sub, itemId) { return enrolled().filter(function (s) { return hasScore(S.scores[sKey(sub.id, s.id, itemId)]); }).length; }
  function aSubs(sub, a) { return a.children && a.children.length ? a.children.reduce(function (n, c) { return n + itemSubs(sub, c.id); }, 0) : itemSubs(sub, a.id); }
  function subjSubs(sub) { return leafItems(sub).reduce(function (n, i) { return n + itemSubs(sub, i.id); }, 0); }
  function printCols(sub) {
    var out = [];
    sub.assessments.forEach(function (a) {
      if (a.print === false) return;
      var kids = a.children || [];
      if (kids.length && a.printMode !== "TOTAL") kids.forEach(function (c) { out.push({ label: c.title + " (" + (+c.weight || 0) + "%)", ids: [c.id] }); });
      else out.push({ label: a.title + " (" + aWeight(a) + "%)", ids: kids.length ? kids.map(function (c) { return c.id; }) : [a.id] });
    });
    return out;
  }
  function availableImports() {
    var have = subjects().map(function (s) { return s.title.toLowerCase(); });
    return S.d.unattachedSubjects.filter(function (n) { return have.indexOf(n.toLowerCase()) < 0; });
  }

  /* ---------------- small html helpers ---------------- */
  function spinner() { return '<span class="q-spin" aria-hidden="true">' + I("loader-circle", 14) + "</span>"; }
  function mx(id, arg, align) {
    var open = !!S.menu && S.menu.id === id && S.menu.arg === (arg == null ? null : String(arg));
    return 'data-menu="' + id + '"' + (arg != null ? ' data-id="' + esc(arg) + '"' : "") + (align ? ' data-align="' + align + '"' : "") +
      ' aria-haspopup="true" aria-expanded="' + open + '"';
  }
  function more(id, label) { return '<button type="button" class="btn btn-outline btn-icon btn-sm" ' + mx(id) + ' aria-label="' + (label || "More actions") + '">' + I("ellipsis") + "</button>"; }
  function segBtn(act, v, label, cur, extra) { return '<button type="button" data-act="' + act + '" data-id="' + esc(v) + '" aria-pressed="' + (v === cur) + '" ' + (extra || "") + ">" + label + "</button>"; }
  function mi(act, label, icon, o) {
    o = o || {};
    return '<button type="button" class="menu-item' + (o.destructive ? " is-destructive" : "") + '" role="menuitem" data-act="' + act + '"' +
      (o.id != null ? ' data-id="' + esc(o.id) + '"' : "") + (o.keep ? " data-keep" : "") + (o.disabled ? " disabled" : "") + ">" +
      (o.lead || (icon ? I(icon) : '<span class="q-mi-pad" aria-hidden="true"></span>')) +
      "<span" + (o.dir ? ' dir="auto"' : "") + ">" + label + "</span>" + (o.checked ? '<span class="menu-shortcut">' + I("check", 14) + "</span>" : "") + "</button>";
  }
  var SEP = '<div class="menu-sep" role="separator"></div>';
  function empty(icon, title, desc, action) {
    return '<div class="q-empty"><span class="q-empty-ic">' + I(icon, 18) + '</span><p class="q-empty-title">' + title + "</p>" +
      (desc ? '<p class="q-empty-desc">' + desc + "</p>" : "") + (action || "") + "</div>";
  }
  function errAlert(msg) { return '<div class="alert q-alert-err" role="alert">' + I("circle-alert") + '<div class="alert-title">' + esc(msg) + "</div></div>"; }
  function searchBox(id, bind, val, ph, label) {
    return '<div class="input-group q-search"><span class="input-addon">' + I("search", 15) + '</span><input id="' + id + '" class="input" type="search" autocomplete="off" data-bind="' + bind + '" data-rr value="' + esc(val) + '" placeholder="' + ph + '" aria-label="' + label + '">' +
      (val ? '<button type="button" class="btn btn-ghost btn-icon btn-sm q-search-x" data-act="clearSearch" data-id="' + bind + '" aria-label="Clear search">' + I("x", 14) + "</button>" : "") + "</div>";
  }
  function toolbar(left, mid, right) {
    return '<div class="q-tb">' + '<div class="q-tb-left">' + left + "</div>" + (mid ? '<div class="q-tb-mid">' + mid + "</div>" : "") + '<div class="q-tb-right">' + right + "</div></div>";
  }
  function moreSentinel(key, label) { return '<div class="q-more" data-more="' + key + '" role="status">' + spinner() + label + "</div>"; }
  function fInput(id, label, bind, val, o) {
    o = o || {};
    return '<div class="field' + (o.cls ? " " + o.cls : "") + '"><label class="label" for="' + id + '">' + label + (o.optional ? ' <span class="field-optional">optional</span>' : "") + "</label>" +
      '<input id="' + id + '" class="input' + (o.num ? " tnum" : "") + '" type="' + (o.type || "text") + '" data-bind="' + bind + '" value="' + esc(val == null ? "" : val) + '"' +
      (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.dir ? ' dir="auto"' : "") + (o.max ? ' max="' + o.max + '"' : "") + (o.im ? ' inputmode="' + o.im + '"' : "") +
      (o.rr ? " data-rr" : "") + (o.enter ? ' data-enter="' + o.enter + '"' : "") + (o.err ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : "") + ">" +
      (o.err ? '<p class="field-error" id="' + id + '-err">' + esc(o.err) + "</p>" : o.hint ? '<p class="field-description">' + o.hint + "</p>" : "") + "</div>";
  }
  function fSelect(id, label, bind, opts, val, o) {
    o = o || {};
    return '<div class="field' + (o.cls ? " " + o.cls : "") + '"><label class="label" for="' + id + '">' + label + "</label>" +
      '<select id="' + id + '" class="select" data-bind="' + bind + '"' + (o.rr ? " data-rr" : "") + (o.disabled ? " disabled" : "") + (o.err ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : "") + ">" +
      (o.placeholder ? '<option value="">' + o.placeholder + "</option>" : "") +
      opts.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(val) ? " selected" : "") + ">" + esc(p[1]) + "</option>"; }).join("") +
      "</select>" + (o.err ? '<p class="field-error" id="' + id + '-err">' + esc(o.err) + "</p>" : "") + "</div>";
  }
  function statusBadge(st) {
    return { PRESENT: '<span class="badge badge-success">Present</span>', LATE: '<span class="badge badge-warning">Late</span>', ABSENT: '<span class="badge badge-destructive">Absent</span>' }[st] || '<span class="badge badge-neutral">Not marked</span>';
  }
  function payBadge(st) {
    return { PAID: '<span class="badge badge-success">Paid</span>', PART_PAID: '<span class="badge badge-warning">Part paid</span>', PENDING: '<span class="badge badge-neutral">Pending</span>' }[st];
  }
  function lbl(text) { return '<span class="q-lbl">' + text + "</span>"; }

  /* ================================================================
     RENDER
     ================================================================ */
  function keyOf(el) {
    if (!el || !el.getAttribute || !el.dataset) return null;
    if (el.dataset.fk) return "fk:" + el.dataset.fk;
    if (el.id) return "id:" + el.id;
    if (el.dataset.act) return "a:" + el.dataset.act + ":" + (el.dataset.id || "") + ":" + (el.dataset.v || "") + ":" + (el.dataset.scope || "");
    if (el.dataset.menu) return "m:" + el.dataset.menu + ":" + (el.dataset.id || "");
    return null;
  }
  function findKey(k) {
    if (!k || !H) return null;
    var els = H.querySelectorAll("[data-fk],[id],[data-act],[data-menu]");
    for (var i = 0; i < els.length; i++) if (keyOf(els[i]) === k) return els[i];
    return null;
  }

  function render() {
    if (!H || !S) return;
    var a = document.activeElement, fk = null, ss = null, se = null;
    if (a && a !== document.body && H.contains(a)) { fk = keyOf(a); try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) { ss = null; } }
    var scroll = {};
    H.querySelectorAll("[data-scroll]").forEach(function (el) { scroll[el.dataset.scroll] = el.scrollTop; });

    var phone = isPhone();
    H.style.width = (!phone && S.detail && !S.closed) ? "min(100%, 72rem)" : "";
    H.innerHTML = S.closed ? closedHtml() : sheetHtml() + popHtml() + (S.dialog ? dialogHtml(S.dialog) : "");

    S.quietScroll = Date.now() + 200;
    H.querySelectorAll("[data-scroll]").forEach(function (el) { if (scroll[el.dataset.scroll] != null) el.scrollTop = scroll[el.dataset.scroll]; });
    positionPop();

    var target = null, restoreSel = false;
    if (S.dialog && S.dialog.just) {
      S.dialog.just = false;
      var dl = H.querySelector(".q-dialog");
      target = dl && (dl.querySelector("input:not([disabled]),select:not([disabled]),textarea") || dl.querySelector(".dialog-footer .btn:not([disabled])"));
    } else if (S.menu && S.menu.just) {
      S.menu.just = false;
      var p = H.querySelector(".q-pop");
      target = p && p.querySelector(".menu-item:not([disabled]), input, select, button:not([disabled])");
    } else if (S.detail && S.detail.just) {
      S.detail.just = false; target = H.querySelector("#detail-title");
    } else if (S.focusKey) {
      target = findKey(S.focusKey); S.focusKey = null;
    } else if (fk) {
      target = findKey(fk); restoreSel = ss != null;
    }
    if (target) {
      try { target.focus({ preventScroll: true }); if (restoreSel && target.setSelectionRange) target.setSelectionRange(ss, se); } catch (e) { /* non-text input */ }
    }
    observeMore();
  }

  function closedHtml() {
    return '<div class="q-closed">' + empty("panel-right", "Sheet closed", "In the product this returns to the Classrooms table.",
      '<button type="button" class="btn btn-default btn-sm" data-act="reopen">Reopen ' + esc(cls().displayName) + "</button>") + "</div>";
  }

  function sheetHtml() {
    var phone = isPhone(), det = S.detail;
    var primary = (phone && det) ? "" :
      '<section class="q-primary" aria-label="' + esc(cls().displayName) + ' overview">' + headerHtml() + tabsHtml() +
      (S.loading ? skeletonHtml() : S.error ? errorHtml() : sectionHtml()) + bulkHtml() + "</section>";
    return '<div class="q-sheet' + (phone ? " is-phone" : "") + (det ? " has-detail" : "") + '">' + primary +
      (det ? '<section class="q-detail" aria-labelledby="detail-title">' + detailHtml() + "</section>" : "") + "</div>";
  }

  /* ---------------- header + tabs ---------------- */
  function headerHtml() {
    var c = cls();
    return '<header class="q-head"><div class="q-head-row">' +
      '<button type="button" class="q-switch" ' + mx("class", null, "left") + ' aria-label="Switch classroom (current: ' + esc(c.displayName) + ')">' +
      '<span class="q-title" dir="auto">' + esc(c.displayName) + "</span>" + I("chevrons-up-down", 15) + "</button>" +
      '<span class="q-term">' + esc(termLabel()) + "</span>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm q-x" data-act="closeSheet" aria-label="Close sheet">' + I("x") + "</button>" +
      "</div>" +
      '<p class="q-summary">' + (S.loading ? '<span class="skeleton q-sk-line"></span>' : S.error ? "" : summaryHtml()) + "</p></header>";
  }
  function qlink(sec, text) { return '<button type="button" class="q-link tnum" data-act="go" data-id="' + sec + '" data-fk="sum-' + sec + '">' + text + "</button>"; }
  function summaryHtml() {
    var n = roster().length, ss = sessions(), t = attTotals(), pt = payTotals(), parts = [];
    var term = '<span class="q-summary-term">' + esc(termLabel()) + '<span class="q-sep" aria-hidden="true">·</span></span>';
    parts.push(qlink("students", n ? plural(n, "student") : "No students yet"));
    if (ss.length) parts.push(qlink("attendance", t.attPct + "% attendance") + "<span>&nbsp;over " + plural(ss.length, "session") + "</span>");
    else if (n) parts.push(qlink("attendance", "No attendance taken yet"));
    if (pt.count) parts.push(pt.outstanding ? qlink("payments", money(pt.outstanding) + " outstanding") : qlink("payments", "All fees paid"));
    return term + parts.join('<span class="q-sep" aria-hidden="true">·</span>');
  }
  function tabsHtml() {
    var counts = S.loading || S.error ? {} : { students: roster().length, attendance: sessions().length, subjects: subjects().length };
    return '<nav class="q-tabs-wrap" aria-label="Classroom sections"><div class="q-tabs" role="tablist">' +
      SECTIONS.map(function (s) {
        var sel = s.id === S.section;
        var extra = s.id === "performance" ? '<span class="q-soon">Soon</span>' : counts[s.id] != null ? '<span class="q-count">' + counts[s.id] + "</span>" : "";
        return '<button type="button" role="tab" id="tab-' + s.id + '" class="q-tab" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '" aria-controls="q-panel" data-act="go" data-id="' + s.id + '">' + s.label + extra + "</button>";
      }).join("") + "</div></nav>";
  }
  function sectionHtml() {
    var f = { students: studentsView, attendance: attendanceView, subjects: subjectsView, payments: paymentsView, performance: performanceView }[S.section];
    return '<div class="q-panel" role="tabpanel" id="q-panel" aria-labelledby="tab-' + S.section + '">' + f() + "</div>";
  }
  function skeletonHtml() {
    var rows = "";
    for (var i = 0; i < 8; i++) rows += '<div class="q-sk-row"><span class="skeleton q-sk-av"></span><span class="q-sk-lines"><span class="skeleton" style="width:' + (34 + (i * 7) % 20) + '%"></span><span class="skeleton" style="width:' + (52 + (i * 11) % 25) + '%"></span></span></div>';
    return '<div class="q-tb" aria-hidden="true"><span class="skeleton q-sk-search"></span><span class="skeleton q-sk-btn"></span></div>' +
      '<div class="q-body" aria-busy="true" role="status" aria-label="Loading classroom">' + rows + "</div>";
  }
  function errorHtml() {
    return '<div class="q-body"><div role="alert">' + empty("circle-alert", "Couldn’t load " + esc(cls().displayName), "Something went wrong while loading this classroom. Nothing was changed.",
      '<button type="button" class="btn btn-default btn-sm" data-act="retryLoad">' + I("rotate-ccw") + "Try again</button>") + "</div></div>";
  }

  /* ---------------- Students ---------------- */
  function studentsView() {
    var st = S.stu, list = filteredStudents(), all = roster();
    var sortLbl = { name: "Name", gender: "Gender", dob: "Date of birth", created: "Date added" }[st.sort];
    var left = searchBox("stu-q", "stu.q", st.q, "Search name or ID", "Search students");
    var mid = '<button type="button" class="btn btn-ghost btn-sm q-sort" ' + mx("sort") + ' aria-label="Sort students, currently by ' + sortLbl + (st.dir > 0 ? " ascending" : " descending") + '">' + I("arrow-up-down", 15) + lbl(sortLbl) + "</button>";
    var right = '<button type="button" class="btn btn-default btn-sm" data-act="addStudent" aria-label="Add student">' + I("user-plus") + lbl("Add student") + "</button>" + more("stuMore", "More student actions");
    var body;
    if (!all.length) body = empty("users", "No students in this class yet", "Enroll the first student to start taking attendance and billing fees.",
      '<button type="button" class="btn btn-default btn-sm" data-act="addStudent">' + I("user-plus") + "Enroll student</button>");
    else if (!list.length) body = empty("search", "No students match “" + esc(st.q) + "”", "Try another name or student ID.",
      '<button type="button" class="btn btn-outline btn-sm" data-act="clearSearch" data-id="stu.q">Clear search</button>');
    else body = st.view === "table" ? studentTable(list) : studentList(list);
    var bulk = Object.keys(st.sel).length > 0;
    return toolbar(left, mid, right) + '<div class="q-body' + (bulk ? " has-bulk" : "") + '" data-scroll="students">' + dupNotice() + body + "</div>";
  }
  function dupNotice() {
    if (!roster().length) return "";
    if (S.dupCheck === "loading") return '<div class="q-notice is-muted" role="status">' + spinner() + "<span>Checking student count and duplicate names…</span></div>";
    var g = dups();
    if (!g.length) return "";
    var affected = g.reduce(function (n, x) { return n + x.records; }, 0);
    var head = g.length === 1 ? "1 possible duplicate" : g.length + " possible duplicates · " + affected + " records affected";
    return g.map(function (x, i) {
      return '<div class="q-notice is-warn" role="status">' + I("triangle-alert", 15) + '<span class="q-notice-text">' + (i === 0 ? "<b>" + head + ":</b> " : "") +
        '<span dir="auto">' + esc(x.displayName) + "</span> · " + x.records + " records, keep the " + esc(x.survivor.className) + " record</span>" +
        '<button type="button" class="btn-link q-notice-act" data-act="merge" data-id="' + esc(x.key) + '">Review merge</button></div>';
    }).join("");
  }
  function admText(s) {
    var t = ADM[s.admissionStatus] || "—";
    return s.admissionStatus === "NEEDS_CLASSIFICATION" ? '<span class="q-warn-text">' + t + "</span>" : t;
  }
  function studentList(list) {
    var st = S.stu, shown = list.slice(0, st.limit), selN = Object.keys(st.sel).length, selecting = st.selecting || selN > 0;
    var allSel = list.every(function (s) { return st.sel[s.id]; });
    var h = "";
    if (selecting) h += '<div class="q-selhead"><label class="choice"><input type="checkbox" class="checkbox" data-act="selAll"' + (allSel ? " checked" : "") + "><span>Select all " + list.length + "</span></label>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="doneSelect">Done</button></div>';
    h += '<div class="q-list' + (selecting ? " is-selecting" : "") + '" role="list" aria-label="Students">' + shown.map(studentRow).join("") + "</div>";
    if (list.length > shown.length) h += moreSentinel("stu", "Loading more students…");
    return h;
  }
  function studentRow(s) {
    var sel = !!S.stu.sel[s.id];
    return '<div class="q-row q-srow' + (sel ? " is-selected" : "") + (S.stu.highlight === s.id ? " is-new" : "") + '" role="listitem" data-press="' + esc(s.id) + '">' +
      '<input type="checkbox" class="checkbox q-check" data-act="toggleSel" data-id="' + esc(s.id) + '"' + (sel ? " checked" : "") + ' aria-label="Select ' + esc(s.studentName) + '">' +
      '<button type="button" class="q-row-main" data-act="openStudent" data-id="' + esc(s.id) + '">' +
      '<span class="avatar" aria-hidden="true">' + esc(window.SC.initials(s.studentName)) + "</span>" +
      '<span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(s.studentName) + "</span>" +
      '<span class="q-row-sub"><span class="mono">ID ' + esc(shortId(s.id)) + "</span> · " + esc(s.gender || "—") + " · " + admText(s) + "</span></span></button>" +
      '<span class="q-row-aside">' + (s.guardianPhone ? '<span class="q-hover tnum">' + I("phone", 13) + esc(s.guardianPhone) + "</span>" : "") +
      (s.enrolled ? "" : '<span class="badge badge-warning">Not enrolled</span>') + "</span>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm q-row-menu" ' + mx("row", s.id) + ' aria-label="Actions for ' + esc(s.studentName) + '">' + I("ellipsis") + "</button></div>";
  }
  function studentTable(list) {
    var st = S.stu, shown = list.slice(0, st.limit), allSel = list.every(function (s) { return st.sel[s.id]; });
    var rows = shown.map(function (s) {
      var sel = !!st.sel[s.id];
      return "<tr" + (sel ? ' data-state="selected"' : "") + '><td class="q-tcheck"><input type="checkbox" class="checkbox" data-act="toggleSel" data-id="' + esc(s.id) + '"' + (sel ? " checked" : "") + ' aria-label="Select ' + esc(s.studentName) + '"></td>' +
        '<td><button type="button" class="q-cell-link" data-act="openStudent" data-id="' + esc(s.id) + '" dir="auto">' + esc(s.studentName) + "</button></td>" +
        '<td class="mono">' + esc(shortId(s.id)) + "</td><td>" + esc(s.gender || "—") + "</td>" +
        "<td>" + (s.enrolled ? '<span class="badge badge-success">Enrolled</span>' : '<span class="badge badge-warning">Not enrolled</span>') + "</td>" +
        "<td>" + admText(s) + '</td><td class="tnum">' + (s.dob ? esc(window.SC.fmtDate(s.dob)) : "—") + '</td><td dir="auto">' + esc(s.guardian || "—") + '</td><td class="tnum">' + esc(s.guardianPhone || "—") + "</td>" +
        '<td class="q-tmenu"><button type="button" class="btn btn-ghost btn-icon btn-sm" ' + mx("row", s.id) + ' aria-label="Actions for ' + esc(s.studentName) + '">' + I("ellipsis") + "</button></td></tr>";
    }).join("");
    return '<div class="table-wrap q-table-wrap"><table class="table q-table"><thead><tr><th class="q-tcheck"><input type="checkbox" class="checkbox" data-act="selAll" aria-label="Select all students"' + (allSel ? " checked" : "") + "></th>" +
      "<th>Student</th><th>ID</th><th>Gender</th><th>Status</th><th>Admission</th><th>Date of birth</th><th>Guardian</th><th>Phone</th><th><span class=\"sr-only\">Actions</span></th></tr></thead><tbody>" +
      rows + "</tbody></table></div>" + (list.length > shown.length ? moreSentinel("stu", "Loading more students…") : "");
  }
  function bulkHtml() {
    var n = Object.keys(S.stu.sel).length;
    if (S.section !== "students" || S.loading || S.error || !n) { S.bulkWas = false; return ""; }
    var enter = !S.bulkWas; S.bulkWas = true;
    return '<div class="q-bulk' + (enter ? " is-enter" : "") + '" role="region" aria-label="Bulk actions">' +
      '<span class="q-bulk-n tnum"><b>' + n + "</b> selected</span>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="deselect">Deselect</button><span class="q-grow"></span>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="assistBulk" aria-label="Ask assistant about selected students" title="Ask assistant">' + I("sparkles") + "</button>" +
      '<button type="button" class="btn btn-default btn-sm" data-act="exportSel">' + I("download") + "<span>Export CSV</span></button>" +
      (C.canManage ? '<button type="button" class="btn btn-ghost btn-icon btn-sm" ' + mx("bulk") + ' aria-label="More bulk actions">' + I("ellipsis") + "</button>" : "") + "</div>";
  }

  /* ---------------- Attendance ---------------- */
  function attendanceView() {
    var st = S.att;
    var seg = '<div class="q-seg" role="group" aria-label="Attendance mode">' + segBtn("attMode", "take", "Take", st.mode) + segBtn("attMode", "history", "History", st.mode) + "</div>";
    if (st.mode === "take") {
      var chip = esc(st.title || "Untitled session") + (st.period ? '<span class="q-muted"> · ' + esc(st.period) + "</span>" : "");
      var left = '<div class="q-date" role="group" aria-label="Attendance date">' +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="dayPrev" aria-label="Previous day">' + I("chevron-left") + "</button>" +
        '<button type="button" class="q-date-btn tnum" ' + mx("date", null, "left") + ' aria-label="Pick date, ' + esc(window.SC.fmtDay(st.date)) + '">' + I("calendar", 14) + "<span>" + esc(window.SC.fmtDay(st.date)) + "</span></button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="dayNext" aria-label="Next day"' + (st.date >= S.d.today ? " disabled" : "") + ">" + I("chevron-right") + "</button></div>" +
        '<button type="button" class="q-chip" ' + mx("session", null, "left") + ' aria-label="Session details: ' + esc(st.title) + '"><span class="q-chip-t" dir="auto">' + chip + "</span>" + I("chevron-down", 14) + "</button>";
      var right = '<button type="button" class="btn btn-default btn-sm" data-act="attSave" aria-label="Save attendance"' + (st.saving || !enrolled().length ? " disabled" : "") + ">" +
        (st.saving ? spinner() + lbl("Saving…") : I("save") + lbl("Save")) + "</button>" + more("attMore", "More attendance actions");
      return toolbar(left, seg, right) + '<div class="q-body is-take" data-scroll="att-take">' + takeBody() + "</div>";
    }
    var hl = searchBox("hist-q", "hist.q", S.hist.q, "Search sessions", "Search attendance sessions");
    return toolbar(hl, seg, more("histMore", "More history actions")) + '<div class="q-body" data-scroll="att-history">' + historyBody() + "</div>";
  }
  function takeBody() {
    var st = S.att, list = enrolled();
    if (!list.length) return empty("clipboard-list", "No students enrolled in this class for the active term", "Enrolled students appear here to be marked.",
      C.canManage ? '<button type="button" class="btn btn-outline btn-sm" data-act="addStudent">' + I("user-plus") + "Add student</button>" : "");
    var marked = list.filter(function (s) { return st.marks[s.id]; }).length;
    return (st.error ? errAlert(st.error) : "") + rosterHtml("att", list) +
      '<div class="q-att-foot" role="status"><span class="tnum"><b>' + marked + "</b> of " + list.length + " students marked</span>" +
      '<div class="progress q-foot-bar" aria-hidden="true"><span style="width:' + pct(marked, list.length) + '%"></span></div>' +
      (marked && marked < list.length ? '<span class="q-muted q-hide-phone">Partial saves are fine</span>' : "") + "</div>";
  }
  function rosterHtml(scope, list) {
    var st = S[scope], shown = scope === "att" ? list.slice(0, st.limit) : list;
    return '<div class="q-roster" role="list" aria-label="Roster">' + shown.map(function (s, i) {
      var m = st.marks[s.id] || "";
      return '<div class="q-att-row" role="listitem" data-st="' + m + '"><span class="q-num tnum">' + (i + 1) + "</span>" +
        '<span class="q-att-name" dir="auto">' + esc(s.studentName) + "</span>" +
        '<span class="q-pills" role="group" aria-label="Mark ' + esc(s.studentName) + '">' +
        ["PRESENT", "ABSENT", "LATE"].map(function (v) {
          return '<button type="button" class="q-pill" data-v="' + v + '" data-act="mark" data-scope="' + scope + '" data-id="' + esc(s.id) + '" aria-pressed="' + (m === v) + '" aria-label="' + STATUS[v] + '" title="' + STATUS[v] + (m === v ? " — tap again to clear" : "") + '">' + v.charAt(0) + "</button>";
        }).join("") + "</span>" +
        (m === "ABSENT" || m === "LATE" ? '<input class="input q-remark" id="rm-' + scope + "-" + esc(s.id) + '" data-bind="' + scope + ".remarks." + esc(s.id) + '" value="' + esc(st.remarks[s.id] || "") + '" placeholder="' + (m === "ABSENT" ? "Reason for absence (optional)" : "Remark (optional)") + '" aria-label="Remark for ' + esc(s.studentName) + '">' : "") +
        "</div>";
    }).join("") + "</div>" + (shown.length < list.length ? moreSentinel("att", "Loading more students…") : "");
  }
  function historyBody() {
    var all = sortedSessions();
    if (!all.length) return empty("calendar-check", "No attendance records yet", "Saved sessions appear here.",
      '<button type="button" class="btn btn-default btn-sm" data-act="attMode" data-id="take">Take attendance</button>');
    var t = attTotals(), q = S.hist.q.trim().toLowerCase();
    var list = q ? all.filter(function (s) { return (s.title + " " + (s.subject || "") + " " + (s.period || "") + " " + s.takenBy + " " + window.SC.fmtDay(s.date)).toLowerCase().indexOf(q) >= 0; }) : all;
    var h = '<p class="q-context tnum">' + plural(t.sessions, "session") + " · " + plural(t.records, "record") + " · <b>" + t.attPct + "% attended</b> (" + t.attended + ") · " + t.absPct + "% absent (" + t.absent + ")</p>";
    if (!list.length) return h + empty("search", "No sessions match “" + esc(S.hist.q) + "”", "", '<button type="button" class="btn btn-outline btn-sm" data-act="clearSearch" data-id="hist.q">Clear search</button>');
    return h + '<div class="q-list" role="list" aria-label="Attendance sessions">' + list.map(histRow).join("") + "</div>";
  }
  function histRow(s) {
    var x = sessStats(s);
    var meta = [window.SC.fmtDay(s.date), s.subject, s.period, s.takenBy].filter(Boolean).map(esc).join(" · ");
    return '<div class="q-row' + (S.att.highlight === s.id ? " is-new" : "") + '" role="listitem">' +
      '<button type="button" class="q-row-main" data-act="openSession" data-id="' + esc(s.id) + '"><span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(s.title) + "</span>" +
      '<span class="q-row-sub">' + meta + "</span></span></button>" +
      '<span class="q-row-aside q-hist-aside"><span class="q-row-sub tnum q-hide-phone">' + x.present + " present · " + x.absent + " absent</span>" +
      '<span class="q-rate" title="' + x.rate + '% attended"><span class="q-rate-bar" aria-hidden="true"><span style="width:' + x.rate + '%"></span></span><span class="tnum">' + x.rate + "%</span></span></span>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm q-row-menu" ' + mx("hist", s.id) + ' aria-label="Actions for ' + esc(s.title) + ", " + esc(window.SC.fmtDay(s.date)) + '">' + I("ellipsis") + "</button></div>";
  }
  function sessionFields(scope) {
    var st = S[scope];
    return '<div class="field"><span class="label" id="' + scope + '-type-l">Attendance type</span><div class="q-seg q-seg-full" role="group" aria-labelledby="' + scope + '-type-l">' +
      segBtn("attType", "GENERAL", "General class", st.type, 'data-scope="' + scope + '" data-keep') + segBtn("attType", "SUBJECT", "Subject", st.type, 'data-scope="' + scope + '" data-keep') + "</div></div>" +
      (st.type === "SUBJECT" ? fSelect(scope + "-subject", "Subject", scope + ".subject", subjects().map(function (x) { return [x.title, x.title]; }), st.subject, { rr: true, placeholder: "Choose subject…" }) : "") +
      fInput(scope + "-title", "Session title", scope + ".title", st.title, { dir: true }) +
      fInput(scope + "-period", "Period / time", scope + ".period", st.period, { optional: true, ph: "e.g. Period 2 or 9:00 am" });
  }

  /* ---------------- Subjects ---------------- */
  function subjectsView() {
    var st = S.sub, all = subjects(), q = st.q.trim().toLowerCase();
    var list = q ? all.filter(function (s) { return s.title.toLowerCase().indexOf(q) >= 0; }) : all;
    var left = searchBox("sub-q", "sub.q", st.q, "Search subjects", "Search subjects");
    var right = '<button type="button" class="btn btn-default btn-sm" data-act="subAdd" aria-label="Add subject" aria-expanded="' + st.adding + '">' + I("plus") + lbl("Add subject") + "</button>" + more("subMore", "More subject actions");
    var body = st.adding ? subForm() : "";
    if (!all.length) { if (!st.adding) body += empty("book-open", "No subjects yet", "Add the subjects taught in this class, or import them from the school catalog.", '<button type="button" class="btn btn-default btn-sm" data-act="subAdd">' + I("plus") + "Add subject</button>"); }
    else if (!list.length) body += empty("search", "No subjects match “" + esc(st.q) + "”", "", '<button type="button" class="btn btn-outline btn-sm" data-act="clearSearch" data-id="sub.q">Clear search</button>');
    else body += '<div class="q-list" role="list" aria-label="Subjects">' + list.map(subRow).join("") + "</div>";
    return toolbar(left, "", right) + '<div class="q-body" data-scroll="subjects">' + body + "</div>";
  }
  function subForm() {
    var st = S.sub;
    return '<div class="q-inline-form" role="group" aria-label="Add subject"><div class="q-if-fields">' +
      fInput("sub-name", "Subject name", "sub.name", st.name, { ph: "e.g. Basic Technology", err: st.error, enter: "subSave", dir: true }) +
      fInput("sub-desc", "Description", "sub.desc", st.desc, { optional: true, enter: "subSave" }) + "</div>" +
      (st.added && !st.error ? '<p class="q-ok-text" role="status">' + I("check", 14) + "Added " + esc(st.added) + " — add another or close.</p>" : "") +
      '<div class="q-if-actions"><button type="button" class="btn btn-ghost btn-sm" data-act="subCancel">Close</button><button type="button" class="btn btn-default btn-sm" data-act="subSave">Save subject</button></div></div>';
  }
  function subRow(s) {
    var n = s.assessments.length, w = totalWeight(s);
    var meta = !n ? '<span class="q-warn-text">No assessments</span>' : w !== 100 ? plural(n, "assessment") + ' · <span class="q-warn-text">Weights ' + w + "%</span>" : plural(n, "assessment") + " · " + w + "% weighted";
    if (s.description) meta += " · " + esc(s.description);
    return '<div class="q-row' + (S.sub.highlight === s.id ? " is-new" : "") + '" role="listitem">' +
      '<button type="button" class="q-row-main" data-act="openSubject" data-id="' + esc(s.id) + '"><span class="q-sub-ic" aria-hidden="true">' + I("book-open", 15) + "</span>" +
      '<span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(s.title) + '</span><span class="q-row-sub">' + meta + "</span></span>" +
      '<span class="q-chev" aria-hidden="true">' + I("chevron-right") + "</span></button>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm q-row-menu" ' + mx("subRow", s.id) + ' aria-label="Actions for ' + esc(s.title) + '">' + I("ellipsis") + "</button></div>";
  }

  /* ---------------- Payments ---------------- */
  function paymentsView() {
    var st = S.pay, all = charges(), t = payTotals();
    var seg = '<div class="q-seg" role="group" aria-label="Filter charges">' + segBtn("payFilter", "outstanding", "Outstanding", st.filter) + segBtn("payFilter", "settled", "Settled", st.filter) + segBtn("payFilter", "all", "All", st.filter) + "</div>";
    var left = searchBox("pay-q", "pay.q", st.q, "Search students", "Search charges by student");
    var right = '<button type="button" class="btn btn-default btn-sm" data-act="receive" aria-label="Receive payment"' + (t.outstanding ? "" : " disabled") + ">" + I("hand-coins") + lbl('<span class="q-hide-phone">Receive payment</span><span class="q-only-phone">Receive</span>') + "</button>" + more("payMore", "More payment actions");
    if (!all.length) return toolbar(left, seg, right) + '<div class="q-body" data-scroll="payments">' + empty("receipt", "No student charges", "Charges appear here once fees are applied to students in this class.", "") + "</div>";
    var q = st.q.trim().toLowerCase();
    var list = all.filter(function (c) {
      if (st.filter === "outstanding" && !c.outstanding) return false;
      if (st.filter === "settled" && c.outstanding) return false;
      return !q || c.studentName.toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return b.outstanding - a.outstanding || a.studentName.localeCompare(b.studentName); });
    var outN = all.filter(function (c) { return c.outstanding; }).length;
    var h = '<p class="q-context tnum">' + money(t.billed) + " billed · " + money(t.received) + " received · <b>" + money(t.outstanding) + " outstanding</b> — " + t.collected + "% collected (" + t.paid + "/" + t.count + " paid)</p>" +
      '<div class="progress q-collect" role="progressbar" aria-label="Collected" aria-valuenow="' + t.collected + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + t.collected + '%"></span></div>' +
      '<p class="q-listhead tnum">' + outN + " outstanding, " + (all.length - outN) + " settled</p>";
    if (!list.length) h += empty(q ? "search" : "circle-check", q ? "No charges match “" + esc(st.q) + "”" : st.filter === "outstanding" ? "Nothing outstanding" : "No settled charges yet", "", q ? '<button type="button" class="btn btn-outline btn-sm" data-act="clearSearch" data-id="pay.q">Clear search</button>' : "");
    else h += '<div class="q-list q-pay" role="list" aria-label="Charges">' + list.map(payRow).join("") + "</div>";
    return toolbar(left, seg, right) + '<div class="q-body" data-scroll="payments">' + h + "</div>";
  }
  function payRow(c) {
    return '<div class="q-row" role="listitem">' +
      '<button type="button" class="q-row-main" data-act="openStudentPay" data-id="' + esc(c.studentId) + '" data-fk="pay-' + esc(c.id) + '">' +
      '<span class="avatar" aria-hidden="true">' + esc(window.SC.initials(c.studentName)) + "</span>" +
      '<span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(c.studentName) + "</span>" +
      '<span class="q-row-sub">' + payBadge(c.status) + " " + esc(c.title) + (c.stream ? " · " + esc(c.stream) : "") + "</span></span></button>" +
      '<span class="q-amt tnum"><b>' + (c.outstanding ? money(c.outstanding) : money(c.amountPaid)) + "</b><small>" + (c.outstanding ? (c.amountPaid ? "paid " + money(c.amountPaid) : "of " + money(c.amount)) : "paid in full") + "</small></span>" +
      (c.outstanding ? '<button type="button" class="btn btn-outline btn-sm q-rec" data-act="record" data-id="' + esc(c.id) + '" aria-label="Record payment for ' + esc(c.studentName) + '">Record</button>' : '<span class="q-rec q-rec-pad" aria-hidden="true"></span>') + "</div>";
  }

  /* ---------------- Performance ---------------- */
  function performanceView() {
    return '<div class="q-body" data-scroll="perf">' + empty("chart-line", "Performance is coming soon", "Class average, subject averages and rankings will live here once scores are recorded.", "") + "</div>";
  }

  /* ================================================================
     DETAIL PANELS
     ================================================================ */
  function panel(o) {
    var phone = isPhone();
    return '<div class="q-dhead">' +
      (phone ? '<button type="button" class="btn btn-ghost btn-icon btn-sm q-back" data-act="closeDetail" aria-label="Back to ' + esc(cls().displayName) + '">' + I("arrow-left") + "</button>" : "") +
      '<div class="q-dhead-text"><h3 class="q-dtitle" id="detail-title" tabindex="-1" dir="auto">' + o.title + "</h3>" + (o.sub ? '<p class="q-dsub">' + o.sub + "</p>" : "") + "</div>" +
      (o.actions ? '<div class="q-dactions">' + o.actions + "</div>" : "") +
      (phone ? "" : '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="closeDetail" aria-label="Close panel">' + I("x") + "</button>") + "</div>" +
      (o.mode ? '<div class="q-dmode">' + o.mode + "</div>" : "") +
      '<div class="q-dbody" data-scroll="detail-' + S.detail.type + '">' + o.body + "</div>" +
      (o.foot ? '<div class="q-dfoot">' + o.foot + "</div>" : "");
  }
  function notFound(title, desc) {
    return panel({ title: title, body: empty("circle-alert", title, desc, ""), foot: '<button type="button" class="btn btn-outline" data-act="closeDetail">Close</button>' });
  }
  function detailHtml() {
    var d = S.detail;
    if (d.type === "student") return studentPanel(d);
    if (d.type === "new") return newStudentPanel();
    if (d.type === "session") return sessionPanel(d);
    if (d.type === "correct") return correctPanel(d);
    if (d.type === "subject") return subjectPanel(d);
    if (d.type === "pay") return payPanel();
    return "";
  }

  /* Student overview (S6) */
  function studentPanel(d) {
    var s = student(d.id);
    if (!s) return notFound("Student not found", "This student is no longer in " + esc(cls().displayName) + ". They may have been moved, merged or deleted.");
    var c = cls();
    var actions = '<button type="button" class="btn btn-outline btn-sm" data-act="reportCard" data-id="' + esc(s.id) + '" aria-label="Report card">' + I("file-text") + lbl("Report card") + "</button>" +
      (C.canManage ? '<button type="button" class="btn btn-outline btn-sm" data-act="editStudent" data-id="' + esc(s.id) + '" aria-label="Edit student">' + I("pencil") + lbl("Edit") + "</button>" : "");
    var mode = '<div class="q-seg q-seg-full" role="group" aria-label="Student sections">' +
      ["overview", "academics", "attendance", "payments"].map(function (t) { return segBtn("stuTab", t, cap(t), d.tab); }).join("") + "</div>";
    var body = { overview: stuOverview, academics: stuAcademics, attendance: stuAttendance, payments: stuPayments }[d.tab](s, c);
    return panel({ title: esc(s.studentName), sub: esc(c.displayName) + " · " + esc(s.gender || "—") + (s.enrolled ? "" : ' · <span class="q-warn-text">Not enrolled this term</span>'), actions: actions, mode: mode, body: body });
  }
  function stuOverview(s, c) {
    var rows = [["Student ID", '<span class="mono">' + esc(shortId(s.id)) + "</span>"], ["Current class", esc(c.displayName)], ["Current term", esc(termLabel()) + (s.enrolled ? "" : " · not enrolled")],
      ["Gender", esc(s.gender || "—")], ["Date of birth", s.dob ? esc(window.SC.fmtDate(s.dob)) : "—"], ["Admission", admText(s)],
      ["Guardian", '<span dir="auto">' + esc(s.guardian || "—") + "</span>"], ["Guardian phone", '<span class="tnum">' + esc(s.guardianPhone || "—") + "</span>"]];
    var h = '<dl class="q-dl">' + rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("") + "</dl>";
    if (C.canManage) {
      var opts = S.d.classrooms.filter(function (x) { return x.id !== S.classId; }).map(function (x) { return [x.id, x.displayName]; });
      h += '<div class="q-move"><label class="label" for="ov-dest">Move to another class</label><div class="q-move-row">' +
        '<select id="ov-dest" class="select" data-bind="ov.dest" data-rr><option value="">Choose class…</option>' + opts.map(function (p) { return '<option value="' + p[0] + '"' + (S.ov.dest === p[0] ? " selected" : "") + ">" + esc(p[1]) + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="btn btn-outline btn-sm" data-act="ovMove" data-id="' + esc(s.id) + '"' + (S.ov.dest ? "" : " disabled") + ">Move</button></div></div>";
    }
    return h;
  }
  function stuAcademics(s) {
    var subs = subjects();
    if (!subs.length) return empty("book-open", "No subjects in this class yet", "", "");
    return '<p class="q-context">Scores entered this term, per subject.</p><div class="q-list" role="list">' + subs.map(function (sub) {
      var items = leafItems(sub).filter(function (i) { return i.weight > 0; }), got = 0, max = 0, n = 0;
      items.forEach(function (i) { var v = S.scores[sKey(sub.id, s.id, i.id)]; if (hasScore(v)) { got += Number(v); n++; } if (i.max) max += i.max; });
      var meta = !items.length ? '<span class="q-muted">No weighted assessments</span>' : n ? n + " of " + items.length + " scored · " + got + (max ? " / " + max : "") + " pts" : "No scores yet";
      return '<div class="q-row" role="listitem"><span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(sub.title) + '</span><span class="q-row-sub tnum">' + meta + "</span></span>" +
        (items.length ? '<button type="button" class="btn btn-ghost btn-sm" data-act="enterScores" data-id="' + esc(sub.id) + '">Enter scores</button>' : "") + "</div>";
    }).join("") + "</div>";
  }
  function stuAttendance(s) {
    var recs = sortedSessions().map(function (ses) { return { ses: ses, r: ses.records.filter(function (r) { return r.studentId === s.id; })[0] }; }).filter(function (x) { return x.r; });
    if (!recs.length) return empty("calendar-check", "No attendance recorded yet", "Sessions that include this student appear here.", "");
    var p = 0, l = 0, a = 0;
    recs.forEach(function (x) { if (x.r.status === "PRESENT") p++; else if (x.r.status === "LATE") l++; else a++; });
    return '<p class="q-context tnum">' + plural(recs.length, "session") + " · " + p + " present · " + l + " late · " + a + " absent</p>" +
      '<div class="q-list" role="list">' + recs.map(function (x) {
        return '<div class="q-row" role="listitem"><span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(x.ses.title) + '</span><span class="q-row-sub">' + esc(window.SC.fmtDay(x.ses.date)) + (x.r.remarks ? " · " + esc(x.r.remarks) : "") + "</span></span>" + statusBadge(x.r.status) + "</div>";
      }).join("") + "</div>";
  }
  function stuPayments(s) {
    var list = charges().filter(function (c) { return c.studentId === s.id; });
    if (!list.length) return empty("receipt", "No charges for this student", "", "");
    var b = 0, p = 0;
    list.forEach(function (c) { b += c.amount; p += c.amountPaid; });
    return '<p class="q-context tnum">' + money(b) + " billed · " + money(p) + " paid · <b>" + money(b - p) + " outstanding</b></p>" +
      '<div class="q-list" role="list">' + list.map(function (c) {
        return '<div class="q-row" role="listitem"><span class="q-row-text"><span class="q-row-title">' + esc(c.title) + '</span><span class="q-row-sub">' + payBadge(c.status) + ' <span class="tnum">' + (c.outstanding ? money(c.outstanding) + " outstanding" : "paid in full") + "</span></span></span>" +
          (c.outstanding ? '<button type="button" class="btn btn-outline btn-sm" data-act="record" data-id="' + esc(c.id) + '">Record</button>' : "") + "</div>";
      }).join("") + "</div>";
  }

  /* New student (S10) */
  function newStudentPanel() {
    var f = S.nform, c = cls(f.classId);
    if (f.loading) return panel({ title: "New student", sub: esc(c.displayName), body: '<p class="q-loading" role="status">' + spinner() + "Loading your registration workspace…</p>" +
      '<div class="q-sk-form"><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>' });
    if (f.done) {
      var dn = f.done;
      return panel({
        title: "New student", sub: esc(cls(dn.classId).displayName),
        body: '<div class="q-success" role="status"><span class="q-success-ic">' + I("circle-check", 22) + '</span><p class="q-empty-title">Student created</p>' +
          '<p><span dir="auto">' + esc(dn.name) + "</span> was added to " + esc(cls(dn.classId).displayName) + " for " + esc(termLabel()) + ".</p>" +
          '<p class="q-muted tnum">' + (dn.received ? money(dn.received) + " received" : "No payment received") + " · " + money(dn.pending) + " pending</p></div>",
        foot: '<button type="button" class="btn btn-outline" data-act="nfCreateNew">' + I("user-plus") + "Create new</button>" +
          '<button type="button" class="btn btn-outline" data-act="closeDetail">Close</button>' +
          (dn.received ? '<button type="button" class="btn btn-default" data-act="nfReceipt">' + I("receipt") + "View receipt</button>" :
            dn.pending ? '<button type="button" class="btn btn-default" data-act="nfApply">' + I("hand-coins") + "Apply payment</button>" : "")
      });
    }
    var e = f.err || {};
    var fees = S.d.feePreview, anyPay = Object.keys(f.pays).length > 0, feeHtml;
    if (f.fee === "loading") feeHtml = '<p class="q-loading" role="status">' + spinner() + "Loading fee preview…</p>";
    else if (f.fee === "error") feeHtml = '<div class="alert q-alert-err" role="alert">' + I("circle-alert") + '<div class="alert-title">Couldn’t load the fee preview for ' + esc(c.displayName) + "</div>" +
      '<div class="alert-description"><button type="button" class="btn btn-outline btn-sm" data-act="nfRetry">' + I("rotate-ccw") + "Retry fee preview</button></div></div>";
    else {
      var total = fees.reduce(function (n, x) { return n + x.amount; }, 0);
      feeHtml = '<div class="q-fees">' + fees.map(function (x, i) {
        var pay = f.pays[i];
        return '<div class="q-fee"><span class="q-fee-t">' + esc(x.title) + '</span><span class="tnum q-fee-a">' + money(x.amount) + "</span>" +
          (pay == null ? '<button type="button" class="btn btn-ghost btn-sm" data-act="nfAddFee" data-id="' + i + '">' + I("plus", 14) + "Add payment</button>" :
            '<span class="q-fee-pay"><span class="input-group"><span class="input-addon">₦</span><input id="nf-pay-' + i + '" class="input tnum" inputmode="numeric" data-bind="nform.pays.' + i + '" value="' + esc(pay) + '" aria-label="Amount paid now for ' + esc(x.title) + '"></span>' +
            '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="nfRemoveFee" data-id="' + i + '" aria-label="Remove payment for ' + esc(x.title) + '">' + I("x") + "</button></span>") + "</div>";
      }).join("") + '<div class="q-fee q-fee-total"><span class="q-fee-t">Total this term</span><span class="tnum q-fee-a">' + money(total) + "</span><span></span></div></div>" +
        (e.pay ? '<p class="field-error">' + esc(e.pay) + "</p>" : "") +
        (anyPay ? '<div class="field-grid">' + fSelect("nf-method", "Payment method", "nform.method", [["Cash", "Cash"], ["Bank transfer", "Bank transfer"], ["POS", "POS"]], f.method) +
          fInput("nf-pdate", "Payment date", "nform.payDate", f.payDate, { type: "date", max: S.d.today }) +
          fInput("nf-ref", "Payment reference", "nform.ref", f.ref, { optional: true, ph: "e.g. TRF-20261012", cls: "q-span2" }) + "</div>" : "");
    }
    var classOpts = S.d.classrooms.map(function (x) { return [x.id, x.displayName]; });
    var body = '<div class="q-form">' +
      '<fieldset class="fieldset"><legend class="legend">Student</legend><div class="field-grid">' +
      fInput("nf-first", "First name", "nform.first", f.first, { err: e.first, dir: true }) +
      fInput("nf-sur", "Surname", "nform.surname", f.surname, { err: e.surname, dir: true }) +
      fInput("nf-other", "Other name", "nform.other", f.other, { optional: true, dir: true }) +
      fSelect("nf-gender", "Gender", "nform.gender", [["Female", "Female"], ["Male", "Male"]], f.gender, { placeholder: "Choose…", err: e.gender }) +
      fInput("nf-dob", "Date of birth", "nform.dob", f.dob, { type: "date", max: S.d.today }) +
      fSelect("nf-adm", "Admission status for this term", "nform.admission", Object.keys(ADM).map(function (k) { return [k, ADM[k]]; }), f.admission) +
      "</div></fieldset>" +
      '<fieldset class="fieldset"><legend class="legend">Class</legend><div class="field-grid">' +
      fSelect("nf-class", "Classroom", "nform.classId", classOpts, f.classId, { rr: true }) +
      fInput("nf-stream", "Stream / sub-class", "nform.stream", f.stream, { optional: true }) + "</div></fieldset>" +
      '<fieldset class="fieldset"><legend class="legend">Fees &amp; payments</legend>' + feeHtml + "</fieldset>" +
      '<details class="q-collapse"' + (f.parentOpen ? " open" : "") + '><summary data-act="toggleParent">' + I("chevron-right", 15) + 'Parent / guardian <span class="field-optional">optional</span></summary>' +
      '<div class="field-grid">' + fInput("nf-pname", "Name", "nform.pName", f.pName, { dir: true, cls: "q-span2" }) +
      fInput("nf-phone", "Phone", "nform.pPhone", f.pPhone, { type: "tel", im: "tel" }) + fInput("nf-phone2", "Phone 2", "nform.pPhone2", f.pPhone2, { type: "tel", im: "tel", optional: true }) + "</div></details>" +
      "</div>";
    return panel({
      title: "New student", sub: esc(c.displayName) + " · " + esc(termLabel()), body: body,
      foot: '<button type="button" class="btn btn-outline" data-act="closeDetail">Cancel</button><button type="button" class="btn btn-default" data-act="nfSave"' + (f.saving ? " disabled" : "") + ">" + (f.saving ? spinner() + "Saving…" : "Save student") + "</button>"
    });
  }

  /* Session details (A9) */
  function sessionPanel(d) {
    var s = sessionById(d.id);
    if (!s) return notFound("Session not found", "This attendance session no longer exists. It may have been deleted.");
    var x = sessStats(s);
    var sub = [window.SC.fmtDate(s.date), s.takenBy, s.subject, s.period].filter(Boolean).map(esc).join(" · ");
    var actions = C.isAdmin ? '<button type="button" class="btn btn-ghost btn-icon btn-sm" ' + mx("sess", s.id) + ' aria-label="Session actions">' + I("ellipsis") + "</button>" : "";
    var body = '<div><p class="q-context tnum"><b>' + x.rate + "% attended</b> · " + plural(x.n, "student") + " · " + x.present + " present (incl. " + x.late + " late) · " + x.absent + " absent · 0 excused · 0 on leave</p>" +
      '<div class="q-rate-wide" aria-hidden="true"><span style="width:' + x.rate + '%"></span></div></div>' +
      '<section><h4 class="q-h4">Revision history</h4><ol class="q-timeline">' + s.history.slice().reverse().map(function (h) {
        return '<li><span class="badge ' + (h.action === "Corrected" ? "badge-info" : "badge-neutral") + '">' + esc(h.action) + "</span><span><b>" + esc(h.actor) + '</b> · <span class="tnum q-muted">' + esc(h.at) + '</span><br><span class="q-muted">' + esc(h.summary) + "</span></span></li>";
      }).join("") + "</ol></section>" +
      '<section><h4 class="q-h4">Students</h4><div class="q-list" role="list">' + s.records.map(function (r, i) {
        var st = student(r.studentId);
        return '<div class="q-row q-ses-row" role="listitem"><span class="q-num tnum">' + (i + 1) + '</span><span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(st ? st.studentName : "Former student") + "</span>" +
          '<span class="q-row-sub">' + (r.remarks ? esc(r.remarks) : '<span class="q-muted">No remark</span>') + "</span></span>" + statusBadge(r.status) + "</div>";
      }).join("") + "</div></section>";
    return panel({ title: esc(s.title), sub: sub, actions: actions, body: body,
      foot: '<button type="button" class="btn btn-outline" data-act="closeDetail">Close</button><button type="button" class="btn btn-default" data-act="correctSession" data-id="' + esc(s.id) + '">' + I("pencil") + "Correct session</button>" });
  }
  /* Correct session (A10) */
  function correctPanel(d) {
    var s = sessionById(d.id), c = S.corr;
    if (!s || !c) return notFound("Session not found", "This attendance session no longer exists.");
    var list = enrolled();
    var marked = list.filter(function (x) { return c.marks[x.id]; }).length;
    var body = (c.error ? errAlert(c.error) : "") + '<div class="q-form q-form-tight">' + sessionFields("corr") +
      fInput("corr-date", "Date", "corr.date", c.date, { type: "date", max: S.d.today }) + "</div>" +
      '<h4 class="q-h4">Marks <span class="q-muted tnum">· ' + marked + " of " + list.length + " marked</span></h4>" + rosterHtml("corr", list);
    return panel({ title: "Correct session", sub: esc(s.title) + " · " + esc(window.SC.fmtDay(s.date)), body: body,
      foot: '<button type="button" class="btn btn-outline" data-act="cancelCorrection">Cancel</button><button type="button" class="btn btn-default" data-act="saveCorrection"' + (c.saving ? " disabled" : "") + ">" + (c.saving ? spinner() + "Saving…" : "Save correction") + "</button>" });
  }

  /* Subject workspace (U4–U8) */
  function subjectPanel(d) {
    var sub = subjectById(d.id);
    if (!sub) return notFound("Subject not found", "This subject is no longer attached to " + esc(cls().displayName) + ".");
    var items = leafItems(sub), w = totalWeight(sub), grouped = sub.assessments.filter(function (a) { return a.children && a.children.length; }).length;
    var actions = '<button type="button" class="btn btn-outline btn-sm" ' + mx("record", sub.id) + ' aria-label="Record submission">' + I("notebook-pen") + lbl("Record submission") + I("chevron-down", 14) + "</button>";
    var mode = '<div class="q-seg q-seg-full" role="group" aria-label="Workspace mode">' + segBtn("wsMode", "assessments", "Assessments", d.mode) + segBtn("wsMode", "scores", "Scores", d.mode) + "</div>" +
      '<p class="q-context tnum">' + plural(items.length, "score item") + " · " + plural(subjSubs(sub), "submission") + " · " + (w === 100 ? w + "% weighted" : '<span class="q-warn-text">' + w + "% weighted</span>") + " · " + grouped + " grouped</p>";
    var body = d.mode === "scores" ? scoresHtml(sub) : (S.aform ? aFormHtml(sub) : assessmentsHtml(sub));
    return panel({ title: esc(sub.title), sub: esc(cls().displayName) + " · " + plural(enrolled().length, "student"), actions: actions, mode: mode, body: body });
  }
  function assessmentsHtml(sub) {
    var sugg = S.d.assessmentSuggestions.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !sub.assessments.some(function (a) { return a.title.toLowerCase() === o.x.title.toLowerCase(); }); });
    var cols = printCols(sub);
    var h = '<div class="q-ws-tb"><button type="button" class="btn btn-default btn-sm" data-act="aCreate">' + I("plus") + "Create assessment</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="printPreview" data-id="' + esc(sub.id) + '">' + I("printer") + "Print preview</button></div>";
    if (sugg.length) h += '<div class="q-quick"><span class="q-muted">Quick add</span>' + sugg.map(function (o) {
      return '<button type="button" class="q-chip q-chip-sm" data-act="aQuick" data-id="' + o.i + '">' + I("plus", 13) + esc(o.x.title) + ' <span class="q-muted tnum">' + o.x.obtainable + " · " + o.x.weight + "%</span></button>";
    }).join("") + "</div>";
    h += '<p class="q-print-line">' + I("printer", 14) + "<span>" + (cols.length ? "Result sheet: " + cols.map(function (c) { return esc(c.label); }).join(" · ") : "No print columns") + "</span></p>";
    if (!sub.assessments.length) return h + empty("clipboard-list", "No assessment", "Create one, or quick-add First CA, Second CA and Examination above.", "");
    var n = sub.assessments.length;
    return h + '<div class="q-list" role="list" aria-label="Assessments">' + sub.assessments.map(function (a, i) {
      var kids = a.children || [], w = aWeight(a), subs = aSubs(sub, a);
      var pts = kids.length ? kids.reduce(function (t, c) { return t + (+c.obtainable || 0); }, 0) + " pts" : (a.obtainable == null ? "Uncapped" : a.obtainable + " pts");
      var meta = [pts, w === 0 ? '<span class="q-warn-text">0% — not counted</span>' : w + "%", plural(subs, "submission"),
        kids.length ? plural(kids.length, "sub-assessment") + (a.printMode === "TOTAL" ? " · prints total" : " · prints each part") : "",
        a.print === false ? '<span class="q-muted">Not printed</span>' : "Printed"].filter(Boolean).join(" · ");
      var row = '<div class="q-row q-arow" role="listitem"><span class="q-num tnum">#' + (i + 1) + "</span>" +
        '<span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(a.title) + '</span><span class="q-row-sub tnum">' + meta + "</span></span>" +
        '<span class="q-tools">' +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="aUp" data-id="' + esc(a.id) + '" aria-label="Move ' + esc(a.title) + ' up"' + (i === 0 ? " disabled" : "") + ">" + I("chevron-up") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="aDown" data-id="' + esc(a.id) + '" aria-label="Move ' + esc(a.title) + ' down"' + (i === n - 1 ? " disabled" : "") + ">" + I("chevron-down") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="aEdit" data-id="' + esc(a.id) + '" aria-label="Edit ' + esc(a.title) + '">' + I("pencil") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm q-del" data-act="aDelete" data-id="' + esc(a.id) + '" aria-label="Delete ' + esc(a.title) + '">' + I("trash-2") + "</button></span></div>";
      return row + kids.map(function (c, k) {
        return '<div class="q-row q-arow is-child" role="listitem"><span class="q-num"></span><span class="q-row-text"><span class="q-row-title" dir="auto">' + esc(c.title) + "</span>" +
          '<span class="q-row-sub tnum">Part ' + (k + 1) + " under " + esc(a.title) + " · " + (c.obtainable == null ? "Uncapped" : c.obtainable + " pts") + " · " + (+c.weight || 0) + "% · " + plural(itemSubs(sub, c.id), "submission") + "</span></span></div>";
      }).join("");
    }).join("") + "</div>";
  }
  function aFormHtml(sub) {
    var f = S.aform;
    var others = sub.assessments.filter(function (a) { return a.id !== f.id; }).reduce(function (n, a) { return n + aWeight(a); }, 0);
    var myW = f.split ? f.children.reduce(function (n, c) { return n + (+c.weight || 0); }, 0) : (+f.weight || 0);
    var myMax = f.children.reduce(function (n, c) { return n + (+c.obtainable || 0); }, 0);
    var warn = [];
    if (myW === 0) warn.push("0% weight — this assessment won’t count toward the term total.");
    if (others + myW > 100) warn.push("Weights for " + sub.title + " would total " + (others + myW) + "%.");
    var inner;
    if (f.split) {
      inner = '<div class="field"><span class="label" id="af-pm">Print mode</span><div class="q-seg" role="group" aria-labelledby="af-pm">' +
        segBtn("aPrintMode", "EXPANDED", "Expanded", f.printMode) + segBtn("aPrintMode", "TOTAL", "Total", f.printMode) + "</div>" +
        '<p class="field-description">' + (f.printMode === "TOTAL" ? "One result-sheet column with the total of all parts." : "Each part prints as its own result-sheet column.") + "</p></div>" +
        '<div class="q-parts"><div class="q-parts-head" aria-hidden="true"><span>Part</span><span>Obtainable</span><span>Weight %</span><span></span></div>' +
        f.children.map(function (c, k) {
          return '<div class="q-part"><input id="af-c' + k + '-t" class="input" dir="auto" data-bind="aform.children.' + k + '.title" value="' + esc(c.title) + '" aria-label="Part ' + (k + 1) + ' title">' +
            '<input id="af-c' + k + '-m" class="input tnum" inputmode="numeric" data-bind="aform.children.' + k + '.obtainable" data-rr value="' + esc(c.obtainable) + '" placeholder="—" aria-label="Part ' + (k + 1) + ' obtainable">' +
            '<input id="af-c' + k + '-w" class="input tnum" inputmode="numeric" data-bind="aform.children.' + k + '.weight" data-rr value="' + esc(c.weight) + '" placeholder="0" aria-label="Part ' + (k + 1) + ' weight %">' +
            '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="aChildRemove" data-id="' + k + '" aria-label="Remove part ' + (k + 1) + '"' + (f.children.length <= 1 ? " disabled" : "") + ">" + I("x") + "</button></div>";
        }).join("") +
        '<div class="q-parts-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="aChildAdd">' + I("plus") + 'Add part</button><span class="tnum q-muted">Total ' + myMax + " pts · " + myW + "%</span></div></div>";
    } else {
      inner = '<div class="field-grid">' + fInput("af-max", "Obtainable", "aform.obtainable", f.obtainable, { num: true, im: "numeric", ph: "Blank = uncapped" }) +
        fInput("af-w", "Weight %", "aform.weight", f.weight, { num: true, im: "numeric", ph: "0", rr: true }) + "</div>";
    }
    return '<div class="q-form" role="group" aria-labelledby="af-h"><h4 class="q-h4" id="af-h">' + (f.id ? "Edit assessment" : "New assessment") + "</h4>" +
      fInput("af-title", "Title", "aform.title", f.title, { dir: true, err: f.error && !f.title.trim() ? f.error : "" }) +
      '<label class="choice q-switch-row"><input type="checkbox" class="switch" id="af-split" data-bind="aform.split" data-rr' + (f.split ? " checked" : "") + '><span><span class="label">Split into sub-assessments</span>' +
      '<span class="field-description">Record parts separately, e.g. proposal and presentation.</span></span></label>' + inner +
      '<label class="choice q-switch-row"><input type="checkbox" class="switch" id="af-print" data-bind="aform.print" data-rr' + (f.print ? " checked" : "") + '><span class="label">Show on result sheet</span></label>' +
      warn.map(function (w) { return '<p class="q-warn-line">' + I("triangle-alert", 14) + esc(w) + "</p>"; }).join("") +
      (f.error && f.title.trim() ? '<p class="field-error" role="alert">' + esc(f.error) + "</p>" : "") +
      '<div class="q-if-actions"><button type="button" class="btn btn-ghost btn-sm" data-act="aCancel">Cancel</button><button type="button" class="btn btn-default btn-sm" data-act="aSave">' + (f.id ? "Save changes" : "Save assessment") + "</button></div></div>";
  }
  function saveLabel() {
    if (S.save === "saving") return spinner() + "Saving…";
    if (S.save === "error") return I("circle-alert", 14) + plural(S.saveErr, "score") + " not saved — over max or not a number";
    if (S.save === "saved") return I("check", 14) + "Saved";
    return I("cloud-check", 14) + "Scores save automatically";
  }
  function paintSave() {
    var el = H && H.querySelector("#q-autosave");
    if (el) { el.dataset.state = S.save; el.innerHTML = saveLabel(); }
  }
  function scoresHtml(sub) {
    var cols = leafItems(sub).filter(function (i) { return i.weight > 0; }), list = enrolled();
    if (!cols.length) return empty("clipboard-list", "No weighted assessments yet", "Give an assessment a weight above 0% to enter scores for it.", '<button type="button" class="btn btn-outline btn-sm" data-act="wsMode" data-id="assessments">Go to assessments</button>');
    if (!list.length) return empty("users", "No students enrolled this term", "", "");
    return '<div class="q-ws-tb"><span class="q-muted tnum">' + plural(list.length, "student") + " × " + plural(cols.length, "assessment") + '</span><span id="q-autosave" class="q-autosave" data-state="' + S.save + '" role="status" aria-live="polite">' + saveLabel() + "</span></div>" +
      '<div class="q-grid-wrap" data-scroll="grid"><table class="q-grid"><thead><tr><th class="q-sticky q-gnum" scope="col">#</th><th class="q-sticky q-gname" scope="col">Student</th>' +
      cols.map(function (c) { return '<th scope="col" class="num"><span dir="auto">' + esc(c.parent ? c.parent + " · " + c.title : c.title) + "</span><small>" + (c.max == null ? "Uncapped" : "/ " + c.max) + "</small></th>"; }).join("") + "</tr></thead><tbody>" +
      list.map(function (s, i) {
        return '<tr><td class="q-sticky q-gnum tnum">' + (i + 1) + '</td><th scope="row" class="q-sticky q-gname" dir="auto">' + esc(s.studentName) + "</th>" + cols.map(function (c) {
          var k = sKey(sub.id, s.id, c.id), v = S.scores[k] == null ? "" : S.scores[k];
          return '<td class="num"><input class="input q-score tnum" data-score="' + esc(k) + '" data-max="' + (c.max == null ? "" : c.max) + '" data-fk="sc:' + esc(k) + '" inputmode="decimal" value="' + esc(v) + '" aria-label="' + esc(s.studentName) + ", " + esc(c.title) + (c.max != null ? " out of " + c.max : ", uncapped") + '"' + (isBad(v, c.max) ? ' aria-invalid="true"' : "") + "></td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* Receive / record payment (P3) */
  function payPanel() {
    var f = S.payForm, chs = charges(f.classId);
    var ids = [], names = {};
    chs.forEach(function (c) { if ((c.outstanding > 0 || c.studentId === f.studentId) && ids.indexOf(c.studentId) < 0) { ids.push(c.studentId); names[c.studentId] = c.studentName; } });
    var studentOpts = ids.map(function (id) { return [id, names[id]]; }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
    var mine = chs.filter(function (c) { return c.studentId === f.studentId && (c.outstanding > 0 || c.id === f.chargeId); });
    var ch = chs.filter(function (c) { return c.id === f.chargeId; })[0];
    var body = '<div class="q-form">' +
      fSelect("pf-student", "Student", "payForm.studentId", studentOpts, f.studentId, { rr: true, placeholder: "Choose student…", disabled: f.fixed }) +
      (f.studentId ? fSelect("pf-charge", "Charge", "payForm.chargeId", mine.map(function (c) { return [c.id, c.title + " — " + money(c.outstanding) + " outstanding"]; }), f.chargeId, { rr: true }) : "") +
      (ch ? '<p class="q-context tnum">' + money(ch.amount) + " billed · " + money(ch.amountPaid) + " paid · <b>" + money(ch.outstanding) + " outstanding</b></p>" : "") +
      '<div class="field"><label class="label" for="pf-amount">Amount</label><div class="input-group"><span class="input-addon">₦</span><input id="pf-amount" class="input tnum" inputmode="numeric" data-bind="payForm.amount" value="' + esc(f.amount) + '"></div></div>' +
      '<div class="field-grid">' + fSelect("pf-method", "Method", "payForm.method", [["Cash", "Cash"], ["Bank transfer", "Bank transfer"], ["POS", "POS"], ["Cheque", "Cheque"]], f.method) +
      fInput("pf-date", "Payment date", "payForm.date", f.date, { type: "date", max: S.d.today }) + "</div>" +
      fInput("pf-ref", "Reference", "payForm.ref", f.ref, { optional: true, ph: "e.g. POS-88213" }) +
      (f.error ? errAlert(f.error) : "") + "</div>";
    return panel({
      title: f.fixed ? "Record payment" : "Receive payment",
      sub: f.fixed && names[f.studentId] ? '<span dir="auto">' + esc(names[f.studentId]) + "</span> · " + esc(cls(f.classId).displayName) : esc(cls(f.classId).displayName) + " · " + esc(termLabel()),
      body: body,
      foot: '<button type="button" class="btn btn-outline" data-act="closeDetail">Cancel</button><button type="button" class="btn btn-default" data-act="paySave"' + (f.saving ? " disabled" : "") + ">" + (f.saving ? spinner() + "Saving…" : "Save payment") + "</button>"
    });
  }

  /* ================================================================
     POPOVERS + DIALOGS
     ================================================================ */
  function menuContent(m) {
    var id = m.arg, st;
    switch (m.id) {
      case "class":
        return '<div class="menu-label">Classrooms · ' + esc(termLabel()) + "</div>" +
          S.d.classrooms.map(function (c) { return mi("switchClass", esc(c.displayName), null, { id: c.id, dir: true, checked: c.id === S.classId }); }).join("") + SEP +
          '<div class="menu-label">Preview states</div>' + mi("demoLoading", "Loading skeleton", "loader-circle") + mi("demoError", "Error fallback", "circle-alert");
      case "sort":
        return '<div class="menu-label">Sort by</div>' + [["name", "Name"], ["gender", "Gender"], ["dob", "Date of birth"], ["created", "Date added"]].map(function (p) {
          return mi("sort", p[0] === S.stu.sort ? p[1] + (S.stu.dir > 0 ? " (A→Z)" : " (Z→A)") : p[1], null, { id: p[0], checked: p[0] === S.stu.sort });
        }).join("") + SEP + mi("sortDir", "Ascending", null, { id: "1", checked: S.stu.dir > 0 }) + mi("sortDir", "Descending", null, { id: "-1", checked: S.stu.dir < 0 });
      case "stuMore":
        var g = dups();
        return mi("toggleSelecting", S.stu.selecting ? "Stop selecting" : "Select students", "square-check") +
          mi("toggleView", S.stu.view === "table" ? "Show as list" : "Show as table (all columns)", S.stu.view === "table" ? "list" : "table") + SEP +
          '<div class="menu-label q-ml-status">' + (S.dupCheck === "loading" ? spinner() + "Checking duplicate names…" : g.length ? I("triangle-alert", 14) + plural(g.length, "duplicate group") : I("check", 14) + "No duplicate names found") + "</div>" +
          mi("recheckDup", "Re-run duplicate check", "refresh-cw");
      case "row":
        var s = student(id); if (!s) return "";
        return mi("askAssistant", "Ask assistant", "sparkles", { id: id }) + mi("openStudent", "View details", "eye", { id: id }) +
          (C.canManage ? SEP + mi("editStudent", "Edit information", "pencil", { id: id }) + (s.enrolled ? mi("removeTerm", "Remove from current term", "user-x", { id: id }) : "") +
            mi("deleteStudent", "Delete student", "trash-2", { id: id, destructive: true }) : "");
      case "bulk":
        return mi("bulkAdmission", "Set admission status", "graduation-cap") + mi("bulkMove", "Move class", "arrow-right") + SEP + mi("bulkRemove", "Remove from term", "user-x", { destructive: true });
      case "attMore":
        var dot = function (v) { return '<span class="q-mdot" data-v="' + v + '" aria-hidden="true"></span>'; };
        return '<div class="menu-label">Mark all as</div>' + ["PRESENT", "ABSENT", "LATE"].map(function (v) { return mi("markAll", STATUS[v], null, { id: v, lead: dot(v) }); }).join("") +
          '<div class="menu-label">Mark rest as</div>' + ["PRESENT", "ABSENT", "LATE"].map(function (v) { return mi("markRest", STATUS[v], null, { id: v, lead: dot(v) }); }).join("") +
          SEP + mi("clearAll", "Clear all", "x") + (C.canManage ? mi("addStudent", "Add student", "user-plus") : "");
      case "date":
        st = S.att;
        return '<div class="q-pop-body">' + fInput("att-date", "Date", "att.date", st.date, { type: "date", max: S.d.today, rr: true }) +
          '<div class="q-pop-actions"><button type="button" class="btn btn-ghost btn-sm" data-act="setToday" data-keep>Today</button><button type="button" class="btn btn-default btn-sm" data-act="closeMenu">Done</button></div></div>';
      case "session":
        return '<div class="q-pop-body">' + sessionFields("att") + '<div class="q-pop-actions"><button type="button" class="btn btn-default btn-sm" data-act="closeMenu">Done</button></div></div>';
      case "hist":
      case "sess":
        if (!sessionById(id)) return "";
        return (m.id === "hist" ? mi("openSession", "Open", "eye", { id: id }) + mi("correctSession", "Correct session", "pencil", { id: id }) : "") +
          (C.isAdmin ? (m.id === "hist" ? SEP : "") + mi("deleteSession", "Delete session", "trash-2", { id: id, destructive: true }) : "");
      case "histMore":
        return mi("exportHistory", "Export CSV", "download", { disabled: !sessions().length });
      case "subMore":
        var av = availableImports();
        return av.length ? mi("importOpen", "Import from catalog (" + av.length + ")", "library") : '<div class="menu-label">All catalog subjects are already in this class</div>';
      case "subRow":
        return mi("openSubject", "Open workspace", "book-open", { id: id }) + mi("enterScores", "Enter scores", "notebook-pen", { id: id }) +
          (C.isAdmin ? SEP + mi("deleteSubject", "Delete subject", "trash-2", { id: id, destructive: true }) : "");
      case "payMore":
        return mi("exportCharges", "Export CSV", "download", { disabled: !charges().length });
      case "record":
        return '<div class="menu-label">Open recorder with scope</div>' + [["Full", "Full access"], ["Classroom", "Classroom"], ["Subject", "This subject only"]].map(function (p) { return mi("recordScope", p[1], "external-link", { id: p[0] }); }).join("");
    }
    return "";
  }
  function popHtml() {
    var m = S.menu; if (!m) return "";
    var html = menuContent(m); if (!html) return "";
    var form = m.id === "session" || m.id === "date";
    var labels = { "class": "Switch classroom", sort: "Sort students", stuMore: "Student actions", row: "Student actions", bulk: "Bulk actions", attMore: "Attendance actions", date: "Pick date", session: "Session details", hist: "Session actions", sess: "Session actions", histMore: "History actions", subMore: "Subject actions", subRow: "Subject actions", payMore: "Payment actions", record: "Record submission" };
    return '<div class="popover q-pop' + (form ? " q-pop-form" : "") + '" role="' + (form ? "dialog" : "menu") + '" aria-label="' + (labels[m.id] || "Menu") + '" style="left:0;top:0">' + html + "</div>";
  }
  function positionPop() {
    var p = H.querySelector(".q-pop"); if (!p || !S.menu) return;
    var m = S.menu, hw = H.clientWidth, hh = H.clientHeight, pw = p.offsetWidth, ph = p.offsetHeight;
    var left = m.align === "left" ? m.l : m.r - pw;
    left = Math.max(8, Math.min(left, hw - pw - 8));
    var top = m.b + 4;
    if (top + ph > hh - 8) top = Math.max(8, Math.min(m.t - ph - 4, hh - ph - 8));
    p.style.left = left + "px"; p.style.top = top + "px";
    p.style.maxHeight = (hh - 16) + "px";
  }
  function toggleMenu(trig) {
    var id = trig.dataset.menu, arg = trig.dataset.id != null ? trig.dataset.id : null;
    if (S.menu && S.menu.id === id && S.menu.arg === arg) { S.menu = null; render(); return; }
    var r = trig.getBoundingClientRect(), h = H.getBoundingClientRect();
    S.menu = { id: id, arg: arg, align: trig.dataset.align || "right", l: r.left - h.left, r: r.right - h.left, t: r.top - h.top, b: r.bottom - h.top, key: keyOf(trig), just: true };
    render();
  }

  function dialogHtml(d) {
    var label = typeof d.confirm === "function" ? d.confirm(d) : d.confirm;
    var disabled = d.saving || (d.disabled && d.disabled(d));
    return '<div class="q-layer"><div class="q-scrim" data-act="closeDialog" aria-hidden="true"></div>' +
      '<div class="dialog q-dialog" data-open="true" role="' + (d.destructive ? "alertdialog" : "dialog") + '" aria-modal="true" aria-labelledby="dlg-t"' + (d.desc ? ' aria-describedby="dlg-d"' : "") + ' style="--dialog-w:' + (d.w || "28rem") + '">' +
      '<div class="dialog-header"><h3 class="dialog-title" id="dlg-t">' + d.title + "</h3>" + (d.desc ? '<p class="dialog-description" id="dlg-d">' + d.desc + "</p>" : "") + "</div>" +
      (d.body ? '<div class="q-dlg-body">' + d.body(d) + "</div>" : "") + (d.error ? errAlert(d.error) : "") +
      '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog"' + (d.saving ? " disabled" : "") + ">" + (d.cancel || "Cancel") + "</button>" +
      (d.run ? '<button type="button" class="btn ' + (d.destructive ? "btn-destructive" : "btn-default") + '" data-act="dlgConfirm"' + (disabled ? " disabled" : "") + ">" + (d.saving ? spinner() + "Saving…" : esc(label)) + "</button>" : "") +
      "</div></div></div>";
  }
  function openDialog(d) {
    S.menu = null;
    S.returnKey = S.lastKey;
    S.dialog = Object.assign({ saving: false, error: "", just: true }, d);
  }
  function closeDialog() { S.dialog = null; S.focusKey = S.returnKey; }
  function confirmDlg(title, desc, confirm, run, o) { openDialog(Object.assign({ title: title, desc: desc, confirm: confirm, run: run }, o || {})); }
  function runConfirm() {
    var d = S.dialog; if (!d || d.saving) return;
    d.saving = true; d.error = "";
    later(function () {
      if (S.dialog !== d) return;
      var err = d.run(d);
      if (err) { d.saving = false; d.error = err; } else if (S.dialog === d) closeDialog();
      render();
    }, 650);
  }

  /* dialog bodies */
  function editBody(d) {
    var x = d.draft;
    return '<div class="field-grid">' + fInput("ed-name", "First name", "dialog.draft.name", x.name, { dir: true }) + fInput("ed-sur", "Surname", "dialog.draft.surname", x.surname, { dir: true }) +
      fInput("ed-other", "Other name", "dialog.draft.otherName", x.otherName, { optional: true, dir: true }) + fSelect("ed-gender", "Gender", "dialog.draft.gender", [["Female", "Female"], ["Male", "Male"]], x.gender) +
      fInput("ed-dob", "Date of birth", "dialog.draft.dob", x.dob, { type: "date", max: S.d.today }) + fInput("ed-guardian", "Guardian", "dialog.draft.guardian", x.guardian, { dir: true }) +
      fInput("ed-phone", "Guardian phone", "dialog.draft.guardianPhone", x.guardianPhone, { type: "tel", im: "tel", cls: "q-span2" }) + "</div>";
  }
  function admissionBody(d) {
    return '<div class="q-radios" role="radiogroup" aria-label="Admission status">' + Object.keys(ADM).map(function (k) {
      return '<label class="choice q-radio-row"><input type="radio" class="radio" name="q-adm" data-fk="adm-' + k + '" data-bind="dialog.value" data-rr value="' + k + '"' + (d.value === k ? " checked" : "") + "><span>" + ADM[k] + "</span></label>";
    }).join("") + "</div>";
  }
  function moveBody(d) {
    var opts = S.d.classrooms.filter(function (c) { return c.id !== S.classId; });
    return '<div class="field"><label class="label" for="mv-dest">Destination class</label><div class="q-move-row"><select id="mv-dest" class="select" data-bind="dialog.dest" data-rr' + (d.refreshing ? " disabled" : "") + '><option value="">Choose class…</option>' +
      opts.map(function (c) { return '<option value="' + c.id + '"' + (d.dest === c.id ? " selected" : "") + ">" + esc(c.displayName) + "</option>"; }).join("") + "</select>" +
      '<button type="button" class="btn btn-outline btn-icon" data-act="refreshDest" aria-label="Refresh destinations"' + (d.refreshing ? " disabled" : "") + ">" + (d.refreshing ? spinner() : I("refresh-cw")) + "</button></div>" +
      '<p class="field-description">Move 1–100 students at a time.' + (d.ids.length > 100 ? ' <span class="q-warn-text">Select 100 or fewer.</span>' : "") + "</p></div>";
  }
  function mergeBody(d) {
    var g = d.g, t = g.toMove;
    return '<div class="q-merge">' + g.members.map(function (m) {
      return '<div class="q-merge-m' + (m.recommended ? " is-keep" : "") + '"><div class="q-merge-top"><b dir="auto">' + esc(m.displayName) + "</b>" +
        (m.recommended ? '<span class="badge badge-success">Recommended survivor</span>' : '<span class="badge badge-neutral">Duplicate</span>') + '<span class="q-muted mono">ID ' + esc(shortId(m.id)) + "</span></div>" +
        '<p class="q-muted tnum">History score ' + m.historyScore + " · " + plural(m.assessments, "assessment") + " · " + m.attendance + " attendance · " + plural(m.charges, "charge") + " · " + plural(m.payments, "payment") + "</p></div>";
    }).join("") + "</div>" +
      '<div><h4 class="q-h4">Records to move</h4><p class="tnum">' + plural(t.termForms, "term form") + " · " + t.attendance + " attendance · " + plural(t.assessments, "assessment") + " · " + plural(t.charges, "charge") + " · " + plural(t.payments, "payment") + "</p></div>" +
      (g.conflicts.length ? '<div class="alert q-alert-warn">' + I("triangle-alert") + '<div class="alert-title">Conflicts</div><div class="alert-description"><ul class="q-ul">' + g.conflicts.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul></div></div>" : "") +
      (!C.canManage ? '<p class="field-description">Only admins and registrars can merge students.</p>' : !g.canMerge ? '<p class="field-description">These records can’t be merged automatically.</p>' : "");
  }
  function importBody(d) {
    var av = availableImports(), n = Object.keys(d.sel).length;
    return '<div class="q-import-head"><span class="tnum">' + n + ' selected</span><span><button type="button" class="btn-link" data-act="importAll">Select all</button> · <button type="button" class="btn-link" data-act="importClear">Clear all</button></span></div>' +
      '<div class="q-import-list">' + av.map(function (name) {
        return '<label class="choice q-check-row"><input type="checkbox" class="checkbox" data-act="importToggle" data-id="' + esc(name) + '"' + (d.sel[name] ? " checked" : "") + "><span>" + esc(name) + "</span></label>";
      }).join("") + "</div>";
  }
  function printBody(d) {
    var sub = subjectById(d.subjectId); if (!sub) return "";
    var cols = printCols(sub), list = enrolled();
    if (!cols.length) return '<p class="q-muted">No print columns — turn on “Show on result sheet” for an assessment.</p>';
    return '<div class="q-grid-wrap q-print-wrap"><table class="q-grid"><thead><tr><th>Student</th>' + cols.map(function (c) { return '<th class="num">' + esc(c.label) + "</th>"; }).join("") + '<th class="num">Total</th></tr></thead><tbody>' +
      list.map(function (s) {
        var total = 0, any = false;
        var cells = cols.map(function (c) {
          var v = 0, has = false;
          c.ids.forEach(function (iid) { var x = S.scores[sKey(sub.id, s.id, iid)]; if (hasScore(x)) { v += Number(x); has = true; } });
          if (has) { total += v; any = true; }
          return '<td class="num tnum">' + (has ? v : "—") + "</td>";
        }).join("");
        return '<tr><td dir="auto">' + esc(s.studentName) + "</td>" + cells + '<td class="num tnum"><b>' + (any ? total : "—") + "</b></td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function receiptBody(d) {
    var r = d.r;
    return '<dl class="q-dl q-receipt"><div><dt>Receipt</dt><dd class="mono">' + esc(r.no) + "</dd></div><div><dt>Student</dt><dd dir=\"auto\">" + esc(r.name) + "</dd></div>" +
      "<div><dt>Class</dt><dd>" + esc(cls(r.classId).displayName) + "</dd></div><div><dt>Date · method</dt><dd>" + esc(window.SC.fmtDate(r.date)) + " · " + esc(r.method) + (r.ref ? " · " + esc(r.ref) : "") + "</dd></div></dl>" +
      '<div class="q-fees">' + r.lines.map(function (l) { return '<div class="q-fee"><span class="q-fee-t">' + esc(l.title) + '</span><span class="tnum q-fee-a">' + money(l.paid) + "</span><span></span></div>"; }).join("") +
      '<div class="q-fee q-fee-total"><span class="q-fee-t">Total received</span><span class="tnum q-fee-a">' + money(r.total) + "</span><span></span></div></div>";
  }

  /* ================================================================
     ACTIONS
     ================================================================ */
  function syncUrl() {
    try { var u = new URL(location.href); u.searchParams.set("classroomTab", S.section); history.replaceState(null, "", u.toString()); } catch (e) { /* file:// in some browsers */ }
  }
  function openDetail(d) { d.just = true; d.from = S.lastKey; S.detail = d; S.menu = null; S.aform = null; }
  function closeDetail() {
    var from = S.detail && S.detail.from;
    S.detail = null; S.aform = null; S.corr = null; S.nform = null; S.payForm = null; S.ov.dest = "";
    S.focusKey = from;
  }
  function toggleSel(id) { if (S.stu.sel[id]) delete S.stu.sel[id]; else S.stu.sel[id] = true; }
  function dupCheck() { S.dupCheck = "loading"; render(); later(function () { S.dupCheck = "done"; render(); }, 800); }
  function startLoad(ms, after) {
    var tok = ++S.tok; S.loading = true; S.error = false;
    later(function () { if (tok !== S.tok) return; S.loading = false; S.booted = true; render(); if (after) after(); }, ms);
  }
  function resetClassState() {
    S.detail = null; S.dialog = null; S.menu = null; S.corr = null; S.nform = null; S.aform = null; S.payForm = null; S.ov.dest = "";
    S.att = freshAtt(S.att.mode);
    S.stu.sel = {}; S.stu.selecting = false; S.stu.q = ""; S.stu.limit = 20; S.stu.highlight = null;
    S.sub.adding = false; S.sub.error = ""; S.sub.added = ""; S.sub.name = ""; S.sub.desc = ""; S.sub.q = ""; S.sub.highlight = null;
    S.hist.q = ""; S.pay.q = "";
    if (S.saveT) { cancel(S.saveT); S.saveT = null; } S.save = "idle";
  }
  function moveStudents(ids, dest) {
    var moved = 0;
    ids.forEach(function (id) {
      var r = roster(), i = r.map(function (s) { return s.id; }).indexOf(id); if (i < 0) return;
      var s = r.splice(i, 1)[0]; roster(dest).push(s); moved++;
      var cs = charges(), keep = [];
      cs.forEach(function (c) { if (c.studentId === id) { c.stream = cls(dest).stream; charges(dest).push(c); } else keep.push(c); });
      S.d.charges[S.classId] = keep;
      delete S.stu.sel[id];
    });
    return moved;
  }
  function newNform(classId) {
    var c = cls(classId);
    return { loading: false, first: "", surname: "", other: "", gender: "", dob: "", admission: "NEW", classId: c.id, stream: c.stream, fee: "ok", feeTry: 0, pays: {},
      method: "Cash", payDate: S.d.today, ref: "", parentOpen: false, pName: "", pPhone: "", pPhone2: "", err: {}, saving: false, done: null };
  }
  function feeLoad() {
    var f = S.nform; if (!f) return;
    f.fee = "loading"; render();
    later(function () { if (S.nform !== f) return; f.fee = (f.classId === "ssse" && !f.feeTry) ? "error" : "ok"; render(); }, 450);
  }
  function openNew() {
    openDetail({ type: "new" });
    var f = newNform(S.classId); f.loading = true; S.nform = f;
    later(function () { if (S.nform !== f) return; f.loading = false; render(); feeLoad(); }, 550);
  }
  function openPay(o) {
    S.payForm = Object.assign({ classId: S.classId, studentId: "", chargeId: "", amount: "", method: "Cash", date: S.d.today, ref: "", error: "", saving: false, fixed: false }, o);
    var c = charges(S.payForm.classId).filter(function (x) { return x.id === S.payForm.chargeId; })[0];
    if (c) S.payForm.amount = String(c.outstanding);
    openDetail({ type: "pay" });
  }
  function downloadCsv(name, rows) {
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\n");
    try {
      var url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    } catch (e) { /* download unavailable */ }
  }
  function sessionFromForm(st) { return { title: st.title.trim(), type: st.type, subject: st.type === "SUBJECT" ? st.subject : null, period: st.period.trim(), date: st.date }; }
  function validateSession(st, ignoreId) {
    if (!st.title.trim()) return "Give the session a title.";
    if (st.type === "SUBJECT" && !st.subject) return "Choose a subject for a subject attendance session.";
    var clash = sessions().some(function (s) { return s.id !== ignoreId && s.date === st.date && s.title.trim().toLowerCase() === st.title.trim().toLowerCase() && (s.period || "") === st.period.trim(); });
    if (clash) return "“" + st.title.trim() + "” was already taken on " + window.SC.fmtDay(st.date) + ". Change the title or period, or correct the existing session from History.";
    return "";
  }

  var A = {
    go: function (id) { if (!SECTIONS.some(function (s) { return s.id === id; })) return; S.section = id; syncUrl(); },
    closeSheet: function () { S.closed = true; S.detail = null; S.menu = null; S.dialog = null; },
    reopen: function () { S.closed = false; S.focusKey = "a:closeSheet:::"; },
    closeMenu: function () {},
    switchClass: function (id) { if (id === S.classId) return; S.classId = id; resetClassState(); startLoad(450, dupCheck); },
    demoLoading: function () { startLoad(1600); },
    demoError: function () { S.tok++; S.loading = false; S.error = true; },
    retryLoad: function () { startLoad(700); },
    closeDetail: function () { closeDetail(); },
    closeDialog: function () { if (S.dialog && !S.dialog.saving) closeDialog(); },
    dlgConfirm: function () { runConfirm(); },
    clearSearch: function (path) { setPath(path, ""); if (path === "stu.q") S.stu.limit = 20; S.focusKey = "id:" + SEARCH_IDS[path]; },

    /* students */
    openStudent: function (id) { if (S.stu.selecting) { toggleSel(id); return; } S.ov.dest = ""; openDetail({ type: "student", id: id, tab: "overview" }); },
    openStudentPay: function (id) { S.ov.dest = ""; openDetail({ type: "student", id: id, tab: "payments" }); },
    stuTab: function (t) { if (S.detail) S.detail.tab = t; },
    sort: function (k) { if (S.stu.sort === k) S.stu.dir *= -1; else { S.stu.sort = k; S.stu.dir = 1; } },
    sortDir: function (v) { S.stu.dir = Number(v) < 0 ? -1 : 1; },
    toggleSelecting: function () { S.stu.selecting = !S.stu.selecting; if (!S.stu.selecting) S.stu.sel = {}; },
    doneSelect: function () { S.stu.selecting = false; S.stu.sel = {}; },
    toggleView: function () { S.stu.view = S.stu.view === "table" ? "list" : "table"; },
    toggleSel: function (id) { toggleSel(id); },
    selAll: function () { var list = filteredStudents(), all = list.every(function (s) { return S.stu.sel[s.id]; }); S.stu.sel = {}; if (!all) list.forEach(function (s) { S.stu.sel[s.id] = true; }); },
    deselect: function () { S.stu.sel = {}; S.stu.selecting = false; },
    recheckDup: function () { later(dupCheck, 0); },
    addStudent: function () { openNew(); },
    askAssistant: function (id) { var s = student(id); if (s) C.toast("Assistant", "Opened with " + s.studentName + " as context"); },
    assistBulk: function () { C.toast("Assistant", "Opened with " + plural(Object.keys(S.stu.sel).length, "selected student") + " as context"); },
    reportCard: function (id) { var s = student(id); if (s) C.toast("Report card", "Opens " + s.studentName + "’s " + termLabel() + " report card"); },
    editStudent: function (id) {
      var s = student(id); if (!s) return;
      openDialog({ title: "Edit student information", desc: '<span dir="auto">' + esc(s.studentName) + "</span> · " + esc(cls().displayName), w: "32rem", confirm: "Save changes",
        draft: { name: s.name, surname: s.surname, otherName: s.otherName || "", gender: s.gender, dob: s.dob, guardian: s.guardian || "", guardianPhone: s.guardianPhone || "" },
        body: editBody,
        run: function (d) {
          var x = d.draft;
          if (!x.name.trim() || !x.surname.trim()) return "First name and surname are required.";
          var t = student(id); if (!t) return "This student no longer exists.";
          Object.assign(t, { name: x.name.trim(), surname: x.surname.trim(), otherName: x.otherName.trim(), gender: x.gender, dob: x.dob, guardian: x.guardian.trim(), guardianPhone: x.guardianPhone.trim() });
          t.studentName = t.name + " " + t.surname;
          C.toast("Student updated", t.studentName);
        } });
    },
    removeTerm: function (id) {
      var s = student(id); if (!s) return;
      confirmDlg("Remove from current term?", '<span dir="auto">' + esc(s.studentName) + "</span> stays in the school records but leaves " + esc(cls().displayName) + " for " + esc(termLabel()) + ". Attendance and payments already recorded are kept.", "Remove from term",
        function () { var t = student(id); if (!t) return "This student no longer exists."; if (!t.enrolled) return t.studentName + " is already not enrolled this term."; t.enrolled = false; t.termFormId = null; C.toast("Removed from term", t.studentName + " · " + termLabel()); },
        { destructive: true });
    },
    deleteStudent: function (id) {
      var s = student(id); if (!s) return;
      confirmDlg("Delete student?", "This permanently deletes <span dir=\"auto\">" + esc(s.studentName) + "</span> and their term records. This can’t be undone.", "Delete student",
        function () {
          var paid = charges().filter(function (c) { return c.studentId === id && c.amountPaid > 0; }).length;
          if (paid) return "Can’t delete " + s.studentName + ": " + plural(paid, "payment") + " recorded. Remove them from the term instead.";
          S.d.rosters[S.classId] = roster().filter(function (x) { return x.id !== id; });
          S.d.charges[S.classId] = charges().filter(function (c) { return c.studentId !== id; });
          delete S.stu.sel[id];
          if (S.detail && S.detail.type === "student" && S.detail.id === id) S.detail = null;
          C.toast("Student deleted", s.studentName);
        }, { destructive: true });
    },
    exportSel: function () {
      var rows = [["Student ID", "Student", "Class", "Gender", "Status", "Guardian", "Phone"]].concat(roster().filter(function (s) { return S.stu.sel[s.id]; }).map(function (s) {
        return [shortId(s.id), s.studentName, cls().displayName, s.gender, s.enrolled ? "Enrolled" : "Not enrolled", s.guardian, s.guardianPhone];
      }));
      downloadCsv(slug() + "-students.csv", rows);
      C.toast("Export ready", plural(rows.length - 1, "student") + " exported to CSV");
    },
    bulkAdmission: function () {
      var ids = Object.keys(S.stu.sel);
      openDialog({ title: "Set admission status", desc: "For " + plural(ids.length, "selected student") + " this term. Fees are reconciled to match the new status.", confirm: "Update status", value: "RETURNING", body: admissionBody,
        run: function (d) { var n = 0; ids.forEach(function (id) { var s = student(id); if (s) { s.admissionStatus = d.value; n++; } }); S.stu.sel = {}; S.stu.selecting = false; C.toast("Admission status updated", plural(n, "student") + " set to " + ADM[d.value] + " · fees reconciled"); } });
    },
    bulkMove: function () {
      var ids = Object.keys(S.stu.sel);
      openDialog({ title: "Move to another class", desc: plural(ids.length, "selected student") + " will leave " + esc(cls().displayName) + ".", confirm: "Move students", dest: "", refreshing: false, ids: ids, body: moveBody,
        disabled: function (d) { return !d.dest || d.refreshing || d.ids.length > 100 || d.ids.length < 1; },
        run: function (d) { var n = moveStudents(d.ids, d.dest); S.stu.selecting = false; C.toast("Students moved", plural(n, "student") + " moved to " + cls(d.dest).displayName); } });
    },
    refreshDest: function () { var d = S.dialog; if (!d) return; d.refreshing = true; later(function () { if (S.dialog === d) { d.refreshing = false; render(); } }, 600); },
    bulkRemove: function () {
      var ids = Object.keys(S.stu.sel);
      confirmDlg("Remove " + plural(ids.length, "student") + " from the term?", "They stay in school records but leave " + esc(cls().displayName) + " for " + esc(termLabel()) + ".", "Remove from term",
        function () {
          var n = 0, skip = 0;
          ids.forEach(function (id) { var s = student(id); if (!s) return; if (s.enrolled) { s.enrolled = false; s.termFormId = null; n++; } else skip++; });
          S.stu.sel = {}; S.stu.selecting = false;
          C.toast("Removed from term", plural(n, "student") + " removed" + (skip ? " · " + skip + " already not enrolled" : ""));
        }, { destructive: true });
    },
    merge: function (key) {
      var g = dups().filter(function (x) { return x.key === key; })[0]; if (!g) return;
      openDialog({ title: "Review duplicate", desc: plural(g.records, "record") + ' named <span dir="auto">' + esc(g.displayName) + "</span>. Merging keeps the recommended record and moves history onto it.", w: "34rem", g: g, confirm: "Merge duplicate",
        disabled: function () { return !g.canMerge || !C.canManage; }, body: mergeBody,
        run: function () {
          var keep = g.members.filter(function (m) { return m.recommended; })[0].id;
          var drop = g.members.filter(function (m) { return !m.recommended; }).map(function (m) { return m.id; });
          S.d.rosters[S.classId] = roster().filter(function (s) { return drop.indexOf(s.id) < 0; });
          charges().forEach(function (c) { if (drop.indexOf(c.studentId) >= 0) c.studentId = keep; });
          sessions().forEach(function (ses) {
            var has = ses.records.some(function (r) { return r.studentId === keep; });
            ses.records = ses.records.filter(function (r) { return drop.indexOf(r.studentId) < 0 || !has; });
            ses.records.forEach(function (r) { if (drop.indexOf(r.studentId) >= 0) r.studentId = keep; });
          });
          drop.forEach(function (id) { delete S.stu.sel[id]; });
          S.d.duplicates[S.classId] = dups().filter(function (x) { return x.key !== key; });
          C.toast("Duplicate merged", g.displayName + " · " + plural(drop.length, "record") + " merged into the " + g.survivor.className + " record");
        } });
    },

    /* attendance */
    attMode: function (m) { S.att.mode = m; S.att.error = ""; },
    dayPrev: function () { S.att.date = addDays(S.att.date, -1); },
    dayNext: function () { if (S.att.date < S.d.today) S.att.date = addDays(S.att.date, 1); },
    setToday: function () { S.att.date = S.d.today; },
    attType: function (v, el) {
      var st = S[el.dataset.scope]; if (!st) return;
      st.type = v;
      if (v === "GENERAL") { if (st.subject && st.title === st.subject) st.title = "Daily attendance"; st.subject = ""; }
    },
    mark: function (id, el) {
      var st = S[el.dataset.scope], v = el.dataset.v; if (!st) return;
      if (st.marks[id] === v) { delete st.marks[id]; delete st.remarks[id]; }
      else { st.marks[id] = v; if (v === "PRESENT") delete st.remarks[id]; }
      st.error = "";
    },
    markAll: function (v) { enrolled().forEach(function (s) { S.att.marks[s.id] = v; }); if (v === "PRESENT") S.att.remarks = {}; S.att.error = ""; },
    markRest: function (v) { enrolled().forEach(function (s) { if (!S.att.marks[s.id]) S.att.marks[s.id] = v; }); S.att.error = ""; },
    clearAll: function () { S.att.marks = {}; S.att.remarks = {}; S.att.error = ""; },
    attSave: function () {
      var st = S.att, list = enrolled();
      var recs = list.filter(function (s) { return st.marks[s.id]; }).map(function (s) { return { studentId: s.id, status: st.marks[s.id], remarks: (st.remarks[s.id] || "").trim() }; });
      if (!recs.length) { st.error = "Mark at least one student before saving."; return; }
      var err = validateSession(st); if (err) { st.error = err; return; }
      st.error = ""; st.saving = true;
      later(function () {
        if (S.att !== st) return;
        var ses = Object.assign({ id: S.classId + "-att-" + uid("s"), takenBy: actor(), records: recs,
          history: [{ action: "Created", actor: actor(), at: nowStamp(), summary: recs.length + " of " + list.length + " students marked" }] }, sessionFromForm(st));
        sessions().push(ses);
        S.att = freshAtt("history"); S.att.highlight = ses.id;
        later(function () { if (S.att.highlight === ses.id) S.att.highlight = null; }, 2600);
        C.toast("Attendance saved", ses.title + " · " + window.SC.fmtDay(ses.date) + " · " + recs.length + " of " + list.length + " marked");
        render();
      }, 650);
    },
    openSession: function (id) { openDetail({ type: "session", id: id }); },
    correctSession: function (id) {
      var s = sessionById(id); if (!s) return;
      var marks = {}, remarks = {};
      s.records.forEach(function (r) { marks[r.studentId] = r.status; if (r.remarks) remarks[r.studentId] = r.remarks; });
      var from = S.detail && S.detail.type === "session" ? S.detail.from : S.lastKey;
      openDetail({ type: "correct", id: id }); S.detail.from = from;
      S.corr = { sessionId: id, type: s.type || "GENERAL", title: s.title, subject: s.subject || "", period: s.period || "", date: s.date, marks: marks, remarks: remarks, error: "", saving: false };
    },
    cancelCorrection: function () { var d = S.detail; S.corr = null; S.detail = { type: "session", id: d.id, from: d.from, just: true }; },
    saveCorrection: function () {
      var c = S.corr, s = c && sessionById(c.sessionId); if (!s) return;
      var err = validateSession(c, s.id); if (err) { c.error = err; return; }
      var list = enrolled(), before = {};
      s.records.forEach(function (r) { before[r.studentId] = r; });
      var recs = list.filter(function (x) { return c.marks[x.id]; }).map(function (x) { return { studentId: x.id, status: c.marks[x.id], remarks: (c.remarks[x.id] || "").trim() }; });
      var changed = 0;
      recs.forEach(function (r) { var b = before[r.studentId]; if (!b || b.status !== r.status || (b.remarks || "") !== r.remarks) changed++; });
      list.forEach(function (x) { if (before[x.id] && !c.marks[x.id]) changed++; });
      var kept = s.records.filter(function (r) { return !list.some(function (x) { return x.id === r.studentId; }); });
      var nf = sessionFromForm(c);
      var fields = ["title", "subject", "period", "date"].filter(function (k) { return (s[k] || "") !== (nf[k] || ""); });
      c.saving = true; c.error = "";
      later(function () {
        if (S.corr !== c) return;
        Object.assign(s, nf); s.records = recs.concat(kept);
        s.history.push({ action: "Corrected", actor: actor(), at: nowStamp(), summary: [changed ? plural(changed, "student") + " changed" : "", fields.length ? "details updated (" + fields.join(", ") + ")" : ""].filter(Boolean).join(" · ") || "Saved with no changes" });
        var from = S.detail.from;
        S.corr = null; S.detail = { type: "session", id: s.id, from: from, just: true };
        C.toast("Correction saved", s.title + " · " + window.SC.fmtDay(s.date));
        render();
      }, 650);
    },
    deleteSession: function (id) {
      if (!C.isAdmin) return;
      var s = sessionById(id); if (!s) return;
      confirmDlg("Delete attendance session?", esc(s.title) + " on " + esc(window.SC.fmtDay(s.date)) + " with " + plural(s.records.length, "record") + " will be permanently deleted.", "Delete session",
        function () { S.d.attendanceSessions[S.classId] = sessions().filter(function (x) { return x.id !== id; }); C.toast("Session deleted", s.title + " · " + window.SC.fmtDay(s.date)); },
        { destructive: true });
    },
    exportHistory: function () {
      var rows = [["Date", "Title", "Subject", "Period", "Taken by", "Present", "Late", "Absent", "Rate %"]].concat(sortedSessions().map(function (s) {
        var x = sessStats(s); return [s.date, s.title, s.subject || "", s.period || "", s.takenBy, x.onlyPresent, x.late, x.absent, x.rate];
      }));
      downloadCsv(slug() + "-attendance.csv", rows);
      C.toast("Export ready", plural(rows.length - 1, "session") + " exported to CSV");
    },

    /* subjects */
    subAdd: function () { S.sub.adding = !S.sub.adding; S.sub.error = ""; S.sub.added = ""; if (S.sub.adding) S.focusKey = "id:sub-name"; },
    subCancel: function () { S.sub.adding = false; S.sub.name = ""; S.sub.desc = ""; S.sub.error = ""; S.sub.added = ""; },
    subSave: function () {
      var n = S.sub.name.trim(); S.focusKey = "id:sub-name";
      if (!n) { S.sub.error = "Enter a subject name."; S.sub.added = ""; return; }
      if (subjects().some(function (x) { return x.title.toLowerCase() === n.toLowerCase(); })) { S.sub.error = n + " is already a subject in this class."; S.sub.added = ""; return; }
      var sub = { id: S.classId + "-sub-" + uid("u"), title: n, description: S.sub.desc.trim(), assessments: [] };
      subjects().push(sub);
      S.sub.name = ""; S.sub.desc = ""; S.sub.error = ""; S.sub.added = n; S.sub.highlight = sub.id;
      later(function () { if (S.sub.highlight === sub.id) S.sub.highlight = null; }, 2600);
    },
    importOpen: function () {
      if (!availableImports().length) return;
      openDialog({ title: "Import from catalog", desc: "School catalog subjects that aren’t in " + esc(cls().displayName) + " yet.", w: "30rem", sel: {}, body: importBody,
        confirm: function (d) { var n = Object.keys(d.sel).length; return n ? "Import " + plural(n, "subject") : "Batch import"; },
        disabled: function (d) { return !Object.keys(d.sel).length; },
        run: function (d) {
          var names = Object.keys(d.sel);
          names.forEach(function (name) { subjects().push({ id: S.classId + "-sub-" + uid("i"), title: name, description: "", assessments: [] }); });
          C.toast("Subjects imported", plural(names.length, "subject") + " added to " + cls().displayName);
        } });
    },
    importToggle: function (name) { var d = S.dialog; if (!d) return; if (d.sel[name]) delete d.sel[name]; else d.sel[name] = true; },
    importAll: function () { var d = S.dialog; if (!d) return; availableImports().forEach(function (n) { d.sel[n] = true; }); },
    importClear: function () { if (S.dialog) S.dialog.sel = {}; },
    openSubject: function (id) { openDetail({ type: "subject", id: id, mode: "assessments" }); },
    enterScores: function (id) { openDetail({ type: "subject", id: id, mode: "scores" }); },
    deleteSubject: function (id) {
      if (!C.isAdmin) return;
      var sub = subjectById(id); if (!sub) return;
      confirmDlg("Delete " + esc(sub.title) + "?", "Its " + plural(sub.assessments.length, "assessment") + " and any scores recorded for " + esc(cls().displayName) + " will be removed.", "Delete subject",
        function () {
          S.d.subjects[S.classId] = subjects().filter(function (x) { return x.id !== id; });
          Object.keys(S.scores).forEach(function (k) { if (k.indexOf(id + "|") === 0) delete S.scores[k]; });
          if (S.detail && S.detail.type === "subject" && S.detail.id === id) { S.detail = null; S.aform = null; }
          C.toast("Subject deleted", sub.title);
        }, { destructive: true });
    },
    wsMode: function (m) { if (S.detail) S.detail.mode = m; S.aform = null; },
    recordScope: function (scope) { C.toast("Assessment recording", "Opens assessment recording (" + scope + " scope) in a new tab"); },
    printPreview: function (id) {
      var sub = subjectById(id); if (!sub) return;
      openDialog({ title: "Result sheet preview", desc: esc(sub.title) + " · " + esc(cls().displayName) + " · " + esc(termLabel()), w: "44rem", cancel: "Close", subjectId: id, body: printBody });
    },
    aCreate: function () {
      S.aform = { id: null, title: "", split: false, printMode: "EXPANDED", obtainable: "", weight: "", print: true,
        children: [{ title: "Part 1", obtainable: "", weight: "" }, { title: "Part 2", obtainable: "", weight: "" }], error: "" };
      S.focusKey = "id:af-title";
    },
    aEdit: function (aid) {
      var sub = subjectById(S.detail.id), a = sub && sub.assessments.filter(function (x) { return x.id === aid; })[0]; if (!a) return;
      var kids = a.children || [];
      S.aform = { id: a.id, title: a.title, split: kids.length > 0, printMode: a.printMode || "EXPANDED",
        obtainable: a.obtainable == null ? "" : String(a.obtainable), weight: String(a.weight || 0), print: a.print !== false,
        children: kids.length ? kids.map(function (c) { return { id: c.id, title: c.title, obtainable: c.obtainable == null ? "" : String(c.obtainable), weight: String(c.weight || 0) }; }) : [{ title: "Part 1", obtainable: "", weight: "" }],
        error: "" };
      S.focusKey = "id:af-title";
    },
    aCancel: function () { S.aform = null; },
    aPrintMode: function (m) { if (S.aform) S.aform.printMode = m; },
    aChildAdd: function () { var f = S.aform; f.children.push({ title: "Part " + (f.children.length + 1), obtainable: "", weight: "" }); S.focusKey = "id:af-c" + (f.children.length - 1) + "-t"; },
    aChildRemove: function (k) { var f = S.aform; if (f.children.length > 1) f.children.splice(Number(k), 1); },
    aSave: function () {
      var f = S.aform, sub = subjectById(S.detail.id); if (!f || !sub) return;
      var num = function (v) { return v === "" || v == null ? null : Number(v); };
      f.error = "";
      if (!f.title.trim()) { f.error = "Enter a title."; S.focusKey = "id:af-title"; return; }
      var kids = [];
      if (f.split) {
        kids = f.children.filter(function (c) { return String(c.title).trim(); });
        if (!kids.length) { f.error = "Add at least one part with a title."; return; }
        if (kids.some(function (c) { return (c.obtainable !== "" && !(Number(c.obtainable) > 0)) || (c.weight !== "" && !(Number(c.weight) >= 0)); })) { f.error = "Part obtainable and weight must be numbers."; return; }
      } else {
        if (f.obtainable !== "" && !(Number(f.obtainable) > 0)) { f.error = "Obtainable must be a number above 0, or blank for uncapped."; return; }
        if (f.weight !== "" && !(Number(f.weight) >= 0 && Number(f.weight) <= 100)) { f.error = "Weight must be between 0 and 100."; return; }
      }
      var a = { id: f.id || uid("a"), title: f.title.trim(), obtainable: f.split ? null : num(f.obtainable), weight: f.split ? 0 : (num(f.weight) || 0), submissions: 0, print: !!f.print,
        children: kids.map(function (c) { return { id: c.id || uid("p"), title: String(c.title).trim(), obtainable: num(c.obtainable), weight: num(c.weight) || 0, submissions: 0 }; }) };
      if (f.split) a.printMode = f.printMode;
      var i = sub.assessments.map(function (x) { return x.id; }).indexOf(a.id);
      if (i >= 0) sub.assessments[i] = a; else sub.assessments.push(a);
      S.aform = null;
    },
    aDelete: function (aid) {
      var sub = subjectById(S.detail.id), a = sub && sub.assessments.filter(function (x) { return x.id === aid; })[0]; if (!a) return;
      var n = aSubs(sub, a);
      confirmDlg("Delete " + esc(a.title) + "?", n ? plural(n, "recorded score") + " for this assessment will be removed." : "No scores have been recorded for it yet.", "Delete assessment",
        function () {
          var ids = [a.id].concat((a.children || []).map(function (c) { return c.id; }));
          sub.assessments = sub.assessments.filter(function (x) { return x.id !== aid; });
          Object.keys(S.scores).forEach(function (k) { var p = k.split("|"); if (p[0] === sub.id && ids.indexOf(p[2]) >= 0) delete S.scores[k]; });
          C.toast("Assessment deleted", a.title);
        }, { destructive: true });
    },
    aUp: function (aid) { moveA(aid, -1); },
    aDown: function (aid) { moveA(aid, 1); },
    aQuick: function (i) {
      var sub = subjectById(S.detail.id), x = S.d.assessmentSuggestions[Number(i)]; if (!sub || !x) return;
      sub.assessments.push({ id: uid("a"), title: x.title, obtainable: x.obtainable, weight: x.weight, submissions: 0, print: true, children: [] });
    },

    /* payments */
    payFilter: function (f) { S.pay.filter = f; },
    record: function (id) { var c = charges().filter(function (x) { return x.id === id; })[0]; if (c) openPay({ studentId: c.studentId, chargeId: c.id, fixed: true }); },
    receive: function () { openPay({}); },
    paySave: function () {
      var f = S.payForm; if (!f || f.saving) return;
      var c = charges(f.classId).filter(function (x) { return x.id === f.chargeId; })[0];
      var amt = Math.round(Number(String(f.amount).replace(/[,₦\s]/g, "")));
      f.error = "";
      if (!f.studentId) f.error = "Choose a student.";
      else if (!c) f.error = "Choose a charge to pay against.";
      else if (!(amt > 0)) f.error = "Enter an amount above ₦0.";
      else if (amt > c.outstanding) f.error = "That’s more than the " + money(c.outstanding) + " outstanding on this charge.";
      if (f.error) return;
      f.saving = true;
      later(function () {
        if (S.payForm !== f) return;
        c.amountPaid += amt; chargeStatus(c);
        closeDetail();
        C.toast("Payment recorded", money(amt) + " from " + c.studentName + " · " + f.method);
        render();
      }, 650);
    },
    exportCharges: function () {
      var rows = [["Student", "Fee", "Stream", "Amount", "Paid", "Outstanding", "Status"]].concat(charges().map(function (c) { return [c.studentName, c.title, c.stream, c.amount, c.amountPaid, c.outstanding, c.status]; }));
      downloadCsv(slug() + "-charges.csv", rows);
      C.toast("Export ready", plural(rows.length - 1, "charge") + " exported to CSV");
    },

    /* student overview */
    ovMove: function (id) {
      var s = student(id), dest = S.ov.dest; if (!s || !dest) return;
      confirmDlg("Move to " + esc(cls(dest).displayName) + "?", '<span dir="auto">' + esc(s.studentName) + "</span> leaves " + esc(cls().displayName) + ". Their charges move with them.", "Move student",
        function () { moveStudents([id], dest); S.detail = null; S.ov.dest = ""; C.toast("Student moved", s.studentName + " → " + cls(dest).displayName); });
    },

    /* new student */
    toggleParent: function (id, el, e) { if (e) e.preventDefault(); S.nform.parentOpen = !S.nform.parentOpen; },
    nfAddFee: function (i) { S.nform.pays[i] = String(S.d.feePreview[Number(i)].amount); S.focusKey = "id:nf-pay-" + i; },
    nfRemoveFee: function (i) { delete S.nform.pays[i]; },
    nfRetry: function () { S.nform.feeTry++; later(feeLoad, 0); },
    nfSave: function () {
      var f = S.nform; if (!f || f.saving) return;
      f.err = {};
      if (!f.first.trim()) f.err.first = "Enter a first name.";
      if (!f.surname.trim()) f.err.surname = "Enter a surname.";
      if (!f.gender) f.err.gender = "Choose a gender.";
      var fees = S.d.feePreview;
      if (f.fee === "ok" && Object.keys(f.pays).some(function (i) { var v = Number(String(f.pays[i]).replace(/[,\s]/g, "")); return !(v > 0) || v > fees[i].amount; })) f.err.pay = "Each payment must be between ₦1 and that fee’s amount.";
      var firstErr = ["first", "surname", "gender"].filter(function (k) { return f.err[k]; })[0];
      if (firstErr) { S.focusKey = "id:" + { first: "nf-first", surname: "nf-sur", gender: "nf-gender" }[firstErr]; return; }
      if (f.err.pay) return;
      f.saving = true;
      later(function () {
        if (S.nform !== f) return;
        var c = cls(f.classId), id = c.id + "-" + uid("st");
        var s = { id: id, name: f.first.trim(), surname: f.surname.trim(), otherName: f.other.trim(), studentName: f.first.trim() + " " + f.surname.trim(), gender: f.gender, dob: f.dob,
          enrolled: true, termFormId: "tf-" + id, admissionStatus: f.admission, guardian: f.pName.trim(), guardianPhone: f.pPhone.trim(), createdAt: S.d.today };
        roster(c.id).push(s);
        var received = 0, pending = 0, lines = [];
        if (f.fee === "ok") fees.forEach(function (x, i) {
          var paid = f.pays[i] != null ? Math.min(x.amount, Math.round(Number(String(f.pays[i]).replace(/[,\s]/g, "")))) : 0;
          var ch = { id: c.id + "-ch-" + uid("c"), studentId: id, studentName: s.studentName, title: x.title, stream: f.stream || c.stream, amount: x.amount, amountPaid: paid };
          chargeStatus(ch); charges(c.id).push(ch);
          received += paid; pending += ch.outstanding; if (paid) lines.push({ title: x.title, paid: paid });
        });
        f.saving = false;
        f.done = { studentId: id, name: s.studentName, classId: c.id, received: received, pending: pending, lines: lines, method: f.method, ref: f.ref.trim(), date: f.payDate };
        if (c.id === S.classId) { S.stu.highlight = id; later(function () { if (S.stu.highlight === id) S.stu.highlight = null; }, 2600); }
        render();
      }, 700);
    },
    nfCreateNew: function () { S.nform = newNform(S.nform.classId); S.focusKey = "id:nf-first"; },
    nfReceipt: function () {
      var dn = S.nform && S.nform.done; if (!dn) return;
      openDialog({ title: "Payment receipt", w: "28rem", cancel: "Close", r: { no: "RC-2026-" + String(1000 + S.uid).slice(-4), name: dn.name, classId: dn.classId, date: dn.date, method: dn.method, ref: dn.ref, lines: dn.lines, total: dn.received }, body: receiptBody });
    },
    nfApply: function () {
      var dn = S.nform && S.nform.done; if (!dn) return;
      var c = charges(dn.classId).filter(function (x) { return x.studentId === dn.studentId && x.outstanding > 0; })[0];
      S.nform = null;
      openPay({ classId: dn.classId, studentId: dn.studentId, chargeId: c ? c.id : "", fixed: true });
    }
  };
  function moveA(aid, dir) {
    var sub = subjectById(S.detail.id); if (!sub) return;
    var i = sub.assessments.map(function (x) { return x.id; }).indexOf(aid), j = i + dir;
    if (i < 0 || j < 0 || j >= sub.assessments.length) return;
    var t = sub.assessments[i]; sub.assessments[i] = sub.assessments[j]; sub.assessments[j] = t;
  }

  /* ================================================================
     EVENTS
     ================================================================ */
  function setPath(path, v) {
    var parts = path.split("."), o = S;
    for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = v;
  }
  function afterBind(path, v) {
    if (path === "att.subject" || path === "corr.subject") { var st = S[path.split(".")[0]]; st.title = v || "Daily attendance"; }
    else if (path === "att.date") { if (!v) S.att.date = S.d.today; else if (v > S.d.today) S.att.date = S.d.today; }
    else if (path === "stu.q") S.stu.limit = 20;
    else if (path === "nform.classId") { var c = cls(v); S.nform.stream = c.stream; S.nform.pays = {}; S.nform.feeTry = 0; later(feeLoad, 0); }
    else if (path === "payForm.studentId") {
      var f = S.payForm, ch = charges(f.classId).filter(function (x) { return x.studentId === v && x.outstanding > 0; })[0];
      f.chargeId = ch ? ch.id : ""; f.amount = ch ? String(ch.outstanding) : ""; f.error = "";
    } else if (path === "payForm.chargeId") {
      var g = S.payForm, c2 = charges(g.classId).filter(function (x) { return x.id === v; })[0];
      g.amount = c2 ? String(c2.outstanding) : "";
    } else if (path === "sub.name") S.sub.added = "";
  }
  function scoreInput(el) {
    var k = el.dataset.score, max = el.dataset.max === "" ? null : Number(el.dataset.max);
    S.scores[k] = el.value.trim();
    if (isBad(S.scores[k], max)) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    S.save = "saving"; paintSave();
    if (S.saveT) cancel(S.saveT);
    S.saveT = later(function () {
      S.saveT = null;
      var n = H ? H.querySelectorAll('.q-score[aria-invalid="true"]').length : 0;
      S.saveErr = n; S.save = n ? "error" : "saved"; paintSave();
    }, 600);
  }

  function onClick(e) {
    if (S.suppress) { S.suppress = false; e.preventDefault(); return; }
    var t = e.target;
    if (!t || !t.closest) return;
    var pop = t.closest(".q-pop"), trig = t.closest("[data-menu]");
    if (trig && !pop) { e.preventDefault(); toggleMenu(trig); return; }
    var a = t.closest("[data-act]"), dirty = false;
    if (S.menu && !pop) { S.menu = null; dirty = true; }
    if (!a || a.disabled) { if (dirty) render(); return; }
    S.lastKey = pop && S.menu ? S.menu.key : keyOf(a);
    if (pop && S.menu && !a.hasAttribute("data-keep")) { S.focusKey = S.menu.key; S.menu = null; }
    var fn = A[a.dataset.act];
    if (fn) fn(a.dataset.id, a, e);
    render();
  }
  function onInput(e) {
    var el = e.target;
    if (!el || !el.dataset) return;
    if (el.dataset.score != null) { scoreInput(el); return; }
    var path = el.dataset.bind; if (!path) return;
    var v = el.type === "checkbox" ? el.checked : el.value;
    setPath(path, v); afterBind(path, v);
    if (el.hasAttribute("data-rr")) render();
  }
  function onKey(e) {
    var t = e.target;
    if (!t || !t.classList) return;
    if (t.classList.contains("q-tab") && ["ArrowRight", "ArrowLeft", "Home", "End"].indexOf(e.key) >= 0) {
      var ids = SECTIONS.map(function (s) { return s.id; }), i = ids.indexOf(S.section);
      i = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length;
      e.preventDefault(); A.go(ids[i]); S.focusKey = "id:tab-" + ids[i]; render(); return;
    }
    if (t.closest(".q-pop") && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      var items = Array.prototype.slice.call(H.querySelectorAll(".q-pop .menu-item:not([disabled])"));
      if (items.length && t.classList.contains("menu-item")) { var k = items.indexOf(t); items[(k + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); e.preventDefault(); }
      return;
    }
    if (e.key === "Enter" && t.dataset && t.dataset.enter) { e.preventDefault(); S.lastKey = keyOf(t); A[t.dataset.enter](t.dataset.id, t, e); render(); }
  }
  function onDocKey(e) {
    if (e.key !== "Escape" || !S || !H || !document.body.contains(H)) return;
    if (S.dialog) { if (!S.dialog.saving) { closeDialog(); render(); } e.preventDefault(); return; }
    if (S.menu) { S.focusKey = S.menu.key; S.menu = null; render(); e.preventDefault(); return; }
    if (S.section === "students" && (S.stu.selecting || Object.keys(S.stu.sel).length)) { S.stu.sel = {}; S.stu.selecting = false; render(); e.preventDefault(); }
  }
  function onDocDown(e) {
    if (S && S.menu && H && !H.contains(e.target)) { S.menu = null; render(); }
  }
  function onScroll(e) {
    if (!S || !S.menu || Date.now() < (S.quietScroll || 0)) return;
    var t = e.target;
    if (t && t.closest && t.closest(".q-pop")) return;
    S.menu = null; render();
  }
  function onPDown(e) {
    var row = e.target.closest && e.target.closest("[data-press]");
    if (!row || e.button > 0 || e.target.closest("input,[data-menu]")) return;
    var id = row.dataset.press;
    press = { x: e.clientX, y: e.clientY, t: setTimeout(function () {
      press = null; S.stu.selecting = true; S.stu.sel[id] = true; S.suppress = true;
      setTimeout(function () { if (S) S.suppress = false; }, 700);
      render();
    }, 520) };
  }
  function onPMove(e) { if (press && (Math.abs(e.clientX - press.x) > 8 || Math.abs(e.clientY - press.y) > 8)) cancelPress(); }
  function cancelPress() { if (press) { clearTimeout(press.t); press = null; } }

  function observeMore() {
    if (io) { io.disconnect(); io = null; }
    var sen = H.querySelector("[data-more]"); if (!sen) return;
    var key = sen.dataset.more;
    if (typeof IntersectionObserver === "undefined") { loadMore(key); return; }
    io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) loadMore(key); }, { root: sen.closest("[data-scroll]") });
    io.observe(sen);
  }
  function loadMore(key) {
    var st = key === "stu" ? S.stu : S.att;
    if (st.loadingMore) return;
    st.loadingMore = true;
    later(function () { st.limit += key === "stu" ? 20 : 40; st.loadingMore = false; render(); }, 450);
  }

  function bindHost(h) {
    if (!h._qBound) {
      h._qBound = true;
      h.addEventListener("click", function (e) { if (S) onClick(e); });
      h.addEventListener("input", function (e) { if (S) onInput(e); });
      h.addEventListener("keydown", function (e) { if (S) onKey(e); });
      h.addEventListener("pointerdown", function (e) { if (S) onPDown(e); });
      h.addEventListener("pointermove", onPMove);
      h.addEventListener("pointerup", cancelPress);
      h.addEventListener("pointercancel", cancelPress);
      h.addEventListener("scroll", onScroll, true);
    }
    if (!window._qDocBound) { window._qDocBound = true; document.addEventListener("keydown", onDocKey); document.addEventListener("pointerdown", onDocDown, true); }
  }

  /* ================================================================
     MOUNT
     ================================================================ */
  function mount(host, ctx) {
    H = host; C = ctx;
    if (!S) S = initState();
    host.classList.add("q-host");
    bindHost(host);
    if (!S.booted && !S.booting) { S.booting = true; startLoad(500, dupCheck); }
    render();
  }
  function reset() {
    clearTimers(); cancelPress();
    if (io) { io.disconnect(); io = null; }
    S = initState();
  }

  var COVERAGE = {
    H1: "Title is a borderless switcher (⇅) listing all five classes incl. the empty SS 1; keeps the section, clears detail panels, attendance draft, selection and searches.",
    H2: "Muted “First Term · 2026/2027” beside the title.",
    H3: "Class name is the switcher label on row 1 of the header.",
    H4: "Fix: one quiet sentence of real numbers (students · % attendance over N sessions · ₦ outstanding), each a link to its section. No “--”; class average lives in Performance.",
    H5: "Plain underline tabs with muted counts and a “Soon” chip; ?classroomTab= deep link, null/invalid → Students; ←/→ keys; phone row scrolls with a fade edge.",
    H6: "Close X in the header (closed state has Reopen). Detail panels open beside the list on desktop (sheet widens to 72rem) and replace it on phone with a back arrow.",
    H7: "Skeleton on open and on class switch; switcher menu → Preview states → loading skeleton / error fallback with Try again.",
    S1: "One slim amber notice above the list (name · N records · keep <class> record · Review merge); muted “Checking student count and duplicate names…” while loading; “No duplicate names found” lives in the ⋯ menu label. Student count is not repeated.",
    S2: "Review merge dialog: members with Recommended survivor badge, history score and counts; Records to move; Conflicts alert; Cancel / Merge duplicate (disabled unless canMerge and Admin/Registrar). Merge removes the duplicate.",
    S3: "Primary “Add student” in the Students toolbar → New Student panel.",
    S4: "Two-line rows: initials avatar, name; “ID xxxxxxxx · gender · admission”; Not enrolled pill; guardian phone on hover. ⋯ → “Show as table” gives ID, status, admission, DOB, guardian, phone columns.",
    S5: "Search (name/ID) on the left of the toolbar; Sort button (name, gender, DOB, date added, asc/desc). Global filters don’t apply here.",
    S6: "Row click → Student overview panel: name, class, gender, Report card, Edit; segmented Overview (ID, class, term, gender, move-class select) / Academics / Attendance / Payments.",
    S7: "Row ⋯: Ask assistant, View details; Admin/Registrar: Edit information, Remove from current term (only if enrolled), Delete student — confirm dialogs with Saving… and inline error (delete is refused when payments exist).",
    S8: "Checkbox on hover, ⋯ → Select students, or long-press on phone; bulk bar slides up: count, Deselect, Assistant, Export CSV (real Blob); Admin/Registrar ⋯: Set admission status, Move class (destination, refresh, 1–100 limit), Remove from term — confirms + toast summary.",
    S9: "Empty “No students in this class yet” + Enroll student; “No students match” + Clear search; skeleton on load; “Loading more students…” sentinel loads rows in batches of 20.",
    S10: "New Student panel: names, gender, DOB, admission status, classroom (prefilled), stream, fee preview with per-fee Add payment, Retry fee preview (SS 1 fails once), method/date/reference, collapsible parent; “Loading your registration workspace…”; success with Create new / Close / View receipt or Apply payment. Close really closes; counts refresh everywhere.",
    A1: "Session chip “Daily attendance ▾” in the toolbar opens a popover: General class / Subject, title, subject select (auto-fills title), optional period.",
    A2: "Toolbar date stepper ‹ Mon 12 Oct › with a date-picker popover and Today; no future dates.",
    A3: "Attendance ⋯ → Add student (Admin/Registrar) → New Student panel.",
    A4: "Attendance ⋯ → Mark all as / Mark rest as (Present, Absent, Late) and Clear all.",
    A5: "Roster rows: No., name, compact P/A/L pills (tinted rows, tap again to clear), remark field reveals under the row for A/L; empty “No students enrolled… active term”; renders in batches of 40.",
    A6: "Sticky footer “X of Y students marked” with bar; partial save allowed; inline errors (nothing marked, missing subject, duplicate session); primary Save in toolbar; no per-tap toasts.",
    A7: "Segmented Take | History (no tabs-in-a-tab). History opens with one sentence: sessions · records · % attended (n) · % absent (n); ⋯ → Export CSV.",
    A8: "History rows: title, date · subject · period · taken by, present/absent, thin rate bar; row ⋯: Open, Correct, Delete (Admin only, confirm). Empty “No attendance records yet”.",
    A9: "Session panel: title, date · staff · subject · period, one sentence of counts (% attended, present incl. late, absent, excused, on leave), revision history, students with remark/“No remark”; Close, Correct session; not-found state after delete.",
    A10: "Correct session panel: same fields + roster prefilled; Cancel / Save correction adds a “Corrected” history entry and returns to details.",
    U1: "Primary “Add subject” opens an inline row form (name, description); empty-name and duplicate errors; resets and stays open after save.",
    U2: "Subjects ⋯ → Import from catalog (only when unattached exist): checkbox list, N selected, Select all / Clear all, Batch import.",
    U3: "Subject rows: title, “N assessments · 100% weighted” or amber “No assessments” / “Weights x%”; no filler or always-on badge. Row ⋯: Open, Enter scores, Delete (Admin, confirm). Empty state with working Add subject.",
    U4: "Workspace panel header: subject, class · N students, Record submission; stats are ONE sentence under the segmented Assessments | Scores (no unlabeled/empty tabs).",
    U5: "Assessments mode: Create, Quick add chips, result-sheet print line + Print preview dialog, rows (#n, pts/Uncapped, weight, submissions, sub-assessments, print status, 0% warning), ↑/↓, Edit, Delete; child “Part n under X” rows; empty state.",
    U6: "Inline assessment form: Title, Split switch → print mode Expanded/Total + part rows (title, obtainable, weight, add/remove) with totals; else Obtainable (blank = uncapped) + Weight %; Show on result sheet; live warnings; Cancel/Save.",
    U7: "Scores mode grid: numbered students (dir=auto), one input per weighted item with “/ max” or Uncapped, red over-max, 600ms autosave indicator Saving…/Saved/error. No hard-coded header language.",
    U8: "“Record submission ▾” in the workspace header: Full / Classroom / Subject scope → toast (opens recorder in a new tab).",
    P1: "One sentence: ₦ billed · ₦ received · ₦ outstanding — % collected (x/y paid) with a thin progress bar.",
    P2: "Toolbar: search + Outstanding / Settled / All; “N outstanding, N settled”; rows sorted by outstanding with status badge, fee · stream, amount, “paid ₦x”, Record (prefilled). Empty “No student charges”; skeleton on load.",
    P3: "Primary “Receive payment” → panel (pick student, charge, amount, method, date, reference) → Save updates totals and status.",
    R1: "Performance tab: Coming soon placeholder (class average lives here once scores exist).",
    X1: "Teacher: no Edit/Remove/Delete, no bulk manage ⋯, no Add student in attendance, no Delete session/subject, no merge. Registrar: manage but no deletes of sessions/subjects.",
    X2: "Only product tokens; works with the dark toggle (bulk bar inverts with tokens).",
    X3: "Phone: tabs scroll, toolbar wraps to two rows, panels replace the list with a back arrow, icon-only header buttons; focus-visible rings, arrow-key tabs/menus, Escape closes menus/dialogs, dir=auto on names."
  };

  window.SCW.init({
    id: "01", name: "Quiet toolbar", tagline: "Same tabs, one consistent toolbar and list rhythm in every section.",
    coverage: COVERAGE, mount: mount, reset: reset
  });
})();
