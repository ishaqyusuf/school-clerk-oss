/* School Clerk · Direction 03 — Assembly · components.js
   Style-guide behaviour: swatches read from the inlined tokens.css text, live sheets,
   dialogs and toasts. Local only — nothing is sent. */
(function () {
  "use strict";

  var D = SC.data;
  var esc = SC.esc;
  var money = SC.money;
  function I(name, size, cls) { return SCIcons.icon(name, size || 16, cls); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

  SC.pill({ id: "03", name: "Assembly" });

  // ---------------------------------------------------------------------------
  // Tokens: parsed from the tokens.css text inlined in #css-vars
  // ---------------------------------------------------------------------------
  var SRC = $("#css-vars").textContent;
  function block(sel) {
    var i = SRC.indexOf(sel + " {");
    if (i < 0) return {};
    var body = SRC.slice(i, SRC.indexOf("\n}", i)), out = {}, m, re = /--([\w-]+):\s*([^;]+);/g;
    while ((m = re.exec(body))) out[m[1]] = m[2].trim();
    return out;
  }
  var LIGHT = block(":root");
  var DARK = Object.assign({}, LIGHT, block(".dark"));

  // The light panel stays light even when the page is dark: set its variables inline.
  var lightPanel = $("#theme-light");
  Object.keys(LIGHT).forEach(function (k) { lightPanel.style.setProperty("--" + k, LIGHT[k]); });

  var CORE = ["background", "foreground", "card", "primary", "primary-foreground", "secondary", "muted", "muted-foreground",
    "accent", "accent-foreground", "destructive", "border", "input", "ring", "sidebar", "sidebar-primary"];
  function swatches(map) {
    return CORE.map(function (k) {
      return '<div class="sg-sw"><i style="background: var(--' + k + ')"></i><b>--' + k + "</b><code>" + esc(map[k] || "") + "</code></div>";
    }).join("");
  }
  $("#sw-light").innerHTML = swatches(LIGHT);
  $("#sw-dark").innerHTML = swatches(DARK);

  function chip(hex) { return '<span class="sg-chip"><i style="background: ' + esc(hex) + '"></i><code>' + esc(hex) + "</code></span>"; }
  var STATUS_TOK = [
    ["success", "Enrolled, paid, confirmations"],
    ["warning", "Pending, needs classification, owing"],
    ["info", "New admission, partially paid, invitations"],
    ["destructive", "Delete, refunded, errors"],
    ["highlight", "The amber dot: you are here, unread, progress endpoints. Never text on white."],
  ];
  $("#status-tokens").innerHTML = STATUS_TOK.map(function (r) {
    return "<tr><td><code>--" + r[0] + "</code></td><td>" + chip(LIGHT[r[0]]) + "</td><td>" + chip(DARK[r[0]]) + "</td><td>" + esc(r[1]) + "</td></tr>";
  }).join("");

  var MODS = [
    ["Overview", "navy", "layout-dashboard", "--brand-navy (app.css --x-tile-navy)"],
    ["People", "sky", "users", "--tile-sky / -ink"],
    ["Academics", "violet", "book-open", "--tile-violet / -ink"],
    ["Finance", "teal", "wallet", "--tile-teal / -ink"],
    ["Operations", "amber", "boxes", "--tile-amber / -ink"],
    ["Settings", "slate", "settings", "--tile-slate / -ink"],
  ];
  $("#module-tiles").innerHTML = MODS.map(function (m) {
    return '<div><span class="tile tile-lg tone-' + m[1] + '" aria-hidden="true">' + I(m[2], 20) + "</span><span><strong>" + m[0] + "</strong><small>" + esc(m[3]) + "</small></span></div>";
  }).join("");

  $("#chart-tokens").innerHTML = [1, 2, 3, 4, 5].map(function (n) {
    var k = "chart-" + n;
    return '<div class="sg-chart"><i style="background: var(--' + k + ')"></i><code>--' + k + "<br>" + esc(LIGHT[k]) + " · " + esc(DARK[k]) + "</code></div>";
  }).join("");

  // ---------------------------------------------------------------------------
  // Spacing scale
  // ---------------------------------------------------------------------------
  var SPACE = [[4, "icon ↔ label in badges"], [8, "between pills, inside menus"], [12, "floating gap, card grid"], [16, "card padding, section gap"], [20, "sheet header"], [24, "page sections"], [32, "hero padding"], [48, "empty-state air"]];
  $("#space-scale").innerHTML = SPACE.map(function (s) {
    return '<div><code>' + s[0] + 'px</code><span style="display: grid; gap: 4px"><i style="width: ' + s[0] * 4 + 'px"></i><span class="t-small">' + esc(s[1]) + "</span></span></div>";
  }).join("");

  // ---------------------------------------------------------------------------
  // Buttons: variants × sizes × states
  // ---------------------------------------------------------------------------
  var spinner = I("loader-circle", 16, "spin");
  var VARIANTS = [
    ["default", "Default", "plus", "Save student"],
    ["secondary", "Secondary", "save", "Save draft"],
    ["outline", "Outline", "upload", "Import"],
    ["ghost", "Ghost", "x", "Cancel"],
    ["destructive", "Destructive", "trash-2", "Delete student"],
    ["link", "Link", "arrow-right", "View details"],
  ];
  var grid = ["Variant", "Small", "Default", "Large", "Icon only", "Disabled", "Loading"].map(function (h) { return '<span class="sg-h">' + h + "</span>"; }).join("");
  VARIANTS.forEach(function (v) {
    var cls = "btn btn-" + v[0];
    grid += '<span class="sg-h">' + v[1] + "</span>" +
      '<span><button type="button" class="' + cls + ' btn-sm">' + esc(v[3]) + "</button></span>" +
      '<span><button type="button" class="' + cls + '">' + I(v[2]) + esc(v[3]) + "</button></span>" +
      '<span><button type="button" class="' + cls + ' btn-lg">' + esc(v[3]) + "</button></span>" +
      '<span><button type="button" class="' + cls + ' btn-icon" aria-label="' + esc(v[3]) + '" title="' + esc(v[3]) + '">' + I(v[2]) + "</button></span>" +
      '<span><button type="button" class="' + cls + '" disabled>' + esc(v[3]) + "</button></span>" +
      '<span><button type="button" class="' + cls + '" aria-busy="true">' + spinner + "Working…</button></span>";
  });
  $("#btn-grid").innerHTML = grid;

  $("#try-loading").addEventListener("click", function () {
    var b = this;
    if (b.getAttribute("aria-busy") === "true") return;
    var html = b.innerHTML;
    b.setAttribute("aria-busy", "true");
    b.innerHTML = spinner + "Saving…";
    setTimeout(function () {
      b.removeAttribute("aria-busy");
      b.innerHTML = html;
      SC.toast("Changes saved", "Loading state lasts only as long as the work.", "circle-check");
    }, 1400);
  });

  // ---------------------------------------------------------------------------
  // Status badge mapping
  // ---------------------------------------------------------------------------
  var BADGES = [
    ["Enrolled", "Student · this term", "success", "dot", "--tile-teal"],
    ["Not enrolled", "Student · this term", "neutral", "dot", "--tile-slate"],
    ["New admission", "Admission", "info", "", "--tile-sky"],
    ["Returning", "Admission", "violet", "", "--tile-violet"],
    ["Needs classification", "Admission", "warning", "", "--tile-amber"],
    ["Paid", "Receipt · charge", "success", "dot", "--tile-teal"],
    ["Partially paid", "Charge", "info", "dot", "--tile-sky"],
    ["Pending", "Charge · allocation", "warning", "clock", "--tile-amber"],
    ["Draft", "Charge · website", "neutral", "", "--tile-slate"],
    ["Cancelled", "Charge · receipt", "outline", "", "--border · --muted-foreground"],
    ["Waived", "Charge", "violet", "", "--tile-violet"],
    ["Refunded", "Receipt", "destructive", "dot", "--tile-rose"],
    ["Invited", "Staff", "info", "mail", "--tile-sky"],
  ];
  $("#badge-map").innerHTML = BADGES.map(function (b) {
    var dot = b[3] === "dot", icon = b[3] && !dot ? I(b[3], 12) : "";
    return "<tr><td><strong>" + esc(b[0]) + "</strong></td><td>" + esc(b[1]) + "</td>" +
      '<td><span class="badge badge-' + b[2] + (dot ? " badge-dot" : "") + '">' + icon + esc(b[0]) + "</span></td>" +
      "<td><code>badge-" + b[2] + (dot ? " · dot" : icon ? " · " + b[3] + " icon" : "") + "</code><br><code>" + esc(b[4]) + "</code></td></tr>";
  }).join("");

  // ---------------------------------------------------------------------------
  // Table anatomy (shared sample students)
  // ---------------------------------------------------------------------------
  var ARM_TONE = { A: "sky", B: "teal" };
  function avatar(s) { return '<span class="avatar tone-' + (ARM_TONE[s.arm] || "slate") + '" aria-hidden="true">' + esc(s.first[0] + s.last[0]) + "</span>"; }
  function who(s) {
    return '<div class="who">' + avatar(s) + '<div class="who-text"><strong>' + esc(s.first + " " + s.last) + "</strong><small>" + esc(s.guardian) + "</small></div></div>";
  }
  function statusBadge(s) {
    return s.status === "enrolled" ? '<span class="badge badge-success badge-dot">Enrolled</span>' : '<span class="badge badge-neutral badge-dot">Not enrolled</span>';
  }
  var STATES = [["", "Rest"], ["is-hover", "Hover · actions appear"], ["selected", "Selected"], ["is-focus", "Keyboard focus"]];
  $("#anatomy-table tbody").innerHTML = D.students.slice(0, 4).map(function (s, i) {
    var st = STATES[i], sel = st[0] === "selected";
    return "<tr" + (sel ? ' data-state="selected"' : st[0] ? ' class="' + st[0] + '"' : "") + ">" +
      '<td class="c-sel"><input type="checkbox" class="checkbox" aria-label="Select ' + esc(s.first + " " + s.last) + '"' + (sel ? " checked" : "") + "></td>" +
      '<td class="c-who">' + who(s) + '<div class="m-extra">' + statusBadge(s) + (st[0] ? '<span class="sg-tag">' + esc(st[1]) + "</span>" : "") + "</div></td>" +
      '<td><span class="cls-pill ink-' + (ARM_TONE[s.arm] || "slate") + '"><i aria-hidden="true"></i><span>' + esc(s.cls + " " + s.arm) + "</span></span></td>" +
      "<td>" + statusBadge(s) + "</td>" +
      '<td class="num"><strong class="tnum">' + money(s.billed - s.paid) + "</strong></td>" +
      "<td>" + (st[0] ? '<span class="sg-tag">' + esc(st[1]) + "</span>" : '<span class="t-small">' + esc(st[1]) + "</span>") + "</td>" +
      '<td class="c-act"><div class="row-actions"><button type="button" class="ra ra-hover" aria-label="View" title="View details">' + I("eye") + '</button><button type="button" class="ra ra-hover" aria-label="Edit" title="Edit information">' + I("pencil") + '</button><button type="button" class="ra" aria-label="More actions">' + I("ellipsis") + "</button></div></td></tr>";
  }).join("");

  $("#phone-table tbody").innerHTML = D.students.slice(0, 2).map(function (s) {
    return "<tr>" +
      '<td class="c-sel"><input type="checkbox" class="checkbox" aria-label="Select ' + esc(s.first + " " + s.last) + '"></td>' +
      '<td class="c-who">' + who(s) + '<div class="m-extra">' + statusBadge(s) + '<span class="badge badge-violet">Returning</span><span class="m-meta"><span class="id-mono">' + esc(s.id) + "</span><span>" + esc(s.cls + " " + s.arm) + "</span></span></div></td>" +
      '<td class="c-act"><button type="button" class="ra" aria-label="More actions">' + I("ellipsis") + "</button></td></tr>";
  }).join("");

  // ---------------------------------------------------------------------------
  // KPI / stat cards
  // ---------------------------------------------------------------------------
  function ring(p, size, sw, ink, inner) {
    var r = (size - sw) / 2, c = 2 * Math.PI * r, cx = size / 2, f = Math.max(0, Math.min(100, p)) / 100;
    var a = (f * 360 - 90) * Math.PI / 180;
    return '<span class="ring-wrap ink-' + ink + '" style="width:' + size + "px;height:" + size + 'px"><svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true" focusable="false">' +
      '<circle class="ring-track" cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke-width="' + sw + '" fill="none"/>' +
      '<circle class="ring-bar" cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke-width="' + sw + '" fill="none" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - f)).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cx + ')"/>' +
      '<circle class="ring-dot" cx="' + (cx + r * Math.cos(a)).toFixed(2) + '" cy="' + (cx + r * Math.sin(a)).toFixed(2) + '" r="' + (sw * 0.72).toFixed(2) + '"/></svg>' +
      (inner ? '<span class="ring-label">' + inner + "</span>" : "") + "</span>";
  }
  function stat(label, value, side, meta) {
    return '<article class="card stat"><p class="stat-label">' + esc(label) + '</p><span class="stat-side">' + side + '</span><p class="stat-value">' + value + '</p><p class="stat-meta">' + meta + "</p></article>";
  }
  var F = D.finance, rate = Math.round((F.collected / F.billed) * 1000) / 10;
  $("#kpi-demo").innerHTML =
    stat("Total students", D.school.students, '<span class="tile tone-navy" aria-hidden="true">' + I("users") + "</span>", "2026/2027 · First Term") +
    stat("Enrolled this term", 451, ring(92.8, 40, 5, "teal"), "92.8% of 486 students") +
    stat("Attendance today", D.attendance.rate + "%", ring(D.attendance.rate, 40, 5, "sky"), D.attendance.classesMarked + " of " + D.attendance.classesTotal + " classes marked") +
    stat("Collected this term", "₦" + (F.collected / 1e6).toFixed(2) + "m", ring(rate, 40, 5, "teal"), rate + "% of ₦" + (F.billed / 1e6).toFixed(2) + "m billed");

  // ---------------------------------------------------------------------------
  // Live overlays
  // ---------------------------------------------------------------------------
  function openPanel(el) {
    if (el.getAttribute("data-open") === "true") return;
    el.hidden = false;
    void el.offsetWidth;
    SC.open(el);
    setTimeout(function () { if (el.getAttribute("data-open") === "true") el.hidden = false; }, 320);
  }
  var SIZES = { sm: ["24rem", "Filters, quick views and the mobile More menu."], md: ["34rem", "Receive payment and other short forms."], lg: ["38rem", "Student details with tabs; create or edit a student."], xl: ["48rem", "Import review and bulk changes with a preview table."] };
  $("#ds-fees").innerHTML = D.fees.slice(0, 4).map(function (f, i) {
    return '<li><label class="fee-row"><input type="checkbox" class="checkbox"' + (i < 4 ? " checked" : "") + '><span class="fee-name">' + esc(f.title) + "<small>" + esc(f.type) + " · " + esc(f.audience) + '</small></span><span class="fee-amt">' + money(f.amount) + "</span></label></li>";
  }).join("");
  $$("[data-sheet-size]").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-sheet-size"), s = SIZES[k], sheet = $("#demo-sheet");
      sheet.style.setProperty("--sheet-w", s[0]);
      $("#ds-title").textContent = "Sheet · " + k + " (" + s[0] + ")";
      $("#ds-desc").textContent = s[1];
      openPanel(sheet);
    });
  });
  $("#ds-save").addEventListener("click", function () {
    SC.close($("#demo-sheet"));
    SC.toast("Student saved", "Preview · nothing is sent", "circle-check");
  });
  $$("[data-dialog]").forEach(function (b) {
    b.addEventListener("click", function () { openPanel($(b.getAttribute("data-dialog"))); });
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-toast]");
    if (!t) return;
    var parts = t.getAttribute("data-toast").split("|");
    SC.toast(parts[0], parts[1] || "", "circle-check");
  });
  $("#demo-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("#df-name"), v = input.value.trim(), err = $("#df-err");
    err.hidden = !!v;
    input.setAttribute("aria-invalid", v ? "false" : "true");
    if (!v) { input.focus(); return; }
    SC.close($("#demo-form"));
    SC.toast("Stream renamed", "JSS 2 " + v + " · preview, nothing changed", "circle-check");
  });
  $("#df-name").addEventListener("input", function () {
    if (this.value.trim()) { $("#df-err").hidden = true; this.setAttribute("aria-invalid", "false"); }
  });
  $("#show-toast").addEventListener("click", function () {
    SC.toast("Payment confirmed", "₦92,500 from Emeka Okonkwo · RCP-26-00413", "circle-check");
  });

  // ---------------------------------------------------------------------------
  // Copy variables + table-of-contents highlight
  // ---------------------------------------------------------------------------
  $("#copy-vars").addEventListener("click", function () {
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents($("#css-vars"));
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      SC.toast("Variables selected", "Press " + (IS_MAC ? "⌘C" : "Ctrl C") + " to copy.", "copy");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SRC).then(function () { SC.toast("Variables copied", ":root and .dark from tokens.css", "copy"); }, fallback);
    } else fallback();
  });

  var links = $$("#toc a");
  function setCurrent(id) {
    links.forEach(function (a) {
      if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setCurrent(en.target.id); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    $$(".sg-sec").forEach(function (s) { io.observe(s); });
  }
  setCurrent("s-intro");
})();
