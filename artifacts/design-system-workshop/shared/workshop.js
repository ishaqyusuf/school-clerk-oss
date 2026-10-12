/* School Clerk design-system workshop — shared helpers (theme, workshop pill, overlays, toast).
   Load after data.js and icons.js. Nothing here calls a network service. */
(function () {
  var SC = (window.SC = window.SC || {});
  var THEME_KEY = "sc-ws-theme";

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function reduced() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }

  // ---------- Theme (shadcn convention: .dark on <html>) ----------
  function applyTheme(t) {
    var dark = t === "dark" || (t !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.querySelectorAll("[data-theme-label]").forEach(function (el) { el.textContent = dark ? "Dark" : "Light"; });
    return dark;
  }
  function toggleTheme() {
    var dark = !document.documentElement.classList.contains("dark");
    store(THEME_KEY, dark ? "dark" : "light");
    applyTheme(dark ? "dark" : "light");
    document.dispatchEvent(new CustomEvent("sc:theme", { detail: { dark: dark } }));
  }
  applyTheme(store(THEME_KEY));

  // ---------- Workshop pill (outside the product UI) ----------
  var SURFACES = [
    { file: "marketing.html", label: "Marketing" },
    { file: "signup.html", label: "Signup" },
    { file: "dashboard.html", label: "Dashboard" },
    { file: "components.html", label: "Components" },
    { file: "website.html", label: "Website" },
  ];
  function pill(opts) {
    opts = opts || {};
    var here = location.pathname.split("/").pop() || "index.html";
    var el = document.createElement("nav");
    el.className = "ws-pill";
    el.setAttribute("aria-label", "Workshop navigation");
    var links = SURFACES.map(function (s) {
      return '<a href="' + s.file + '"' + (s.file === here ? ' aria-current="page"' : "") + ">" + s.label + "</a>";
    }).join("");
    el.innerHTML =
      '<a class="ws-pill-dir" href="../index.html" title="All directions">' + SC.esc(opts.id || "") + " " + SC.esc(opts.name || "") + "</a>" +
      '<span class="ws-pill-links">' + links + "</span>" +
      '<button type="button" class="ws-pill-btn" data-ws-theme aria-label="Toggle light or dark theme"><span data-theme-label></span></button>' +
      '<button type="button" class="ws-pill-btn ws-pill-x" data-ws-hide aria-label="Hide workshop bar">×</button>';
    document.body.appendChild(el);
    el.querySelector("[data-ws-theme]").addEventListener("click", toggleTheme);
    el.querySelector("[data-ws-hide]").addEventListener("click", function () { el.hidden = true; });
    applyTheme(store(THEME_KEY));
    return el;
  }

  // ---------- Overlays: Sheet + Dialog with focus trap, Esc, overlay click ----------
  var stack = [];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function open(panel, opts) {
    opts = opts || {};
    if (typeof panel === "string") panel = document.querySelector(panel);
    if (!panel || panel.getAttribute("data-open") === "true") return;
    var overlay = document.createElement("div");
    overlay.className = "overlay" + (opts.overlayClass ? " " + opts.overlayClass : "");
    panel.parentNode.insertBefore(overlay, panel);
    panel.hidden = false;
    panel.setAttribute("role", panel.getAttribute("role") || "dialog");
    panel.setAttribute("aria-modal", "true");
    var entry = { panel: panel, overlay: overlay, returnTo: document.activeElement, onClose: opts.onClose };
    stack.push(entry);
    overlay.addEventListener("click", function () { close(panel); });
    requestAnimationFrame(function () {
      overlay.setAttribute("data-open", "true");
      panel.setAttribute("data-open", "true");
      var first = panel.querySelector("[autofocus]") || panel.querySelector(FOCUSABLE);
      if (first) first.focus({ preventScroll: true });
    });
    document.documentElement.style.overflow = "hidden";
  }
  function close(panel) {
    if (typeof panel === "string") panel = document.querySelector(panel);
    var i = -1;
    for (var k = stack.length - 1; k >= 0; k--) if (!panel || stack[k].panel === panel) { i = k; break; }
    if (i < 0) return;
    var e = stack.splice(i, 1)[0];
    e.panel.setAttribute("data-open", "false");
    e.overlay.setAttribute("data-open", "false");
    var done = function () { e.overlay.remove(); e.panel.hidden = true; };
    if (reduced()) done(); else setTimeout(done, 280);
    if (!stack.length) document.documentElement.style.overflow = "";
    if (e.returnTo && e.returnTo.focus) e.returnTo.focus({ preventScroll: true });
    if (e.onClose) e.onClose();
  }
  document.addEventListener("keydown", function (ev) {
    if (!stack.length) return;
    var top = stack[stack.length - 1].panel;
    if (ev.key === "Escape") { ev.preventDefault(); close(top); return; }
    if (ev.key === "Tab") {
      var f = Array.prototype.filter.call(top.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener("click", function (ev) {
    var c = ev.target.closest && ev.target.closest("[data-close]");
    if (c) { var p = c.closest(".sheet,.dialog,[data-panel]"); close(p || undefined); }
  });

  // ---------- Toast ----------
  function toast(title, desc, icon) {
    var region = document.querySelector(".toast-region");
    if (!region) { region = document.createElement("div"); region.className = "toast-region"; region.setAttribute("role", "status"); region.setAttribute("aria-live", "polite"); document.body.appendChild(region); }
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = (window.SCIcons ? SCIcons.icon(icon || "circle-check", 16) : "") + "<div><strong>" + SC.esc(title) + "</strong>" + (desc ? "<small>" + SC.esc(desc) + "</small>" : "") + "</div>";
    region.appendChild(t);
    setTimeout(function () { t.remove(); }, 3800);
  }

  // ---------- Simple menu/popover toggle: <button data-menu="#id"> + <div id="id" class="popover" hidden> ----------
  document.addEventListener("click", function (ev) {
    var trg = ev.target.closest && ev.target.closest("[data-menu]");
    var openMenus = document.querySelectorAll(".popover[data-menu-open]");
    openMenus.forEach(function (m) { if (!trg || m !== document.querySelector(trg.getAttribute("data-menu"))) { if (!m.contains(ev.target) || ev.target.closest(".menu-item")) { m.hidden = true; m.removeAttribute("data-menu-open"); } } });
    if (trg) {
      var m = document.querySelector(trg.getAttribute("data-menu"));
      if (!m) return;
      var willOpen = m.hidden;
      m.hidden = !willOpen;
      if (willOpen) m.setAttribute("data-menu-open", ""); else m.removeAttribute("data-menu-open");
      trg.setAttribute("aria-expanded", String(willOpen));
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") document.querySelectorAll(".popover[data-menu-open]").forEach(function (m) { m.hidden = true; m.removeAttribute("data-menu-open"); });
  });

  SC.reduced = reduced;
  SC.theme = { apply: applyTheme, toggle: toggleTheme };
  SC.pill = pill;
  SC.open = open;
  SC.close = close;
  SC.toast = toast;
  SC.store = store;
  document.addEventListener("DOMContentLoaded", function () { if (window.SCIcons) SCIcons.hydrate(); });
})();
