/* 02 · Timetable — signup → creation → onboarding (local simulation; nothing is sent). */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var I = function (n, s) { return SCIcons.icon(n, s || 16); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var reduced = SC.reduced();

  var TODAY = "2026-10-09"; // the sample data's "today" (week 4 of First Term)
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ORD = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
  var CODES = { k12: "K12", college: "COL", university: "UNI", vocational: "VOC", other: "OTH" };
  var SUBJECTS = ["Mathematics", "English Language", "Basic Science", "Basic Technology", "Civic Education", "Computer Studies", "Yoruba", "French"];
  var FEE_SUGG = ["PTA Levy", "Exam Fee", "ID Card", "Portal Fee"];
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Workshop pill (keeps sticky mobile actions clear of it) ---------- */
  var pill = SC.pill({ id: "02", name: "Timetable" });
  document.body.classList.add("has-ws-pill");
  var pillHide = pill && pill.querySelector("[data-ws-hide]");
  if (pillHide) pillHide.addEventListener("click", function () { document.body.classList.remove("has-ws-pill"); });

  /* ---------- State ---------- */
  var S;
  var gen = 0;       // invalidates pending timers on restart
  var subTimer = 0;
  function fresh() {
    return {
      phase: "signup", step: 0, done: [false, false, false, false],
      subAuto: true, subState: "idle", subMsg: "", touched: {}, last: {},
      creating: false, created: false, verified: false,
      ob: {
        step: 0, status: ["todo", "todo", "todo", "todo", "todo"],
        sessionSaved: false, sessionTried: false, termErr: [],
        terms: [
          { name: "First Term", start: "2026-09-14", end: "2026-12-18" },
          { name: "Second Term", start: "2027-01-11", end: "2027-04-02" },
          { name: "Third Term", start: "2027-04-26", end: "2027-07-23" },
        ],
        classes: [], streams: ["A", "B"], subjects: ["Mathematics", "English Language"], extraSubjects: [],
        fees: [{ title: "PTA Levy", type: "Required", amount: 10000 }], feesSaved: false, feeTried: false, cursor: -1,
        invites: [], access: { cls: [], subj: [] },
      },
    };
  }

  /* ---------- Helpers ---------- */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function radio(name) { var el = $('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function subVal() { return val("f-sub").toLowerCase(); }
  function typeLabel() {
    var id = radio("type");
    var t = D.institutionTypes.filter(function (x) { return x.id === id; })[0];
    return t ? t.label : "";
  }
  function parseD(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
    var p = s.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function fmtD(s) { var d = parseD(s); return d ? pad(d.getUTCDate()) + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear() : "—"; }
  function weeks(t) {
    var a = parseD(t.start), b = parseD(t.end);
    if (!a || !b || b <= a) return null;
    return Math.round(((b - a) / 864e5 + 3) / 7);
  }
  function weeksLabel(t) { var w = weeks(t); return w ? w + " wks" : "—"; }
  function parseMoney(s) { return parseInt(String(s || "").replace(/\D/g, ""), 10) || 0; }
  function fmtMoneyInput(el) {
    var digits = el.value.replace(/\D/g, "").slice(0, 10);
    var out = digits ? SC.money(parseInt(digits, 10), { noSymbol: true }) : "";
    if (el.value !== out) {
      var fromEnd = el.value.length - (el.selectionEnd == null ? el.value.length : el.selectionEnd);
      el.value = out;
      var p = Math.max(0, out.length - fromEnd);
      try { el.setSelectionRange(p, p); } catch (e) { /* not focusable */ }
    }
    return digits ? parseInt(digits, 10) : 0;
  }
  function setErr(id, msg) {
    var el = document.getElementById(id), err = document.getElementById(id + "-err");
    if (!el) return;
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    var g = el.closest(".input-group");
    if (g) g.classList.toggle("is-invalid", !!msg);
    if (err) { err.innerHTML = msg ? I("circle-alert", 14) + "<span>" + esc(msg) + "</span>" : ""; err.hidden = !msg; }
  }
  function animateIn(el) {
    if (reduced) return;
    el.classList.remove("is-entering");
    void el.offsetWidth;
    el.classList.add("is-entering");
  }
  function focusHeading(h) {
    if (!h) return;
    h.focus({ preventScroll: true });
    var top = h.getBoundingClientRect().top;
    if (top < 90 || top > window.innerHeight * 0.55) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 130), behavior: reduced ? "auto" : "smooth" });
    }
  }

  /* =====================================================================
     SIGNUP
     ===================================================================== */
  $("#tiles").innerHTML = D.institutionTypes.map(function (t) {
    var ready = t.status === "ready";
    var tone = ready ? "tag-success" : t.status === "contact" ? "tag-info" : "tag-muted";
    return '<label class="tile' + (ready ? "" : " is-disabled") + '">' +
      '<input type="radio" name="type" value="' + t.id + '"' + (ready ? " checked" : " disabled") + ">" +
      '<span class="tile-code" aria-hidden="true">' + CODES[t.id] + '</span><span class="tile-l">' + esc(t.label) + "</span>" +
      '<span class="tag ' + tone + '">' + esc(t.badge) + '</span><span class="tile-d">' + esc(t.desc) + "</span></label>";
  }).join("");

  var RULES = {
    "f-name": function (x) { if (!x) return "Enter your institution’s name."; if (x.length < 2) return "Use at least 2 characters."; return ""; },
    "f-admin": function (x) { if (!x) return "Enter your full name."; if (x.length < 2) return "Use at least 2 characters."; return ""; },
    "f-email": function (x) { if (!x) return "Enter your work email."; return EMAIL.test(x) ? "" : "Enter an email address like name@school.edu.ng."; },
    "f-phone": function (x) {
      if (!x) return "";
      var d = x.replace(/\D/g, "");
      return /^\+?[\d\s()-]+$/.test(x) && d.length >= 10 && d.length <= 15 ? "" : "Enter a phone number like +234 803 000 0000.";
    },
    "f-pass": function () {
      var x = $("#f-pass").value;
      if (!x) return "Create a password.";
      if (x.length < 8) return "Use at least 8 characters.";
      if (x.length > 128) return "Use 128 characters or fewer.";
      return "";
    },
  };

  /* ---------- Subdomain: debounced simulated check ---------- */
  function setSub(state, msg) {
    S.subState = state;
    S.subMsg = msg;
    var st = $("#sub-status");
    st.setAttribute("data-state", state);
    var icon = state === "ok" ? I("circle-check", 14) : state === "error" ? I("circle-alert", 14) : state === "checking" ? '<span class="spin">' + I("loader-circle", 14) + "</span>" : "";
    st.innerHTML = msg ? icon + "<span>" + esc(msg) + "</span>" : "";
    var bad = state === "error";
    $("#f-sub").setAttribute("aria-invalid", bad ? "true" : "false");
    $("#sub-group").classList.toggle("is-invalid", bad);
    renderManifest();
  }
  function checkNow() {
    clearTimeout(subTimer);
    var v = subVal();
    if (!v) { setSub("idle", ""); return; }
    var r = v.length > 63 ? { state: "error", msg: "Use 63 characters or fewer." } : SC.checkSubdomain(v);
    setSub(r.state, r.msg);
  }
  function scheduleCheck() {
    clearTimeout(subTimer);
    renderAddresses();
    if (!subVal()) { setSub("idle", ""); return; }
    setSub("checking", "Checking availability…");
    subTimer = setTimeout(checkNow, 350);
  }
  function renderAddresses() {
    var v = subVal();
    var part = v ? "<b>" + esc(v) + "</b>" : '<span class="ph">yourschool</span>';
    $("#addr-site").innerHTML = part + ".school-clerk.com";
    $("#addr-dash").innerHTML = "dashboard." + part + ".school-clerk.com";
  }
  function suggestSub() {
    var name = val("f-name");
    if (!name || !(S.subAuto || !subVal())) return;
    var s = SC.slugify(name);
    if (s && s !== subVal()) { $("#f-sub").value = s; S.subAuto = true; scheduleCheck(); }
  }

  /* ---------- Live provisioning manifest ---------- */
  function readiness() {
    return [
      RULES["f-name"](val("f-name")) === "",
      !!radio("type"),
      S.subState === "ok",
      RULES["f-admin"](val("f-admin")) === "",
      RULES["f-email"](val("f-email")) === "",
      RULES["f-pass"]() === "",
    ];
  }
  function renderManifest() {
    var v = subVal(), st = S.subState, type = radio("type");
    var subHtml = v ? esc(v) + (st === "ok" ? ' <span class="ok">✓ available</span>' : st === "error" ? ' <span class="err">✕ ' + esc(S.subMsg) + "</span>" : st === "checking" ? ' <span class="is-empty">checking…</span>' : "") : "";
    var rows = [
      ["institution", esc(val("f-name"))],
      ["type", type ? CODES[type].toLowerCase() + " · " + esc(typeLabel()) : ""],
      ["subdomain", subHtml],
      ["website", v ? esc(v) + ".school-clerk.com" : ""],
      ["workspace", v ? "dashboard." + esc(v) + ".school-clerk.com" : ""],
      ["admin", esc(val("f-admin"))],
      ["email", esc(val("f-email"))],
      ["phone", esc(val("f-phone"))],
      ["password", RULES["f-pass"]() === "" ? "set" : ""],
      ["country", esc(val("f-country"))],
      ["students", esc(radio("size"))],
      ["system", esc(radio("system"))],
      ["language", esc(radio("lang"))],
    ];
    var html = rows.map(function (r) {
      var prev = S.last[r[0]];
      var changed = prev !== undefined && prev !== r[1] && r[1];
      S.last[r[0]] = r[1];
      return "<dt" + (changed ? ' class="is-changed"' : "") + ">" + r[0] + "</dt><dd>" + (r[1] || '<span class="is-empty">—</span>') + "</dd>";
    }).join("");
    $$("[data-manifest-rows]").forEach(function (el) { el.innerHTML = html; });

    var ready = readiness();
    var n = ready.filter(Boolean).length;
    $$("#mf-meter i").forEach(function (el, i) { el.classList.toggle("on", !!ready[i]); });
    $("#mf-count").textContent = n + " of 6 ready";
    $("#mini-count").textContent = n + "/6";
    var name = val("f-name");
    var tile = $("#mf-tile");
    tile.textContent = name ? SC.initials(name) : "—";
    tile.classList.toggle("is-empty", !name);
    var nm = $("#mf-name");
    nm.textContent = name || "Your school";
    nm.classList.toggle("is-empty", !name);
    $("#mf-type").textContent = [typeLabel(), val("f-country")].filter(Boolean).join(" · ");
    $("#mini-name").textContent = name;
  }
  function setManifestState(label, tone) {
    var t = $("#mf-state");
    t.className = "tag " + tone;
    t.textContent = label;
  }

  /* ---------- Stepper + step navigation ---------- */
  var STEP_LABELS = ["School", "Admin", "Context", "Create"];
  function canReach(i) { for (var k = 0; k < i; k++) if (!S.done[k]) return false; return true; }
  function renderStepper() {
    $$(".stepper-btn").forEach(function (b, i) {
      var cur = !S.created && i === S.step;
      if (cur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      var done = S.created || S.done[i];
      b.classList.toggle("is-done", done && !cur);
      b.disabled = S.creating || S.created || !(i === S.step || canReach(i));
      b.setAttribute("aria-label", "Step " + (i + 1) + ", " + STEP_LABELS[i] + (done ? ", done" : ""));
    });
  }
  function showStep(n, focus) {
    S.step = n;
    for (var i = 0; i < 4; i++) $("#step-" + i).hidden = i !== n;
    $("#step-done").hidden = true;
    animateIn($("#step-" + n));
    if (n === 3) renderReview();
    renderStepper();
    if (focus !== false) focusHeading($("#s" + n + "-h"));
  }
  function validateStep(n) {
    var first = null;
    if (n === 0) {
      S.touched["f-name"] = true;
      suggestSub();
      var m = RULES["f-name"](val("f-name"));
      setErr("f-name", m);
      if (m) first = $("#f-name");
      if (!radio("type") && !first) first = $('input[name="type"]:not(:disabled)');
      if (!subVal()) setSub("error", "Choose a subdomain for your school.");
      else checkNow();
      if (S.subState !== "ok" && !first) first = $("#f-sub");
    } else if (n === 1) {
      ["f-admin", "f-email", "f-phone", "f-pass"].forEach(function (id) {
        S.touched[id] = true;
        var msg = RULES[id](val(id));
        setErr(id, msg);
        if (msg && !first) first = document.getElementById(id);
      });
    }
    return first;
  }
  function next(n) {
    if (S.creating || S.created) return;
    if (n === 3) { create(); return; }
    var bad = validateStep(n);
    if (bad) { bad.focus(); return; }
    S.done[n] = true;
    showStep(n + 1);
  }
  function goTo(i) {
    if (S.creating || S.created || i === S.step) return;
    for (var k = 0; k < Math.min(i, 2); k++) {
      var bad = validateStep(k);
      if (bad) { showStep(k, false); bad.focus(); return; }
    }
    showStep(i);
  }

  $$(".su-step[data-step]").forEach(function (form) {
    var n = +form.getAttribute("data-step");
    form.addEventListener("submit", function (e) { e.preventDefault(); next(n); });
    form.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.isComposing) return;
      var t = e.target;
      if (t.matches('input[type="radio"], input[type="checkbox"], select')) { e.preventDefault(); next(n); }
    });
  });
  $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { if (!S.creating && S.step > 0) showStep(S.step - 1); }); });
  $("#stepper").addEventListener("click", function (e) {
    var b = e.target.closest(".stepper-btn");
    if (b && !b.disabled) goTo(+b.getAttribute("data-goto"));
  });
  $("#skip-context").addEventListener("click", function () { S.done[2] = true; showStep(3); });

  /* Field events */
  Object.keys(RULES).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("blur", function () {
      if (id === "f-name") suggestSub();
      if (!el.value && !S.touched[id]) return;
      S.touched[id] = true;
      setErr(id, RULES[id](val(id)));
      renderManifest();
    });
    el.addEventListener("input", function () {
      if (S.touched[id]) setErr(id, RULES[id](val(id)));
      renderManifest();
    });
  });
  $("#f-sub").addEventListener("input", function () {
    var el = this, lower = el.value.toLowerCase();
    if (lower !== el.value) { var p = el.selectionStart; el.value = lower; el.setSelectionRange(p, p); }
    S.subAuto = !el.value;
    scheduleCheck();
  });
  $("#phase-signup").addEventListener("change", function (e) {
    if (e.target.matches('input[type="radio"], select')) renderManifest();
  });
  $("#f-pass").addEventListener("input", function () {
    var n = this.value.length, ok = n >= 8 && n <= 128;
    var rule = $("#pw-rule");
    rule.setAttribute("data-ok", String(ok));
    rule.innerHTML = I(ok ? "circle-check" : "circle", 13) + "8–128 characters";
    $("#pw-count").textContent = n < 8 ? n + "/8" : n + "/128";
  });
  $("#pw-toggle").addEventListener("click", function () {
    var p = $("#f-pass"), show = p.type === "password";
    p.type = show ? "text" : "password";
    this.setAttribute("aria-pressed", String(show));
    this.setAttribute("aria-label", show ? "Hide password" : "Show password");
    this.innerHTML = I(show ? "eye-off" : "eye", 14) + "<span>" + (show ? "Hide" : "Show") + "</span>";
  });

  /* ---------- Review ---------- */
  function renderReview() {
    var v = esc(subVal());
    var none = '<span class="none">Not provided</span>';
    var group = function (title, step, rows) {
      return '<div class="review-group"><div class="review-head"><p class="eyebrow">' + title + "</p>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-edit="' + step + '">' + I("pencil", 14) + 'Edit<span class="sr-only"> ' + title + "</span></button></div><dl>" +
        rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd" + (r[2] ? ' class="mono"' : "") + ">" + (r[1] || none) + "</dd>"; }).join("") + "</dl></div>";
    };
    $("#review").innerHTML =
      group("School", 0, [["Name", esc(val("f-name"))], ["Type", esc(typeLabel())], ["Website", v + ".school-clerk.com", 1], ["Workspace", "dashboard." + v + ".school-clerk.com", 1]]) +
      group("Administrator", 1, [["Name", esc(val("f-admin"))], ["Email", esc(val("f-email")), 1], ["Phone", esc(val("f-phone")), 1], ["Password", "Set · hidden"]]) +
      group("Context", 2, [["Country", esc(val("f-country"))], ["Students", esc(radio("size"))], ["System", esc(radio("system"))], ["Language", esc(radio("lang"))], ["Notes", esc(val("f-notes"))]]);
  }
  $("#review").addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit]");
    if (b && !S.creating) showStep(+b.getAttribute("data-edit"));
  });

  /* ---------- Create: manifest becomes a deploy-style log ---------- */
  function create() {
    for (var k = 0; k < 2; k++) {
      var bad = validateStep(k);
      if (bad) { showStep(k, false); bad.focus(); return; }
    }
    var my = ++gen;
    S.creating = true;
    S.done[3] = true;
    var btn = $("#create-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spin">' + I("loader-circle") + "</span>Creating workspace…";
    $$("#step-3 [data-back], #step-3 [data-edit]").forEach(function (b) { b.disabled = true; });
    $("#step-3").setAttribute("aria-busy", "true");
    renderStepper();
    $("#manifest").classList.add("is-log");
    setManifestState("Provisioning", "tag-info");

    var logs = [$("#mf-log"), $("#su-log")];
    logs.forEach(function (l) { l.innerHTML = ""; l.hidden = false; });
    var v = esc(subVal()), email = esc(val("f-email"));
    var lines = [
      ["cmd", "provision --school " + v],
      ["ok", "Validating manifest"],
      ["ok", "Reserving <b>" + v + "</b>.school-clerk.com"],
      ["ok", "Reserving dashboard.<b>" + v + "</b>.school-clerk.com"],
      ["ok", "Creating workspace “" + esc(val("f-name")) + "”"],
      ["ok", "Creating administrator " + esc(val("f-admin"))],
      ["acc", "Verification email → " + email],
      ["acc", "Workspace email → " + email],
      ["new", "Welcome notification"],
      ["end", "Done · inbox delivery not confirmed"],
    ];
    var gaps = [0, 0.12, 0.31, 0.27, 0.44, 0.38, 0.52, 0.29, 0.21, 0.08];
    var t = 0, i = 0;
    function line() {
      if (my !== gen) return;
      var L = lines[i];
      t += gaps[i];
      var st = L[0] === "ok" ? '<span class="log-st ok">ok</span>' : L[0] === "acc" ? '<span class="log-st acc">accepted by provider</span>' : L[0] === "new" ? '<span class="log-st ok">created</span>' : "";
      var html = '<li class="log-line' + (L[0] === "cmd" ? " is-cmd" : L[0] === "end" ? " is-end" : "") + '">' +
        '<span class="log-t">' + (L[0] === "cmd" ? "$" : t.toFixed(2) + "s") + '</span><span class="log-msg">' + L[1] + (st ? " …" : "") + "</span>" + st + "</li>";
      logs.forEach(function (l) { l.insertAdjacentHTML("beforeend", html); l.scrollTop = l.scrollHeight; });
      i++;
      if (i < lines.length) { if (reduced) line(); else setTimeout(line, 340); }
      else if (reduced) finish(my); else setTimeout(function () { finish(my); }, 650);
    }
    line();
  }
  function finish(my) {
    if (my !== gen) return;
    S.creating = false;
    S.created = true;
    setManifestState("Created", "tag-success");
    $("#step-3").hidden = true;
    $("#step-3").removeAttribute("aria-busy");
    var done = $("#step-done");
    done.insertBefore($("#su-log"), $(".verify-box", done)); // keep the log visible below 1100px
    done.hidden = false;
    animateIn(done);
    $("#done-when").textContent = fmtD(TODAY);
    renderDone();
    renderStepper();
    focusHeading($("#done-h"));
  }
  function renderDone() {
    var v = esc(subVal()), email = esc(val("f-email"));
    var items = [
      { icon: "globe", ok: true, t: "School addresses reserved", tag: '<span class="tag tag-success">Reserved</span>',
        d: '<span class="mono">' + v + '.school-clerk.com</span> · <span class="mono">dashboard.' + v + ".school-clerk.com</span>" },
      S.verified
        ? { icon: "mail-check", ok: true, t: "Verification email", tag: '<span class="tag tag-success">Verified</span>', d: "Verified for <span class=\"mono\">" + email + "</span> in this preview." }
        : { icon: "mail", ok: false, t: "Verification email", tag: '<span class="tag tag-info">Accepted</span>', d: "Accepted by email provider; inbox delivery is not confirmed. Sent to <span class=\"mono\">" + email + "</span>." },
      { icon: "mail", ok: false, t: "Workspace email", tag: '<span class="tag tag-info">Accepted</span>', d: "Your workspace address and sign-in details — accepted by email provider." },
      { icon: "bell", ok: true, t: "Welcome notification", tag: '<span class="tag tag-success">Created</span>', d: "Waiting in your workspace notifications." },
    ];
    $("#done-list").innerHTML = items.map(function (x) {
      return '<li class="done-item"><span class="done-ico' + (x.ok ? "" : " is-info") + '">' + I(x.icon, 14) + '</span><span class="done-t">' + x.t + "</span>" + x.tag + '<p class="done-d">' + x.d + "</p></li>";
    }).join("");
  }
  $("#verify-btn").addEventListener("click", function () {
    S.verified = true;
    this.disabled = true;
    this.textContent = "Email verified (preview)";
    renderDone();
    SC.toast("Email verified", "Preview only · nothing is sent", "mail-check");
  });
  $("#continue-setup").addEventListener("click", enterOnboarding);

  /* =====================================================================
     ONBOARDING (inside the workspace)
     ===================================================================== */
  var OB_LABELS = ["Welcome", "Academic session", "Classrooms", "General fees", "Invite staff"];

  function enterOnboarding() {
    S.phase = "onboard";
    document.body.setAttribute("data-phase", "onboard");
    $("#phase-signup").hidden = true;
    $("#phase-onboard").hidden = false;
    var name = val("f-name") || D.school.name, v = subVal() || D.school.subdomain, admin = val("f-admin") || D.user.name;
    $("#ob-school").textContent = name;
    $$("[data-school-name]").forEach(function (e) { e.textContent = name; });
    $("#ob-h1").textContent = "Set up " + name;
    $("#ob-addr").textContent = "dashboard." + v + ".school-clerk.com";
    $("#ob-url").innerHTML = "https://dashboard.<b>" + esc(v) + "</b>.school-clerk.com";
    $("#ob-site").textContent = v + ".school-clerk.com";
    var av = $("#ob-avatar");
    av.textContent = SC.initials(admin);
    av.title = admin + " · Administrator";
    renderVerify();
    renderChip();
    renderTermsTable();
    renderTimeline();
    renderClassForm();
    renderMatrix();
    renderFees();
    renderStaffForm();
    renderInvites();
    window.scrollTo(0, 0);
    obGo(0);
  }

  function obGo(n) {
    S.ob.step = n;
    for (var i = 0; i <= 5; i++) $("#ob-" + i).hidden = i !== n;
    var sec = $("#ob-" + n);
    animateIn(sec);
    if (n === 3) renderFees();
    if (n === 4) renderStaffForm();
    if (n === 5) renderSummary();
    renderRail();
    window.scrollTo(0, 0);
    var h = $(".ob-title", sec);
    if (h) h.focus({ preventScroll: true });
    var item = $('.ob-item[data-ob="' + n + '"]');
    if (item && window.innerWidth < 900) item.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
  }
  function complete(i, how) {
    var st = S.ob.status;
    st[i] = how === "skipped" && st[i] === "done" ? "done" : how;
    obGo(i < 4 ? i + 1 : 5);
  }
  function statusTag(s, current) {
    if (s === "done") return '<span class="tag tag-success">' + I("check", 11) + '<span class="tag-l">Done</span></span>';
    if (s === "skipped") return '<span class="tag tag-muted">' + I("minus", 11) + '<span class="tag-l">Skipped</span></span>';
    if (current) return '<span class="tag tag-now">' + I("circle-dot", 11) + '<span class="tag-l">Now</span></span>';
    return '<span class="tag tag-todo"><span class="tag-l">To do</span></span>';
  }
  function renderRail() {
    var st = S.ob.status, cur = S.ob.step;
    $$(".ob-item").forEach(function (b, i) {
      if (i === cur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      $(".ob-st", b).innerHTML = statusTag(st[i], i === cur);
      var word = st[i] === "done" ? "done" : st[i] === "skipped" ? "skipped" : "to do";
      b.setAttribute("aria-label", "Step " + (i + 1) + ", " + OB_LABELS[i] + ", " + word);
    });
    $$("#ob-meter i").forEach(function (m, i) {
      m.className = st[i] === "done" ? "is-done" : st[i] === "skipped" ? "is-skipped" : i === cur ? "is-current" : "";
    });
    var done = st.filter(function (s) { return s === "done"; }).length;
    var skipped = st.filter(function (s) { return s === "skipped"; }).length;
    $("#ob-progress").textContent = done + " of 5 done" + (skipped ? " · " + skipped + " skipped" : "");
    renderLedger();
  }
  function feeTotal() { return S.ob.fees.reduce(function (n, f) { return n + (f.amount || 0); }, 0); }
  function armsTotal() { return S.ob.classes.reduce(function (n, c) { return n + c.arms.length; }, 0); }
  function ledgerValues() {
    var ob = S.ob, termsOn = $("#ob-terms-on").checked;
    return [
      ["Session", ob.sessionSaved ? esc(val("ob-title")) : null],
      ["Terms", ob.sessionSaved ? (termsOn ? String(ob.terms.length) : "none") : null],
      ["Classrooms", ob.classes.length ? ob.classes.length + " · " + armsTotal() + " arms" : null],
      ["General fees", ob.feesSaved && ob.fees.length ? ob.fees.length + " · " + SC.compact(feeTotal()) : null],
      ["Invites", ob.invites.length ? String(ob.invites.length) : null],
    ];
  }
  function renderLedger() {
    $("#ob-ledger").innerHTML = ledgerValues().map(function (r) {
      return "<dt>" + r[0] + "</dt><dd" + (r[1] == null ? ' class="none">—' : ">" + r[1]) + "</dd>";
    }).join("");
  }
  function renderChip() {
    var c = $("#ob-chip");
    if (!S.ob.sessionSaved) { c.textContent = "No session"; c.classList.remove("is-set"); return; }
    var t = val("ob-title"), m = t.match(/^\d{2}(\d{2})\s*\/\s*\d{2}(\d{2})$/);
    var label = m ? m[1] + "/" + m[2] : t;
    if ($("#ob-terms-on").checked) {
      var now = parseD(TODAY);
      S.ob.terms.forEach(function (tm, i) {
        var a = parseD(tm.start), b = parseD(tm.end);
        if (a && b && now >= a && now <= b) label += " · T" + (i + 1) + " · W" + (Math.floor((now - a) / 864e5 / 7) + 1);
      });
    }
    c.textContent = label;
    c.classList.add("is-set");
  }
  $("#ob-list").addEventListener("click", function (e) {
    var b = e.target.closest(".ob-item");
    if (b) obGo(+b.getAttribute("data-ob"));
  });
  $$("[data-ob-back]").forEach(function (b) { b.addEventListener("click", function () { obGo(Math.max(0, S.ob.step - 1)); }); });

  /* ---------- 01 Welcome ---------- */
  function renderVerify() {
    var el = $("#ob-verify"), email = esc(val("f-email"));
    if (S.verified) {
      el.className = "ob-alert is-ok";
      el.innerHTML = I("mail-check") + "<strong>Email verified</strong><p><span class=\"mono\">" + email + "</span> was confirmed in this preview.</p>";
    } else {
      el.className = "ob-alert";
      el.innerHTML = I("mail") + "<strong>Verify your email</strong><p>The verification email to <span class=\"mono\">" + email + "</span> was accepted by the email provider; inbox delivery is not confirmed.</p>";
    }
  }
  $("#ob-go-session").addEventListener("click", function () { complete(0, "done"); });
  $("#ob-fresh").addEventListener("click", function () {
    SC.toast("Fresh verification link requested", "Accepted by email provider · preview only", "mail");
  });
  $(".next-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ob]");
    if (!b) return;
    if (S.ob.status[0] !== "done") S.ob.status[0] = "done";
    obGo(+b.getAttribute("data-ob"));
  });
  $("#copy-url").addEventListener("click", function () {
    var text = $("#ob-url").textContent;
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (e) { /* ignore */ }
    SC.toast("Workspace address copied", text, "copy");
  });

  /* ---------- 02 Academic session ---------- */
  function renderTermsTable() {
    var on = $("#ob-terms-on").checked;
    $("#terms-panel").hidden = !on;
    $("#terms-body").innerHTML = S.ob.terms.map(function (t, i) {
      var first = i === 0, n = esc(t.name || "Term " + (i + 1));
      var start = first
        ? '<div class="cell-lock"><input class="cell-input mono" type="date" data-k="start" value="' + esc(t.start) + '" readonly aria-label="' + n + ' starts — matches the session start" title="Matches the session start">' + I("link", 13) + "</div>"
        : '<input class="cell-input mono" type="date" data-k="start" value="' + esc(t.start) + '" aria-label="' + n + ' starts">';
      return '<tr data-i="' + i + '"><td class="cell-idx">T' + (i + 1) + "</td>" +
        '<td><input class="cell-input" data-k="name" value="' + esc(t.name) + '" aria-label="Term ' + (i + 1) + ' name"></td>' +
        "<td>" + start + "</td>" +
        '<td><input class="cell-input mono" type="date" data-k="end" value="' + esc(t.end) + '" aria-label="' + n + ' ends"></td>' +
        '<td class="num cell-calc" data-weeks>' + weeksLabel(t) + "</td>" +
        '<td class="cell-act">' + (first ? "" : '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-remove-term="' + i + '" aria-label="Remove ' + n + '">' + I("x", 14) + "</button>") + "</td></tr>";
    }).join("");
    if (S.ob.sessionTried) validateSession();
  }
  function renderTimeline() {
    var tl = $("#tl"), s = parseD(val("ob-start")), e = parseD(val("ob-end"));
    tl.setAttribute("aria-hidden", "true");
    if (!s || !e || e <= s) {
      tl.innerHTML = '<p class="tl-empty">Set valid session dates to see the timeline.</p>';
      $("#tl-meta").textContent = "";
      $("#sess-span").textContent = "";
      return;
    }
    var months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + e.getUTCMonth() - s.getUTCMonth() + 1;
    if (months > 24) {
      tl.innerHTML = '<p class="tl-empty">The session spans more than 24 months — check the dates.</p>';
      return;
    }
    var r0 = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1);
    var r1 = Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 1);
    var pct = function (d) { return ((d - r0) / (r1 - r0) * 100).toFixed(3) + "%"; };
    var span = function (a, b) { return (Math.max(0, b - a) / (r1 - r0) * 100).toFixed(3) + "%"; };
    var mh = "";
    for (var k = 0; k < months; k++) {
      var mo = (s.getUTCMonth() + k) % 12, y = s.getUTCFullYear() + Math.floor((s.getUTCMonth() + k) / 12);
      mh += '<span class="tl-month">' + MON[mo] + (k === 0 || mo === 0 ? "<small>’" + String(y).slice(2) + "</small>" : "") + "</span>";
    }
    var bars = "";
    if ($("#ob-terms-on").checked) {
      S.ob.terms.forEach(function (t, i) {
        var a = parseD(t.start), b = parseD(t.end);
        if (!a || !b) return;
        var A = Math.max(+a, r0), B = Math.min(Math.max(+b + 864e5, A), r1);
        if (B <= A) return;
        var bad = !!S.ob.termErr[i] || b <= a || a < s || b > e;
        bars += '<span class="tl-bar' + (bad ? " is-bad" : "") + '" style="--l:' + pct(A) + ";--w:" + span(A, B) + '">' +
          '<span class="long">' + esc(t.name || "Term " + (i + 1)) + '</span><small class="long">' + weeksLabel(t) + '</small><span class="short">T' + (i + 1) + "</span></span>";
      });
    }
    var sess = '<span class="tl-session" style="--l:' + pct(+s) + ";--w:" + span(+s, +e + 864e5) + '">' + esc(val("ob-title") || "Session") + " · " + fmtD(val("ob-start")) + " – " + fmtD(val("ob-end")) + "</span>";
    var now = parseD(TODAY), today = "";
    if (+now >= r0 && +now < r1) today = '<span class="tl-today" style="--l:' + pct(+now) + '"><span>Today</span></span>';
    tl.style.setProperty("--m", months);
    tl.innerHTML = '<div class="tl-months">' + mh + '</div><div class="tl-track">' + bars + sess + today + "</div>";
    $("#tl-meta").textContent = MON[s.getUTCMonth()] + " " + s.getUTCFullYear() + " – " + MON[e.getUTCMonth()] + " " + e.getUTCFullYear() + " · " + months + " months";
    $("#sess-span").textContent = fmtD(val("ob-start")) + " → " + fmtD(val("ob-end"));
  }
  function validateSession() {
    var first = null, msg;
    var s = parseD(val("ob-start")), e = parseD(val("ob-end"));
    msg = val("ob-title") ? "" : "Enter a session title, like 2026/2027.";
    setErr("ob-title", msg); if (msg) first = first || $("#ob-title");
    msg = s ? "" : "Choose the date the session starts.";
    setErr("ob-start", msg); if (msg) first = first || $("#ob-start");
    msg = !e ? "Choose the date the session ends." : s && e <= s ? "The session must end after it starts." : "";
    setErr("ob-end", msg); if (msg) first = first || $("#ob-end");

    var msgs = [];
    S.ob.termErr = [];
    if ($("#ob-terms-on").checked && s && e && e > s) {
      var prevEnd = null;
      S.ob.terms.forEach(function (t, i) {
        var a = parseD(t.start), b = parseD(t.end), label = t.name.trim() || "Term " + (i + 1), m = "", where = "date";
        if (!t.name.trim()) { m = "Term " + (i + 1) + " needs a name."; where = "name"; }
        else if (!a || !b) m = label + " needs a start and an end date.";
        else if (b <= a) m = label + " ends before it starts.";
        else if (a < s || b > e) m = label + " falls outside the session dates.";
        else if (prevEnd && a <= prevEnd) m = label + " overlaps " + (S.ob.terms[i - 1].name.trim() || "the term before") + ".";
        if (b) prevEnd = b;
        S.ob.termErr[i] = m;
        var tr = $('#terms-body tr[data-i="' + i + '"]');
        if (tr) {
          $('[data-k="name"]', tr).setAttribute("aria-invalid", String(!!m && where === "name"));
          $('[data-k="end"]', tr).setAttribute("aria-invalid", String(!!m && where === "date"));
          $('[data-k="start"]', tr).setAttribute("aria-invalid", String(!!m && where === "date" && i > 0));
          if (m && !first) first = $(where === "name" ? '[data-k="name"]' : i > 0 ? '[data-k="start"]' : '[data-k="end"]', tr);
        }
        if (m) msgs.push(m);
      });
    }
    var te = $("#terms-err");
    te.hidden = !msgs.length;
    te.innerHTML = msgs.length ? I("circle-alert", 14) + "<span>" + esc(msgs[0]) + (msgs.length > 1 ? " (+" + (msgs.length - 1) + " more)" : "") + "</span>" : "";
    return first;
  }
  function onSessionChange() {
    if (S.ob.sessionTried) validateSession();
    renderTimeline();
  }
  $("#ob-start").addEventListener("input", function () {
    S.ob.terms[0].start = this.value;
    var first = $('#terms-body tr[data-i="0"] [data-k="start"]');
    if (first) first.value = this.value;
    var w = $('#terms-body tr[data-i="0"] [data-weeks]');
    if (w) w.textContent = weeksLabel(S.ob.terms[0]);
    onSessionChange();
  });
  $("#ob-end").addEventListener("input", onSessionChange);
  $("#ob-title").addEventListener("input", onSessionChange);
  $("#ob-terms-on").addEventListener("change", function () { renderTermsTable(); renderTimeline(); });
  $("#terms-body").addEventListener("input", function (e) {
    var el = e.target, tr = el.closest("tr");
    if (!tr || !el.getAttribute("data-k")) return;
    var t = S.ob.terms[+tr.getAttribute("data-i")];
    t[el.getAttribute("data-k")] = el.value;
    $("[data-weeks]", tr).textContent = weeksLabel(t);
    onSessionChange();
  });
  $("#terms-body").addEventListener("click", function (e) {
    var b = e.target.closest("[data-remove-term]");
    if (!b) return;
    var i = +b.getAttribute("data-remove-term");
    var name = S.ob.terms[i].name || "Term";
    S.ob.terms.splice(i, 1);
    renderTermsTable();
    renderTimeline();
    $("#add-term").focus();
    SC.toast(name + " removed", "", "trash-2");
  });
  $("#add-term").addEventListener("click", function () {
    var n = S.ob.terms.length;
    if (n >= 6) { SC.toast("Six terms is the limit here", "Remove a term to add another.", "circle-alert"); return; }
    S.ob.terms.push({ name: (ORD[n] || "New") + " Term", start: "", end: "" });
    renderTermsTable();
    renderTimeline();
    var input = $('#terms-body tr[data-i="' + n + '"] [data-k="start"]');
    if (input) input.focus();
  });
  $("#ob-1").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && e.target.matches("input")) { e.preventDefault(); $("#sess-next").click(); }
  });
  $("#sess-next").addEventListener("click", function () {
    S.ob.sessionTried = true;
    var bad = validateSession();
    renderTimeline();
    if (bad) { bad.focus(); return; }
    S.ob.sessionSaved = true;
    renderChip();
    var on = $("#ob-terms-on").checked;
    SC.toast("Session saved", val("ob-title") + (on ? " · " + S.ob.terms.length + " terms" : " · no terms yet"), "calendar-check");
    complete(1, "done");
  });

  /* ---------- 03 Classrooms: form + class × arm matrix ---------- */
  function renderClassForm() {
    renderSugg();
    renderStreams();
    renderSubjects();
  }
  function renderSugg() {
    var have = S.ob.classes.map(function (c) { return c.name.toLowerCase(); });
    $("#c-sugg").innerHTML = D.classSuggestions.map(function (s, i) {
      var added = have.indexOf(s.toLowerCase()) > -1;
      return '<button type="button" class="chip" data-sugg="' + i + '"' + (added ? ' disabled aria-label="' + esc(s) + ', already saved"' : "") + ">" + (added ? I("check", 12) : "") + esc(s) + "</button>";
    }).join("");
  }
  function renderStreams() {
    $("#c-streams").innerHTML = S.ob.streams.length ? S.ob.streams.map(function (a, i) {
      return '<span class="chip is-token chip-mono">' + esc(a) + '<button type="button" class="chip-x" data-rm-stream="' + i + '" aria-label="Remove arm ' + esc(a) + '">' + I("x", 12) + "</button></span>";
    }).join("") : '<span class="field-description">No arms yet — pick a preset or add one.</span>';
  }
  function allSubjects() { return SUBJECTS.concat(S.ob.extraSubjects); }
  function renderSubjects() {
    $("#c-subj").innerHTML = allSubjects().map(function (s) {
      var on = S.ob.subjects.indexOf(s) > -1;
      return '<button type="button" class="chip" data-subj="' + esc(s) + '" aria-pressed="' + on + '">' + (on ? I("check", 12) : "") + esc(s) + "</button>";
    }).join("");
  }
  function addStream() {
    var input = $("#c-stream-input"), a = input.value.trim().slice(0, 20);
    if (!a) return;
    if (S.ob.streams.some(function (x) { return x.toLowerCase() === a.toLowerCase(); })) { SC.toast(a + " is already an arm", "", "circle-alert"); return; }
    S.ob.streams.push(a);
    input.value = "";
    renderStreams();
  }
  function addSubject() {
    var input = $("#c-subj-input"), s = input.value.trim().slice(0, 40);
    if (!s) return;
    var existing = allSubjects().filter(function (x) { return x.toLowerCase() === s.toLowerCase(); })[0];
    if (!existing) { S.ob.extraSubjects.push(s); existing = s; }
    if (S.ob.subjects.indexOf(existing) < 0) S.ob.subjects.push(existing);
    input.value = "";
    renderSubjects();
  }
  function saveClass() {
    var name = val("c-name").replace(/\s+/g, " "), err = "";
    if (!name) err = "Enter a class name, or pick a suggestion.";
    else if (S.ob.classes.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) err = name + " is already saved — change its arms in the matrix.";
    setErr("c-name", err);
    if (err) { $("#c-name").focus(); return; }
    var lvl = parseInt(val("c-level"), 10);
    if (!(lvl >= 1 && lvl <= 30)) {
      var idx = D.classSuggestions.map(function (x) { return x.toLowerCase(); }).indexOf(name.toLowerCase());
      lvl = idx > -1 ? idx + 1 : S.ob.classes.reduce(function (m, c) { return Math.max(m, c.level); }, 0) + 1;
    }
    var arms = $("#c-sub").checked ? S.ob.streams.slice() : [];
    var fee = $("#c-fee-on").checked ? parseMoney(val("c-fee")) : 0;
    S.ob.classes.push({ name: name, level: lvl, arms: arms, subjects: S.ob.subjects.slice(), fee: fee });
    S.ob.classes.sort(function (a, b) { return a.level - b.level || a.name.localeCompare(b.name); });
    $("#c-name").value = "";
    $("#c-level").value = "";
    $("#c-fee").value = "";
    $("#c-fee-on").checked = false;
    $("#c-fee-wrap").hidden = true;
    $("#c-live").textContent = name + " saved · " + (arms.length ? arms.length + " arms" : "single class") + " · " + S.ob.subjects.length + " subjects";
    renderSugg();
    renderMatrix();
    renderRail();
    $("#c-name").focus();
  }
  function armUnion() {
    var u = [];
    S.ob.classes.forEach(function (c) { c.arms.forEach(function (a) { if (u.indexOf(a) < 0) u.push(a); }); });
    return u;
  }
  function renderMatrix() {
    var cls = S.ob.classes, wrap = $("#mx"), union = armUnion();
    $("#mx-meta").textContent = cls.length + (cls.length === 1 ? " class" : " classes") + " · " + armsTotal() + " arms";
    if (!cls.length) {
      wrap.innerHTML = '<div class="mx-empty"><span class="mx-ghost" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span>No classrooms yet. Each class you save lands here as a row, with one column per arm.</span></div>';
      return;
    }
    var head = '<tr><th scope="col" class="mx-level">Lvl</th><th scope="col">Class</th>' + union.map(function (a) { return '<th scope="col">' + esc(a) + "</th>"; }).join("") +
      '<th scope="col" class="num">Subjects</th><th scope="col" class="num">Tuition</th><th scope="col"><span class="sr-only">Remove</span></th></tr>';
    var body = cls.map(function (c, i) {
      return '<tr><td class="mx-level">L' + pad(c.level) + '</td><th scope="row" class="mx-name">' + esc(c.name) + (c.arms.length ? "" : ' <span class="tag tag-muted">Single</span>') + "</th>" +
        union.map(function (a) {
          var on = c.arms.indexOf(a) > -1;
          return '<td class="mx-cell"><button type="button" class="mx-tog" data-ci="' + i + '" data-arm="' + esc(a) + '" aria-pressed="' + on + '" aria-label="' + esc(c.name) + " arm " + esc(a) + '">' + esc(a) + "</button></td>";
        }).join("") +
        '<td class="num cell-calc">' + c.subjects.length + '</td><td class="num cell-calc">' + (c.fee ? SC.money(c.fee) : "—") + "</td>" +
        '<td class="cell-act"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm-class="' + i + '" aria-label="Remove ' + esc(c.name) + '">' + I("x", 14) + "</button></td></tr>";
    }).join("");
    wrap.innerHTML = '<table class="grid-table mx"><thead>' + head + "</thead><tbody>" + body + "</tbody></table>";
  }
  $("#c-sugg").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sugg]");
    if (!b || b.disabled) return;
    var i = +b.getAttribute("data-sugg");
    $("#c-name").value = D.classSuggestions[i];
    $("#c-level").value = i + 1;
    setErr("c-name", "");
    $("#c-name").focus();
  });
  $("#c-sub").addEventListener("change", function () { $("#c-streams-wrap").hidden = !this.checked; });
  $("#c-fee-on").addEventListener("change", function () { $("#c-fee-wrap").hidden = !this.checked; if (this.checked) $("#c-fee").focus(); });
  $("#c-fee").addEventListener("input", function () { fmtMoneyInput(this); });
  $("#c-streams-wrap").addEventListener("click", function (e) {
    var p = e.target.closest("[data-preset]");
    if (p) { S.ob.streams = p.getAttribute("data-preset").split(","); renderStreams(); return; }
    var x = e.target.closest("[data-rm-stream]");
    if (x) { S.ob.streams.splice(+x.getAttribute("data-rm-stream"), 1); renderStreams(); $("#c-stream-input").focus(); }
  });
  $("#c-stream-add").addEventListener("click", addStream);
  $("#c-subj-add").addEventListener("click", addSubject);
  $("#c-subj").addEventListener("click", function (e) {
    var b = e.target.closest("[data-subj]");
    if (!b) return;
    var s = b.getAttribute("data-subj"), k = S.ob.subjects.indexOf(s);
    if (k > -1) S.ob.subjects.splice(k, 1); else S.ob.subjects.push(s);
    renderSubjects();
    var again = $('#c-subj [data-subj="' + CSS.escape(s) + '"]');
    if (again) again.focus();
  });
  $("#c-save").addEventListener("click", saveClass);
  ["c-name", "c-level", "c-fee"].forEach(function (id) {
    document.getElementById(id).addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.isComposing) { e.preventDefault(); saveClass(); }
    });
  });
  $("#c-stream-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); addStream(); } });
  $("#c-subj-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); addSubject(); } });
  $("#mx").addEventListener("click", function (e) {
    var t = e.target.closest(".mx-tog");
    if (t) {
      var c = S.ob.classes[+t.getAttribute("data-ci")], a = t.getAttribute("data-arm"), union = armUnion();
      var k = c.arms.indexOf(a);
      if (k > -1) c.arms.splice(k, 1);
      else { c.arms.push(a); c.arms.sort(function (x, y) { return union.indexOf(x) - union.indexOf(y); }); }
      var ci = t.getAttribute("data-ci");
      renderMatrix();
      renderRail();
      var again = $('#mx .mx-tog[data-ci="' + ci + '"][data-arm="' + CSS.escape(a) + '"]');
      if (again) again.focus(); else $("#c-name").focus();
      return;
    }
    var r = e.target.closest("[data-rm-class]");
    if (r) {
      var removed = S.ob.classes.splice(+r.getAttribute("data-rm-class"), 1)[0];
      renderMatrix();
      renderSugg();
      renderRail();
      $("#c-name").focus();
      SC.toast(removed.name + " removed", "", "trash-2");
    }
  });
  $("#cls-next").addEventListener("click", function () { complete(2, S.ob.classes.length ? "done" : "skipped"); });

  /* ---------- 04 General fees: spreadsheet grid ---------- */
  function renderFees() {
    var rows = S.ob.fees.map(function (f, i) {
      var label = "Fee " + (i + 1);
      return '<tr data-i="' + i + '"' + (i === S.ob.cursor ? ' class="is-cursor"' : "") + '><td class="cell-idx">' + (i + 1) + "</td>" +
        '<td><input class="cell-input" data-k="title" value="' + esc(f.title) + '" placeholder="Fee title" autocomplete="off" aria-label="' + label + ' title"></td>' +
        '<td><select class="cell-input select" data-k="type" aria-label="' + label + ' type"><option' + (f.type === "Required" ? " selected" : "") + ">Required</option><option" + (f.type === "Optional" ? " selected" : "") + ">Optional</option></select></td>" +
        '<td><div class="cell-money"><span aria-hidden="true">₦</span><input class="cell-input" data-k="amount" inputmode="numeric" autocomplete="off" value="' + (f.amount ? SC.money(f.amount, { noSymbol: true }) : "") + '" placeholder="0" aria-label="' + label + ' amount in naira"></div></td>' +
        '<td class="cell-act"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm-fee="' + i + '" aria-label="Remove ' + esc(f.title || label) + '">' + I("x", 14) + "</button></td></tr>";
    }).join("");
    $("#fee-body").innerHTML = rows || '<tr class="empty-row"><td colspan="5">No general fees. Add one, pick a suggestion, or skip this step.</td></tr>';
    $("#fee-term").textContent = ((S.ob.terms[0] && S.ob.terms[0].name) || "First Term") + " · all classes";
    renderFeeTotals();
    renderFeeSugg();
    if (S.ob.feeTried) validateFees();
  }
  function renderFeeTotals() {
    var req = 0, opt = 0, n = 0;
    S.ob.fees.forEach(function (f) {
      if (!f.amount) return;
      n++;
      if (f.type === "Optional") opt += f.amount; else req += f.amount;
    });
    $("#fee-foot").innerHTML = '<tr><td class="cell-idx">Σ</td><td>Per student this term<small>' + n + (n === 1 ? " fee" : " fees") + " with amounts</small></td>" +
      "<td><small>Optional</small>" + SC.money(opt) + '</td><td class="num"><small>Required</small>' + SC.money(req) + "</td><td></td></tr>";
    $("#fee-meta").textContent = S.ob.fees.length + (S.ob.fees.length === 1 ? " row" : " rows") + " · " + SC.money(req + opt);
  }
  function renderFeeSugg() {
    var have = S.ob.fees.map(function (f) { return f.title.trim().toLowerCase(); });
    $("#fee-sugg").innerHTML = FEE_SUGG.map(function (t) {
      var on = have.indexOf(t.toLowerCase()) > -1;
      var src = D.fees.filter(function (f) { return f.title === t; })[0] || { amount: 0 };
      return '<button type="button" class="chip" data-fee-sugg="' + esc(t) + '"' + (on ? ' disabled aria-label="' + esc(t) + ', already added"' : "") + ">" +
        I(on ? "check" : "plus", 12) + esc(t) + ' <span class="mono" style="opacity:.7">' + SC.compact(src.amount) + "</span></button>";
    }).join("");
  }
  function validateFees() {
    var first = null, bad = 0;
    $$("#fee-body tr[data-i]").forEach(function (tr) {
      var f = S.ob.fees[+tr.getAttribute("data-i")];
      var blank = !f.title.trim() && !f.amount;
      var tBad = !blank && !f.title.trim(), aBad = !blank && !f.amount;
      $('[data-k="title"]', tr).setAttribute("aria-invalid", String(tBad));
      $('[data-k="amount"]', tr).setAttribute("aria-invalid", String(aBad));
      if (tBad || aBad) { bad++; if (!first) first = $(tBad ? '[data-k="title"]' : '[data-k="amount"]', tr); }
    });
    var err = $("#fee-err");
    err.hidden = !bad;
    err.innerHTML = bad ? I("circle-alert", 14) + "<span>" + bad + (bad === 1 ? " row needs" : " rows need") + " both a title and an amount.</span>" : "";
    return first;
  }
  function focusFeeCell(i, k) {
    var el = $('#fee-body tr[data-i="' + i + '"] [data-k="' + k + '"]');
    if (el) { el.focus(); if (el.select && k !== "type") el.select(); }
    return el;
  }
  function addFee(k, preset) {
    var blank = -1;
    S.ob.fees.forEach(function (f, i) { if (blank < 0 && !f.title.trim() && !f.amount) blank = i; });
    if (preset && blank > -1) S.ob.fees[blank] = preset;
    else { S.ob.fees.push(preset || { title: "", type: "Required", amount: 0 }); blank = S.ob.fees.length - 1; }
    S.ob.cursor = blank;
    renderFees();
    focusFeeCell(blank, k || "title");
  }
  function setCursor(i) {
    S.ob.cursor = i;
    $$("#fee-body tr[data-i]").forEach(function (tr) { tr.classList.toggle("is-cursor", +tr.getAttribute("data-i") === i); });
  }
  var feeBody = $("#fee-body");
  feeBody.addEventListener("input", function (e) {
    var el = e.target, tr = el.closest("tr"), k = el.getAttribute("data-k");
    if (!tr || !k) return;
    var f = S.ob.fees[+tr.getAttribute("data-i")];
    if (k === "amount") f.amount = fmtMoneyInput(el); else f[k] = el.value;
    if (S.ob.feeTried) validateFees();
    renderFeeTotals();
    if (k === "title") renderFeeSugg();
  });
  feeBody.addEventListener("focusin", function (e) {
    var tr = e.target.closest("tr[data-i]");
    if (tr) setCursor(+tr.getAttribute("data-i"));
  });
  feeBody.addEventListener("focusout", function (e) {
    if (!e.relatedTarget || !feeBody.contains(e.relatedTarget)) setCursor(-1);
  });
  feeBody.addEventListener("keydown", function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute("data-k");
    if (!k || e.metaKey || e.ctrlKey || e.altKey) return;
    var i = +el.closest("tr").getAttribute("data-i");
    if (k === "type" && (e.key === "ArrowUp" || e.key === "ArrowDown")) return; // native select
    if (e.key === "ArrowDown") { e.preventDefault(); focusFeeCell(i + 1, k); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusFeeCell(i - 1, k); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (i < S.ob.fees.length - 1) focusFeeCell(i + 1, k);
      else if (S.ob.fees[i].title.trim()) addFee(k);
    }
  });
  feeBody.addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm-fee]");
    if (!b) return;
    var i = +b.getAttribute("data-rm-fee");
    S.ob.fees.splice(i, 1);
    S.ob.cursor = -1;
    renderFees();
    if (!focusFeeCell(Math.min(i, S.ob.fees.length - 1), "title")) $("#fee-add").focus();
  });
  $("#fee-add").addEventListener("click", function () { addFee("title"); });
  $("#fee-sugg").addEventListener("click", function (e) {
    var b = e.target.closest("[data-fee-sugg]");
    if (!b || b.disabled) return;
    var t = b.getAttribute("data-fee-sugg");
    var src = D.fees.filter(function (f) { return f.title === t; })[0] || { type: "Required", amount: 0 };
    addFee("amount", { title: t, type: src.type, amount: src.amount });
  });
  $("#fee-skip").addEventListener("click", function () { complete(3, "skipped"); });
  $("#fee-save").addEventListener("click", function () {
    S.ob.feeTried = true;
    var bad = validateFees();
    if (bad) { bad.focus(); return; }
    S.ob.fees = S.ob.fees.filter(function (f) { return f.title.trim() || f.amount; });
    S.ob.feesSaved = true;
    S.ob.cursor = -1;
    renderFees();
    if (S.ob.fees.length) SC.toast("General fees saved", S.ob.fees.length + " fees · " + SC.money(feeTotal()) + " per student", "receipt");
    complete(3, S.ob.fees.length ? "done" : "skipped");
  });

  /* ---------- 05 Invite staff ---------- */
  $("#s-role").innerHTML = D.staffRoles.map(function (r) { return "<option" + (r === "Teacher" ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("");
  function classOptions() {
    var src = S.ob.classes.length ? S.ob.classes : D.classrooms;
    var out = [];
    src.forEach(function (c) { if (c.arms.length) c.arms.forEach(function (a) { out.push(c.name + " " + a); }); else out.push(c.name); });
    return out;
  }
  function subjectOptions() {
    var u = [];
    S.ob.classes.forEach(function (c) { c.subjects.forEach(function (s) { if (u.indexOf(s) < 0) u.push(s); }); });
    return u.length ? u : SUBJECTS.slice(0, 6);
  }
  function chipGroup(list, picked, attr) {
    return list.map(function (x) {
      var on = picked.indexOf(x) > -1;
      return '<button type="button" class="chip" ' + attr + '="' + esc(x) + '" aria-pressed="' + on + '">' + (on ? I("check", 12) : "") + esc(x) + "</button>";
    }).join("");
  }
  function renderStaffForm() {
    var teacher = $("#s-role").value === "Teacher";
    $("#s-access").hidden = !teacher;
    $("#s-cls").innerHTML = chipGroup(classOptions(), S.ob.access.cls, "data-acc-cls");
    $("#s-subj").innerHTML = chipGroup(subjectOptions(), S.ob.access.subj, "data-acc-subj");
  }
  function renderInvites() {
    var inv = S.ob.invites;
    $("#inv-meta").textContent = inv.length + " sent";
    $("#inv-body").innerHTML = inv.length ? inv.map(function (x) {
      var acc = x.access ? ([x.access.cls.join(", "), x.access.subj.join(", ")].filter(Boolean).join(" · ") || "No classes yet") : "Role default";
      return '<tr><td class="mono">' + esc(x.email) + "</td><td>" + esc(x.role) + '</td><td style="white-space:normal;max-width:18rem">' + esc(acc) + '</td><td><span class="tag tag-info">Invited</span></td></tr>';
    }).join("") : '<tr class="empty-row"><td colspan="4">No invitations yet. Invites you send appear here with their status.</td></tr>';
  }
  $("#s-role").addEventListener("change", renderStaffForm);
  $("#s-access").addEventListener("click", function (e) {
    var b = e.target.closest("[data-acc-cls],[data-acc-subj]");
    if (!b) return;
    var isCls = b.hasAttribute("data-acc-cls"), key = isCls ? "data-acc-cls" : "data-acc-subj";
    var v = b.getAttribute(key), list = isCls ? S.ob.access.cls : S.ob.access.subj, k = list.indexOf(v);
    if (k > -1) list.splice(k, 1); else list.push(v);
    renderStaffForm();
    var again = $("#s-access [" + key + '="' + CSS.escape(v) + '"]');
    if (again) again.focus();
  });
  $("#invite-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = val("s-email").toLowerCase(), role = $("#s-role").value, m = "";
    if (!email) m = "Enter the staff member’s email.";
    else if (!EMAIL.test(email)) m = "Enter an email address like name@school.edu.ng.";
    else if (S.ob.invites.some(function (x) { return x.email === email; })) m = email + " has already been invited.";
    setErr("s-email", m);
    if (m) { $("#s-email").focus(); return; }
    S.ob.invites.push({ email: email, role: role, access: role === "Teacher" ? { cls: S.ob.access.cls.slice(), subj: S.ob.access.subj.slice() } : null });
    var ok = $("#s-success");
    ok.innerHTML = I("circle-check") + "<strong>Invite sent to " + esc(email) + "</strong><p>Joins as " + esc(role) + ". Accepted by email provider; inbox delivery is not confirmed.</p>";
    ok.hidden = false;
    $("#s-email").value = "";
    S.ob.access = { cls: [], subj: [] };
    renderStaffForm();
    renderInvites();
    renderRail();
    $("#s-email").focus();
  });
  $("#staff-skip").addEventListener("click", function () { complete(4, S.ob.invites.length ? "done" : "skipped"); });
  $("#go-dash").addEventListener("click", function () { if (S.ob.invites.length) S.ob.status[4] = "done"; });

  /* ---------- Summary (after the last step) ---------- */
  function renderSummary() {
    var st = S.ob.status, L = ledgerValues();
    var v = subVal() || D.school.subdomain;
    var values = [
      "dashboard." + esc(v) + ".school-clerk.com",
      L[0][1] ? L[0][1] + " · " + (L[1][1] === "none" ? "no terms" : L[1][1] + " terms") : null,
      L[2][1],
      L[3][1],
      L[4][1] ? L[4][1] + " invited" : null,
    ];
    $("#ob-sum").innerHTML = OB_LABELS.map(function (l, i) {
      return "<dt>" + pad(i + 1) + " " + l + '</dt><dd class="v">' + (values[i] || '<span style="color:var(--muted-foreground)">—</span>') + '</dd><dd class="s">' + statusTag(st[i], false) + "</dd>";
    }).join("");
    var done = st.filter(function (s) { return s === "done"; }).length;
    $("#sum-meta").textContent = done + " of 5 done";
  }

  /* ---------- Keyboard: ⌘↵ / Ctrl+Enter runs the primary action ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
    if ($('.sheet[data-open="true"], .dialog[data-open="true"]')) return;
    if (S.phase === "onboard") {
      var p = $("#ob-" + S.ob.step + " [data-primary]");
      if (p) { e.preventDefault(); p.click(); }
    } else if (!S.created && !S.creating) {
      e.preventDefault();
      next(S.step);
    } else if (S.created) {
      e.preventDefault();
      enterOnboarding();
    }
  });

  /* ---------- Restart (workshop control, outside the product UI) ---------- */
  function resetInputs(root) {
    $$("input, select, textarea", root).forEach(function (el) {
      if (el.type === "checkbox" || el.type === "radio") el.checked = el.defaultChecked;
      else if (el.tagName === "SELECT") $$("option", el).forEach(function (o) { o.selected = o.defaultSelected; });
      else el.value = el.defaultValue;
      el.removeAttribute("aria-invalid");
    });
  }
  function init() {
    gen++;
    clearTimeout(subTimer);
    S = fresh();
    resetInputs(document);
    $$(".field-error").forEach(function (e) { e.hidden = true; e.innerHTML = ""; });
    $$(".input-group.is-invalid").forEach(function (g) { g.classList.remove("is-invalid"); });
    // signup chrome
    document.body.setAttribute("data-phase", "signup");
    $("#phase-signup").hidden = false;
    $("#phase-onboard").hidden = true;
    var log = $("#su-log");
    $("#step-3").insertBefore(log, $("#step-3 .su-actions"));
    [log, $("#mf-log")].forEach(function (l) { l.innerHTML = ""; l.hidden = true; });
    $("#manifest").classList.remove("is-log");
    setManifestState("Draft", "tag-muted");
    var btn = $("#create-btn");
    btn.disabled = false;
    btn.textContent = "Create workspace";
    $$("#step-3 [data-back]").forEach(function (b) { b.disabled = false; });
    $("#step-3").removeAttribute("aria-busy");
    var vb = $("#verify-btn");
    vb.disabled = false;
    vb.textContent = "I’ve verified my email (preview)";
    var pt = $("#f-pass"); pt.type = "password";
    var tog = $("#pw-toggle");
    tog.setAttribute("aria-pressed", "false");
    tog.setAttribute("aria-label", "Show password");
    tog.innerHTML = I("eye", 14) + "<span>Show</span>";
    $("#pw-rule").setAttribute("data-ok", "false");
    $("#pw-rule").innerHTML = I("circle", 13) + "8–128 characters";
    $("#pw-count").textContent = "0/8";
    $("#su-mini").open = false;
    setSub("idle", "");
    renderAddresses();
    renderManifest();
    // onboarding chrome
    $("#c-streams-wrap").hidden = true;
    $("#c-fee-wrap").hidden = true;
    $("#c-live").textContent = "";
    $("#s-success").hidden = true;
    S.ob.sessionTried = false;
    showStep(0, false);
  }
  $("#restart").addEventListener("click", function () {
    init();
    window.scrollTo(0, 0);
    $("#f-name").focus();
    SC.toast("Preview restarted", "Every field is back to empty", "rotate-ccw");
  });

  init();
})();
