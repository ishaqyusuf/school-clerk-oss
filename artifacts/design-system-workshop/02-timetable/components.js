/* Direction 02 — Timetable · components.js
   Style-guide reference: renders token swatches live from the token text, the copyable
   :root/.dark block, button and status tables, and wires the live demos (sheets, dialogs,
   toast, keyboard table). Local simulation only. */
(function () {
  "use strict";

  var esc = SC.esc;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function ic(n, s, c) { return SCIcons.icon(n, s || 16, c); }
  var IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  var MOD = IS_MAC ? "⌘" : "Ctrl";

  /* Inlined copy of tokens.css (:root + .dark), used when the stylesheet can't be read via CSSOM (file://). */
  var TOKENS_TEXT = ":root {\n  --font-sans: \"Schibsted Grotesk\", ui-sans-serif, system-ui, sans-serif;\n  --font-display: \"Schibsted Grotesk\", ui-sans-serif, system-ui, sans-serif;\n  --font-mono: \"IBM Plex Mono\", ui-monospace, Menlo, monospace;\n  --radius: 0.375rem;\n  --control-h: 2rem;\n  --row-h: 2.375rem;\n  --icon-stroke: 2;\n\n  --background: #f4f5f7;\n  --foreground: #0d1220;\n  --card: #ffffff;\n  --card-foreground: #0d1220;\n  --popover: #ffffff;\n  --popover-foreground: #0d1220;\n  --primary: #2340d0;\n  --primary-foreground: #ffffff;\n  --secondary: #eceef3;\n  --secondary-foreground: #1a2133;\n  --muted: #eef0f4;\n  --muted-foreground: #555e72;\n  --accent: #e9edfd;\n  --accent-foreground: #1b2f9c;\n  --destructive: #cc2b1d;\n  --border: #e1e4ea;\n  --input: #d3d8e1;\n  --ring: #2340d0;\n\n  --success: #0f7f45;\n  --success-foreground: #ffffff;\n  --warning: #a35200;\n  --warning-foreground: #ffffff;\n  --info: #2340d0;\n  --info-foreground: #ffffff;\n  /* Highlighter yellow: keyboard cursor row, search hits, \"now\" marker, one CTA accent. Always with dark text. */\n  --highlight: #ffdd33;\n  --highlight-foreground: #1d1800;\n  --grid-line: #e6e9ef;\n  --grid-line-strong: #cfd4de;\n\n  --chart-1: #2340d0;\n  --chart-2: #f2c200;\n  --chart-3: #0f7f45;\n  --chart-4: #e0562b;\n  --chart-5: #7a5af0;\n\n  --sidebar: #ffffff;\n  --sidebar-foreground: #0d1220;\n  --sidebar-primary: #2340d0;\n  --sidebar-primary-foreground: #ffffff;\n  --sidebar-accent: #eef1fb;\n  --sidebar-accent-foreground: #1b2f9c;\n  --sidebar-border: #e1e4ea;\n  --sidebar-ring: #2340d0;\n  --topbar: #0d1220;\n  --topbar-foreground: #e7eaf2;\n}\n\n.dark {\n  --background: #0a0d14;\n  --foreground: #e7eaf2;\n  --card: #10141d;\n  --card-foreground: #e7eaf2;\n  --popover: #121722;\n  --popover-foreground: #e7eaf2;\n  --primary: #8aa0ff;\n  --primary-foreground: #0b1240;\n  --secondary: #171c28;\n  --secondary-foreground: #e1e6f2;\n  --muted: #151a25;\n  --muted-foreground: #959eb3;\n  --accent: #1a2140;\n  --accent-foreground: #dfe5ff;\n  --destructive: #ff7a6b;\n  --border: #232938;\n  --input: #2c3345;\n  --ring: #8aa0ff;\n\n  --success: #4cc685;\n  --success-foreground: #04170c;\n  --warning: #f0a540;\n  --warning-foreground: #1f1200;\n  --info: #8aa0ff;\n  --info-foreground: #0b1240;\n  --highlight: #ffd84d;\n  --highlight-foreground: #1d1800;\n  --grid-line: #1c2230;\n  --grid-line-strong: #2a3244;\n\n  --chart-1: #8aa0ff;\n  --chart-2: #ffd84d;\n  --chart-3: #4cc685;\n  --chart-4: #ff8a5c;\n  --chart-5: #a993ff;\n\n  --sidebar: #0d1119;\n  --sidebar-foreground: #e7eaf2;\n  --sidebar-primary: #8aa0ff;\n  --sidebar-primary-foreground: #0b1240;\n  --sidebar-accent: #171d2e;\n  --sidebar-accent-foreground: #dfe5ff;\n  --sidebar-border: #1f2533;\n  --sidebar-ring: #8aa0ff;\n  --topbar: #05070c;\n  --topbar-foreground: #e7eaf2;\n}";

  /* ------------------------------------------------------------- tokens */
  function parseText(text) {
    var out = { light: [], dark: [] };
    var re = /(:root|\.dark)\s*\{([^}]*)\}/g, m;
    while ((m = re.exec(text))) {
      var target = m[1] === ":root" ? out.light : out.dark, d, dre = /--([\w-]+)\s*:\s*([^;]+);/g;
      while ((d = dre.exec(m[2]))) target.push([d[1], d[2].trim()]);
    }
    return out;
  }
  function readLive() {
    var out = { light: [], dark: [] }, found = false;
    try {
      Array.prototype.forEach.call(document.styleSheets, function (sheet) {
        if (!/tokens\.css(\?|$)/.test(sheet.href || "")) return;
        Array.prototype.forEach.call(sheet.cssRules, function (rule) {
          if (!rule.style || (rule.selectorText !== ":root" && rule.selectorText !== ".dark")) return;
          var target = rule.selectorText === ":root" ? out.light : out.dark;
          for (var i = 0; i < rule.style.length; i++) {
            var prop = rule.style[i];
            if (prop.indexOf("--") === 0) { target.push([prop.slice(2), rule.style.getPropertyValue(prop).trim()]); found = true; }
          }
        });
      });
    } catch (e) { found = false; }
    return found && out.light.length ? out : null;
  }
  var live = readLive();
  var TOK = live || parseText(TOKENS_TEXT);
  function toMap(list) { var m = {}; list.forEach(function (p) { m[p[0]] = p[1]; }); return m; }
  var LIGHT = toMap(TOK.light), DARK = toMap(TOK.dark);

  function cssBlock() {
    function block(sel, list) { return sel + " {\n" + list.map(function (p) { return "  --" + p[0] + ": " + p[1] + ";"; }).join("\n") + "\n}"; }
    return block(":root", TOK.light) + "\n\n" + block(".dark", TOK.dark);
  }
  var CSS_TEXT = cssBlock();

  var GROUPS = [
    ["Surfaces", ["background", "card", "popover", "muted", "secondary", "accent"]],
    ["Ink", ["foreground", "muted-foreground", "secondary-foreground", "accent-foreground"]],
    ["Action", ["primary", "primary-foreground", "ring", "destructive"]],
    ["Lines", ["border", "input", "grid-line", "grid-line-strong"]],
    ["Status", ["success", "warning", "info", "destructive"]],
    ["Signal · position only", ["highlight", "highlight-foreground"]],
    ["Chrome", ["topbar", "topbar-foreground", "sidebar", "sidebar-accent", "sidebar-primary"]],
    ["Charts", ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]],
  ];
  function renderPanel(el, own, title, selector) {
    var merged = Object.assign({}, LIGHT, own);
    Object.keys(merged).forEach(function (k) { el.style.setProperty("--" + k, merged[k]); });
    var html = '<div class="swatch-panel-head"><strong>' + esc(title) + '</strong><span class="eyebrow">' + esc(selector) + "</span></div>";
    GROUPS.forEach(function (g) {
      var keys = g[1].filter(function (k) { return merged[k] && merged[k].charAt(0) === "#"; });
      if (!keys.length) return;
      html += '<div class="swatch-group"><p class="swatch-label">' + esc(g[0]) + '</p><div class="swatch-grid">' + keys.map(function (k) {
        return '<div class="swatch"><span class="swatch-chip" style="background:var(--' + k + ')"></span><span class="swatch-name">--' + esc(k) + '</span><span class="swatch-hex">' + esc(merged[k]) + "</span></div>";
      }).join("") + "</div></div>";
    });
    html += '<div class="swatch-group"><p class="swatch-label">Specimen</p><div class="sg-row">' +
      '<span class="badge badge-success">Enrolled</span><span class="badge badge-warning">Needs classification</span><span class="badge badge-info">New admission</span><span class="badge badge-destructive">Refunded</span>' +
      '<span class="btn btn-default btn-sm" aria-hidden="true">Save student</span>' +
      '<span class="kbd-row" aria-hidden="true"><kbd class="kbd">' + esc(MOD) + '</kbd><kbd class="kbd">K</kbd></span>' +
      '<span style="background:var(--highlight);color:var(--highlight-foreground);padding:3px 7px;font:500 12px/1.3 var(--font-mono)">cursor row</span>' +
      "</div></div>";
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------- tables */
  function renderSpace() {
    var rows = [[4, "Icon ↔ label in tags, kbd groups"], [8, "Gaps between controls, cell padding"], [12, "Panel padding, toolbar gaps"], [16, "Sheet section padding, page gutter (mobile)"], [20, "Sheet gutter"], [24, "Page gutter (desktop)"], [32, "Empty-state padding"], [48, "Section breaks in long pages"]];
    $("#spaceRows").innerHTML = rows.map(function (r) {
      return '<tr><th scope="row">' + r[0] + 'px</th><td style="width:50%"><div class="space-bar" style="width:' + r[0] * 4 + 'px;max-width:100%"></div></td><td class="spec">' + esc(r[1]) + "</td></tr>";
    }).join("");
  }
  function renderButtons() {
    var V = [["default", "Save student", "plus"], ["secondary", "Duplicate", "copy"], ["outline", "Export CSV", "download"], ["ghost", "Add filter", "list-filter"], ["destructive", "Delete student", "trash-2"], ["link", "View details", null]];
    $("#btnRows").innerHTML = V.map(function (v) {
      var c = "btn btn-" + v[0];
      var icon = v[2] ? '<button type="button" class="' + c + ' btn-icon" aria-label="' + esc(v[1]) + '">' + ic(v[2], 16) + "</button>" : '<span class="muted mono">—</span>';
      var loading = v[0] === "link" ? '<span class="muted mono">—</span>' : '<button type="button" class="' + c + ' btn-sm" aria-busy="true" disabled>' + ic("loader-circle", 15, "spin") + "Saving…</button>";
      return '<tr><th scope="row">' + v[0] + "</th>" +
        '<td><button type="button" class="' + c + ' btn-sm">' + esc(v[1]) + "</button></td>" +
        '<td><button type="button" class="' + c + '">' + esc(v[1]) + "</button></td>" +
        '<td><button type="button" class="' + c + ' btn-lg">' + esc(v[1]) + "</button></td>" +
        "<td>" + icon + "</td>" +
        '<td><button type="button" class="' + c + ' btn-sm" disabled>' + esc(v[1]) + "</button></td>" +
        "<td>" + loading + "</td></tr>";
    }).join("");
  }
  var STATUS_MAP = [
    ["Enrolled", "success", "--success", "Students · Status"],
    ["Not enrolled", "neutral", "--muted-foreground", "Students · Status"],
    ["New admission", "info", "--info", "Students · Admission"],
    ["Returning", "outline", "--foreground", "Students · Admission"],
    ["Needs classification", "warning", "--warning", "Students · Admission"],
    ["Paid", "success", "--success", "Receipts · Charges"],
    ["Partially paid", "warning", "--warning", "Charges · Student detail"],
    ["Pending", "info", "--info", "Charges · Student detail"],
    ["Draft", "draft", "--muted-foreground · dashed", "Charges · Website configs"],
    ["Cancelled", "neutral badge-struck", "--muted-foreground · struck", "Charges · Receipts"],
    ["Waived", "secondary", "--secondary-foreground", "Charges"],
    ["Refunded", "destructive", "--destructive", "Receipts"],
    ["Invited", "info badge-invited", "--info · dashed", "Staff"],
  ];
  function renderStatus() {
    $("#statusRows").innerHTML = STATUS_MAP.map(function (r) {
      var cls = r[1].split(" ").map(function (x) { return "badge-" + x.replace(/^badge-/, ""); }).join(" ");
      return '<tr><th scope="row">' + esc(r[0]) + '</th><td><span class="badge ' + cls + '">' + esc(r[0]) + '</span></td><td class="mono">.' + cls.split(" ").join(" .") + '</td><td class="mono">' + esc(r[2]) + "</td><td>" + esc(r[3]) + "</td></tr>";
    }).join("");
  }

  /* ----------------------------------------------- live keyboard table */
  var demo = { rows: SC.data.students.slice(0, 5), cursor: 3, selected: { 2: true }, hover: 1 };
  var STATUS = { enrolled: ["Enrolled", "success"], "not-enrolled": ["Not enrolled", "neutral"] };
  function renderDemo() {
    $("#demoRows").innerHTML = demo.rows.map(function (s, i) {
      var sel = !!demo.selected[i], cur = demo.cursor === i, hov = demo.hover === i;
      var state = cur ? "Keyboard cursor ↑↓" : sel ? "Selected" : hov ? "Hover" : "Default";
      var name = s.first + " " + s.last;
      return '<tr data-i="' + i + '" class="' + (sel ? "is-selected " : "") + (cur ? "is-cursor " : "") + (hov && !cur && !sel ? "force-hover" : "") + '">' +
        '<td class="col-check sticky-col"><input type="checkbox" class="checkbox" data-sel' + (sel ? " checked" : "") + ' aria-label="Select ' + esc(name) + '"></td>' +
        '<td class="col-student sticky-col sticky-col-2 sticky-edge"><div class="cell-person"><span class="avatar avatar-xs" data-tint="' + [1, 3, 4, 5][i % 4] + '" aria-hidden="true">' + esc(s.first[0] + s.last[0]) + '</span><span class="cell-strong">' + esc(name) + "</span></div></td>" +
        '<td class="mono">' + esc(s.id) + "</td><td>" + esc(s.cls + " " + s.arm) + "</td>" +
        '<td><span class="badge badge-' + STATUS[s.status][1] + '">' + STATUS[s.status][0] + "</span></td>" +
        '<td class="num">' + SC.money(s.paid) + "</td>" +
        '<td><span class="state-tag">' + state + "</span></td></tr>";
    }).join("");
  }
  $("#demoGrid").addEventListener("keydown", function (e) {
    var k = e.key, n = demo.rows.length;
    if (k === "ArrowDown" || k === "j") { e.preventDefault(); demo.hover = -1; demo.cursor = Math.min(n - 1, demo.cursor + 1); renderDemo(); }
    else if (k === "ArrowUp" || k === "k") { e.preventDefault(); demo.hover = -1; demo.cursor = Math.max(0, demo.cursor - 1); renderDemo(); }
    else if (k === "x" || k === "X") { e.preventDefault(); if (demo.selected[demo.cursor]) delete demo.selected[demo.cursor]; else demo.selected[demo.cursor] = true; renderDemo(); }
    else if (k === "Enter") { e.preventDefault(); var s = demo.rows[demo.cursor]; SC.toast("Opens the student sheet", s.first + " " + s.last + " · " + s.id, "panel-right"); }
  });
  $("#demoRows").addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-i]"); if (!tr) return;
    var i = +tr.getAttribute("data-i");
    demo.hover = -1;
    if (e.target.matches("input[data-sel]")) { if (e.target.checked) demo.selected[i] = true; else delete demo.selected[i]; }
    else demo.cursor = i;
    renderDemo();
  });

  /* ------------------------------------------------------- overlays */
  var stack = [];
  function openPanel(el) {
    if (el.getAttribute("data-open") === "true") return;
    if (el.getAttribute("data-open") === "false" && !el.hidden) { setTimeout(function () { openPanel(el); }, 300); return; }
    el.hidden = false;
    void el.offsetWidth;
    stack.push(el);
    SC.open(el, { onClose: function () { var i = stack.lastIndexOf(el); if (i > -1) stack.splice(i, 1); } });
  }
  $$("[data-sheet]").forEach(function (b) {
    b.addEventListener("click", function () {
      var w = b.getAttribute("data-sheet"), n = b.getAttribute("data-size-name");
      var sh = $("#demoSheet");
      sh.style.setProperty("--sheet-w", w);
      $("#demoSheetEyebrow").textContent = "Sheet · " + n + " · " + w;
      $("#ds-last").removeAttribute("aria-invalid"); $("#ds-last-err").hidden = true;
      openPanel(sh);
    });
  });
  $("#demoSheetForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var last = $("#ds-last");
    if (!last.value.trim()) { last.setAttribute("aria-invalid", "true"); $("#ds-last-err").hidden = false; last.focus(); return; }
    last.removeAttribute("aria-invalid"); $("#ds-last-err").hidden = true;
    SC.close($("#demoSheet"));
    SC.toast("Changes saved", $("#ds-first").value.trim() + " " + last.value.trim() + " · Preview · nothing is sent", "circle-check");
  });
  var dcRun = null;
  var DIALOGS = {
    confirm: {
      tone: "neutral", eyebrow: "Remove from term · 3 records", title: "Remove 3 students from First Term?",
      desc: "They’ll show as Not enrolled for 2026/2027 · First Term. Their student records stay in place.",
      rows: [["Term", "2026/2027 · First Term"], ["Students", "3 selected"], ["Classes", "JSS 2 A, JSS 2 B"], ["Status after", "Not enrolled"]],
      confirm: "Remove from term", toast: ["Removed from First Term", "3 students · now Not enrolled", "user-x"],
    },
    destructive: {
      tone: "destructive", eyebrow: "Delete student · 1 record", title: "Delete Adaeze Okonkwo?",
      desc: "This permanently removes the student record from Kingsway Academy. It can’t be undone.",
      rows: [["Student", "Adaeze Okonkwo"], ["Student ID", "KWA/2026/0142"], ["Class", "JSS 2 A"], ["Guardian", "Mr. Emeka Okonkwo"], ["Paid this term", "₦205,500"]],
      confirm: "Delete student", toast: ["Student deleted", "Adaeze Okonkwo · KWA/2026/0142 · Preview", "trash-2"],
    },
  };
  $$("[data-dialog]").forEach(function (b) {
    b.addEventListener("click", function () {
      var kind = b.getAttribute("data-dialog");
      if (kind === "form") { $("#df-name").value = "JSS 2 A"; $("#df-name").removeAttribute("aria-invalid"); $("#df-name-err").hidden = true; openPanel($("#demoForm")); return; }
      var o = DIALOGS[kind], d = $("#demoConfirm");
      d.classList.toggle("is-destructive", o.tone === "destructive");
      $("#dcEyebrow").textContent = o.eyebrow; $("#dcTitle").textContent = o.title; $("#dcDesc").textContent = o.desc;
      $("#dcTable tbody").innerHTML = o.rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("");
      var c = $("#dcConfirm"); c.textContent = o.confirm; c.className = "btn btn-sm " + (o.tone === "destructive" ? "btn-destructive" : "btn-default");
      dcRun = o.toast;
      openPanel(d);
    });
  });
  $("#dcConfirm").addEventListener("click", function () {
    var t = dcRun; dcRun = null;
    SC.close($("#demoConfirm"));
    if (t) SC.toast(t[0], t[1], t[2]);
  });
  $("#demoFormEl").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("#df-name").value.trim();
    if (!v) { $("#df-name").setAttribute("aria-invalid", "true"); $("#df-name-err").hidden = false; $("#df-name").focus(); return; }
    SC.close($("#demoForm"));
    SC.toast("Stream renamed", v + " · Preview · nothing is sent", "pencil");
  });
  document.addEventListener("keydown", function (e) {
    if (!((e.metaKey || e.ctrlKey) && e.key === "Enter")) return;
    var top = stack[stack.length - 1]; if (!top) return;
    e.preventDefault();
    if (top.id === "demoSheet") { var f = $("#demoSheetForm"); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true })); }
    else if (top.id === "demoConfirm") $("#dcConfirm").click();
    else if (top.id === "demoForm") { var g = $("#demoFormEl"); if (g.requestSubmit) g.requestSubmit(); else g.dispatchEvent(new Event("submit", { cancelable: true })); }
  });

  /* --------------------------------------------------------- small demos */
  $$("[data-toast]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.getAttribute("data-toast") === "saved") SC.toast("Student saved", "Toluwani Adebayo · KWA/2026/0216 · JSS 2 B", "user-check");
      else SC.toast("Payment confirmed", "₦92,500 · RCP-26-00413 · Adaeze Okonkwo", "circle-check");
    });
  });
  $("#loadDemo").addEventListener("click", function () {
    var b = $("#loadDemo");
    if (b.getAttribute("aria-busy") === "true") return;
    var html = b.innerHTML;
    b.setAttribute("aria-busy", "true"); b.disabled = true;
    b.innerHTML = ic("loader-circle", 15, "spin") + "<span>Saving…</span>";
    setTimeout(function () { b.innerHTML = html; b.disabled = false; b.removeAttribute("aria-busy"); b.focus(); SC.toast("Student saved", "Preview · nothing is sent", "user-check"); }, 1200);
  });
  $("#toggleDemo").addEventListener("click", function (e) {
    var b = e.currentTarget; b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
  });
  var subTimer = null;
  $("#d-sub").addEventListener("input", function (e) {
    var v = e.target.value.trim().toLowerCase(), out = $("#d-sub-s");
    clearTimeout(subTimer);
    e.target.removeAttribute("aria-invalid");
    if (!v) { out.innerHTML = '<span class="subdomain-state">Use letters, numbers and hyphens.</span>'; return; }
    out.innerHTML = '<span class="subdomain-state">' + ic("loader-circle", 14, "spin") + "Checking…</span>";
    subTimer = setTimeout(function () {
      var r = SC.checkSubdomain(v);
      if (r.state === "ok") out.innerHTML = '<span class="subdomain-state ok">' + ic("circle-check", 14) + esc(r.msg) + "</span>";
      else { e.target.setAttribute("aria-invalid", "true"); out.innerHTML = '<span class="subdomain-state err">' + ic("circle-alert", 14) + esc(r.msg) + "</span>"; }
    }, 350);
  });

  /* ------------------------------------------------------- copy tokens */
  $("#copyTokens").addEventListener("click", function () {
    function fallback() {
      var pre = $("#tokenCode"), range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      SC.toast("Selected — press " + MOD + " C to copy", ":root and .dark variables", "copy");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(CSS_TEXT).then(function () { SC.toast("Copied", ":root and .dark variables · " + (TOK.light.length + TOK.dark.length) + " tokens", "copy"); }, fallback);
    } else fallback();
  });

  /* ------------------------------------------------------------ scrollspy */
  var links = $$("#subnav .subnav-item");
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  var spyQueued = false, lastIdx = -1;
  function spy() {
    spyQueued = false;
    var main = $("#main");
    var inner = getComputedStyle(main).overflowY !== "visible" && main.scrollHeight > main.clientHeight + 2;
    var top = (inner ? main.getBoundingClientRect().top : 0) + 120;
    var idx = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= top) idx = i; });
    var atEnd = inner ? main.scrollTop + main.clientHeight >= main.scrollHeight - 4 : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atEnd) idx = secs.length - 1;
    if (idx === lastIdx) return;
    lastIdx = idx;
    links.forEach(function (a, i) { if (i === idx) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
    if (window.innerWidth < 768) { var sn = $("#subnav"); sn.scrollLeft = Math.max(0, links[idx].offsetLeft - 12); }
  }
  function queueSpy() { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }
  $("#main").addEventListener("scroll", queueSpy, { passive: true });
  window.addEventListener("scroll", queueSpy, { passive: true });
  window.addEventListener("resize", queueSpy);

  /* ----------------------------------------------------------------- init */
  function syncThemeIcon() {
    var dark = document.documentElement.classList.contains("dark");
    var btn = $("#themeBtn"), old = btn.querySelector(".sc-icon, i[data-icon]");
    var span = document.createElement("span");
    span.innerHTML = ic(dark ? "sun" : "moon", 15);
    if (old) old.replaceWith(span.firstChild);
  }
  function init() {
    SC.pill({ id: "02", name: "Timetable" });
    $$("[data-mod]").forEach(function (el) { el.textContent = MOD; });
    renderPanel($("#panelLight"), LIGHT, "Light", ":root");
    renderPanel($("#panelDark"), DARK, "Dark", ".dark");
    $("#tokenCode").innerHTML = "<code>" + esc(CSS_TEXT) + "</code>";
    $("#codeSource").textContent = live ? "tokens.css · read live · :root + .dark" : "tokens.css · :root + .dark";
    renderSpace();
    renderButtons();
    renderStatus();
    renderDemo();
    SCIcons.hydrate();
    syncThemeIcon();
    $("#themeBtn").addEventListener("click", function () { SC.theme.toggle(); });
    document.addEventListener("sc:theme", syncThemeIcon);
    $(".skip-link").addEventListener("click", function (e) { e.preventDefault(); $("#intro").focus(); $("#intro").scrollIntoView(); });
    queueSpy();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
