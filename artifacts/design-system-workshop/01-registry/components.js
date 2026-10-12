/* School Clerk · Direction 01 — Registry · components.html (style guide)
   Renders swatches and the CSS-variable block from tokens.css; every demo is local. Nothing is sent. */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ic = function (n, s, c) { return SCIcons.icon(n, s || 16, c); };
  var esc = SC.esc;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
  var isMobile = function () { return window.matchMedia("(max-width: 767px)").matches; };

  SC.pill({ id: "01", name: "Registry" });
  $$("[data-kbd-k]").forEach(function (k) { k.textContent = isMac ? "⌘K" : "Ctrl K"; });

  /* ================================================================ tokens */
  /* Verbatim copy of the :root and .dark blocks in tokens.css — used only when the
     stylesheet can't be read through the CSSOM (for example when opened from file://). */
  var FALLBACK = ":root {\n  --font-sans: \"Instrument Sans\", ui-sans-serif, system-ui, sans-serif;\n  --font-display: \"Fraunces\", Georgia, \"Times New Roman\", serif;\n  --font-mono: ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n  --radius: 0.625rem;\n  --control-h: 2.25rem;\n  --row-h: 3rem;\n  --icon-stroke: 1.75;\n\n  --background: #f8f6ef;\n  --foreground: #13261f;\n  --card: #fffdf7;\n  --card-foreground: #13261f;\n  --popover: #fffdf7;\n  --popover-foreground: #13261f;\n  --primary: #165c42;\n  --primary-foreground: #fdfcf7;\n  --secondary: #ecefe6;\n  --secondary-foreground: #1b3a2f;\n  --muted: #f0ede4;\n  --muted-foreground: #5c6a62;\n  --accent: #e5efe7;\n  --accent-foreground: #154733;\n  --destructive: #b3261e;\n  --border: #e1ded3;\n  --input: #d5d3c6;\n  --ring: #2f8a63;\n\n  --success: #1d7a4c;\n  --success-foreground: #ffffff;\n  --warning: #9a6400;\n  --warning-foreground: #ffffff;\n  --info: #2d5f8b;\n  --info-foreground: #ffffff;\n  /* Seal gold: fills, rules, seals, focus marks. Never body text on ivory (3:1). Use --highlight-ink for gold text. */\n  --highlight: #c9952a;\n  --highlight-foreground: #1f1606;\n  --highlight-ink: #8a6315;\n  --highlight-soft: #f4ead2;\n  --paper-rule: #e8e3d4;\n\n  --chart-1: #165c42;\n  --chart-2: #c9952a;\n  --chart-3: #3f7f7a;\n  --chart-4: #6c7fb8;\n  --chart-5: #a4573f;\n\n  /* Inset shell: the sidebar is the dark evergreen frame; content sits on ivory inside it. */\n  --sidebar: #10241c;\n  --sidebar-foreground: #d9e4dd;\n  --sidebar-primary: #e0b65a;\n  --sidebar-primary-foreground: #1d1607;\n  --sidebar-accent: #1b3a2e;\n  --sidebar-accent-foreground: #f6f4ec;\n  --sidebar-border: rgb(255 255 255 / 0.08);\n  --sidebar-ring: #e0b65a;\n  --sidebar-muted: #8fa69a;\n}\n\n.dark {\n  --background: #0d1a15;\n  --foreground: #ecf0ea;\n  --card: #13241d;\n  --card-foreground: #ecf0ea;\n  --popover: #152820;\n  --popover-foreground: #ecf0ea;\n  --primary: #79cfa4;\n  --primary-foreground: #0a2018;\n  --secondary: #1a2e26;\n  --secondary-foreground: #e6efe9;\n  --muted: #182a23;\n  --muted-foreground: #9fb2a8;\n  --accent: #1d3a2e;\n  --accent-foreground: #e6f2ea;\n  --destructive: #f0796f;\n  --border: rgb(255 255 255 / 0.09);\n  --input: rgb(255 255 255 / 0.14);\n  --ring: #79cfa4;\n\n  --success: #63c58e;\n  --success-foreground: #072014;\n  --warning: #e3b24f;\n  --warning-foreground: #231804;\n  --info: #82b2e0;\n  --info-foreground: #071a2c;\n  --highlight: #e0b65a;\n  --highlight-foreground: #1d1607;\n  --highlight-ink: #e8c475;\n  --highlight-soft: #2b2513;\n  --paper-rule: rgb(255 255 255 / 0.07);\n\n  --chart-1: #79cfa4;\n  --chart-2: #e0b65a;\n  --chart-3: #6fb3ad;\n  --chart-4: #94a6dd;\n  --chart-5: #d58a70;\n\n  --sidebar: #08130f;\n  --sidebar-foreground: #d3dfd8;\n  --sidebar-primary: #e0b65a;\n  --sidebar-primary-foreground: #1d1607;\n  --sidebar-accent: #15291f;\n  --sidebar-accent-foreground: #f6f4ec;\n  --sidebar-border: rgb(255 255 255 / 0.07);\n  --sidebar-ring: #e0b65a;\n  --sidebar-muted: #7e9489;\n}\n";

  function parseText(text) {
    var out = { root: [], dark: [] }, re = /(:root|\.dark)\s*\{([^}]*)\}/g, m;
    while ((m = re.exec(text))) {
      var key = m[1] === ":root" ? "root" : "dark";
      m[2].replace(/\/\*[\s\S]*?\*\//g, "").split(";").forEach(function (decl) {
        var i = decl.indexOf(":");
        if (i < 0) return;
        var k = decl.slice(0, i).trim(), v = decl.slice(i + 1).trim();
        if (k.indexOf("--") === 0 && v) out[key].push([k, v]);
      });
    }
    return out;
  }
  function readSheet() {
    try {
      var out = { root: [], dark: [] };
      Array.prototype.forEach.call(document.styleSheets, function (sheet) {
        if (!sheet.href || !/\/tokens\.css(\?|$)/.test(sheet.href)) return;
        Array.prototype.forEach.call(sheet.cssRules, function (rule) {
          if (!rule.style || (rule.selectorText !== ":root" && rule.selectorText !== ".dark")) return;
          var key = rule.selectorText === ":root" ? "root" : "dark";
          for (var i = 0; i < rule.style.length; i++) {
            var p = rule.style[i];
            if (p.indexOf("--") === 0) out[key].push([p, rule.style.getPropertyValue(p).trim()]);
          }
        });
      });
      return out.root.length && out.dark.length ? out : null;
    } catch (e) { return null; }
  }
  var live = readSheet();
  var T = live || parseText(FALLBACK);
  var mapOf = function (list) { var m = {}; list.forEach(function (kv) { m[kv[0]] = kv[1]; }); return m; };
  var LIGHT = mapOf(T.root), DARK = mapOf(T.dark);
  $("#tokens-src").textContent = "globals.css · " + (live ? "read live from tokens.css" : "copied from tokens.css");

  function block(sel, list) { return sel + " {\n" + list.map(function (kv) { return "  " + kv[0] + ": " + kv[1] + ";"; }).join("\n") + "\n}"; }
  var cssText = block(":root", T.root) + "\n\n" + block(".dark", T.dark);
  $("#tokens-code").textContent = cssText;

  $("#copy-css").addEventListener("click", function () {
    var btn = this;
    var done = function (ok) {
      btn.innerHTML = ic(ok ? "check" : "copy") + (ok ? "Copied" : "Select and copy");
      SC.toast(ok ? "CSS variables copied" : "Couldn't reach the clipboard", ok ? T.root.length + " light and " + T.dark.length + " dark tokens." : "The block is selected — press " + (isMac ? "⌘C" : "Ctrl C") + ".", ok ? "circle-check" : "info");
      setTimeout(function () { btn.innerHTML = ic("copy") + "Copy"; }, 2000);
    };
    var selectBlock = function () {
      var r = document.createRange(); r.selectNodeContents($("#tokens-code"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cssText).then(function () { done(true); }, function () { selectBlock(); done(false); });
    } else {
      selectBlock();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      done(ok);
    }
  });

  /* Swatches: each scope is themed by its own variables */
  var GROUPS = [
    ["Surfaces", ["background", "card", "popover", "muted", "secondary", "accent"]],
    ["Ink", ["foreground", "muted-foreground", "primary", "primary-foreground", "secondary-foreground", "accent-foreground"]],
    ["Lines & focus", ["border", "input", "paper-rule", "ring"]],
    ["Seal gold", ["highlight", "highlight-ink", "highlight-soft", "highlight-foreground"]],
    ["Frame · sidebar", ["sidebar", "sidebar-foreground", "sidebar-accent", "sidebar-primary", "sidebar-muted", "sidebar-border"]],
    ["Charts", ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]],
  ];
  var TONES = [
    ["success", '<span class="badge badge-dot x-dotlabel badge-success">Enrolled</span><span class="badge badge-dot badge-success">Paid</span>'],
    ["warning", '<span class="badge badge-dot x-dotlabel badge-warning">Needs classification</span><span class="badge badge-dot badge-warning">Part-paid</span>'],
    ["info", '<span class="badge badge-dot x-dotlabel badge-info">New admission</span><span class="badge badge-dot badge-info">Pending</span>'],
    ["destructive", '<span class="badge badge-dot x-dotlabel badge-destructive">Refunded</span><span class="badge badge-dot badge-destructive">Overdue</span>'],
    ["highlight", '<span class="badge badge-dot x-dotlabel badge-secondary">Waived</span><span class="badge x-current">Current</span>'],
  ];
  function renderScope(el, title, sel, map) {
    var html = '<p class="x-scope-title"><span>' + title + "</span><span>" + sel + "</span></p><div class=\"x-swatches\">";
    GROUPS.forEach(function (g) {
      html += '<p class="x-swatch-group">' + esc(g[0]) + "</p>";
      g[1].forEach(function (name) {
        html += '<div class="x-swatch"><i style="background:var(--' + name + ')"></i><code>--' + name + "</code><span>" + esc(map["--" + name] || "") + "</span></div>";
      });
    });
    html += '<p class="x-swatch-group">Semantic status</p><div class="x-status-rows">';
    TONES.forEach(function (t) {
      html += '<div class="x-status-row"><code>--' + t[0] + "</code><span>" + t[1] + '</span><span class="x-fill" style="background:var(--' + t[0] + ");color:var(--" + t[0] + '-foreground)">Aa</span></div>';
    });
    el.innerHTML = html + "</div></div>";
  }
  var light = $("#scope-light");
  T.root.forEach(function (kv) { light.style.setProperty(kv[0], kv[1]); });
  renderScope(light, "Light", ":root", LIGHT);
  renderScope($("#scope-dark"), "Dark", ".dark", DARK);

  /* ======================================================= status mapping */
  var MAP = [
    ["Enrolled", "Student · term", "success", "On this term's register."],
    ["Not enrolled", "Student · term", "outline", "Hollow dot: on the register, not in this term."],
    ["New admission", "Admission", "info", "First term at the school."],
    ["Returning", "Admission", "neutral", "The usual case, so it stays quiet."],
    ["Needs classification", "Admission", "warning", "Waiting on the registrar."],
    ["Paid", "Receipt · charge", "success", ""],
    ["Partially paid", "Charge", "warning", "A balance is still due."],
    ["Pending", "Charge", "info", "Issued; nothing received yet."],
    ["Draft", "Charge", "outline", "Not yet issued."],
    ["Cancelled", "Charge · receipt", "neutral", "Kept for the record."],
    ["Waived", "Charge", "secondary", "Gold seal dot: an approved concession."],
    ["Refunded", "Receipt", "destructive", "The amount is struck through in ledgers."],
    ["Invited", "Staff", "info", "Invitation sent, not yet accepted."],
  ];
  $("#status-body").innerHTML = MAP.map(function (r) {
    var v = "badge-" + r[2];
    return '<tr><th scope="row" style="color:var(--foreground);font-weight:550">' + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td><td><code>" + v + '</code></td><td><span class="badge badge-dot x-dotlabel ' + v + '">' + esc(r[0]) + '</span></td><td><span class="badge badge-dot ' + v + '">' + esc(r[0]) + '</span></td><td class="x-muted">' + esc(r[3]) + "</td></tr>";
  }).join("");

  var demoAll = $("#demo-all");
  if (demoAll) demoAll.indeterminate = true;

  /* ================================================================ shell */
  var app = $("#app"), inset = $("#inset"), scrim = $("#scrim"), tog = $("#sb-toggle");
  var KEY = "sc-01-guide-sidebar";
  function syncToggle() {
    var m = isMobile();
    tog.innerHTML = ic(m ? "menu" : "panel-left");
    tog.setAttribute("aria-label", m ? "Open contents" : "Toggle contents");
    tog.setAttribute("aria-expanded", String(m ? app.dataset.drawer === "open" : app.dataset.collapsed !== "true"));
    tog.title = m ? "" : "Toggle contents (" + (isMac ? "⌘B" : "Ctrl B") + ")";
  }
  function setCollapsed(c, persist) {
    app.dataset.collapsed = String(!!c);
    $$(".x-sb-item, .x-sb-link").forEach(function (a) { a.title = c ? a.dataset.label || "" : ""; });
    if (persist) SC.store(KEY, c ? "rail" : "full");
    syncToggle();
  }
  function openDrawer() {
    app.dataset.drawer = "open"; scrim.hidden = false; inset.inert = true; syncToggle();
    setTimeout(function () { var a = $('.x-sb-item[aria-current]') || $(".x-sb-item"); if (a) a.focus(); }, 60);
  }
  function closeDrawer(ret) {
    if (app.dataset.drawer !== "open") return;
    delete app.dataset.drawer; scrim.hidden = true; inset.inert = false; syncToggle();
    if (ret) tog.focus();
  }
  tog.addEventListener("click", function () { if (isMobile()) openDrawer(); else setCollapsed(app.dataset.collapsed !== "true", true); });
  scrim.addEventListener("click", function () { closeDrawer(true); });
  $("#drawer-close").addEventListener("click", function () { closeDrawer(true); });
  var wide = window.matchMedia("(min-width: 1280px)");
  setCollapsed(wide.matches ? SC.store(KEY) === "rail" : !isMobile());
  wide.addEventListener("change", function (e) { setCollapsed(e.matches ? SC.store(KEY) === "rail" : true); });
  window.matchMedia("(max-width: 767px)").addEventListener("change", function (e) {
    closeDrawer(false);
    if (!e.matches) setCollapsed(wide.matches ? SC.store(KEY) === "rail" : true); else syncToggle();
  });
  $$(".x-sb-content .x-sb-item, .x-brand, .x-mobile-brand").forEach(function (a) {
    a.addEventListener("click", function () { if (isMobile()) closeDrawer(false); });
  });
  $("#theme-btn").addEventListener("click", function () { SC.theme.toggle(); });
  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key || "").toLowerCase() === "b" && !isMobile() && !document.querySelector('.sheet[data-open="true"], .dialog[data-open="true"]')) {
      e.preventDefault(); setCollapsed(app.dataset.collapsed !== "true", true); return;
    }
    if (e.key === "Escape" && !e.defaultPrevented && app.dataset.drawer === "open") closeDrawer(true);
  });

  /* Scrollspy: the gold rule follows the section being read */
  var secs = $$(".x-guide-sec"), links = $$('.x-sb-item[href^="#s-"]'), ticking = false;
  function spy() {
    ticking = false;
    var cur = secs[0];
    secs.forEach(function (s) { if (s.getBoundingClientRect().top <= 150) cur = s; });
    var sc = isMobile() ? document.scrollingElement : inset;
    if (sc && sc.scrollTop > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) cur = secs[secs.length - 1];
    links.forEach(function (a) {
      if (a.getAttribute("href") === "#" + cur.id) { a.setAttribute("aria-current", "location"); $("#crumb-now").textContent = a.dataset.label; }
      else a.removeAttribute("aria-current");
    });
  }
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } };
  inset.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  spy();

  /* ================================================================ demos */
  var norm = function (v) { return String(v).trim().replace(/\s+/g, " ").toLowerCase(); };
  var digits = function (el) { return Number(String(el.value).replace(/[^\d]/g, "")) || 0; };

  var sheet = $("#demo-sheet");
  $$("[data-sheet-size]").forEach(function (b) {
    b.addEventListener("click", function () {
      sheet.style.setProperty("--sheet-w", b.dataset.sheetSize);
      $("#ds-eyebrow").textContent = "Sheet · " + b.dataset.sheetLabel + " · " + b.dataset.sheetSize;
      $("#ds-form").reset();
      $("#ds-pay").textContent = SC.money(digits($("#ds-amt")));
      SC.open(sheet);
    });
  });
  $("#ds-amt").addEventListener("input", function () {
    var d = this.value.replace(/[^\d]/g, "").slice(0, 10);
    this.value = d ? Number(d).toLocaleString("en-NG") : "";
    $("#ds-pay").textContent = SC.money(digits(this));
  });
  $("#ds-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var amt = digits($("#ds-amt"));
    SC.close(sheet);
    SC.toast("Payment received · RCP-26-00413", SC.money(amt) + " from Zainab Musa for Ibrahim Musa. Preview · nothing is sent.", "circle-check");
  });

  $("#open-confirm").addEventListener("click", function () { SC.open("#demo-confirm"); });
  $("#dc-ok").addEventListener("click", function () {
    SC.close("#demo-confirm");
    SC.toast("3 students removed from First Term", "They stay on the register and can be enrolled again.", "user-x");
  });

  $("#open-destroy").addEventListener("click", function () {
    $("#dx-input").value = ""; $("#dx-ok").disabled = true;
    SC.open("#demo-destroy");
  });
  $("#dx-input").addEventListener("input", function () { $("#dx-ok").disabled = norm(this.value) !== "adaeze okonkwo"; });
  $("#dx-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !$("#dx-ok").disabled) { e.preventDefault(); $("#dx-ok").click(); } });
  $("#dx-ok").addEventListener("click", function () {
    SC.close("#demo-destroy");
    SC.toast("Student deleted", "Preview · the sample record is unchanged.", "trash-2");
  });

  $("#open-form").addEventListener("click", function () {
    $("#df-form").reset();
    $$("#demo-form .field-error").forEach(function (e) { e.hidden = true; });
    $$("#demo-form [aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); });
    SC.open("#demo-form");
  });
  $("#df-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#df-name").value.trim(), s = $("#df-start").value, en = $("#df-end").value;
    var show = function (errId, input, msg) {
      var err = $(errId);
      err.innerHTML = msg ? ic("circle-alert", 14) + "<span>" + esc(msg) + "</span>" : "";
      err.hidden = !msg;
      if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      return !!msg;
    };
    var badName = show("#df-name-err", $("#df-name"), name ? "" : "Enter a name for the term.");
    var badDate = show("#df-end-err", $("#df-end"), s && en && en <= s ? "The end date must be after the start date." : "");
    if (badName || badDate) { (badName ? $("#df-name") : $("#df-end")).focus(); return; }
    SC.close("#demo-form");
    var fmt = function (v) { var d = new Date(v + "T00:00:00"); return isNaN(d) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
    SC.toast("Term added", name + " · " + fmt(s) + " – " + fmt(en), "calendar-range");
  });

  $("#fire-toast").addEventListener("click", function () {
    SC.toast("Payment received · RCP-26-00413", "₦92,500 from Emeka Okonkwo for Adaeze Okonkwo.", "circle-check");
  });
})();
