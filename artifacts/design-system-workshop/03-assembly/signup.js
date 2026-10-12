/* Direction 03 — Assembly · signup.html behaviour.
   Conversational signup (one question group per screen) → honest creation state →
   onboarding inside the workspace shell (checklist home + focused step panels).
   Local simulation only: nothing is sent anywhere. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var REDUCED = SC.reduced();

  function ic(name, size, cls) { return SCIcons.icon(name, size || 16, cls); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function find(list, key, val) { for (var i = 0; i < list.length; i++) if (list[i][key] === val) return list[i]; return null; }
  function live(msg) { var el = $("#live"); el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 40); }
  function parseAmt(v) { return Number(String(v || "").replace(/\D/g, "").slice(0, 11)) || 0; }
  function fmtAmt(n) { return n ? Number(n).toLocaleString("en-NG") : ""; }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0] : "—"; }
  function focusEl(el) { if (el) el.focus({ preventScroll: true }); }
  function toTop() { window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }); }

  SC.pill({ id: "03", name: "Assembly" });

  /* ---------- Constants ---------- */
  var STEPS = [
    { key: "name", label: "School" },
    { key: "type", label: "Type" },
    { key: "address", label: "Address" },
    { key: "admin", label: "You" },
    { key: "context", label: "Context" },
    { key: "review", label: "Create" },
  ];
  var TINTS = ["sky", "teal", "violet", "amber", "rose"];
  var TYPE_ICON = { k12: "school", college: "building-2", university: "graduation-cap", vocational: "pencil-ruler", other: "shapes" };
  var PILL_OPTS = {
    count: ["Under 100", "100–300", "300–700", "700 or more"],
    system: ["National", "British", "American", "International", "Hybrid"],
    lang: ["English", "Arabic", "French", "Mixed"],
  };
  var SUBJECTS = ["Mathematics", "English Language", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "Computer Studies", "Yoruba", "Arabic", "French"];
  var FEE_SUGGEST = ["PTA Levy", "Exam Fee", "ID Card", "Portal Fee"];
  var TERM_NAMES = ["First Term", "Second Term", "Third Term", "Fourth Term", "Fifth Term", "Sixth Term"];
  var MOD_C = { Overview: "navy", People: "sky", Academics: "violet", Finance: "teal", Operations: "amber", Settings: "slate" };
  var OB = [
    { key: "welcome", step: 1, title: "Welcome", c: "navy", icon: "house" },
    { key: "session", step: 2, title: "Academic session", c: "amber", icon: "calendar-range", cta: "Set up session", help: "Session title, start and end dates, and the terms inside it." },
    { key: "classes", step: 3, title: "Classrooms", c: "violet", icon: "school", cta: "Add classrooms", help: "Class names and levels, streams, subjects and class fees." },
    { key: "fees", step: 4, title: "General fees", c: "teal", icon: "wallet", cta: "Add fees", help: "Fees every class pays this term, like the PTA levy and exam fee." },
    { key: "staff", step: 5, title: "Invite staff", c: "sky", icon: "user-plus", cta: "Invite staff", help: "Teachers, the bursar, the registrar and anyone else who helps." },
  ];
  var PANELS = { session: "#ob-session", classes: "#ob-classes", fees: "#ob-fees", staff: "#ob-staff" };

  function defaultTerms() {
    return [
      { name: "First Term", start: "2026-09-14", end: "2026-12-18" },
      { name: "Second Term", start: "2027-01-11", end: "2027-04-09" },
      { name: "Third Term", start: "2027-04-26", end: "2027-07-16" },
    ];
  }
  function fresh() {
    return {
      step: 0, visitedContext: false, subTouched: false, sub: { state: "idle", msg: "" },
      creating: false, created: false, verified: false, bellRead: false,
      ob: { welcome: "todo", session: "todo", classes: "todo", fees: "todo", staff: "todo" },
      session: null, terms: defaultTerms(),
      classrooms: [], streams: [], subjectsSel: [],
      fees: [{ title: "PTA Levy", type: "Required", amount: 10000 }],
      invites: [], accessClasses: [], accessSubjects: [],
    };
  }
  var st = fresh();
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  /* ---------- Elements ---------- */
  var form = $("#suForm");
  var sections = STEPS.map(function (s) { return $('[data-step="' + s.key + '"]', form); });
  var F = {
    name: $("#f-name"), sub: $("#f-sub"), fullname: $("#f-fullname"), email: $("#f-email"),
    phone: $("#f-phone"), password: $("#f-password"), country: $("#f-country"), notes: $("#f-notes"),
  };
  var card = $("#idCard");
  var mini = $("#suMini");
  $$("[data-bind]").forEach(function (el) { el.setAttribute("data-fallback", el.textContent); });

  /* ---------- Signup: static renders ---------- */
  $("#typeGrid").innerHTML = D.institutionTypes.map(function (t) {
    var ready = t.status === "ready";
    var badge = ready ? "badge-success" : t.status === "contact" ? "badge-info" : "badge-neutral";
    return '<label class="type-tile' + (ready ? " is-ready" : " is-off") + '" data-c="' + (ready ? "sky" : "slate") + '">' +
      '<input type="radio" name="type" value="' + t.id + '"' + (ready ? " checked" : " disabled") + ' aria-describedby="td-' + t.id + " tb-" + t.id + '">' +
      '<span class="tile">' + ic(TYPE_ICON[t.id] || "school", 18) + "</span>" +
      '<span class="type-name">' + esc(t.label) + "</span>" +
      '<span class="type-desc" id="td-' + t.id + '">' + esc(t.desc) + "</span>" +
      '<span class="badge ' + badge + '" id="tb-' + t.id + '">' + esc(t.badge) + "</span></label>";
  }).join("");

  Object.keys(PILL_OPTS).forEach(function (name) {
    $('[data-pills="' + name + '"]').innerHTML = PILL_OPTS[name].map(function (o) {
      return '<label class="pill-opt"><input type="radio" name="' + name + '" value="' + esc(o) + '"><span>' + esc(o) + "</span></label>";
    }).join("");
  });

  function radioVal(name, root) { var r = (root || form).querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function subVal() { return F.sub.value.trim().toLowerCase(); }
  function schoolName() { return F.name.value.trim(); }
  function typeLabel() { var t = find(D.institutionTypes, "id", radioVal("type")); return t ? t.label : "Institution type"; }
  function tintFor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return TINTS[h % TINTS.length]; }

  /* ---------- Progress ---------- */
  function renderProgress() {
    var cur = st.created ? STEPS.length : st.step;
    var lock = st.creating || st.created;
    $("#suProgress").innerHTML = STEPS.map(function (s, i) {
      var state = i < cur ? "done" : i === cur ? "current" : "todo";
      var inner = (state === "done" ? ic("check", 14) : state === "current" ? '<span class="amber-dot"></span>' : "") + "<span>" + s.label + "</span>";
      if (state === "done" && !lock) {
        return '<li class="seg" data-state="done"><button type="button" class="seg-btn" data-goto="' + i + '" aria-label="Step ' + (i + 1) + ", " + s.label + ', done — go back to it">' + inner + "</button></li>";
      }
      var sr = state === "done" ? ", done" : state === "current" ? ", current step" : "";
      return '<li class="seg" data-state="' + state + '"><span class="seg-btn"' + (state === "current" ? ' aria-current="step"' : "") + ">" + inner + '<span class="sr-only">' + sr + "</span></span></li>";
    }).join("");
    $("#suCount").textContent = st.created ? "Workspace created" : "Step " + (cur + 1) + " of " + STEPS.length;
  }
  $("#suProgress").addEventListener("click", function (e) {
    var b = e.target.closest("[data-goto]");
    if (b) go(+b.getAttribute("data-goto"));
  });

  /* ---------- Step navigation ---------- */
  function bindNames() {
    var n = schoolName();
    $$('[data-bind="name-or"]').forEach(function (el) { el.textContent = n || el.getAttribute("data-fallback"); });
  }
  function go(i, focus) {
    if (i < 0 || i >= STEPS.length || st.creating || st.created) return;
    sections.forEach(function (sec, k) { sec.hidden = k !== i; });
    $("#stepDone").hidden = true;
    st.step = i;
    var key = STEPS[i].key;
    if (key === "context") st.visitedContext = true;
    $("#backBtn").hidden = i === 0;
    $("#skipBtn").hidden = key !== "context";
    $("#nextLabel").textContent = key === "review" ? "Create workspace" : "Continue";
    $("#suActions").hidden = false;
    if (key === "address") { renderSubChips(); if (!F.sub.value) suggestSub(); updateAddr(); }
    if (key === "review") renderReview();
    bindNames();
    renderProgress();
    renderCard();
    if (focus !== false) { focusEl($(".ask-q", sections[i])); toTop(); }
  }

  /* ---------- Validation ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RULES = {
    name: function (v) { v = v.trim(); return !v ? "Enter your institution's name." : v.length < 2 ? "Use at least 2 characters." : ""; },
    fullname: function (v) { return v.trim().length < 2 ? "Enter your full name." : ""; },
    email: function (v) { v = v.trim(); return !v ? "Enter your work email." : !EMAIL.test(v) ? "Enter an email like name@school.edu.ng." : ""; },
    phone: function (v) { v = v.trim(); return !v || /^\+?[0-9][0-9\s-]{6,18}$/.test(v) ? "" : "Enter a phone number like +234 803 000 0000."; },
    password: function (v) { return v.length < 8 ? "Use at least 8 characters." : v.length > 128 ? "Use 128 characters or fewer." : ""; },
  };
  function setErr(input, errId, msg) {
    var el = $("#" + errId);
    if (msg) {
      if (input) input.setAttribute("aria-invalid", "true");
      el.innerHTML = ic("circle-alert", 14) + "<span>" + esc(msg) + "</span>";
      el.hidden = false;
    } else {
      if (input) input.removeAttribute("aria-invalid");
      el.hidden = true;
      el.innerHTML = "";
    }
    return !msg;
  }
  function check(key, show) {
    var msg = RULES[key](F[key].value);
    if (show || !msg) setErr(F[key], "e-" + key, msg);
    return !msg;
  }
  function validStep(key, show) {
    if (key === "name") return check("name", show);
    if (key === "type") {
      var ok = !!radioVal("type");
      if (show) setErr(null, "e-type", ok ? "" : "Choose an institution type.");
      return ok;
    }
    if (key === "address") {
      runSubCheck(true);
      if (st.sub.state === "idle" && show) showSub("error", "Choose a subdomain for your school.");
      return st.sub.state === "ok";
    }
    if (key === "admin") {
      var a = check("fullname", show), b = check("email", show), c = check("phone", show), d = check("password", show);
      return a && b && c && d;
    }
    return true;
  }
  function focusFirstInvalid(sec) {
    focusEl(sec.querySelector('[aria-invalid="true"]') || sec.querySelector("input:not([disabled]), select, textarea"));
  }

  Object.keys(RULES).forEach(function (key) {
    F[key].addEventListener("blur", function () { if (F[key].value) check(key, true); });
    F[key].addEventListener("input", function () { if (F[key].getAttribute("aria-invalid") === "true") check(key, true); });
  });
  F.name.addEventListener("blur", function () { if (schoolName().length >= 2) suggestSub(); });

  function next() {
    if (st.creating || st.created) return;
    var key = STEPS[st.step].key;
    if (key === "review") { create(); return; }
    if (!validStep(key, true)) { focusFirstInvalid(sections[st.step]); nudgeCard(); return; }
    if (key === "name") suggestSub();
    go(st.step + 1);
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); next(); });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches('input[type="radio"], input[type="checkbox"], select')) { e.preventDefault(); next(); }
  });
  $("#backBtn").addEventListener("click", function () { go(st.step - 1); });
  $("#skipBtn").addEventListener("click", function () { go(st.step + 1); });
  form.addEventListener("input", function (e) {
    if (e.target === F.sub) return;
    bindNames();
    renderCard();
    nudgeCard();
  });
  form.addEventListener("change", function (e) {
    if (e.target.type === "radio" || e.target === F.country) { renderCard(); nudgeCard(); }
  });

  /* ---------- Subdomain: debounced, simulated check ---------- */
  var subTimer = null;
  function showSub(state, msg) {
    st.sub = { state: state, msg: msg };
    var icon = state === "checking" ? ic("loader-circle", 18, "spin") : state === "ok" ? ic("circle-check", 18) : state === "error" ? ic("circle-alert", 18) : "";
    var box = $("#subState");
    box.innerHTML = icon;
    box.setAttribute("data-state", state);
    $("#subGroup").setAttribute("data-state", state);
    var m = $("#sub-msg");
    m.setAttribute("data-state", state);
    m.textContent = msg || "";
    if (state === "error") F.sub.setAttribute("aria-invalid", "true"); else F.sub.removeAttribute("aria-invalid");
  }
  function runSubCheck(now) {
    clearTimeout(subTimer);
    var v = subVal();
    if (!v) { showSub("idle", ""); return; }
    if (now) { var r = SC.checkSubdomain(v); showSub(r.state, r.msg); return; }
    showSub("checking", "Checking availability…");
    subTimer = setTimeout(function () {
      var res = SC.checkSubdomain(subVal());
      showSub(res.state, res.msg);
      renderCard();
    }, 350);
  }
  function updateAddr() {
    var v = esc(subVal() || "your-school");
    $("#addrSite").innerHTML = "<mark>" + v + "</mark>.school-clerk.com";
    $("#addrDash").innerHTML = "dashboard.<mark>" + v + "</mark>.school-clerk.com";
  }
  function subSuggestions() {
    var name = schoolName();
    if (!name) return [];
    var full = SC.slugify(name);
    var first = SC.slugify(name.split(/\s+/)[0]);
    var joined = full.replace(/-/g, "");
    var out = [];
    [full, first, joined].forEach(function (s) { if (s && s.length >= 2 && out.indexOf(s) < 0) out.push(s); });
    return out;
  }
  function renderSubChips() {
    var s = subSuggestions();
    $("#subSuggest").hidden = !s.length;
    $("#subChips").innerHTML = s.map(function (x) {
      return '<button type="button" class="chip" data-sub="' + esc(x) + '" aria-pressed="' + (x === subVal()) + '">' + esc(x) + "</button>";
    }).join("");
  }
  function markSubChips() { $$("#subChips [data-sub]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sub") === subVal())); }); }
  function suggestSub() {
    renderSubChips();
    var s = subSuggestions();
    if (!st.subTouched && s.length) {
      F.sub.value = s[0];
      updateAddr();
      runSubCheck(false);
      markSubChips();
      renderCard();
    }
  }
  F.sub.addEventListener("input", function () {
    st.subTouched = true;
    var pos = F.sub.selectionStart;
    var low = F.sub.value.toLowerCase().replace(/\s/g, "-");
    if (low !== F.sub.value) { F.sub.value = low; try { F.sub.setSelectionRange(pos, pos); } catch (err) { /* not supported */ } }
    updateAddr();
    runSubCheck(false);
    markSubChips();
    renderCard();
    nudgeCard();
  });
  $("#subChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sub]");
    if (!b) return;
    F.sub.value = b.getAttribute("data-sub");
    st.subTouched = true;
    updateAddr();
    runSubCheck(false);
    markSubChips();
    renderCard();
    focusEl(F.sub);
  });

  /* ---------- Password ---------- */
  var pwToggle = $("#pwToggle");
  function renderPwToggle() {
    var shown = F.password.type === "text";
    pwToggle.innerHTML = ic(shown ? "eye-off" : "eye", 15) + "<span>" + (shown ? "Hide" : "Show") + '</span><span class="sr-only"> password</span>';
  }
  pwToggle.addEventListener("click", function () {
    F.password.type = F.password.type === "password" ? "text" : "password";
    renderPwToggle();
    focusEl(F.password);
  });
  function renderPwHint() {
    var n = F.password.value.length, ok = n >= 8 && n <= 128;
    var h = $("#pw-hint");
    h.setAttribute("data-ok", String(ok));
    h.innerHTML = ic(ok ? "circle-check" : "circle", 14) + "8 to 128 characters" + (n ? " · " + n + " so far" : "");
  }
  F.password.addEventListener("input", renderPwHint);
  renderPwToggle();

  /* ---------- Live ID card ---------- */
  function setTxt(sel, txt, empty) { var el = $(sel); el.textContent = txt; el.classList.toggle("is-empty", !!empty); }
  function contextParts() {
    var parts = [];
    if (st.visitedContext) parts.push(F.country.value === "Nigeria" ? "Nigeria" : "Outside Nigeria");
    var sys = radioVal("system"), lang = radioVal("lang"), cnt = radioVal("count");
    if (sys) parts.push(sys);
    if (lang) parts.push(lang);
    if (cnt) parts.push(cnt + " students");
    return parts;
  }
  function renderCard() {
    var name = schoolName(), sub = subVal();
    var tint = name ? tintFor(name) : "sky";
    card.setAttribute("data-c", tint);
    mini.setAttribute("data-c", tint);
    var initials = name ? SC.initials(name) : "?";
    $("#idMono").textContent = initials;
    $("#miniMono").textContent = initials;
    setTxt("#idName", name || "Your school name", !name);
    $("#miniName").textContent = name || "Your school";
    $("#idType").textContent = typeLabel();
    var subOk = !!sub && st.sub.state !== "error";
    var shown = sub || "your-school";
    setTxt("#idSite", shown + ".school-clerk.com", !subOk);
    setTxt("#idDash", "dashboard." + shown + ".school-clerk.com", !subOk);
    $("#miniSite").textContent = shown + ".school-clerk.com";
    var full = F.fullname.value.trim(), email = F.email.value.trim();
    setTxt("#idAdmin", full || "—", !full);
    setTxt("#idEmail", email || "—", !email);
    var ctx = contextParts();
    setTxt("#idContext", ctx.length ? ctx.join(" · ") : "Optional", !ctx.length);
  }
  var nudgeTimer = null;
  function nudgeCard() {
    if (REDUCED || st.created) return;
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(function () {
      card.classList.remove("is-nudge");
      void card.offsetWidth;
      card.classList.add("is-nudge");
    }, 240);
  }
  card.addEventListener("animationend", function () { card.classList.remove("is-nudge"); });

  /* ---------- Review ---------- */
  function renderReview() {
    var sub = subVal(), phone = F.phone.value.trim(), ctx = contextParts(), notes = F.notes.value.trim();
    var rows = [
      ["School", esc(schoolName()), 0],
      ["Type", esc(typeLabel()), 1],
      ["Addresses", esc(sub) + ".school-clerk.com<small>dashboard." + esc(sub) + ".school-clerk.com</small>", 2],
      ["Administrator", esc(F.fullname.value.trim()) + "<small>" + esc(F.email.value.trim()) + (phone ? " · " + esc(phone) : "") + "</small>", 3],
      ["Context", ctx.length || notes ? esc(ctx.join(" · ") || "Notes added") + (notes ? "<small>" + esc(notes.length > 80 ? notes.slice(0, 80) + "…" : notes) + "</small>" : "") : '<span class="is-empty">Skipped — add it later in Settings</span>', 4],
    ];
    $("#reviewList").innerHTML = rows.map(function (r) {
      return '<div class="review-row"><dt>' + r[0] + "</dt><dd><span>" + r[1] + '</span><button type="button" class="btn btn-ghost btn-sm" data-goto="' + r[2] + '" aria-label="Change ' + r[0].toLowerCase() + '">Change</button></dd></div>';
    }).join("");
  }
  $("#reviewList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-goto]");
    if (b) go(+b.getAttribute("data-goto"));
  });

  /* ---------- Create workspace → honest completion ---------- */
  function makeItem(it, i, pending) {
    var badge = pending
      ? '<span class="badge badge-neutral">' + ic("loader-circle", 12, "spin") + "Working…</span>"
      : '<span class="badge ' + it.badge[0] + '">' + it.badge[1] + "</span>";
    return '<li class="make-item" data-i="' + i + '"><span class="tile" data-c="' + it.c + '">' + ic(it.icon, 18) + '</span><span class="make-title">' + esc(it.title) + "</span>" + badge + '<span class="make-desc">' + esc(it.desc) + "</span></li>";
  }
  var makeItems = [];
  function create() {
    for (var i = 0; i < STEPS.length - 1; i++) {
      if (!validStep(STEPS[i].key, false)) {
        go(i);
        validStep(STEPS[i].key, true);
        focusFirstInvalid(sections[i]);
        return;
      }
    }
    var name = schoolName(), sub = subVal(), email = F.email.value.trim();
    st.creating = true;
    sections.forEach(function (s) { s.hidden = true; });
    $("#suActions").hidden = true;
    $("#stepDone").hidden = false;
    $("#doneActions").hidden = true;
    $("#doneKicker").innerHTML = '<span class="amber-dot"></span>Creating your workspace';
    $("#q-done").textContent = "Setting up " + name + "…";
    $("#doneHelp").textContent = "This only takes a moment.";
    renderProgress();
    focusEl($("#q-done"));
    toTop();
    makeItems = [
      { c: "sky", icon: "globe", title: "School addresses reserved", desc: sub + ".school-clerk.com · dashboard." + sub + ".school-clerk.com", badge: ["badge-success", "Reserved"] },
      { c: "amber", icon: "mail", title: "Verification email", desc: "Accepted by email provider; inbox delivery is not confirmed.", badge: ["badge-info", "Accepted"] },
      { c: "violet", icon: "send", title: "Workspace email", desc: "Your workspace link for " + email + " — accepted by email provider; inbox delivery is not confirmed.", badge: ["badge-info", "Accepted"] },
      { c: "teal", icon: "bell", title: "Welcome notification", desc: "Waiting for you in your workspace notifications.", badge: ["badge-success", "Ready"] },
    ];
    var list = $("#makeList");
    list.innerHTML = "";
    var step = REDUCED ? 0 : 620;
    makeItems.forEach(function (it, k) {
      later(function () {
        list.insertAdjacentHTML("beforeend", makeItem(it, k, !REDUCED));
        later(function () {
          var li = $('[data-i="' + k + '"]', list);
          if (li) li.outerHTML = makeItem(it, k, false);
        }, REDUCED ? 0 : 480);
      }, k * step);
    });
    later(finishCreate, makeItems.length * step + (REDUCED ? 10 : 560));
  }
  function finishCreate() {
    var name = schoolName();
    st.creating = false;
    st.created = true;
    $("#doneKicker").innerHTML = '<span class="amber-dot"></span>Workspace created';
    $("#q-done").textContent = name + " has its own workspace";
    $("#doneHelp").textContent = "Here's exactly what happened. Emails can take a few minutes to arrive.";
    $("#doneActions").hidden = false;
    renderProgress();
    card.classList.remove("is-nudge");
    card.classList.add("is-settled");
    mini.classList.add("is-settled");
    $("#idStatus").textContent = "Created";
    $("#idLive").textContent = "Workspace live";
    $("#cardCaption").textContent = "Your school card, settled. Next: a short setup checklist.";
    live(name + " workspace created. Review what happened, then continue setup.");
  }
  $("#verifyBox").addEventListener("change", function () {
    st.verified = this.checked;
    var li = $('#makeList [data-i="1"]');
    if (!li) return;
    var it = makeItems[1];
    if (st.verified) {
      li.outerHTML = makeItem({ c: "teal", icon: "mail-check", title: it.title, desc: "Verified in this preview.", badge: ["badge-success", "Verified"] }, 1, false);
    } else {
      li.outerHTML = makeItem(it, 1, false);
    }
    live(st.verified ? "Email marked as verified for this preview." : "Email verification unticked.");
  });
  $("#continueSetup").addEventListener("click", enterWorkspace);

  /* =====================================================================
     ONBOARDING · inside the workspace
     ===================================================================== */
  var ws = $("#workspace");
  var openKey = null;

  function navHTML() {
    return D.nav.map(function (m) {
      return '<a class="ws-mod" href="dashboard.html"><span class="tile tile-sm" data-c="' + (MOD_C[m.module] || "slate") + '">' + ic(m.icon, 15) + '</span><span class="ws-mod-label">' + esc(m.module) + "</span>" + ic("chevron-right", 14) + "</a>";
    }).join("");
  }
  $("#wsNav").innerHTML = navHTML();
  $("#moreNav").innerHTML = navHTML();

  /* Segmented progress ring: five arcs, one per step (opacity transitions only) */
  function buildRing(el) {
    var C = 2 * Math.PI * 44, seg = C * 54 / 360, parts = "";
    for (var i = 0; i < 5; i++) {
      var a = 'cx="50" cy="50" r="44" stroke-dasharray="' + seg.toFixed(2) + " " + C.toFixed(2) + '" transform="rotate(' + (-90 + i * 72 + 9) + ' 50 50)"';
      parts += '<circle class="ring-track" ' + a + '/><circle class="ring-fill" data-seg="' + i + '" ' + a + '/><circle class="ring-next" data-seg="' + i + '" ' + a + "/>";
    }
    el.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + parts + "</svg>");
  }
  function updateRing(el, done) {
    $$(".ring-fill", el).forEach(function (c) { c.classList.toggle("is-on", +c.getAttribute("data-seg") < done); });
    $$(".ring-next", el).forEach(function (c) { c.classList.toggle("is-on", +c.getAttribute("data-seg") === done && done < 5); });
  }
  buildRing($("#ring"));
  buildRing($("#miniRing"));

  function doneCount() { return OB.filter(function (o) { return st.ob[o.key] === "done"; }).length; }
  function nextKey() {
    var i;
    for (i = 0; i < OB.length; i++) if (st.ob[OB[i].key] === "todo") return OB[i].key;
    for (i = 0; i < OB.length; i++) if (st.ob[OB[i].key] === "skipped") return OB[i].key;
    return null;
  }
  function cardState(key) {
    if (st.ob[key] === "done") return "done";
    if (key === nextKey()) return "next";
    return st.ob[key];
  }
  function cardTop(o, s) {
    var badge = s === "done" ? ic("check", 13) + "Done" : s === "next" ? '<span class="amber-dot"></span>Up next' : s === "skipped" ? "Skipped for now" : "To do";
    return '<div class="ob-card-top"><span class="tile" data-c="' + o.c + '">' + ic(s === "done" ? "check" : o.icon, 18) + '</span><span class="ob-step">Step ' + o.step + '</span><span class="ob-state" data-s="' + s + '">' + badge + "</span></div>";
  }
  function summary(key) {
    var chip = function (t) { return "<li>" + t + "</li>"; };
    if (key === "session" && st.session) {
      return chip(esc(st.session.title)) + chip(st.session.terms.length ? st.session.terms.length + " term" + (st.session.terms.length === 1 ? "" : "s") : "No terms yet") + chip(fmtDate(st.session.start) + " – " + fmtDate(st.session.end));
    }
    if (key === "classes" && st.classrooms.length) {
      var names = st.classrooms.slice(0, 3).map(function (c) { return chip(esc(c.name)); }).join("");
      return chip(st.classrooms.length + " classroom" + (st.classrooms.length === 1 ? "" : "s")) + names + (st.classrooms.length > 3 ? chip("+" + (st.classrooms.length - 3)) : "");
    }
    if (key === "fees" && st.fees.length) {
      return chip(st.fees.length + " fee" + (st.fees.length === 1 ? "" : "s")) + chip(SC.money(requiredTotal()) + " required per student");
    }
    if (key === "staff" && st.invites.length) {
      return chip(st.invites.length + " invite" + (st.invites.length === 1 ? "" : "s") + " sent") + st.invites.slice(0, 2).map(function (v) { return chip(esc(v.role)); }).join("");
    }
    return "";
  }
  function welcomeCard() {
    var s = cardState("welcome");
    var dash = "dashboard." + subVal() + ".school-clerk.com";
    var nextUp = [["amber", "calendar-range", "Session"], ["amber", "calendar-days", "Terms"], ["violet", "school", "Classrooms"], ["sky", "user-plus", "Staff invites"]];
    return '<li class="ob-card is-wide" data-key="welcome" data-state="' + s + '">' + cardTop(OB[0], s) +
      "<h3>Your workspace is live</h3>" +
      '<p class="ob-card-text">' + esc(schoolName()) + " now has its own workspace at this address. Here's what comes next:</p>" +
      '<div class="ob-url">' + ic("layout-dashboard", 16) + "<span>" + esc(dash) + "</span></div>" +
      '<ul class="ob-next" aria-label="What comes next">' + nextUp.map(function (n) { return '<li><span class="tile" data-c="' + n[0] + '">' + ic(n[1], 12) + "</span>" + n[2] + "</li>"; }).join("") + "</ul>" +
      '<div class="ob-card-actions"><button type="button" class="btn ' + (s === "done" ? "btn-outline" : "btn-default") + '" data-act="welcome">Set up academic session' + ic("arrow-right") + "</button>" +
      '<button type="button" class="btn btn-ghost" data-act="verify">' + (st.verified ? "Email verified" : "Verify email or request a fresh link") + "</button></div></li>";
  }
  function stepCard(o) {
    var s = cardState(o.key);
    var sum = summary(o.key);
    var btn = s === "next" ? "btn-default" : s === "done" ? "btn-ghost" : "btn-outline";
    return '<li class="ob-card" data-key="' + o.key + '" data-state="' + s + '">' + cardTop(o, s) + "<h3>" + o.title + "</h3>" +
      (s === "done" && sum ? '<ul class="ob-summary" aria-label="Saved">' + sum + "</ul>" : '<p class="ob-card-text">' + o.help + "</p>") +
      '<div class="ob-card-actions"><button type="button" class="btn ' + btn + '" data-open="' + o.key + '"' + (s === "done" ? ' aria-label="Edit ' + o.title.toLowerCase() + '"' : "") + ">" +
      (s === "done" ? ic("pencil", 15) + "Edit" : o.cta + ic("arrow-right")) + "</button></div></li>";
  }
  function renderChecklist(justDone) {
    $("#obCards").innerHTML = welcomeCard() + OB.slice(1).map(stepCard).join("");
    if (justDone && !REDUCED) {
      var c = $('[data-key="' + justDone + '"]', $("#obCards"));
      if (c) c.classList.add("just-done");
    }
    var n = doneCount();
    updateRing($("#ring"), n);
    updateRing($("#miniRing"), n);
    $("#ringNum").textContent = n;
    $("#ring").setAttribute("aria-label", n + " of 5 setup steps done");
    $("#wsSetupCount").textContent = n + " of 5";
    var finished = OB.every(function (o) { return st.ob[o.key] !== "todo"; });
    $("#obFinish").hidden = !finished;
    var name = schoolName();
    $("#finishTitle").textContent = n === 5 ? name + " is ready for " + firstTermName() + "." : "That's the essentials done.";
    $("#obLede").textContent = n === 5
      ? "Every step is ticked. Your team can sign in and start the term."
      : n === 0
        ? "Five short steps and your team can start the term. Open a card, finish it, and it ticks off here."
        : (5 - n) + " step" + (5 - n === 1 ? "" : "s") + " to go. Pick up where you left off, or skip ahead to the one you need.";
  }
  function firstTermName() { return st.session && st.session.terms[0] ? st.session.terms[0].name : D.session.term; }

  function greeting() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
  function renderTermChip() {
    var dot = $("#termDot"), text = $("#termText");
    if (!st.session) { dot.classList.add("is-off"); text.textContent = "Session not set yet"; return; }
    var t = st.session.terms[0];
    var label = st.session.title + (t ? " · " + t.name : "");
    var start = new Date(st.session.start + "T00:00:00"), now = new Date();
    if (t && t.end) {
      var end = new Date(t.end + "T23:59:59");
      if (now >= start && now <= end) label = t.name + " · Week " + (Math.floor((now - start) / (7 * 864e5)) + 1);
    }
    dot.classList.remove("is-off");
    text.textContent = label;
    $$('[data-bind="term"]').forEach(function (el) { el.textContent = t ? t.name : el.getAttribute("data-fallback"); });
  }
  function renderNotifs() {
    $("#notifList").innerHTML =
      '<div class="notif' + (st.bellRead ? "" : " is-unread") + '"><span class="tile tile-sm" data-c="amber">' + ic("sparkles", 15) + "</span><div><p>Welcome to SchoolClerk</p><small>" + esc(schoolName()) + "'s workspace is ready. Start with the setup checklist.</small></div></div>" +
      '<div class="notif"><span class="tile tile-sm" data-c="sky">' + ic(st.verified ? "mail-check" : "mail", 15) + "</span><div><p>" + (st.verified ? "Email verified" : "Verify your email") + "</p><small>" + esc(F.email.value.trim()) + "</small></div></div>";
  }

  function enterWorkspace() {
    var name = schoolName(), full = F.fullname.value.trim(), email = F.email.value.trim();
    var tint = tintFor(name);
    $("#signupApp").hidden = true;
    ws.hidden = false;
    document.body.classList.add("ws-on");
    var mono = $("#wsMono");
    mono.setAttribute("data-c", tint);
    mono.textContent = SC.initials(name);
    $("#wsName").textContent = name;
    $("#wsSite").textContent = "dashboard." + subVal() + ".school-clerk.com";
    var initials = SC.initials(full);
    ["#wsAvatar", "#wsUserAvatar"].forEach(function (s) { $(s).textContent = initials; });
    $("#wsUserName").textContent = full;
    $("#menuName").textContent = full;
    $("#menuEmail").textContent = email;
    $("#wsHello").textContent = greeting() + ", " + (full.split(/\s+/)[0] || "there");
    $("#wsSub").textContent = "Let's get " + name + " ready for the term.";
    $("#obTitle").textContent = "Set up " + name;
    $("#bellDot").hidden = st.bellRead;
    renderNotifs();
    renderTermChip();
    renderChecklist();
    window.scrollTo(0, 0);
    focusEl($("#wsHello"));
    live("You're in your workspace. Setup checklist: " + doneCount() + " of 5 done.");
  }

  function openPanel(key) {
    if (!PANELS[key]) return;
    openKey = key;
    $("#checklist").hidden = true;
    Object.keys(PANELS).forEach(function (k) { $(PANELS[k]).hidden = k !== key; });
    ws.classList.add("is-focused");
    if (key === "staff") { renderAccess(); }
    if (key === "fees") { renderTermChip(); }
    window.scrollTo(0, 0);
    focusEl($(PANELS[key] + " h2"));
  }
  function autoResult(key) { return key === "staff" && st.invites.length ? "done" : null; }
  function closePanel(result) {
    var key = openKey;
    if (!key) return;
    openKey = null;
    Object.keys(PANELS).forEach(function (k) { $(PANELS[k]).hidden = true; });
    $("#checklist").hidden = false;
    ws.classList.remove("is-focused");
    var just = null;
    if (result === "done") { just = key; st.ob[key] = "done"; }
    else if (result === "skipped" && st.ob[key] !== "done") st.ob[key] = "skipped";
    renderChecklist(just);
    window.scrollTo(0, 0);
    focusEl($("#obTitle"));
    var o = find(OB, "key", key);
    if (result === "done") live(o.title + " saved. " + doneCount() + " of 5 done.");
    else if (result === "skipped") live(o.title + " skipped for now. " + doneCount() + " of 5 done.");
  }

  $("#obCards").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "welcome") {
      if (st.ob.welcome !== "done") { st.ob.welcome = "done"; live("Welcome done. 1 of 5 done."); }
      openPanel("session");
      return;
    }
    if (act === "verify") {
      if (st.verified) SC.toast("Your email is already verified", "Verified in this preview.", "mail-check");
      else SC.toast("Fresh verification link requested", "Accepted by email provider; inbox delivery is not confirmed.", "mail");
      return;
    }
    var k = b.getAttribute("data-open");
    if (k) openPanel(k);
  });
  $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { closePanel(autoResult(openKey)); }); });
  $("#wsSetup").addEventListener("click", function (e) {
    e.preventDefault();
    if (openKey) closePanel(autoResult(openKey)); else focusEl($("#obTitle"));
  });
  $("#tabHome").addEventListener("click", function (e) { e.preventDefault(); focusEl($("#obTitle")); toTop(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !openKey || ws.hidden) return;
    if (document.querySelector(".popover[data-menu-open]") || document.querySelector('.sheet[data-open="true"]')) return;
    closePanel(autoResult(openKey));
  }, true);

  $("#bellBtn").addEventListener("click", function () {
    if (st.bellRead) return;
    st.bellRead = true;
    $("#bellDot").hidden = true;
    this.setAttribute("aria-label", "Notifications");
  });
  $("#themeItem").addEventListener("click", function () { SC.theme.toggle(); });
  var moreBtn = $("#moreBtn");
  moreBtn.addEventListener("click", function () {
    moreBtn.setAttribute("aria-expanded", "true");
    SC.open("#moreSheet", { onClose: function () { moreBtn.setAttribute("aria-expanded", "false"); } });
  });

  /* ---------- Step 2 · Academic session ---------- */
  var sTitle = $("#s-title"), sStart = $("#s-start"), sEnd = $("#s-end"), sTerms = $("#s-terms");
  function renderSessionChips() {
    $("#sessionChips").innerHTML = ["2025/2026", "2026/2027", "2027/2028"].map(function (t) {
      return '<button type="button" class="chip" data-title="' + t + '" aria-pressed="' + (sTitle.value.trim() === t) + '">' + t + "</button>";
    }).join("");
  }
  function renderTerms() {
    $("#termsBody").innerHTML = st.terms.map(function (t, i) {
      var label = esc(t.name || "Term " + (i + 1));
      return '<tr data-i="' + i + '">' +
        '<td><label class="sr-only" for="t-name-' + i + '">Term ' + (i + 1) + ' name</label><input class="input" id="t-name-' + i + '" data-f="name" value="' + esc(t.name) + '" maxlength="30"></td>' +
        '<td data-label="Starts"><label class="sr-only" for="t-start-' + i + '">' + label + ' start date</label><input class="input" type="date" id="t-start-' + i + '" data-f="start" value="' + esc(t.start) + '"' + (i === 0 ? " readonly" : "") + "></td>" +
        '<td data-label="Ends"><label class="sr-only" for="t-end-' + i + '">' + label + ' end date</label><input class="input" type="date" id="t-end-' + i + '" data-f="end" value="' + esc(t.end) + '"></td>' +
        '<td><button type="button" class="btn btn-ghost btn-icon btn-sm row-del" data-del="' + i + '" aria-label="Remove ' + label + '"' + (st.terms.length <= 1 ? " disabled" : "") + ">" + ic("trash-2", 15) + "</button></td></tr>";
    }).join("");
  }
  sTitle.addEventListener("input", function () { renderSessionChips(); if (sTitle.getAttribute("aria-invalid")) setErr(sTitle, "e-s-title", ""); });
  $("#sessionChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-title]");
    if (!b) return;
    sTitle.value = b.getAttribute("data-title");
    setErr(sTitle, "e-s-title", "");
    renderSessionChips();
  });
  sStart.addEventListener("input", function () {
    if (st.terms[0]) { st.terms[0].start = sStart.value; var f = $("#t-start-0"); if (f) f.value = sStart.value; }
  });
  sTerms.addEventListener("change", function () { $("#termsWrap").hidden = !sTerms.checked; });
  $("#termsBody").addEventListener("input", function (e) {
    var tr = e.target.closest("tr"), f = e.target.getAttribute("data-f");
    if (!tr || !f) return;
    st.terms[+tr.getAttribute("data-i")][f] = e.target.value;
    e.target.removeAttribute("aria-invalid");
  });
  $("#termsBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del]");
    if (!b || st.terms.length <= 1) return;
    st.terms.splice(+b.getAttribute("data-del"), 1);
    if (st.terms[0]) st.terms[0].start = sStart.value;
    renderTerms();
    focusEl($("#addTerm"));
  });
  $("#addTerm").addEventListener("click", function () {
    if (st.terms.length >= TERM_NAMES.length) return;
    st.terms.push({ name: TERM_NAMES[st.terms.length], start: "", end: "" });
    renderTerms();
    focusEl($("#t-start-" + (st.terms.length - 1)));
  });
  $("#sessionForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true, first = null;
    var title = sTitle.value.trim();
    if (title.length < 2) { setErr(sTitle, "e-s-title", "Enter a session title like 2026/2027."); ok = false; first = first || sTitle; } else setErr(sTitle, "e-s-title", "");
    if (!sStart.value || !sEnd.value) { setErr(sEnd, "e-s-end", "Choose both a start and an end date."); ok = false; first = first || sEnd; }
    else if (sEnd.value <= sStart.value) { setErr(sEnd, "e-s-end", "The session must end after it starts."); ok = false; first = first || sEnd; }
    else setErr(sEnd, "e-s-end", "");
    var terms = [];
    if (sTerms.checked) {
      var bad = false;
      st.terms[0].start = sStart.value;
      st.terms.forEach(function (t, i) {
        var problems = !t.name.trim() || !t.start || !t.end || t.end <= t.start;
        if (problems) {
          bad = true;
          ["name", "start", "end"].forEach(function (f) {
            var el = $("#t-" + f + "-" + i);
            var wrong = f === "name" ? !t.name.trim() : !t[f] || (f === "end" && t.end && t.start && t.end <= t.start);
            if (wrong) { el.setAttribute("aria-invalid", "true"); first = first || el; }
          });
        }
      });
      setErr(null, "e-terms", bad ? "Give each term a name and both dates, with the end after the start." : "");
      if (bad) ok = false;
      terms = st.terms.map(function (t) { return { name: t.name.trim(), start: t.start, end: t.end }; });
    }
    if (!ok) { focusEl(first); return; }
    st.session = { title: title, start: sStart.value, end: sEnd.value, terms: terms };
    renderTermChip();
    closePanel("done");
  });

  /* ---------- Step 3 · Classrooms ---------- */
  var cName = $("#c-name"), cLevel = $("#c-level"), cSub = $("#c-sub"), cFee = $("#c-fee"), cFeeAmt = $("#c-fee-amt"), cStream = $("#c-stream");
  function renderClassChips() {
    var saved = st.classrooms.map(function (c) { return c.name.toLowerCase(); });
    $("#classChips").innerHTML = D.classSuggestions.map(function (n, i) {
      var isSaved = saved.indexOf(n.toLowerCase()) > -1;
      return '<button type="button" class="chip" data-name="' + esc(n) + '" data-level="' + (i + 1) + '" aria-pressed="' + (cName.value.trim() === n) + '"' + (isSaved ? " disabled" : "") + ">" + (isSaved ? ic("check", 14) : ic("plus", 14)) + esc(n) + "</button>";
    }).join("");
  }
  function renderStreams() {
    $("#streamList").innerHTML = st.streams.map(function (s, i) {
      return '<span class="chip chip-x">' + esc(s) + '<button type="button" class="chip-del" data-del-stream="' + i + '" aria-label="Remove stream ' + esc(s) + '">' + ic("x", 12) + "</button></span>";
    }).join("");
  }
  function subjectPool() {
    return SUBJECTS;
  }
  function renderSubjects() {
    $("#subjectChips").innerHTML = subjectPool().map(function (s) {
      return '<button type="button" class="chip" data-subject="' + esc(s) + '" aria-pressed="' + (st.subjectsSel.indexOf(s) > -1) + '">' + esc(s) + "</button>";
    }).join("");
  }
  function renderSaved() {
    var list = st.classrooms;
    $("#savedCount").textContent = list.length;
    $("#savedEmpty").hidden = list.length > 0;
    $("#savedClasses").innerHTML = list.map(function (c, i) {
      var bits = ["Level " + c.level];
      bits.push(c.streams.length ? "Streams " + c.streams.join(", ") : "No streams");
      if (c.subjects.length) bits.push(c.subjects.length + " subject" + (c.subjects.length === 1 ? "" : "s"));
      if (c.fee) bits.push("Tuition " + SC.money(c.fee));
      return '<li class="saved-item"><span class="tile tile-sm" data-c="violet">' + ic("school", 15) + "</span><div><b>" + esc(c.name) + "</b><small>" + esc(bits.join(" · ")) + '</small></div><button type="button" class="btn btn-ghost btn-icon btn-sm row-del" data-del-class="' + i + '" aria-label="Remove ' + esc(c.name) + '">' + ic("trash-2", 15) + "</button></li>";
    }).join("");
  }
  function addStream() {
    var v = cStream.value.trim();
    if (!v) return;
    if (st.streams.map(function (s) { return s.toLowerCase(); }).indexOf(v.toLowerCase()) < 0) st.streams.push(v);
    cStream.value = "";
    setErr(null, "e-streams", "");
    renderStreams();
    focusEl(cStream);
  }
  function resetClassForm(nextLevel) {
    cName.value = "";
    cLevel.value = String(Math.min(30, nextLevel || 1));
    cSub.checked = false;
    $("#streamsWrap").hidden = true;
    st.streams = [];
    st.subjectsSel = [];
    cFee.checked = false;
    $("#classFeeWrap").hidden = true;
    renderStreams();
    renderSubjects();
  }
  function saveClass(fromNext) {
    var name = cName.value.trim();
    if (!name) {
      if (!fromNext) { setErr(cName, "e-c-name", "Enter a class name or pick a suggestion."); focusEl(cName); }
      return !!fromNext;
    }
    if (st.classrooms.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) {
      setErr(cName, "e-c-name", name + " is already saved. Pick another class.");
      focusEl(cName);
      return false;
    }
    if (cSub.checked && !st.streams.length) {
      setErr(null, "e-streams", "Add at least one stream, or turn off Sub-class.");
      focusEl(cStream);
      return false;
    }
    setErr(cName, "e-c-name", "");
    var level = Math.max(1, Math.min(30, parseInt(cLevel.value, 10) || 1));
    var room = { name: name, level: level, streams: cSub.checked ? st.streams.slice() : [], subjects: st.subjectsSel.slice(), fee: cFee.checked ? parseAmt(cFeeAmt.value) : 0 };
    st.classrooms.push(room);
    st.classrooms.sort(function (a, b) { return a.level - b.level; });
    resetClassForm(level + 1);
    renderSaved();
    renderClassChips();
    $("#classNote").innerHTML = ic("circle-check", 16) + esc(name) + " saved" + (room.streams.length ? " with " + room.streams.length + " stream" + (room.streams.length === 1 ? "" : "s") : "");
    if (!fromNext) focusEl(cName);
    return true;
  }
  cName.addEventListener("input", function () { setErr(cName, "e-c-name", ""); $$("#classChips [data-name]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-name") === cName.value.trim())); }); });
  $("#classChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-name]");
    if (!b || b.disabled) return;
    cName.value = b.getAttribute("data-name");
    cLevel.value = b.getAttribute("data-level");
    setErr(cName, "e-c-name", "");
    $$("#classChips [data-name]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
  });
  cSub.addEventListener("change", function () { $("#streamsWrap").hidden = !cSub.checked; if (cSub.checked && !st.streams.length) focusEl(cStream); });
  $("#streamsWrap").addEventListener("click", function (e) {
    var p = e.target.closest("[data-preset]");
    if (p) { st.streams = p.getAttribute("data-preset").split(","); setErr(null, "e-streams", ""); renderStreams(); return; }
    var d = e.target.closest("[data-del-stream]");
    if (d) { st.streams.splice(+d.getAttribute("data-del-stream"), 1); renderStreams(); focusEl(cStream); }
  });
  $("#addStream").addEventListener("click", addStream);
  $("#subjectChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-subject]");
    if (!b) return;
    var s = b.getAttribute("data-subject"), i = st.subjectsSel.indexOf(s);
    if (i > -1) st.subjectsSel.splice(i, 1); else st.subjectsSel.push(s);
    b.setAttribute("aria-pressed", String(i < 0));
  });
  cFee.addEventListener("change", function () { $("#classFeeWrap").hidden = !cFee.checked; if (cFee.checked) focusEl(cFeeAmt); });
  cFeeAmt.addEventListener("input", function () { cFeeAmt.value = fmtAmt(parseAmt(cFeeAmt.value)); });
  $("#saveClass").addEventListener("click", function () { saveClass(false); });
  $("#savedClasses").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del-class]");
    if (!b) return;
    var removed = st.classrooms.splice(+b.getAttribute("data-del-class"), 1)[0];
    renderSaved();
    renderClassChips();
    $("#classNote").textContent = removed ? removed.name + " removed" : "";
    focusEl(cName);
  });
  $("#classForm").addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    if (e.target === cStream) addStream();
    else if (e.target === cName || e.target === cLevel || e.target === cFeeAmt) saveClass(false);
  });
  $("#classForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!saveClass(true)) return;
    closePanel(st.classrooms.length ? "done" : "skipped");
  });

  /* ---------- Step 4 · General fees ---------- */
  function feeAmountFor(title) { var f = find(D.fees, "title", title); return f ? f.amount : 0; }
  function hasFee(title) { return st.fees.some(function (f) { return f.title.trim().toLowerCase() === title.toLowerCase(); }); }
  function requiredTotal() { return st.fees.reduce(function (s, f) { return s + (f.type === "Required" ? f.amount : 0); }, 0); }
  function renderFeeChips() {
    $("#feeChips").innerHTML = FEE_SUGGEST.map(function (t) {
      var on = hasFee(t);
      return '<button type="button" class="chip" data-fee="' + esc(t) + '"' + (on ? " disabled" : "") + ">" + ic(on ? "check" : "plus", 14) + esc(t) + " · " + SC.money(feeAmountFor(t)) + "</button>";
    }).join("");
  }
  function renderFees() {
    $("#feeRows").innerHTML = st.fees.map(function (f, i) {
      var label = esc(f.title || "fee " + (i + 1));
      return '<li class="fee-row" data-i="' + i + '">' +
        '<div><label class="sr-only" for="fee-t-' + i + '">Fee ' + (i + 1) + ' title</label><input class="input" id="fee-t-' + i + '" data-f="title" value="' + esc(f.title) + '" placeholder="Fee title" maxlength="40"></div>' +
        '<div><label class="sr-only" for="fee-y-' + i + '">' + label + ' type</label><select class="select" id="fee-y-' + i + '" data-f="type"><option' + (f.type === "Required" ? " selected" : "") + ">Required</option><option" + (f.type === "Optional" ? " selected" : "") + ">Optional</option></select></div>" +
        '<div><label class="sr-only" for="fee-a-' + i + '">' + label + ' amount in naira</label><div class="input-group"><span class="input-addon">₦</span><input class="input num" id="fee-a-' + i + '" data-f="amount" inputmode="numeric" value="' + fmtAmt(f.amount) + '" placeholder="0"></div></div>' +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm row-del" data-del-fee="' + i + '" aria-label="Remove ' + label + '">' + ic("trash-2", 15) + "</button></li>";
    }).join("");
    renderFeeTotal();
    renderFeeChips();
  }
  function renderFeeTotal() { $("#feeTotal").textContent = SC.money(requiredTotal()); }
  $("#feeRows").addEventListener("input", function (e) {
    var li = e.target.closest("[data-i]"), f = e.target.getAttribute("data-f");
    if (!li || !f) return;
    var fee = st.fees[+li.getAttribute("data-i")];
    if (f === "amount") { fee.amount = parseAmt(e.target.value); e.target.value = fmtAmt(fee.amount); }
    else fee[f] = e.target.value;
    e.target.removeAttribute("aria-invalid");
    renderFeeTotal();
    if (f === "title") renderFeeChips();
  });
  $("#feeRows").addEventListener("change", function (e) {
    if (e.target.getAttribute("data-f") === "type") { st.fees[+e.target.closest("[data-i]").getAttribute("data-i")].type = e.target.value; renderFeeTotal(); }
  });
  $("#feeRows").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del-fee]");
    if (!b) return;
    st.fees.splice(+b.getAttribute("data-del-fee"), 1);
    renderFees();
    focusEl($("#addFee"));
  });
  $("#feeChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-fee]");
    if (!b || b.disabled) return;
    var t = b.getAttribute("data-fee"), src = find(D.fees, "title", t);
    st.fees.push({ title: t, type: src ? src.type : "Required", amount: src ? src.amount : 0 });
    renderFees();
    setErr(null, "e-fees", "");
    focusEl($("#fee-a-" + (st.fees.length - 1)));
  });
  $("#addFee").addEventListener("click", function () {
    st.fees.push({ title: "", type: "Required", amount: 0 });
    renderFees();
    focusEl($("#fee-t-" + (st.fees.length - 1)));
  });
  $("#skipFees").addEventListener("click", function () { closePanel("skipped"); });
  $("#feesForm").addEventListener("submit", function (e) {
    e.preventDefault();
    st.fees = st.fees.filter(function (f) { return f.title.trim() || f.amount; });
    renderFees();
    if (!st.fees.length) { closePanel("skipped"); return; }
    var first = null;
    st.fees.forEach(function (f, i) {
      if (!f.title.trim()) { var t = $("#fee-t-" + i); t.setAttribute("aria-invalid", "true"); first = first || t; }
      if (!f.amount) { var a = $("#fee-a-" + i); a.setAttribute("aria-invalid", "true"); first = first || a; }
    });
    if (first) { setErr(null, "e-fees", "Give each fee a title and an amount above ₦0."); focusEl(first); return; }
    setErr(null, "e-fees", "");
    st.fees.forEach(function (f) { f.title = f.title.trim(); });
    closePanel("done");
  });

  /* ---------- Step 5 · Invite staff ---------- */
  var iEmail = $("#i-email");
  function renderRolePills() {
    $("#rolePills").innerHTML = D.staffRoles.map(function (r) {
      return '<label class="pill-opt"><input type="radio" name="staffRole" value="' + esc(r) + '"' + (r === "Teacher" ? " checked" : "") + "><span>" + esc(r) + "</span></label>";
    }).join("");
    $("#teacherAccess").hidden = false;
  }
  function classOptions() {
    var src = st.classrooms.length ? st.classrooms : D.classrooms.map(function (c) { return { name: c.name, streams: c.arms }; });
    var out = [];
    src.forEach(function (c) {
      if (c.streams && c.streams.length) c.streams.forEach(function (s) { out.push(c.name + " " + s); });
      else out.push(c.name);
    });
    return out.slice(0, 12);
  }
  function subjectOptions() {
    var set = [];
    st.classrooms.forEach(function (c) { c.subjects.forEach(function (s) { if (set.indexOf(s) < 0) set.push(s); }); });
    return set.length ? set : SUBJECTS.slice(0, 6);
  }
  function renderAccess() {
    $("#accessClasses").innerHTML = classOptions().map(function (c) {
      return '<button type="button" class="chip" data-acc-class="' + esc(c) + '" aria-pressed="' + (st.accessClasses.indexOf(c) > -1) + '">' + esc(c) + "</button>";
    }).join("");
    $("#accessSubjects").innerHTML = subjectOptions().map(function (s) {
      return '<button type="button" class="chip" data-acc-subject="' + esc(s) + '" aria-pressed="' + (st.accessSubjects.indexOf(s) > -1) + '">' + esc(s) + "</button>";
    }).join("");
  }
  function toggleIn(list, v) { var i = list.indexOf(v); if (i > -1) list.splice(i, 1); else list.push(v); return i < 0; }
  $("#teacherAccess").addEventListener("click", function (e) {
    var b = e.target.closest("[data-acc-class],[data-acc-subject]");
    if (!b) return;
    var on = b.hasAttribute("data-acc-class") ? toggleIn(st.accessClasses, b.getAttribute("data-acc-class")) : toggleIn(st.accessSubjects, b.getAttribute("data-acc-subject"));
    b.setAttribute("aria-pressed", String(on));
  });
  $("#rolePills").addEventListener("change", function () {
    $("#teacherAccess").hidden = radioVal("staffRole", $("#staffForm")) !== "Teacher";
    setErr(null, "e-i-role", "");
  });
  iEmail.addEventListener("input", function () { if (iEmail.getAttribute("aria-invalid")) setErr(iEmail, "e-i-email", ""); });
  function renderInvites() {
    $("#invitesWrap").hidden = !st.invites.length;
    $("#inviteCount").textContent = st.invites.length;
    $("#inviteList").innerHTML = st.invites.map(function (v) {
      var access = v.role === "Teacher" && (v.classes.length || v.subjects.length) ? " · " + v.classes.concat(v.subjects).slice(0, 4).join(", ") + (v.classes.length + v.subjects.length > 4 ? "…" : "") : "";
      return '<li class="saved-item"><span class="avatar" data-c="sky">' + esc(v.email.slice(0, 2).toUpperCase()) + "</span><div><b>" + esc(v.email) + "</b><small>" + esc(v.role + access) + '</small></div><span class="badge badge-info badge-dot">Invited</span></li>';
    }).join("");
    $("#skipStaff").textContent = st.invites.length ? "Done for now" : "Skip for now";
  }
  $("#staffForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = iEmail.value.trim();
    var msg = !email ? "Enter your colleague's email." : !EMAIL.test(email) ? "Enter an email like name@school.edu.ng." : st.invites.some(function (v) { return v.email.toLowerCase() === email.toLowerCase(); }) ? "You've already invited " + email + "." : "";
    setErr(iEmail, "e-i-email", msg);
    var role = radioVal("staffRole", $("#staffForm"));
    setErr(null, "e-i-role", role ? "" : "Choose a role.");
    if (msg || !role) { focusEl(msg ? iEmail : $('input[name="staffRole"]')); return; }
    var inv = { email: email, role: role, classes: role === "Teacher" ? st.accessClasses.slice() : [], subjects: role === "Teacher" ? st.accessSubjects.slice() : [] };
    st.invites.push(inv);
    renderInvites();
    $("#inviteOk").hidden = false;
    $("#inviteOkTitle").textContent = "Invite sent to " + email;
    $("#inviteOkDesc").textContent = "They'll join " + schoolName() + " as " + role + ". Accepted by email provider; inbox delivery is not confirmed.";
    iEmail.value = "";
    st.accessClasses = [];
    st.accessSubjects = [];
    renderAccess();
    focusEl(iEmail);
  });
  $("#skipStaff").addEventListener("click", function () { closePanel(st.invites.length ? "done" : "skipped"); });

  /* ---------- Onboarding renders ---------- */
  function initOnboarding() {
    $("#termsWrap").hidden = !sTerms.checked;
    $("#streamsWrap").hidden = !cSub.checked;
    $("#classFeeWrap").hidden = !cFee.checked;
    renderSessionChips();
    renderTerms();
    renderClassChips();
    renderStreams();
    renderSubjects();
    renderSaved();
    renderFees();
    renderRolePills();
    renderAccess();
    renderInvites();
    $("#inviteOk").hidden = true;
    $("#classNote").textContent = "";
    renderTermChip();
  }

  /* ---------- Restart (outside the product UI) ---------- */
  $("#restartBtn").addEventListener("click", function () {
    timers.forEach(clearTimeout);
    timers = [];
    clearTimeout(subTimer);
    clearTimeout(nudgeTimer);
    $$(".overlay").forEach(function () { SC.close(); });
    $$(".popover[data-menu-open]").forEach(function (m) { m.hidden = true; m.removeAttribute("data-menu-open"); });
    [form, $("#sessionForm"), $("#classForm"), $("#feesForm"), $("#staffForm")].forEach(function (f) { f.reset(); });
    st = fresh();
    openKey = null;
    F.password.type = "password";
    renderPwToggle();
    renderPwHint();
    $$(".field-error").forEach(function (el) { el.hidden = true; el.innerHTML = ""; });
    $$("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    showSub("idle", "");
    updateAddr();
    renderSubChips();
    card.classList.remove("is-settled", "is-nudge");
    mini.classList.remove("is-settled");
    $("#idStatus").textContent = "Draft";
    $("#idLive").textContent = "Not created yet";
    $("#cardCaption").textContent = "Your school card fills in as you answer.";
    $("#makeList").innerHTML = "";
    $("#stepDone").hidden = true;
    Object.keys(PANELS).forEach(function (k) { $(PANELS[k]).hidden = true; });
    $("#checklist").hidden = false;
    ws.classList.remove("is-focused");
    ws.hidden = true;
    document.body.classList.remove("ws-on");
    $("#signupApp").hidden = false;
    $("#bellDot").hidden = false;
    $("#bellBtn").setAttribute("aria-label", "Notifications, 1 unread");
    initOnboarding();
    go(0, false);
    window.scrollTo(0, 0);
    focusEl(F.name);
    live("Preview restarted. Nothing was kept.");
  });

  /* ---------- Boot ---------- */
  initOnboarding();
  updateAddr();
  renderPwHint();
  go(0, false);
})();
