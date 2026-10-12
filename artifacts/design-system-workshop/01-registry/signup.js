/* 01 — Registry · signup.html
   Signup (5 steps) → creation (charter sealed) → onboarding inside the workspace (5 steps).
   Everything is a local simulation: no network calls, nothing is sent.
   User-typed text is always inserted with textContent or SC.esc. */
(function () {
  "use strict";
  var D = SC.data;
  var esc = SC.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var byId = function (id) { return document.getElementById(id); };
  var icon = function (n, s, c) { return SCIcons.icon(n, s || 16, c); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var body = document.body;
  var ENTRY_DATE = "9 October 2026";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
  var SUBJECTS = ["English Language", "Mathematics", "Basic Science", "Social Studies", "Civic Education", "Computer Studies", "Yoruba", "Arabic"];
  var FEE_SUGGEST = ["PTA Levy", "Exam Fee", "ID Card", "Portal Fee"];
  var SYSTEMS = ["National", "British", "American", "International", "Hybrid"];
  var LANGUAGES = ["English", "Arabic", "French", "Mixed"];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  // ------------------------------------------------------------------
  // State (DOM inputs stay the source of truth for typed signup values,
  // so going back never loses anything)
  // ------------------------------------------------------------------
  var S = {
    phase: "signup",
    step: 1, maxStep: 1,
    subTouched: false, subTimer: 0,
    verified: false,
    ob: 1, obMax: 1,
    obStatus: { 1: "todo", 2: "todo", 3: "todo", 4: "todo", 5: "todo" },
    terms: [
      { name: "First Term", start: "2026-09-14", end: "2026-12-18" },
      { name: "Second Term", start: "2027-01-11", end: "2027-04-02" },
      { name: "Third Term", start: "2027-04-26", end: "2027-07-23" },
    ],
    session: null, termsSaved: [],
    classes: [],
    draft: { streams: ["A", "B", "C"], subjects: [], extraSubjects: [] },
    fees: [{ title: "PTA Levy", type: "Required", amount: 10000 }],
    feesSaved: null,
    invites: [],
    ledgerPrev: {},
  };

  // ------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------
  function val(id) { var el = byId(id); return el ? el.value.trim() : ""; }
  function setErr(input, msg) {
    if (!input) return;
    var e = byId(input.id + "-err");
    if (e) { e.textContent = msg || ""; e.hidden = !msg; }
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }
  function focusHeading(h) {
    if (!h) return;
    h.focus({ preventScroll: true });
    var top = h.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.5) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 120), behavior: "auto" });
    }
  }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? (+m[3]) + " " + MONTHS[+m[2] - 1] + " " + m[1] : "";
  }
  function digits(s) { return String(s || "").replace(/[^\d]/g, ""); }
  function fmtAmount(n) { return n ? SC.money(n, { noSymbol: true }) : ""; }
  function crestSVG(initials) {
    return '<svg class="crest-svg" viewBox="0 0 64 72" aria-hidden="true" focusable="false">' +
      '<path class="crest-shield" d="M32 3 L59 11 V35 C59 52 47 64 32 69 C17 64 5 52 5 35 V11 Z"/>' +
      '<path class="crest-keyline" d="M32 8.5 L54 15 V35 C54 49 44.5 59 32 63.5 C19.5 59 10 49 10 35 V15 Z"/>' +
      '<text class="crest-ini" x="32" y="43" text-anchor="middle">' + esc(initials) + "</text></svg>";
  }
  function sealSVG(ring, mono) {
    var text = String(ring).toUpperCase();
    var size = Math.max(6.2, Math.min(8.4, 300 / Math.max(text.length, 1) / 0.82));
    return '<svg class="seal-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      '<defs><path id="charter-seal-arc" d="M60,60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0"/></defs>' +
      '<circle class="seal-edge" cx="60" cy="60" r="56"/><circle class="seal-disc" cx="60" cy="60" r="53"/>' +
      '<circle class="seal-line" cx="60" cy="60" r="49"/><circle class="seal-line" cx="60" cy="60" r="31"/>' +
      '<text class="seal-text" style="font-size:' + size.toFixed(2) + 'px"><textPath href="#charter-seal-arc" textLength="252" lengthAdjust="spacingAndGlyphs">' + esc(text) + "</textPath></text>" +
      '<text class="seal-mono" x="60" y="69" text-anchor="middle">' + esc(mono) + "</text></svg>";
  }

  // ------------------------------------------------------------------
  // Derived values
  // ------------------------------------------------------------------
  function typeLabel() {
    var r = $('input[name="type"]:checked');
    var t = r && D.institutionTypes.filter(function (x) { return x.id === r.value; })[0];
    return t ? t.label : "K-12 School";
  }
  function subValue() { return byId("f-sub").value.trim().toLowerCase(); }
  function subValid() { var v = subValue(); return v.length >= 2 && /^[a-z0-9-]+$/.test(v); }
  function radioVal(name) { var r = $('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function values() {
    var name = val("f-name");
    var sub = subValid() ? subValue() : "";
    var admin = val("f-admin");
    return {
      name: name || "Your school",
      rawName: name,
      initials: name ? SC.initials(name) : "—",
      sub: sub,
      site: (sub || "your-school") + ".school-clerk.com",
      dashboard: "dashboard." + (sub || "your-school") + ".school-clerk.com",
      admin: admin || "Administrator",
      rawAdmin: admin,
      adminInitials: admin ? SC.initials(admin) : "—",
      email: val("f-email"),
      ctx: [val("f-country"), val("f-size") ? val("f-size") + " students" : "", radioVal("system") ? radioVal("system") + " system" : "", radioVal("language")].filter(Boolean),
    };
  }

  // ------------------------------------------------------------------
  // The charter (live preview) + mobile mini charter
  // ------------------------------------------------------------------
  var CH = {};
  $$("[data-ch]").forEach(function (el) { CH[el.getAttribute("data-ch")] = el; });

  function addrHTML(prefix) {
    var v = subValue();
    var okPart = v && /^[a-z0-9-]+$/.test(v) ? esc(v) : '<span class="ph">your-school</span>';
    return esc(prefix) + okPart + '<span class="ph">.school-clerk.com</span>';
  }
  function renderCharter() {
    var v = values();
    var hasName = !!v.rawName;
    CH.name.textContent = hasName ? v.rawName : "Your institution";
    CH.name.toggleAttribute("data-empty", !hasName);
    CH["mini-name"].textContent = hasName ? v.rawName : "Your institution";
    CH["mini-name"].toggleAttribute("data-empty", !hasName);
    CH.crest.innerHTML = crestSVG(v.initials);
    CH["crest-mini"].innerHTML = crestSVG(v.initials);
    CH.type.textContent = typeLabel();
    CH.site.innerHTML = addrHTML("");
    CH.dash.innerHTML = addrHTML("dashboard.");
    CH["addr-site"].innerHTML = addrHTML("");
    CH["addr-dash"].innerHTML = addrHTML("dashboard.");
    CH["mini-site"].innerHTML = addrHTML("");
    if (v.rawAdmin || v.email) {
      CH.admin.innerHTML = (v.rawAdmin ? esc(v.rawAdmin) : '<span class="blank"></span>') + (v.email ? '<small class="mono">' + esc(v.email) + "</small>" : "");
    } else CH.admin.innerHTML = '<span class="blank"></span>';
    CH.ctx.innerHTML = v.ctx.length > 1 || val("f-size") || radioVal("system") || radioVal("language") ? esc(v.ctx.join(" · ")) : '<span class="ph">Added in step 4</span>';
    CH.sig.textContent = v.rawAdmin || "";
  }

  // ------------------------------------------------------------------
  // Signup steps
  // ------------------------------------------------------------------
  var STEPS = ["", "School", "Address", "Administrator", "Context", "Confirm"];
  var form = byId("su-form");
  var btnBack = $("[data-back]", form), btnSkip = $("[data-skip]", form), btnNext = $("[data-next]", form);

  function renderTypes() {
    byId("type-tiles").innerHTML = D.institutionTypes.map(function (t) {
      var ready = t.status === "ready";
      var badge = ready ? '<span class="badge badge-success badge-dot" id="tb-' + t.id + '">' + esc(t.badge) + "</span>"
        : '<span class="badge ' + (t.status === "contact" ? "badge-outline" : "badge-neutral") + '" id="tb-' + t.id + '">' + esc(t.badge) + "</span>";
      return '<label class="tile">' +
        '<input class="radio" type="radio" name="type" value="' + t.id + '"' + (ready ? " checked" : " disabled") + ' aria-describedby="tb-' + t.id + '">' +
        '<span><span class="tile-title">' + esc(t.label) + '</span><span class="tile-desc">' + esc(t.desc) + "</span></span>" + badge + "</label>";
    }).join("");
  }
  function renderSeg(id, name, list) {
    byId(id).innerHTML = list.map(function (x) {
      return '<label class="seg-item"><input type="radio" name="' + name + '" value="' + esc(x) + '"><span>' + esc(x) + "</span></label>";
    }).join("");
  }
  function renderProgress() {
    byId("su-progress").innerHTML = STEPS.slice(1).map(function (label, i) {
      var n = i + 1, cur = n === S.step, done = n < S.maxStep && !cur;
      return '<li><button type="button" class="su-pstep" data-goto="' + n + '"' + (cur ? ' aria-current="step"' : "") + (done ? " data-done" : "") + (n > S.maxStep ? " disabled" : "") + ">" +
        '<span class="n">' + pad(n) + (done ? icon("check", 13) : "") + '</span><span class="t">' + label + "</span>" +
        (done ? '<span class="sr-only">, completed</span>' : "") + "</button></li>";
    }).join("");
    $("[data-stepno]").textContent = S.step;
    $("[data-steplabel]").textContent = STEPS[S.step];
    $$("#su-segbar i").forEach(function (b, i) { b.setAttribute("data-s", i + 1 < S.step ? "done" : i + 1 === S.step ? "current" : ""); });
  }
  function goStep(n, focus) {
    S.step = n;
    S.maxStep = Math.max(S.maxStep, n);
    $$(".su-step", form).forEach(function (s) { s.hidden = +s.getAttribute("data-step") !== n; });
    btnBack.style.visibility = n === 1 ? "hidden" : "";
    btnSkip.hidden = n !== 4;
    $("[data-next-label]", btnNext).textContent = n === 5 ? "Create workspace" : "Continue";
    $("[data-next-icon]", btnNext).innerHTML = icon(n === 5 ? "stamp" : "arrow-right", 16, n === 5 ? "" : "ico-nudge");
    if (n === 5) renderConfirm();
    renderProgress();
    if (focus !== false) focusHeading(byId("s" + n + "-h"));
  }

  var V = {
    "f-name": function (v) { return v.length >= 2 ? "" : v ? "Use at least 2 characters." : "Enter your institution’s name."; },
    "f-admin": function (v) { return v.length >= 2 ? "" : v ? "Enter your full name." : "Enter your full name."; },
    "f-email": function (v) { return !v ? "Enter your work email." : EMAIL_RE.test(v) ? "" : "Enter an email address like name@yourschool.edu.ng."; },
    "f-phone": function (v) { return !v || (/^[+\d\s()-]+$/.test(v) && digits(v).length >= 7) ? "" : "Enter a phone number like +234 803 000 0000."; },
    "f-pass": function (v) { return !v ? "Create a password." : v.length < 8 ? "Use at least 8 characters." : v.length > 128 ? "Use 128 characters or fewer." : ""; },
  };
  function check(id) {
    var el = byId(id);
    var v = id === "f-pass" ? el.value : el.value.trim();
    var msg = V[id](v);
    setErr(el, msg);
    return msg ? el : null;
  }

  // Subdomain: debounced simulated availability check
  var subInput = byId("f-sub"), subStatus = byId("f-sub-status");
  var SUB_ICON = { idle: "", checking: "loader-circle", ok: "circle-check", error: "circle-alert" };
  function setSub(r) {
    subStatus.setAttribute("data-state", r.state);
    var ic = SUB_ICON[r.state];
    $(".sub-ico", subStatus).innerHTML = ic ? icon(ic, 15, r.state === "checking" ? "spin" : "") : "";
    $(".sub-msg", subStatus).textContent = r.msg || "";
    if (r.state === "error") subInput.setAttribute("aria-invalid", "true"); else subInput.removeAttribute("aria-invalid");
  }
  function subResult(v) {
    if (!v) return { state: "error", msg: "Choose a subdomain for your school." };
    if (v.length > 63) return { state: "error", msg: "Use 63 characters or fewer." };
    return SC.checkSubdomain(v);
  }
  function scheduleSubCheck() {
    clearTimeout(S.subTimer);
    var v = subValue();
    if (!v) { setSub({ state: "idle", msg: "" }); return; }
    setSub({ state: "checking", msg: "Checking availability…" });
    S.subTimer = setTimeout(function () { setSub(subResult(v)); }, 350);
  }
  function suggestSub() {
    if (S.subTouched) return;
    var slug = SC.slugify(val("f-name"));
    if (!slug) return;
    subInput.value = slug;
    byId("sub-suggested").hidden = false;
    scheduleSubCheck();
    renderCharter();
  }

  function validateStep(n) {
    var bad = [];
    if (n === 1) { var b1 = check("f-name"); if (b1) bad.push(b1); }
    if (n === 2) {
      clearTimeout(S.subTimer);
      var r = subResult(subValue());
      setSub(r);
      if (r.state !== "ok") bad.push(subInput);
    }
    if (n === 3) ["f-admin", "f-email", "f-phone", "f-pass"].forEach(function (id) { var b = check(id); if (b) bad.push(b); });
    return bad[0] || null;
  }

  function renderConfirm() {
    var v = values();
    var groups = [
      { step: 1, title: "The school", rows: [["Institution", esc(v.rawName)], ["Type", esc(typeLabel())]] },
      { step: 2, title: "The address", rows: [["Website", esc(v.site), true], ["Workspace", esc(v.dashboard), true]] },
      { step: 3, title: "The administrator", rows: [["Full name", esc(v.rawAdmin)], ["Work email", esc(v.email), true], ["Phone", val("f-phone") ? esc(val("f-phone")) : '<span class="ph">Not given</span>'], ["Password", "•••••••• <span class=\"ph\">(" + byId("f-pass").value.length + " characters)</span>"]] },
      { step: 4, title: "Context", rows: [["Profile", v.ctx.length ? esc(v.ctx.join(" · ")) : '<span class="ph">Skipped</span>'], ["Curriculum notes", val("f-notes") ? esc(val("f-notes")) : '<span class="ph">None</span>']] },
    ];
    byId("confirm").innerHTML = groups.map(function (g) {
      return '<section class="confirm-group" aria-labelledby="cg-' + g.step + '"><div class="confirm-head"><h3 id="cg-' + g.step + '">' + g.title + '</h3>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-goto="' + g.step + '" aria-label="Edit ' + g.title.toLowerCase() + '">' + icon("pencil", 14) + "Edit</button></div><dl>" +
        g.rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd" + (r[2] ? ' class="mono"' : "") + ">" + r[1] + "</dd></div>"; }).join("") +
        "</dl></section>";
    }).join("");
  }

  function jumpTo(n) {
    if (n <= S.step) { goStep(n); return; }
    for (var k = S.step; k < n; k++) {
      var bad = validateStep(k);
      if (bad) { goStep(k, false); bad.focus(); return; }
    }
    goStep(n);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (S.phase !== "signup") return;
    var bad = validateStep(S.step);
    if (bad) { bad.focus(); return; }
    if (S.step === 1) suggestSub();
    if (S.step < 5) goStep(S.step + 1); else createWorkspace();
  });
  // Enter on a radio or checkbox advances too (text inputs submit natively).
  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t.type === "radio" || t.type === "checkbox") { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : btnNext.click(); }
  });
  btnBack.addEventListener("click", function () { if (S.step > 1) goStep(S.step - 1); });
  btnSkip.addEventListener("click", function () { goStep(5); });
  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-goto]");
    if (g && S.phase === "signup") jumpTo(+g.getAttribute("data-goto"));
  });

  form.addEventListener("input", function (e) {
    var t = e.target;
    if (t === subInput) {
      S.subTouched = true;
      byId("sub-suggested").hidden = true;
      var pos = subInput.selectionStart;
      var next = subInput.value.toLowerCase().replace(/\s/g, "-");
      if (next !== subInput.value) { subInput.value = next; try { subInput.setSelectionRange(pos, pos); } catch (err) { /* noop */ } }
      scheduleSubCheck();
    } else if (V[t.id] && t.getAttribute("aria-invalid") === "true") {
      check(t.id); // clear the error as soon as it is fixed
    }
    renderCharter();
  });
  form.addEventListener("change", renderCharter);
  form.addEventListener("focusout", function (e) {
    var t = e.target;
    if (t.id === "f-name") { if (t.value.trim()) { check("f-name"); suggestSub(); } return; }
    if (V[t.id] && (t.value || t.getAttribute("aria-invalid") === "true")) check(t.id);
  });

  byId("pass-toggle").addEventListener("click", function () {
    var p = byId("f-pass"), show = p.type === "password";
    p.type = show ? "text" : "password";
    this.textContent = show ? "Hide" : "Show";
    this.setAttribute("aria-pressed", String(show));
    this.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  // ------------------------------------------------------------------
  // Creation → sealed charter → honest completion
  // ------------------------------------------------------------------
  function bindAll() {
    var v = values();
    var map = { name: v.rawName || "Your school", site: v.site, dashboard: v.dashboard, email: v.email, admin: v.rawAdmin || "Administrator", initials: v.adminInitials, term: (S.termsSaved[0] && S.termsSaved[0].name) || "First Term" };
    $$("[data-bind]").forEach(function (el) {
      var k = el.getAttribute("data-bind");
      if (k in map) el.textContent = map[k];
    });
  }

  function createWorkspace() {
    S.phase = "creating";
    body.setAttribute("data-phase", "creating");
    bindAll();
    var v = values();
    byId("su-form-view").hidden = true;
    byId("su-creating").hidden = false;
    var steps = [
      ["Reserving ", v.site],
      ["Reserving ", v.dashboard],
      ["Creating the workspace for ", v.rawName],
      ["Sending the verification email to ", v.email],
    ];
    var log = byId("cr-log");
    log.innerHTML = steps.map(function (s, i) {
      var mono = i < 2 || i === 3;
      return '<li data-state="wait"><span class="cr-ico">' + icon("circle", 16) + "</span><span>" + esc(s[0]) + "<span" + (mono ? ' class="mono"' : "") + ">" + esc(s[1]) + '</span></span><span class="cr-state">Waiting</span></li>';
    }).join("");
    focusHeading(byId("cr-h"));
    var items = $$("li", log);
    var R = SC.reduced(), gap = R ? 0 : 700;
    items.forEach(function (li, i) {
      setTimeout(function () {
        li.setAttribute("data-state", "run");
        $(".cr-ico", li).innerHTML = icon("loader-circle", 16, "spin");
        $(".cr-state", li).textContent = "Working";
      }, i * gap);
      setTimeout(function () {
        li.setAttribute("data-state", "done");
        $(".cr-ico", li).innerHTML = icon("check", 16);
        $(".cr-state", li).textContent = i === 3 ? "Accepted" : "Done";
      }, i * gap + gap * 0.85);
    });
    setTimeout(sealCharter, items.length * gap + (R ? 0 : 150));
    setTimeout(showCreated, items.length * gap + (R ? 0 : 1300));
  }
  function sealCharter() {
    var v = values();
    CH.seal.innerHTML = sealSVG(v.rawName + " · Entered 2026 · ", v.initials);
    CH.date.textContent = ENTRY_DATE;
    CH.entry.textContent = "Entered";
    CH.state.textContent = "Sealed";
    CH.note.textContent = "Sealed. Your school’s addresses are reserved in its name.";
    byId("charter-pane").setAttribute("data-sealed", "true");
    var card = byId("charter");
    card.classList.remove("is-stamping");
    void card.offsetWidth;
    card.classList.add("is-stamping");
  }
  function showCreated() {
    S.phase = "created";
    body.setAttribute("data-phase", "created");
    byId("su-creating").hidden = true;
    byId("su-created").hidden = false;
    bindAll();
    focusHeading(byId("cd-h"));
  }

  function setVerified() {
    S.verified = true;
    var box = byId("verify-box");
    box.setAttribute("data-verified", "true");
    $("[data-verify-title]", box).textContent = "Email verified (preview)";
    $("[data-verify-desc]", box).textContent = "Marked as verified for this preview. Nothing was checked.";
    $$("[data-verify]").forEach(function (b) { b.hidden = true; });
    var dot = $("[data-verify-dot]");
    dot.setAttribute("data-tone", "ok");
    dot.textContent = "Email verified (preview)";
    var ov = byId("open-verify");
    $(".lbl-long", ov).textContent = "Email verified";
    $(".lbl-short", ov).textContent = "Verified";
    ov.setAttribute("aria-label", "Email verified");
    ov.disabled = true;
    if ($("#verify-dialog").getAttribute("data-open") === "true") SC.close("#verify-dialog");
    SC.toast("Email marked as verified", "Preview only — nothing was checked.", "mail-check");
  }
  document.addEventListener("click", function (e) { if (e.target.closest("[data-verify]")) setVerified(); });

  byId("continue-setup").addEventListener("click", startOnboarding);

  // ------------------------------------------------------------------
  // Onboarding (inside the workspace)
  // ------------------------------------------------------------------
  var OB = ["", "Welcome", "Academic session", "Classrooms", "General fees", "Invite staff"];
  var STATUS_TEXT = { done: "Entered", skipped: "Skipped", todo: "Not started" };

  function startOnboarding() {
    S.phase = "onboarding";
    body.setAttribute("data-phase", "onboarding");
    byId("su-shell").hidden = true;
    byId("ob-shell").hidden = false;
    byId("x-fill").hidden = true;
    byId("page-h1").textContent = "Set up " + (val("f-name") || "your school");
    document.title = "Setup — " + (val("f-name") || "Your school") + " · SchoolClerk";
    bindAll();
    renderTerms();
    renderClassSuggest();
    renderStreams();
    renderSubjects();
    renderSaved();
    renderFeeSuggest();
    renderFees();
    renderRoles();
    renderLedger(true);
    window.scrollTo(0, 0);
    goOb(1);
  }

  function renderObRegister() {
    byId("ob-register").innerHTML = OB.slice(1).map(function (label, i) {
      var n = i + 1, cur = n === S.ob, st = S.obStatus[n];
      var sText = cur ? (st === "done" ? "Entered · open" : "In progress") : STATUS_TEXT[st];
      var mk = st === "done" ? icon("check", 16) : st === "skipped" ? icon("minus", 16) : "";
      return '<li><button type="button" class="ob-reg-item" data-ob-goto="' + n + '" data-status="' + (cur ? "current" : st) + '"' + (cur ? ' aria-current="step"' : "") + (n > S.obMax ? " disabled" : "") + ">" +
        '<span class="n">' + pad(n) + '</span><span><span class="t">' + label + '</span><span class="s">' + sText + '</span></span><span class="mk">' + mk + "</span></button></li>";
    }).join("");
    var entered = [1, 2, 3, 4, 5].filter(function (n) { return S.obStatus[n] !== "todo"; }).length;
    $("[data-ob-count]").textContent = entered + " of 5 entered";
    $("[data-ob-bar]").style.transform = "scaleX(" + entered / 5 + ")";
    $("[data-ob-stepno]").textContent = S.ob;
    $("[data-ob-steplabel]").textContent = OB[S.ob];
    $$("#ob-segbar i").forEach(function (b, i) {
      var n = i + 1;
      b.setAttribute("data-s", n === S.ob ? "current" : S.obStatus[n] === "done" ? "done" : S.obStatus[n] === "skipped" ? "skipped" : "");
    });
  }
  function goOb(n) {
    S.ob = n;
    S.obMax = Math.max(S.obMax, n);
    $$(".ob-step").forEach(function (f) { f.hidden = +f.getAttribute("data-ob") !== n; });
    $("[data-ob-crumb]").textContent = OB[n];
    if (n === 5) renderAccess();
    renderObRegister();
    window.scrollTo(0, 0);
    focusHeading(byId("o" + n + "-h"));
  }
  function complete(n, status) {
    S.obStatus[n] = status || "done";
    renderLedger();
    if (n < 5) goOb(n + 1); else renderObRegister();
  }
  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-ob-goto]");
    if (g && !g.disabled) goOb(+g.getAttribute("data-ob-goto"));
    if (e.target.closest("[data-ob-back]") && S.ob > 1) goOb(S.ob - 1);
  });

  // Inline-add inputs: Enter adds instead of submitting the step form
  function enterAdds(inputId, fn) {
    byId(inputId).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); fn(); } });
  }

  // ----- 1 · Welcome -----
  $('.ob-step[data-ob="1"]').addEventListener("submit", function (e) { e.preventDefault(); complete(1); });
  byId("open-verify").addEventListener("click", function () { SC.open("#verify-dialog"); });
  byId("fresh-link").addEventListener("click", function () {
    SC.toast("Fresh link requested", "Accepted by the email provider; inbox delivery is not confirmed.", "mail");
  });
  byId("copy-url").addEventListener("click", function () {
    var text = "https://" + values().dashboard;
    var done = function () { SC.toast("Address copied", text, "copy"); };
    var fail = function () { SC.toast("Copy isn’t available here", "Select the address to copy it instead.", "info"); };
    try { navigator.clipboard.writeText(text).then(done, fail); } catch (err) { fail(); }
  });

  // ----- 2 · Academic session -----
  function renderTerms() {
    byId("terms-body").innerHTML = S.terms.map(function (t, i) {
      var first = i === 0;
      return "<tr>" +
        '<td data-label="Term"><input class="input" type="text" maxlength="40" value="' + esc(t.name) + '" data-term="' + i + '" data-k="name" aria-label="Term ' + (i + 1) + ' name"></td>' +
        '<td data-label="Starts"><input class="input" type="date" value="' + esc(t.start) + '" data-term="' + i + '" data-k="start" aria-label="' + esc(t.name || "Term") + ' starts"' + (first ? ' readonly aria-describedby="t0-lock"' : "") + ">" +
        (first ? '<span class="term-lock" id="t0-lock">' + icon("lock", 12) + "Matches session start</span>" : "") + "</td>" +
        '<td data-label="Ends"><input class="input" type="date" value="' + esc(t.end) + '" data-term="' + i + '" data-k="end" aria-label="' + esc(t.name || "Term") + ' ends"></td>' +
        '<td class="td-act">' + (first ? "" : '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm-term="' + i + '" aria-label="Remove ' + esc(t.name || "term") + '">' + icon("trash-2", 15) + "</button>") + "</td></tr>";
    }).join("");
  }
  byId("terms-body").addEventListener("input", function (e) {
    var t = e.target, i = t.getAttribute("data-term");
    if (i == null) return;
    S.terms[+i][t.getAttribute("data-k")] = t.value;
  });
  byId("terms-body").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm-term]");
    if (!b) return;
    S.terms.splice(+b.getAttribute("data-rm-term"), 1);
    renderTerms();
    byId("add-term").focus();
  });
  byId("add-term").addEventListener("click", function () {
    var n = S.terms.length;
    S.terms.push({ name: (ORDINALS[n] || "Term " + (n + 1)) + " Term", start: "", end: "" });
    renderTerms();
    var inputs = $$('[data-term="' + n + '"]');
    if (inputs[0]) inputs[0].focus();
  });
  byId("o-ses-start").addEventListener("input", function () {
    S.terms[0].start = this.value;
    var first = $('[data-term="0"][data-k="start"]');
    if (first) first.value = this.value;
  });
  byId("o-terms-on").addEventListener("change", function () { byId("terms-block").hidden = !this.checked; });

  $('.ob-step[data-ob="2"]').addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = null;
    var title = byId("o-ses"), st = byId("o-ses-start"), en = byId("o-ses-end");
    setErr(title, title.value.trim() ? "" : "Enter a session title, like 2026/2027.");
    setErr(st, st.value ? "" : "Choose the date the session starts.");
    setErr(en, !en.value ? "Choose the date the session ends." : st.value && en.value <= st.value ? "The session must end after it starts." : "");
    [title, st, en].forEach(function (x) { if (!bad && x.getAttribute("aria-invalid") === "true") bad = x; });
    var termsOn = byId("o-terms-on").checked;
    var termErr = "";
    $$("#terms-body input").forEach(function (x) { x.removeAttribute("aria-invalid"); });
    if (termsOn) {
      S.terms.forEach(function (t, i) {
        if (termErr) return;
        var row = $$('[data-term="' + i + '"]');
        var label = t.name.trim() || "Term " + (i + 1);
        if (!t.name.trim()) { termErr = "Give term " + (i + 1) + " a name."; row[0].setAttribute("aria-invalid", "true"); }
        else if (!t.start || !t.end) { termErr = "Add start and end dates for " + label + "."; (t.start ? row[2] : row[1]).setAttribute("aria-invalid", "true"); }
        else if (t.end <= t.start) { termErr = label + " must end after it starts."; row[2].setAttribute("aria-invalid", "true"); }
        else if (en.value && t.end > en.value) { termErr = label + " ends after the session does."; row[2].setAttribute("aria-invalid", "true"); }
        if (termErr && !bad) bad = $('#terms-body [aria-invalid="true"]');
      });
    }
    var te = byId("terms-err");
    te.textContent = termErr; te.hidden = !termErr;
    if (bad) { bad.focus(); return; }
    S.session = { title: title.value.trim(), start: st.value, end: en.value };
    S.termsSaved = termsOn ? S.terms.map(function (t) { return { name: t.name.trim(), start: t.start, end: t.end }; }) : [];
    bindAll();
    complete(2);
  });

  // ----- 3 · Classrooms -----
  function renderClassSuggest() {
    var saved = S.classes.map(function (c) { return c.name.toLowerCase(); });
    var current = val("o-cls").toLowerCase();
    byId("cls-suggest").innerHTML = D.classSuggestions.map(function (s, i) {
      var used = saved.indexOf(s.toLowerCase()) > -1;
      return '<button type="button" class="chip" data-suggest="' + esc(s) + '" data-level="' + (i + 1) + '" aria-pressed="' + (current === s.toLowerCase()) + '"' + (used ? ' disabled title="Already saved"' : "") + ">" + (used ? icon("check", 14) : "") + esc(s) + "</button>";
    }).join("");
  }
  byId("cls-suggest").addEventListener("click", function (e) {
    var c = e.target.closest("[data-suggest]");
    if (!c || c.disabled) return;
    byId("o-cls").value = c.getAttribute("data-suggest");
    byId("o-lvl").value = c.getAttribute("data-level");
    setErr(byId("o-cls"), ""); setErr(byId("o-lvl"), "");
    renderClassSuggest();
  });
  byId("o-cls").addEventListener("input", function () {
    var v = this.value.trim().toLowerCase();
    $$("#cls-suggest [data-suggest]").forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-suggest").toLowerCase() === v)); });
    var idx = D.classSuggestions.map(function (s) { return s.toLowerCase(); }).indexOf(v);
    if (idx > -1 && !byId("o-lvl").value) byId("o-lvl").value = idx + 1;
    if (this.getAttribute("aria-invalid") === "true" && v) setErr(this, "");
  });
  byId("o-sub").addEventListener("change", function () { byId("sub-block").hidden = !this.checked; });
  $$('input[name="o-preset"]').forEach(function (r) {
    r.addEventListener("change", function () {
      S.draft.streams = this.value === "gems" ? ["Emerald", "Gold", "Silver"] : ["A", "B", "C"];
      renderStreams();
    });
  });
  function renderStreams() {
    byId("stream-chips").innerHTML = S.draft.streams.map(function (s, i) {
      return '<span class="chip chip-static">' + esc(s) + '<button type="button" class="chip-x" data-rm-stream="' + i + '" aria-label="Remove stream ' + esc(s) + '">' + icon("x", 14) + "</button></span>";
    }).join("") || '<span class="field-description">No streams yet — add one below.</span>';
  }
  byId("stream-chips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm-stream]");
    if (!b) return;
    S.draft.streams.splice(+b.getAttribute("data-rm-stream"), 1);
    renderStreams();
    byId("o-stream-add").focus();
  });
  function addStream() {
    var inp = byId("o-stream-add"), v = inp.value.trim();
    if (!v) return;
    if (S.draft.streams.some(function (s) { return s.toLowerCase() === v.toLowerCase(); })) { setErr(inp, v + " is already a stream."); return; }
    setErr(inp, "");
    S.draft.streams.push(v);
    inp.value = "";
    renderStreams();
  }
  byId("add-stream").addEventListener("click", addStream);
  enterAdds("o-stream-add", addStream);

  function allSubjects() { return SUBJECTS.concat(S.draft.extraSubjects); }
  function renderSubjects() {
    byId("subject-chips").innerHTML = allSubjects().map(function (s) {
      var on = S.draft.subjects.indexOf(s) > -1;
      return '<button type="button" class="chip" data-subject="' + esc(s) + '" aria-pressed="' + on + '">' + (on ? icon("check", 14) : "") + esc(s) + "</button>";
    }).join("");
  }
  byId("subject-chips").addEventListener("click", function (e) {
    var c = e.target.closest("[data-subject]");
    if (!c) return;
    var s = c.getAttribute("data-subject"), i = S.draft.subjects.indexOf(s);
    if (i > -1) S.draft.subjects.splice(i, 1); else S.draft.subjects.push(s);
    renderSubjects();
    var again = $('#subject-chips [data-subject="' + CSS.escape(s) + '"]');
    if (again) again.focus();
  });
  function addSubject() {
    var inp = byId("o-subject-add"), v = inp.value.trim();
    if (!v) return;
    if (allSubjects().map(function (x) { return x.toLowerCase(); }).indexOf(v.toLowerCase()) < 0) S.draft.extraSubjects.push(v);
    var match = allSubjects().filter(function (x) { return x.toLowerCase() === v.toLowerCase(); })[0];
    if (S.draft.subjects.indexOf(match) < 0) S.draft.subjects.push(match);
    inp.value = "";
    renderSubjects();
  }
  byId("add-subject").addEventListener("click", addSubject);
  enterAdds("o-subject-add", addSubject);

  byId("o-clsfee").addEventListener("change", function () { byId("clsfee-block").hidden = !this.checked; if (this.checked) byId("o-clsfee-amt").focus(); });
  function formatAmountInput(inp) {
    var n = +digits(inp.value).slice(0, 10);
    inp.value = fmtAmount(n);
    return n;
  }
  byId("o-clsfee-amt").addEventListener("input", function () { formatAmountInput(this); if (this.value) setErr(this, ""); });

  function renderSaved() {
    var list = byId("saved-list");
    list.innerHTML = S.classes.map(function (c, i) {
      var meta = [c.streams.length ? "Streams " + c.streams.join(", ") : "No streams", c.subjects.length + (c.subjects.length === 1 ? " subject" : " subjects")];
      if (c.fee) meta.push("Tuition " + SC.money(c.fee));
      return '<li' + (c.isNew ? ' class="is-new"' : "") + '><span class="sv-lvl">' + pad(c.level) + '</span><span><span class="sv-name">' + esc(c.name) + '</span><span class="sv-meta">' + esc(meta.join(" · ")) + "</span></span>" +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm-class="' + i + '" aria-label="Remove ' + esc(c.name) + '">' + icon("trash-2", 15) + "</button></li>";
    }).join("");
    S.classes.forEach(function (c) { c.isNew = false; });
    byId("saved-empty").hidden = S.classes.length > 0;
    $("[data-saved-count]").textContent = S.classes.length;
  }
  byId("saved-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm-class]");
    if (!b) return;
    var c = S.classes.splice(+b.getAttribute("data-rm-class"), 1)[0];
    byId("cls-msg").textContent = c.name + " removed.";
    renderSaved(); renderClassSuggest(); renderLedger();
    byId("o-cls").focus();
  });

  $('.ob-step[data-ob="3"]').addEventListener("submit", function (e) {
    e.preventDefault(); // Enter or "Save classroom" saves the class being entered
    var nameEl = byId("o-cls"), lvlEl = byId("o-lvl"), feeEl = byId("o-clsfee-amt");
    var name = nameEl.value.trim(), lvl = +lvlEl.value, bad = null;
    var dupe = S.classes.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); });
    setErr(nameEl, !name ? "Enter a class name, or pick a suggestion." : dupe ? name + " is already saved." : "");
    setErr(lvlEl, !lvlEl.value ? "Enter a class level." : lvl < 1 || lvl > 30 || Math.floor(lvl) !== lvl ? "Use a whole number from 1 to 30." : "");
    var sub = byId("o-sub").checked;
    var subErr = sub && !S.draft.streams.length ? "Add at least one stream, or turn off Sub-class." : "";
    setErr(byId("o-stream-add"), subErr);
    var withFee = byId("o-clsfee").checked, fee = +digits(feeEl.value);
    setErr(feeEl, withFee && !fee ? "Enter the tuition amount, or turn off class fees." : "");
    [nameEl, lvlEl, sub ? byId("o-stream-add") : null, withFee ? feeEl : null].forEach(function (x) { if (x && !bad && x.getAttribute("aria-invalid") === "true") bad = x; });
    if (bad) { bad.focus(); return; }
    S.classes.push({ name: name, level: lvl, streams: sub ? S.draft.streams.slice() : [], subjects: S.draft.subjects.slice(), fee: withFee ? fee : 0, isNew: true });
    S.classes.sort(function (a, b) { return a.level - b.level; });
    // Reset the entry for the next class; keep the stream preset.
    nameEl.value = ""; lvlEl.value = ""; feeEl.value = "";
    byId("o-sub").checked = false; byId("sub-block").hidden = true;
    byId("o-clsfee").checked = false; byId("clsfee-block").hidden = true;
    S.draft.subjects = [];
    byId("cls-msg").textContent = name + " saved.";
    renderSaved(); renderSubjects(); renderClassSuggest(); renderLedger();
    nameEl.focus();
  });
  byId("cls-next").addEventListener("click", function () {
    complete(3, S.classes.length ? "done" : "skipped");
  });

  // ----- 4 · General fees -----
  function feeData(title) { return D.fees.filter(function (f) { return f.title === title; })[0]; }
  function renderFeeSuggest() {
    var have = S.fees.map(function (f) { return f.title.trim().toLowerCase(); });
    var wrap = byId("fee-suggest");
    $$("[data-fee-suggest]", wrap).forEach(function (n) { n.remove(); });
    FEE_SUGGEST.forEach(function (t) {
      var f = feeData(t), used = have.indexOf(t.toLowerCase()) > -1;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("data-fee-suggest", t);
      b.disabled = used;
      b.innerHTML = icon(used ? "check" : "plus", 14) + esc(t) + ' <span class="ph tnum">' + SC.money(f ? f.amount : 0) + "</span>";
      b.setAttribute("aria-label", (used ? t + " added" : "Add " + t + ", " + SC.money(f ? f.amount : 0)));
      wrap.appendChild(b);
    });
  }
  function renderFees(focusIndex, focusKey) {
    byId("fee-rows").innerHTML = S.fees.map(function (f, i) {
      return '<div class="fee-row" role="listitem" data-i="' + i + '">' +
        '<div class="field fr-title"><label class="label" for="fee-t-' + i + '">Fee title</label><input class="input" id="fee-t-' + i + '" type="text" maxlength="60" value="' + esc(f.title) + '" data-k="title" placeholder="e.g. Sports levy"></div>' +
        '<div class="field fr-type"><label class="label" for="fee-y-' + i + '">Type</label><select class="select" id="fee-y-' + i + '" data-k="type"><option' + (f.type === "Required" ? " selected" : "") + ">Required</option><option" + (f.type === "Optional" ? " selected" : "") + ">Optional</option></select></div>" +
        '<div class="field fr-amt"><label class="label" for="fee-a-' + i + '">Amount</label><div class="input-group"><span class="input-addon">₦</span><input class="input amt" id="fee-a-' + i + '" type="text" inputmode="numeric" value="' + fmtAmount(f.amount) + '" data-k="amount" placeholder="0"></div></div>' +
        '<button type="button" class="btn btn-ghost btn-icon fr-del" data-rm-fee="' + i + '" aria-label="Remove ' + esc(f.title || "this fee") + '">' + icon("trash-2", 16) + "</button>" +
        '<p class="field-error fr-err" id="fee-err-' + i + '" hidden></p></div>';
    }).join("") || '<p class="saved-empty">No general fees. Add one, or skip this step.</p>';
    if (focusIndex != null) { var el = byId("fee-" + (focusKey || "t") + "-" + focusIndex); if (el) el.focus(); }
    renderFeeTotals();
  }
  function renderFeeTotals() {
    var req = 0, opt = 0;
    S.fees.forEach(function (f) { if (f.type === "Optional") opt += f.amount || 0; else req += f.amount || 0; });
    $("[data-fee-req]").textContent = SC.money(req);
    $("[data-fee-opt]").textContent = SC.money(opt);
  }
  byId("fee-rows").addEventListener("input", function (e) {
    var t = e.target, row = t.closest(".fee-row");
    if (!row) return;
    var f = S.fees[+row.getAttribute("data-i")], k = t.getAttribute("data-k");
    if (k === "amount") f.amount = formatAmountInput(t);
    else if (k === "title") { f.title = t.value; renderFeeSuggest(); }
    renderFeeTotals();
  });
  byId("fee-rows").addEventListener("change", function (e) {
    var t = e.target, row = t.closest(".fee-row");
    if (row && t.getAttribute("data-k") === "type") { S.fees[+row.getAttribute("data-i")].type = t.value; renderFeeTotals(); }
  });
  byId("fee-rows").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm-fee]");
    if (!b) return;
    S.fees.splice(+b.getAttribute("data-rm-fee"), 1);
    renderFees(); renderFeeSuggest();
    byId("add-fee").focus();
  });
  byId("fee-suggest").addEventListener("click", function (e) {
    var b = e.target.closest("[data-fee-suggest]");
    if (!b || b.disabled) return;
    var f = feeData(b.getAttribute("data-fee-suggest"));
    S.fees.push({ title: f.title, type: f.type, amount: f.amount });
    renderFees(S.fees.length - 1, "a"); renderFeeSuggest();
    var row = $('.fee-row[data-i="' + (S.fees.length - 1) + '"]');
    if (row) row.classList.add("is-new");
  });
  byId("add-fee").addEventListener("click", function () {
    S.fees.push({ title: "", type: "Required", amount: 0 });
    renderFees(S.fees.length - 1, "t");
  });
  $('.ob-step[data-ob="4"]').addEventListener("submit", function (e) {
    e.preventDefault();
    S.fees = S.fees.filter(function (f) { return f.title.trim() || f.amount; });
    renderFees();
    var bad = null;
    S.fees.forEach(function (f, i) {
      var msg = !f.title.trim() ? "Give this fee a title." : !f.amount ? "Enter an amount for " + f.title.trim() + "." : "";
      var err = byId("fee-err-" + i);
      err.textContent = msg; err.hidden = !msg;
      var target = !f.title.trim() ? byId("fee-t-" + i) : byId("fee-a-" + i);
      if (msg) { target.setAttribute("aria-invalid", "true"); target.setAttribute("aria-describedby", "fee-err-" + i); if (!bad) bad = target; }
    });
    if (bad) { bad.focus(); return; }
    S.feesSaved = S.fees.map(function (f) { return { title: f.title.trim(), type: f.type, amount: f.amount }; });
    complete(4, S.feesSaved.length ? "done" : "skipped");
  });
  byId("fees-skip").addEventListener("click", function () { S.feesSaved = null; complete(4, "skipped"); });

  // ----- 5 · Invite staff -----
  function renderRoles() {
    byId("o-inv-role").innerHTML = D.staffRoles.map(function (r) { return "<option" + (r === "Teacher" ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("");
  }
  function renderAccess() {
    var fromSaved = S.classes.length > 0;
    var source = fromSaved ? S.classes : D.classrooms.map(function (c) { return { name: c.name, streams: c.arms, subjects: [] }; });
    var classes = [];
    source.forEach(function (c) {
      if (c.streams && c.streams.length) c.streams.forEach(function (s) { classes.push(c.name + " " + s); });
      else classes.push(c.name);
    });
    var subjects = [];
    S.classes.forEach(function (c) { c.subjects.forEach(function (s) { if (subjects.indexOf(s) < 0) subjects.push(s); }); });
    if (!subjects.length) subjects = SUBJECTS.slice(0, 6);
    byId("access-note").textContent = fromSaved ? "From the classrooms you saved in step 3." : "No classrooms saved yet, so these are example classes. Saved classrooms appear here instead.";
    byId("inv-classes").innerHTML = classes.map(function (c) { return '<label class="chip"><input type="checkbox" class="checkbox" name="inv-class" value="' + esc(c) + '">' + esc(c) + "</label>"; }).join("");
    byId("inv-subjects").innerHTML = subjects.map(function (s) { return '<label class="chip"><input type="checkbox" class="checkbox" name="inv-subject" value="' + esc(s) + '">' + esc(s) + "</label>"; }).join("");
    toggleAccess();
  }
  function toggleAccess() { byId("teacher-access").hidden = byId("o-inv-role").value !== "Teacher"; }
  byId("o-inv-role").addEventListener("change", toggleAccess);
  byId("o-inv-email").addEventListener("input", function () { if (this.getAttribute("aria-invalid") === "true" && EMAIL_RE.test(this.value.trim())) setErr(this, ""); });

  function renderInvites() {
    byId("inv-list").innerHTML = S.invites.map(function (v, i) {
      var access = v.role === "Teacher" && (v.classes.length || v.subjects.length)
        ? [v.classes.length ? v.classes.join(", ") : "", v.subjects.length ? v.subjects.length + (v.subjects.length === 1 ? " subject" : " subjects") : ""].filter(Boolean).join(" · ")
        : v.role === "Teacher" ? "No classes assigned yet" : "Role access";
      return '<li' + (i === S.invites.length - 1 ? ' class="is-new"' : "") + '><span class="sv-lvl">' + pad(i + 1) + '</span><span><span class="sv-name mono" style="font-weight:500;font-size:13.5px">' + esc(v.email) + '</span><span class="sv-meta">' + esc(v.role) + " · " + esc(access) + '</span></span><span class="sdot" data-tone="info">Invited</span></li>';
    }).join("");
    byId("inv-empty").hidden = S.invites.length > 0;
    $("[data-inv-count]").textContent = S.invites.length;
    byId("inv-skip").hidden = S.invites.length > 0;
  }
  $('.ob-step[data-ob="5"]').addEventListener("submit", function (e) {
    e.preventDefault();
    var el = byId("o-inv-email"), email = el.value.trim();
    var dupe = S.invites.some(function (v) { return v.email.toLowerCase() === email.toLowerCase(); });
    setErr(el, !email ? "Enter the staff member’s email." : !EMAIL_RE.test(email) ? "Enter an email address like name@yourschool.edu.ng." : dupe ? email + " has already been invited." : "");
    if (el.getAttribute("aria-invalid") === "true") { el.focus(); return; }
    var role = byId("o-inv-role").value;
    var pick = function (name) { return $$('input[name="' + name + '"]:checked').map(function (x) { return x.value; }); };
    S.invites.push({ email: email, role: role, classes: role === "Teacher" ? pick("inv-class") : [], subjects: role === "Teacher" ? pick("inv-subject") : [] });
    renderInvites();
    var ok = byId("invite-ok");
    byId("invite-ok-title").textContent = "Invitation sent to " + email + " as " + role + ".";
    ok.hidden = false;
    el.value = "";
    $$('#teacher-access input[type="checkbox"]').forEach(function (x) { x.checked = false; });
    S.obStatus[5] = "done";
    renderLedger();
    renderObRegister();
    el.focus();
  });

  // ----- Ledger card -----
  function ledgerValue(key) {
    if (key === "session") return S.session ? [S.session.title, fmtDate(S.session.start) + " – " + fmtDate(S.session.end)] : null;
    if (key === "terms") {
      if (!S.session) return null;
      return S.termsSaved.length ? [S.termsSaved.length + (S.termsSaved.length === 1 ? " term" : " terms"), S.termsSaved.map(function (t) { return t.name; }).join(", ")] : ["None yet", "Terms not initialised"];
    }
    if (key === "classes") {
      if (!S.classes.length) return S.obStatus[3] === "skipped" ? ["Skipped", "Add classrooms any time from Academics › Classes"] : null;
      var names = S.classes.map(function (c) { return c.name; });
      var streams = S.classes.reduce(function (n, c) { return n + Math.max(1, c.streams.length); }, 0);
      return [S.classes.length + (S.classes.length === 1 ? " classroom" : " classrooms"), (names.length > 4 ? names.slice(0, 4).join(", ") + " +" + (names.length - 4) : names.join(", ")) + " · " + streams + (streams === 1 ? " class arm" : " class arms")];
    }
    if (key === "fees") {
      if (S.obStatus[4] === "skipped") return ["Skipped", "Set fees later in Fee Structures"];
      if (!S.feesSaved) return null;
      var req = S.feesSaved.filter(function (f) { return f.type !== "Optional"; }).reduce(function (n, f) { return n + f.amount; }, 0);
      return [S.feesSaved.length + (S.feesSaved.length === 1 ? " fee" : " fees"), SC.money(req) + " required per student"];
    }
    if (key === "invites") {
      if (!S.invites.length) return null;
      var roles = {};
      S.invites.forEach(function (v) { roles[v.role] = (roles[v.role] || 0) + 1; });
      return [S.invites.length + " invited", Object.keys(roles).map(function (r) { return roles[r] + " " + r + (roles[r] > 1 ? "s" : ""); }).join(", ")];
    }
    return null;
  }
  function renderLedger(silent) {
    var filled = 0;
    ["session", "terms", "classes", "fees", "invites"].forEach(function (key) {
      var row = $('[data-led="' + key + '"]'), dd = $("dd", row), v = ledgerValue(key);
      var sig = v ? v.join("|") : "";
      if (v && v[0] !== "Skipped") filled++;
      dd.innerHTML = v ? '<span class="led-v">' + esc(v[0]) + '</span><span class="led-m">' + esc(v[1]) + "</span>" : '<span class="led-empty">Not yet</span>';
      if (!silent && sig && sig !== S.ledgerPrev[key] && !SC.reduced()) {
        row.classList.add("is-new");
        requestAnimationFrame(function () { requestAnimationFrame(function () { row.classList.remove("is-new"); }); });
      }
      S.ledgerPrev[key] = sig;
    });
    $("[data-ledger-count]").textContent = filled + " of 5";
  }

  // ------------------------------------------------------------------
  // Workshop strip: fill sample · restart (outside the product UI)
  // ------------------------------------------------------------------
  byId("x-fill").addEventListener("click", function () {
    if (S.phase !== "signup") return;
    var s = D.school, u = D.user;
    byId("f-name").value = s.name;
    var k12 = $('input[name="type"][value="k12"]'); if (k12) k12.checked = true;
    subInput.value = s.subdomain; S.subTouched = true; byId("sub-suggested").hidden = true;
    byId("f-admin").value = u.name;
    byId("f-email").value = u.email;
    byId("f-phone").value = "+234 803 000 0000";
    byId("f-pass").value = "preview-only-password";
    byId("f-country").value = "Nigeria";
    byId("f-size").value = "300–599";
    var sys = $('input[name="system"][value="National"]'); if (sys) sys.checked = true;
    var lang = $('input[name="language"][value="English"]'); if (lang) lang.checked = true;
    ["f-name", "f-admin", "f-email", "f-phone", "f-pass"].forEach(function (id) { setErr(byId(id), ""); });
    setSub(subResult(subValue()));
    S.maxStep = 5;
    renderCharter();
    renderProgress();
    SC.toast("Sample school filled", "Kingsway Academy · step through with Continue.", "school");
  });
  byId("x-restart").addEventListener("click", function () { window.scrollTo(0, 0); location.reload(); });

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  $$("form").forEach(function (f) { f.reset(); }); // undo browser form restoration after a reload
  renderTypes();
  renderSeg("seg-system", "system", SYSTEMS);
  renderSeg("seg-language", "language", LANGUAGES);
  renderCharter();
  setSub({ state: "idle", msg: "" });
  goStep(1, false);
  renderInvites();
  SCIcons.hydrate(document);
  SC.pill({ id: "01", name: "Registry" });
})();
