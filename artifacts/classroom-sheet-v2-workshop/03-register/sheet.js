/* 03 · Class register — one register of the class (attendance + balances inline), Subjects and Records as the only other views. */
(function () {
  "use strict";
  var SCx = window.SC, IC = window.SCIcons;
  var esc = SCx.esc, money = SCx.money, initials = SCx.initials, fmtDate = SCx.fmtDate, fmtDay = SCx.fmtDay;
  var TODAY = SCx.data.today;
  var ADM = { NEW: "New admission", RETURNING: "Returning", NEEDS_CLASSIFICATION: "Needs classification" };
  var STL = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late" };
  var CH = { PAID: ["Paid", "badge-success"], PART_PAID: ["Part paid", "badge-warning"], PENDING: ["Pending", "badge-neutral"] };
  var S = null, HOST = null, CTX = null, timers = [], observer = null, docBound = false, lastTrigger = null, lastMenu = null;

  function ic(n, s) { return IC.icon(n, s || 16); }
  function spin() { return '<span class="r-spin" aria-hidden="true">' + ic("loader-circle", 14) + "</span>"; }
  function later(ms, fn) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); fn(); }, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function toast(t, d) { if (CTX) CTX.toast(t, d); }
  function plural(n, w, p) { return n + " " + (n === 1 ? w : (p || w + "s")); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function shortId(id) { return String(id).slice(0, 8); }
  function nowHM() { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function addDays(iso, n) { var d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  /* ---------------- state ---------------- */
  function fresh() {
    var tab = "";
    try { tab = (new URLSearchParams(location.search).get("classroomTab") || "").toLowerCase(); } catch (e) { tab = ""; }
    var map = { register: "register", students: "register", subjects: "subjects", records: "records", attendance: "records", payments: "records", performance: "records" };
    return {
      d: SCx.fresh(), classId: "jss1a", view: map[tab] || "register",
      jump: ["attendance", "payments", "performance"].indexOf(tab) >= 0 ? tab : null,
      search: "", sort: "name", filter: "all", cols: { att: true, bal: true, adm: false, guard: false },
      selectMode: false, sel: {}, visible: 20, loadingMore: false,
      booted: false, loading: true, error: false, closed: false, dupCheck: "checking",
      att: null, drawers: [], dialog: null, menu: null, subjAdd: null,
      scores: {}, scoreInd: "idle", scoreTimer: null, moveDest: "",
      pendingFocus: null, seq: 1
    };
  }

  function cls(id) { var k = id || S.classId; return S.d.classrooms.filter(function (c) { return c.id === k; })[0]; }
  function roster() { return S.d.rosters[S.classId]; }
  function charges() { return S.d.charges[S.classId]; }
  function sessions() { return S.d.attendanceSessions[S.classId]; }
  function subjects() { return S.d.subjects[S.classId]; }
  function enrolled() { return roster().filter(function (s) { return s.enrolled; }); }
  function canManage() { return !!(CTX && CTX.canManage); }
  function isAdmin() { return !!(CTX && CTX.isAdmin); }
  function isPhone() { return !!(CTX && CTX.viewport === "phone"); }
  function viewer() { return CTX && CTX.role === "Teacher" ? "Mrs. Okonkwo" : CTX && CTX.role === "Registrar" ? "Mr. Femi Ade" : S.d.viewer.name; }
  function top() { return S.drawers[S.drawers.length - 1] || null; }

  function findStudent(id) {
    var keys = Object.keys(S.d.rosters);
    for (var i = 0; i < keys.length; i++) {
      var s = S.d.rosters[keys[i]].filter(function (x) { return x.id === id; })[0];
      if (s) return { s: s, classId: keys[i] };
    }
    return null;
  }
  function chargesOf(id) {
    var out = [];
    Object.keys(S.d.charges).forEach(function (k) { out = out.concat(S.d.charges[k].filter(function (c) { return c.studentId === id; })); });
    return out;
  }
  function balanceOf(id) {
    var cs = chargesOf(id);
    return { has: cs.length > 0, out: cs.reduce(function (a, c) { return a + c.outstanding; }, 0), paid: cs.reduce(function (a, c) { return a + c.amountPaid; }, 0) };
  }
  function todaySession() { var l = sessions().filter(function (s) { return s.date === TODAY; }); return l[l.length - 1] || null; }
  function statusIn(sess, id) { if (!sess) return null; var r = sess.records.filter(function (x) { return x.studentId === id; })[0]; return r ? r.status : null; }
  function sessStats(s) {
    var p = 0, l = 0, a = 0;
    s.records.forEach(function (r) { if (r.status === "PRESENT") p++; else if (r.status === "LATE") l++; else if (r.status === "ABSENT") a++; });
    var n = s.records.length;
    return { n: n, p: p, l: l, a: a, rate: n ? Math.round((p + l) / n * 100) : 0 };
  }
  function dupGroups() {
    var r = roster();
    return (S.d.duplicates[S.classId] || []).filter(function (g) { return g.members.every(function (m) { return r.some(function (s) { return s.id === m.id; }); }); });
  }
  function setStatus(c) { c.status = c.outstanding <= 0 ? "PAID" : c.amountPaid > 0 ? "PART_PAID" : "PENDING"; }
  function applyPayment(sid, amount) {
    var left = amount;
    chargesOf(sid).forEach(function (c) { if (left <= 0 || c.outstanding <= 0) return; var p = Math.min(left, c.outstanding); c.amountPaid += p; c.outstanding -= p; left -= p; setStatus(c); });
  }

  function filteredRoster() {
    var list = roster().slice();
    if (S.att) list = list.filter(function (s) { return s.enrolled; });
    else {
      if (S.filter === "owing") list = list.filter(function (s) { return balanceOf(s.id).out > 0; });
      if (S.filter === "today") { var ts = todaySession(); if (ts) list = list.filter(function (s) { var st = statusIn(ts, s.id); return st === "ABSENT" || st === "LATE"; }); }
      var q = S.search.trim().toLowerCase();
      if (q) list = list.filter(function (s) { return (s.studentName + " " + s.otherName).toLowerCase().indexOf(q) >= 0 || s.id.toLowerCase().indexOf(q) >= 0; });
    }
    var by = {
      name: function (a, b) { return a.studentName.localeCompare(b.studentName); },
      gender: function (a, b) { return a.gender.localeCompare(b.gender) || a.studentName.localeCompare(b.studentName); },
      dob: function (a, b) { return a.dob.localeCompare(b.dob); },
      created: function (a, b) { return b.createdAt.localeCompare(a.createdAt); }
    };
    return list.sort(S.att ? by.name : by[S.sort]);
  }

  /* ---------------- CSV ---------------- */
  function download(name, rows) {
    var csv = rows.map(function (r) { return r.map(function (v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(","); }).join("\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function exportStudents(list, label) {
    var c = cls();
    download(slug(c.displayName) + "-students.csv", [["Student ID", "Student", "Class", "Gender", "Status", "Guardian", "Phone"]].concat(list.map(function (s) {
      return [s.id, s.studentName, c.displayName, s.gender, s.enrolled ? "Enrolled" : "Not enrolled", s.guardian, s.guardianPhone];
    })));
    toast("CSV exported", plural(list.length, "student") + " · " + label);
  }
  function exportAttendance() {
    var rows = [["Date", "Session", "Type", "Subject", "Period", "Taken by", "Student ID", "Student", "Status", "Remarks"]];
    sessions().forEach(function (s) {
      s.records.forEach(function (r) { var f = findStudent(r.studentId); rows.push([s.date, s.title, s.type, s.subject || "", s.period || "", s.takenBy, r.studentId, f ? f.s.studentName : "", STL[r.status], r.remarks || ""]); });
    });
    download(slug(cls().displayName) + "-attendance.csv", rows);
    toast("CSV exported", plural(sessions().length, "session") + " · " + plural(rows.length - 1, "record"));
  }

  /* ---------------- render plumbing ---------------- */
  function snapshot() {
    var o = { scroll: {} }, ae = document.activeElement;
    if (ae && HOST.contains(ae) && ae.id) { o.id = ae.id; try { o.ss = ae.selectionStart; o.se = ae.selectionEnd; } catch (e) { o.ss = null; } }
    HOST.querySelectorAll("[data-scroll]").forEach(function (el) { o.scroll[el.dataset.scroll] = el.scrollTop; });
    return o;
  }
  function restore(o) {
    HOST.querySelectorAll("[data-scroll]").forEach(function (el) { var v = o.scroll[el.dataset.scroll]; if (v != null) el.scrollTop = v; });
    if (o.id) {
      var el = document.getElementById(o.id);
      if (el && HOST.contains(el)) { el.focus({ preventScroll: true }); try { if (o.ss != null) el.setSelectionRange(o.ss, o.se); } catch (e) { /* not a text field */ } }
    }
  }
  function render() {
    if (!HOST || !S) return;
    var o = snapshot();
    HOST.innerHTML = sheetHtml();
    restore(o);
    afterRender();
  }
  function afterRender() {
    if (observer) { observer.disconnect(); observer = null; }
    var sen = HOST.querySelector("#r-sentinel");
    if (sen && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(function (ents) {
        if (ents.some(function (x) { return x.isIntersecting; }) && !S.loadingMore) {
          S.loadingMore = true;
          later(450, function () { S.loadingMore = false; S.visible += 20; render(); });
        }
      }, { root: HOST.querySelector("#r-body") });
      observer.observe(sen);
    }
    if (S.pendingFocus) {
      var sel = S.pendingFocus; S.pendingFocus = null;
      try { var el = HOST.querySelector(sel); if (el) el.focus(); } catch (e) { /* stale selector */ }
    }
    if (S.jump && S.view === "records" && !S.loading) {
      var j = HOST.querySelector("#rec-" + S.jump); S.jump = null;
      if (j) j.scrollIntoView({ block: "start" });
    }
  }
  function selFor(el) {
    if (!el) return null;
    if (el.id) return "#" + CSS.escape(el.id);
    if (!/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName)) { var inner = el.querySelector("button[id]"); if (inner) return "#" + CSS.escape(inner.id); }
    var a = el.dataset.act; if (!a) return null;
    return '[data-act="' + a + '"]' + (el.dataset.id ? '[data-id="' + el.dataset.id + '"]' : "");
  }
  function syncUrl() { try { var u = new URL(location.href); u.searchParams.set("classroomTab", S.view); history.replaceState(null, "", u); } catch (e) { /* file:// may refuse */ } }

  /* ---------------- sheet ---------------- */
  function sheetHtml() {
    return '<div class="r-sheet" data-vp="' + (isPhone() ? "phone" : "desktop") + '">' + headHtml() +
      '<div class="r-body' + (S.selectMode && S.view === "register" && !S.att ? " has-bulk" : "") + '" id="r-body" data-scroll="body-' + S.view + '">' + bodyHtml() + "</div>" +
      bulkHtml() + drawerHtml() + dialogHtml() + menuHtml() + "</div>";
  }

  function headHtml() {
    var c = cls();
    var views = [["register", "Register"], ["subjects", "Subjects"], ["records", "Records"]];
    return '<header class="r-head">' +
      '<div class="r-head-row"><button type="button" class="r-switch" id="r-switch" data-act="menu" data-menu="classes" aria-haspopup="menu" aria-expanded="' + (S.menu && S.menu.kind === "classes") + '" aria-label="Switch classroom, current ' + esc(c.displayName) + '">' +
      '<span class="r-title" dir="auto">' + esc(c.displayName) + "</span>" + ic("chevron-down", 20) + "</button>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm r-close" data-act="close-sheet" aria-label="Close sheet">' + ic("x") + "</button></div>" +
      '<p class="r-ctx">' + esc(S.d.session.term.title) + " · " + esc(S.d.session.title) + "</p>" +
      '<div class="r-seg" role="tablist" aria-label="Classroom views">' + views.map(function (v) {
        return '<button type="button" role="tab" id="seg-' + v[0] + '" aria-selected="' + (S.view === v[0]) + '" data-act="view" data-v="' + v[0] + '">' + v[1] +
          (v[0] === "register" && S.att ? '<span class="r-segdot" aria-label="attendance in progress"></span>' : "") + "</button>";
      }).join("") + "</div></header>";
  }

  function bodyHtml() {
    if (S.error) return '<div class="r-empty r-err" role="alert">' + ic("triangle-alert", 24) + "<b>Couldn’t load " + esc(cls().displayName) + "</b><p>The class sheet didn’t load. Check your connection and try again.</p>" +
      '<button type="button" class="btn btn-outline btn-sm" data-act="retry">' + ic("refresh-cw") + "Try again</button></div>";
    if (S.loading) return skeletonHtml();
    if (S.view === "subjects") return subjectsHtml();
    if (S.view === "records") return recordsHtml();
    return registerHtml();
  }

  function skeletonHtml() {
    var rows = "";
    for (var i = 0; i < 8; i++) rows += '<div class="r-skrow"><div class="skeleton r-skav"></div><div class="r-skcol"><div class="skeleton" style="height:12px;width:' + (38 + (i * 7) % 25) + '%"></div><div class="skeleton" style="height:10px;width:24%"></div></div><div class="skeleton" style="height:12px;width:64px"></div></div>';
    return '<div class="r-skel" aria-busy="true" aria-label="Loading class"><div class="r-skbar"><div class="skeleton" style="height:36px;flex:1"></div><div class="skeleton" style="height:36px;width:110px"></div></div><div class="skeleton" style="height:30px;width:70%;margin:6px 0 14px"></div>' + rows + "</div>";
  }

  /* ---------------- register ---------------- */
  function registerHtml() {
    var html = S.att ? attBarHtml() : toolbarHtml() + stripHtml() + dupNoticeHtml();
    var all = roster();
    if (!all.length) {
      if (S.att) return html + '<div class="r-empty">' + ic("clipboard-list", 24) + "<b>No students enrolled in this class for the active term</b><p>Add students to take attendance.</p>" + (canManage() ? '<button type="button" class="btn btn-default btn-sm" data-act="new-student">' + ic("user-plus") + "Add student</button>" : "") + "</div>";
      return html + '<div class="r-empty">' + ic("users", 24) + "<b>No students</b><p>" + esc(cls().displayName) + " has no students for " + esc(S.d.session.term.title) + ".</p>" +
        (canManage() ? '<button type="button" class="btn btn-default btn-sm" data-act="new-student">' + ic("user-plus") + "Enroll student</button>" : "") + "</div>";
    }
    var list = filteredRoster();
    if (!list.length) {
      if (S.att) return html + '<div class="r-empty">' + ic("clipboard-list", 24) + "<b>No students enrolled in this class for the active term</b></div>";
      return html + '<div class="r-empty">' + ic("search", 24) + "<b>No results</b><p>No student matches " + (S.search ? "“" + esc(S.search) + "”" : "this filter") + ".</p>" +
        '<button type="button" class="btn btn-outline btn-sm" data-act="clear-filters">Clear filters</button></div>';
    }
    html += listHtml(list);
    if (S.att) { var out = all.length - enrolled().length; if (out) html += '<p class="r-foot">' + plural(out, "student") + " not enrolled this term " + (out === 1 ? "is" : "are") + " hidden while taking attendance.</p>"; }
    return html;
  }

  function toolbarHtml() {
    return '<div class="r-toolbar">' +
      '<label class="input-group r-search"><span class="input-addon">' + ic("search") + '</span><span class="sr-only">Search students</span><input class="input" id="r-search" type="search" placeholder="Search name or ID" autocomplete="off" data-in="search" value="' + esc(S.search) + '"></label>' +
      '<button type="button" class="btn btn-outline btn-sm" id="r-show" data-act="menu" data-menu="show" aria-haspopup="menu" aria-label="Show columns">' + ic("columns-3") + '<span class="r-lbl">Show</span></button>' +
      '<button type="button" class="btn btn-outline btn-sm" id="r-sort" data-act="menu" data-menu="sort" aria-haspopup="menu" aria-label="Sort">' + ic("arrow-up-down") + '<span class="r-lbl">Sort</span></button>' +
      '<span class="r-spacer"></span>' +
      (canManage() ? '<button type="button" class="btn btn-default btn-sm" data-act="new-student">' + ic("user-plus") + '<span>Add student</span></button>' : "") +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" id="r-more" data-act="menu" data-menu="more" aria-haspopup="menu" aria-label="More register actions">' + ic("ellipsis") + "</button></div>";
  }

  function stripHtml() {
    var r = roster(), ts = todaySession(), owing = 0, total = 0, f = S.filter;
    r.forEach(function (s) { var b = balanceOf(s.id); if (b.out > 0) { owing++; total += b.out; } });
    var today;
    if (ts) {
      var st = sessStats(ts), off = st.a + st.l, bits = [st.p + " present"];
      if (st.a) bits.push(st.a + " absent"); if (st.l) bits.push(st.l + " late");
      today = '<button type="button" class="r-num" data-act="filter" data-f="today" aria-pressed="' + (f === "today") + '"' + (off ? "" : " disabled") + ' title="' + (off ? "Show students absent or late today" : "Everyone was present") + '"><span class="r-numlbl">Today</span><span class="tnum">' + bits.join(" · ") + "</span></button>";
    } else today = '<span class="r-num is-static"><span class="r-numlbl">Today</span><span>not taken</span></span>';
    return '<div class="r-strip" role="group" aria-label="Register summary — click a number to filter">' +
      '<button type="button" class="r-num" data-act="filter" data-f="all" aria-pressed="' + (f === "all") + '"><b class="tnum">' + r.length + "</b><span>" + (r.length === 1 ? "student" : "students") + "</span></button>" + today +
      '<button type="button" class="r-num is-money" data-act="filter" data-f="owing" aria-pressed="' + (f === "owing") + '"' + (owing ? "" : " disabled") + '><b class="tnum">' + money(total) + '</b><span>outstanding <span class="tnum">(' + owing + ")</span></span></button>" +
      '<span class="r-spacer"></span><button type="button" class="btn btn-outline btn-sm r-take" data-act="att-start">' + ic("clipboard-check") + "<span>Take attendance</span></button></div>";
  }

  function dupNoticeHtml() {
    if (S.dupCheck === "checking") return '<p class="r-checking" role="status">' + spin() + "Checking student count and duplicate names…</p>";
    var g = dupGroups();
    if (!g.length) return "";
    if (g.length === 1) return '<div class="r-dupline" role="status">' + ic("triangle-alert") + '<span><b dir="auto">' + esc(g[0].displayName) + "</b> appears " + g[0].records + " times in this class.</span>" +
      '<button type="button" class="btn-link" data-act="merge" data-g="' + g[0].key + '">Review merge</button></div>';
    return '<div class="r-dupline" role="status">' + ic("triangle-alert") + "<span>" + g.length + " possible duplicate names.</span>" + '<button type="button" class="btn-link" data-act="dups">Review</button></div>';
  }

  function gridCols() {
    var c = ["minmax(0,1fr)"];
    if (S.att) return c.concat(["auto"]).join(" ");
    if (S.cols.att) c.push("6.75rem");
    if (S.cols.adm) c.push("10rem");
    if (S.cols.guard) c.push("9.5rem");
    if (S.cols.bal) c.push("8.75rem");
    c.push("2rem");
    return c.join(" ");
  }

  function listHtml(list) {
    var ts = todaySession(), shown = list.slice(0, S.visible);
    var h = '<div class="r-list' + (S.att ? " is-att" : "") + '" style="--r-cols:' + gridCols() + '">' + headRow(list) +
      shown.map(function (s, i) { return rowHtml(s, i, ts); }).join("") + "</div>";
    if (list.length > shown.length) h += '<div class="r-more" id="r-sentinel" role="status">' + spin() + "Loading more students…</div>";
    return h;
  }

  function headRow(list) {
    if (isPhone()) return "";
    var a = S.att, allSel = list.length && list.every(function (s) { return S.sel[s.id]; });
    var h = '<div class="r-row r-lhead"><div class="r-person">' + (S.selectMode && !a ? '<input type="checkbox" class="checkbox" id="r-selall" data-act="sel-all" aria-label="Select all students" ' + (allSel ? "checked" : "") + ">" : "") + "<span>Student</span></div><div class=\"r-cells\">";
    if (a) h += '<div class="r-cell r-today">Mark</div>';
    else {
      if (S.cols.att) h += '<div class="r-cell r-today">Today</div>';
      if (S.cols.adm) h += '<div class="r-cell">Admission</div>';
      if (S.cols.guard) h += '<div class="r-cell">Guardian</div>';
      if (S.cols.bal) h += '<div class="r-cell r-bal">Balance</div>';
    }
    return h + "</div>" + (a ? "" : "<span></span>") + "</div>";
  }

  function balCell(s, b) {
    if (!b.has) return '<span class="r-none" title="No charges this term">—</span>';
    if (b.out > 0) return '<span class="r-chiplabel">Owes</span><span class="r-owe tnum">' + money(b.out) + '</span><button type="button" class="btn-link r-reclink" data-act="pay" data-id="' + s.id + '">Record</button>';
    return '<span class="r-paid">' + ic("check", 14) + "Paid</span>";
  }

  function rowHtml(s, i, ts) {
    var a = S.att, sel = !!S.sel[s.id], b = balanceOf(s.id);
    var st = a ? (a.marks[s.id] || null) : statusIn(ts, s.id);
    var cells = "";
    if (a) {
      cells = '<div class="r-cell r-today"><div class="r-pal" role="group" aria-label="Attendance for ' + esc(s.studentName) + '">' + ["PRESENT", "ABSENT", "LATE"].map(function (k) {
        return '<button type="button" class="r-pill r-pill-' + k.toLowerCase() + '" id="pal-' + s.id + "-" + k[0] + '" data-act="mark" data-id="' + s.id + '" data-st="' + k + '" aria-pressed="' + (st === k) + '" title="' + STL[k] + (st === k ? " — tap again to clear" : "") + '"><span aria-hidden="true">' + k[0] + '</span><span class="sr-only">' + STL[k] + "</span></button>";
      }).join("") + "</div></div>";
    } else {
      if (S.cols.att) cells += '<div class="r-cell r-today' + (st ? "" : " is-empty") + '"><span class="r-chiplabel">Today</span>' + (st ? '<span class="r-dot r-dot-' + st.toLowerCase() + '">' + STL[st] + "</span>" : '<span class="r-none" title="' + (ts ? "Not marked in today’s session" : "Attendance not taken today") + '">—</span>') + "</div>";
      if (S.cols.adm) cells += '<div class="r-cell r-adm"><span class="badge ' + (s.admissionStatus === "NEEDS_CLASSIFICATION" ? "badge-warning" : s.admissionStatus === "NEW" ? "badge-info" : "badge-neutral") + '">' + ADM[s.admissionStatus] + "</span></div>";
      if (S.cols.guard) cells += '<div class="r-cell r-guard"><span dir="auto">' + esc(s.guardian || "—") + '</span><small class="tnum">' + esc(s.guardianPhone || "No phone") + "</small></div>";
      if (S.cols.bal) cells += '<div class="r-cell r-bal' + (b.has ? "" : " is-empty") + '">' + balCell(s, b) + "</div>";
    }
    var sub = '<span class="mono">' + esc(shortId(s.id)) + "</span><span>" + esc(s.gender) + "</span>";
    if (!S.cols.adm || a) sub += '<span class="' + (s.admissionStatus === "NEEDS_CLASSIFICATION" ? "r-warn" : "") + '">' + ADM[s.admissionStatus] + "</span>";
    if (!s.enrolled) sub += '<span class="badge badge-neutral">Not enrolled</span>';
    var remark = "";
    if (a && (st === "ABSENT" || st === "LATE")) remark = '<div class="r-remark"><label class="sr-only" for="rmk-' + s.id + '">Remark for ' + esc(s.studentName) + '</label><input class="input" id="rmk-' + s.id + '" data-in="remark" data-id="' + s.id + '" placeholder="' + (st === "ABSENT" ? "Reason for absence" : "Reason for lateness") + ' (optional)" value="' + esc(a.remarks[s.id] || "") + '"></div>';
    return '<div class="r-row' + (st && a ? " is-" + st.toLowerCase() : "") + (sel ? " is-selected" : "") + (!s.enrolled ? " is-out" : "") + '"' + (a ? "" : ' data-act="row" data-id="' + s.id + '"') + ">" +
      '<div class="r-person">' +
      (S.selectMode && !a ? '<input type="checkbox" class="checkbox" id="sel-' + s.id + '" data-act="sel" data-id="' + s.id + '" aria-label="Select ' + esc(s.studentName) + '" ' + (sel ? "checked" : "") + ">" : "") +
      (a ? '<span class="r-no tnum">' + (i + 1) + "</span>" : "") +
      '<span class="avatar" aria-hidden="true">' + esc(initials(s.studentName)) + '</span><div class="r-pmain">' +
      (a ? '<span class="r-name" dir="auto">' + esc(s.studentName) + "</span>" : '<button type="button" class="r-name" id="nm-' + s.id + '" data-act="open-student" data-id="' + s.id + '" dir="auto">' + esc(s.studentName) + "</button>") +
      '<div class="r-sub">' + sub + "</div></div></div>" +
      '<div class="r-cells">' + cells + "</div>" +
      (a ? "" : '<button type="button" class="btn btn-ghost btn-icon btn-sm r-rmenu" id="rm-' + s.id + '" data-act="menu" data-menu="row" data-id="' + s.id + '" aria-haspopup="menu" aria-label="Actions for ' + esc(s.studentName) + '">' + ic("ellipsis") + "</button>") +
      remark + "</div>";
  }

  /* ---------------- attendance mode ---------------- */
  function newAtt() { return { type: "GENERAL", title: "Daily attendance", subject: "", period: "", date: TODAY, marks: {}, remarks: {}, error: null, saving: false, correctId: null }; }
  function markedCount() { var a = S.att; return enrolled().filter(function (s) { return a.marks[s.id]; }).length; }

  function attBarHtml() {
    var a = S.att, total = enrolled().length, m = markedCount(), orig = a.correctId ? sessions().filter(function (x) { return x.id === a.correctId; })[0] : null;
    var pct = total ? Math.round(m / total * 100) : 0;
    return '<div class="r-attbar" role="region" aria-label="Attendance recorder">' +
      (orig ? '<div class="r-attcorr">' + ic("history", 14) + "<span>Correcting <b>" + esc(orig.title) + "</b> · " + esc(fmtDay(orig.date)) + "</span></div>" : "") +
      '<div class="r-attrow">' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="att-cancel" aria-label="' + (orig ? "Cancel correction" : "Exit attendance") + '">' + ic("x") + "</button>" +
      '<button type="button" class="r-atttitle" id="att-settings" data-act="menu" data-menu="att-settings" aria-haspopup="dialog" title="Session settings"><span dir="auto">' + esc(a.title || "Untitled session") + "</span>" + (a.period ? '<small>' + esc(a.period) + "</small>" : "") + ic("chevron-down", 14) + "</button>" +
      '<div class="r-date"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="att-day" data-d="-1" aria-label="Previous day">' + ic("chevron-left") + "</button>" +
      '<button type="button" class="r-datebtn" data-act="att-cal" aria-label="Choose date, ' + esc(fmtDay(a.date)) + '">' + ic("calendar", 14) + "<span>" + esc(fmtDay(a.date)) + "</span></button>" +
      '<input type="date" class="r-datehidden" id="att-date" tabindex="-1" aria-hidden="true" max="' + TODAY + '" data-in="att" data-f="date" data-rr value="' + a.date + '">' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="att-day" data-d="1" aria-label="Next day"' + (a.date >= TODAY ? " disabled" : "") + ">" + ic("chevron-right") + "</button></div>" +
      '<span class="r-spacer"></span>' +
      '<span class="r-progress tnum" aria-live="polite"><b>' + m + "</b>/" + total + " marked</span>" +
      '<button type="button" class="btn btn-outline btn-sm" id="att-rest" data-act="menu" data-menu="att-rest" aria-haspopup="menu">Mark rest' + ic("chevron-down", 14) + "</button>" +
      '<button type="button" class="btn btn-default btn-sm" data-act="att-save"' + (a.saving ? " disabled" : "") + ">" + (a.saving ? spin() + "Saving…" : ic("save") + (orig ? "Save correction" : "Save")) + "</button></div>" +
      '<div class="r-attprog" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
      (a.error ? '<p class="field-error r-atterr" role="alert">' + esc(a.error) + "</p>" : "") + "</div>";
  }

  function startAttendance() {
    S.att = newAtt(); S.filter = "all"; S.search = ""; S.selectMode = false; S.sel = {}; S.view = "register"; S.visible = 60; S.drawers = [];
    S.pendingFocus = "#att-settings"; syncUrl();
  }
  function exitAttendance() {
    var cid = S.att && S.att.correctId; S.att = null; S.visible = 20;
    if (cid) { S.view = "records"; S.drawers = [{ kind: "session", id: cid, back: null }]; S.pendingFocus = "#dr-title"; syncUrl(); }
  }
  function saveAttendance() {
    var a = S.att, total = enrolled().length, m = markedCount();
    if (!m) { a.error = "Mark at least one student before saving — partial registers are fine."; render(); return; }
    a.error = null; a.saving = true; render();
    later(500, function () {
      if (S.att !== a) return;
      var records = enrolled().filter(function (s) { return a.marks[s.id]; }).map(function (s) {
        var st = a.marks[s.id]; return { studentId: s.id, status: st, remarks: st === "PRESENT" ? "" : (a.remarks[s.id] || "") };
      });
      if (a.correctId) {
        var s = sessions().filter(function (x) { return x.id === a.correctId; })[0];
        if (s) {
          var changes = 0, before = {};
          s.records.forEach(function (r) { before[r.studentId] = r.status + "|" + (r.remarks || ""); });
          records.forEach(function (r) { if (before[r.studentId] !== r.status + "|" + (r.remarks || "")) changes++; });
          changes += s.records.filter(function (r) { return !records.some(function (x) { return x.studentId === r.studentId; }); }).length;
          s.records = records; s.title = a.title || s.title; s.type = a.type; s.subject = a.type === "SUBJECT" ? a.subject : null; s.period = a.period; s.date = a.date;
          s.history.push({ action: "Corrected", actor: viewer(), at: TODAY + " " + nowHM(), summary: changes ? plural(changes, "student") + " changed" : "Details updated, no marks changed" });
          toast("Correction saved", s.title + " · " + fmtDay(s.date));
        }
        exitAttendance();
      } else {
        var sess = { id: S.classId + "-att-n" + (S.seq++), title: a.title || "Daily attendance", type: a.type, subject: a.type === "SUBJECT" ? a.subject : null, period: a.period, date: a.date, takenBy: viewer(), records: records,
          history: [{ action: "Created", actor: viewer(), at: a.date + " " + nowHM(), summary: plural(records.length, "student") + " marked" }] };
        sessions().push(sess);
        S.att = null; S.visible = 20;
        toast("Attendance saved", m + " of " + total + " marked · " + sess.title + ", " + fmtDay(sess.date));
      }
      render();
    });
  }

  /* ---------------- bulk bar ---------------- */
  function selIds() { return Object.keys(S.sel).filter(function (k) { return S.sel[k] && findStudent(k); }); }
  function bulkHtml() {
    if (!S.selectMode || S.view !== "register" || S.att) return "";
    var n = selIds().length, list = filteredRoster(), dis = n ? "" : " disabled";
    return '<div class="r-bulk" role="region" aria-label="Bulk actions">' +
      '<div class="r-bhead"><span class="r-bcount"><b class="tnum">' + n + "</b> selected</span>" +
      (n < list.length ? '<button type="button" class="btn-link" data-act="sel-all">Select all ' + list.length + "</button>" : "") +
      '<span class="r-spacer"></span><button type="button" class="btn btn-ghost btn-sm" data-act="bulk-clear">Deselect</button></div>' +
      '<div class="r-bacts">' +
      '<button type="button" class="btn btn-outline btn-sm" data-act="bulk-export"' + dis + ">" + ic("download") + "Export</button>" +
      (canManage() ? '<button type="button" class="btn btn-outline btn-sm" data-act="bulk-admission"' + dis + ">" + ic("badge-check") + "Set admission</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-act="bulk-move"' + dis + ">" + ic("move") + "Move class</button>" +
        '<button type="button" class="btn btn-outline btn-sm r-danger" data-act="bulk-remove"' + dis + ">" + ic("user-x") + "Remove from term</button>" : "") +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="assistant" data-bulk="1"' + dis + ">" + ic("sparkles") + "Assistant</button>" +
      "</div></div>";
  }

  /* ---------------- subjects ---------------- */
  function subjStats(sub) {
    var items = 0, subs = 0, grouped = 0, weight = 0;
    sub.assessments.forEach(function (a) {
      weight += +a.weight || 0;
      if (a.children && a.children.length) { grouped++; items += a.children.length; a.children.forEach(function (c) { subs += c.submissions || 0; }); }
      else { items++; subs += a.submissions || 0; }
    });
    return { items: items, subs: subs, weight: weight, grouped: grouped };
  }
  function availableImports() { var have = subjects().map(function (s) { return s.title; }); return S.d.unattachedSubjects.filter(function (t) { return have.indexOf(t) < 0; }); }

  function subjectsHtml() {
    var subs = subjects(), imp = availableImports().length;
    var h = '<div class="r-toolbar"><p class="r-tcount"><b class="tnum">' + subs.length + "</b> " + (subs.length === 1 ? "subject" : "subjects") + ' this term</p><span class="r-spacer"></span>' +
      '<button type="button" class="btn btn-default btn-sm" data-act="subj-add"' + (S.subjAdd ? " disabled" : "") + ">" + ic("plus") + "<span>Add subject</span></button>" +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" id="r-subj-more" data-act="menu" data-menu="subj-more" aria-haspopup="menu" aria-label="More subject actions">' + ic("ellipsis") + "</button></div>";
    if (S.subjAdd) {
      var f = S.subjAdd;
      h += '<form class="r-inline" data-form="subj-add" novalidate><div class="r-inline-fields">' +
        '<div class="field"><label class="label" for="sa-name">Subject name</label><input class="input" id="sa-name" data-in="sa" data-f="name" placeholder="e.g. Basic Technology" value="' + esc(f.name) + '" aria-invalid="' + !!f.error + '"' + (f.error ? ' aria-describedby="sa-err"' : "") + "></div>" +
        '<div class="field"><label class="label" for="sa-desc">Description <span class="field-optional">optional</span></label><input class="input" id="sa-desc" data-in="sa" data-f="desc" value="' + esc(f.desc) + '"></div></div>' +
        (f.error ? '<p class="field-error" id="sa-err" role="alert">' + esc(f.error) + "</p>" : "") +
        '<div class="r-inline-actions"><button type="button" class="btn btn-ghost btn-sm" data-act="subj-add-cancel">Cancel</button><button type="submit" class="btn btn-default btn-sm"' + (f.saving ? " disabled" : "") + ">" + (f.saving ? spin() + "Saving…" : "Save subject") + "</button></div></form>";
    }
    if (!subs.length) {
      return h + (S.subjAdd ? "" : '<div class="r-empty">' + ic("book-open", 24) + "<b>No subjects yet</b><p>Add the subjects taught in " + esc(cls().displayName) + (imp ? ", or import them from the school catalog" : "") + ".</p>" +
        '<div class="r-emptyacts"><button type="button" class="btn btn-default btn-sm" data-act="subj-add">' + ic("plus") + "Add subject</button>" + (imp ? '<button type="button" class="btn btn-outline btn-sm" data-act="import-open">' + ic("download") + "Import from catalog</button>" : "") + "</div></div>");
    }
    h += '<div class="r-list r-plain">' + subs.map(function (s) {
      var st = subjStats(s), n = s.assessments.length, badge;
      if (!n) badge = '<span class="badge badge-neutral">Not set up</span>';
      else if (st.weight === 100) badge = '<span class="badge badge-success">Weights 100%</span>';
      else badge = '<span class="badge badge-warning">Weights ' + st.weight + "%</span>";
      return '<div class="r-subrow" data-act="open-subject" data-id="' + s.id + '"><span class="r-subicon" aria-hidden="true">' + ic("book-open") + "</span>" +
        '<div class="r-pmain"><button type="button" class="r-name" id="sj-' + s.id + '" data-act="open-subject" data-id="' + s.id + '" dir="auto">' + esc(s.title) + '</button><div class="r-sub"><span class="tnum">' + plural(n, "assessment") + "</span>" + (s.description ? '<span dir="auto">' + esc(s.description) + "</span>" : "") + "</div></div>" +
        badge + '<button type="button" class="btn btn-ghost btn-icon btn-sm" id="sjm-' + s.id + '" data-act="menu" data-menu="subj-row" data-id="' + s.id + '" aria-haspopup="menu" aria-label="Actions for ' + esc(s.title) + '">' + ic("ellipsis") + "</button></div>";
    }).join("") + "</div>";
    return h;
  }

  /* ---------------- records ---------------- */
  function recordsHtml() {
    var ss = sessions().slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var recs = 0, att = 0, ab = 0;
    ss.forEach(function (s) { var st = sessStats(s); recs += st.n; att += st.p + st.l; ab += st.a; });
    var pct = function (n) { return recs ? Math.round(n / recs * 100) : 0; };
    var h = '<section class="r-sec" id="rec-attendance" aria-labelledby="rec-att-h"><div class="r-sechead"><h3 id="rec-att-h">Attendance</h3><span class="r-spacer"></span>' +
      '<button type="button" class="btn btn-outline btn-sm" data-act="export-att"' + (ss.length ? "" : " disabled") + ">" + ic("download") + "Export CSV</button></div>";
    if (!ss.length) h += '<div class="r-empty sm">' + ic("calendar-check", 22) + "<b>No attendance records yet</b><p>Take attendance from the Register.</p>" + (roster().length ? '<button type="button" class="btn btn-outline btn-sm" data-act="att-start">' + ic("clipboard-check") + "Take attendance</button>" : "") + "</div>";
    else {
      h += '<p class="r-totals tnum"><b>' + plural(ss.length, "session") + "</b> · " + plural(recs, "record") + " · <b>" + pct(att) + "%</b> attended (" + att + ") · <b>" + pct(ab) + "%</b> absent (" + ab + ")</p>";
      h += '<div class="r-list r-plain">' + ss.map(function (s) {
        var st = sessStats(s);
        return '<div class="r-srow" data-act="open-session" data-id="' + s.id + '"><div class="r-pmain"><button type="button" class="r-name" id="ss-' + s.id + '" data-act="open-session" data-id="' + s.id + '" dir="auto">' + esc(s.title) + "</button>" +
          '<div class="r-sub"><span>' + esc(fmtDay(s.date)) + "</span>" + (s.subject ? "<span>" + esc(s.subject) + "</span>" : "") + (s.period ? "<span>" + esc(s.period) + "</span>" : "") + "<span>" + esc(s.takenBy) + "</span>" + (s.history.length > 1 ? '<span class="r-info">Corrected</span>' : "") + "</div></div>" +
          '<div class="r-scount tnum"><span class="r-p">' + (st.p + st.l) + ' present</span><span class="r-a">' + st.a + " absent</span></div>" +
          '<div class="r-rate"><div class="progress"><span style="width:' + st.rate + '%"></span></div><span class="tnum">' + st.rate + "%</span></div>" +
          (isAdmin() ? '<button type="button" class="btn btn-ghost btn-icon btn-sm r-danger" data-act="del-session" data-id="' + s.id + '" aria-label="Delete ' + esc(s.title) + ", " + esc(fmtDay(s.date)) + '">' + ic("trash-2") + "</button>" : "") +
          '<span class="r-chev" aria-hidden="true">' + ic("chevron-right") + "</span></div>";
      }).join("") + "</div>";
    }
    h += "</section>";

    var ch = charges().slice().sort(function (a, b) { return b.outstanding - a.outstanding || a.studentName.localeCompare(b.studentName); });
    var billed = 0, rec = 0, out = 0, settled = 0;
    ch.forEach(function (c) { billed += c.amount; rec += c.amountPaid; out += c.outstanding; if (c.outstanding <= 0) settled++; });
    h += '<section class="r-sec" id="rec-payments" aria-labelledby="rec-pay-h"><div class="r-sechead"><h3 id="rec-pay-h">Payments</h3><span class="r-spacer"></span>' +
      '<button type="button" class="btn btn-default btn-sm" data-act="pay"' + (ch.some(function (c) { return c.outstanding > 0; }) ? "" : " disabled") + ">" + ic("hand-coins") + "Receive payment</button></div>";
    if (!ch.length) h += '<div class="r-empty sm">' + ic("receipt", 22) + "<b>No student charges</b><p>Fees applied to students in this class will be listed here.</p></div>";
    else {
      h += '<p class="r-totals tnum">Billed <b>' + money(billed) + "</b> · Received <b>" + money(rec) + '</b> · Outstanding <b class="r-owe">' + money(out) + "</b> · <b>" + (billed ? Math.round(rec / billed * 100) : 0) + "%</b> collected — " + settled + "/" + ch.length + " paid, " + (ch.length - settled) + " outstanding</p>";
      h += '<div class="r-list r-plain">' + ch.map(function (c) {
        var lab = CH[c.status];
        return '<div class="r-crow" data-act="open-student" data-id="' + c.studentId + '"><span class="avatar" aria-hidden="true">' + esc(initials(c.studentName)) + "</span>" +
          '<div class="r-pmain"><div class="r-cname"><button type="button" class="r-name" id="cn-' + c.id + '" data-act="open-student" data-id="' + c.studentId + '" dir="auto">' + esc(c.studentName) + '</button><span class="badge ' + lab[1] + '">' + lab[0] + "</span></div>" +
          '<div class="r-sub"><span>' + esc(c.title) + "</span>" + (c.stream ? "<span>" + esc(c.stream) + "</span>" : "") + "</div></div>" +
          '<div class="r-camt tnum">' + (c.outstanding > 0 ? '<b class="r-owe">' + money(c.outstanding) + "</b><small>paid " + money(c.amountPaid) + "</small>" : "<b>" + money(c.amountPaid) + "</b><small>paid in full</small>") + "</div>" +
          (c.outstanding > 0 ? '<button type="button" class="btn btn-outline btn-sm" data-act="pay" data-id="' + c.studentId + '">Record</button>' : '<span class="r-recph" aria-hidden="true"></span>') + "</div>";
      }).join("") + "</div>";
    }
    h += "</section>";
    h += '<section class="r-sec" id="rec-performance" aria-labelledby="rec-perf-h"><div class="r-sechead"><h3 id="rec-perf-h">Performance</h3><span class="badge badge-neutral">Coming soon</span></div>' +
      '<p class="r-totals">Class average and subject results will appear here once term scores are published.</p></section>';
    return h;
  }

  /* ---------------- drawers ---------------- */
  var EYEBROW = { student: "Student", "new": "New student", session: "Attendance session", pay: "Receive payment", subject: "Subject" };
  function openDrawer(dr, replace) {
    dr.back = lastTrigger;
    if (replace) S.drawers = [dr]; else S.drawers.push(dr);
    S.menu = null; S.pendingFocus = "#dr-title";
  }
  function popDrawer() {
    var d = S.drawers.pop();
    if (S.drawers.length) S.pendingFocus = "#dr-title"; else if (d) S.pendingFocus = d.back;
  }
  function closeDrawers() { var b = S.drawers[0] && S.drawers[0].back; S.drawers = []; S.pendingFocus = b; }

  function drawerHtml() {
    var dr = top(); if (!dr) return "";
    var r = drawerContent(dr), phone = isPhone(), stacked = S.drawers.length > 1;
    var backLabel = stacked ? EYEBROW[S.drawers[S.drawers.length - 2].kind] : cls().displayName;
    return (phone ? "" : '<div class="r-scrim" data-act="drawer-close-all" aria-hidden="true"></div>') +
      '<aside class="r-drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title">' +
      '<div class="r-dbar">' + (phone || stacked ? '<button type="button" class="btn btn-ghost btn-sm r-back" data-act="drawer-back">' + ic("arrow-left") + '<span dir="auto">' + esc(backLabel) + "</span></button>" : '<span class="r-eyebrow">' + EYEBROW[dr.kind] + "</span>") +
      '<span class="r-spacer"></span>' + (!phone || stacked ? '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="drawer-close-all" aria-label="Close panel">' + ic("x") + "</button>" : "") + "</div>" +
      '<div class="r-dbody" data-scroll="dr-' + dr.kind + "-" + (dr.id || "") + "-" + (dr.tab || "") + '">' + r.body + "</div>" +
      (r.foot ? '<div class="r-dfoot">' + r.foot + "</div>" : "") + "</aside>";
  }
  function drawerContent(dr) {
    if (dr.kind === "student") return studentDrawer(dr);
    if (dr.kind === "new") return newDrawer(dr);
    if (dr.kind === "session") return sessionDrawer(dr);
    if (dr.kind === "pay") return payDrawer(dr);
    if (dr.kind === "subject") return subjectDrawer(dr);
    return { body: "" };
  }
  function notFound(t, d) { return '<div class="r-empty">' + ic("circle-alert", 24) + '<h2 class="r-dh" id="dr-title" tabindex="-1">' + esc(t) + "</h2><p>" + esc(d) + "</p></div>"; }
  function tabsHtml(act, cur, tabs, label) {
    return '<div class="tabs-list r-dtabs" role="tablist" aria-label="' + label + '">' + tabs.map(function (t) {
      return '<button type="button" role="tab" class="tabs-trigger" id="' + act + "-" + t[0] + '" aria-selected="' + (cur === t[0]) + '" data-act="' + act + '" data-t="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";
  }

  function studentDrawer(dr) {
    var f = findStudent(dr.id);
    if (!f) return { body: notFound("Student not found", "This student was removed or merged into another record.") };
    var s = f.s, c = cls(f.classId), b = balanceOf(s.id);
    var h = '<div class="r-dprofile"><span class="avatar r-avlg" aria-hidden="true">' + esc(initials(s.studentName)) + '</span><div class="r-pmain"><h2 class="r-dh" id="dr-title" tabindex="-1" dir="auto">' + esc(s.studentName) + (s.otherName ? ' <span class="r-other" dir="auto">' + esc(s.otherName) + "</span>" : "") + "</h2>" +
      '<p class="r-dsub"><span dir="auto">' + esc(c.displayName) + "</span> · " + esc(s.gender) + (s.enrolled ? "" : " · Not enrolled") + "</p></div></div>" +
      '<div class="r-dactions"><button type="button" class="btn btn-outline btn-sm" data-act="report-card" data-id="' + s.id + '">' + ic("file-text") + "Report card</button>" +
      (canManage() ? '<button type="button" class="btn btn-outline btn-sm" data-act="edit-student" data-id="' + s.id + '">' + ic("pencil") + "Edit</button>" : "") +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" id="drm-' + s.id + '" data-act="menu" data-menu="row" data-id="' + s.id + '" aria-haspopup="menu" aria-label="More actions for ' + esc(s.studentName) + '">' + ic("ellipsis") + "</button></div>" +
      tabsHtml("st-tab", dr.tab, [["overview", "Overview"], ["academics", "Academics"], ["attendance", "Attendance"], ["payments", "Payments"]], "Student sections");
    var body = "";
    if (dr.tab === "overview") {
      var others = S.d.classrooms.filter(function (x) { return x.id !== f.classId; });
      body = '<dl class="r-dl">' +
        '<div><dt>Student ID</dt><dd><span class="mono">' + esc(shortId(s.id)) + '</span><small class="mono">' + esc(s.id) + "</small></dd></div>" +
        '<div><dt>Current class</dt><dd dir="auto">' + esc(c.displayName) + "</dd></div>" +
        "<div><dt>Current term</dt><dd>" + esc(S.d.session.term.title) + " · " + esc(S.d.session.title) + (s.enrolled ? "" : ' <span class="badge badge-neutral">Not enrolled</span>') + "</dd></div>" +
        "<div><dt>Gender</dt><dd>" + esc(s.gender) + "</dd></div>" +
        "<div><dt>Date of birth</dt><dd>" + (s.dob ? esc(fmtDate(s.dob)) : "—") + "</dd></div>" +
        "<div><dt>Admission</dt><dd>" + ADM[s.admissionStatus] + "</dd></div>" +
        '<div><dt>Guardian</dt><dd><span dir="auto">' + esc(s.guardian || "—") + '</span><small class="tnum">' + esc(s.guardianPhone || "No phone") + "</small></dd></div>" +
        '<div><dt>Balance</dt><dd class="tnum">' + (!b.has ? "No charges" : b.out > 0 ? '<span class="r-owe">' + money(b.out) + " outstanding</span>" : "Paid") + "</dd></div></dl>";
      if (canManage()) body += '<div class="r-move"><label class="label" for="mv-sel">Move to another class</label><div class="r-moverow"><select class="select" id="mv-sel" data-in="mv-dest"><option value="">Choose class…</option>' +
        others.map(function (x) { return '<option value="' + x.id + '"' + (S.moveDest === x.id ? " selected" : "") + ">" + esc(x.displayName) + "</option>"; }).join("") +
        '</select><button type="button" class="btn btn-outline btn-sm" data-act="move-one" data-id="' + s.id + '">Move</button></div></div>';
    } else if (dr.tab === "academics") {
      var subs = S.d.subjects[f.classId] || [];
      body = subs.length ? '<ul class="r-mini">' + subs.map(function (sb) {
        var sc = (S.scores[sb.id] || {})[s.id] || {}, keys = Object.keys(sc).filter(function (k) { return sc[k] !== "" && !isNaN(+sc[k]); });
        var tot = keys.reduce(function (t, k) { return t + Number(sc[k]); }, 0);
        return '<li><span dir="auto">' + esc(sb.title) + '</span><span class="r-sub tnum">' + (keys.length ? tot + " pts · " + plural(keys.length, "score") : "No scores yet") + "</span></li>";
      }).join("") + "</ul>" : '<p class="r-muted">No subjects set up for this class yet.</p>';
    } else if (dr.tab === "attendance") {
      var recs = [];
      (S.d.attendanceSessions[f.classId] || []).forEach(function (se) { se.records.forEach(function (r) { if (r.studentId === s.id) recs.push({ s: se, r: r }); }); });
      recs.sort(function (x, y) { return y.s.date.localeCompare(x.s.date); });
      var cnt = { PRESENT: 0, LATE: 0, ABSENT: 0 }; recs.forEach(function (x) { cnt[x.r.status]++; });
      body = recs.length ? '<p class="r-totals tnum">' + plural(recs.length, "session") + " · " + cnt.PRESENT + " present · " + cnt.LATE + " late · " + cnt.ABSENT + " absent</p>" +
        '<ul class="r-mini">' + recs.map(function (x) { return "<li><span>" + esc(fmtDay(x.s.date)) + ' <span class="r-sub" dir="auto">' + esc(x.s.title) + '</span></span><span class="r-mini-r"><span class="r-dot r-dot-' + x.r.status.toLowerCase() + '">' + STL[x.r.status] + "</span>" + (x.r.remarks ? '<small dir="auto">' + esc(x.r.remarks) + "</small>" : "") + "</span></li>"; }).join("") + "</ul>"
        : '<p class="r-muted">No attendance recorded for this student this term.</p>';
    } else {
      var cs = chargesOf(s.id);
      body = cs.length ? '<p class="r-totals tnum">' + (b.out > 0 ? '<b class="r-owe">' + money(b.out) + "</b> outstanding · " : "") + money(b.paid) + " received</p>" +
        '<ul class="r-mini">' + cs.map(function (c2) { var l = CH[c2.status]; return '<li><span>' + esc(c2.title) + ' <span class="badge ' + l[1] + '">' + l[0] + '</span></span><span class="tnum r-mini-r"><b>' + money(c2.amount) + "</b><small>paid " + money(c2.amountPaid) + "</small></span></li>"; }).join("") + "</ul>" +
        (b.out > 0 ? '<button type="button" class="btn btn-default btn-sm" data-act="pay" data-id="' + s.id + '">' + ic("hand-coins") + "Record payment</button>" : "")
        : '<p class="r-muted">No charges for this student this term.</p>';
    }
    return { body: h + '<div class="r-dpanel" role="tabpanel" aria-labelledby="st-tab-' + dr.tab + '">' + body + "</div>" };
  }

  function nsDraft() {
    var c = cls();
    return { first: "", sur: "", other: "", gender: "", dob: "", adm: "NEW", classId: S.classId, stream: c.stream || "", amount: "", method: "Cash", pdate: TODAY, ref: "", pname: "", pphone: "", pphone2: "",
      fees: S.d.feePreview.map(function (f) { return { title: f.title, amount: f.amount, add: true }; }) };
  }
  function openNew() {
    var dr = { kind: "new", phase: "loading", draft: nsDraft(), errs: {}, parentOpen: false, feeState: "ok", saving: false, result: null };
    openDrawer(dr, true);
    later(450, function () { if (top() === dr) { dr.phase = "form"; S.pendingFocus = "#ns-first"; render(); } });
  }
  function field(id, label, input, err, opt) {
    return '<div class="field"><label class="label" for="' + id + '">' + label + (opt ? ' <span class="field-optional">optional</span>' : "") + "</label>" + input + (err ? '<p class="field-error" id="' + id + '-err">' + esc(err) + "</p>" : "") + "</div>";
  }
  function inp(id, f, val, extra) { return '<input class="input" id="' + id + '" data-in="draft" data-f="' + f + '" value="' + esc(val) + '" ' + (extra || "") + ">"; }
  function sel(id, f, val, opts, extra) { return '<select class="select" id="' + id + '" data-in="draft" data-f="' + f + '" ' + (extra || "") + ">" + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; }

  function newDrawer(dr) {
    if (dr.phase === "loading") return { body: '<div class="r-empty" role="status">' + spin() + '<h2 class="r-dh" id="dr-title" tabindex="-1">Loading your registration workspace…</h2></div>' };
    var d = dr.draft, e = dr.errs;
    if (dr.phase === "success") {
      var r = dr.result;
      return { body: '<div class="r-success">' + ic("circle-check-big", 32) + '<h2 class="r-dh" id="dr-title" tabindex="-1">Student created</h2><p><b dir="auto">' + esc(r.name) + "</b> was added to " + esc(cls(r.classId).displayName) + " for " + esc(S.d.session.term.title) + ".</p>" +
        '<p class="r-sumline tnum"><span><b>' + money(r.received) + "</b> received</span><span><b>" + money(r.pending) + "</b> pending</span></p>" +
        '<div class="r-succacts"><button type="button" class="btn btn-outline" data-act="ns-new">' + ic("user-plus") + "Create new</button>" +
        '<button type="button" class="btn btn-ghost" data-act="drawer-back">Close</button>' +
        (r.received > 0 ? '<button type="button" class="btn btn-default" data-act="ns-receipt">' + ic("receipt-text") + "View receipt</button>" : r.pending > 0 ? '<button type="button" class="btn btn-default" data-act="ns-apply">' + ic("hand-coins") + "Apply payment</button>" : "") + "</div></div>" };
    }
    var feeTotal = d.fees.filter(function (f) { return f.add; }).reduce(function (t, f) { return t + f.amount; }, 0);
    var streams = [["", "None"]].concat(S.d.classrooms.map(function (c) { return c.stream; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).map(function (x) { return [x, x]; }));
    var fees = dr.feeState === "loading" ? '<div class="r-fees" aria-busy="true"><div class="skeleton" style="height:34px"></div><div class="skeleton" style="height:34px"></div><div class="skeleton" style="height:34px"></div></div>' :
      '<div class="r-fees">' + d.fees.map(function (f, i) {
        return '<label class="r-fee"><input type="checkbox" class="checkbox" id="fee-' + i + '" data-in="fee" data-i="' + i + '"' + (f.add ? " checked" : "") + "><span>" + esc(f.title) + '</span><span class="tnum">' + money(f.amount) + "</span></label>";
      }).join("") + '<div class="r-feefoot"><span class="tnum">Selected <b>' + money(feeTotal) + '</b></span><button type="button" class="btn-link" data-act="ns-retry">' + ic("refresh-cw", 14) + "Retry fee preview</button></div></div>";
    var body = '<form id="ns-form" class="r-form" data-form="ns" novalidate><div><h2 class="r-dh" id="dr-title" tabindex="-1">New student</h2><p class="r-dsub">Registers for ' + esc(S.d.session.term.title) + " · " + esc(S.d.session.title) + "</p></div>" +
      '<fieldset class="fieldset"><legend class="legend">Student</legend><div class="field-grid">' +
      field("ns-first", "First name", inp("ns-first", "first", d.first, 'autocomplete="off" dir="auto" aria-invalid="' + !!e.first + '"'), e.first) +
      field("ns-sur", "Surname", inp("ns-sur", "sur", d.sur, 'autocomplete="off" dir="auto" aria-invalid="' + !!e.sur + '"'), e.sur) +
      field("ns-other", "Other name", inp("ns-other", "other", d.other, 'autocomplete="off" dir="auto"'), null, true) +
      field("ns-gender", "Gender", sel("ns-gender", "gender", d.gender, [["", "Choose…"], ["Female", "Female"], ["Male", "Male"]], 'aria-invalid="' + !!e.gender + '"'), e.gender) +
      field("ns-dob", "Date of birth", inp("ns-dob", "dob", d.dob, 'type="date" max="' + TODAY + '"'), null, true) +
      field("ns-adm", "Admission status for this term", sel("ns-adm", "adm", d.adm, [["NEW", "New admission"], ["RETURNING", "Returning"], ["NEEDS_CLASSIFICATION", "Needs classification"]])) +
      field("ns-class", "Classroom", sel("ns-class", "classId", d.classId, S.d.classrooms.map(function (c) { return [c.id, c.displayName]; }))) +
      field("ns-stream", "Stream / sub-class", sel("ns-stream", "stream", d.stream, streams), null, true) +
      "</div></fieldset>" +
      '<fieldset class="fieldset"><legend class="legend">Fees &amp; payments</legend>' + fees + '<div class="field-grid">' +
      field("ns-amt", "Amount received now", '<div class="input-group"><span class="input-addon">₦</span><input class="input tnum" id="ns-amt" inputmode="numeric" data-in="draft" data-f="amount" placeholder="0" value="' + esc(d.amount) + '" aria-invalid="' + !!e.amount + '"></div>', e.amount, true) +
      field("ns-method", "Payment method", sel("ns-method", "method", d.method, [["Cash", "Cash"], ["Bank transfer", "Bank transfer"], ["POS", "POS"]])) +
      field("ns-pdate", "Payment date", inp("ns-pdate", "pdate", d.pdate, 'type="date" max="' + TODAY + '"')) +
      field("ns-ref", "Payment reference", inp("ns-ref", "ref", d.ref, 'autocomplete="off"'), null, true) +
      "</div></fieldset>" +
      '<div class="r-collapse"><button type="button" class="r-colbtn" data-act="ns-parent" aria-expanded="' + dr.parentOpen + '" aria-controls="ns-parent">' + ic(dr.parentOpen ? "chevron-down" : "chevron-right") + '<span>Parent / guardian</span><span class="field-optional">optional</span></button>' +
      (dr.parentOpen ? '<div class="field-grid" id="ns-parent">' + field("ns-pname", "Name", inp("ns-pname", "pname", d.pname, 'dir="auto"')) + field("ns-pphone", "Phone", inp("ns-pphone", "pphone", d.pphone, 'type="tel"')) + field("ns-pphone2", "Phone 2", inp("ns-pphone2", "pphone2", d.pphone2, 'type="tel"'), null, true) + "</div>" : "") + "</div></form>";
    var foot = '<button type="button" class="btn btn-ghost" data-act="drawer-back">Cancel</button><button type="submit" form="ns-form" class="btn btn-default"' + (dr.saving ? " disabled" : "") + ">" + (dr.saving ? spin() + "Saving…" : "Save student") + "</button>";
    return { body: body, foot: foot };
  }

  function saveNew(dr) {
    var d = dr.draft, e = {};
    var feeTotal = d.fees.filter(function (f) { return f.add; }).reduce(function (t, f) { return t + f.amount; }, 0);
    var amt = d.amount === "" ? 0 : Number(String(d.amount).replace(/[,\s₦]/g, ""));
    if (!d.first.trim()) e.first = "Enter a first name.";
    if (!d.sur.trim()) e.sur = "Enter a surname.";
    if (!d.gender) e.gender = "Choose a gender.";
    if (isNaN(amt) || amt < 0) e.amount = "Enter an amount in naira.";
    else if (amt > feeTotal) e.amount = "That’s more than the " + money(feeTotal) + " selected.";
    dr.errs = e;
    if (Object.keys(e).length) { S.pendingFocus = "#ns-" + (e.first ? "first" : e.sur ? "sur" : e.gender ? "gender" : "amt"); render(); return; }
    dr.saving = true; render();
    later(600, function () {
      if (top() !== dr) return;
      var cid = d.classId, c = cls(cid);
      var id = cid + "-n" + (S.seq++).toString(16) + "b4d2c9e";
      var s = { id: id, name: d.first.trim(), surname: d.sur.trim(), otherName: d.other.trim(), studentName: d.first.trim() + " " + d.sur.trim(), gender: d.gender, dob: d.dob, enrolled: true, termFormId: "tf-" + id,
        admissionStatus: d.adm, guardian: d.pname.trim(), guardianPhone: d.pphone.trim(), createdAt: TODAY };
      S.d.rosters[cid].push(s);
      d.fees.filter(function (f) { return f.add; }).forEach(function (f, i) {
        S.d.charges[cid].push({ id: id + "-ch-" + i, studentId: id, studentName: s.studentName, title: f.title, stream: d.stream || c.stream, amount: f.amount, amountPaid: 0, outstanding: f.amount, status: "PENDING" });
      });
      if (amt > 0) applyPayment(id, amt);
      dr.saving = false; dr.phase = "success"; dr.result = { id: id, name: s.studentName, classId: cid, received: amt, pending: feeTotal - amt };
      S.pendingFocus = "#dr-title";
      render();
    });
  }

  function sessionDrawer(dr) {
    var s = sessions().filter(function (x) { return x.id === dr.id; })[0];
    if (!s) return { body: notFound("Session not found", "This attendance session may have been deleted."), foot: '<button type="button" class="btn btn-outline" data-act="drawer-back">Close</button>' };
    var st = sessStats(s);
    var body = '<div><h2 class="r-dh" id="dr-title" tabindex="-1" dir="auto">' + esc(s.title) + '</h2><p class="r-dsub">' + esc(fmtDate(s.date)) + " · " + esc(s.takenBy) + (s.subject ? " · " + esc(s.subject) : "") + (s.period ? " · " + esc(s.period) : "") + "</p></div>" +
      '<div class="r-sessbig"><p><b class="tnum">' + st.rate + "%</b> attended</p>" + '<div class="progress"><span style="width:' + st.rate + '%"></span></div>' +
      '<p class="r-totals tnum">' + plural(st.n, "student") + " · " + st.p + " present · " + st.l + " late · " + st.a + " absent · 0 excused · 0 on leave</p></div>" +
      '<h3 class="r-h3">Revision history</h3><ol class="r-hist">' + s.history.slice().reverse().map(function (h) {
        return '<li><span class="badge ' + (h.action === "Corrected" ? "badge-info" : "badge-neutral") + '">' + esc(h.action) + "</span><div><b>" + esc(h.actor) + '</b> <span class="r-sub-i tnum">' + esc(h.at) + '</span><div class="r-sub-i">' + esc(h.summary) + "</div></div></li>";
      }).join("") + "</ol>" +
      '<h3 class="r-h3">Students</h3><ul class="r-mini">' + s.records.map(function (r) {
        var f = findStudent(r.studentId);
        return '<li><span dir="auto">' + esc(f ? f.s.studentName : "Former student") + '</span><span class="r-mini-r"><span class="r-dot r-dot-' + r.status.toLowerCase() + '">' + STL[r.status] + '</span><small dir="auto">' + esc(r.remarks || "No remark") + "</small></span></li>";
      }).join("") + "</ul>";
    var foot = (isAdmin() ? '<button type="button" class="btn btn-ghost r-danger" data-act="del-session" data-id="' + s.id + '">' + ic("trash-2") + "Delete</button>" : "") + '<span class="r-spacer"></span>' +
      '<button type="button" class="btn btn-outline" data-act="drawer-back">Close</button><button type="button" class="btn btn-default" data-act="correct-session" data-id="' + s.id + '">' + ic("pencil") + "Correct session</button>";
    return { body: body, foot: foot };
  }

  function payDrawer(dr) {
    var d = dr.draft, list = roster().filter(function (s) { return balanceOf(s.id).has; }).sort(function (a, b) { return balanceOf(b.id).out - balanceOf(a.id).out || a.studentName.localeCompare(b.studentName); });
    var b = d.sid ? balanceOf(d.sid) : null;
    var body = '<form id="pay-form" class="r-form" data-form="pay" novalidate><div><h2 class="r-dh" id="dr-title" tabindex="-1">Receive payment</h2><p class="r-dsub">' + esc(cls().displayName) + " · " + esc(S.d.session.term.title) + "</p></div>" +
      '<div class="field"><label class="label" for="pay-sid">Student</label><select class="select" id="pay-sid" data-in="draft" data-f="sid" data-rr><option value="">Choose student…</option>' +
      list.map(function (s) { var bb = balanceOf(s.id); return '<option value="' + s.id + '"' + (d.sid === s.id ? " selected" : "") + ">" + esc(s.studentName) + " — " + (bb.out > 0 ? money(bb.out) + " due" : "paid") + "</option>"; }).join("") + "</select>" +
      (b ? '<p class="field-description tnum">' + (b.out > 0 ? money(b.out) + " outstanding · " + '<button type="button" class="btn-link" data-act="pay-full">Pay full balance</button>' : "Nothing outstanding") + "</p>" : "") + "</div>" +
      '<div class="field-grid">' +
      field("pay-amt", "Amount", '<div class="input-group"><span class="input-addon">₦</span><input class="input tnum" id="pay-amt" inputmode="numeric" data-in="draft" data-f="amount" placeholder="0" value="' + esc(d.amount) + '"></div>') +
      field("pay-method", "Method", sel("pay-method", "method", d.method, [["Cash", "Cash"], ["Bank transfer", "Bank transfer"], ["POS", "POS"]])) +
      field("pay-date", "Payment date", inp("pay-date", "date", d.date, 'type="date" max="' + TODAY + '"')) +
      field("pay-ref", "Reference", inp("pay-ref", "ref", d.ref, 'autocomplete="off"'), null, true) + "</div>" +
      (dr.err ? '<p class="field-error" role="alert">' + esc(dr.err) + "</p>" : "") + "</form>";
    var foot = '<button type="button" class="btn btn-ghost" data-act="drawer-back">Cancel</button><button type="submit" form="pay-form" class="btn btn-default"' + (dr.saving ? " disabled" : "") + ">" + (dr.saving ? spin() + "Saving…" : "Save payment") + "</button>";
    return { body: body, foot: foot };
  }
  function savePay(dr) {
    var d = dr.draft, amt = Number(String(d.amount).replace(/[,\s₦]/g, "")), err = null;
    if (!d.sid) err = "Choose a student.";
    else if (!(amt > 0)) err = "Enter an amount greater than ₦0.";
    else { var b = balanceOf(d.sid); if (b.out <= 0) err = "This student has nothing outstanding."; else if (amt > b.out) err = "That’s more than the " + money(b.out) + " outstanding."; }
    dr.err = err;
    if (err) { render(); return; }
    dr.saving = true; render();
    later(500, function () {
      if (top() !== dr) return;
      applyPayment(d.sid, amt);
      var f = findStudent(d.sid);
      popDrawer();
      toast("Payment recorded", money(amt) + " from " + (f ? f.s.studentName : "student") + " · " + d.method);
      render();
    });
  }

  /* subject workspace */
  function scoreCols(sub) {
    var out = [];
    sub.assessments.forEach(function (a) {
      if (a.children && a.children.length) a.children.forEach(function (c) { if (+c.weight > 0) out.push({ id: c.id, title: c.title, max: c.obtainable, parent: a.title }); });
      else if (+a.weight > 0) out.push({ id: a.id, title: a.title, max: a.obtainable });
    });
    return out;
  }
  function printCols(sub) {
    var out = [];
    sub.assessments.forEach(function (a) {
      if (!a.print) return;
      if (a.children && a.children.length && a.printMode !== "TOTAL") a.children.forEach(function (c) { out.push(c.title + " (" + c.weight + "%)"); });
      else out.push(a.title + " (" + a.weight + "%)");
    });
    return out;
  }
  function findAssess(sub, aid) {
    for (var i = 0; i < sub.assessments.length; i++) {
      var a = sub.assessments[i]; if (a.id === aid) return a;
      var c = (a.children || []).filter(function (x) { return x.id === aid; })[0]; if (c) return c;
    }
    return null;
  }
  var IND = { idle: "Scores save automatically", saving: "Saving…", saved: "All changes saved", error: "Couldn’t save — check the highlighted score" };
  function subjectDrawer(dr) {
    var sub = subjects().filter(function (x) { return x.id === dr.id; })[0];
    if (!sub) return { body: notFound("Subject not found", "This subject may have been removed from the class.") };
    var st = subjStats(sub), n = enrolled().length;
    var h = '<div class="r-dhrow"><div class="r-pmain"><h2 class="r-dh" id="dr-title" tabindex="-1" dir="auto">' + esc(sub.title) + '</h2><p class="r-dsub"><span dir="auto">' + esc(cls().displayName) + "</span> · " + plural(n, "student") + "</p></div>" +
      '<button type="button" class="btn btn-outline btn-sm" id="r-recsub" data-act="menu" data-menu="rec-sub" aria-haspopup="menu">' + ic("notebook-pen") + "Record submission" + ic("chevron-down", 14) + "</button></div>" +
      '<p class="r-totals tnum">' + plural(st.items, "score item") + " · " + plural(st.subs, "submission") + " · " + st.weight + "% weighted · " + st.grouped + " grouped</p>" +
      tabsHtml("sj-tab", dr.tab, [["assess", "Assessments"], ["scores", "Score entry"]], "Subject sections");
    var body;
    if (dr.tab === "assess") {
      var sugg = S.d.assessmentSuggestions.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !sub.assessments.some(function (a) { return a.title.toLowerCase() === o.x.title.toLowerCase(); }); });
      var pc = printCols(sub);
      body = '<div class="r-dtool"><button type="button" class="btn btn-default btn-sm" data-act="as-new">' + ic("plus") + "Create assessment</button></div>" +
        (sugg.length ? '<div class="r-suggest"><span class="r-sub-i">Quick add</span>' + sugg.map(function (o) { return '<button type="button" class="r-chip" data-act="as-suggest" data-i="' + o.i + '">' + ic("plus", 12) + esc(o.x.title) + ' <span class="tnum">/' + o.x.obtainable + " · " + o.x.weight + "%</span></button>"; }).join("") + "</div>" : "") +
        '<p class="r-print">' + ic("printer", 14) + "<span>" + (pc.length ? "Result print: " + esc(pc.join(" · ")) : "No print columns") + "</span></p>" + assessRows(sub);
    } else body = scoresHtml(sub);
    return { body: h + '<div class="r-dpanel" role="tabpanel" aria-labelledby="sj-tab-' + dr.tab + '">' + body + "</div>" };
  }
  function assessRows(sub) {
    if (!sub.assessments.length) return '<div class="r-empty sm">' + ic("clipboard-list", 22) + "<b>No assessment</b><p>Create one, or quick-add a common item above.</p></div>";
    var last = sub.assessments.length - 1;
    return '<ol class="r-alist">' + sub.assessments.map(function (a, i) {
      var kids = a.children && a.children.length;
      var meta = ['<span class="tnum">' + a.weight + "%</span>", '<span class="tnum">' + plural(a.submissions || 0, "submission") + "</span>", '<span class="tnum">' + (a.obtainable == null ? "Uncapped" : a.obtainable + " points") + "</span>"];
      if (kids) meta.push("<span>" + plural(a.children.length, "sub-assessment") + "</span>");
      meta.push("<span>" + (a.print ? (kids ? (a.printMode === "TOTAL" ? "Prints total" : "Prints parts") : "Prints") : "Not printed") + "</span>");
      return '<li class="r-arow"><span class="r-ano tnum">#' + (i + 1) + '</span><div class="r-pmain"><div class="r-atitle"><b dir="auto">' + esc(a.title) + "</b>" + (+a.weight === 0 ? '<span class="badge badge-warning">' + ic("triangle-alert") + "0% weight</span>" : "") + '</div><div class="r-sub">' + meta.join("") + "</div>" +
        (kids ? '<ul class="r-akids">' + a.children.map(function (c, j) { return '<li><span class="r-sub-i">Part ' + (j + 1) + " under " + esc(a.title) + '</span><b dir="auto">' + esc(c.title) + '</b><span class="r-sub-i tnum">' + (c.obtainable == null ? "Uncapped" : "/" + c.obtainable) + " · " + c.weight + "%</span></li>"; }).join("") + "</ul>" : "") + "</div>" +
        '<div class="r-aacts"><button type="button" class="btn btn-ghost btn-icon btn-sm" id="asu-' + a.id + '" data-act="as-move" data-d="-1" data-i="' + i + '" aria-label="Move ' + esc(a.title) + ' up"' + (i === 0 ? " disabled" : "") + ">" + ic("chevron-up") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" id="asd-' + a.id + '" data-act="as-move" data-d="1" data-i="' + i + '" aria-label="Move ' + esc(a.title) + ' down"' + (i === last ? " disabled" : "") + ">" + ic("chevron-down") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="as-edit" data-id="' + a.id + '" aria-label="Edit ' + esc(a.title) + '">' + ic("pencil") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm r-danger" data-act="as-del" data-id="' + a.id + '" aria-label="Delete ' + esc(a.title) + '">' + ic("trash-2") + "</button></div></li>";
    }).join("") + "</ol>";
  }
  function scoresHtml(sub) {
    var cols = scoreCols(sub), studs = enrolled().slice().sort(function (a, b) { return a.studentName.localeCompare(b.studentName); }), sc = S.scores[sub.id] || {};
    var unweighted = sub.assessments.filter(function (a) { return +a.weight === 0; }).map(function (a) { return a.title; });
    if (!studs.length) return '<div class="r-empty sm">' + ic("users", 22) + "<b>No students enrolled in this class for the active term</b></div>";
    if (!cols.length) return '<div class="r-empty sm">' + ic("pencil-ruler", 22) + "<b>No weighted assessments</b><p>Give an assessment a weight in Assessments to enter scores.</p></div>";
    var h = '<div class="r-scorebar"><span class="r-ind" id="sc-ind" role="status" data-state="' + S.scoreInd + '">' + (S.scoreInd === "saving" ? spin() : S.scoreInd === "error" ? ic("circle-alert", 14) : ic("cloud-check", 14)) + "<span>" + IND[S.scoreInd] + "</span></span></div>" +
      (unweighted.length ? '<p class="r-muted">' + esc(unweighted.join(", ")) + " " + (unweighted.length === 1 ? "has" : "have") + " no weight, so no score column.</p>" : "") +
      '<div class="r-gridwrap" data-scroll="scoregrid"><table class="table r-scores"><thead><tr><th class="num">#</th><th>Student</th>' + cols.map(function (c) { return '<th class="num"><span dir="auto">' + esc(c.title) + "</span><small>" + (c.max == null ? "Uncapped" : "/ " + c.max) + "</small></th>"; }).join("") + '<th class="num">Total</th></tr></thead><tbody>' +
      studs.map(function (s, i) {
        var row = sc[s.id] || {}, tot = 0;
        var cells = cols.map(function (c) {
          var v = row[c.id] == null ? "" : row[c.id], num = Number(v), bad = v !== "" && (isNaN(num) || num < 0), over = v !== "" && !bad && c.max != null && num > c.max;
          if (v !== "" && !bad) tot += num;
          return '<td class="num"><input class="input r-scin tnum" id="sc-' + s.id + "-" + c.id + '" inputmode="decimal" data-in="score" data-sub="' + sub.id + '" data-sid="' + s.id + '" data-aid="' + c.id + '" data-max="' + (c.max == null ? "" : c.max) + '" value="' + esc(v) + '" aria-invalid="' + (bad || over) + '" aria-label="' + esc(s.studentName) + " — " + esc(c.title) + '"></td>';
        }).join("");
        return '<tr><td class="num r-sub-i">' + (i + 1) + '</td><td class="r-scname" dir="auto">' + esc(s.studentName) + "</td>" + cells + '<td class="num tnum" id="sct-' + s.id + '">' + (tot ? tot : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    return h;
  }
  function setInd(state) {
    S.scoreInd = state;
    var el = HOST && HOST.querySelector("#sc-ind"); if (!el) return;
    el.dataset.state = state;
    el.innerHTML = (state === "saving" ? spin() : state === "error" ? ic("circle-alert", 14) : ic("cloud-check", 14)) + "<span>" + IND[state] + "</span>";
  }
  function onScore(el) {
    var v = el.value.trim(), subId = el.dataset.sub, sid = el.dataset.sid, aid = el.dataset.aid, max = el.dataset.max === "" ? null : Number(el.dataset.max);
    var sub = subjects().filter(function (x) { return x.id === subId; })[0]; if (!sub) return;
    S.scores[subId] = S.scores[subId] || {}; S.scores[subId][sid] = S.scores[subId][sid] || {};
    var row = S.scores[subId][sid], prev = row[aid], num = Number(v);
    var bad = v !== "" && (isNaN(num) || num < 0), over = !bad && v !== "" && max != null && num > max;
    el.setAttribute("aria-invalid", String(bad || over));
    el.title = bad ? "Enter a number" : over ? "Over the maximum of " + max : "";
    var valid = function (x) { return x != null && x !== "" && !isNaN(Number(x)) && Number(x) >= 0; };
    var had = valid(prev), has = valid(v);
    row[aid] = v;
    var it = findAssess(sub, aid);
    if (it) { if (!had && has) it.submissions = (it.submissions || 0) + 1; else if (had && !has) it.submissions = Math.max(0, (it.submissions || 0) - 1); }
    var tot = Object.keys(row).reduce(function (t, k) { return t + (valid(row[k]) ? Number(row[k]) : 0); }, 0);
    var tc = HOST.querySelector("#sct-" + CSS.escape(sid)); if (tc) tc.textContent = tot ? String(tot) : "—";
    clearTimeout(S.scoreTimer);
    if (bad) { setInd("error"); return; }
    setInd("saving");
    S.scoreTimer = later(600, function () {
      var anyBad = Array.prototype.slice.call(HOST.querySelectorAll(".r-scin")).some(function (i) { var x = i.value.trim(); return x !== "" && !valid(x); });
      setInd(anyBad ? "error" : "saved");
    });
  }

  /* ---------------- dialogs ---------------- */
  function openDialog(d, focus) { d.back = lastTrigger; S.dialog = d; S.menu = null; S.pendingFocus = focus || ".r-dialog [data-act=dlg-cancel]"; }
  function closeDialog() { var b = S.dialog && S.dialog.back; S.dialog = null; S.pendingFocus = b; render(); }
  function confirmDlg(o) { o.kind = "confirm"; openDialog(o); }
  function dlgOk() {
    var d = S.dialog; if (!d || d.saving) return;
    var err = d.validate ? d.validate(d) : null;
    if (err) { d.error = err; render(); return; }
    d.saving = true; d.error = null; render();
    later(d.delay == null ? 450 : d.delay, function () {
      if (S.dialog !== d) return;
      var r;
      try { r = d.run(d) || {}; } catch (e) { r = { error: "Something went wrong. Try again." }; }
      if (r.error) { d.saving = false; d.error = r.error; render(); return; }
      S.dialog = null; S.pendingFocus = r.focus || d.back;
      if (r.toast) toast(r.toast[0], r.toast[1]);
      render();
    });
  }
  function dialogHtml() {
    var d = S.dialog; if (!d) return "";
    var inner = "", w = "28rem";
    var errHtml = d.error ? '<div class="alert r-alert-err" role="alert">' + ic("circle-alert") + '<div class="alert-title">' + esc(d.error) + "</div></div>" : "";
    var okBtn = function (label, cls2, dis) { return '<button type="button" class="btn ' + (cls2 || "btn-default") + '" data-act="dlg-ok"' + (d.saving || dis ? " disabled" : "") + ">" + (d.saving ? spin() + "Saving…" : label) + "</button>"; };
    var cancel = '<button type="button" class="btn btn-outline" data-act="dlg-cancel"' + (d.saving ? " disabled" : "") + ">Cancel</button>";
    var head = function (t, desc) { return '<div class="dialog-header"><h2 class="dialog-title" id="dlg-title">' + t + "</h2>" + (desc ? '<p class="dialog-description">' + desc + "</p>" : "") + "</div>"; };
    if (d.kind === "confirm") inner = head(esc(d.title), esc(d.desc)) + (d.extra || "") + errHtml + '<div class="dialog-footer">' + cancel + okBtn(esc(d.okLabel), d.destructive ? "btn-destructive" : "btn-default") + "</div>";
    else if (d.kind === "dups") {
      w = "32rem";
      var gs = dupGroups(), body;
      if (d.phase === "checking") body = '<p class="r-checking" role="status">' + spin() + "Checking student count and duplicate names…</p>";
      else if (!gs.length) body = '<p class="r-calm">' + ic("circle-check", 16) + "No duplicate names found in " + esc(cls().displayName) + ".</p>";
      else {
        var affected = gs.reduce(function (t, g) { return t + g.records; }, 0);
        body = '<p class="r-totals tnum"><b>' + plural(gs.length, "duplicate group") + "</b> · " + plural(affected, "student") + " affected</p>" +
          '<div class="alert r-alert-warn">' + ic("triangle-alert") + '<div class="alert-title">Possible duplicates</div><ul class="alert-description r-duplist">' + gs.map(function (g) {
            return '<li><div><b dir="auto">' + esc(g.displayName) + "</b> · " + g.records + " records<div class=\"r-sub-i\">Keep " + esc(shortId(g.survivor.id)) + " in " + esc(g.survivor.className) + ' (recommended)</div></div><button type="button" class="btn btn-outline btn-sm" data-act="merge" data-g="' + g.key + '">Review merge</button></li>';
          }).join("") + "</ul></div>";
      }
      inner = head("Review duplicates", "Students in this class who share the same name.") + body + '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="dlg-cancel">Close</button></div>';
    } else if (d.kind === "merge") {
      w = "36rem";
      var g = (S.d.duplicates[S.classId] || []).filter(function (x) { return x.key === d.g; })[0];
      if (!g) inner = head("Duplicate already resolved", "") + '<div class="dialog-footer"><button type="button" class="btn btn-outline" data-act="dlg-cancel">Close</button></div>';
      else {
        var tm = g.toMove, allowed = g.canMerge && canManage();
        inner = head("Review merge · <span dir=\"auto\">" + esc(g.displayName) + "</span>", g.records + " records share this name. The duplicate’s records move to the survivor, then the duplicate is removed.") +
          '<div class="r-mems">' + g.members.map(function (m) {
            return '<div class="r-mem' + (m.recommended ? " is-rec" : "") + '"><div class="r-memhead"><b dir="auto">' + esc(m.displayName) + "</b>" + (m.recommended ? '<span class="badge badge-success">Recommended survivor</span>' : '<span class="badge badge-neutral">Duplicate</span>') + "</div>" +
              '<div class="r-sub-i mono">' + esc(shortId(m.id)) + '</div><div class="r-memstats tnum"><span>History score <b>' + m.historyScore + "</b></span><span><b>" + m.assessments + "</b> assessments</span><span><b>" + m.attendance + "</b> attendance</span><span><b>" + m.charges + "</b> charges</span><span><b>" + m.payments + "</b> payments</span></div></div>";
          }).join("") + "</div>" +
          '<div><h3 class="r-h3">Records to move</h3><p class="r-totals tnum">' + plural(tm.termForms, "term form") + " · " + tm.attendance + " attendance · " + plural(tm.assessments, "assessment") + " · " + plural(tm.charges, "charge") + " · " + plural(tm.payments, "payment") + "</p></div>" +
          (g.conflicts.length ? '<div class="alert r-alert-warn">' + ic("triangle-alert") + '<div class="alert-title">Conflicts</div><ul class="alert-description">' + g.conflicts.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul></div>" : "") +
          (!canManage() ? '<p class="r-muted">Only Admins and Registrars can merge students.</p>' : "") + errHtml +
          '<div class="dialog-footer">' + cancel + okBtn("Merge duplicate", "btn-default", !allowed) + "</div>";
      }
    } else if (d.kind === "admission") {
      inner = head("Set admission status", plural(d.ids.length, "student") + " selected. Fees are reconciled for the new status.") +
        '<div class="r-radios" role="radiogroup" aria-label="Admission status">' + [["NEW", "New admission"], ["RETURNING", "Returning"], ["NEEDS_CLASSIFICATION", "Needs classification"]].map(function (o) {
          return '<label class="choice"><input type="radio" class="radio" name="adm" id="adm-' + o[0] + '" value="' + o[0] + '" data-in="dlg" data-f="value"' + (d.draft.value === o[0] ? " checked" : "") + "><span>" + o[1] + "</span></label>";
        }).join("") + "</div>" + errHtml + '<div class="dialog-footer">' + cancel + okBtn("Apply to " + plural(d.ids.length, "student")) + "</div>";
    } else if (d.kind === "move") {
      var dests = S.d.classrooms.filter(function (c) { return c.id !== S.classId; });
      inner = head("Move class", plural(d.ids.length, "student") + " will move from " + esc(cls().displayName) + ". You can move 1–100 students at a time.") +
        '<div class="field"><label class="label" for="mv-dest">Destination class</label><div class="r-moverow"><select class="select" id="mv-dest" data-in="dlg" data-f="dest"' + (d.refreshing ? " disabled" : "") + '><option value="">Choose class…</option>' +
        dests.map(function (c) { return '<option value="' + c.id + '"' + (d.draft.dest === c.id ? " selected" : "") + ">" + esc(c.displayName) + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="btn btn-outline btn-icon btn-sm" data-act="mv-refresh" aria-label="Refresh destinations"' + (d.refreshing ? " disabled" : "") + ">" + (d.refreshing ? spin() : ic("refresh-cw")) + "</button></div></div>" +
        errHtml + '<div class="dialog-footer">' + cancel + okBtn("Move " + plural(d.ids.length, "student"), "btn-default", d.ids.length < 1 || d.ids.length > 100) + "</div>";
    } else if (d.kind === "import") {
      var av = availableImports(), picked = av.filter(function (t) { return d.picked[t]; }).length;
      inner = head("Import from catalog", "School subjects not yet attached to " + esc(cls().displayName) + ".") +
        '<div class="r-imphead"><span class="tnum">' + picked + ' selected</span><span class="r-spacer"></span><button type="button" class="btn-link" data-act="imp-all">Select all</button><button type="button" class="btn-link" data-act="imp-clear">Clear all</button></div>' +
        '<div class="r-implist">' + av.map(function (t, i) { return '<label class="choice r-impitem"><input type="checkbox" class="checkbox" id="imp-' + i + '" data-in="imp" data-name="' + esc(t) + '"' + (d.picked[t] ? " checked" : "") + '><span dir="auto">' + esc(t) + "</span></label>"; }).join("") + "</div>" +
        errHtml + '<div class="dialog-footer">' + cancel + okBtn("Batch import" + (picked ? " (" + picked + ")" : ""), "btn-default", !picked) + "</div>";
    } else if (d.kind === "edit") {
      var e = d.draft, de = d.errs || {};
      var di = function (id, f, label, extra) { return field(id, label, '<input class="input" id="' + id + '" data-in="dlg" data-f="' + f + '" value="' + esc(e[f]) + '" ' + (extra || "") + ">", de[f]); };
      w = "32rem";
      inner = head("Edit information", '<span dir="auto">' + esc(e.name + " " + e.surname) + "</span>") +
        '<div class="field-grid">' + di("ed-name", "name", "First name", 'dir="auto" aria-invalid="' + !!de.name + '"') + di("ed-sur", "surname", "Surname", 'dir="auto" aria-invalid="' + !!de.surname + '"') + di("ed-other", "otherName", "Other name", 'dir="auto"') +
        field("ed-gender", "Gender", '<select class="select" id="ed-gender" data-in="dlg" data-f="gender"><option' + (e.gender === "Female" ? " selected" : "") + ">Female</option><option" + (e.gender === "Male" ? " selected" : "") + ">Male</option></select>") +
        di("ed-dob", "dob", "Date of birth", 'type="date" max="' + TODAY + '"') + di("ed-guard", "guardian", "Guardian", 'dir="auto"') + di("ed-phone", "guardianPhone", "Guardian phone", 'type="tel"') + "</div>" +
        errHtml + '<div class="dialog-footer">' + cancel + okBtn("Save changes") + "</div>";
    } else if (d.kind === "assess") { inner = assessDialog(d, head, errHtml, cancel, okBtn); w = "34rem"; }
    return '<div class="r-overlay" data-act="dlg-cancel" aria-hidden="true"></div><div class="dialog r-dialog" data-open="true" role="dialog" aria-modal="true" aria-labelledby="dlg-title" style="--dialog-w:' + w + '">' + inner + "</div>";
  }

  function asDraft(a) {
    if (!a) return { title: "", obtainable: "", weight: "", print: true, split: false, printMode: "EXPANDED", children: [] };
    return { title: a.title, obtainable: a.obtainable == null ? "" : String(a.obtainable), weight: String(a.weight), print: !!a.print, split: !!(a.children && a.children.length), printMode: a.printMode || "EXPANDED",
      children: (a.children || []).map(function (c) { return { id: c.id, title: c.title, obtainable: c.obtainable == null ? "" : String(c.obtainable), weight: String(c.weight) }; }) };
  }
  function draftWeight(x) { return x.split ? x.children.reduce(function (t, c) { return t + (Number(c.weight) || 0); }, 0) : (Number(x.weight) || 0); }
  function assessDialog(d, head, errHtml, cancel, okBtn) {
    var x = d.draft, sub = subjects().filter(function (s) { return s.id === d.sub; })[0];
    var others = sub ? sub.assessments.filter(function (a) { return a.id !== d.aid; }).reduce(function (t, a) { return t + (+a.weight || 0); }, 0) : 0;
    var w = draftWeight(x), total = others + w, warns = [];
    if (x.title && w === 0) warns.push("0% weight — this item won’t count toward the subject total.");
    if (total !== 100) warns.push("Subject weights will total " + total + "% (aim for 100%).");
    if (!x.print) warns.push("This item won’t appear on the result print.");
    var h = head(d.aid ? "Edit assessment" : "Create assessment", sub ? '<span dir="auto">' + esc(sub.title) + "</span> · " + esc(cls().displayName) : "") +
      field("as-title", "Title", '<input class="input" id="as-title" dir="auto" data-in="dlg" data-f="title" data-rr value="' + esc(x.title) + '" aria-invalid="' + !!(d.errs && d.errs.title) + '">', d.errs && d.errs.title) +
      '<label class="choice r-switchrow"><input type="checkbox" class="switch" id="as-split" data-in="dlg" data-f="split" data-rr' + (x.split ? " checked" : "") + "><span>Split into sub-assessments</span></label>";
    if (x.split) {
      var tObt = x.children.every(function (c) { return c.obtainable !== ""; }) ? x.children.reduce(function (t, c) { return t + (Number(c.obtainable) || 0); }, 0) : null;
      h += '<div class="field"><span class="label" id="as-pm-l">Print mode</span><div class="tabs-list r-full" role="radiogroup" aria-labelledby="as-pm-l">' + [["EXPANDED", "Expanded"], ["TOTAL", "Total"]].map(function (o) {
        return '<button type="button" role="radio" class="tabs-trigger" id="as-pm-' + o[0] + '" aria-checked="' + (x.printMode === o[0]) + '" aria-selected="' + (x.printMode === o[0]) + '" data-act="as-pm" data-v="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + '</div><p class="field-description">' + (x.printMode === "EXPANDED" ? "Each part prints as its own column." : "Only the combined total prints.") + "</p></div>" +
        '<div class="r-kids"><div class="r-kidhead"><span>Part</span><span>Obtainable</span><span>Weight %</span><span></span></div>' + x.children.map(function (c, i) {
          return '<div class="r-kid"><input class="input" id="asc-' + i + '-t" dir="auto" data-in="child" data-i="' + i + '" data-f="title" placeholder="Part ' + (i + 1) + ' title" aria-label="Part ' + (i + 1) + ' title" value="' + esc(c.title) + '">' +
            '<input class="input tnum" id="asc-' + i + '-o" inputmode="numeric" data-in="child" data-i="' + i + '" data-f="obtainable" data-rr placeholder="Uncapped" aria-label="Part ' + (i + 1) + ' obtainable" value="' + esc(c.obtainable) + '">' +
            '<input class="input tnum" id="asc-' + i + '-w" inputmode="numeric" data-in="child" data-i="' + i + '" data-f="weight" data-rr placeholder="0" aria-label="Part ' + (i + 1) + ' weight" value="' + esc(c.weight) + '">' +
            '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="as-kid-del" data-i="' + i + '" aria-label="Remove part ' + (i + 1) + '"' + (x.children.length <= 1 ? " disabled" : "") + ">" + ic("x") + "</button></div>";
        }).join("") + '<div class="r-kidfoot"><button type="button" class="btn-link" data-act="as-kid-add">' + ic("plus", 14) + 'Add part</button><span class="tnum">Total ' + (tObt == null ? "uncapped" : "/" + tObt) + " · " + w + "%</span></div></div>";
    } else {
      h += '<div class="field-grid">' + field("as-obt", "Obtainable", '<input class="input tnum" id="as-obt" inputmode="numeric" data-in="dlg" data-f="obtainable" placeholder="Blank = uncapped" value="' + esc(x.obtainable) + '">') +
        field("as-w", "Weight %", '<input class="input tnum" id="as-w" inputmode="numeric" data-in="dlg" data-f="weight" data-rr placeholder="0" value="' + esc(x.weight) + '">') + "</div>";
    }
    h += '<label class="choice"><input type="checkbox" class="checkbox" id="as-print" data-in="dlg" data-f="print" data-rr' + (x.print ? " checked" : "") + "><span>Show on result print</span></label>";
    if (warns.length) h += '<ul class="r-warns">' + warns.map(function (t) { return "<li>" + ic("triangle-alert", 14) + "<span>" + esc(t) + "</span></li>"; }).join("") + "</ul>";
    return h + errHtml + '<div class="dialog-footer">' + cancel + okBtn(d.aid ? "Save changes" : "Create") + "</div>";
  }
  function openAssess(subId, aid) {
    var sub = subjects().filter(function (s) { return s.id === subId; })[0]; if (!sub) return;
    var a = aid ? sub.assessments.filter(function (x) { return x.id === aid; })[0] : null;
    openDialog({ kind: "assess", sub: subId, aid: aid || null, draft: asDraft(a), errs: {},
      validate: function (d) {
        var x = d.draft; d.errs = {};
        if (!x.title.trim()) { d.errs.title = "Enter a title."; S.pendingFocus = "#as-title"; return "Give the assessment a title."; }
        if (x.split && !x.children.length) return "Add at least one part.";
        if (x.split && x.children.some(function (c) { return !c.title.trim(); })) return "Every part needs a title.";
        var nums = x.split ? x.children.reduce(function (t, c) { return t.concat([c.obtainable, c.weight]); }, []) : [x.obtainable, x.weight];
        if (nums.some(function (n) { return n !== "" && (isNaN(Number(n)) || Number(n) < 0); })) return "Obtainable and weight must be positive numbers.";
        return null;
      },
      delay: 300,
      run: function (d) {
        var x = d.draft, s2 = subjects().filter(function (s) { return s.id === d.sub; })[0]; if (!s2) return { error: "Subject no longer exists." };
        var item = d.aid ? s2.assessments.filter(function (y) { return y.id === d.aid; })[0] : null;
        if (!item) { item = { id: "a" + (S.seq++) + "x", submissions: 0 }; s2.assessments.push(item); }
        item.title = x.title.trim(); item.print = x.print;
        if (x.split) {
          item.children = x.children.map(function (c, i) { var old = (item.children || []).filter(function (o) { return o.id === c.id; })[0]; return { id: c.id || item.id + "-p" + i + (S.seq++), title: c.title.trim(), obtainable: c.obtainable === "" ? null : Number(c.obtainable), weight: Number(c.weight) || 0, submissions: old ? old.submissions : 0 }; });
          item.printMode = x.printMode; item.weight = draftWeight(x);
          item.obtainable = item.children.every(function (c) { return c.obtainable != null; }) ? item.children.reduce(function (t, c) { return t + c.obtainable; }, 0) : null;
        } else { item.children = []; delete item.printMode; item.obtainable = x.obtainable === "" ? null : Number(x.obtainable); item.weight = Number(x.weight) || 0; }
        return { toast: [d.aid ? "Assessment updated" : "Assessment created", item.title + " · " + item.weight + "%"] };
      } }, "#as-title");
  }

  /* dialog openers */
  function openRemove(ids) {
    var studs = ids.map(findStudent).filter(Boolean).map(function (f) { return f.s; }), enr = studs.filter(function (s) { return s.enrolled; });
    confirmDlg({ title: studs.length === 1 ? "Remove " + studs[0].studentName + " from " + S.d.session.term.title + "?" : "Remove " + plural(studs.length, "student") + " from " + S.d.session.term.title + "?",
      desc: "They stay on the school roll but leave this term’s register, attendance and fee list for " + cls().displayName + ".", okLabel: "Remove from term", destructive: true,
      validate: function () { return enr.length ? null : (studs.length === 1 ? "This student isn’t enrolled this term." : "None of the selected students are enrolled this term."); },
      run: function () {
        enr.forEach(function (s) { s.enrolled = false; s.termFormId = null; });
        S.sel = {}; S.selectMode = false;
        var skipped = studs.length - enr.length;
        return { toast: ["Removed from term", plural(enr.length, "student") + " removed" + (skipped ? " · " + skipped + " already not enrolled" : "")] };
      } });
  }
  function openDelete(id) {
    var f = findStudent(id); if (!f) return;
    var s = f.s;
    confirmDlg({ title: "Delete " + s.studentName + "?", desc: "This permanently deletes the student record and their charges. This can’t be undone.", okLabel: "Delete student", destructive: true,
      run: function () {
        if (chargesOf(id).some(function (c) { return c.amountPaid > 0; })) return { error: "Can’t delete " + s.studentName + " — payments are recorded against this student. Remove them from the current term instead." };
        S.d.rosters[f.classId] = S.d.rosters[f.classId].filter(function (x) { return x.id !== id; });
        S.d.charges[f.classId] = S.d.charges[f.classId].filter(function (c) { return c.studentId !== id; });
        delete S.sel[id];
        S.drawers = S.drawers.filter(function (dr) { return !(dr.kind === "student" && dr.id === id); });
        return { toast: ["Student deleted", s.studentName + " was removed from " + cls(f.classId).displayName], focus: "#r-search" };
      } });
  }
  function openAdmission(ids) {
    openDialog({ kind: "admission", ids: ids, draft: { value: "RETURNING" },
      run: function (d) {
        d.ids.forEach(function (i) { var f = findStudent(i); if (f) f.s.admissionStatus = d.draft.value; });
        S.sel = {}; S.selectMode = false;
        return { toast: ["Admission status updated", plural(d.ids.length, "student") + " set to " + ADM[d.draft.value] + " · fees reconciled"] };
      } }, "#adm-RETURNING");
  }
  function moveStudents(ids, dest) {
    var src = S.classId, dc = cls(dest);
    var moved = S.d.rosters[src].filter(function (s) { return ids.indexOf(s.id) >= 0; });
    S.d.rosters[src] = S.d.rosters[src].filter(function (s) { return ids.indexOf(s.id) < 0; });
    S.d.rosters[dest] = S.d.rosters[dest].concat(moved);
    var mc = S.d.charges[src].filter(function (c) { return ids.indexOf(c.studentId) >= 0; });
    S.d.charges[src] = S.d.charges[src].filter(function (c) { return ids.indexOf(c.studentId) < 0; });
    mc.forEach(function (c) { c.stream = dc.stream; });
    S.d.charges[dest] = S.d.charges[dest].concat(mc);
    ids.forEach(function (i) { delete S.sel[i]; });
    return moved.length;
  }
  function openMove(ids, dest) {
    openDialog({ kind: "move", ids: ids, draft: { dest: dest || "" }, refreshing: false,
      validate: function (d) { if (!d.draft.dest) return "Choose a destination class."; if (d.ids.length > 100) return "Move 1–100 students at a time."; return null; },
      run: function (d) {
        var n = moveStudents(d.ids, d.draft.dest);
        S.selectMode = false; S.moveDest = "";
        S.drawers = S.drawers.filter(function (dr) { return !(dr.kind === "student" && d.ids.indexOf(dr.id) >= 0); });
        return { toast: ["Moved to " + cls(d.draft.dest).displayName, plural(n, "student") + " moved from " + cls().displayName], focus: "#r-search" };
      } }, "#mv-dest");
  }
  function openImport() {
    openDialog({ kind: "import", picked: {},
      validate: function (d) { return Object.keys(d.picked).some(function (k) { return d.picked[k]; }) ? null : "Select at least one subject."; },
      run: function (d) {
        var names = availableImports().filter(function (t) { return d.picked[t]; });
        names.forEach(function (t) { subjects().push({ id: S.classId + "-sub-i" + (S.seq++), title: t, description: "", assessments: [] }); });
        return { toast: ["Subjects imported", plural(names.length, "subject") + " added to " + cls().displayName] };
      } }, "#imp-0");
  }
  function openDups() {
    var d = { kind: "dups", phase: "checking" };
    openDialog(d, ".r-dialog [data-act=dlg-cancel]");
    later(600, function () { if (S.dialog === d) { d.phase = "done"; render(); } });
  }
  function openMerge(key) {
    openDialog({ kind: "merge", g: key,
      run: function (d) {
        var cid = S.classId, g = (S.d.duplicates[cid] || []).filter(function (x) { return x.key === d.g; })[0];
        if (!g) return { error: "This duplicate group no longer exists." };
        var dup = g.members.filter(function (m) { return !m.recommended; })[0], surv = g.members.filter(function (m) { return m.recommended; })[0];
        S.d.rosters[cid] = S.d.rosters[cid].filter(function (s) { return s.id !== dup.id; });
        Object.keys(S.d.charges).forEach(function (k) { S.d.charges[k].forEach(function (c) { if (c.studentId === dup.id) c.studentId = surv.id; }); });
        sessions().forEach(function (s) {
          var hasSurv = s.records.some(function (r) { return r.studentId === surv.id; });
          s.records = s.records.filter(function (r) { return !(r.studentId === dup.id && hasSurv); });
          s.records.forEach(function (r) { if (r.studentId === dup.id) r.studentId = surv.id; });
        });
        S.d.duplicates[cid] = S.d.duplicates[cid].filter(function (x) { return x.key !== g.key; });
        delete S.sel[dup.id];
        S.drawers = S.drawers.filter(function (dr) { return !(dr.kind === "student" && dr.id === dup.id); });
        return { toast: ["Duplicate merged", g.toMove.attendance + " attendance, " + plural(g.toMove.charges, "charge") + " and " + plural(g.toMove.termForms, "term form") + " moved to the surviving record"], focus: "#r-search" };
      } });
  }
  function openEdit(id) {
    var f = findStudent(id); if (!f) return;
    var s = f.s;
    openDialog({ kind: "edit", id: id, errs: {}, draft: { name: s.name, surname: s.surname, otherName: s.otherName, gender: s.gender, dob: s.dob, guardian: s.guardian, guardianPhone: s.guardianPhone },
      validate: function (d) { d.errs = {}; if (!d.draft.name.trim()) d.errs.name = "Enter a first name."; if (!d.draft.surname.trim()) d.errs.surname = "Enter a surname."; return Object.keys(d.errs).length ? "Fix the highlighted fields." : null; },
      run: function (d) {
        var g = findStudent(d.id); if (!g) return { error: "This student no longer exists." };
        var x = d.draft; Object.assign(g.s, { name: x.name.trim(), surname: x.surname.trim(), otherName: x.otherName.trim(), gender: x.gender, dob: x.dob, guardian: x.guardian.trim(), guardianPhone: x.guardianPhone.trim() });
        g.s.studentName = g.s.name + " " + g.s.surname;
        chargesOf(g.s.id).forEach(function (c) { c.studentName = g.s.studentName; });
        return { toast: ["Student updated", g.s.studentName] };
      } }, "#ed-name");
  }

  /* ---------------- menus ---------------- */
  function openMenu(kind, btn, id) {
    if (S.menu && S.menu.kind === kind && (S.menu.id || "") === (id || "")) { S.menu = null; render(); return; }
    var sheet = HOST.querySelector(".r-sheet"), hr = sheet.getBoundingClientRect(), r = btn.getBoundingClientRect();
    var m = { kind: kind, id: id || null, trigger: selFor(btn) };
    var below = hr.bottom - r.bottom, above = r.top - hr.top;
    if (below < 280 && above > below) m.bottom = Math.round(hr.bottom - r.top + 4); else m.top = Math.round(r.bottom - hr.top + 4);
    if (r.left - hr.left + r.width / 2 > hr.width / 2) m.right = Math.max(8, Math.round(hr.right - r.right)); else m.left = Math.max(8, Math.round(r.left - hr.left));
    m.maxH = Math.round((m.top != null ? below : above) - 16);
    S.menu = m;
    S.pendingFocus = kind === "att-settings" ? ".r-pop .tabs-trigger[aria-checked=true]" : ".r-pop .menu-item:not([disabled])";
    render();
  }
  function mi(act, icon, text, attrs, o) {
    o = o || {};
    var role = o.checked != null ? 'role="menuitemcheckbox" aria-checked="' + o.checked + '"' : o.radio != null ? 'role="menuitemradio" aria-checked="' + o.radio + '"' : 'role="menuitem"';
    var mark = (o.checked || o.radio) ? '<span class="menu-shortcut">' + ic("check", 14) + "</span>" : "";
    return '<button type="button" class="menu-item' + (o.danger ? " is-destructive" : "") + '" ' + role + ' data-act="' + act + '" ' + (attrs || "") + (o.disabled ? " disabled" : "") + ">" + (icon ? ic(icon) : '<span class="r-mipad"></span>') + "<span>" + text + "</span>" + mark + "</button>";
  }
  function menuHtml() {
    var m = S.menu; if (!m) return "";
    var pos = ["top", "bottom", "left", "right"].filter(function (k) { return m[k] != null; }).map(function (k) { return k + ":" + m[k] + "px"; }).join(";") + ";max-height:" + Math.max(160, m.maxH) + "px";
    var inner = "", label = "", extra = "";
    if (m.kind === "classes") {
      label = "Switch classroom";
      inner = '<div class="menu-label">' + esc(S.d.session.term.title) + " · " + esc(S.d.session.title) + "</div>" + S.d.classrooms.map(function (c) {
        return mi("class", null, '<span dir="auto">' + esc(c.displayName) + '</span><small class="r-micount tnum">' + S.d.rosters[c.id].length + "</small>", 'data-id="' + c.id + '"', { radio: c.id === S.classId });
      }).join("") + '<div class="menu-sep"></div>' + mi("sim-error", "triangle-alert", '<span class="r-sub-i">Prototype: show load error</span>');
    } else if (m.kind === "show") {
      label = "Columns";
      inner = '<div class="menu-label">Show columns</div>' + [["att", "Attendance today"], ["bal", "Balance"], ["adm", "Admission"], ["guard", "Guardian"]].map(function (c) { return mi("show-col", null, c[1], 'data-c="' + c[0] + '"', { checked: !!S.cols[c[0]] }); }).join("");
    } else if (m.kind === "sort") {
      label = "Sort";
      inner = '<div class="menu-label">Sort by</div>' + [["name", "Name"], ["gender", "Gender"], ["dob", "Date of birth"], ["created", "Recently added"]].map(function (c) { return mi("sort", null, c[1], 'data-s="' + c[0] + '"', { radio: S.sort === c[0] }); }).join("");
    } else if (m.kind === "more") {
      label = "Register actions";
      inner = mi("dups", "users", "Review duplicates") + mi("export-students", "download", "Export CSV") + '<div class="menu-sep"></div>' + mi("select-mode", "square-check", S.selectMode ? "Exit selection" : "Select students");
    } else if (m.kind === "row") {
      var f = findStudent(m.id); if (!f) return "";
      var s = f.s, b = balanceOf(s.id), inDrawer = top() && top().kind === "student" && top().id === s.id;
      label = "Actions for " + s.studentName;
      inner = mi("assistant", "sparkles", "Ask assistant", 'data-id="' + s.id + '"') + (inDrawer ? "" : mi("open-student", "eye", "View details", 'data-id="' + s.id + '"')) +
        (b.out > 0 ? mi("pay", "hand-coins", "Record payment", 'data-id="' + s.id + '"') : "") +
        (canManage() ? '<div class="menu-sep"></div>' + (inDrawer ? "" : mi("edit-student", "pencil", "Edit information", 'data-id="' + s.id + '"')) + (s.enrolled ? mi("remove-term", "user-x", "Remove from current term", 'data-id="' + s.id + '"') : "") + mi("delete-student", "trash-2", "Delete student", 'data-id="' + s.id + '"', { danger: true }) : "");
    } else if (m.kind === "att-rest") {
      label = "Bulk marking";
      var dot = function (k) { return '<span class="r-mdot r-dot-' + k + '"></span>'; };
      inner = '<div class="menu-label">Mark the rest as</div>' + ["PRESENT", "ABSENT", "LATE"].map(function (k) { return mi("mark-rest", null, dot(k.toLowerCase()) + STL[k], 'data-st="' + k + '"'); }).join("") +
        '<div class="menu-sep"></div><div class="menu-label">Mark all as</div>' + ["PRESENT", "ABSENT", "LATE"].map(function (k) { return mi("mark-all", null, dot(k.toLowerCase()) + STL[k], 'data-st="' + k + '"'); }).join("") +
        '<div class="menu-sep"></div>' + mi("clear-all", "x", "Clear all", "", { danger: true });
    } else if (m.kind === "att-settings") {
      var a = S.att; if (!a) return "";
      label = "Session settings"; extra = " r-panel";
      inner = '<div class="r-panelbody"><div class="field"><span class="label" id="att-type-l">Attendance type</span><div class="tabs-list r-full" role="radiogroup" aria-labelledby="att-type-l">' + [["GENERAL", "General class"], ["SUBJECT", "Subject"]].map(function (o) {
        return '<button type="button" role="radio" class="tabs-trigger" id="att-type-' + o[0] + '" aria-checked="' + (a.type === o[0]) + '" aria-selected="' + (a.type === o[0]) + '" data-act="att-type" data-v="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div></div>" +
        (a.type === "SUBJECT" ? field("att-subject", "Subject", '<select class="select" id="att-subject" data-in="att" data-f="subject" data-rr><option value="">Choose subject…</option>' + subjects().map(function (s) { return "<option" + (s.title === a.subject ? " selected" : "") + ">" + esc(s.title) + "</option>"; }).join("") + "</select>") : "") +
        field("att-title", "Session title", '<input class="input" id="att-title" dir="auto" data-in="att" data-f="title" value="' + esc(a.title) + '">') +
        field("att-period", "Period / time", '<input class="input" id="att-period" data-in="att" data-f="period" placeholder="e.g. Period 2 or 9:00" value="' + esc(a.period) + '">', null, true) +
        field("att-date2", "Date", '<input class="input" type="date" id="att-date2" max="' + TODAY + '" data-in="att" data-f="date" data-rr value="' + a.date + '">') +
        (canManage() ? '<div class="menu-sep"></div>' + mi("att-add-student", "user-plus", "Add student to class") : "") + "</div>";
    } else if (m.kind === "subj-more") {
      label = "Subject actions";
      var n = availableImports().length;
      inner = mi("import-open", "download", n ? "Import from catalog (" + n + ")" : "Catalog subjects all attached", "", { disabled: !n });
    } else if (m.kind === "subj-row") {
      label = "Subject actions";
      inner = mi("open-subject", "book-open", "Open", 'data-id="' + m.id + '"') + (isAdmin() ? '<div class="menu-sep"></div>' + mi("del-subject", "trash-2", "Delete subject", 'data-id="' + m.id + '"', { danger: true }) : "");
    } else if (m.kind === "rec-sub") {
      label = "Record submission";
      inner = '<div class="menu-label">Open the recorder with</div>' + [["Full", "Full access", "All classes and subjects"], ["Classroom", "Classroom scope", "This class, every subject"], ["Subject", "Subject scope", "This subject only"]].map(function (o) {
        return mi("record-sub", null, '<span class="r-mi2"><span>' + o[1] + "</span><small>" + o[2] + "</small></span>", 'data-scope="' + o[0] + '"');
      }).join("");
    }
    return '<div class="popover r-pop' + extra + '" role="' + (m.kind === "att-settings" ? "dialog" : "menu") + '" aria-label="' + esc(label) + '" style="' + pos + '">' + inner + "</div>";
  }

  /* ---------------- actions ---------------- */
  function switchClass(id) {
    S.classId = id; S.drawers = []; S.att = null; S.dialog = null; S.sel = {}; S.selectMode = false; S.subjAdd = null; S.search = ""; S.filter = "all"; S.visible = 20; S.moveDest = "";
    S.loading = true; S.dupCheck = "checking"; S.error = false; S.pendingFocus = "#r-switch";
    render();
    later(400, function () { S.loading = false; render(); later(600, function () { S.dupCheck = "done"; render(); }); });
  }
  function setView(v) { S.view = v; S.menu = null; syncUrl(); S.pendingFocus = "#seg-" + v; render(); }
  function closeSheet() {
    S.closed = true; S.menu = null; applyClosed();
  }
  function applyClosed() {
    var stage = document.getElementById("stage");
    var old = stage && stage.querySelector(".r-reopen");
    if (!S.closed) { HOST.style.transform = ""; HOST.style.visibility = ""; if (old) old.remove(); return; }
    HOST.style.transform = "translateX(105%)";
    later(300, function () { if (S.closed) HOST.style.visibility = "hidden"; });
    if (stage && !old) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn btn-default r-reopen";
      b.innerHTML = ic("panel-right") + "<span>Open " + esc(cls().displayName) + "</span>";
      b.onclick = function () { S.closed = false; applyClosed(); S.pendingFocus = "#r-switch"; render(); };
      stage.appendChild(b); b.focus();
    }
  }
  function toggleSel(id) { if (S.sel[id]) delete S.sel[id]; else S.sel[id] = true; S.selectMode = true; }

  function act(a, t, e) {
    var id = t.dataset.id, dr = top(), d = S.dialog, name;
    switch (a) {
      case "view": setView(t.dataset.v); return;
      case "menu": openMenu(t.dataset.menu, t, id); return;
      case "close-sheet": closeSheet(); return;
      case "class": if (id !== S.classId) switchClass(id); else render(); return;
      case "sim-error": S.error = true; S.drawers = []; render(); return;
      case "retry": S.error = false; S.loading = true; render(); later(500, function () { S.loading = false; render(); }); return;
      case "filter": S.filter = (S.filter === t.dataset.f && t.dataset.f !== "all") ? "all" : t.dataset.f; S.visible = 20; render(); return;
      case "clear-filters": S.filter = "all"; S.search = ""; S.pendingFocus = "#r-search"; render(); return;
      case "row":
        if (e.target.closest("input,button,select,textarea,a")) return;
        /* falls through */
      case "open-student":
        if (S.view === "register" && S.selectMode && !t.closest(".r-drawer") && !t.closest(".r-pop")) { toggleSel(id); render(); return; }
        openDrawer({ kind: "student", id: id, tab: "overview" }, !t.closest(".r-drawer")); S.moveDest = ""; render(); return;
      case "sel": toggleSel(id); render(); return;
      case "sel-all": {
        var l = filteredRoster(), all = l.every(function (s) { return S.sel[s.id]; });
        if (all && t.type === "checkbox") S.sel = {}; else l.forEach(function (s) { S.sel[s.id] = true; });
        S.selectMode = true; render(); return;
      }
      case "select-mode": S.selectMode = !S.selectMode; if (!S.selectMode) S.sel = {}; render(); return;
      case "bulk-clear": S.sel = {}; S.selectMode = false; S.pendingFocus = "#r-more"; render(); return;
      case "bulk-export": exportStudents(selIds().map(function (i) { return findStudent(i).s; }), "selected"); return;
      case "bulk-admission": if (canManage()) { openAdmission(selIds()); render(); } return;
      case "bulk-move": if (canManage()) { openMove(selIds()); render(); } return;
      case "bulk-remove": if (canManage()) { openRemove(selIds()); render(); } return;
      case "assistant":
        if (t.dataset.bulk) toast("Assistant opened", plural(selIds().length, "student") + " attached as context");
        else { name = (findStudent(id) || { s: { studentName: "Student" } }).s.studentName; toast("Assistant opened", name + " is attached as context"); }
        render(); return;
      case "show-col": S.cols[t.dataset.c] = !S.cols[t.dataset.c]; S.menu = lastMenu; S.pendingFocus = '.r-pop [data-c="' + t.dataset.c + '"]'; render(); return;
      case "sort": S.sort = t.dataset.s; S.pendingFocus = "#r-sort"; render(); return;
      case "dups": openDups(); render(); return;
      case "merge": openMerge(t.dataset.g); if (d && d.kind === "dups") S.dialog.back = d.back; render(); return;
      case "export-students": exportStudents(filteredRoster(), S.filter === "all" && !S.search ? "whole class" : "current filter"); render(); return;
      case "new-student": case "att-add-student": if (canManage()) { openNew(); render(); } return;
      case "pay": openDrawer({ kind: "pay", draft: { sid: id || "", amount: "", method: "Cash", date: TODAY, ref: "" }, err: null, saving: false }, !t.closest(".r-drawer")); S.pendingFocus = id ? "#pay-amt" : "#pay-sid"; render(); return;
      case "pay-full": if (dr && dr.kind === "pay") { dr.draft.amount = String(balanceOf(dr.draft.sid).out); S.pendingFocus = "#pay-amt"; render(); } return;
      case "st-tab": case "sj-tab": if (dr) { dr.tab = t.dataset.t; S.pendingFocus = "#" + a + "-" + dr.tab; render(); } return;
      case "report-card": name = (findStudent(id) || { s: { studentName: "Student" } }).s.studentName; toast("Report card", "Opens " + name + "’s " + S.d.session.term.title + " report card in a new tab"); return;
      case "edit-student": if (canManage()) { openEdit(id); render(); } return;
      case "remove-term": if (canManage()) { openRemove([id]); render(); } return;
      case "delete-student": if (canManage()) { openDelete(id); render(); } return;
      case "move-one": if (canManage()) { openMove([id], S.moveDest); render(); } return;

      /* attendance */
      case "att-start": startAttendance(); render(); return;
      case "att-cancel": {
        var n = S.att ? Object.keys(S.att.marks).length : 0;
        if (n && !S.att.correctId) { confirmDlg({ title: "Discard this register?", desc: plural(n, "mark") + (n === 1 ? " hasn’t" : " haven’t") + " been saved.", okLabel: "Discard", destructive: true, delay: 0, run: function () { exitAttendance(); return { focus: ".r-take" }; } }); render(); }
        else { exitAttendance(); if (!S.drawers.length) S.pendingFocus = ".r-take"; render(); }
        return;
      }
      case "att-day": { var nd = addDays(S.att.date, Number(t.dataset.d)); if (nd <= TODAY) S.att.date = nd; render(); return; }
      case "att-cal": { var inp2 = HOST.querySelector("#att-date"); try { inp2.showPicker(); } catch (x) { openMenu("att-settings", HOST.querySelector("#att-settings")); } return; }
      case "mark": {
        var cur = S.att.marks[id], st = t.dataset.st;
        if (cur === st) delete S.att.marks[id]; else S.att.marks[id] = st;
        S.att.error = null; render(); return;
      }
      case "mark-rest": enrolled().forEach(function (s) { if (!S.att.marks[s.id]) S.att.marks[s.id] = t.dataset.st; }); S.att.error = null; S.pendingFocus = "#att-rest"; render(); return;
      case "mark-all": enrolled().forEach(function (s) { S.att.marks[s.id] = t.dataset.st; }); S.att.error = null; S.pendingFocus = "#att-rest"; render(); return;
      case "clear-all": S.att.marks = {}; S.pendingFocus = "#att-rest"; render(); return;
      case "att-type": {
        var at = S.att; at.type = t.dataset.v;
        if (at.type === "GENERAL") { if (at.title === at.subject) at.title = "Daily attendance"; at.subject = ""; }
        S.pendingFocus = "#att-type-" + at.type; render(); return;
      }
      case "att-save": saveAttendance(); return;

      /* records */
      case "export-att": exportAttendance(); return;
      case "open-session": openDrawer({ kind: "session", id: id }, !t.closest(".r-drawer")); render(); return;
      case "del-session": {
        if (!isAdmin()) return;
        var ss = sessions().filter(function (x) { return x.id === id; })[0]; if (!ss) return;
        confirmDlg({ title: "Delete attendance session?", desc: ss.title + " · " + fmtDay(ss.date) + " — " + plural(ss.records.length, "record") + " will be removed.", okLabel: "Delete session", destructive: true,
          run: function () { S.d.attendanceSessions[S.classId] = sessions().filter(function (x) { return x.id !== id; }); S.drawers = S.drawers.filter(function (x) { return !(x.kind === "session" && x.id === id); }); return { toast: ["Session deleted", ss.title + " · " + fmtDay(ss.date)] }; } });
        render(); return;
      }
      case "correct-session": {
        var cs = sessions().filter(function (x) { return x.id === id; })[0]; if (!cs) return;
        var marks = {}, rem = {};
        cs.records.forEach(function (r) { marks[r.studentId] = r.status; if (r.remarks) rem[r.studentId] = r.remarks; });
        S.drawers = []; S.view = "register"; S.filter = "all"; S.search = ""; S.selectMode = false; S.sel = {}; S.visible = 60;
        S.att = { type: cs.type, title: cs.title, subject: cs.subject || "", period: cs.period || "", date: cs.date, marks: marks, remarks: rem, error: null, saving: false, correctId: cs.id };
        S.pendingFocus = "#att-settings"; syncUrl(); render(); return;
      }

      /* subjects */
      case "subj-add": S.subjAdd = { name: "", desc: "", error: null, saving: false }; S.pendingFocus = "#sa-name"; render(); return;
      case "subj-add-cancel": S.subjAdd = null; S.pendingFocus = '[data-act="subj-add"]'; render(); return;
      case "import-open": openImport(); render(); return;
      case "imp-all": availableImports().forEach(function (x) { d.picked[x] = true; }); d.error = null; render(); return;
      case "imp-clear": d.picked = {}; render(); return;
      case "open-subject": openDrawer({ kind: "subject", id: id, tab: "assess" }, !t.closest(".r-drawer")); render(); return;
      case "del-subject": {
        if (!isAdmin()) return;
        var sb = subjects().filter(function (x) { return x.id === id; })[0]; if (!sb) return;
        confirmDlg({ title: "Delete " + sb.title + "?", desc: "Removes the subject and its " + plural(sb.assessments.length, "assessment") + " from " + cls().displayName + ".", okLabel: "Delete subject", destructive: true,
          run: function () { S.d.subjects[S.classId] = subjects().filter(function (x) { return x.id !== id; }); S.drawers = S.drawers.filter(function (x) { return !(x.kind === "subject" && x.id === id); }); return { toast: ["Subject deleted", sb.title] }; } });
        render(); return;
      }
      case "record-sub": toast("Opens assessment recording (" + t.dataset.scope + " scope) in a new tab", dr && dr.kind === "subject" ? (subjects().filter(function (x) { return x.id === dr.id; })[0] || {}).title : ""); render(); return;
      case "as-new": if (dr) { openAssess(dr.id, null); render(); } return;
      case "as-edit": if (dr) { openAssess(dr.id, id); render(); } return;
      case "as-suggest": {
        var sub = subjects().filter(function (x) { return x.id === dr.id; })[0], sg = S.d.assessmentSuggestions[Number(t.dataset.i)];
        if (sub && sg) { sub.assessments.push({ id: "a" + (S.seq++) + "q", title: sg.title, obtainable: sg.obtainable, weight: sg.weight, submissions: 0, print: true, children: [] }); toast("Assessment added", sg.title + " · /" + sg.obtainable + " · " + sg.weight + "%"); }
        render(); return;
      }
      case "as-move": {
        var sm = subjects().filter(function (x) { return x.id === dr.id; })[0], i = Number(t.dataset.i), j = i + Number(t.dataset.d);
        if (sm && j >= 0 && j < sm.assessments.length) { var tmp = sm.assessments[i]; sm.assessments[i] = sm.assessments[j]; sm.assessments[j] = tmp; S.pendingFocus = "#" + (t.dataset.d === "-1" ? "asu-" : "asd-") + tmp.id; if (j === 0 || j === sm.assessments.length - 1) S.pendingFocus = "#" + (t.dataset.d === "-1" ? "asd-" : "asu-") + tmp.id; }
        render(); return;
      }
      case "as-del": {
        var sd = subjects().filter(function (x) { return x.id === dr.id; })[0], ad = sd && sd.assessments.filter(function (x) { return x.id === id; })[0]; if (!ad) return;
        confirmDlg({ title: "Delete " + ad.title + "?", desc: "Its " + plural(ad.submissions || 0, "submission") + " and weight (" + ad.weight + "%) are removed from " + sd.title + ".", okLabel: "Delete assessment", destructive: true,
          run: function () { sd.assessments = sd.assessments.filter(function (x) { return x.id !== id; }); return { toast: ["Assessment deleted", ad.title], focus: '[data-act="as-new"]' }; } });
        render(); return;
      }
      case "as-pm": d.draft.printMode = t.dataset.v; S.pendingFocus = "#as-pm-" + t.dataset.v; render(); return;
      case "as-kid-add": d.draft.children.push({ title: "", obtainable: "", weight: "" }); S.pendingFocus = "#asc-" + (d.draft.children.length - 1) + "-t"; render(); return;
      case "as-kid-del": d.draft.children.splice(Number(t.dataset.i), 1); render(); return;
      case "mv-refresh": d.refreshing = true; render(); later(500, function () { if (S.dialog === d) { d.refreshing = false; S.pendingFocus = "#mv-dest"; render(); toast("Destinations refreshed", (S.d.classrooms.length - 1) + " classes available"); } }); return;

      /* dialogs & drawers */
      case "dlg-ok": dlgOk(); return;
      case "dlg-cancel": if (d && !d.saving) closeDialog(); return;
      case "drawer-back": popDrawer(); render(); return;
      case "drawer-close-all": closeDrawers(); render(); return;
      case "ns-parent": dr.parentOpen = !dr.parentOpen; S.pendingFocus = '[data-act="ns-parent"]'; render(); return;
      case "ns-retry": dr.feeState = "loading"; render(); later(500, function () { dr.feeState = "ok"; dr.draft.fees = S.d.feePreview.map(function (f) { var o = dr.draft.fees.filter(function (x) { return x.title === f.title; })[0]; return { title: f.title, amount: f.amount, add: o ? o.add : true }; }); render(); }); return;
      case "ns-new": { var nd2 = { kind: "new", phase: "form", draft: nsDraft(), errs: {}, parentOpen: false, feeState: "ok", saving: false, result: null, back: dr.back }; S.drawers[S.drawers.length - 1] = nd2; S.pendingFocus = "#ns-first"; render(); return; }
      case "ns-receipt": toast("Receipt", "Opens the receipt for " + dr.result.name + " in a new tab"); return;
      case "ns-apply": { var sid = dr.result.id, back = dr.back; S.drawers.pop(); var pd = { kind: "pay", draft: { sid: sid, amount: "", method: "Cash", date: TODAY, ref: "" }, err: null, saving: false }; S.drawers.push(pd); pd.back = back; S.pendingFocus = "#pay-amt"; render(); return; }
    }
  }

  function onClick(e) {
    e.__rHandled = true;
    if (!S || S.closed) return;
    var t = e.target.closest("[data-act]");
    var inPop = e.target.closest(".r-pop");
    lastMenu = null;
    if (S.menu && !inPop) {
      var same = t && t.dataset.act === "menu" && t.dataset.menu === S.menu.kind && (t.dataset.id || null) === (S.menu.id || null);
      var trig = S.menu.trigger;
      S.menu = null;
      if (same || !t) { if (same) S.pendingFocus = trig; render(); return; }
    }
    if (!t || !HOST.contains(t) || t.disabled) return;
    var fromMenu = null;
    if (inPop && t.classList.contains("menu-item")) { lastMenu = S.menu; fromMenu = S.menu && S.menu.trigger; S.menu = null; }
    lastTrigger = fromMenu || selFor(t);
    if (fromMenu) S.pendingFocus = fromMenu;
    act(t.dataset.act, t, e);
  }

  function onInput(e) {
    var el = e.target, k = el.dataset && el.dataset.in; if (!k) return;
    var isText = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && ["checkbox", "radio", "date"].indexOf(el.type) < 0);
    if (e.type === "input" && !isText) return;
    if (e.type === "change" && isText) { if (el.hasAttribute("data-rr")) render(); return; }
    var v = el.type === "checkbox" ? el.checked : el.value, rr = el.hasAttribute("data-rr") && e.type === "change", dr = top(), d = S.dialog;
    switch (k) {
      case "search": S.search = v; S.visible = 20; render(); return;
      case "remark": if (S.att) S.att.remarks[el.dataset.id] = v; return;
      case "att": {
        var a = S.att; if (!a) return;
        if (el.dataset.f === "subject") { var prev = a.subject; a.subject = v; if (!a.title || a.title === "Daily attendance" || a.title === prev) a.title = v || "Daily attendance"; }
        else if (el.dataset.f === "date") { if (v && v <= TODAY) a.date = v; }
        else a[el.dataset.f] = v;
        if (rr) render();
        return;
      }
      case "draft": if (dr && dr.draft) { dr.draft[el.dataset.f] = v; if (dr.errs && dr.errs[el.dataset.f] && v) { delete dr.errs[el.dataset.f]; el.setAttribute("aria-invalid", "false"); } if (dr.kind === "pay") dr.err = null; if (rr) render(); } return;
      case "fee": if (dr && dr.draft) { dr.draft.fees[Number(el.dataset.i)].add = v; render(); } return;
      case "mv-dest": S.moveDest = v; return;
      case "sa": if (S.subjAdd) { S.subjAdd[el.dataset.f] = v; if (S.subjAdd.error && v) { S.subjAdd.error = null; el.setAttribute("aria-invalid", "false"); var er = HOST.querySelector("#sa-err"); if (er) er.remove(); } } return;
      case "dlg": if (d && d.draft) {
        d.draft[el.dataset.f] = el.type === "radio" ? el.value : v; d.error = null;
        if (el.dataset.f === "split" && v && !d.draft.children.length) d.draft.children = [{ title: "", obtainable: "", weight: d.draft.weight || "" }, { title: "", obtainable: "", weight: "" }];
        if (rr || el.type === "checkbox") render();
      } return;
      case "child": if (d && d.draft) { d.draft.children[Number(el.dataset.i)][el.dataset.f] = v; } return;
      case "imp": if (d) { d.picked[el.dataset.name] = v; d.error = null; render(); } return;
      case "score": onScore(el); return;
    }
  }

  function onSubmit(e) {
    var f = e.target.closest("form[data-form]"); if (!f) return;
    e.preventDefault();
    var k = f.dataset.form, dr = top();
    if (k === "subj-add") {
      var sa = S.subjAdd; if (!sa || sa.saving) return;
      if (!sa.name.trim()) { sa.error = "Enter a subject name."; S.pendingFocus = "#sa-name"; render(); return; }
      if (subjects().some(function (s) { return s.title.toLowerCase() === sa.name.trim().toLowerCase(); })) { sa.error = sa.name.trim() + " is already in this class."; S.pendingFocus = "#sa-name"; render(); return; }
      sa.saving = true; render();
      later(400, function () {
        if (S.subjAdd !== sa) return;
        subjects().push({ id: S.classId + "-sub-n" + (S.seq++), title: sa.name.trim(), description: sa.desc.trim(), assessments: [] });
        toast("Subject added", sa.name.trim());
        S.subjAdd = { name: "", desc: "", error: null, saving: false }; S.pendingFocus = "#sa-name"; render();
      });
    } else if (k === "ns" && dr && dr.kind === "new" && !dr.saving) saveNew(dr);
    else if (k === "pay" && dr && dr.kind === "pay" && !dr.saving) savePay(dr);
  }

  function onKey(e) {
    if (!S || !HOST || S.closed) return;
    if (e.key === "Escape") {
      if (S.menu) { var tr = S.menu.trigger; S.menu = null; S.pendingFocus = tr; render(); e.preventDefault(); return; }
      if (S.dialog) { if (!S.dialog.saving) closeDialog(); e.preventDefault(); return; }
      if (S.drawers.length) { popDrawer(); render(); e.preventDefault(); return; }
      return;
    }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && e.target.closest && e.target.closest(".r-pop") && e.target.classList.contains("menu-item")) {
      var items = Array.prototype.slice.call(HOST.querySelectorAll(".r-pop .menu-item:not([disabled])")), i = items.indexOf(e.target);
      if (items.length) { e.preventDefault(); items[e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length].focus(); }
    }
    if (e.key === "Enter" && e.target.dataset && e.target.dataset.in === "remark") e.preventDefault();
  }

  function bind(host) {
    if (!host.__rBound) {
      host.__rBound = true;
      host.addEventListener("click", onClick);
      host.addEventListener("input", onInput);
      host.addEventListener("change", onInput);
      host.addEventListener("submit", onSubmit);
      host.addEventListener("wheel", function (e) { if (S && S.menu && !e.target.closest(".r-pop")) { S.menu = null; render(); } }, { passive: true });
    }
    if (!docBound) {
      docBound = true;
      document.addEventListener("keydown", onKey);
      document.addEventListener("click", function (e) { if (e.__rHandled) return; if (S && S.menu && HOST && !HOST.contains(e.target)) { S.menu = null; render(); } });
    }
  }

  function boot() {
    S.loading = true; S.dupCheck = "checking";
    later(600, function () { S.loading = false; render(); later(700, function () { S.dupCheck = "done"; render(); }); });
  }

  var COVERAGE = {
    H1: "Large class name is the switcher (chevron menu with counts); switching keeps the view, clears drawers, attendance in progress, selection and drafts",
    H2: "Muted context line under the name: First Term · 2026/2027",
    H3: "Class name is the sheet title (and the switcher)",
    H4: "Fixed: no header stats. Student count, today’s attendance and outstanding appear once, as filters in the register strip; Class average moves to Records › Performance",
    H5: "3-way segmented control Register | Subjects | Records; ?classroomTab= deep-links (old values students/attendance/payments/performance map in and scroll); never blank, defaults to Register",
    H6: "Close (×) slides the sheet away with a reopen button; detail drawer covers ~85% of the sheet with scrim (desktop), full screen with Back (phone)",
    H7: "Skeleton on open and on class switch; classes menu › “Prototype: show load error” shows the error fallback with Try again",
    S1: "Register: “Checking student count and duplicate names…” line, then an amber one-liner per duplicate with Review merge; ⋯ › Review duplicates shows groups/affected totals or a calm “No duplicate names found”",
    S2: "Review-merge dialog: members, Recommended survivor badge, history score, counts, Records to move, conflicts, Cancel / Merge duplicate (disabled for Teacher); merge removes the duplicate",
    S3: "Primary “Add student” in the register toolbar opens the New student drawer",
    S4: "Register rows: avatar, name, ID · gender · admission on line 2 (Not enrolled badge); Show › Admission/Guardian adds columns (guardian + phone); DOB in the student drawer; no Class column",
    S5: "Toolbar search (name/ID, scoped to this class) + Sort menu (Name, Gender, Date of birth, Recently added); Show menu toggles columns",
    S6: "Row/name click opens the student drawer: name, class, gender, Report card, Edit, ⋯; tabs Overview (ID, class, term, gender, move-class select), Academics, Attendance, Payments",
    S7: "Row ⋯: Ask assistant, View details, Record payment; Admin/Registrar: Edit information, Remove from current term (only if enrolled), Delete student — confirm dialogs with Saving… and errors (delete is blocked when payments exist)",
    S8: "⋯ › Select students → checkboxes + bottom bulk bar: count, Select all, Deselect, Export (real CSV), Assistant; Admin/Registrar: Set admission, Move class (destination, refresh, 1–100), Remove from term; toast summaries",
    S9: "“No students” + Enroll student (empty class); “No results” + Clear filters; skeleton; “Loading more students…” sentinel loads 20 at a time",
    S10: "New student drawer: names, gender, DOB, admission, classroom (prefilled), stream, fee preview with per-fee add + Retry, amount/method/date/reference, collapsible Parent; loading line; success with received/pending, Create new / Close / View receipt or Apply payment",
    A1: "Attendance bar › title (Settings ▾): type General/Subject, session title, subject (auto-fills title), period/time",
    A2: "Bar date with ‹ › and a calendar (native picker), date also in Settings; future dates blocked",
    A3: "Settings ▾ › Add student to class (Admin/Registrar) opens the New student drawer over the recorder",
    A4: "“Mark rest ▾” menu: Mark the rest as P/A/L, Mark all as P/A/L, Clear all",
    A5: "Attendance mode: numbered rows with large P/A/L pills, tinted rows, tap again to clear, remarks only under Absent/Late; empty “No students enrolled…” state; batched rows",
    A6: "Sticky bar shows “X/Y marked” + progress line; partial save allowed; inline error if nothing marked; no per-tap toasts; Save exits the mode",
    A7: "Records › Attendance: one totals line (sessions, records, % attended (n), % absent (n)) + Export CSV",
    A8: "Records › Attendance list: title, date · subject · period · taken by, present/absent, rate bar, open; Delete for Admin only (confirm); “No attendance records yet” state",
    A9: "Session drawer: title, date, staff, subject, period, % attended, counts incl. excused/on leave, revision history, students with status + remark / “No remark”; Close, Correct session; not-found state",
    A10: "Correct session reopens the register in attendance mode prefilled with a “Correcting …” label; Cancel / Save correction adds a “Corrected” history entry",
    U1: "Subjects › Add subject reveals an inline Name/Description form; empty name shows an error; duplicate guard; resets after save",
    U2: "Subjects ⋯ › Import from catalog (only when unattached exist): checkbox list, N selected, Select all / Clear all, Batch import",
    U3: "Subject list: title, assessment count, weight status badge (no filler, no “Active” badge); open on click; ⋯ Delete for Admin; empty state with working Add/Import",
    U4: "Subject drawer header: title, class, N students, one stats line (score items, submissions, weight %, grouped); tabs Assessments | Score entry",
    U5: "Assessments tab: Create, quick-add chips, result print preview line, rows (#n, weight, submissions, points/Uncapped, parts, print status, 0% warning), ↑/↓, edit, delete; child “Part n under X” rows; empty state",
    U6: "Assessment dialog: title, Split switch → Expanded/Total print mode + parts (title/obtainable/weight, add/remove, totals); else obtainable (blank = uncapped) + weight; print toggle + live warnings",
    U7: "Score entry tab: numbered students (dir=auto), one input per weighted item with “/ max” or Uncapped, red over-max, 600ms autosave indicator with saving/saved/error",
    U8: "Subject drawer › Record submission ▾ → Full / Classroom / Subject scope (simulated new-tab toast)",
    P1: "Records › Payments totals line: Billed, Received, Outstanding, % collected with x/y paid and N outstanding",
    P2: "Payments ledger sorted by outstanding: student, status badge, fee · stream, outstanding or paid, “paid ₦x”, Record (prefilled); rows open the student; empty state; register Balance cell shows the same per student",
    P3: "Records › Receive payment (primary) and every Record link open the payment drawer: student, amount (Pay full balance), method, date, reference → updates balances, totals, statuses",
    R1: "Records › Performance subsection: Coming soon (class average lives here)",
    X1: "Teacher: no Add student/Enroll, no Edit/Remove/Delete in row or drawer, bulk bar only Export + Assistant, no merge, no session delete, no subject delete (Admin only for those two)",
    X2: "Product tokens only; light + dark",
    X3: "Phone: full-width sheet, segmented control at top, cards-lite rows with Today/Balance chips, 44px P/A/L pills, full-screen drawers with Back; focus-visible rings, menus with arrow keys, Escape closes, dir=auto on names"
  };

  window.SCW.init({
    id: "03", name: "Class register",
    tagline: "One register of the class — attendance and balances inline; Subjects and Records as the only other views.",
    coverage: COVERAGE,
    mount: function (host, ctx) {
      HOST = host; CTX = ctx;
      if (!S) S = fresh();
      host.style.width = ctx.viewport === "phone" ? "" : "min(100%, 52rem)";
      bind(host);
      if (!S.booted) { S.booted = true; boot(); }
      S.menu = null;
      render();
      if (S.closed) applyClosed();
    },
    reset: function () {
      clearTimers();
      if (observer) { observer.disconnect(); observer = null; }
      var old = document.querySelector("#stage .r-reopen"); if (old) old.remove();
      S = fresh();
    }
  });
})();
