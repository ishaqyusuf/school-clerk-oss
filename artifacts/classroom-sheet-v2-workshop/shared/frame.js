/* Workshop chrome shared by every direction (NOT product UI).
   Usage (in a direction's own JS, after DOMContentLoaded):
     SCW.init({
       id: "01", name: "Quiet toolbar", tagline: "…",
       coverage: { H1: "Title is the switcher", S1: "…", … },   // every FEATURES.md id
       mount: function (sheetHost, ctx) { … },  // render product into sheetHost; ctx = { role, viewport, toast(title, desc) }
       reset: function () { … },               // clear ALL direction state, then SCW will call mount again
       onRole: function (role) { … }           // optional; default re-mounts
     });
   The stage shows a faded dashboard behind the sheet. sheetHost is the right-anchored container whose width
   the direction controls (set sheetHost.style.width or a class). In phone viewport the stage is 390×844 and the
   sheet must fill it. Query ?viewport=phone|desktop&role=Admin|Registrar|Teacher&embed=1 are honoured.
*/
(function () {
  var q = new URLSearchParams(location.search);
  var st = { role: q.get("role") || "Admin", viewport: q.get("viewport") || (window.innerWidth < 700 ? "phone" : "desktop"), embed: q.get("embed") === "1" };
  var cfg;

  function esc(s) { return window.SC.esc(s); }

  function toast(title, desc) {
    var r = document.querySelector(".w-toasts");
    var t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status");
    t.innerHTML = window.SCIcons.icon("circle-check", 16) + "<div><strong>" + esc(title) + "</strong>" + (desc ? "<small>" + esc(desc) + "</small>" : "") + "</div>";
    r.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  function ctx() { return { role: st.role, viewport: st.viewport, toast: toast, canManage: st.role === "Admin" || st.role === "Registrar", isAdmin: st.role === "Admin" }; }

  function remount() {
    var host = document.getElementById("sheet-host");
    host.innerHTML = "";
    host.className = "w-sheet-host";
    host.removeAttribute("style");
    document.getElementById("stage").dataset.viewport = st.viewport;
    cfg.mount(host, ctx());
    window.SCIcons.hydrate(host);
  }

  function coverageHtml() {
    var ids = Object.keys(cfg.coverage);
    return '<div class="w-cov-head"><strong>Feature coverage</strong><span>' + ids.length + ' items · IDs from FEATURES.md</span></div><ul class="w-cov">' +
      ids.map(function (k) { return '<li><code>' + k + '</code><span>' + esc(cfg.coverage[k]) + '</span></li>'; }).join("") + "</ul>";
  }

  window.SCW = {
    init: function (c) {
      cfg = c;
      document.documentElement.classList.toggle("w-embed", st.embed);
      document.body.insertAdjacentHTML("afterbegin",
        '<header class="w-bar">' +
          '<a class="w-back" href="../index.html" aria-label="All directions">' + window.SCIcons.icon("arrow-left", 16) + '</a>' +
          '<div class="w-title"><b>' + esc(c.id) + ' · ' + esc(c.name) + '</b><span>' + esc(c.tagline) + '</span></div>' +
          '<div class="w-controls">' +
            '<div class="w-seg" role="group" aria-label="Viewport"><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>' +
            '<label class="w-role">Viewing as <select id="w-role">' + window.SC.data.roles.map(function (r) { return "<option" + (r === st.role ? " selected" : "") + ">" + r + "</option>"; }).join("") + '</select></label>' +
            '<button class="w-btn" id="w-theme" aria-label="Toggle dark mode">' + window.SCIcons.icon("moon", 16) + '</button>' +
            '<button class="w-btn" id="w-cov">' + window.SCIcons.icon("list-checks", 16) + '<span>Coverage</span></button>' +
            '<button class="w-btn" id="w-reset">' + window.SCIcons.icon("rotate-ccw", 16) + '<span>Reset</span></button>' +
          '</div>' +
        '</header>' +
        '<main class="w-main"><div id="stage" class="w-stage"><div class="w-backdrop" aria-hidden="true">' + backdrop() + '</div><div class="w-scrim" aria-hidden="true"></div><div id="sheet-host" class="w-sheet-host"></div></div>' +
        '<aside class="w-coverage" id="w-coverage" hidden>' + coverageHtml() + '</aside></main>' +
        '<div class="w-toasts toast-region" aria-live="polite"></div>');

      document.querySelectorAll("[data-vp]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.vp === st.viewport));
        b.onclick = function () { st.viewport = b.dataset.vp; document.querySelectorAll("[data-vp]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.vp === st.viewport)); }); remount(); };
      });
      document.getElementById("w-role").onchange = function (e) { st.role = e.target.value; if (cfg.onRole) cfg.onRole(st.role, ctx()); else remount(); };
      document.getElementById("w-theme").onclick = function () { document.documentElement.classList.toggle("dark"); };
      document.getElementById("w-cov").onclick = function () { var a = document.getElementById("w-coverage"); a.hidden = !a.hidden; this.setAttribute("aria-pressed", String(!a.hidden)); };
      document.getElementById("w-reset").onclick = function () { document.querySelectorAll(".w-toasts .toast").forEach(function (t) { t.remove(); }); cfg.reset(); remount(); toast("Reset", "Sample data and navigation restored"); };
      remount();
    },
    toast: toast,
    ctx: ctx,
    remount: remount
  };

  function backdrop() {
    var rows = window.SC.data.classrooms.map(function (c, i) { return '<div class="w-bd-row"><span>' + esc(c.displayName) + '</span><span>' + [28, 24, 31, 19, 0][i] + ' students</span><span>' + (i % 2 ? "Mrs. Okonkwo" : "Mr. Adebayo") + '</span></div>'; }).join("");
    return '<div class="w-bd-side"></div><div class="w-bd-body"><div class="w-bd-h">Classrooms</div>' + rows + rows + '</div>';
  }
})();
