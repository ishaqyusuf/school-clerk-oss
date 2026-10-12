/* 02 · Section rail — sections with live metrics on the left; details open in place, the sheet never widens. */
(function () {
  "use strict";

  var I = function (n, s, c) { return window.SCIcons.icon(n, s || 16, c); };
  var esc = window.SC.esc, money = window.SC.money, initials = window.SC.initials;
  var fmtDay = window.SC.fmtDay, fmtDate = window.SC.fmtDate;

  var H = null, CTX = null, S = null, OBS = null, docBound = false;

  var SECTIONS = [
    { id: "students", label: "Students", icon: "users" },
    { id: "attendance", label: "Attendance", icon: "calendar-check" },
    { id: "subjects", label: "Subjects", icon: "book-open" },
    { id: "payments", label: "Payments", icon: "wallet" },
    { id: "performance", label: "Performance", icon: "chart-line" }
  ];
  var ADM = { NEW: "New admission", RETURNING: "Returning", NEEDS_CLASSIFICATION: "Needs classification" };
  var ADM_BADGE = { NEW: "badge-info", RETURNING: "badge-neutral", NEEDS_CLASSIFICATION: "badge-warning" };
  var MARK = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late" };
  var COLS = { gender: "Gender", dob: "Date of birth", created: "Created" };
  var PAY = { PAID: ["badge-success", "Paid"], PART_PAID: ["badge-warning", "Part paid"], PENDING: ["badge-neutral", "Pending"] };
  var PAGE = 20;

  /* ================= state ================= */
  function initialSection() {
    var t = null;
    try { t = new URLSearchParams(location.search).get("classroomTab"); } catch (e) { t = null; }
    return SECTIONS.some(function (s) { return s.id === t; }) ? t : "students";
  }
  function newState() {
    return {
      d: window.SC.fresh(), classId: "jss1a", section: initialSection(), stack: [],
      q: "", sort: { key: "name", dir: 1 }, cols: { gender: false, dob: false, created: false }, sel: {}, shown: PAGE, loadingMore: false,
      loading: false, error: false, dupChecking: false, closed: false,
      subjForm: null, menu: null, dialog: null, focusSel: null,
      scores: {}, save: "idle", saveT: null, timers: [], seq: 1
    };
  }
  function later(fn, ms) {
    var st = S;
    var t = setTimeout(function () { if (S !== st) return; st.timers = st.timers.filter(function (x) { return x !== t; }); fn(); }, ms);
    S.timers.push(t); return t;
  }
  function uid(p) { S.seq += 1; return p + "-" + (0x5a00 + S.seq * 97).toString(16) + "b3d9e0f"; }
  function startLoad() {
    S.loading = true; S.error = false; S.dupChecking = true;
    later(function () { S.loading = false; render(); }, 420);
    later(function () { S.dupChecking = false; render(); }, 1150);
  }

  /* ================= data helpers ================= */
  function isPhone() { return CTX && CTX.viewport === "phone"; }
  function canManage() { return !!(CTX && CTX.canManage); }
  function isAdmin() { return !!(CTX && CTX.isAdmin); }
  function termLabel() { return S.d.session.term.title + " · " + S.d.session.title; }
  function cls() { return S.d.classrooms.filter(function (c) { return c.id === S.classId; })[0]; }
  function classById(id) { return S.d.classrooms.filter(function (c) { return c.id === id; })[0]; }
  function roster() { return S.d.rosters[S.classId]; }
  function sessions() { return S.d.attendanceSessions[S.classId]; }
  function subjects() { return S.d.subjects[S.classId]; }
  function charges() { return S.d.charges[S.classId]; }
  function dups() { return S.d.duplicates[S.classId] || []; }
  function top() { return S.stack[S.stack.length - 1] || null; }
  function shortId(id) { return String(id).replace(/^[^-]+-/, "").slice(0, 8).toUpperCase(); }
  function findStudent(id) { for (var k in S.d.rosters) { var s = S.d.rosters[k].filter(function (x) { return x.id === id; })[0]; if (s) return s; } return null; }
  function classOfStudent(id) { for (var k in S.d.rosters) { if (S.d.rosters[k].some(function (x) { return x.id === id; })) return classById(k); } return null; }
  function allCharges() { var out = []; Object.keys(S.d.charges).forEach(function (k) { out = out.concat(S.d.charges[k]); }); return out; }
  function allSessions() { var out = []; Object.keys(S.d.attendanceSessions).forEach(function (k) { out = out.concat(S.d.attendanceSessions[k]); }); return out; }
  function findSession(id) { return sessions().filter(function (s) { return s.id === id; })[0] || null; }
  function findSubject(id) { return subjects().filter(function (s) { return s.id === id; })[0] || null; }
  function selIds() { var r = roster(); return Object.keys(S.sel).filter(function (id) { return S.sel[id] && r.some(function (s) { return s.id === id; }); }); }
  function addDays(iso, n) { var d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function nowStamp() { var d = new Date(); return S.d.today + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function plural(n, w, p) { return n + " " + (n === 1 ? w : (p || w + "s")); }

  function sessStats(s) {
    var p = 0, l = 0, a = 0;
    s.records.forEach(function (r) { if (r.status === "PRESENT") p++; else if (r.status === "LATE") l++; else if (r.status === "ABSENT") a++; });
    var n = s.records.length;
    return { n: n, p: p, l: l, a: a, att: p + l, rate: n ? Math.round((p + l) / n * 100) : 0 };
  }
  function attTotals() {
    var n = 0, att = 0, ab = 0;
    sessions().forEach(function (s) { var t = sessStats(s); n += t.n; att += t.att; ab += t.a; });
    return { sessions: sessions().length, n: n, att: att, ab: ab, avg: n ? Math.round(att / n * 100) : 0, abPct: n ? Math.round(ab / n * 100) : 0 };
  }
  function todaySession() { var t = sessions().filter(function (s) { return s.date === S.d.today; }); return t[t.length - 1] || null; }

  function aWeight(a) { return a.children && a.children.length ? a.children.reduce(function (t, c) { return t + (+c.weight || 0); }, 0) : (+a.weight || 0); }
  function subjWeight(sub) { return sub.assessments.reduce(function (t, a) { return t + aWeight(a); }, 0); }
  function needsWeights(sub) { return subjWeight(sub) !== 100; }
  function scoreItems(sub) {
    var out = [];
    sub.assessments.forEach(function (a) {
      if (a.children && a.children.length) a.children.forEach(function (c) { out.push({ id: c.id, label: c.title, parent: a.title, max: c.obtainable == null || c.obtainable === "" ? null : +c.obtainable, weight: +c.weight || 0 }); });
      else out.push({ id: a.id, label: a.title, parent: null, max: a.obtainable == null || a.obtainable === "" ? null : +a.obtainable, weight: +a.weight || 0 });
    });
    return out;
  }
  function itemSubs(subId, itemId) {
    var m = S.scores[subId] || {}, n = 0;
    Object.keys(m).forEach(function (sid) { var v = m[sid][itemId]; if (v !== undefined && v !== "" && !isNaN(Number(v))) n++; });
    return n;
  }
  function aSubs(sub, a) {
    if (a.children && a.children.length) return a.children.reduce(function (t, c) { return t + (c.submissions || 0) + itemSubs(sub.id, c.id); }, 0);
    return (a.submissions || 0) + itemSubs(sub.id, a.id);
  }
  function subSubs(sub) { return sub.assessments.reduce(function (t, a) { return t + aSubs(sub, a); }, 0); }
  function printCols(sub) {
    var cols = [];
    sub.assessments.forEach(function (a) {
      if (a.print === false) return;
      if (a.children && a.children.length && a.printMode === "EXPANDED") a.children.forEach(function (c) { cols.push(c.title + " (" + (+c.weight || 0) + "%)"); });
      else cols.push(a.title + " (" + aWeight(a) + "%)");
    });
    return cols;
  }

  function payTotals() {
    var c = charges(), billed = 0, rec = 0, out = 0, paid = 0;
    c.forEach(function (x) { billed += x.amount; rec += x.amountPaid; out += x.outstanding; if (x.status === "PAID") paid++; });
    return { n: c.length, billed: billed, received: rec, outstanding: out, paid: paid, open: c.length - paid, pct: billed ? Math.round(rec / billed * 100) : 0 };
  }
  function setChargeStatus(c) { c.status = c.outstanding <= 0 ? "PAID" : c.amountPaid > 0 ? "PART_PAID" : "PENDING"; }
  function applyPayment(studentId, amount) {
    var left = amount;
    allCharges().filter(function (c) { return c.studentId === studentId && c.outstanding > 0; })
      .sort(function (a, b) { return b.outstanding - a.outstanding; })
      .forEach(function (c) { if (left <= 0) return; var p = Math.min(left, c.outstanding); c.amountPaid += p; c.outstanding -= p; setChargeStatus(c); left -= p; });
  }
  function studentOutstanding(id) { return allCharges().filter(function (c) { return c.studentId === id; }).reduce(function (t, c) { return t + c.outstanding; }, 0); }

  function getPath(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, v) { var ks = path.split("."), o = obj; for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = v; }

  function download(name, rows) {
    var csv = rows.map(function (r) { return r.map(function (v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(","); }).join("\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  /* ================= small html helpers ================= */
  function pageHead(title, sub, actions, lead) {
    return '<header class="r-head"><div class="r-head-t">' + (lead || "") + '<div><h2 class="r-title" tabindex="-1">' + title + '</h2>' + (sub ? '<p class="r-sub">' + sub + '</p>' : "") + '</div></div>' +
      (actions ? '<div class="r-actions">' + actions + '</div>' : "") + '</header>';
  }
  function kebab(key, arg, label) {
    var items = MENUS[key](arg || "");
    if (!items.length) return "";
    var fk = "mk-" + key + "-" + (arg || "");
    return '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="menu" data-menu="' + key + '" data-arg="' + esc(arg || "") + '" data-fk="' + esc(fk) + '" aria-haspopup="menu" aria-label="' + esc(label || "More actions") + '">' + I("ellipsis") + '</button>';
  }
  function empty(icon, title, desc, actions) {
    return '<div class="r-empty"><span class="r-empty-ic">' + I(icon, 20) + '</span><b>' + title + '</b>' + (desc ? '<p>' + desc + '</p>' : "") + (actions ? '<div class="r-empty-a">' + actions + '</div>' : "") + '</div>';
  }
  function skeletonRows(n) { var h = ""; for (var i = 0; i < n; i++) h += '<div class="r-sk-row"><span class="skeleton"></span><span class="skeleton" style="height:12px;width:' + (40 + (i * 13) % 35) + '%"></span><span class="skeleton" style="height:12px;width:18%;margin-left:auto"></span></div>'; return h; }
  function fid(path) { return "f-" + path.replace(/[^a-zA-Z0-9]/g, "-"); }
  function field(label, control, path, o) {
    o = o || {};
    return '<div class="field"><label class="label" for="' + fid(path) + '">' + label + (o.opt ? ' <span class="field-optional">Optional</span>' : "") + '</label>' + control + (o.err ? '<p class="field-error">' + esc(o.err) + '</p>' : "") + (o.hint ? '<p class="field-description">' + o.hint + '</p>' : "") + '</div>';
  }
  function inp(path, val, o) {
    o = o || {};
    return '<input class="input' + (o.cls ? " " + o.cls : "") + '" id="' + fid(path) + '" data-scope="' + (o.scope || "top") + '" data-bind="' + path + '" data-fk="' + (o.scope || "top") + ":" + path + '" value="' + esc(val == null ? "" : val) + '"' +
      (o.type ? ' type="' + o.type + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.err ? ' aria-invalid="true"' : "") + (o.dir ? ' dir="auto"' : "") +
      (o.re ? " data-re" : "") + (o.after ? ' data-after="' + o.after + '"' : "") + (o.enter ? ' data-enter="' + o.enter + '"' : "") + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + (o.attrs || "") + '>';
  }
  function sel(path, val, options, o) {
    o = o || {};
    return '<select class="select' + (o.cls ? " " + o.cls : "") + '" id="' + fid(path) + '" data-scope="' + (o.scope || "top") + '" data-bind="' + path + '" data-fk="' + (o.scope || "top") + ":" + path + '"' + (o.re ? " data-re" : "") + (o.after ? ' data-after="' + o.after + '"' : "") + (o.err ? ' aria-invalid="true"' : "") + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + '>' +
      options.map(function (op) { return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(val) ? " selected" : "") + '>' + esc(op[1]) + '</option>'; }).join("") + '</select>';
  }
  function tabs(list, current, act) {
    return '<div class="tabs-list r-tabs" role="tablist">' + list.map(function (t) { return '<button type="button" class="tabs-trigger" role="tab" aria-selected="' + (t[0] === current) + '" data-act="' + act + '" data-arg="' + t[0] + '" data-fk="tab-' + t[0] + '">' + t[1] + '</button>'; }).join("") + '</div>';
  }
  function payBadge(st) { var b = PAY[st]; return '<span class="badge ' + b[0] + '">' + b[1] + '</span>'; }
  function notFound(title, desc) { return empty("circle-alert", title, desc, '<button type="button" class="btn btn-outline btn-sm" data-act="back">' + I("arrow-left") + 'Go back</button>'); }

  /* ================= rail metrics ================= */
  function metric(id) {
    if (S.error) return "Unavailable";
    if (S.loading) return '<span class="skeleton r-sk-m"></span>';
    if (id === "students") {
      var n = roster().length; if (!n) return "No students yet";
      if (S.dupChecking) return n + " · checking duplicates…";
      var k = dups().length; return n + " · " + (k ? '<span class="r-warn">' + plural(k, "duplicate") + '</span>' : "no duplicates");
    }
    if (id === "attendance") {
      if (!roster().some(function (s) { return s.enrolled; })) return "No students to mark";
      var t = todaySession();
      if (!sessions().length) return '<span class="r-warn">Today not taken</span>';
      return attTotals().avg + "% avg · " + (t ? "today taken" : '<span class="r-warn">today not taken</span>');
    }
    if (id === "subjects") {
      var ss = subjects(); if (!ss.length) return "None yet";
      var w = ss.filter(needsWeights).length;
      return ss.length + " · " + (w ? '<span class="r-warn">' + w + (w === 1 ? " needs" : " need") + ' weights</span>' : "weights ok");
    }
    if (id === "payments") { var p = payTotals(); if (!p.n) return "No charges"; return p.outstanding ? money(p.outstanding) + " due" : '<span class="r-ok">All settled</span>'; }
    return "Coming soon";
  }

  /* ================= shell ================= */
  function switcher() {
    var c = cls();
    return '<button type="button" class="r-switch" data-act="menu" data-menu="classes" data-align="left" data-fk="switcher" aria-haspopup="menu" aria-label="Switch classroom, current ' + esc(c.displayName) + '">' +
      '<span class="r-switch-t"><b dir="auto">' + esc(c.displayName) + '</b><small>' + esc(termLabel()) + '</small></span>' + I("chevrons-up-down") + '</button>';
  }
  function railHtml() {
    return '<aside class="r-rail" aria-label="Classroom">' + switcher() +
      '<nav class="r-nav" aria-label="Classroom sections">' + SECTIONS.map(function (s) {
        return '<button type="button" class="r-item" data-act="section" data-arg="' + s.id + '" data-fk="sec-' + s.id + '"' + (S.section === s.id ? ' aria-current="page"' : "") + '>' +
          '<span class="r-item-l">' + I(s.icon) + s.label + '</span><span class="r-item-m">' + metric(s.id) + '</span></button>';
      }).join("") + '</nav>' +
      '<div class="r-rail-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="closeSheet">' + I("x") + 'Close sheet</button></div></aside>';
  }
  function topbarHtml() {
    return '<div class="r-top"><div class="r-top-row">' + switcher() +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="closeSheet" aria-label="Close sheet">' + I("x") + '</button></div>' +
      '<nav class="r-chips" aria-label="Classroom sections">' + SECTIONS.map(function (s) {
        return '<button type="button" class="r-chip-s" data-act="section" data-arg="' + s.id + '" data-fk="sec-' + s.id + '"' + (S.section === s.id ? ' aria-current="page"' : "") + '><b>' + s.label + '</b><small>' + metric(s.id) + '</small></button>';
      }).join("") + '</nav></div>';
  }
  function crumbLabel(it) {
    switch (it.kind) {
      case "student": { var s = findStudent(it.id); return s ? s.studentName : "Student"; }
      case "studentEdit": return "Edit information";
      case "newStudent": return it.done ? "Student created" : "New student";
      case "session": { var x = findSession(it.id); return x ? x.title + " · " + fmtDay(x.date) : "Session"; }
      case "record": return it.correctId ? "Correct session" : "Take attendance";
      case "subject": { var u = findSubject(it.id); return u ? u.title : "Subject"; }
      case "receive": return "Receive payment";
    }
    return "";
  }
  function crumbHtml() {
    var sec = SECTIONS.filter(function (s) { return s.id === S.section; })[0];
    var parts = ['<li><button type="button" class="r-crumb-link" data-act="crumb" data-arg="-1">' + sec.label + '</button></li>'];
    S.stack.forEach(function (it, i) {
      parts.push('<li class="r-crumb-sep" aria-hidden="true">/</li>');
      if (i === S.stack.length - 1) parts.push('<li aria-current="page"><span dir="auto">' + esc(crumbLabel(it)) + '</span></li>');
      else parts.push('<li><button type="button" class="r-crumb-link" data-act="crumb" data-arg="' + i + '" dir="auto">' + esc(crumbLabel(it)) + '</button></li>');
    });
    return '<div class="r-crumb"><button type="button" class="btn btn-ghost btn-icon btn-sm r-back" data-act="back" data-fk="back" aria-label="Back">' + I("arrow-left") + '</button>' +
      '<ol class="breadcrumb" aria-label="Breadcrumb">' + parts.join("") + '</ol><span class="r-esc"><span class="kbd">Esc</span>back</span></div>';
  }
  function viewKey() { return S.section + "/" + S.stack.map(function (it) { return it.kind + ":" + (it.id || "") + ":" + (it.tab || ""); }).join("/"); }
  function sheetHtml() {
    var phone = isPhone(), drilled = S.stack.length > 0;
    var foot = footerHtml();
    return '<div class="r-sheet' + (phone ? " is-phone" : "") + (phone && drilled ? " is-drilled" : "") + '">' +
      (phone ? (drilled ? "" : topbarHtml()) : railHtml()) +
      '<section class="r-pane" aria-label="' + esc(drilled ? crumbLabel(top()) : S.section) + '">' + (drilled ? crumbHtml() : "") +
      '<div class="r-body' + (foot ? " has-foot" : "") + '" data-key="' + esc(viewKey()) + '">' + paneHtml() + '</div>' + foot + bulkHtml() + '</section>' +
      menuHtml() + dialogHtml() + '</div>';
  }
  function paneHtml() {
    if (S.error) return '<div class="r-errorbox"><span class="r-empty-ic">' + I("circle-alert", 20) + '</span><b>Couldn\'t load ' + esc(cls().displayName) + '</b><p class="r-muted" style="margin:0">Something went wrong loading this classroom. Your other classes are unaffected.</p><div class="r-empty-a"><button type="button" class="btn btn-default btn-sm" data-act="retry">' + I("refresh-cw") + 'Try again</button></div></div>';
    if (S.loading) return '<div class="r-sk" aria-busy="true" aria-label="Loading classroom"><span class="skeleton" style="height:22px;width:9rem"></span><span class="skeleton" style="width:14rem;height:12px"></span><div style="height:12px"></div>' + skeletonRows(7) + '</div>';
    var it = top();
    if (it) {
      switch (it.kind) {
        case "student": return studentDrill(it);
        case "studentEdit": return studentForm(it, true);
        case "newStudent": return studentForm(it, false);
        case "session": return sessionDrill(it);
        case "record": return recorder(it);
        case "subject": return subjectDrill(it);
        case "receive": return receiveDrill(it);
      }
    }
    if (S.section === "students") return studentsPage();
    if (S.section === "attendance") return attendancePage();
    if (S.section === "subjects") return subjectsPage();
    if (S.section === "payments") return paymentsPage();
    return performancePage();
  }

  /* ================= Students ================= */
  function sortedStudents() {
    var q = S.q.trim().toLowerCase();
    var list = roster().filter(function (s) {
      if (!q) return true;
      return (s.studentName + " " + (s.otherName || "")).toLowerCase().indexOf(q) > -1 || shortId(s.id).toLowerCase().indexOf(q) > -1 || s.id.toLowerCase().indexOf(q) > -1;
    });
    var k = S.sort.key, dir = S.sort.dir;
    function v(s) { return k === "gender" ? s.gender : k === "dob" ? (s.dob || "") : k === "created" ? s.createdAt : k === "admission" ? ADM[s.admissionStatus] : k === "status" ? (s.enrolled ? "0" : "1") : k === "guardian" ? (s.guardian || "") : s.studentName.toLowerCase(); }
    return list.slice().sort(function (a, b) { var x = v(a), y = v(b); return (x < y ? -1 : x > y ? 1 : 0) * dir || a.studentName.localeCompare(b.studentName); });
  }
  function sortTh(key, label, extra) {
    var on = S.sort.key === key, dir = on ? (S.sort.dir === 1 ? "ascending" : "descending") : "none";
    return '<th class="' + (extra || "") + '" aria-sort="' + dir + '"><button type="button" class="r-sort" data-act="sort" data-arg="' + key + '" data-fk="sort-' + key + '">' + label + I(on ? (S.sort.dir === 1 ? "chevron-up" : "chevron-down") : "chevrons-up-down", 13) + '</button></th>';
  }
  function studentsPage() {
    var r = roster(), c = cls();
    var enrolled = r.filter(function (s) { return s.enrolled; }).length, notEn = r.length - enrolled, ds = dups();
    var sub = r.length ? enrolled + " enrolled this term" + (notEn ? " · " + notEn + " not enrolled" : "") + (!S.dupChecking && !ds.length ? " · No duplicate names found" : "") : "";
    var h = pageHead("Students", sub, '<button type="button" class="btn btn-default btn-sm" data-act="newStudent" data-fk="add-student">' + I("user-plus") + 'Add student</button>' + kebab("students"));
    if (!r.length) return h + empty("users", "No students", "Nobody is enrolled in " + esc(c.displayName) + " for " + esc(termLabel()) + " yet.", '<button type="button" class="btn btn-default btn-sm" data-act="newStudent">' + I("user-plus") + 'Enroll student</button>');

    if (S.dupChecking) h += '<div class="r-notice is-muted" role="status">' + I("loader-circle", 16, "r-spin") + '<span>Checking student count and duplicate names…</span></div>';
    else {
      if (ds.length > 1) {
        var aff = ds.reduce(function (t, g) { return t + g.records; }, 0);
        h += '<p class="r-sub" style="margin:-6px 0 8px">' + plural(ds.length, "duplicate group") + " · " + aff + ' students affected</p>';
      }
      ds.forEach(function (g) {
        h += '<div class="r-notice" role="alert">' + I("triangle-alert") + '<span><b dir="auto">' + esc(g.displayName) + '</b> has ' + g.records + ' records. Recommended: keep the ' + esc(g.survivor.className) + ' record <span class="mono">' + shortId(g.survivor.id) + '</span>.</span>' +
          '<button type="button" class="btn-link" data-act="reviewMerge" data-arg="' + g.key + '">Review merge</button></div>';
      });
    }

    h += '<div class="r-toolbar"><div class="input-group"><span class="input-addon">' + I("search", 15) + '</span><input class="input" type="search" placeholder="Search name or student ID" aria-label="Search students" data-input="q" data-fk="q" value="' + esc(S.q) + '"></div>' +
      '<span class="r-spacer"></span><button type="button" class="btn btn-outline btn-sm r-hide-p" data-act="menu" data-menu="columns" data-fk="columns" aria-haspopup="menu">' + I("columns-3") + 'Columns</button></div>';

    var list = sortedStudents();
    if (!list.length) return h + empty("search", "No results", "No student matches “" + esc(S.q) + "”.", '<button type="button" class="btn btn-outline btn-sm" data-act="clearSearch">Clear filters</button>');

    var ids = list.map(function (s) { return s.id; }), nSel = ids.filter(function (id) { return S.sel[id]; }).length;
    var colsOn = ["gender", "dob", "created"].filter(function (k) { return S.cols[k]; });
    var thead = '<tr><th class="r-cb"><input type="checkbox" class="checkbox" data-act="selAll" data-fk="selall" aria-label="Select all ' + list.length + ' students"' + (nSel && nSel === ids.length ? " checked" : "") + (nSel && nSel < ids.length ? " data-indet" : "") + '></th>' +
      sortTh("name", "Student") + sortTh("admission", "Admission", "r-hide-p") + sortTh("guardian", "Guardian", "r-hide-p") +
      colsOn.map(function (k) { return sortTh(k, COLS[k], "r-hide-p"); }).join("") + sortTh("status", "Status", "r-hide-p") + '<th class="r-rowact"><span class="sr-only">Actions</span></th></tr>';
    var shown = list.slice(0, S.shown);
    var rows = shown.map(function (s) {
      var on = !!S.sel[s.id];
      return '<tr data-act="openStudent" data-arg="' + s.id + '"' + (on ? ' data-state="selected"' : "") + '>' +
        '<td class="r-cb" data-act="sel" data-arg="' + s.id + '"><input type="checkbox" class="checkbox" data-act="sel" data-arg="' + s.id + '" data-fk="sel-' + s.id + '" aria-label="Select ' + esc(s.studentName) + '"' + (on ? " checked" : "") + '></td>' +
        '<td><div class="r-who"><span class="avatar" aria-hidden="true">' + esc(initials(s.studentName)) + '</span><div class="r-2l"><button type="button" class="r-link" data-act="openStudent" data-arg="' + s.id + '" dir="auto">' + esc(s.studentName) + '</button><small class="mono">' + shortId(s.id) + '</small>' +
        '<small class="r-only-p">' + ADM[s.admissionStatus] + " · " + (s.enrolled ? "Enrolled" : "Not enrolled") + '</small></div></div></td>' +
        '<td class="r-hide-p"><span class="badge ' + ADM_BADGE[s.admissionStatus] + '">' + ADM[s.admissionStatus] + '</span></td>' +
        '<td class="r-hide-p"><div class="r-2l"><span dir="auto">' + esc(s.guardian || "No guardian") + '</span><small class="tnum">' + (s.guardianPhone ? esc(s.guardianPhone) : "No phone") + '</small></div></td>' +
        colsOn.map(function (k) { return '<td class="r-hide-p tnum">' + (k === "gender" ? esc(s.gender || "Not set") : k === "dob" ? (s.dob ? fmtDate(s.dob) : "Not set") : fmtDate(s.createdAt)) + '</td>'; }).join("") +
        '<td class="r-hide-p">' + (s.enrolled ? '<span class="badge badge-success badge-dot">Enrolled</span>' : '<span class="badge badge-outline">Not enrolled</span>') + '</td>' +
        '<td class="r-rowact">' + kebab("studentRow", s.id, "Actions for " + s.studentName) + '</td></tr>';
    }).join("");
    if (list.length > S.shown) rows += '<tr class="r-more" data-sentinel><td colspan="9"><span>' + I("loader-circle", 14, "r-spin") + 'Loading more students…</span></td></tr>';
    return h + '<div class="table-wrap"><table class="table r-table"><thead>' + thead + '</thead><tbody>' + rows + '</tbody></table></div>';
  }
  function bulkHtml() {
    if (S.stack.length || S.section !== "students" || S.loading || S.error) return "";
    var ids = selIds(); if (!ids.length) return "";
    var phone = isPhone();
    return '<div class="r-bulk" role="toolbar" aria-label="Bulk actions for selected students"><span class="r-bulk-n">' + ids.length + ' selected</span>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="deselect" aria-label="Deselect all">' + I("x") + '</button><span class="r-bulk-sep"></span>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="exportSel">' + I("download") + 'Export CSV</button>' +
      (canManage() && !phone ? '<button type="button" class="btn btn-ghost btn-sm" data-act="bulkAdmission">' + I("tag") + 'Admission status</button><button type="button" class="btn btn-ghost btn-sm" data-act="bulkMove">' + I("arrow-right") + 'Move class</button><button type="button" class="btn btn-ghost btn-sm" data-act="bulkRemove">' + I("user-x") + 'Remove from term</button>' : "") +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="askSel" aria-label="Ask assistant about selected students" title="Ask assistant">' + I("sparkles") + '</button>' +
      (canManage() && phone ? kebab("bulkMore", "", "More bulk actions") : "") + '</div>';
  }

  function studentDrill(it) {
    var s = findStudent(it.id); if (!s) return notFound("Student not found", "This student was removed or merged.");
    var c = classOfStudent(s.id);
    var actions = '<button type="button" class="btn btn-outline btn-sm" data-act="reportCard" data-arg="' + s.id + '">' + I("file-text") + 'Report card</button>' +
      (canManage() ? '<button type="button" class="btn btn-default btn-sm" data-act="editStudent" data-arg="' + s.id + '">' + I("pencil") + 'Edit</button>' : "") + kebab("studentDrill", s.id);
    var h = pageHead('<span dir="auto">' + esc(s.studentName) + '</span>', esc(c ? c.displayName : "No class") + " · " + esc(s.gender || "Gender not set") + ' · <span class="mono">' + shortId(s.id) + '</span>', actions, '<span class="avatar" aria-hidden="true">' + esc(initials(s.studentName)) + '</span>');
    h += tabs([["overview", "Overview"], ["academics", "Academics"], ["attendance", "Attendance"], ["payments", "Payments"]], it.tab, "stTab");
    if (it.tab === "overview") {
      var dl = [["Student ID", '<span class="mono">' + shortId(s.id) + '</span>'], ["Current class", esc(c ? c.displayName : "None")], ["Current term", esc(termLabel())], ["Gender", esc(s.gender || "Not set")],
        ["Date of birth", s.dob ? fmtDate(s.dob) : "Not set"], ["Admission", ADM[s.admissionStatus]], ["Enrolment", s.enrolled ? "Enrolled this term" : "Not enrolled this term"],
        ["Guardian", '<span dir="auto">' + esc(s.guardian || "Not set") + '</span>'], ["Guardian phone", esc(s.guardianPhone || "Not set")]];
      h += '<dl class="r-dl">' + dl.map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join("") + '</dl>';
      if (canManage()) {
        var dests = S.d.classrooms.filter(function (x) { return !c || x.id !== c.id; });
        if (!it.moveTo) it.moveTo = dests[0].id;
        h += '<div class="r-move"><span>Move class</span>' + sel("moveTo", it.moveTo, dests.map(function (x) { return [x.id, x.displayName]; }), { label: "Destination class" }) +
          '<button type="button" class="btn btn-outline btn-sm" data-act="moveOne" data-arg="' + s.id + '">Move</button></div>';
      }
    } else if (it.tab === "academics") {
      var subs = c ? S.d.subjects[c.id] : [];
      if (!subs.length) h += empty("book-open", "No subjects", "This class has no subjects yet.");
      else h += '<div class="table-wrap"><table class="table r-table"><thead><tr><th>Subject</th><th class="num">Scored items</th><th class="num">Weighted total</th></tr></thead><tbody>' + subs.map(function (sub) {
        var items = scoreItems(sub), m = (S.scores[sub.id] || {})[s.id] || {}, n = 0, tot = 0;
        items.forEach(function (i) { var v = m[i.id]; if (v !== undefined && v !== "" && !isNaN(Number(v))) { n++; tot += i.max ? Number(v) / i.max * i.weight : Number(v); } });
        return '<tr><td>' + esc(sub.title) + '</td><td class="num">' + n + " of " + items.length + '</td><td class="num">' + (n ? (Math.round(tot * 10) / 10) + "%" : '<span class="r-muted">Not scored yet</span>') + '</td></tr>';
      }).join("") + '</tbody></table></div>';
    } else if (it.tab === "attendance") {
      var recs = [];
      allSessions().forEach(function (x) { x.records.forEach(function (r) { if (r.studentId === s.id) recs.push({ s: x, r: r }); }); });
      recs.sort(function (a, b) { return a.s.date < b.s.date ? 1 : -1; });
      if (!recs.length) h += empty("calendar-check", "No attendance yet", "Sessions this student is marked in will appear here.");
      else {
        var p = recs.filter(function (x) { return x.r.status === "PRESENT"; }).length, l = recs.filter(function (x) { return x.r.status === "LATE"; }).length, a = recs.length - p - l;
        h += '<div class="r-statline"><span><b>' + recs.length + '</b> sessions</span><span class="r-dot is-p"><b>' + p + '</b> present</span><span class="r-dot is-l"><b>' + l + '</b> late</span><span class="r-dot is-a"><b>' + a + '</b> absent</span></div>';
        h += '<div class="table-wrap" style="margin-top:12px"><table class="table r-table"><thead><tr><th>Session</th><th>Status</th><th class="r-hide-p">Remark</th></tr></thead><tbody>' + recs.map(function (x) {
          return '<tr><td><div class="r-2l"><span>' + esc(x.s.title) + '</span><small>' + fmtDay(x.s.date) + '</small></div></td><td>' + statusBadge(x.r.status) + '</td><td class="r-hide-p r-muted">' + esc(x.r.remarks || "No remark") + '</td></tr>';
        }).join("") + '</tbody></table></div>';
      }
    } else {
      var ch = allCharges().filter(function (x) { return x.studentId === s.id; });
      if (!ch.length) h += empty("receipt", "No charges", "No fees have been charged to this student this term.");
      else h += '<div class="r-charges">' + ch.map(function (x) {
        return '<div class="r-charge"><div class="r-2l"><span>' + esc(x.title) + '</span><small class="tnum">' + money(x.amount) + " billed · paid " + money(x.amountPaid) + '</small></div>' + payBadge(x.status) +
          (x.outstanding > 0 ? '<b class="tnum">' + money(x.outstanding) + '</b><button type="button" class="btn btn-outline btn-sm" data-act="record" data-arg="' + s.id + '">Record</button>' : "") + '</div>';
      }).join("") + '</div>';
    }
    return h;
  }
  function statusBadge(st) { return st === "PRESENT" ? '<span class="badge badge-success">Present</span>' : st === "LATE" ? '<span class="badge badge-warning">Late</span>' : st === "ABSENT" ? '<span class="badge badge-destructive">Absent</span>' : '<span class="badge badge-neutral">Unmarked</span>'; }

  function blankStudentForm(classId) {
    var c = classById(classId);
    return { name: "", surname: "", other: "", gender: "", dob: "", adm: "NEW", classId: classId, stream: c.stream || "", fees: [], feeState: "loading", received: "", method: "Cash", payDate: S.d.today, ref: "", parentOpen: false, pName: "", pPhone: "", pPhone2: "", ws: "loading" };
  }
  function loadFees(it) {
    it.f.feeState = "loading";
    later(function () {
      if (it.f.classId === "ssse" && !it.retried) it.f.feeState = "error";
      else { it.f.feeState = "ok"; it.f.fees = S.d.feePreview.map(function (x) { return { title: x.title, amount: x.amount, add: true }; }); }
      render();
    }, 450);
  }
  function openNewStudent(classId) {
    var it = { kind: "newStudent", f: blankStudentForm(classId || S.classId), errors: {}, done: null, saving: false };
    S.stack.push(it);
    later(function () { it.f.ws = "ready"; loadFees(it); S.focusSel = "#" + fid("f.name"); render(); }, 500);
  }
  function studentForm(it, edit) {
    var f = it.f, e = it.errors || {};
    if (it.done) {
      var d = it.done;
      return '<div class="r-success" role="status"><span class="r-empty-ic">' + I("circle-check", 22) + '</span><h2>Student created</h2><p><span dir="auto">' + esc(d.name) + '</span> was added to ' + esc(d.className) + '.</p>' +
        '<p class="tnum">' + money(d.received) + ' received · ' + money(d.pending) + ' pending</p><div class="r-success-a">' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="formCreateNew">' + I("plus") + 'Create new</button><button type="button" class="btn btn-outline btn-sm" data-act="back">Close</button>' +
        (d.received > 0 ? '<button type="button" class="btn btn-default btn-sm" data-act="viewReceipt">' + I("receipt") + 'View receipt</button>' : d.pending > 0 ? '<button type="button" class="btn btn-default btn-sm" data-act="applyPayment" data-arg="' + d.studentId + '">' + I("hand-coins") + 'Apply payment</button>' : "") + '</div></div>';
    }
    if (!edit && f.ws === "loading") return '<div class="r-loading" role="status">' + I("loader-circle", 16, "r-spin") + 'Loading your registration workspace…</div><div class="r-sk">' + skeletonRows(4) + '</div>';
    var h = pageHead(edit ? "Edit information" : "New student", edit ? '<span dir="auto">' + esc((findStudent(it.id) || {}).studentName || "") + '</span>' : "Registering for " + esc(classById(f.classId).displayName) + " · " + esc(termLabel()));
    h += '<div class="r-form"><section class="r-fsec"><h3>Student</h3><div class="field-grid">' +
      field("First name", inp("f.name", f.name, { err: e.name, dir: 1 }), "f.name", { err: e.name }) +
      field("Surname", inp("f.surname", f.surname, { err: e.surname, dir: 1 }), "f.surname", { err: e.surname }) +
      field("Other name", inp("f.other", f.other, { dir: 1 }), "f.other", { opt: 1 }) +
      field("Gender", sel("f.gender", f.gender, [["", "Select gender"], ["Female", "Female"], ["Male", "Male"]], { err: e.gender }), "f.gender", { err: e.gender }) +
      field("Date of birth", inp("f.dob", f.dob, { type: "date" }), "f.dob", { opt: 1 }) +
      field("Admission status for this term", sel("f.adm", f.adm, Object.keys(ADM).map(function (k) { return [k, ADM[k]]; })), "f.adm") + '</div></section>';
    if (!edit) {
      h += '<section class="r-fsec"><h3>Class</h3><div class="field-grid">' +
        field("Classroom", sel("f.classId", f.classId, S.d.classrooms.map(function (c) { return [c.id, c.displayName]; }), { re: 1, after: "formClass" }), "f.classId") +
        field("Stream / Sub-class", inp("f.stream", f.stream, { ph: "e.g. Gold" }), "f.stream", { opt: 1 }) + '</div></section>';
      h += '<section class="r-fsec"><div class="r-fsec-h"><h3>Fees &amp; payments</h3>' + (f.feeState === "ok" ? '<span class="r-sub" style="margin:0">Untick a fee to leave it off</span>' : "") + '</div>';
      if (f.feeState === "loading") h += '<div class="r-sk" aria-busy="true">' + skeletonRows(3) + '</div>';
      else if (f.feeState === "error") h += '<div class="r-notice is-error" role="alert">' + I("circle-alert") + '<span>Couldn\'t load the fee preview for ' + esc(classById(f.classId).displayName) + '.</span><button type="button" class="btn-link" data-act="feeRetry">Retry fee preview</button></div>';
      else {
        var total = f.fees.reduce(function (t, x) { return t + (x.add ? x.amount : 0); }, 0);
        h += '<div class="r-fees">' + f.fees.map(function (x, i) {
          return '<label class="r-fee"><input type="checkbox" class="checkbox" data-scope="top" data-bind="f.fees.' + i + '.add" data-re data-fk="fee-' + i + '"' + (x.add ? " checked" : "") + '><span>' + esc(x.title) + '</span><span class="tnum">' + money(x.amount) + '</span></label>';
        }).join("") + '<div class="r-fee-total"><span>Total to charge</span><span class="tnum">' + money(total) + '</span></div></div>';
        h += '<div class="field-grid">' +
          field("Amount received now", '<div class="input-group"><span class="input-addon">₦</span>' + inp("f.received", f.received, { ph: "0", err: e.received, attrs: ' inputmode="numeric"' }) + '</div>', "f.received", { opt: 1, err: e.received }) +
          field("Payment method", sel("f.method", f.method, [["Cash", "Cash"], ["Bank transfer", "Bank transfer"], ["POS", "POS"]]), "f.method") +
          field("Payment date", inp("f.payDate", f.payDate, { type: "date" }), "f.payDate") +
          field("Payment reference", inp("f.ref", f.ref, { ph: "e.g. TRF-20391" }), "f.ref", { opt: 1 }) + '</div>';
      }
      h += '</section>';
    }
    h += '<section class="r-fsec"><button type="button" class="r-collapse" data-act="toggleParent" aria-expanded="' + !!f.parentOpen + '">Parent / guardian' + I("chevron-down") + '</button>' +
      (f.parentOpen ? '<div class="field-grid">' + field("Name", inp("f.pName", f.pName, { dir: 1 }), "f.pName") + field("Phone", inp("f.pPhone", f.pPhone, { type: "tel" }), "f.pPhone") + field("Phone 2", inp("f.pPhone2", f.pPhone2, { type: "tel" }), "f.pPhone2", { opt: 1 }) + '</div>' : "") + '</section>';
    return h + '</div>';
  }

  /* ================= Attendance ================= */
  function attendancePage() {
    var en = roster().filter(function (s) { return s.enrolled; }), ts = todaySession();
    var h = pageHead("Attendance", "", kebab("attendance"));
    var today = '<div class="r-today' + (ts ? "" : " is-pending") + '"><span class="r-today-ic">' + I(ts ? "calendar-check" : "calendar", 20) + '</span><div class="r-today-t"><b>Today · ' + fmtDay(S.d.today) + '</b>';
    if (!en.length) today += '<small>No students enrolled in this class for the active term</small></div>';
    else if (ts) { var t = sessStats(ts); today += '<small>' + esc(ts.title) + " · taken by " + esc(ts.takenBy) + " · " + t.att + " of " + t.n + " present (" + t.rate + '%)</small></div><div class="r-today-a"><button type="button" class="btn btn-ghost btn-sm" data-act="openSession" data-arg="' + ts.id + '">Open</button><button type="button" class="btn btn-outline btn-sm" data-act="correctSession" data-arg="' + ts.id + '">' + I("pencil") + 'Correct</button>'; }
    else today += '<small>Not taken yet · ' + plural(en.length, "student") + ' to mark</small></div><div class="r-today-a"><button type="button" class="btn btn-default btn-sm" data-act="takeAttendance" data-fk="take">' + I("clipboard-check") + 'Take attendance</button>';
    h += today + (en.length ? "</div>" : "") + "</div>";

    var ss = sessions().slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var tt = attTotals();
    h += '<div class="r-h3"><h3>Sessions</h3>' + (ss.length ? '<p>' + plural(tt.sessions, "session") + " · " + tt.n + " records · " + tt.avg + "% attended (" + tt.att + ") · " + tt.abPct + "% absent (" + tt.ab + ')</p>' : "") + '</div>';
    if (!ss.length) return h + empty("calendar-days", "No attendance records yet", "Saved sessions will appear here with their totals.");
    h += '<div class="table-wrap"><table class="table r-table"><thead><tr><th>Session</th><th class="r-hide-p">Taken by</th><th class="num">Present</th><th class="num">Absent</th><th class="num r-hide-p">Rate</th><th class="r-rowact"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      ss.map(function (s) {
        var t = sessStats(s);
        return '<tr data-act="openSession" data-arg="' + s.id + '"><td><div class="r-2l"><button type="button" class="r-link" data-act="openSession" data-arg="' + s.id + '">' + esc(s.title) + '</button><small>' + fmtDay(s.date) + (s.subject ? " · " + esc(s.subject) : "") + (s.period ? " · " + esc(s.period) : "") + '<span class="r-only-p">' + esc(s.takenBy) + " · " + t.rate + '%</span></small></div></td>' +
          '<td class="r-hide-p">' + esc(s.takenBy) + '</td><td class="num"><div class="r-2l"><span>' + t.att + '</span>' + (t.l ? '<small>' + t.l + ' late</small>' : "") + '</div></td><td class="num">' + t.a + '</td>' +
          '<td class="num r-hide-p"><span class="r-rate"><span class="progress" aria-hidden="true"><span style="width:' + t.rate + '%"></span></span>' + t.rate + '%</span></td><td class="r-rowact">' + kebab("sessionRow", s.id, "Actions for " + s.title) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
    return h;
  }
  function openRecorder(correctId) {
    var f, marks = {};
    if (correctId) {
      var s = findSession(correctId);
      f = { date: s.date, type: s.type, title: s.title, subject: s.subject || "", period: s.period || "" };
      s.records.forEach(function (r) { marks[r.studentId] = { status: r.status, remark: r.remarks || "" }; });
    } else f = { date: S.d.today, type: "GENERAL", title: "Daily attendance", subject: "", period: "" };
    var it = { kind: "record", id: correctId || "new", correctId: correctId || null, f: f, marks: marks, err: "", errs: {}, loading: true, saving: false };
    S.stack.push(it);
    later(function () { it.loading = false; render(); }, 320);
  }
  function recRoster(it) {
    var list = roster().filter(function (s) { return s.enrolled; });
    if (it.correctId) Object.keys(it.marks).forEach(function (id) { if (!list.some(function (s) { return s.id === id; })) { var s = findStudent(id); if (s) list.push(s); } });
    return list;
  }
  function recorder(it) {
    if (it.loading) return '<div class="r-loading" role="status">' + I("loader-circle", 16, "r-spin") + 'Loading class roster…</div><div class="r-sk">' + skeletonRows(6) + '</div>';
    var f = it.f, orig = it.correctId ? findSession(it.correctId) : null;
    if (it.correctId && !orig) return notFound("Session not found", "It may have been deleted.");
    var h = pageHead(it.correctId ? "Correct session" : "Take attendance", it.correctId ? "Editing " + esc(orig.title) + " · " + fmtDay(orig.date) : esc(cls().displayName) + " · " + fmtDay(f.date), kebab("recorder"));
    var subjOpts = [["", "Select subject"]].concat(subjects().map(function (s) { return [s.title, s.title]; }));
    h += '<div class="r-recset" role="group" aria-label="Session settings"><div class="r-datestep"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="prevDay" aria-label="Previous day">' + I("chevron-left") + '</button>' +
      inp("f.date", f.date, { type: "date", label: "Attendance date", attrs: ' max="' + S.d.today + '"' }) +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="nextDay" aria-label="Next day"' + (f.date >= S.d.today ? " disabled" : "") + '>' + I("chevron-right") + '</button></div>' +
      sel("f.type", f.type, [["GENERAL", "General class"], ["SUBJECT", "Subject"]], { re: 1, after: "recType", label: "Attendance type" }) +
      inp("f.title", f.title, { cls: "r-grow", label: "Session title", ph: "Session title", err: it.errs.title }) +
      (f.type === "SUBJECT" ? sel("f.subject", f.subject, subjOpts, { re: 1, after: "recSubject", label: "Subject", err: it.errs.subject }) : "") +
      inp("f.period", f.period, { label: "Period or time (optional)", ph: "Period / time (optional)", attrs: ' style="width:11rem"' }) +
      (it.errs.title ? '<p class="field-error">' + esc(it.errs.title) + '</p>' : "") + (it.errs.subject ? '<p class="field-error">' + esc(it.errs.subject) + '</p>' : "") + '</div>';
    var list = recRoster(it);
    if (!list.length) return h + empty("users", "No students enrolled in this class for the active term", "Enroll students first, then take attendance.", canManage() ? '<button type="button" class="btn btn-outline btn-sm" data-act="recAddStudent">' + I("user-plus") + 'Add student</button>' : "");
    h += '<ol class="r-roster">' + list.map(function (s, i) {
      var m = it.marks[s.id] || {}, st = m.status || "";
      return '<li class="r-mrow is-' + (st || "none") + '"><span class="r-no">' + (i + 1) + '</span><span class="r-mname" dir="auto">' + esc(s.studentName) + '</span>' +
        '<div class="r-seg" role="group" aria-label="Mark ' + esc(s.studentName) + '">' + ["PRESENT", "ABSENT", "LATE"].map(function (k) {
          return '<button type="button" data-act="mark" data-arg="' + s.id + "|" + k + '" data-s="' + k + '" data-fk="m-' + s.id + "-" + k + '" aria-pressed="' + (st === k) + '" title="' + MARK[k] + (st === k ? " (tap again to clear)" : "") + '"><span class="r-full">' + MARK[k] + '</span><span class="r-short">' + k[0] + '</span></button>';
        }).join("") + '</div><span class="r-remark-w">' + (st === "ABSENT" || st === "LATE" ? inp("marks." + s.id + ".remark", m.remark || "", { cls: "r-remark", ph: "Remark (optional)", label: "Remark for " + s.studentName }) : "") + '</span></li>';
    }).join("") + '</ol>';
    return h;
  }

  function sessionDrill(it) {
    var s = findSession(it.id); if (!s) return notFound("Session not found", "It may have been deleted.");
    var t = sessStats(s);
    var h = pageHead(esc(s.title), fmtDay(s.date) + (s.subject ? " · " + esc(s.subject) : "") + (s.period ? " · " + esc(s.period) : "") + " · Taken by " + esc(s.takenBy),
      '<button type="button" class="btn btn-default btn-sm" data-act="correctSession" data-arg="' + s.id + '">' + I("pencil") + 'Correct session</button>' + kebab("sessionDrill", s.id));
    h += '<div class="r-statline"><span><b>' + t.rate + '%</b> attended</span><span><b>' + t.n + '</b> students</span><span class="r-dot is-p"><b>' + t.p + '</b> present</span><span class="r-dot is-l"><b>' + t.l + '</b> late</span><span class="r-dot is-a"><b>' + t.a + '</b> absent</span><span>0 excused · 0 on leave</span></div>';
    h += '<div class="r-h3"><h3>Revision history</h3></div><ol class="r-hist">' + s.history.slice().reverse().map(function (x) {
      return '<li>' + I(x.action === "Created" ? "circle-plus" : "history") + '<div><b>' + esc(x.action) + '</b> by ' + esc(x.actor) + '<small>' + esc(x.at) + " · " + esc(x.summary) + '</small></div></li>';
    }).join("") + '</ol>';
    h += '<div class="r-h3"><h3>Students</h3></div><div class="table-wrap"><table class="table r-table"><thead><tr><th>Student</th><th>Status</th><th>Remark</th></tr></thead><tbody>' + s.records.map(function (r) {
      var st = findStudent(r.studentId);
      return '<tr><td><span dir="auto">' + esc(st ? st.studentName : "Removed student") + '</span></td><td>' + statusBadge(r.status) + '</td><td class="' + (r.remarks ? "" : "r-muted") + '" style="white-space:normal">' + esc(r.remarks || "No remark") + '</td></tr>';
    }).join("") + '</tbody></table></div>';
    return h;
  }

  /* ================= Subjects ================= */
  function weightCell(sub) {
    var w = subjWeight(sub);
    if (!sub.assessments.length) return '<span class="r-wt is-warn">' + I("triangle-alert", 14) + 'No assessments</span>';
    return w === 100 ? '<span class="r-wt is-ok">' + I("circle-check", 14) + '100%</span>' : '<span class="r-wt is-warn" title="Weights should total 100%">' + I("triangle-alert", 14) + w + '%</span>';
  }
  function unattached() { var have = subjects().map(function (s) { return s.title.toLowerCase(); }); return S.d.unattachedSubjects.filter(function (n) { return have.indexOf(n.toLowerCase()) < 0; }); }
  function subjectsPage() {
    var ss = subjects();
    var h = pageHead("Subjects", "", '<button type="button" class="btn btn-default btn-sm" data-act="addSubject" data-fk="add-subject">' + I("plus") + 'Add subject</button>' + kebab("subjects"));
    var form = "";
    if (S.subjForm) {
      var err = S.subjForm.error;
      form = '<tr class="r-addrow"><td colspan="5"><div class="r-addform"><div class="field">' + inp("name", S.subjForm.name, { scope: "subj", ph: "Subject name", label: "Subject name", err: err, dir: 1, enter: "subjSave" }) + (err ? '<p class="field-error">' + esc(err) + '</p>' : "") + '</div>' +
        '<div class="field r-desc">' + inp("desc", S.subjForm.desc, { scope: "subj", ph: "Description (optional)", label: "Description", enter: "subjSave" }) + '</div>' +
        '<button type="button" class="btn btn-default btn-sm" data-act="subjSave"' + (S.subjForm.saving ? " disabled" : "") + '>' + (S.subjForm.saving ? "Saving…" : "Save") + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="subjCancel">Cancel</button></div></td></tr>';
    }
    if (!ss.length && !S.subjForm) return h + empty("book-open", "No subjects yet", "Add the subjects taught in " + esc(cls().displayName) + " to start setting assessments.", '<button type="button" class="btn btn-default btn-sm" data-act="addSubject">' + I("plus") + 'Add subject</button>' + (unattached().length ? '<button type="button" class="btn btn-outline btn-sm" data-act="openImport">' + I("library") + 'Import from catalog</button>' : ""));
    h += '<div class="table-wrap"><table class="table r-table"><thead><tr><th>Subject</th><th class="num">Assessments</th><th>Weight total</th><th class="num r-hide-p">Submissions</th><th class="r-rowact"><span class="sr-only">Actions</span></th></tr></thead><tbody>' + form +
      ss.map(function (s) {
        return '<tr data-act="openSubject" data-arg="' + s.id + '"><td><div class="r-2l"><button type="button" class="r-link" data-act="openSubject" data-arg="' + s.id + '" dir="auto">' + esc(s.title) + '</button>' + (s.description ? '<small dir="auto">' + esc(s.description) + '</small>' : "") + '</div></td>' +
          '<td class="num">' + s.assessments.length + '</td><td>' + weightCell(s) + '</td><td class="num r-hide-p">' + subSubs(s) + '</td><td class="r-rowact">' + kebab("subjectRow", s.id, "Actions for " + s.title) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
    return h;
  }
  function subStats(sub) {
    var items = scoreItems(sub), grouped = sub.assessments.filter(function (a) { return a.children && a.children.length; }).length;
    return esc(cls().displayName) + " · " + plural(roster().filter(function (s) { return s.enrolled; }).length, "student") + ". " + plural(items.length, "score item") + (grouped ? " (" + grouped + " grouped)" : "") + " · " + plural(subSubs(sub), "submission") + " · " + subjWeight(sub) + "% weight configured.";
  }
  function subjectDrill(it) {
    var sub = findSubject(it.id); if (!sub) return notFound("Subject not found", "It may have been deleted.");
    var h = pageHead(esc(sub.title), '<span data-substat>' + subStats(sub) + '</span>',
      '<div class="r-split"><button type="button" class="btn btn-default btn-sm" data-act="recordScope" data-arg="Classroom">' + I("notebook-pen") + 'Record submission</button><button type="button" class="btn btn-default btn-sm btn-icon" data-act="menu" data-menu="recordScope" data-arg="' + sub.id + '" data-fk="scope" aria-haspopup="menu" aria-label="Choose recorder scope">' + I("chevron-down") + '</button></div>' + kebab("subjectDrill", sub.id));
    h += tabs([["assessments", "Assessments"], ["scores", "Score entry"]], it.tab, "subjTab");
    return h + (it.tab === "scores" ? scoreGrid(sub) : assessList(sub));
  }
  function assessList(sub) {
    var have = sub.assessments.map(function (a) { return a.title.toLowerCase(); });
    var sugg = S.d.assessmentSuggestions.filter(function (s) { return have.indexOf(s.title.toLowerCase()) < 0; });
    var h = '<div class="r-toolbar"><button type="button" class="btn btn-outline btn-sm" data-act="newAssess">' + I("plus") + 'New assessment</button>' +
      (sugg.length ? '<div class="r-quick"><span>Quick add</span>' + sugg.map(function (s, i) { return '<button type="button" class="r-chip" data-act="quickAdd" data-arg="' + i + '" title="Add ' + esc(s.title) + '">' + I("plus", 12) + esc(s.title) + " · " + s.obtainable + " pts · " + s.weight + '%</button>'; }).join("") + '</div>' : "") + '</div>';
    if (!sub.assessments.length) return h + empty("clipboard-list", "No assessment", "Create an assessment or use a quick-add suggestion above.");
    var n = sub.assessments.length;
    h += '<div class="table-wrap"><table class="table r-table"><thead><tr><th class="r-no">#</th><th>Assessment</th><th class="num">Weight</th><th class="num r-hide-p">Points</th><th class="num r-hide-p">Submissions</th><th class="num"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      sub.assessments.map(function (a, i) {
        var kids = a.children || [], w = aWeight(a);
        var pts = kids.length ? kids.reduce(function (t, c) { return t + (+c.obtainable || 0); }, 0) + " pts" : a.obtainable == null || a.obtainable === "" ? "Uncapped" : a.obtainable + " pts";
        var printL = a.print === false ? "Not printed" : kids.length ? (a.printMode === "EXPANDED" ? "Prints each part" : "Prints as total") : "On result sheet";
        var row = '<tr><td class="r-no">#' + (i + 1) + '</td><td style="white-space:normal"><div class="r-2l"><span><b style="font-weight:500">' + esc(a.title) + '</b>' + (kids.length ? ' <span class="badge badge-neutral">' + plural(kids.length, "part") + '</span>' : "") + '</span>' +
          '<small>' + printL + (w === 0 ? ' · <span class="r-warn">0% weight, won\'t count toward the total</span>' : "") + '</small></div></td>' +
          '<td class="num">' + w + '%</td><td class="num r-hide-p">' + pts + '</td><td class="num r-hide-p">' + aSubs(sub, a) + '</td>' +
          '<td class="num"><span class="r-rowbtns"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="moveAssess" data-arg="' + a.id + '|-1" data-fk="up-' + a.id + '" aria-label="Move ' + esc(a.title) + ' up"' + (i === 0 ? " disabled" : "") + '>' + I("chevron-up") + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="moveAssess" data-arg="' + a.id + '|1" data-fk="dn-' + a.id + '" aria-label="Move ' + esc(a.title) + ' down"' + (i === n - 1 ? " disabled" : "") + '>' + I("chevron-down") + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="editAssess" data-arg="' + a.id + '" aria-label="Edit ' + esc(a.title) + '">' + I("pencil") + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="deleteAssess" data-arg="' + a.id + '" aria-label="Delete ' + esc(a.title) + '">' + I("trash-2") + '</button></span></td></tr>';
        kids.forEach(function (c, k) {
          row += '<tr class="r-child"><td></td><td><span class="r-indent"><span>Part ' + (k + 1) + ' under ' + esc(a.title) + ' ·</span><b>' + esc(c.title) + '</b></span></td><td class="num">' + (+c.weight || 0) + '%</td><td class="num r-hide-p">' + (c.obtainable == null || c.obtainable === "" ? "Uncapped" : c.obtainable + " pts") + '</td><td class="num r-hide-p">' + ((c.submissions || 0) + itemSubs(sub.id, c.id)) + '</td><td></td></tr>';
        });
        return row;
      }).join("") + '</tbody></table></div>';
    var cols = printCols(sub);
    h += '<div class="r-print"><span>' + I("printer", 14) + '</span><span>Result print preview:</span>' + (cols.length ? cols.map(function (c) { return '<span class="r-pcol">' + esc(c) + '</span>'; }).join("") : "<span>No print columns</span>") + '</div>';
    return h;
  }
  function saveInd() {
    if (S.save === "saving") return '<span class="r-saveind" role="status">' + I("loader-circle", 14, "r-spin") + 'Saving…</span>';
    if (S.save === "saved") return '<span class="r-saveind is-saved" role="status">' + I("circle-check", 14) + 'Saved</span>';
    if (S.save === "error") return '<span class="r-saveind is-error" role="alert">' + I("circle-alert", 14) + 'Couldn\'t save. Scores must be numbers.</span>';
    return '<span class="r-saveind">' + I("cloud-check", 14) + 'Scores save automatically</span>';
  }
  function scoreTotal(sub, sid, items) {
    var m = (S.scores[sub.id] || {})[sid] || {}, tot = 0, any = false;
    items.forEach(function (i) { var v = m[i.id]; if (v !== undefined && v !== "" && !isNaN(Number(v))) { any = true; tot += i.max ? Number(v) / i.max * i.weight : Number(v); } });
    return any ? String(Math.round(tot * 10) / 10) : "";
  }
  function scoreGrid(sub) {
    var items = scoreItems(sub).filter(function (i) { return i.weight > 0; });
    var studs = roster().filter(function (s) { return s.enrolled; });
    var h = '<div class="r-toolbar"><span class="r-sub" style="margin:0">One column per weighted assessment.</span><span class="r-spacer"></span><span data-saveind>' + saveInd() + '</span></div>';
    if (!items.length) return h + empty("table", "No weighted assessments", "Give at least one assessment a weight above 0% to enter scores.", '<button type="button" class="btn btn-outline btn-sm" data-act="subjTab" data-arg="assessments">Go to assessments</button>');
    if (!studs.length) return h + empty("users", "No students to score", "Enroll students in this class first.");
    h += '<div class="table-wrap"><table class="table r-table r-grid"><thead><tr><th class="r-no">#</th><th>Student</th>' + items.map(function (i) { return '<th class="num">' + esc(i.label) + '<small>' + (i.max != null ? "/ " + i.max : "Uncapped") + " · " + i.weight + '%</small></th>'; }).join("") + '<th class="num">Total</th></tr></thead><tbody>' +
      studs.map(function (s, n) {
        var m = (S.scores[sub.id] || {})[s.id] || {};
        return '<tr><td class="r-no">' + (n + 1) + '</td><td><span dir="auto">' + esc(s.studentName) + '</span></td>' + items.map(function (i) {
          var v = m[i.id] == null ? "" : m[i.id], bad = v !== "" && (isNaN(Number(v)) || (i.max != null && Number(v) > i.max));
          return '<td class="num"><input class="input" inputmode="decimal" autocomplete="off" data-score="' + sub.id + "|" + s.id + "|" + i.id + '" data-max="' + (i.max == null ? "" : i.max) + '" data-fk="sc-' + s.id + "-" + i.id + '" aria-label="' + esc(i.label) + " score for " + esc(s.studentName) + '" value="' + esc(v) + '"' + (bad ? ' aria-invalid="true"' : "") + '></td>';
        }).join("") + '<td class="num tnum" data-total="' + s.id + '">' + scoreTotal(sub, s.id, items) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
    return h;
  }
  function onScore(el) {
    var p = el.dataset.score.split("|"), subId = p[0], sid = p[1], iid = p[2];
    S.scores[subId] = S.scores[subId] || {}; S.scores[subId][sid] = S.scores[subId][sid] || {};
    var v = el.value.trim(); S.scores[subId][sid][iid] = v;
    var max = el.dataset.max === "" ? null : Number(el.dataset.max);
    var bad = v !== "" && (isNaN(Number(v)) || (max != null && Number(v) > max));
    if (bad) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    var sub = findSubject(subId); if (!sub) return;
    var items = scoreItems(sub).filter(function (i) { return i.weight > 0; });
    var cell = H.querySelector('[data-total="' + sid + '"]'); if (cell) cell.textContent = scoreTotal(sub, sid, items);
    S.save = "saving"; paintSave();
    if (S.saveT) clearTimeout(S.saveT);
    S.saveT = later(function () {
      S.saveT = null;
      var m = S.scores[subId] || {}, nonNum = Object.keys(m).some(function (k) { return Object.keys(m[k]).some(function (i) { var x = m[k][i]; return x !== "" && isNaN(Number(x)); }); });
      S.save = nonNum ? "error" : "saved"; paintSave();
      var st = H.querySelector("[data-substat]"); if (st) st.innerHTML = subStats(sub);
    }, 600);
  }
  function paintSave() { var x = H && H.querySelector("[data-saveind]"); if (x) x.innerHTML = saveInd(); }

  /* ================= Payments ================= */
  function paymentsPage() {
    var t = payTotals();
    var h = pageHead("Payments", t.n ? "Billed " + money(t.billed) + " · Received " + money(t.received) + " · " + t.open + " outstanding, " + t.paid + " settled" : "",
      '<button type="button" class="btn btn-default btn-sm" data-act="receive" data-fk="receive">' + I("hand-coins") + 'Receive payment</button>');
    if (!t.n) return h + empty("receipt", "No student charges", "Fees charged to students in " + esc(cls().displayName) + " will appear here.");
    h += '<div class="r-collect"><span class="progress" role="progressbar" aria-valuenow="' + t.pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Collection progress"><span style="width:' + t.pct + '%"></span></span><span><b>' + t.pct + '%</b> collected · ' + t.paid + "/" + t.n + ' paid</span></div>';
    var list = charges().slice().sort(function (a, b) { return b.outstanding - a.outstanding || a.studentName.localeCompare(b.studentName); });
    h += '<div class="table-wrap"><table class="table r-table"><thead><tr><th>Student</th><th class="r-hide-p">Fee</th><th class="r-hide-p">Status</th><th class="num">Outstanding</th><th class="r-rowact"><span class="sr-only">Record</span></th></tr></thead><tbody>' +
      list.map(function (c) {
        return '<tr data-act="openStudentPay" data-arg="' + c.studentId + '"><td><div class="r-2l"><button type="button" class="r-link" data-act="openStudentPay" data-arg="' + c.studentId + '" dir="auto">' + esc(c.studentName) + '</button><small class="r-only-p">' + esc(c.title) + " · " + PAY[c.status][1] + '</small></div></td>' +
          '<td class="r-hide-p"><div class="r-2l"><span>' + esc(c.title) + '</span><small>' + esc(c.stream || "All streams") + '</small></div></td><td class="r-hide-p">' + payBadge(c.status) + '</td>' +
          '<td class="num"><div class="r-2l">' + (c.outstanding > 0 ? '<span>' + money(c.outstanding) + '</span><small>paid ' + money(c.amountPaid) + '</small>' : '<span class="r-ok">Paid ' + money(c.amountPaid) + '</span>') + '</div></td>' +
          '<td class="r-rowact">' + (c.outstanding > 0 ? '<button type="button" class="btn btn-outline btn-sm" data-act="record" data-arg="' + c.studentId + '">Record</button>' : "") + '</td></tr>';
      }).join("") + '</tbody></table></div>';
    return h;
  }
  function owingStudents() {
    var map = {};
    charges().forEach(function (c) { if (c.outstanding > 0) map[c.studentId] = (map[c.studentId] || 0) + c.outstanding; });
    return Object.keys(map).map(function (id) { var s = findStudent(id); return { id: id, name: s ? s.studentName : id, out: map[id] }; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function openReceive(studentId) {
    var f = { studentId: studentId || "", amount: studentId ? String(studentOutstanding(studentId)) : "", method: "Cash", ref: "", date: S.d.today };
    S.stack.push({ kind: "receive", id: studentId || "any", f: f, errs: {}, saving: false });
    S.focusSel = studentId ? "#" + fid("f.amount") : "#" + fid("f.studentId");
  }
  function receiveDrill(it) {
    var f = it.f, e = it.errs;
    var owing = owingStudents();
    if (f.studentId && !owing.some(function (o) { return o.id === f.studentId; })) { var s0 = findStudent(f.studentId); owing.push({ id: f.studentId, name: s0 ? s0.studentName : f.studentId, out: studentOutstanding(f.studentId) }); }
    var h = pageHead("Receive payment", esc(cls().displayName) + " · " + esc(termLabel()));
    if (!owing.length) return h + empty("circle-check", "Nothing outstanding", "Every charge in this class is settled.");
    var ch = f.studentId ? allCharges().filter(function (c) { return c.studentId === f.studentId && c.outstanding > 0; }) : [];
    h += '<div class="r-form"><section class="r-fsec">' + field("Student", sel("f.studentId", f.studentId, [["", "Select a student"]].concat(owing.map(function (o) { return [o.id, o.name + " · " + money(o.out) + " due"]; })), { re: 1, after: "recvStudent", err: e.studentId }), "f.studentId", { err: e.studentId }) +
      (ch.length ? '<div class="r-charges">' + ch.map(function (c) { return '<div class="r-charge"><div class="r-2l"><span>' + esc(c.title) + '</span><small class="tnum">paid ' + money(c.amountPaid) + " of " + money(c.amount) + '</small></div>' + payBadge(c.status) + '<b class="tnum">' + money(c.outstanding) + '</b></div>'; }).join("") + '</div>' : "") + '</section>' +
      '<section class="r-fsec"><div class="field-grid">' +
      field("Amount", '<div class="input-group"><span class="input-addon">₦</span>' + inp("f.amount", f.amount, { err: e.amount, attrs: ' inputmode="numeric"' }) + '</div>', "f.amount", { err: e.amount, hint: "Applied to the largest outstanding charge first." }) +
      field("Payment method", sel("f.method", f.method, [["Cash", "Cash"], ["Bank transfer", "Bank transfer"], ["POS", "POS"]]), "f.method") +
      field("Payment date", inp("f.date", f.date, { type: "date" }), "f.date") +
      field("Reference", inp("f.ref", f.ref, { ph: "e.g. TRF-20391" }), "f.ref", { opt: 1 }) + '</div></section></div>';
    return h;
  }

  function performancePage() {
    return pageHead("Performance", "") + empty("chart-line", "Coming soon", "Class average, subject rankings and report-card readiness will live here once Performance launches.");
  }

  /* ================= footer (sticky actions for drill-in forms) ================= */
  function footerHtml() {
    var it = top(); if (!it || S.loading || S.error) return "";
    if (it.kind === "record" && !it.loading) {
      var list = recRoster(it); if (!list.length) return "";
      var m = list.filter(function (s) { return it.marks[s.id] && it.marks[s.id].status; }).length, pct = Math.round(m / list.length * 100);
      return '<div class="r-foot"><div class="r-foot-prog"><span aria-live="polite"><b>' + m + '</b> of ' + list.length + ' students marked' + (m > 0 && m < list.length ? " · partial saves are fine" : "") + '</span><span class="progress"><span style="width:' + pct + '%"></span></span>' + (it.err ? '<p class="field-error" role="alert">' + esc(it.err) + '</p>' : "") + '</div>' +
        (it.correctId ? '<button type="button" class="btn btn-ghost btn-sm" data-act="back">Cancel</button>' : "") +
        '<button type="button" class="btn btn-default" data-act="recSave"' + (it.saving ? " disabled" : "") + '>' + (it.saving ? "Saving…" : it.correctId ? "Save correction" : "Save attendance") + '</button></div>';
    }
    if ((it.kind === "newStudent" && !it.done && it.f.ws === "ready") || it.kind === "studentEdit") {
      return '<div class="r-foot"><div class="r-foot-prog">' + (it.errors && Object.keys(it.errors).length ? '<p class="field-error" role="alert">Fix the highlighted fields.</p>' : '<span>Classroom: ' + esc(classById(it.f.classId).displayName) + '</span>') + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="back">Cancel</button><button type="button" class="btn btn-default" data-act="formSave"' + (it.saving ? " disabled" : "") + '>' + (it.saving ? "Saving…" : it.kind === "studentEdit" ? "Save changes" : "Save student") + '</button></div>';
    }
    if (it.kind === "receive" && owingStudents().length + (it.f.studentId ? 1 : 0)) {
      return '<div class="r-foot"><div class="r-foot-prog"></div><button type="button" class="btn btn-ghost btn-sm" data-act="back">Cancel</button><button type="button" class="btn btn-default" data-act="recvSave"' + (it.saving ? " disabled" : "") + '>' + (it.saving ? "Saving…" : "Save payment") + '</button></div>';
    }
    return "";
  }

  /* ================= menus ================= */
  function studentMenu(id, withView) {
    var s = findStudent(id); if (!s) return [];
    var items = [];
    if (withView) items.push({ label: "View details", icon: "eye", act: "openStudent", arg: id });
    items.push({ label: "Ask assistant", icon: "sparkles", act: "askAssistant", arg: id });
    if (canManage()) {
      items.push({ sep: 1 }, { label: "Edit information", icon: "pencil", act: "editStudent", arg: id });
      if (s.enrolled && s.termFormId) items.push({ label: "Remove from current term", icon: "user-x", act: "removeTerm", arg: id });
      items.push({ label: "Delete student", icon: "trash-2", act: "deleteStudent", arg: id, danger: 1 });
    }
    return items;
  }
  var MENUS = {
    classes: function () {
      return [{ heading: termLabel() + " classrooms" }].concat(S.d.classrooms.map(function (c) { return { label: c.displayName, act: "switchClass", arg: c.id, checked: c.id === S.classId }; }))
        .concat([{ sep: 1 }, { heading: "Prototype states" }, { label: "Show loading state", icon: "loader-circle", act: "protoLoading" }, { label: "Show error state", icon: "circle-alert", act: "protoError" }]);
    },
    students: function () {
      var it = [{ label: "Export all as CSV", icon: "download", act: "exportAll" }];
      if (dups().length) it.push({ label: "Review duplicates", icon: "users", act: "reviewMerge", arg: dups()[0].key });
      it.push({ label: "Ask assistant about this class", icon: "sparkles", act: "askClass" });
      return it;
    },
    columns: function () { return [{ heading: "Extra columns" }].concat(Object.keys(COLS).map(function (k) { return { label: COLS[k], act: "toggleCol", arg: k, checked: S.cols[k], keep: 1 }; })); },
    studentRow: function (id) { return studentMenu(id, true); },
    studentDrill: function (id) { return studentMenu(id, false); },
    bulkMore: function () { return canManage() ? [{ label: "Set admission status", icon: "tag", act: "bulkAdmission" }, { label: "Move class", icon: "arrow-right", act: "bulkMove" }, { label: "Remove from term", icon: "user-x", act: "bulkRemove", danger: 1 }] : []; },
    attendance: function () { return [{ label: "Export sessions CSV", icon: "download", act: "exportAtt", disabled: !sessions().length }, { label: "Take attendance for another date", icon: "calendar-days", act: "takeAttendance", disabled: !roster().some(function (s) { return s.enrolled; }) }]; },
    sessionRow: function (id) {
      var it = [{ label: "Open", icon: "eye", act: "openSession", arg: id }, { label: "Correct session", icon: "pencil", act: "correctSession", arg: id }];
      if (isAdmin()) it.push({ sep: 1 }, { label: "Delete session", icon: "trash-2", act: "deleteSession", arg: id, danger: 1 });
      return it;
    },
    sessionDrill: function (id) { return [{ label: "Export this session", icon: "download", act: "exportSession", arg: id }].concat(isAdmin() ? [{ sep: 1 }, { label: "Delete session", icon: "trash-2", act: "deleteSession", arg: id, danger: 1 }] : []); },
    recorder: function () {
      var it = [{ heading: "Mark all as" }, { label: "Present", icon: "check", act: "markAll", arg: "PRESENT" }, { label: "Absent", icon: "x", act: "markAll", arg: "ABSENT" }, { label: "Late", icon: "clock", act: "markAll", arg: "LATE" },
        { heading: "Mark rest as" }, { label: "Present", icon: "check-check", act: "markRest", arg: "PRESENT" }, { label: "Absent", icon: "x", act: "markRest", arg: "ABSENT" }, { label: "Late", icon: "clock", act: "markRest", arg: "LATE" },
        { sep: 1 }, { label: "Clear all", icon: "rotate-ccw", act: "clearAll" }];
      if (canManage()) it.push({ label: "Add student", icon: "user-plus", act: "recAddStudent" });
      return it;
    },
    subjects: function () { return unattached().length ? [{ label: "Import from catalog", icon: "library", act: "openImport" }] : []; },
    subjectRow: function (id) { return [{ label: "Open", icon: "eye", act: "openSubject", arg: id }].concat(isAdmin() ? [{ sep: 1 }, { label: "Delete subject", icon: "trash-2", act: "deleteSubject", arg: id, danger: 1 }] : []); },
    subjectDrill: function (id) { return isAdmin() ? [{ label: "Delete subject", icon: "trash-2", act: "deleteSubject", arg: id, danger: 1 }] : []; },
    recordScope: function () { return [{ heading: "Open recorder with scope" }, { label: "Full", icon: "shield-check", act: "recordScope", arg: "Full" }, { label: "Classroom", icon: "school", act: "recordScope", arg: "Classroom" }, { label: "Subject", icon: "book-open", act: "recordScope", arg: "Subject" }]; }
  };
  function menuHtml() {
    var m = S.menu; if (!m) return "";
    var items = MENUS[m.key](m.arg);
    var pos = (m.bottom != null ? "bottom:" + m.bottom + "px;" : "top:" + m.top + "px;") + (m.left != null ? "left:" + m.left + "px;" : "right:" + m.right + "px;");
    return '<div class="popover r-pop" role="menu" style="' + pos + '">' + items.map(function (it) {
      if (it.sep) return '<div class="menu-sep" role="separator"></div>';
      if (it.heading) return '<div class="menu-label">' + esc(it.heading) + '</div>';
      var ic = it.checked === true ? I("check") : it.checked === false ? '<span class="r-ico-sp"></span>' : I(it.icon || "dot");
      return '<button type="button" class="menu-item' + (it.danger ? " is-destructive" : "") + '" role="' + (it.checked != null ? "menuitemcheckbox" : "menuitem") + '"' + (it.checked != null ? ' aria-checked="' + it.checked + '"' : "") +
        ' data-act="' + it.act + '" data-arg="' + esc(it.arg || "") + '"' + (it.keep ? " data-keep" : "") + (it.disabled ? " disabled" : "") + '>' + ic + '<span dir="auto">' + esc(it.label) + '</span></button>';
    }).join("") + '</div>';
  }

  /* ================= dialogs ================= */
  function confirmDlg(o) { S.dialog = Object.assign({ kind: "confirm", saving: false, error: "", f: {} }, o); S.focusSel = '.r-dialog [data-act="dlgConfirm"]'; }
  function dialogHtml() {
    var d = S.dialog; if (!d) return "";
    var inner = d.kind === "confirm" ? confirmInner(d) : d.kind === "merge" ? mergeInner(d) : d.kind === "import" ? importInner(d) : d.kind === "assess" ? assessInner(d) : d.kind === "receipt" ? receiptInner(d) : "";
    return '<div class="r-overlay" data-act="closeDialog" aria-hidden="true"></div><div class="dialog r-dialog" role="dialog" aria-modal="true" aria-labelledby="r-dlg-t" data-open="true" style="--dialog-w:' + (d.w || "28rem") + '">' + inner + '</div>';
  }
  function dlgHead(title, desc) { return '<div class="dialog-header"><h2 class="dialog-title" id="r-dlg-t">' + title + '</h2>' + (desc ? '<p class="dialog-description">' + desc + '</p>' : "") + '</div>'; }
  function confirmInner(d) {
    return dlgHead(esc(d.title), d.desc) + (d.body ? d.body(d) : "") + (d.error ? '<div class="r-notice is-error" role="alert" style="margin:0">' + I("circle-alert") + '<span>' + esc(d.error) + '</span></div>' : "") +
      '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog">Cancel</button><button type="button" class="btn ' + (d.danger ? "btn-destructive" : "btn-default") + '" data-act="dlgConfirm"' + (d.saving ? " disabled" : "") + '>' + (d.saving ? "Saving…" : esc(d.confirm || "Confirm")) + '</button></div>';
  }
  function mergeInner(d) {
    var g = dups().filter(function (x) { return x.key === d.key; })[0]; if (!g) return dlgHead("Duplicate resolved") + '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog">Close</button></div>';
    var mv = g.toMove;
    return dlgHead("Review merge", '<span dir="auto">' + esc(g.displayName) + '</span> has ' + g.records + " records. The recommended survivor keeps the history; the duplicate is removed.") +
      '<ul class="r-dlg-list">' + g.members.map(function (m) {
        return '<li><span class="avatar" style="width:28px;height:28px;font-size:11px" aria-hidden="true">' + esc(initials(m.displayName)) + '</span><div style="display:grid;gap:4px;flex:1"><span><b dir="auto" style="font-weight:500">' + esc(m.displayName) + '</b> <span class="mono r-muted" style="font-size:11.5px">' + shortId(m.id) + '</span> ' + (m.recommended ? '<span class="badge badge-success">Recommended survivor</span>' : '<span class="badge badge-outline">Duplicate</span>') + '</span>' +
          '<span class="r-kv"><span>History score <b>' + m.historyScore + '</b></span><span><b>' + m.assessments + '</b> assessments</span><span><b>' + m.attendance + '</b> attendance</span><span><b>' + m.charges + '</b> charges</span><span><b>' + m.payments + '</b> payments</span></span></div></li>';
      }).join("") + '</ul>' +
      '<div><div class="label" style="margin-bottom:6px">Records to move</div><div class="r-kv"><span><b>' + mv.termForms + '</b> term forms</span><span><b>' + mv.attendance + '</b> attendance</span><span><b>' + mv.assessments + '</b> assessments</span><span><b>' + mv.charges + '</b> charges</span><span><b>' + mv.payments + '</b> payments</span></div></div>' +
      (g.conflicts.length ? '<div class="r-notice" style="margin:0">' + I("triangle-alert") + '<span>' + g.conflicts.map(esc).join("<br>") + '</span></div>' : "") +
      '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog">Cancel</button><button type="button" class="btn btn-default" data-act="doMerge"' + (!g.canMerge || d.saving ? " disabled" : "") + '>' + (d.saving ? "Merging…" : "Merge duplicate") + '</button></div>';
  }
  function importInner(d) {
    var list = unattached(), n = list.filter(function (x) { return d.sel[x]; }).length;
    return dlgHead("Import from catalog", "Attach school catalog subjects to " + esc(cls().displayName) + ".") +
      '<div class="r-dlg-row"><span>' + n + ' selected</span><span><button type="button" class="btn btn-ghost btn-sm" data-act="impAll">Select all</button><button type="button" class="btn btn-ghost btn-sm" data-act="impClear">Clear all</button></span></div>' +
      '<ul class="r-dlg-list">' + list.map(function (x, i) { return '<li><label><input type="checkbox" class="checkbox" data-scope="dialog" data-bind="sel.' + i + '" data-name="' + esc(x) + '" data-re data-fk="imp-' + i + '"' + (d.sel[x] ? " checked" : "") + '><span>' + esc(x) + '</span></label></li>'; }).join("") + '</ul>' +
      '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog">Cancel</button><button type="button" class="btn btn-default" data-act="impSave"' + (n && !d.saving ? "" : " disabled") + '>' + (d.saving ? "Importing…" : "Batch import" + (n ? " (" + n + ")" : "")) + '</button></div>';
  }
  function assessInner(d) {
    var f = d.f, sub = findSubject(d.subjectId);
    var thisW = f.split ? f.children.reduce(function (t, c) { return t + (+c.weight || 0); }, 0) : (+f.weight || 0);
    var others = sub ? sub.assessments.filter(function (a) { return a.id !== d.aId; }).reduce(function (t, a) { return t + aWeight(a); }, 0) : 0;
    var warns = [];
    if (thisW === 0) warns.push("0% weight: this assessment won't count toward the total.");
    if (others + thisW !== 100) warns.push("Subject weights will total " + (others + thisW) + "% (should be 100%).");
    if (!f.print) warns.push("Hidden from the printed result.");
    var h = dlgHead(d.aId ? "Edit assessment" : "New assessment", esc(sub ? sub.title : "")) +
      field("Title", inp("f.title", f.title, { scope: "dialog", err: d.errors.title, dir: 1 }), "f.title", { err: d.errors.title }) +
      '<label class="r-switchrow"><span>Split into sub-assessments</span><input type="checkbox" class="switch" data-scope="dialog" data-bind="f.split" data-re data-after="splitSeed" data-fk="split"' + (f.split ? " checked" : "") + '></label>';
    if (f.split) {
      var tp = f.children.reduce(function (t, c) { return t + (+c.obtainable || 0); }, 0);
      h += '<div class="field"><span class="label">Print mode</span><div class="r-radio-row"><label><input type="radio" class="radio" name="r-pm" value="EXPANDED" data-scope="dialog" data-bind="f.printMode"' + (f.printMode === "EXPANDED" ? " checked" : "") + '>Expanded (each part)</label><label><input type="radio" class="radio" name="r-pm" value="TOTAL" data-scope="dialog" data-bind="f.printMode"' + (f.printMode === "TOTAL" ? " checked" : "") + '>Total only</label></div></div>' +
        '<div class="r-children"><div class="r-childrow r-childhead"><span>Part title</span><span>Obtainable</span><span>Weight %</span><span></span></div>' + f.children.map(function (c, i) {
          return '<div class="r-childrow">' + inp("f.children." + i + ".title", c.title, { scope: "dialog", label: "Part " + (i + 1) + " title", ph: "Part " + (i + 1), err: d.errors["c" + i] }) + inp("f.children." + i + ".obtainable", c.obtainable, { scope: "dialog", label: "Part " + (i + 1) + " obtainable", re: 1, attrs: ' inputmode="numeric"' }) + inp("f.children." + i + ".weight", c.weight, { scope: "dialog", label: "Part " + (i + 1) + " weight", re: 1, attrs: ' inputmode="numeric"' }) +
            '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="removeChild" data-arg="' + i + '" aria-label="Remove part ' + (i + 1) + '"' + (f.children.length < 2 ? " disabled" : "") + '>' + I("x") + '</button></div>';
        }).join("") + '<div class="r-dlg-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addChild">' + I("plus") + 'Add part</button><span class="tnum">Total ' + tp + " pts · " + thisW + '%</span></div></div>';
    } else {
      h += '<div class="field-grid">' + field("Obtainable", inp("f.obtainable", f.obtainable, { scope: "dialog", ph: "Blank = uncapped", re: 1, err: d.errors.obtainable, attrs: ' inputmode="numeric"' }), "f.obtainable", { err: d.errors.obtainable }) +
        field("Weight %", inp("f.weight", f.weight, { scope: "dialog", re: 1, err: d.errors.weight, attrs: ' inputmode="numeric"' }), "f.weight", { err: d.errors.weight }) + '</div>';
    }
    h += '<label class="r-switchrow"><span>Show on result sheet</span><input type="checkbox" class="switch" data-scope="dialog" data-bind="f.print" data-re data-fk="print"' + (f.print ? " checked" : "") + '></label>' +
      (warns.length ? '<div class="r-notice" style="margin:0">' + I("triangle-alert") + '<span>' + warns.map(esc).join("<br>") + '</span></div>' : "") +
      '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog">Cancel</button><button type="button" class="btn btn-default" data-act="assessSave">Save</button></div>';
    return h;
  }
  function receiptInner(d) {
    return dlgHead("Receipt", esc(S.d.school.name) + " · " + esc(termLabel())) + '<div class="r-receipt"><div><span>Student</span><span dir="auto">' + esc(d.name) + '</span></div><div><span>Class</span><span>' + esc(d.className) + '</span></div>' +
      '<div><span>Method</span><span>' + esc(d.method) + (d.ref ? " · " + esc(d.ref) : "") + '</span></div><div><span>Date</span><span>' + fmtDate(d.date) + '</span></div><div><span>Amount received</span><span class="tnum">' + money(d.amount) + '</span></div></div>' +
      '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="closeDialog">Close</button><button type="button" class="btn btn-default" data-act="printReceipt">' + I("printer") + 'Print</button></div>';
  }

  /* ================= mutations ================= */
  function moveStudents(ids, dest) {
    var from = S.classId, d = classById(dest);
    ids.forEach(function (id) {
      var r = S.d.rosters[from], s = r.filter(function (x) { return x.id === id; })[0]; if (!s) return;
      S.d.rosters[from] = r.filter(function (x) { return x.id !== id; }); S.d.rosters[dest].push(s);
      var mv = S.d.charges[from].filter(function (c) { return c.studentId === id; });
      S.d.charges[from] = S.d.charges[from].filter(function (c) { return c.studentId !== id; });
      mv.forEach(function (c) { c.stream = d.stream; S.d.charges[dest].push(c); });
      delete S.sel[id];
    });
  }
  function removeStudent(id) {
    Object.keys(S.d.rosters).forEach(function (k) { S.d.rosters[k] = S.d.rosters[k].filter(function (x) { return x.id !== id; }); });
    Object.keys(S.d.charges).forEach(function (k) { S.d.charges[k] = S.d.charges[k].filter(function (c) { return c.studentId !== id; }); });
    Object.keys(S.d.duplicates).forEach(function (k) { S.d.duplicates[k] = S.d.duplicates[k].filter(function (g) { return !g.members.some(function (m) { return m.id === id; }); }); });
    delete S.sel[id];
  }
  function popTo(n) { S.stack = S.stack.slice(0, n); S.focusSel = n ? '[data-fk="back"]' : ".r-title"; }

  /* ================= actions ================= */
  var A = {
    menu: function (t) {
      var key = t.dataset.menu, arg = t.dataset.arg || "";
      if (S.menu && S.menu.key === key && S.menu.arg === arg) { S.menu = null; return; }
      var items = MENUS[key](arg); if (!items.length) return false;
      var r = t.getBoundingClientRect(), h = H.getBoundingClientRect();
      var est = items.reduce(function (n, i) { return n + (i.sep ? 9 : i.heading ? 28 : 34); }, 10);
      var m = { key: key, arg: arg, fk: t.dataset.fk };
      if (r.bottom + est > h.bottom - 8 && r.top - est > h.top) m.bottom = Math.round(h.bottom - r.top + 4); else m.top = Math.round(r.bottom - h.top + 4);
      if (t.dataset.align === "left") m.left = Math.max(8, Math.round(r.left - h.left)); else m.right = Math.max(8, Math.round(h.right - r.right));
      S.menu = m; S.focusSel = ".r-pop .menu-item:not([disabled])";
    },
    section: function (t) {
      var id = t.dataset.arg;
      S.section = id; S.stack = []; S.subjForm = id === "subjects" ? S.subjForm : null;
      try { var u = new URL(location.href); u.searchParams.set("classroomTab", id); history.replaceState(null, "", u.toString()); } catch (e) { /* file:// may refuse */ }
      S.focusSel = '[data-fk="sec-' + id + '"]';
    },
    crumb: function (t) { popTo(Number(t.dataset.arg) + 1); },
    back: function () { if (!S.stack.length) return false; popTo(S.stack.length - 1); },
    closeSheet: function () { S.closed = true; },
    reopen: function () { S.closed = false; S.focusSel = '[data-fk="switcher"]'; },
    switchClass: function (t) {
      S.classId = t.dataset.arg; S.stack = []; S.sel = {}; S.q = ""; S.shown = PAGE; S.subjForm = null; S.save = "idle";
      startLoad(); S.focusSel = '[data-fk="switcher"]';
    },
    protoLoading: function () { S.stack = []; startLoad(); },
    protoError: function () { S.stack = []; S.error = true; S.loading = false; },
    retry: function () { startLoad(); },

    /* students */
    newStudent: function () { openNewStudent(S.classId); },
    sort: function (t) { var k = t.dataset.arg; if (S.sort.key === k) S.sort.dir *= -1; else S.sort = { key: k, dir: 1 }; },
    sel: function (t) { var id = t.dataset.arg; S.sel[id] = !S.sel[id]; S.focusSel = '[data-fk="sel-' + id + '"]'; },
    selAll: function () { var ids = sortedStudents().map(function (s) { return s.id; }), all = ids.every(function (id) { return S.sel[id]; }); ids.forEach(function (id) { S.sel[id] = !all; }); },
    deselect: function () { S.sel = {}; },
    clearSearch: function () { S.q = ""; S.shown = PAGE; S.focusSel = '[data-fk="q"]'; },
    toggleCol: function (t) { var k = t.dataset.arg; S.cols[k] = !S.cols[k]; if (!S.cols[k] && S.sort.key === k) S.sort = { key: "name", dir: 1 }; S.focusSel = '.r-pop [data-arg="' + k + '"]'; },
    openStudent: function (t) { S.stack.push({ kind: "student", id: t.dataset.arg, tab: "overview" }); S.focusSel = '[data-fk="back"]'; },
    openStudentPay: function (t) { S.stack.push({ kind: "student", id: t.dataset.arg, tab: "payments" }); S.focusSel = '[data-fk="back"]'; },
    stTab: function (t) { top().tab = t.dataset.arg; S.focusSel = '[data-fk="tab-' + t.dataset.arg + '"]'; },
    askAssistant: function (t) { var s = findStudent(t.dataset.arg); CTX.toast("Assistant opened", "Asking about " + (s ? s.studentName : "student") + " in " + cls().displayName); return false; },
    askSel: function () { CTX.toast("Assistant opened", selIds().length + " selected students attached as context"); return false; },
    askClass: function () { CTX.toast("Assistant opened", cls().displayName + " attached as context"); return false; },
    reportCard: function (t) { var s = findStudent(t.dataset.arg); CTX.toast("Report card", "Opens " + termLabel() + " report card for " + (s ? s.studentName : "student") + " (simulated)"); return false; },
    editStudent: function (t) {
      if (!canManage()) return false;
      var s = findStudent(t.dataset.arg); if (!s) return false;
      var c = classOfStudent(s.id), cur = top();
      if (!cur || cur.kind !== "student" || cur.id !== s.id) S.stack.push({ kind: "student", id: s.id, tab: "overview" });
      S.stack.push({ kind: "studentEdit", id: s.id, errors: {}, saving: false, f: { name: s.name, surname: s.surname, other: s.otherName || "", gender: s.gender || "", dob: s.dob || "", adm: s.admissionStatus, classId: c ? c.id : S.classId, parentOpen: true, pName: s.guardian || "", pPhone: s.guardianPhone || "", pPhone2: s.guardianPhone2 || "" } });
      S.focusSel = "#" + fid("f.name");
    },
    removeTerm: function (t) {
      var s = findStudent(t.dataset.arg); if (!s) return false;
      confirmDlg({ title: "Remove from current term?", desc: '<span dir="auto">' + esc(s.studentName) + "</span> will be unenrolled from " + esc(termLabel()) + ". Their record and history stay.", confirm: "Remove from term", danger: 1,
        run: function () { s.enrolled = false; s.termFormId = null; CTX.toast("Removed from term", s.studentName + " is no longer enrolled this term"); } });
    },
    deleteStudent: function (t) {
      var s = findStudent(t.dataset.arg); if (!s) return false;
      confirmDlg({ title: "Delete student?", desc: 'This permanently deletes <b dir="auto">' + esc(s.studentName) + "</b> and their records. This can't be undone.", confirm: "Delete student", danger: 1,
        run: function () {
          if (allCharges().some(function (c) { return c.studentId === s.id && c.amountPaid > 0; })) return "Can't delete: this student has payments recorded. Reverse the payments first, or remove them from the term instead.";
          removeStudent(s.id); S.stack = S.stack.filter(function (x) { return x.id !== s.id; });
          CTX.toast("Student deleted", s.studentName + " was removed");
        } });
    },
    moveOne: function (t) {
      var s = findStudent(t.dataset.arg), it = top(), dest = classById(it.moveTo); if (!s || !dest) return false;
      confirmDlg({ title: "Move to " + dest.displayName + "?", desc: '<span dir="auto">' + esc(s.studentName) + "</span> moves with their charges for this term.", confirm: "Move student",
        run: function () { var from = S.classId; var c = classOfStudent(s.id); S.classId = c.id; moveStudents([s.id], dest.id); S.classId = from; it.moveTo = null; CTX.toast("Student moved", s.studentName + " → " + dest.displayName); } });
    },
    exportAll: function () { exportStudents(roster()); return false; },
    exportSel: function () { var ids = selIds(); exportStudents(roster().filter(function (s) { return ids.indexOf(s.id) > -1; })); return false; },
    bulkAdmission: function () {
      var ids = selIds();
      confirmDlg({ title: "Set admission status", desc: "Applies to " + plural(ids.length, "selected student") + ". Fees are reconciled for the new status.", confirm: "Set status", f: { adm: "RETURNING" },
        body: function (d) { return field("Admission status", sel("f.adm", d.f.adm, Object.keys(ADM).map(function (k) { return [k, ADM[k]]; }), { scope: "dialog" }), "f.adm"); },
        run: function () { var d = S.dialog; roster().forEach(function (s) { if (ids.indexOf(s.id) > -1) s.admissionStatus = d.f.adm; }); S.sel = {}; CTX.toast("Admission status updated", plural(ids.length, "student") + " set to " + ADM[d.f.adm] + " · fees reconciled"); } });
    },
    bulkMove: function () {
      var ids = selIds(), dests = S.d.classrooms.filter(function (c) { return c.id !== S.classId; });
      confirmDlg({ title: "Move class", desc: "Move " + plural(ids.length, "selected student") + " and their term charges.", confirm: "Move students", f: { dest: dests[0].id }, refreshing: false,
        body: function (d) {
          return '<div class="field"><div class="r-dlg-row"><label class="label" for="' + fid("f.dest") + '">Destination class</label><button type="button" class="btn btn-ghost btn-sm" data-act="refreshDest"' + (d.refreshing ? " disabled" : "") + '>' + I("refresh-cw", 14, d.refreshing ? "r-spin" : "") + (d.refreshing ? "Refreshing…" : "Refresh") + '</button></div>' +
            sel("f.dest", d.f.dest, dests.map(function (c) { return [c.id, c.displayName]; }), { scope: "dialog" }) + '<p class="field-description">You can move 1–100 students at a time.</p></div>';
        },
        run: function () {
          if (ids.length < 1 || ids.length > 100) return "Select between 1 and 100 students to move.";
          var d = classById(S.dialog.f.dest); moveStudents(ids, d.id); CTX.toast("Students moved", plural(ids.length, "student") + " moved to " + d.displayName);
        } });
    },
    refreshDest: function () { var d = S.dialog; d.refreshing = true; later(function () { if (S.dialog === d) { d.refreshing = false; render(); } }, 600); },
    bulkRemove: function () {
      var ids = selIds();
      confirmDlg({ title: "Remove from term?", desc: plural(ids.length, "selected student") + " will be unenrolled from " + esc(termLabel()) + ". Records stay.", confirm: "Remove from term", danger: 1,
        run: function () { var n = 0; roster().forEach(function (s) { if (ids.indexOf(s.id) > -1 && s.enrolled) { s.enrolled = false; s.termFormId = null; n++; } }); S.sel = {}; CTX.toast("Removed from term", n + " removed · " + (ids.length - n) + " already not enrolled"); } });
    },
    reviewMerge: function (t) { S.dialog = { kind: "merge", key: t.dataset.arg, w: "34rem", saving: false }; S.focusSel = '.r-dialog [data-act="closeDialog"]'; },
    doMerge: function () {
      var d = S.dialog, g = dups().filter(function (x) { return x.key === d.key; })[0]; if (!g || !g.canMerge || d.saving) return false;
      d.saving = true;
      later(function () {
        var loser = g.members.filter(function (m) { return !m.recommended; })[0], surv = g.members.filter(function (m) { return m.recommended; })[0];
        allCharges().forEach(function (c) { if (c.studentId === loser.id) { c.studentId = surv.id; } });
        allSessions().forEach(function (x) { var has = x.records.some(function (r) { return r.studentId === surv.id; }); x.records = x.records.filter(function (r) { if (r.studentId !== loser.id) return true; if (has) return false; r.studentId = surv.id; return true; }); });
        S.d.rosters[S.classId] = roster().filter(function (s) { return s.id !== loser.id; });
        S.d.duplicates[S.classId] = dups().filter(function (x) { return x !== g; });
        delete S.sel[loser.id]; S.dialog = null;
        CTX.toast("Duplicate merged", g.displayName + ": duplicate removed, " + (g.toMove.attendance + g.toMove.charges + g.toMove.termForms) + " records moved");
        render();
      }, 700);
    },

    /* student form */
    formClass: function () { var it = top(); it.f.stream = classById(it.f.classId).stream || ""; it.retried = false; loadFees(it); },
    feeRetry: function () { var it = top(); it.retried = true; loadFees(it); },
    toggleParent: function () { var it = top(); it.f.parentOpen = !it.f.parentOpen; if (it.f.parentOpen) S.focusSel = "#" + fid("f.pName"); },
    formSave: function () {
      var it = top(), f = it.f, e = {};
      if (!f.name.trim()) e.name = "Enter a first name";
      if (!f.surname.trim()) e.surname = "Enter a surname";
      if (!f.gender) e.gender = "Choose a gender";
      var total = 0, rec = 0;
      if (it.kind === "newStudent") {
        total = f.fees.reduce(function (t, x) { return t + (x.add ? x.amount : 0); }, 0);
        rec = f.received === "" ? 0 : Number(String(f.received).replace(/,/g, ""));
        if (isNaN(rec) || rec < 0) e.received = "Enter an amount in naira";
        else if (rec > total) e.received = "Can't receive more than " + money(total);
      }
      it.errors = e;
      if (Object.keys(e).length) { var k = Object.keys(e)[0]; S.focusSel = "#" + fid("f." + k); return; }
      it.saving = true;
      later(function () {
        it.saving = false;
        if (it.kind === "studentEdit") {
          var s = findStudent(it.id);
          if (s) { s.name = f.name.trim(); s.surname = f.surname.trim(); s.otherName = f.other.trim(); s.studentName = s.name + " " + s.surname; s.gender = f.gender; s.dob = f.dob; s.admissionStatus = f.adm; s.guardian = f.pName.trim(); s.guardianPhone = f.pPhone.trim(); s.guardianPhone2 = f.pPhone2.trim();
            allCharges().forEach(function (c) { if (c.studentId === s.id) c.studentName = s.studentName; }); }
          popTo(S.stack.length - 1); CTX.toast("Changes saved", (s ? s.studentName : "Student") + " updated");
        } else {
          var id = uid(f.classId), c = classById(f.classId);
          var st = { id: id, name: f.name.trim(), surname: f.surname.trim(), otherName: f.other.trim(), studentName: f.name.trim() + " " + f.surname.trim(), gender: f.gender, dob: f.dob, enrolled: true, termFormId: "tf-" + id, admissionStatus: f.adm, guardian: f.pName.trim(), guardianPhone: f.pPhone.trim(), guardianPhone2: f.pPhone2.trim(), createdAt: S.d.today };
          S.d.rosters[f.classId].push(st);
          f.fees.forEach(function (x, i) { if (x.add) S.d.charges[f.classId].push({ id: id + "-ch-" + i, studentId: id, studentName: st.studentName, title: x.title, stream: f.stream || c.stream, amount: x.amount, amountPaid: 0, outstanding: x.amount, status: "PENDING" }); });
          if (rec > 0) applyPayment(id, rec);
          it.done = { studentId: id, name: st.studentName, className: c.displayName, received: rec, pending: total - rec, method: f.method, ref: f.ref, date: f.payDate };
        }
        render();
      }, 650);
    },
    formCreateNew: function () { var it = top(), cid = it.f.classId; S.stack.pop(); openNewStudent(cid); },
    viewReceipt: function () { var d = top().done; S.dialog = { kind: "receipt", name: d.name, className: d.className, amount: d.received, method: d.method, ref: d.ref, date: d.date }; },
    applyPayment: function (t) { openReceive(t.dataset.arg); },
    printReceipt: function () { CTX.toast("Receipt sent to print", "Print dialog simulated"); return false; },

    /* attendance */
    takeAttendance: function () { openRecorder(null); },
    openSession: function (t) { S.stack.push({ kind: "session", id: t.dataset.arg }); S.focusSel = '[data-fk="back"]'; },
    correctSession: function (t) { openRecorder(t.dataset.arg); },
    deleteSession: function (t) {
      if (!isAdmin()) return false;
      var s = findSession(t.dataset.arg); if (!s) return false;
      confirmDlg({ title: "Delete attendance session?", desc: esc(s.title) + " on " + fmtDay(s.date) + " and its " + s.records.length + " records will be deleted.", confirm: "Delete session", danger: 1,
        run: function () { S.d.attendanceSessions[S.classId] = sessions().filter(function (x) { return x.id !== s.id; }); S.stack = S.stack.filter(function (x) { return x.id !== s.id && x.correctId !== s.id; }); CTX.toast("Session deleted", s.title + " · " + fmtDay(s.date)); } });
    },
    exportAtt: function () { exportSessions(sessions()); return false; },
    exportSession: function (t) { var s = findSession(t.dataset.arg); if (!s) return false;
      download(slug(cls().displayName + "-" + s.title + "-" + s.date) + ".csv", [["Student", "Status", "Remarks"]].concat(s.records.map(function (r) { var st = findStudent(r.studentId); return [st ? st.studentName : r.studentId, MARK[r.status], r.remarks]; }))); return false; },
    prevDay: function () { var it = top(); it.f.date = addDays(it.f.date, -1); },
    nextDay: function () { var it = top(); var n = addDays(it.f.date, 1); if (n <= S.d.today) it.f.date = n; },
    recType: function () { var f = top().f; if (f.type === "GENERAL") { f.subject = ""; if (f.title !== "Daily attendance" && subjects().some(function (s) { return s.title === f.title; })) f.title = "Daily attendance"; } },
    recSubject: function () { var f = top().f; if (f.subject) f.title = f.subject; },
    mark: function (t) { var p = t.dataset.arg.split("|"), it = top(), m = it.marks[p[0]] || (it.marks[p[0]] = { status: "", remark: "" }); m.status = m.status === p[1] ? "" : p[1]; if (m.status === "PRESENT" || !m.status) m.remark = ""; it.err = ""; },
    markAll: function (t) { var it = top(); recRoster(it).forEach(function (s) { var m = it.marks[s.id] || (it.marks[s.id] = { status: "", remark: "" }); m.status = t.dataset.arg; }); it.err = ""; },
    markRest: function (t) { var it = top(); recRoster(it).forEach(function (s) { var m = it.marks[s.id] || (it.marks[s.id] = { status: "", remark: "" }); if (!m.status) m.status = t.dataset.arg; }); it.err = ""; },
    clearAll: function () { top().marks = {}; },
    recAddStudent: function () { if (canManage()) openNewStudent(S.classId); },
    recSave: function () {
      var it = top(), f = it.f, list = recRoster(it);
      it.errs = {}; it.err = "";
      if (!f.title.trim()) it.errs.title = "Give the session a title";
      if (f.type === "SUBJECT" && !f.subject) it.errs.subject = "Choose a subject";
      var marked = list.filter(function (s) { return it.marks[s.id] && it.marks[s.id].status; });
      if (!marked.length) it.err = "Mark at least one student before saving.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || f.date > S.d.today) it.errs.title = it.errs.title || "Pick a valid date up to today";
      if (it.err || Object.keys(it.errs).length) { if (it.err && !Object.keys(it.errs).length) S.focusSel = '[data-act="recSave"]'; return; }
      it.saving = true;
      later(function () {
        var records = marked.map(function (s) { var m = it.marks[s.id]; return { studentId: s.id, status: m.status, remarks: m.status === "PRESENT" ? "" : (m.remark || "").trim() }; });
        var me = S.d.viewer.name;
        if (it.correctId) {
          var s = findSession(it.correctId);
          var old = {}; s.records.forEach(function (r) { old[r.studentId] = r.status; });
          var changed = records.filter(function (r) { return old[r.studentId] !== r.status; }).length + s.records.filter(function (r) { return !records.some(function (x) { return x.studentId === r.studentId; }); }).length;
          s.records = records; s.title = f.title.trim(); s.type = f.type; s.subject = f.type === "SUBJECT" ? f.subject : null; s.period = f.period.trim(); s.date = f.date;
          s.history.push({ action: "Corrected", actor: me, at: nowStamp(), summary: changed ? plural(changed, "student") + " changed" : "Session details updated" });
          popTo(S.stack.length - 1); CTX.toast("Correction saved", s.title + " · " + fmtDay(s.date));
        } else {
          var ns = { id: S.classId + "-att-n" + (++S.seq), title: f.title.trim(), type: f.type, subject: f.type === "SUBJECT" ? f.subject : null, period: f.period.trim(), date: f.date, takenBy: me, records: records,
            history: [{ action: "Created", actor: me, at: nowStamp(), summary: records.length + " students marked" }] };
          sessions().push(ns);
          popTo(S.stack.length - 1); CTX.toast("Attendance saved", records.length + " of " + list.length + " marked · " + fmtDay(f.date));
        }
        render();
      }, 550);
    },

    /* subjects */
    addSubject: function () { if (!S.subjForm) S.subjForm = { name: "", desc: "", error: "" }; S.focusSel = '[data-fk="subj:name"]'; },
    subjCancel: function () { S.subjForm = null; S.focusSel = '[data-fk="add-subject"]'; },
    subjSave: function () {
      var f = S.subjForm; if (!f || f.saving) return false;
      var name = f.name.trim();
      if (!name) { f.error = "Enter a subject name"; S.focusSel = '[data-fk="subj:name"]'; return; }
      if (subjects().some(function (s) { return s.title.toLowerCase() === name.toLowerCase(); })) { f.error = name + " is already in this class"; S.focusSel = '[data-fk="subj:name"]'; return; }
      f.error = ""; f.saving = true;
      later(function () { subjects().unshift({ id: uid(S.classId + "-sub"), title: name, description: f.desc.trim(), assessments: [] }); S.subjForm = { name: "", desc: "", error: "" }; S.focusSel = '[data-fk="subj:name"]'; CTX.toast("Subject added", name); render(); }, 400);
    },
    openImport: function () { S.dialog = { kind: "import", sel: {}, w: "26rem", saving: false }; },
    impAll: function () { unattached().forEach(function (x) { S.dialog.sel[x] = true; }); },
    impClear: function () { S.dialog.sel = {}; },
    impSave: function () {
      var d = S.dialog, names = unattached().filter(function (x) { return d.sel[x]; }); if (!names.length) return false;
      d.saving = true;
      later(function () { names.forEach(function (n) { subjects().push({ id: uid(S.classId + "-sub"), title: n, description: "", assessments: [] }); }); S.dialog = null; CTX.toast("Subjects imported", plural(names.length, "subject") + " added to " + cls().displayName); render(); }, 500);
    },
    openSubject: function (t) { S.stack.push({ kind: "subject", id: t.dataset.arg, tab: "assessments" }); S.save = "idle"; S.focusSel = '[data-fk="back"]'; },
    deleteSubject: function (t) {
      if (!isAdmin()) return false;
      var s = findSubject(t.dataset.arg); if (!s) return false;
      confirmDlg({ title: "Delete subject?", desc: esc(s.title) + " and its " + plural(s.assessments.length, "assessment") + " will be removed from " + esc(cls().displayName) + ".", confirm: "Delete subject", danger: 1,
        run: function () { S.d.subjects[S.classId] = subjects().filter(function (x) { return x.id !== s.id; }); S.stack = S.stack.filter(function (x) { return x.id !== s.id; }); CTX.toast("Subject deleted", s.title); } });
    },
    subjTab: function (t) { top().tab = t.dataset.arg; S.focusSel = '[data-fk="tab-' + t.dataset.arg + '"]'; },
    recordScope: function (t) { CTX.toast("Record submission", "Opens assessment recording (" + t.dataset.arg + " scope) in a new tab"); return false; },
    quickAdd: function (t) {
      var sub = findSubject(top().id), have = sub.assessments.map(function (a) { return a.title.toLowerCase(); });
      var sugg = S.d.assessmentSuggestions.filter(function (s) { return have.indexOf(s.title.toLowerCase()) < 0; })[Number(t.dataset.arg)]; if (!sugg) return false;
      sub.assessments.push({ id: uid("a"), title: sugg.title, obtainable: sugg.obtainable, weight: sugg.weight, submissions: 0, print: true, children: [] });
    },
    newAssess: function () { S.dialog = { kind: "assess", subjectId: top().id, aId: null, w: "32rem", errors: {}, f: { title: "", split: false, printMode: "TOTAL", obtainable: "", weight: "0", print: true, children: [] } }; S.focusSel = "#" + fid("f.title"); },
    editAssess: function (t) {
      var sub = findSubject(top().id), a = sub.assessments.filter(function (x) { return x.id === t.dataset.arg; })[0]; if (!a) return false;
      S.dialog = { kind: "assess", subjectId: sub.id, aId: a.id, w: "32rem", errors: {}, f: { title: a.title, split: !!(a.children && a.children.length), printMode: a.printMode || "TOTAL", obtainable: a.obtainable == null ? "" : String(a.obtainable), weight: String(a.weight || 0), print: a.print !== false,
        children: (a.children || []).map(function (c) { return { id: c.id, title: c.title, obtainable: c.obtainable == null ? "" : String(c.obtainable), weight: String(c.weight || 0) }; }) } };
      S.focusSel = "#" + fid("f.title");
    },
    splitSeed: function () { var f = S.dialog.f; if (f.split && !f.children.length) f.children = [{ title: "", obtainable: "", weight: "0" }, { title: "", obtainable: "", weight: "0" }]; },
    addChild: function () { S.dialog.f.children.push({ title: "", obtainable: "", weight: "0" }); S.focusSel = '[data-fk="dialog:f.children.' + (S.dialog.f.children.length - 1) + '.title"]'; },
    removeChild: function (t) { var c = S.dialog.f.children; if (c.length > 1) c.splice(Number(t.dataset.arg), 1); },
    assessSave: function () {
      var d = S.dialog, f = d.f, e = {}, sub = findSubject(d.subjectId);
      function num(v) { return v === "" || v == null ? null : Number(v); }
      if (!f.title.trim()) e.title = "Enter a title";
      if (f.split) f.children.forEach(function (c, i) { if (!c.title.trim()) e["c" + i] = "Name each part"; });
      else {
        if (f.obtainable !== "" && (isNaN(Number(f.obtainable)) || Number(f.obtainable) <= 0)) e.obtainable = "Use a positive number, or leave blank for uncapped";
        if (isNaN(Number(f.weight)) || Number(f.weight) < 0 || Number(f.weight) > 100) e.weight = "Weight must be 0–100";
      }
      d.errors = e; if (Object.keys(e).length) return;
      var a = d.aId ? sub.assessments.filter(function (x) { return x.id === d.aId; })[0] : { id: uid("a"), submissions: 0 };
      a.title = f.title.trim(); a.print = !!f.print;
      if (f.split) { a.children = f.children.map(function (c) { return { id: c.id || uid("ac"), title: c.title.trim(), obtainable: num(c.obtainable), weight: Number(c.weight) || 0, submissions: 0 }; }); a.printMode = f.printMode; a.obtainable = null; a.weight = 0; }
      else { a.children = []; a.obtainable = num(f.obtainable); a.weight = Number(f.weight) || 0; delete a.printMode; }
      if (!d.aId) sub.assessments.push(a);
      S.dialog = null; CTX.toast(d.aId ? "Assessment updated" : "Assessment created", a.title + " · " + aWeight(a) + "%");
    },
    moveAssess: function (t) {
      var p = t.dataset.arg.split("|"), sub = findSubject(top().id), i = sub.assessments.findIndex(function (a) { return a.id === p[0]; }), j = i + Number(p[1]);
      if (i < 0 || j < 0 || j >= sub.assessments.length) return false;
      var x = sub.assessments[i]; sub.assessments[i] = sub.assessments[j]; sub.assessments[j] = x;
      S.focusSel = '[data-fk="' + (Number(p[1]) < 0 ? "up-" : "dn-") + p[0] + '"]';
    },
    deleteAssess: function (t) {
      var sub = findSubject(top().id), a = sub.assessments.filter(function (x) { return x.id === t.dataset.arg; })[0]; if (!a) return false;
      confirmDlg({ title: "Delete assessment?", desc: esc(a.title) + " and any scores entered for it will be removed from " + esc(sub.title) + ".", confirm: "Delete", danger: 1,
        run: function () { sub.assessments = sub.assessments.filter(function (x) { return x !== a; }); CTX.toast("Assessment deleted", a.title); } });
    },

    /* payments */
    receive: function () { openReceive(""); },
    record: function (t) { openReceive(t.dataset.arg); },
    recvStudent: function () { var f = top().f; f.amount = f.studentId ? String(studentOutstanding(f.studentId)) : ""; },
    recvSave: function () {
      var it = top(), f = it.f, e = {}, amt = Number(String(f.amount).replace(/,/g, ""));
      if (!f.studentId) e.studentId = "Choose who is paying";
      else if (!f.amount || isNaN(amt) || amt <= 0) e.amount = "Enter an amount above ₦0";
      else if (amt > studentOutstanding(f.studentId)) e.amount = "More than the " + money(studentOutstanding(f.studentId)) + " outstanding";
      it.errs = e; if (Object.keys(e).length) { S.focusSel = "#" + fid("f." + (e.studentId ? "studentId" : "amount")); return; }
      it.saving = true;
      later(function () { var s = findStudent(f.studentId); applyPayment(f.studentId, amt); popTo(S.stack.length - 1); CTX.toast("Payment received", money(amt) + " from " + (s ? s.studentName : "student") + " · " + f.method); render(); }, 550);
    },

    /* dialogs */
    closeDialog: function () { S.dialog = null; },
    dlgConfirm: function () {
      var d = S.dialog; if (!d || d.saving) return false;
      d.saving = true; d.error = "";
      later(function () {
        if (S.dialog !== d) return;
        var err = d.run();
        if (err) { d.saving = false; d.error = err; } else S.dialog = null;
        render();
      }, 600);
    }
  };

  function exportStudents(list) {
    var c = cls();
    download(slug(c.displayName) + "-students.csv", [["Student ID", "Student", "Class", "Gender", "Status", "Guardian", "Phone"]].concat(list.map(function (s) {
      return [shortId(s.id), s.studentName, c.displayName, s.gender, (s.enrolled ? "Enrolled" : "Not enrolled") + " · " + ADM[s.admissionStatus], s.guardian, s.guardianPhone];
    })));
    CTX.toast("CSV exported", plural(list.length, "student") + " from " + c.displayName);
  }
  function exportSessions(list) {
    download(slug(cls().displayName) + "-attendance.csv", [["Date", "Title", "Subject", "Period", "Taken by", "Present", "Late", "Absent", "Rate %"]].concat(list.map(function (s) {
      var t = sessStats(s); return [s.date, s.title, s.subject || "", s.period || "", s.takenBy, t.p, t.l, t.a, t.rate];
    })));
  }

  /* ================= render ================= */
  function render() {
    if (!H || !S) return;
    var ae = document.activeElement, fk = null, ss = null, se = null;
    if (ae && H.contains(ae) && ae.dataset && ae.dataset.fk) { fk = ae.dataset.fk; try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (e) { ss = null; } }
    var body = H.querySelector(".r-body"), prevKey = body && body.dataset.key, prevTop = body ? body.scrollTop : 0;
    var chips = H.querySelector(".r-chips"), chipX = chips ? chips.scrollLeft : 0;
    var wrap = H.querySelector(".r-grid") && H.querySelector(".r-grid").parentNode, wrapX = wrap ? wrap.scrollLeft : 0;

    H.removeAttribute("style");
    if (S.closed) {
      H.style.width = "0"; H.style.background = "transparent"; H.style.boxShadow = "none";
      H.innerHTML = '<button type="button" class="btn btn-default r-closed" data-act="reopen">' + I("panel-right") + 'Reopen ' + esc(cls().displayName) + '</button>';
      var b = H.querySelector(".r-closed"); if (b) b.focus();
      return;
    }
    H.style.width = "min(100%, 60rem)"; H.style.transition = "none";
    H.innerHTML = sheetHtml();

    var nb = H.querySelector(".r-body"); if (nb && nb.dataset.key === prevKey) nb.scrollTop = prevTop;
    var nc = H.querySelector(".r-chips");
    if (nc) { nc.scrollLeft = chipX; var cur = nc.querySelector('[aria-current="page"]'); if (cur && (cur.offsetLeft < nc.scrollLeft || cur.offsetLeft + cur.offsetWidth > nc.scrollLeft + nc.clientWidth)) nc.scrollLeft = cur.offsetLeft - 8; }
    var nw = H.querySelector(".r-grid") && H.querySelector(".r-grid").parentNode; if (nw) nw.scrollLeft = wrapX;
    H.querySelectorAll("[data-indet]").forEach(function (x) { x.indeterminate = true; });

    var target = null;
    if (S.focusSel) { try { target = H.querySelector(S.focusSel); } catch (e) { target = null; } S.focusSel = null; }
    if (!target && fk) { try { target = H.querySelector('[data-fk="' + (window.CSS && CSS.escape ? CSS.escape(fk) : fk) + '"]'); } catch (e) { target = null; } }
    if (target) {
      target.focus({ preventScroll: !!fk && !S.menu });
      if (fk && target.dataset.fk === fk && ss != null) { try { target.setSelectionRange(ss, se); } catch (e) { /* not a text input */ } }
    }
    observeMore();
  }
  function observeMore() {
    if (OBS) { OBS.disconnect(); OBS = null; }
    var s = H.querySelector("[data-sentinel]"); if (!s || !("IntersectionObserver" in window)) return;
    OBS = new IntersectionObserver(function (en) {
      if (!en.some(function (x) { return x.isIntersecting; }) || S.loadingMore) return;
      S.loadingMore = true;
      later(function () { S.loadingMore = false; S.shown += PAGE; render(); }, 550);
    }, { root: H.querySelector(".r-body") });
    OBS.observe(s);
  }

  /* ================= events ================= */
  function onClick(e) {
    var t = e.target.closest("[data-act]");
    if (t && !H.contains(t)) return;
    var inPop = !!e.target.closest(".r-pop");
    if (S.menu && !inPop && !(t && t.dataset.act === "menu")) { S.menu = null; if (!t) { render(); return; } }
    if (!t || t.disabled) return;
    if (inPop && t.dataset.keep == null) S.menu = null;
    var fn = A[t.dataset.act]; if (!fn) return;
    var res = fn(t, e);
    if (res !== false) render(); else if (inPop) render();
  }
  function onInput(e) {
    var el = e.target; if (!H.contains(el)) return;
    if (el.dataset.score) { onScore(el); return; }
    if (el.dataset.input === "q") { S.q = el.value; S.shown = PAGE; render(); return; }
    if (!el.dataset.bind) return;
    var scope = el.dataset.scope, obj = scope === "dialog" ? S.dialog : scope === "subj" ? S.subjForm : top();
    if (!obj) return;
    var v = el.type === "checkbox" ? el.checked : el.value;
    if (scope === "dialog" && S.dialog && S.dialog.kind === "import" && el.dataset.name) { S.dialog.sel[el.dataset.name] = el.checked; }
    else if (el.type === "radio") { if (el.checked) setPath(obj, el.dataset.bind, el.value); }
    else setPath(obj, el.dataset.bind, v);
    if (scope === "subj" && S.subjForm.error && el.value.trim()) { S.subjForm.error = ""; }
    if (el.dataset.after && A[el.dataset.after]) A[el.dataset.after](el);
    if (el.dataset.re != null) render();
  }
  function onKey(e) {
    if (!H || !S || S.closed) return;
    var inHost = H.contains(e.target);
    if (e.key === "Escape") {
      if (S.menu) { var fk = S.menu.fk; S.menu = null; if (fk) S.focusSel = '[data-fk="' + fk + '"]'; }
      else if (S.dialog) S.dialog = null;
      else if (S.subjForm && inHost && e.target.closest(".r-addrow")) { S.subjForm = null; S.focusSel = '[data-fk="add-subject"]'; }
      else if (S.stack.length) popTo(S.stack.length - 1);
      else return;
      e.preventDefault(); render(); return;
    }
    if (!inHost) return;
    if (S.menu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      var items = Array.prototype.slice.call(H.querySelectorAll(".r-pop .menu-item:not([disabled])")); if (!items.length) return;
      var i = items.indexOf(document.activeElement); i = e.key === "ArrowDown" ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items[i].focus(); e.preventDefault(); return;
    }
    if (e.key === "Enter" && e.target.dataset && e.target.dataset.enter) { e.preventDefault(); var r = A[e.target.dataset.enter](e.target); if (r !== false) render(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.tagName === "TR" && e.target.dataset.act) { e.preventDefault(); onClick({ target: e.target }); }
    if (e.key === "Tab" && S.dialog) {
      var dlg = H.querySelector(".r-dialog"); if (!dlg) return;
      var f = Array.prototype.slice.call(dlg.querySelectorAll("button:not([disabled]), input, select, textarea")); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    }
  }

  /* ================= coverage ================= */
  var coverage = {
    H1: "Rail top: class name + chevron opens the classroom menu (all 5 incl. empty SS 1). Switching keeps the section, clears drill-ins, attendance drafts, selection and search.",
    H2: "“First Term · 2026/2027” under the class name in the rail switcher.",
    H3: "Class name is the switcher label (rail on desktop, top row on phone).",
    H4: "Header stats replaced by one live metric per rail item: student count, attendance avg %, subjects needing weights, ₦ due. Class average deferred to Performance (no “--”).",
    H5: "Five rail items (phone: chip row). ?classroomTab= deep link read on load and written on change; unknown/null falls back to Students.",
    H6: "Close sheet at rail bottom (phone: X), with Reopen. Detail = drill-in that replaces the right pane with breadcrumb + back (Esc); rail stays; sheet never widens. Phone: full-screen page.",
    H7: "Skeleton pane + skeleton rail metrics on open/class switch; error fallback with Try again (class menu → Prototype states).",
    S1: "Muted “Checking student count and duplicate names…” row, then one amber row per group (name, N records, recommended survivor + class, Review merge); calm “No duplicate names found” in the context line. Count only in the rail.",
    S2: "Review merge dialog: members with Recommended survivor badge, history score and counts; Records to move; conflicts; Cancel / Merge duplicate (disabled unless canMerge). Merge removes the duplicate.",
    S3: "Primary “Add student” in the Students page header → New student drill-in.",
    S4: "4 default columns: Student (avatar, name, 8-char ID), Admission, Guardian (name + phone), Status (Enrolled/Not enrolled). Columns menu adds Gender, Date of birth, Created. No Class column.",
    S5: "Sortable headers (name, admission, guardian, gender, DOB, created, status) and a search field for name/ID scoped to this class only. Column choice via Columns menu (reorder not built).",
    S6: "Row click → Student drill-in: name, class · gender · ID, Report card + Edit; tabs Overview (ID, class, term, gender… + Move class), Academics, Attendance, Payments.",
    S7: "Row ⋯: View details, Ask assistant; Admin/Registrar: Edit information, Remove from current term (enrolled only), Delete student. Each confirms with a Saving… state; delete shows an error if payments exist.",
    S8: "Checkboxes → floating bulk bar at the bottom of the pane: count, Deselect, Export CSV (real download), Assistant; Admin/Registrar: Admission status (reconciles fees), Move class (refresh, 1–100 limit), Remove from term. Confirm + toast.",
    S9: "“No students” + Enroll student (SS 1 empty class); “No results” + Clear filters; skeleton while loading; “Loading more students…” row that loads the next 20 on scroll.",
    S10: "New student drill-in: names, gender, DOB, admission status, classroom (prefilled), stream, fee preview with per-fee tick + Retry fee preview (SS 1 fails once), amount/method/date/reference, collapsible parent. Loading workspace state; success with Create new / Close / View receipt or Apply payment. Roster and rail count update.",
    A1: "Recorder settings row: type (General class/Subject), title (default “Daily attendance”), subject select (auto-fills title), optional period.",
    A2: "Date stepper ‹ date › with native calendar input; next day disabled past today.",
    A3: "Recorder ⋯ → Add student (Admin/Registrar) opens New student; back returns to the recorder with the student listed.",
    A4: "Recorder ⋯ menu: Mark all as Present/Absent/Late, Mark rest as Present/Absent/Late, Clear all.",
    A5: "Numbered roster, 3-way P/A/L segmented control (tap again clears), tinted rows, inline remark only for Absent/Late. Loading line + empty “No students enrolled in this class for the active term”.",
    A6: "Sticky footer: “X of Y students marked” + progress, partial save allowed, inline validation, Save attendance. No toast per tap.",
    A7: "Single totals line above the history: sessions + records, % attended (+count), % absent (+count). Export CSV in page ⋯ (real download).",
    A8: "History table: title, date · subject · period, Taken by, Present (+late), Absent, rate bar; row ⋯ Open / Correct / Delete (Admin only, confirm). Empty “No attendance records yet”.",
    A9: "Session drill-in: title, date · subject · period · staff, % attended, counts (students/present/late/absent/excused/on leave), revision history, student list with remark or “No remark”; Correct session; Close = back/Esc; not-found state.",
    A10: "Correct session = recorder prefilled; Cancel / Save correction adds a “Corrected” history entry.",
    U1: "“Add subject” opens an inline row form at the top of the table (Name, Description, Save/Cancel, Enter submits); empty or duplicate name shows an error; resets after save.",
    U2: "Subjects ⋯ → Import from catalog (only when unattached subjects exist): checkbox list, N selected, Select all/Clear all, Batch import.",
    U3: "Compact table: Subject, Assessments, Weight total (ok/warn icon), Submissions; no filler or badges. Row ⋯ Open / Delete (Admin, confirm). Empty state with working Add subject + Import.",
    U4: "Subject drill-in header: title + one stats sentence (class, students, score items, grouped, submissions, weight %). Two labeled tabs: Assessments, Score entry.",
    U5: "Assessments tab: New assessment, quick-add chips, rows (#n, title, parts, print status, weight, points/Uncapped, submissions, 0% warning), child “Part n under X” rows, ↑/↓ reorder, Edit, Delete (confirm), result print preview, “No assessment” empty state.",
    U6: "Assessment dialog: title, “Split into sub-assessments” switch → Expanded/Total print mode + part rows (title, obtainable, weight, add/remove, totals); else obtainable (blank = uncapped) + weight; Show on result switch; live warnings.",
    U7: "Score entry tab: numbered students (dir=auto), one input per weighted item with “/ max” or Uncapped, red when over max, running total, 600 ms autosave indicator (Saving… / Saved / error for non-numbers). Header text is localized English.",
    U8: "Split primary “Record submission” (Classroom) + chevron menu Full / Classroom / Subject → toast “Opens assessment recording (… scope) in a new tab”.",
    P1: "Outstanding ₦ in the rail; page line: Billed, Received, N outstanding / N settled; collection bar with % collected · x/y paid.",
    P2: "Charges table sorted by outstanding: student, fee · stream, status badge, outstanding + “paid ₦x” (or Paid ₦x), Record (prefilled). Empty “No student charges”; skeleton while loading.",
    P3: "Primary “Receive payment” → drill-in: pick student (shows their open charges), amount, method, date, reference; Save updates totals, statuses and the rail.",
    R1: "Performance page: “Coming soon” empty state; rail metric says Coming soon. Class average will live here.",
    X1: "Teacher: no Edit/Remove/Delete in row or drill menus, bulk bar shows only Export + Assistant, no Add student in recorder, no Delete session/subject (Admin-only), no Move class.",
    X2: "Uses product tokens only; bulk bar, chips and P/A/L colours adapt to .dark.",
    X3: "Desktop: fixed min(100%, 60rem) two-column sheet. Phone 390px: rail becomes class row + scrollable section chips; drill-ins are full-screen with back; bulk bar pinned to the bottom. Focus-visible, Esc, arrow keys in menus, dir=auto on names."
  };

  function boot() {
    window.SCW.init({
      id: "02", name: "Section rail",
      tagline: "Sections with live metrics on the left; details open in place, the sheet never widens.",
      coverage: coverage,
      mount: function (host, ctx) {
        H = host; CTX = ctx;
        if (!S) { S = newState(); startLoad(); }
        S.menu = null; S.dialog = null;
        if (!ctx.canManage) S.stack = S.stack.filter(function (it) { return it.kind !== "studentEdit"; });
        if (!host.__railBound) {
          host.__railBound = true;
          host.addEventListener("click", function (e) { if (S) onClick(e); });
          host.addEventListener("input", function (e) { if (S) onInput(e); });
        }
        if (!docBound) { docBound = true; document.addEventListener("keydown", onKey); }
        render();
      },
      reset: function () {
        if (S) { S.timers.forEach(clearTimeout); if (S.saveT) clearTimeout(S.saveT); }
        if (OBS) { OBS.disconnect(); OBS = null; }
        S = null;
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
