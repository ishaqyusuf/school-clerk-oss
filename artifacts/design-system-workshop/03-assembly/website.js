/* Direction 03 — Assembly · Website studio ("guided studio").
   Template picker → editor with a floating left panel (Sections / Style / Pages / SEO), a centred canvas,
   a floating bottom toolbar (device, undo/redo, zoom) and a floating Publish pill.
   The Kingsway site preview is rendered with the TENANT theme (--s-* variables set from the Style panel),
   never the Assembly palette. Everything is a local simulation — nothing is sent anywhere. */
(function () {
  "use strict";

  var SC = window.SC;
  var D = SC.data, W = D.website, S = D.school;
  var esc = SC.esc;
  var I = function (n, s) { return SCIcons.icon(n, s || 16); };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  SC.pill({ id: "03", name: "Assembly" });

  /* =========================================================================
     Static definitions
     ========================================================================= */
  var TEMPLATES = W.templates.map(function (t) {
    return Object.assign({}, t, { slug: t.name.toLowerCase(), locked: t.plan === "PRO+" });
  });
  var TPL_PRESET = { scholaris: "classic-academic", northfield: "sunlit-family", crestview: "executive-campus", kaleidoscope: "bright-campus" };
  var TPL_TILE = { scholaris: "sky", northfield: "amber", crestview: "violet", kaleidoscope: "teal" };
  function tplOf(slug) { return TEMPLATES.find(function (t) { return t.slug === slug; }) || TEMPLATES[0]; }

  // Tenant style presets — these colours belong to the school's site, not to the platform.
  var PRESETS = {
    "classic-academic": { name: "Classic academic", blurb: "Maroon and gold, serif headings", base: "slate", primary: "#7f1d1d", secondary: "#1b2236", accent: "#c9a227", radius: "sm", density: "comfortable", font: "serif", menu: "default" },
    "bright-campus": { name: "Bright campus", blurb: "Clear blue, sunny yellow, round shapes", base: "zinc", primary: "#1d4ed8", secondary: "#0f766e", accent: "#facc15", radius: "xl", density: "airy", font: "sans", menu: "translucent" },
    "sunlit-family": { name: "Sunlit family", blurb: "Warm clay and honey, friendly type", base: "taupe", primary: "#b4471f", secondary: "#3b2416", accent: "#f2b33d", radius: "lg", density: "comfortable", font: "grotesque", menu: "default" },
    "executive-campus": { name: "Executive campus", blurb: "Deep green, fine serif, solid menu", base: "stone", primary: "#14532d", secondary: "#0c0a09", accent: "#c8a24a", radius: "none", density: "airy", font: "book", menu: "solid" },
  };
  var PRESET_ORDER = ["classic-academic", "bright-campus", "sunlit-family", "executive-campus"];
  // The remaining product presets only adjust shape, spacing and type.
  var MINOR = {
    nova: { name: "Nova", radius: "md", density: "compact", font: "sans" },
    vega: { name: "Vega", radius: "lg", density: "comfortable", font: "grotesque" },
    maia: { name: "Maia", radius: "full", density: "airy", font: "sans" },
    mira: { name: "Mira", radius: "sm", density: "compact", font: "serif" },
    lyra: { name: "Lyra", radius: "none", density: "comfortable", font: "book" },
  };

  var BASES = {
    slate: { label: "Slate", bg: "#f8fafc", surface: "#ffffff", alt: "#eef2f7", ink: "#0f172a", muted: "#475569", line: "#e2e8f0" },
    zinc: { label: "Zinc", bg: "#fafafa", surface: "#ffffff", alt: "#f1f1f3", ink: "#18181b", muted: "#52525b", line: "#e4e4e7" },
    neutral: { label: "Neutral", bg: "#fafafa", surface: "#ffffff", alt: "#f2f2f2", ink: "#171717", muted: "#525252", line: "#e5e5e5" },
    stone: { label: "Stone", bg: "#fafaf9", surface: "#ffffff", alt: "#f2f0ee", ink: "#1c1917", muted: "#57534e", line: "#e7e5e4" },
    taupe: { label: "Taupe", bg: "#f8f4ef", surface: "#fffdf9", alt: "#efe7dd", ink: "#2a221d", muted: "#6b5d52", line: "#e6dbcf" },
  };
  var RADII = { none: [0, 0, 0], sm: [6, 4, 4], md: [10, 8, 6], lg: [16, 12, 8], xl: [24, 18, 12], full: [28, 999, 14] }; // card, button, small
  var RADIUS_LABEL = { none: "None", sm: "S", md: "M", lg: "L", xl: "XL", full: "Full" };
  var DENSITY = { compact: [52, 18], comfortable: [84, 26], airy: [116, 34] }; // section padding, gap
  var DENSITY_LABEL = { compact: "Compact", comfortable: "Comfortable", airy: "Airy" };
  var FONTS = {
    serif: { label: "Classic serif", stack: 'Georgia, "Times New Roman", serif', w: 400, t: "-0.01em" },
    book: { label: "Book serif", stack: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif', w: 400, t: "0em" },
    grotesque: { label: "Grotesque", stack: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif', w: 700, t: "-0.03em" },
    sans: { label: "Clean sans", stack: 'Onest, ui-sans-serif, system-ui, sans-serif', w: 650, t: "-0.025em" },
  };
  var MENUS = { default: ["Default", "Light bar with a hairline"], translucent: ["Translucent", "Floats over the hero"], solid: ["Solid", "Filled with the secondary colour"] };
  var SWATCH_NAMES = { "#1d4ed8": "Royal blue", "#0f766e": "Teal", "#7c2d12": "Rust", "#6d28d9": "Violet", "#be123c": "Rose", "#15803d": "Green", "#7f1d1d": "Maroon", "#b4471f": "Clay", "#14532d": "Forest", "#1b2236": "Midnight", "#0f172a": "Navy", "#3b2416": "Cocoa", "#0c0a09": "Ink", "#134e4a": "Deep teal", "#3b0764": "Plum", "#c9a227": "Gold", "#f59e0b": "Amber", "#facc15": "Sunshine", "#fb923c": "Tangerine", "#22d3ee": "Sky", "#f472b6": "Pink", "#f2b33d": "Honey", "#c8a24a": "Brass" };
  var COLOR_ROWS = {
    primary: { label: "Primary colour", hint: "Buttons, links and highlights", list: W.theme.swatches },
    secondary: { label: "Secondary colour", hint: "Admissions band and footer", list: ["#1b2236", "#0f172a", "#134e4a", "#3b2416", "#0c0a09", "#3b0764"] },
    accent: { label: "Accent colour", hint: "Small marks and the crest trim", list: ["#c9a227", "#f59e0b", "#facc15", "#fb923c", "#22d3ee", "#f472b6"] },
  };

  var PAGES = W.pages;
  var PAGE_META = {
    Home: { path: "", icon: "house", tile: "sky" },
    About: { path: "about", icon: "info", tile: "violet", title: "About Kingsway", intro: "Fifteen years of teaching in Ibadan, from Creche to SS 3." },
    Admissions: { path: "admissions", icon: "graduation-cap", tile: "teal", title: "Admissions", intro: "Places are open for the 2026/2027 session. Here is how to join us." },
    Blog: { path: "blog", icon: "newspaper", tile: "violet", title: "News and stories", intro: "What is happening in classrooms, clubs and on the sports field." },
    Events: { path: "events", icon: "calendar-days", tile: "amber", title: "Events", intro: "Dates for families this term." },
    Resources: { path: "resources", icon: "files", tile: "slate", title: "Resources", intro: "Forms, book lists and guides for families." },
    Contact: { path: "contact", icon: "phone", tile: "sky", title: "Contact us", intro: "Visit the school office or send us a message." },
  };
  var SEC_META = {
    hero: { icon: "layout-template", tile: "sky" },
    features: { icon: "layout-grid", tile: "violet" },
    stats: { icon: "chart-no-axes-column", tile: "teal" },
    staff: { icon: "users-round", tile: "amber" },
    admission: { icon: "graduation-cap", tile: "sky" },
    announcements: { icon: "megaphone", tile: "amber" },
    story: { icon: "scroll-text", tile: "violet" },
    process: { icon: "list-checks", tile: "teal" },
    contact: { icon: "map-pin", tile: "sky" },
    collection: { icon: "newspaper", tile: "violet" },
  };
  var CMS_META = { "Announcements": ["megaphone", "amber"], "Blog posts": ["newspaper", "violet"], "Events": ["calendar-days", "teal"], "Resources": ["files", "sky"] };

  var FEATURE_TEXT = {
    "Small classes": "Teachers who know every child by name and notice when something changes.",
    "STEM labs": "Hands-on science, coding and robotics from Basic 4 upwards.",
    "Qur’an & Arabic": "Daily Qur’an and Arabic lessons alongside the national curriculum.",
    "Sports & clubs": "Football, athletics, debate and chess clubs every afternoon.",
  };
  var annItems = (W.sections.find(function (s) { return s.key === "announcements"; }) || {}).items || [];
  var ANNOUNCEMENTS = [
    { t: annItems[0], d: "09", m: "Oct", tag: "Calendar" },
    { t: annItems[1], d: "07", m: "Oct", tag: "Parents" },
    { t: annItems[2], d: "05", m: "Oct", tag: "Sports" },
    { t: "Uniform shop now opens on Saturdays", d: "28", m: "Sep", tag: "Notices" },
    { t: "A warm welcome to our new JSS 1 families", d: "16", m: "Sep", tag: "Notices" },
    { t: "First term begins on Monday 14 September", d: "07", m: "Sep", tag: "Calendar" },
  ];
  var HONORIFIC = /^(Mrs?|Ms|Dr|Mal|Alh)\.?\s+/;
  var STAFF = D.classrooms.map(function (c) {
    var cls = c.name.indexOf("Nur ") === 0 ? "Nursery " + c.name.slice(4) : c.name;
    return { name: c.teacher, initials: SC.initials(c.teacher.replace(HONORIFIC, "")), role: cls + " class teacher" };
  });
  var COLL = {
    Blog: { label: "Blog posts", icon: "newspaper", heading: "News from Kingsway", items: [
      { t: "What our JSS 1 pupils built for the science fair", tag: "Academics", date: "2 Oct 2026" },
      { t: "Reading at home: a short guide for parents", tag: "Parents", date: "25 Sep 2026" },
      { t: "Inter-house sports trials begin", tag: "Sports", date: "18 Sep 2026" },
      { t: "Welcome back to the 2026/2027 session", tag: "News", date: "14 Sep 2026" },
    ] },
    Events: { label: "Events", icon: "calendar-days", heading: "Coming up this term", items: [
      { t: "PTA meeting", d: "17", m: "Oct", meta: "Saturday · School hall · 10:00am" },
      { t: "Mid-term break", d: "30", m: "Oct", meta: "30 Oct – 2 Nov · School closed" },
      { t: "Inter-house sports day", d: "27", m: "Nov", meta: "Friday · Sports field · 9:00am" },
    ] },
    Resources: { label: "Resources", icon: "files", heading: "Forms, lists and guides", items: ["School calendar 2026/2027", "First term fee schedule", "Uniform guide", "Book list: Nursery", "Book list: Primary", "Book list: Junior secondary", "Book list: Senior secondary", "Admission form", "Parent handbook"].map(function (t) { return { t: t }; }) },
  };
  var STEPS = [
    ["Enquire", "Call or message the school office to ask about places in your child's class."],
    ["Visit", "Tour the school with your child and meet the teachers."],
    ["Assessment", "A short, friendly entrance assessment in English and Mathematics."],
    ["Offer and enrol", "Accept your offer, pay first-term fees and collect the uniform list."],
  ];
  var MEDIA = ["Campus front", "Morning assembly", "Science lab", "Sports day", "Library corner", "Prize-giving"];
  var SEO_DEFAULT = {
    Home: ["Kingsway Academy, Ibadan | Nursery to Secondary", "Kingsway Academy in Ibadan offers nursery, primary and secondary education with small classes, strong results and a caring community."],
    About: ["About Kingsway Academy | Our story and values", "Since 2011, Kingsway Academy has taught children in Ibadan from Creche to SS 3. Read our story and meet the teachers who know every child by name."],
    Admissions: ["Admissions 2026/2027 | Kingsway Academy, Ibadan", "How to join Kingsway Academy: enquire, visit the school, sit a short entrance assessment and enrol. Places are open from Creche to SS 1."],
    Blog: ["News and stories | Kingsway Academy", "News from Kingsway Academy, Ibadan: classroom projects, clubs, sports and notes for parents."],
    Events: ["Events and term dates | Kingsway Academy", "Term dates, PTA meetings and school events at Kingsway Academy, Ibadan, for the 2026/2027 session."],
    Resources: ["Resources for families | Kingsway Academy", "Download the school calendar, fee schedule, uniform guide, book lists and admission form for Kingsway Academy."],
    Contact: ["Contact Kingsway Academy, Ibadan", "Visit Kingsway Academy on Ring Road, Ibadan, or call the school office. Open Monday to Friday, 7:30am to 4:00pm."],
  };
  var DEVICE_W = { desktop: 1280, tablet: 768, mobile: 390 };
  var DEVICE_LABEL = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };
  var ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25];
  var TODAY = "9 Oct 2026";

  /* =========================================================================
     Colour helpers (tenant theme maths)
     ========================================================================= */
  function rgb(h) { h = h.replace("#", ""); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function inkOn(bg) { return contrast(bg, "#ffffff") >= contrast(bg, "#111827") ? "#ffffff" : "#111827"; }
  function mixHex(a, b, t) { var A = rgb(a), B = rgb(b); return "#" + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0"); }).join(""); }
  function normHex(v) {
    v = String(v || "").trim().toLowerCase();
    if (v.charAt(0) !== "#") v = "#" + v;
    if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v.slice(1).split("").map(function (c) { return c + c; }).join("");
    return /^#[0-9a-f]{6}$/.test(v) ? v : null;
  }
  function themeStyle(t) {
    var b = BASES[t.base] || BASES.slate, r = RADII[t.radius] || RADII.md, d = DENSITY[t.density] || DENSITY.comfortable, f = FONTS[t.font] || FONTS.serif;
    var onP = inkOn(t.primary), onS = inkOn(t.secondary), onA = inkOn(t.accent);
    var pText = contrast(t.primary, b.surface) >= 4.5 ? t.primary : mixHex(t.primary, b.ink, 0.5);
    var vars = {
      "--s-bg": b.bg, "--s-surface": b.surface, "--s-alt": b.alt, "--s-ink": b.ink, "--s-muted": b.muted, "--s-line": b.line,
      "--s-primary": t.primary, "--s-on-primary": onP, "--s-primary-text": pText,
      "--s-secondary": t.secondary, "--s-on-secondary": onS,
      "--s-accent": t.accent, "--s-on-accent": onA,
      "--s-accent-on-secondary": contrast(t.accent, t.secondary) >= 3 ? t.accent : onS,
      "--s-accent-on-primary": contrast(t.accent, t.primary) >= 3 ? t.accent : onP,
      "--s-r-card": r[0] + "px", "--s-r-btn": r[1] + "px", "--s-r-sm": r[2] + "px",
      "--s-y": d[0] + "px", "--s-gap": d[1] + "px",
      "--s-font-head": f.stack, "--s-hw": f.w, "--s-ht": f.t,
    };
    return Object.keys(vars).map(function (k) { return k + ":" + vars[k]; }).join(";");
  }

  /* =========================================================================
     State
     ========================================================================= */
  function presetTheme(id) {
    var p = PRESETS[id];
    return { preset: id, base: p.base, primary: p.primary, secondary: p.secondary, accent: p.accent, radius: p.radius, density: p.density, font: p.font, menu: p.menu };
  }
  function customised(t) {
    var keys, ref;
    if (PRESETS[t.preset]) { ref = PRESETS[t.preset]; keys = ["base", "primary", "secondary", "accent", "radius", "density", "font", "menu"]; }
    else if (MINOR[t.preset]) { ref = MINOR[t.preset]; keys = ["radius", "density", "font"]; }
    else return true;
    return keys.some(function (k) { return t[k] !== ref[k]; });
  }
  function presetName(t) { return (PRESETS[t.preset] || MINOR[t.preset] || { name: "Custom" }).name; }

  function defaultFields(key, page) {
    var src = W.sections.find(function (s) { return s.key === key; }) || {};
    switch (key) {
      case "hero": return Object.assign({}, src.fields, { link: "Book a school visit", to: "Admissions", image: "Campus front" });
      case "features": return { heading: "Why families choose Kingsway", items: src.items.map(function (t) { return { title: t, text: FEATURE_TEXT[t] || "" }; }) };
      case "stats": return { heading: "Kingsway in numbers", items: src.items.map(function (p) { return { value: p[0], label: p[1] }; }) };
      case "staff": return { heading: "Meet some of our teachers", count: "4" };
      case "admission": return { heading: "Admissions for 2026/2027 are open", body: "Places are available from Creche to SS 1. Book a visit, meet our teachers and sit a short entrance assessment.", links: ["How to apply", "School fees", "Book a visit", "Download the prospectus"] };
      case "announcements": return { heading: "Notice board", count: "3" };
      case "story": return { heading: "Our story", body: "Kingsway Academy opened in 2011 with two nursery classes and one promise to parents: we would know every child. Fifteen years on we teach 486 pupils from Creche to SS 3, and that promise still shapes every class we plan.", quote: S.motto };
      case "process": return { heading: "How admission works", intro: "Four steps from your first enquiry to your child's first day." };
      case "contact": return { heading: "Visit or get in touch", address: "Ring Road, Ibadan, Oyo State", phone: "+234 803 555 0142", email: "hello@kingsway.edu.ng", hours: "Monday to Friday, 7:30am – 4:00pm" };
      case "collection": return { heading: COLL[page].heading, count: String(COLL[page].items.length) };
    }
    return {};
  }
  function freshState(tpl) {
    var seq = 0, pages = {}, seo = {};
    PAGES.forEach(function (p) { pages[p] = []; seo[p] = { title: SEO_DEFAULT[p][0], desc: SEO_DEFAULT[p][1], index: true }; });
    W.sections.forEach(function (s) {
      pages[s.page].push({ id: "s" + (++seq), key: s.key, label: s.label, required: !!s.required, visible: true, f: defaultFields(s.key, s.page) });
    });
    ["Blog", "Events", "Resources"].forEach(function (p) {
      pages[p].push({ id: "s" + (++seq), key: "collection", label: COLL[p].label, required: true, visible: true, f: defaultFields("collection", p) });
    });
    return { tpl: tpl, pages: pages, theme: presetTheme(TPL_PRESET[tpl]), seo: seo, footer: { note: S.motto }, seq: seq };
  }

  var state = freshState("scholaris");
  var ui = {
    screen: "picker", page: "Home", sel: null, tab: "sections", device: "desktop", zoom: "fit",
    mode: "draft", hasDraft: true, edited: "4 min ago", liveSince: "12 Sep 2026", liveTpl: "scholaris",
    preview: false, panelOpen: false, publishing: false,
  };
  var locked = function () { return ui.mode === "published"; };
  function secById(id) {
    var list = state.pages[ui.page] || [];
    return list.find(function (s) { return s.id === id; });
  }

  /* ---------- History (undo / redo) ---------- */
  var hist = [], hi = -1, pending = null;
  function resetHistory() { clearTimeout(pending); pending = null; hist = [JSON.stringify(state)]; hi = 0; renderHistoryButtons(); }
  function commit() {
    clearTimeout(pending); pending = null;
    var snap = JSON.stringify(state);
    if (snap === hist[hi]) return;
    hist = hist.slice(0, hi + 1); hist.push(snap);
    if (hist.length > 100) hist.shift();
    hi = hist.length - 1;
    touched();
    renderHistoryButtons();
  }
  function commitSoon() { clearTimeout(pending); pending = setTimeout(commit, 650); touched(); }
  function restore(msg) {
    state = JSON.parse(hist[hi]);
    if (ui.sel && ui.sel !== "header" && ui.sel !== "footer" && !secById(ui.sel)) ui.sel = null;
    touched();
    renderPanel(); renderCanvas(); renderHistoryButtons(); renderTop();
    announce(msg);
  }
  function undo() { if (locked()) return; if (pending) commit(); if (hi <= 0) return; hi--; restore("Undone"); }
  function redo() { if (locked() || hi >= hist.length - 1) return; hi++; restore("Redone"); }
  function touched() {
    if (ui.mode !== "draft" || ui.edited === "just now") return;
    ui.edited = "just now"; renderStatus();
  }

  /* =========================================================================
     Tenant site renderer (Kingsway Academy) — used by canvas, picker cards and template preview
     ========================================================================= */
  function crest() {
    return '<svg class="s-crest" viewBox="0 0 40 46" aria-hidden="true">' +
      '<path class="c-shield" d="M20 1.5 38 7.5V22c0 11-8 19-18 22.5C10 41 2 33 2 22V7.5Z"/>' +
      '<path class="c-trim" d="M20 5.4 34.4 10.2V22c0 8.6-6.2 15.2-14.4 18.4C11.8 37.2 5.6 30.6 5.6 22V10.2Z"/>' +
      '<text class="c-text" x="20" y="27" text-anchor="middle">KA</text></svg>';
  }
  function campusArt() {
    return '<svg class="s-art" viewBox="0 0 480 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      '<circle class="a-sun" cx="398" cy="66" r="22"/>' +
      '<path d="M18 276H462"/>' +
      '<path class="a-fill" d="M60 276V250"/><circle class="a-fill" cx="60" cy="224" r="28"/>' +
      '<path class="a-fill" d="M424 276V254"/><circle class="a-fill" cx="424" cy="234" r="22"/>' +
      '<rect class="a-fill" x="120" y="150" width="240" height="126"/>' +
      '<path class="a-fill" d="M104 150 240 84 376 150Z"/>' +
      '<circle cx="240" cy="124" r="13"/><path d="M240 117v7l5 4"/>' +
      '<path d="M152 166v110M196 166v110M284 166v110M328 166v110"/>' +
      '<path d="M222 276v-38a18 18 0 0 1 36 0v38"/>' +
      '<path d="M240 84V40"/><path class="a-flag" d="M241 42h34l-8 10 8 10h-34Z"/>' +
      '</svg>';
  }
  function mapArt() {
    return '<svg class="s-art s-map-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<path d="M-10 210C80 190 120 120 210 118S340 60 420 40"/><path d="M60 -10 110 320"/><path d="M-10 90H420"/><path d="M250 -10 300 320"/>' +
      '<path class="a-fill" d="M140 150h60v40h-60zM300 170h50v50h-50zM40 30h50v40H40z"/>' +
      '<path class="a-flag" d="M214 92c0 14-14 26-14 26s-14-12-14-26a14 14 0 0 1 28 0Z"/><circle class="a-pin" cx="200" cy="92" r="5"/>' +
      '</svg>';
  }
  function img(label, cls, art) {
    return '<div class="s-img ' + (cls || "") + '">' + (art || "") + '<span class="s-img-tag">' + I("image", 14) + "Image · " + esc(label) + "</span></div>";
  }
  function featureIcon(t) {
    if (/class|teach/i.test(t)) return "users-round";
    if (/stem|lab|science|cod/i.test(t)) return "pencil-ruler";
    if (/qur|arabic|islam|faith|relig/i.test(t)) return "book-open";
    if (/sport|club|athlet/i.test(t)) return "trophy";
    if (/art|music|drama/i.test(t)) return "palette";
    if (/bus|transport/i.test(t)) return "bus";
    return "star";
  }

  function siteHTML(st, page, opt) {
    opt = opt || {};
    var ctx = { st: st, page: page, ed: !!opt.editing, sel: opt.sel, ti: opt.editing ? ' tabindex="-1"' : "" };
    var list = (st.pages[page] || []).filter(function (s) { return s.visible; });
    var out = block(ctx, "header", "Site header", headerHTML(ctx), "s-hdr-block");
    if (page !== "Home") out += '<div class="s-block s-static">' + pageHeadHTML(ctx) + "</div>";
    list.forEach(function (s) { out += block(ctx, s.id, s.label, sectionHTML(ctx, s)); });
    out += block(ctx, "footer", "Footer", footerHTML(ctx));
    return '<div class="site" data-tpl="' + st.tpl + '" data-menu="' + st.theme.menu + '"' + (ctx.ed ? " data-editing" : "") + ' style="' + esc(themeStyle(st.theme)) + '">' + out + "</div>";
  }
  function block(ctx, id, label, inner, extra) {
    var cls = "s-block" + (extra ? " " + extra : "");
    if (!ctx.ed) return '<div class="' + cls + '">' + inner + "</div>";
    var on = ctx.sel === id;
    return '<div class="' + cls + (on ? " is-sel" : "") + '" data-sec="' + id + '" role="button" tabindex="0" aria-pressed="' + on + '" aria-label="' + esc(label) + ' section">' +
      '<span class="s-tag" aria-hidden="true">' + esc(label) + "</span>" + inner + "</div>";
  }
  function link(ctx, label, goto, cls, extra) {
    return '<a href="#" class="' + (cls || "") + '"' + (goto ? ' data-goto="' + esc(goto) + '"' : "") + (extra || "") + ctx.ti + ">" + label + "</a>";
  }
  function headerHTML(ctx) {
    var nav = PAGES.filter(function (p) { return p !== "Home"; }).map(function (p) {
      return link(ctx, p, p, "", p === ctx.page ? ' aria-current="page"' : "");
    }).join("");
    return '<div class="s-header"><div class="s-wrap s-header-in">' +
      link(ctx, crest() + '<span class="s-brand-txt"><span class="s-brand-name">Kingsway Academy</span><span class="s-brand-sub">Ibadan · Est. 2011</span></span>', "Home", "s-brand") +
      '<div class="s-nav">' + nav + "</div>" +
      '<div class="s-header-cta">' + link(ctx, "Parent portal", "", "s-btn s-btn-sm s-btn-ghost") + link(ctx, "Apply", "Admissions", "s-btn s-btn-sm s-btn-apply") + "</div>" +
      '<span class="s-burger" aria-hidden="true">' + I("menu", 22) + "</span>" +
      "</div></div>";
  }
  function pageHeadHTML(ctx) {
    var m = PAGE_META[ctx.page];
    return '<section class="s-pagehead"><div class="s-wrap">' +
      '<p class="s-crumbs">' + link(ctx, "Home", "Home") + "<span>/</span>" + esc(ctx.page) + "</p>" +
      '<h2 class="s-h s-display s-display-sm">' + esc(m.title) + "</h2>" +
      '<p class="s-lead">' + esc(m.intro) + "</p></div></section>";
  }
  function heroCopy(ctx, f, after) {
    return '<div class="s-hero-copy">' +
      (f.kicker ? '<p class="s-kicker" data-field="kicker">' + esc(f.kicker) + "</p>" : "") +
      (f.title ? '<h2 class="s-h s-display" data-field="title">' + esc(f.title) + "</h2>" : "") +
      (f.body ? '<p class="s-lead" data-field="body">' + esc(f.body) + "</p>" : "") +
      '<div class="s-actions">' +
      (f.cta ? link(ctx, esc(f.cta) + I("arrow-right", 18), f.to, "s-btn", ' data-field="cta"') : "") +
      (f.link ? link(ctx, esc(f.link), "Contact", "s-textlink", ' data-field="link"') : "") +
      "</div>" + (after || "") + "</div>";
  }
  function heroHTML(ctx, s) {
    var f = s.f, tpl = ctx.st.tpl, note = ctx.st.footer.note;
    if (tpl === "northfield") {
      return '<section class="s-hero s-hero-b"><div class="s-wrap s-hero-grid">' +
        '<div class="s-hero-media">' + img(f.image, "s-img-arch", campusArt()) + img("Morning assembly", "s-img-dot") + "</div>" +
        heroCopy(ctx, f, '<div class="s-note">' + I("calendar-days", 20) + "<span><b>Next for parents</b>" + esc(ANNOUNCEMENTS[1].t) + "</span></div>") +
        "</div></section>";
    }
    if (tpl === "crestview") {
      return '<section class="s-hero s-hero-c"><div class="s-hero-bg">' + img(f.image, "s-img-bleed", campusArt()) + "</div>" +
        '<div class="s-wrap">' + heroCopy(ctx, f) + "</div>" +
        '<div class="s-wrap"><dl class="s-hero-strip"><div><dt>Classes</dt><dd>Creche to SS 3</dd></div><div><dt>Pupils</dt><dd class="tnum">' + S.students + '</dd></div><div><dt>Campus</dt><dd>Ibadan, Oyo State</dd></div></dl></div>' +
        "</section>";
    }
    if (tpl === "kaleidoscope") {
      return '<section class="s-hero s-hero-d"><div class="s-wrap s-hero-grid">' + heroCopy(ctx, f) +
        '<div class="s-tiles">' +
        '<span class="s-tile t1"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="k-a" cx="50" cy="50" r="24"/><circle class="k-b" cx="50" cy="50" r="36"/></svg></span>' +
        '<span class="s-tile t2">' + img(f.image, "s-img-fill", campusArt()) + "</span>" +
        '<span class="s-tile t3"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="k-c" d="M16 80 42 30 68 80Z"/><path class="k-a" d="M50 80a22 22 0 0 1 44 0Z"/></svg></span>' +
        '<span class="s-tile t4"><b class="s-h">Aa</b><small class="tnum">1 2 3</small></span>' +
        "</div></div></section>";
    }
    return '<section class="s-hero s-hero-a"><div class="s-wrap s-hero-grid">' +
      heroCopy(ctx, f, '<ul class="s-facts"><li>' + I("check", 16) + "Creche to SS 3</li><li>" + I("check", 16) + "Ibadan, Oyo State</li><li>" + I("check", 16) + '<span class="tnum">' + S.students + "</span>&nbsp;pupils</li></ul>") +
      '<div class="s-hero-media">' + img(f.image, "s-img-tall", campusArt()) +
      '<div class="s-seal">' + crest() + "<span><b>Est. 2011</b><small>" + esc(note) + "</small></span></div></div>" +
      "</div></section>";
  }
  function headHTML(kicker, f, more) {
    return '<div class="s-head' + (more ? " s-head-row" : "") + '"><div class="s-head-txt">' + (kicker ? '<p class="s-kicker">' + kicker + "</p>" : "") +
      (f.heading ? '<h3 class="s-h s-h2" data-field="heading">' + esc(f.heading) + "</h3>" : "") + "</div>" + (more || "") + "</div>";
  }
  function sectionHTML(ctx, s) {
    var f = s.f, n, items;
    switch (s.key) {
      case "hero": return heroHTML(ctx, s);
      case "features":
        items = f.items || [];
        return '<section class="s-sec s-features"><div class="s-wrap">' + headHTML("Life at Kingsway", f) +
          '<div class="s-fgrid" data-n="' + items.length + '">' + items.map(function (it) {
            return '<article class="s-fcard"><span class="s-fico">' + I(featureIcon(it.title), 22) + '</span><h4 class="s-h s-h3">' + esc(it.title) + "</h4>" + (it.text ? "<p>" + esc(it.text) + "</p>" : "") + "</article>";
          }).join("") + "</div></div></section>";
      case "stats":
        items = f.items || [];
        return '<section class="s-sec s-stats"><div class="s-wrap s-stats-in"><div class="s-stats-head">' +
          (f.heading ? '<h3 class="s-h s-stats-title" data-field="heading">' + esc(f.heading) + "</h3>" : "") +
          "<p>Nursery, primary and secondary on one campus in Ibadan.</p></div>" +
          '<dl class="s-stat-list">' + items.map(function (it) { return '<div class="s-stat"><dt>' + esc(it.label) + '</dt><dd class="s-h tnum">' + esc(it.value) + "</dd></div>"; }).join("") + "</dl></div></section>";
      case "staff":
        n = parseInt(f.count, 10) || 4;
        return '<section class="s-sec s-staff"><div class="s-wrap">' + headHTML("Our teachers", f, link(ctx, "All staff" + I("arrow-right", 16), "About", "s-textlink")) +
          '<ul class="s-people" data-n="' + n + '">' + STAFF.slice(0, n).map(function (p) {
            return '<li class="s-person"><span class="s-portrait"><span class="s-h">' + esc(p.initials) + '</span><span class="s-img-tag">' + I("image", 12) + "Photo</span></span><b>" + esc(p.name) + "</b><span>" + esc(p.role) + "</span></li>";
          }).join("") + "</ul></div></section>";
      case "admission":
        return '<section class="s-sec s-admit"><div class="s-wrap s-admit-in"><div class="s-admit-copy"><p class="s-kicker">Admissions</p>' +
          (f.heading ? '<h3 class="s-h s-h2" data-field="heading">' + esc(f.heading) + "</h3>" : "") +
          (f.body ? '<p class="s-admit-body" data-field="body">' + esc(f.body) + "</p>" : "") +
          link(ctx, "Start an application" + I("arrow-right", 18), "Admissions", "s-btn") + "</div>" +
          '<ul class="s-admit-links">' + (f.links || []).filter(Boolean).map(function (l) { return "<li>" + link(ctx, "<span>" + esc(l) + "</span>" + I("arrow-up-right", 20), "Admissions") + "</li>"; }).join("") + "</ul></div></section>";
      case "announcements":
        n = parseInt(f.count, 10) || 3;
        return '<section class="s-sec s-news"><div class="s-wrap s-news-in">' + headHTML("This term", f, link(ctx, "All announcements" + I("arrow-right", 16), "Blog", "s-textlink")) +
          '<ul class="s-news-list">' + ANNOUNCEMENTS.slice(0, n).map(function (a) {
            return '<li><span class="s-date"><b class="s-h tnum">' + a.d + "</b><small>" + a.m + '</small></span><span class="s-news-txt"><small>' + a.tag + "</small><b>" + esc(a.t) + "</b></span>" + I("chevron-right", 20) + "</li>";
          }).join("") + "</ul></div></section>";
      case "story":
        return '<section class="s-sec s-story"><div class="s-wrap s-story-in">' + img("School building", "s-img-wide", campusArt()) +
          '<div class="s-story-copy"><p class="s-kicker">Since 2011</p>' + (f.heading ? '<h3 class="s-h s-h2" data-field="heading">' + esc(f.heading) + "</h3>" : "") +
          (f.body ? '<p class="s-story-body" data-field="body">' + esc(f.body) + "</p>" : "") +
          (f.quote ? '<blockquote class="s-quote s-h" data-field="quote">' + esc(f.quote) + "</blockquote>" : "") + "</div></div></section>";
      case "process":
        return '<section class="s-sec s-process"><div class="s-wrap">' + headHTML("Step by step", f) +
          (f.intro ? '<p class="s-lead s-process-intro" data-field="intro">' + esc(f.intro) + "</p>" : "") +
          '<ol class="s-steps">' + STEPS.map(function (st, i) { return '<li class="s-step"><span class="s-step-n tnum">' + (i + 1) + '</span><h4 class="s-h s-h3">' + st[0] + "</h4><p>" + st[1] + "</p></li>"; }).join("") + "</ol></div></section>";
      case "contact":
        return '<section class="s-sec s-contact"><div class="s-wrap s-contact-in"><div>' + headHTML("We're here to help", f) +
          '<ul class="s-contact-list">' +
          [["map-pin", "Address", f.address], ["phone", "Phone", f.phone], ["mail", "Email", f.email], ["clock", "Office hours", f.hours]].filter(function (r) { return r[2]; }).map(function (r) {
            return '<li><span class="s-cico">' + I(r[0], 20) + "</span><span><small>" + r[1] + "</small><b>" + esc(r[2]) + "</b></span></li>";
          }).join("") + "</ul></div>" + img("Map", "s-map", mapArt()) + "</div></section>";
      case "collection": return collectionHTML(ctx, s);
    }
    return "";
  }
  function collectionHTML(ctx, s) {
    var c = COLL[ctx.page] || COLL.Blog, n = parseInt(s.f.count, 10) || c.items.length, items = c.items.slice(0, n), body;
    if (ctx.page === "Events") {
      body = '<ul class="s-news-list">' + items.map(function (e) { return '<li><span class="s-date"><b class="s-h tnum">' + e.d + "</b><small>" + e.m + '</small></span><span class="s-news-txt"><b>' + esc(e.t) + "</b><small>" + esc(e.meta) + "</small></span>" + I("chevron-right", 20) + "</li>"; }).join("") + "</ul>";
    } else if (ctx.page === "Resources") {
      body = '<ul class="s-files">' + items.map(function (r) { return '<li><span class="s-cico">' + I("file-text", 20) + "</span><b>" + esc(r.t) + '</b><small>PDF</small><span class="s-dl">' + I("download", 18) + "</span></li>"; }).join("") + "</ul>";
    } else {
      body = '<div class="s-posts">' + items.map(function (p) { return '<article class="s-post">' + img(p.tag + " photo", "s-img-post") + "<small>" + esc(p.tag) + " · " + esc(p.date) + '</small><h4 class="s-h s-h3">' + esc(p.t) + "</h4></article>"; }).join("") + "</div>";
    }
    return '<section class="s-sec s-coll"><div class="s-wrap">' + headHTML("", s.f) + body + "</div></section>";
  }
  function footerHTML(ctx) {
    var contact = (ctx.st.pages.Contact || []).find(function (s) { return s.key === "contact"; });
    var cf = contact ? contact.f : defaultFields("contact");
    return '<div class="s-footer"><div class="s-wrap s-footer-grid">' +
      '<div class="s-footer-brand">' + crest() + '<b class="s-h">Kingsway Academy</b><p data-field="note">' + esc(ctx.st.footer.note) + "</p></div>" +
      "<div><h4>Visit</h4><p>" + esc(cf.address) + "</p><p>" + esc(cf.hours) + "</p></div>" +
      '<div><h4>Contact</h4><p class="tnum">' + esc(cf.phone) + "</p><p>" + esc(cf.email) + "</p></div>" +
      "<div><h4>Quick links</h4><ul>" + ["Admissions", "Events", "Resources", "Contact"].map(function (p) { return "<li>" + link(ctx, p, p) + "</li>"; }).join("") + "<li>" + link(ctx, "Parent portal", "") + "</li></ul></div>" +
      '</div><div class="s-wrap s-footer-base"><span>© 2026 Kingsway Academy, Ibadan</span><span>kingsway.school-clerk.com</span></div></div>';
  }

  /* =========================================================================
     DOM references
     ========================================================================= */
  var studio = $("#studio"), picker = $("#picker"), editor = $("#editor"), pkGrid = $("#pk-grid");
  var panel = $("#panel"), pnBody = $("#pn-body"), pnLock = $("#pn-lock");
  var canvas = $("#canvas"), frame = $("#cv-frame"), sizer = $("#cv-sizer"), vp = $("#cv-viewport");
  var toolbar = $("#toolbar"), zoomVal = $("#zoom-val");
  var statusBtn = $("#status-btn"), statusPop = $("#status-pop"), pageMenu = $("#page-menu"), moreMenu = $("#more-menu");
  var publishBtn = $("#publish-btn"), previewBtn = $("#preview-btn"), continueBtn = $("#continue-btn");
  var announcer = $("#announcer");
  var narrowMQ = window.matchMedia("(max-width: 767px)");
  var isNarrow = function () { return narrowMQ.matches; };

  function announce(msg) { if (!msg) return; announcer.textContent = ""; requestAnimationFrame(function () { announcer.textContent = msg; }); }
  function smooth() { return SC.reduced() ? "auto" : "smooth"; }

  /* =========================================================================
     Top row
     ========================================================================= */
  function renderStatus() {
    var live = ui.mode === "published" || !ui.hasDraft;
    var long = live ? "Live since " + ui.liveSince : "Draft · edited " + ui.edited;
    statusBtn.innerHTML = '<span class="st-dot ' + (live ? "is-live" : "is-draft") + '"></span><span class="st-status-long">' + long + '</span><span class="st-status-short">' + (live ? "Live" : "Draft") + "</span>" + I("chevron-down", 14);
    statusBtn.setAttribute("aria-label", long + ". Show version details");
    var rows = [];
    if (ui.hasDraft && ui.mode === "draft") rows.push(["is-draft", "This draft", "Edited " + ui.edited + ". Only people in your workspace can see it."]);
    if (ui.mode === "published") rows.push(["is-live", "This version is live", "Published " + ui.liveSince + " with " + tplOf(ui.liveTpl).name + ". Duplicate it to make changes."]);
    else rows.push(["is-live", "Live site", "Live since " + ui.liveSince + ", built with " + tplOf(ui.liveTpl).name + "."]);
    statusPop.innerHTML = rows.map(function (r) { return '<div class="sp-row"><span class="st-dot ' + r[0] + '"></span><div><b>' + r[1] + "</b><p>" + r[2] + "</p></div></div>"; }).join("") +
      '<p class="sp-url">' + I("globe", 14) + '<span class="mono">' + S.site + "</span></p>" +
      '<p class="sp-foot">One version is live at a time. Drafts never change the live site until you publish.</p>';
  }
  function renderTop() {
    studio.setAttribute("data-screen", ui.screen);
    renderStatus();
    $("#page-name").textContent = ui.page;
    pageMenu.innerHTML = '<p class="menu-label">Pages on ' + S.site + "</p>" + PAGES.map(function (p) {
      var m = PAGE_META[p], on = p === ui.page;
      return '<button type="button" class="menu-item" role="menuitemradio" aria-checked="' + on + '" data-page="' + p + '"><span class="tile tile-sm tile-' + m.tile + '">' + I(m.icon, 14) + "</span>" + p + '<span class="menu-shortcut mono">/' + m.path + "</span></button>";
    }).join("");
    if (locked()) {
      publishBtn.className = "st-publish is-live";
      publishBtn.disabled = true;
      publishBtn.innerHTML = I("circle-check", 18) + '<span class="pub-long">Published</span><span class="pub-short">Live</span>';
    } else {
      publishBtn.className = "st-publish";
      publishBtn.disabled = false;
      publishBtn.innerHTML = '<span class="pub-dot" aria-hidden="true"></span>Publish';
    }
    continueBtn.hidden = !(ui.screen === "picker" && ui.hasDraft);
    $('[data-more="duplicate"]', moreMenu).disabled = !locked();
    $('[data-more="archive"]', moreMenu).disabled = !(ui.hasDraft && ui.mode === "draft");
    $("#cv-badge").textContent = locked() ? "Live version" : "Draft preview";
  }

  /* =========================================================================
     Template picker
     ========================================================================= */
  var shotRO = new ResizeObserver(function (entries) {
    entries.forEach(function (en) { var inn = en.target.querySelector(".pk-shot-in"); if (inn) inn.style.setProperty("--k", en.contentRect.width / 1280); });
  });
  function previewState(slug) {
    if (ui.hasDraft && slug === state.tpl) return state;
    return Object.assign({}, state, { tpl: slug, theme: presetTheme(TPL_PRESET[slug]) });
  }
  function pickerCard(t) {
    var isDraft = ui.hasDraft && state.tpl === t.slug, isLive = ui.liveTpl === t.slug;
    var action;
    if (t.locked) action = '<button type="button" class="btn btn-secondary" aria-disabled="true" aria-describedby="pk-lock-' + t.slug + '">' + I("lock") + "Available on PRO+</button>";
    else if (isDraft) action = '<button type="button" class="btn btn-default" data-pk="continue">Continue editing' + I("arrow-right") + "</button>";
    else action = '<button type="button" class="btn btn-default" data-pk="create" data-tpl="' + t.slug + '">' + (ui.hasDraft ? "Use this template" : "Create draft") + "</button>";
    return '<article class="pk-card' + (t.locked ? " is-locked" : "") + (isDraft ? " is-current" : "") + '" aria-labelledby="pk-n-' + t.slug + '">' +
      '<div class="pk-shot"><div class="pk-shot-in site-host" inert aria-hidden="true">' + siteHTML(previewState(t.slug), "Home") + "</div>" +
      (t.locked ? '<span class="pk-flag pk-flag-lock">' + I("lock", 14) + "PRO+</span>" : "") +
      (isDraft ? '<span class="pk-flag"><span class="pk-dot"></span>In your draft</span>' : (isLive && !t.locked ? '<span class="pk-flag"><span class="st-dot is-live"></span>On your live site</span>' : "")) +
      "</div>" +
      '<div class="pk-body"><div class="pk-name-row"><h3 class="pk-name" id="pk-n-' + t.slug + '">' + esc(t.name) + '</h3><span class="pk-mood tile-' + TPL_TILE[t.slug] + '">' + esc(t.mood) + "</span></div>" +
      '<p class="pk-desc">' + esc(t.desc) + "</p>" +
      '<p class="pk-meta">' + t.pages + " page layouts · " + esc(t.plan) + "</p>" +
      (t.locked ? '<p class="pk-lock-note" id="pk-lock-' + t.slug + '">' + I("info", 14) + "Crestview is part of the PRO+ plan. You can preview it now.</p>" : "") +
      '<div class="pk-actions"><button type="button" class="btn btn-outline" data-pk="preview" data-tpl="' + t.slug + '">' + I("eye") + "Preview</button>" + action + "</div></div></article>";
  }
  function renderPicker() {
    pkGrid.innerHTML = TEMPLATES.map(pickerCard).join("");
    $("#pk-live-tpl").textContent = tplOf(ui.liveTpl).name;
    $("#pk-live-since").textContent = "live since " + ui.liveSince;
    shotRO.disconnect();
    $$(".pk-shot", pkGrid).forEach(function (el) { shotRO.observe(el); });
  }
  function showPicker() {
    if (pending) commit();
    setPreview(false, true);
    closePanel();
    ui.screen = "picker";
    editor.hidden = true; picker.hidden = false;
    renderTop(); renderPicker();
    picker.scrollTop = 0;
    $("#picker-title").focus({ preventScroll: true });
  }
  function showEditor(focusTab) {
    ui.screen = "editor";
    picker.hidden = true; editor.hidden = false;
    renderAll();
    requestAnimationFrame(layoutFrame);
    if (focusTab !== false) $("#tab-" + ui.tab).focus();
  }
  function createDraft(slug) {
    var t = tplOf(slug);
    if (t.locked) return;
    var fresh = !ui.hasDraft;
    if (fresh) state = freshState(slug);
    else { state.tpl = slug; Object.assign(state.theme, presetTheme(TPL_PRESET[slug])); }
    ui.hasDraft = true; ui.mode = "draft"; ui.edited = "just now"; ui.page = "Home"; ui.sel = null; ui.tab = "sections";
    if (fresh) resetHistory(); else commit();
    showEditor();
    if (fresh) SC.toast("Draft created from " + t.name, "Your live site hasn't changed.", "layout-template");
    else SC.toast("Your draft now uses " + t.name, "Your words and sections came with you. Undo brings the old look back.", "layout-template");
  }
  pkGrid.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pk]");
    if (!b) return;
    var act = b.getAttribute("data-pk");
    if (act === "preview") openTplPreview(b.getAttribute("data-tpl"));
    else if (act === "create") createDraft(b.getAttribute("data-tpl"));
    else if (act === "continue") showEditor();
  });
  continueBtn.addEventListener("click", function () { showEditor(); });

  /* ---------- Template preview dialog ---------- */
  var tplDlg = $("#tpl-dialog"), tplScroll = $("#tpl-d-scroll"), tplSizer = $("#tpl-d-sizer"), tplIn = $("#tpl-d-in"), tplGo = $("#tpl-d-go");
  function layoutTplPreview() {
    if (tplDlg.hidden) return;
    var k = tplScroll.clientWidth / 1280;
    tplIn.style.transform = "scale(" + k + ")";
    tplSizer.style.height = Math.ceil(tplIn.offsetHeight * k) + "px";
  }
  var tplRO = new ResizeObserver(layoutTplPreview);
  tplRO.observe(tplScroll); tplRO.observe(tplIn);
  function openTplPreview(slug) {
    var t = tplOf(slug), isDraft = ui.hasDraft && state.tpl === slug;
    tplDlg.setAttribute("data-slug", slug);
    $("#tpl-d-title").textContent = t.name;
    $("#tpl-d-desc").textContent = t.mood + " · " + t.desc + " · " + t.plan;
    $("#tpl-d-tile").className = "tile tile-" + TPL_TILE[slug];
    tplIn.innerHTML = siteHTML(previewState(slug), "Home");
    tplScroll.scrollTop = 0;
    if (t.locked) {
      tplGo.innerHTML = I("lock") + "Available on PRO+";
      tplGo.setAttribute("aria-disabled", "true");
      $("#tpl-d-note").textContent = "Crestview is part of the PRO+ plan. Preview it with Kingsway's own words.";
    } else {
      tplGo.removeAttribute("aria-disabled");
      tplGo.innerHTML = isDraft ? "Continue editing" + I("arrow-right") : (ui.hasDraft ? "Use " + esc(t.name) : "Create draft from " + esc(t.name));
      $("#tpl-d-note").textContent = isDraft ? "This is your current draft." : "Shown with Kingsway's own words. Nothing changes until you choose it.";
    }
    SC.open(tplDlg);
    requestAnimationFrame(layoutTplPreview);
  }
  tplGo.addEventListener("click", function () {
    if (tplGo.getAttribute("aria-disabled") === "true") return;
    var slug = tplDlg.getAttribute("data-slug");
    SC.close(tplDlg);
    if (ui.hasDraft && state.tpl === slug) showEditor(); else createDraft(slug);
  });

  /* =========================================================================
     Panel — tabs
     ========================================================================= */
  function renderTabs() {
    $$(".pn-tab", panel).forEach(function (t) {
      var on = t.getAttribute("data-tab") === ui.tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#tp-" + t.getAttribute("data-tab")).hidden = !on;
    });
  }
  function setTab(tab, focus) {
    ui.tab = tab; renderTabs(); renderPanel(); pnBody.scrollTop = 0;
    if (focus) $("#tab-" + tab).focus();
  }
  $(".pn-tabs", panel).addEventListener("click", function (e) { var t = e.target.closest(".pn-tab"); if (t) setTab(t.getAttribute("data-tab")); });
  $(".pn-tabs", panel).addEventListener("keydown", function (e) {
    var order = ["sections", "style", "pages", "seo"], i = order.indexOf(ui.tab), n = null;
    if (e.key === "ArrowRight") n = (i + 1) % 4; else if (e.key === "ArrowLeft") n = (i + 3) % 4; else if (e.key === "Home") n = 0; else if (e.key === "End") n = 3;
    if (n === null) return;
    e.preventDefault(); setTab(order[n], true);
  });

  function renderPanel(focusKey) {
    var ae = document.activeElement;
    var fk = focusKey || (ae && panel.contains(ae) && ae.getAttribute("data-fk"));
    var top = pnBody.scrollTop;
    pnLock.hidden = !locked();
    var pane = $("#tp-" + ui.tab);
    $$(".pn-pane", panel).forEach(function (p) { if (p !== pane) p.innerHTML = ""; });
    pane.innerHTML = ui.tab === "sections" ? sectionsPane() : ui.tab === "style" ? stylePane() : ui.tab === "pages" ? pagesPane() : seoPane();
    pnBody.scrollTop = top;
    if (ui.tab === "seo") updateSeo();
    if (fk) {
      var el = panel.querySelector('[data-fk="' + fk + '"]');
      if (el && el.disabled) el = el.closest(".sec-card") && el.closest(".sec-card").querySelector(".sec-main");
      if (el) el.focus({ preventScroll: true });
    }
  }

  /* ---------- Sections pane ---------- */
  function secSummary(s) {
    if (!s.visible) return "Hidden from the page";
    var f = s.f;
    switch (s.key) {
      case "hero": return f.title || "Title, text and button";
      case "features": return f.items.length + " cards";
      case "stats": return f.items.length + " numbers";
      case "staff": return f.count + " teachers from your classes";
      case "admission": return f.links.filter(Boolean).length + " links";
      case "announcements": return "Latest " + f.count + " announcements";
      case "story": return "Text, image and motto";
      case "process": return STEPS.length + " steps";
      case "contact": return "Address, phone and email";
      case "collection": return "Latest " + f.count + " " + COLL[ui.page].label.toLowerCase();
    }
    return "";
  }
  function sectionsPane() {
    var list = state.pages[ui.page], shown = list.filter(function (s) { return s.visible; }).length;
    return '<div class="pn-intro"><h2 class="pn-h">' + esc(ui.page) + ' page</h2><p>' + list.length + " sections · " + shown + " shown. Click any part of the page to edit it, or drag to reorder.</p></div>" +
      '<ul class="sec-list" id="sec-list" aria-label="Sections on the ' + esc(ui.page) + ' page">' + chromeCard("header") +
      list.map(function (s, i) { return secCard(s, i, list.length); }).join("") + chromeCard("footer") + "</ul>";
  }
  function chromeCard(id) {
    var isH = id === "header", open = ui.sel === id, label = isH ? "Site header" : "Footer";
    return '<li class="sec-card is-chrome' + (open ? " is-open" : "") + '" data-id="' + id + '"><div class="sec-row">' +
      '<span class="sec-pin" aria-hidden="true">' + I("pin", 14) + "</span>" +
      '<button type="button" class="sec-main" data-act="select" data-id="' + id + '" data-fk="sel-' + id + '" aria-expanded="' + open + '">' +
      '<span class="tile tile-slate">' + I(isH ? "panel-left" : "rows-3", 16) + '</span><span class="sec-txt"><span class="sec-name">' + label + '</span><span class="sec-sub">On every page</span></span></button></div>' +
      (open ? '<div class="sec-body">' + (isH ? headerInspector() : footerInspector()) + "</div>" : "") + "</li>";
  }
  function secCard(s, i, n) {
    var m = SEC_META[s.key] || SEC_META.hero, open = ui.sel === s.id, L = locked();
    var right = s.required
      ? '<span class="sec-req" title="Required sections are always shown">' + I("lock", 12) + "Required</span>"
      : '<input type="checkbox" class="switch" role="switch" data-act="toggle" data-id="' + s.id + '" data-fk="tog-' + s.id + '" aria-label="Show ' + esc(s.label) + ' on the page"' + (s.visible ? " checked" : "") + (L ? " disabled" : "") + ">";
    return '<li class="sec-card' + (open ? " is-open" : "") + (s.visible ? "" : " is-hidden") + '" data-id="' + s.id + '"><div class="sec-row">' +
      '<button type="button" class="sec-grip" data-fk="grip-' + s.id + '" aria-label="Reorder ' + esc(s.label) + ", position " + (i + 1) + " of " + n + '. Use the up and down arrow keys."' + (L ? " disabled" : "") + ">" + I("grip-vertical", 16) + "</button>" +
      '<button type="button" class="sec-main" data-act="select" data-id="' + s.id + '" data-fk="sel-' + s.id + '" aria-expanded="' + open + '">' +
      '<span class="tile tile-' + m.tile + '">' + I(m.icon, 16) + '</span><span class="sec-txt"><span class="sec-name">' + esc(s.label) + '</span><span class="sec-sub">' + esc(secSummary(s)) + "</span></span></button>" +
      right + "</div>" +
      (open ? '<div class="sec-body">' + inspector(s) + secTools(s, i, n) + "</div>" : "") + "</li>";
  }
  function secTools(s, i, n) {
    var d = locked() ? " disabled" : "";
    return '<div class="sec-tools" role="group" aria-label="' + esc(s.label) + ' actions">' +
      '<button type="button" class="btn btn-outline btn-sm" data-act="up" data-id="' + s.id + '" data-fk="up-' + s.id + '"' + (i === 0 || d ? " disabled" : "") + ">" + I("arrow-up", 14) + "Move up</button>" +
      '<button type="button" class="btn btn-outline btn-sm" data-act="down" data-id="' + s.id + '" data-fk="down-' + s.id + '"' + (i === n - 1 || d ? " disabled" : "") + ">" + I("arrow-down", 14) + "Move down</button>" +
      '<button type="button" class="btn btn-outline btn-sm" data-act="dup" data-id="' + s.id + '" data-fk="dup-' + s.id + '"' + d + ">" + I("copy", 14) + "Duplicate</button>" +
      (s.copy ? '<button type="button" class="btn btn-ghost btn-sm sec-remove" data-act="remove" data-id="' + s.id + '"' + d + ">" + I("trash-2", 14) + "Remove</button>" : "") + "</div>";
  }
  function fld(s, key, label, type, o) {
    o = o || {};
    var id = "f-" + s.id + "-" + key, v = s.f[key] == null ? "" : s.f[key], dis = locked() ? " disabled" : "";
    var common = 'id="' + id + '" data-bind="f" data-sec="' + s.id + '" data-key="' + key + '" data-fk="' + id + '"' + dis;
    var control;
    if (type === "textarea") control = '<textarea class="textarea" rows="' + (o.rows || 3) + '" ' + common + ">" + esc(v) + "</textarea>";
    else if (type === "select") control = '<select class="select" ' + common + ">" + o.options.map(function (op) { return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? " selected" : "") + ">" + esc(op[1]) + "</option>"; }).join("") + "</select>";
    else control = '<input class="input" type="text" value="' + esc(v) + '" ' + common + (o.auto ? ' autocomplete="' + o.auto + '"' : ' autocomplete="off"') + ">";
    return '<div class="field"><label class="label" for="' + id + '">' + label + (o.optional ? ' <span class="field-optional">Optional</span>' : "") + "</label>" + control + (o.help ? '<p class="field-description">' + o.help + "</p>" : "") + "</div>";
  }
  function itemsEditor(s, key, props, o) {
    var arr = s.f[key] || [], dis = locked() ? " disabled" : "";
    return '<div class="field"><span class="label">' + o.title + '</span><ol class="items">' + arr.map(function (it, i) {
      var inputs = (props || [null]).map(function (p) {
        var id = "i-" + s.id + "-" + key + "-" + i + (p ? "-" + p[0] : ""), val = p ? it[p[0]] : it, lab = o.noun + " " + (i + 1) + (p ? " " + p[1].toLowerCase() : "");
        return '<label class="sr-only" for="' + id + '">' + lab + '</label><input class="input" id="' + id + '" type="text" autocomplete="off" placeholder="' + (p ? p[1] : o.noun) + '" value="' + esc(val) + '" data-bind="item" data-sec="' + s.id + '" data-key="' + key + '" data-idx="' + i + '"' + (p ? ' data-prop="' + p[0] + '"' : "") + ' data-fk="' + id + '"' + dis + ">";
      }).join("");
      return '<li class="item-card' + (o.row ? " is-row" : "") + '"><span class="item-n tnum" aria-hidden="true">' + (i + 1) + '</span><div class="item-fields">' + inputs + "</div>" +
        (arr.length > (o.min || 1) ? '<button type="button" class="btn btn-ghost btn-icon btn-sm item-del" data-act="item-del" data-id="' + s.id + '" data-key="' + key + '" data-idx="' + i + '" aria-label="Remove ' + o.noun.toLowerCase() + " " + (i + 1) + '"' + dis + ">" + I("x", 14) + "</button>" : "") + "</li>";
    }).join("") + "</ol>" +
      (arr.length < o.max ? '<button type="button" class="btn btn-outline btn-sm item-add" data-act="item-add" data-id="' + s.id + '" data-key="' + key + '" data-fk="add-' + s.id + "-" + key + '"' + dis + ">" + I("plus", 14) + o.add + "</button>" : "") + "</div>";
  }
  function imagePicker(s) {
    return '<div class="field"><span class="label">Image</span><div class="img-pick"><span class="img-pick-ph">' + I("image", 18) + '</span><span class="img-pick-txt"><b>' + esc(s.f.image) + "</b><small>Placeholder until a photo is added</small></span>" +
      '<button type="button" class="btn btn-outline btn-sm" data-act="media" data-id="' + s.id + '" data-fk="media-' + s.id + '"' + (locked() ? " disabled" : "") + ">Change</button></div></div>";
  }
  function inspector(s) {
    switch (s.key) {
      case "hero":
        return fld(s, "kicker", "Kicker", "text", { optional: true, help: "A short line above the title." }) +
          fld(s, "title", "Title", "textarea", { rows: 2 }) + fld(s, "body", "Body", "textarea", { rows: 4 }) +
          '<div class="field-pair">' + fld(s, "cta", "Button label") + fld(s, "to", "Button opens", "select", { options: ["Admissions", "Contact", "About", "Events"].map(function (p) { return [p, p + " page"]; }) }) + "</div>" +
          fld(s, "link", "Second link", "text", { optional: true }) + imagePicker(s);
      case "features":
        return fld(s, "heading", "Heading") + itemsEditor(s, "items", [["title", "Title"], ["text", "Description"]], { title: "Cards", noun: "Card", add: "Add card", max: 6 });
      case "stats":
        return fld(s, "heading", "Heading") + itemsEditor(s, "items", [["value", "Number"], ["label", "Label"]], { title: "Numbers", noun: "Number", add: "Add number", max: 4, row: true });
      case "staff":
        return fld(s, "heading", "Heading") + fld(s, "count", "Teachers to show", "select", { options: [["3", "3 teachers"], ["4", "4 teachers"], ["6", "6 teachers"]], help: "Names and classes come from your classroom list." });
      case "admission":
        return fld(s, "heading", "Heading") + fld(s, "body", "Text", "textarea", { rows: 3 }) + itemsEditor(s, "links", null, { title: "Links", noun: "Link", add: "Add link", max: 5 });
      case "announcements":
        return fld(s, "heading", "Heading") + fld(s, "count", "Show", "select", { options: [["3", "Latest 3"], ["6", "All 6"]], help: "From the Announcements collection (6 posts)." });
      case "story":
        return fld(s, "heading", "Heading") + fld(s, "body", "Story", "textarea", { rows: 6 }) + fld(s, "quote", "Motto", "text", { optional: true });
      case "process":
        return fld(s, "heading", "Heading") + fld(s, "intro", "Introduction", "textarea", { rows: 2 }) + '<p class="sec-note">' + I("list-checks", 14) + "Enquire → Visit → Assessment → Offer and enrol</p>";
      case "contact":
        return fld(s, "heading", "Heading") + fld(s, "address", "Address") + '<div class="field-pair">' + fld(s, "phone", "Phone") + fld(s, "email", "Email") + "</div>" + fld(s, "hours", "Office hours") +
          '<p class="sec-note">' + I("info", 14) + "These details also appear in the footer.</p>";
      case "collection":
        var c = COLL[ui.page], opts = [2, 3, 4, 6, 9].filter(function (x) { return x < c.items.length; }).map(function (x) { return [String(x), "Latest " + x]; });
        opts.push([String(c.items.length), "All " + c.items.length]);
        return fld(s, "heading", "Heading") + fld(s, "count", "Show", "select", { options: opts, help: "From the " + c.label + " collection." });
    }
    return "";
  }
  function headerInspector() {
    return '<p class="sec-note">' + I("info", 14) + "Your crest, school name and the site menu. The menu lists every page.</p>" + menuField("hdr") +
      '<button type="button" class="btn btn-outline btn-sm" data-act="goto-style" data-fk="goto-style">' + I("palette", 14) + "Colours and fonts</button>";
  }
  function footerInspector() {
    var dis = locked() ? " disabled" : "";
    return '<div class="field"><label class="label" for="f-footer-note">Footer line</label><input class="input" type="text" id="f-footer-note" autocomplete="off" data-bind="footer" data-key="note" data-fk="f-footer-note" value="' + esc(state.footer.note) + '"' + dis + "></div>" +
      '<p class="sec-note">' + I("info", 14) + "Address, phone and email come from the Contact page.</p>";
  }

  /* ---------- Style pane ---------- */
  function radioCards(name, key, entries, cls, render) {
    var cur = state.theme[key], dis = locked() ? " disabled" : "";
    return entries.map(function (k) {
      return '<label class="' + cls + '"><input type="radio" name="' + name + '" value="' + k + '" data-bind="theme" data-key="' + key + '" data-fk="' + name + "-" + k + '"' + (cur === k ? " checked" : "") + dis + ">" + render(k) + "</label>";
    }).join("");
  }
  function menuField(prefix, asGroup) {
    var head = asGroup ? '<h3 id="' + prefix + '-menu-l">Menu style</h3>' : '<span class="label" id="' + prefix + '-menu-l">Menu style</span>';
    return '<div class="field">' + head + '<div class="opt-grid opt-grid-3" role="radiogroup" aria-labelledby="' + prefix + '-menu-l">' +
      radioCards(prefix + "-menu", "menu", Object.keys(MENUS), "opt opt-menu", function (k) {
        return '<span class="menu-mini is-' + k + '" aria-hidden="true"><i></i><i></i><i></i></span><span class="opt-name">' + MENUS[k][0] + "</span>";
      }) + "</div></div>";
  }
  function colorRow(key) {
    var r = COLOR_ROWS[key], cur = state.theme[key], dis = locked() ? " disabled" : "";
    var list = [];
    [PRESETS[state.theme.preset] && PRESETS[state.theme.preset][key]].concat(r.list).forEach(function (c) { if (c && list.indexOf(c) < 0) list.push(c); });
    var warn = key === "primary" && Math.max(contrast(cur, "#ffffff"), contrast(cur, "#111827")) < 4.5;
    return '<fieldset class="field color-field"><legend class="label">' + r.label + ' <span class="field-optional">' + r.hint + "</span></legend>" +
      '<div class="swatches">' + list.map(function (c) {
        var nm = SWATCH_NAMES[c] || c;
        return '<button type="button" class="swatch" style="--sw:' + c + '" data-act="color" data-key="' + key + '" data-val="' + c + '" data-fk="sw-' + key + "-" + c.slice(1) + '" aria-pressed="' + (c === cur) + '" aria-label="' + nm + " " + c + '" title="' + nm + '"' + dis + "></button>";
      }).join("") + "</div>" +
      '<div class="input-group hex-group"><span class="input-addon"><span class="hex-dot" id="hex-dot-' + key + '" style="--sw:' + cur + '"></span></span>' +
      '<input class="input mono" type="text" id="hex-' + key + '" value="' + cur + '" maxlength="7" spellcheck="false" autocomplete="off" data-bind="hex" data-key="' + key + '" data-fk="hex-' + key + '" aria-label="' + r.label + ' hex code" aria-describedby="hex-err-' + key + '"' + dis + "></div>" +
      '<p class="field-error" id="hex-err-' + key + '" hidden>Use a six-digit hex code, like #1d4ed8.</p>' +
      (warn ? '<p class="field-description hex-warn">' + I("triangle-alert", 14) + "Text on this colour may be hard to read. Try a deeper shade.</p>" : "") + "</fieldset>";
  }
  function presetCard(id) {
    var p = PRESETS[id], on = state.theme.preset === id, f = FONTS[p.font], b = BASES[p.base];
    var vars = "--pm-bg:" + b.bg + ";--pm-ink:" + b.ink + ";--pm-p:" + p.primary + ";--pm-s:" + p.secondary + ";--pm-a:" + p.accent + ";--pm-f:" + f.stack + ";--pm-w:" + f.w + ";--pm-r:" + Math.min(RADII[p.radius][1], 10) + "px";
    return '<button type="button" class="preset" data-act="preset" data-val="' + id + '" data-fk="preset-' + id + '" aria-pressed="' + on + '"' + (locked() ? " disabled" : "") + ">" +
      '<span class="preset-mini" style="' + esc(vars) + '" aria-hidden="true"><span class="pm-bar"></span><span class="pm-body"><b>Aa</b><span class="pm-btn"></span><span class="pm-dot"></span></span></span>' +
      '<span class="preset-name">' + p.name + '</span><span class="preset-blurb">' + p.blurb + "</span></button>";
  }
  function stylePane() {
    var t = state.theme, tpl = tplOf(state.tpl), dis = locked() ? " disabled" : "";
    return '<div class="pn-intro"><h2 class="pn-h">Make it yours</h2><p>Style changes apply to every page of the site.</p></div>' +
      '<div class="tpl-chip"><span class="tpl-chip-mini tile-' + TPL_TILE[tpl.slug] + '">' + I("layout-template", 18) + '</span><span class="tpl-chip-txt"><small>Layout template</small><b>' + esc(tpl.name) + " · " + esc(tpl.mood) + "</b></span>" +
      '<button type="button" class="btn btn-outline btn-sm" data-act="change-template" data-fk="change-template">Change template</button></div>' +
      '<section class="st-group"><div class="st-group-head"><h3>Style preset</h3>' + (customised(t) ? '<span class="badge badge-warning badge-dot">Customised</span>' : "") + "</div>" +
      '<div class="preset-grid">' + PRESET_ORDER.map(presetCard).join("") + "</div>" +
      '<div class="minor"><span class="minor-label">More presets <small>shape, spacing and type only</small></span><div class="minor-row">' +
      Object.keys(MINOR).map(function (k) { return '<button type="button" class="minor-pill" data-act="minor" data-val="' + k + '" data-fk="minor-' + k + '" aria-pressed="' + (t.preset === k) + '"' + dis + ">" + MINOR[k].name + "</button>"; }).join("") + "</div></div></section>" +
      '<section class="st-group"><h3>Colours</h3>' +
      '<div class="field"><span class="label" id="base-l">Base colour <span class="field-optional">Backgrounds and text</span></span><div class="base-row" role="radiogroup" aria-labelledby="base-l">' +
      radioCards("base", "base", Object.keys(BASES), "base-chip", function (k) { return '<span class="base-dot" style="--b1:' + BASES[k].alt + ";--b2:" + BASES[k].ink + '" aria-hidden="true"></span>' + BASES[k].label; }) + "</div></div>" +
      colorRow("primary") + colorRow("secondary") + colorRow("accent") + "</section>" +
      '<section class="st-group"><h3>Shape and spacing</h3>' +
      '<div class="field"><span class="label" id="rad-l">Corner radius</span><div class="seg" role="radiogroup" aria-labelledby="rad-l">' +
      radioCards("radius", "radius", Object.keys(RADII), "seg-opt", function (k) { return '<span title="' + k + '">' + RADIUS_LABEL[k] + "</span>"; }) + "</div></div>" +
      '<div class="field"><span class="label" id="den-l">Density</span><div class="seg" role="radiogroup" aria-labelledby="den-l">' +
      radioCards("density", "density", Object.keys(DENSITY), "seg-opt", function (k) { return "<span>" + DENSITY_LABEL[k] + "</span>"; }) + "</div></div></section>" +
      '<section class="st-group"><h3 id="font-l">Heading font</h3><div class="opt-grid" role="radiogroup" aria-labelledby="font-l">' +
      radioCards("font", "font", Object.keys(FONTS), "opt opt-font", function (k) { return '<span class="font-sample" style="font-family:' + esc(FONTS[k].stack) + ";font-weight:" + FONTS[k].w + '" aria-hidden="true">Aa</span><span class="opt-name">' + FONTS[k].label + "</span>"; }) + "</div></section>" +
      '<section class="st-group">' + menuField("st", true) + "</section>";
  }

  /* ---------- Pages pane ---------- */
  function pagesPane() {
    return '<div class="pn-intro"><h2 class="pn-h">Pages</h2><p>' + PAGES.length + " pages in the site menu. Choose one to edit it.</p></div>" +
      '<ul class="page-list">' + PAGES.map(function (p) {
        var m = PAGE_META[p], on = p === ui.page, n = state.pages[p].filter(function (s) { return s.visible; }).length;
        return '<li><button type="button" class="page-row' + (on ? " is-current" : "") + '" data-act="page" data-val="' + p + '" data-fk="page-' + p + '"' + (on ? ' aria-current="page"' : "") + ">" +
          '<span class="tile tile-' + m.tile + '">' + I(m.icon, 16) + '</span><span class="page-txt"><b>' + p + '</b><small class="mono">/' + m.path + "</small></span>" +
          (p === "Home" ? '<span class="badge badge-neutral">Homepage</span>' : "") + '<span class="page-count tnum">' + n + " sections</span></button></li>";
      }).join("") + "</ul>" +
      '<div class="pn-sub"><h3 id="cms-h" tabindex="-1">Collections</h3><p>Posts and files that fill the Blog, Events and Resources pages.</p></div>' +
      '<ul class="cms-grid">' + W.cms.map(function (c) {
        var m = CMS_META[c.name] || ["files", "slate"];
        return '<li class="cms-card"><span class="tile tile-' + m[1] + '">' + I(m[0], 16) + '</span><b class="cms-n tnum">' + c.count + "</b><span>" + c.name + "</span></li>";
      }).join("") + "</ul>" +
      '<div class="pn-row"><button type="button" class="btn btn-outline btn-sm" data-act="manage-cms" data-fk="manage-cms">' + I("library", 14) + "Manage collections</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="media" data-fk="media-lib">' + I("images", 14) + "Media library</button></div>";
  }

  /* ---------- SEO pane ---------- */
  function seoPane() {
    var seo = state.seo[ui.page], dis = locked() ? " disabled" : "", path = PAGE_META[ui.page].path;
    return '<div class="pn-intro"><h2 class="pn-h">Help families find you</h2><p>How the <b>' + esc(ui.page) + "</b> page appears in search results and when it's shared.</p></div>" +
      '<div class="serp" id="serp" aria-label="Search result preview" role="group"></div>' +
      '<div class="field"><div class="label-row"><label class="label" for="seo-title">Page title</label><span class="count" id="cnt-title"></span></div>' +
      '<input class="input" type="text" id="seo-title" autocomplete="off" data-bind="seo" data-key="title" data-fk="seo-title" value="' + esc(seo.title) + '" aria-describedby="hint-title"' + dis + '><p class="field-description" id="hint-title"></p></div>' +
      '<div class="field"><div class="label-row"><label class="label" for="seo-desc">Description</label><span class="count" id="cnt-desc"></span></div>' +
      '<textarea class="textarea" id="seo-desc" rows="4" data-bind="seo" data-key="desc" data-fk="seo-desc" aria-describedby="hint-desc"' + dis + ">" + esc(seo.desc) + '</textarea><p class="field-description" id="hint-desc"></p></div>' +
      '<div class="field"><span class="label">Page address</span><div class="url-chip">' + I("link", 14) + '<span class="mono">' + S.site + (path ? "/" + path : "") + "</span></div></div>" +
      '<label class="choice seo-index"><input type="checkbox" class="switch" role="switch" data-bind="seo-index" data-fk="seo-index"' + (seo.index ? " checked" : "") + dis + '><span><b>Show this page in search results</b><small>Turn this off for pages only families with the link should find.</small></span></label>';
  }
  function ring(ratio, tone) {
    var p = Math.max(0, Math.min(1, ratio)) * 100;
    return '<svg class="count-ring is-' + tone + '" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" pathLength="100"/><circle class="bar" cx="10" cy="10" r="8" pathLength="100" stroke-dasharray="100" stroke-dashoffset="' + (100 - p).toFixed(1) + '"/></svg>';
  }
  function trunc(s, n) { s = String(s || "").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + " …" : s; }
  function updateSeo() {
    var seo = state.seo[ui.page], serp = $("#serp");
    if (!serp) return;
    var tl = seo.title.length, dl = seo.desc.length;
    var tTone = tl > 60 ? "warn" : tl < 15 ? "short" : "ok", dTone = dl > 160 ? "warn" : dl < 50 ? "short" : "ok";
    $("#cnt-title").innerHTML = ring(tl / 60, tTone) + '<span class="tnum">' + tl + " / 60</span>";
    $("#cnt-desc").innerHTML = ring(dl / 160, dTone) + '<span class="tnum">' + dl + " / 160</span>";
    $("#cnt-title").className = "count is-" + tTone; $("#cnt-desc").className = "count is-" + dTone;
    $("#hint-title").textContent = tTone === "warn" ? "Long titles are cut off after about 60 characters." : tTone === "short" ? "Add a few words about the school or the page." : "Fits in most search results.";
    $("#hint-desc").textContent = dTone === "warn" ? "Search results may cut this off after about 160 characters." : dTone === "short" ? "A little short — say what families will find on this page." : "Good length. Aim for 120–160 characters.";
    var path = PAGE_META[ui.page].path;
    serp.innerHTML = '<p class="serp-eyebrow">' + I("search", 12) + "Search result preview</p>" +
      '<div class="serp-site"><span class="serp-fav" style="--fav:' + state.theme.primary + ";--fav-ink:" + inkOn(state.theme.primary) + '">KA</span><span><b>Kingsway Academy</b><small>' + S.site + (path ? " › " + path : "") + "</small></span></div>" +
      '<p class="serp-title">' + esc(trunc(seo.title || "Untitled page", 62)) + "</p>" +
      '<p class="serp-desc">' + esc(trunc(seo.desc || "Search engines will choose text from the page.", 162)) + "</p>" +
      (seo.index ? "" : '<p class="serp-off">' + I("eye-off", 14) + "Hidden from search results</p>");
    serp.classList.toggle("is-off", !seo.index);
  }

  /* =========================================================================
     Panel — interactions
     ========================================================================= */
  function select(id, opts) {
    opts = opts || {};
    ui.sel = id;
    if (id && opts.from === "canvas") { if (ui.tab !== "sections") { ui.tab = "sections"; renderTabs(); } if (isNarrow()) openPanel(); }
    renderPanel(opts.fk || null);
    paintSelection();
    if (!id) return;
    var card = panel.querySelector('.sec-card[data-id="' + id + '"]');
    if (card) card.scrollIntoView({ block: "nearest", behavior: smooth() });
    if (opts.field) {
      var inp = panel.querySelector('[data-sec="' + id + '"][data-key="' + opts.field + '"]') || (id === "footer" && $("#f-footer-note"));
      if (inp) inp.focus();
    }
    if (opts.from === "panel") {
      var b = vp.querySelector('.s-block[data-sec="' + id + '"]');
      if (b) b.scrollIntoView({ block: "nearest", behavior: smooth() });
    }
  }
  function paintSelection() {
    $$(".s-block[data-sec]", vp).forEach(function (b) {
      var on = b.getAttribute("data-sec") === ui.sel;
      b.classList.toggle("is-sel", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  function afterEdit(soft) { renderCanvas(); if (soft) commitSoon(); else commit(); }
  function move(id, dir) {
    if (locked()) return;
    var list = state.pages[ui.page], i = list.findIndex(function (s) { return s.id === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    var s = list.splice(i, 1)[0]; list.splice(j, 0, s);
    commit(); renderPanel(); renderCanvas();
    announce(s.label + " moved to position " + (j + 1) + " of " + list.length);
  }
  function duplicate(id) {
    if (locked()) return;
    var list = state.pages[ui.page], i = list.findIndex(function (s) { return s.id === id; });
    if (i < 0) return;
    var c = clone(list[i]);
    c.id = "s" + (++state.seq); c.label = list[i].label.replace(/ \(copy\)$/, "") + " (copy)"; c.required = false; c.copy = true; c.visible = true;
    list.splice(i + 1, 0, c);
    ui.sel = c.id; commit(); renderPanel("sel-" + c.id); renderCanvas();
    announce(c.label + " added below the original");
  }
  function removeSec(id) {
    if (locked()) return;
    var list = state.pages[ui.page], i = list.findIndex(function (s) { return s.id === id; });
    if (i < 0 || !list[i].copy) return;
    var s = list.splice(i, 1)[0];
    var prev = list[Math.max(0, i - 1)];
    ui.sel = null; commit(); renderPanel(prev ? "sel-" + prev.id : null); renderCanvas();
    announce(s.label + " removed. Undo brings it back.");
  }
  function applyPreset(id) {
    if (locked()) return;
    Object.assign(state.theme, presetTheme(id));
    commit(); renderPanel(); renderCanvas();
    announce(PRESETS[id].name + " applied");
  }
  function applyMinor(id) {
    if (locked()) return;
    var m = MINOR[id];
    Object.assign(state.theme, { preset: id, radius: m.radius, density: m.density, font: m.font });
    commit(); renderPanel(); renderCanvas();
    announce(m.name + " applied");
  }
  function setColor(key, val) {
    if (locked()) return;
    state.theme[key] = val;
    commit(); renderPanel(); renderCanvas();
  }
  function setPage(p, keepFocus) {
    if (!PAGE_META[p]) return;
    if (pending) commit();
    ui.page = p; ui.sel = null;
    renderTop(); renderPanel(keepFocus ? "page-" + p : null); renderCanvas();
    canvas.scrollTop = 0;
    $("#pv-page").textContent = p;
    announce("Showing the " + p + " page");
  }

  panel.addEventListener("click", function (e) {
    var a = e.target.closest("[data-act]");
    if (!a || a.disabled) return;
    var act = a.getAttribute("data-act"), id = a.getAttribute("data-id"), val = a.getAttribute("data-val");
    if (act === "toggle") return; // handled on change
    switch (act) {
      case "select": select(id === ui.sel ? null : id, { from: "panel", fk: "sel-" + id }); break;
      case "up": move(id, -1); break;
      case "down": move(id, 1); break;
      case "dup": duplicate(id); break;
      case "remove": removeSec(id); break;
      case "item-add": itemAdd(id, a.getAttribute("data-key")); break;
      case "item-del": itemDel(id, a.getAttribute("data-key"), +a.getAttribute("data-idx")); break;
      case "preset": applyPreset(val); break;
      case "minor": applyMinor(val); break;
      case "color": setColor(a.getAttribute("data-key"), val); break;
      case "change-template": showPicker(); break;
      case "page": setPage(val, true); break;
      case "media": openMedia(id); break;
      case "goto-style": setTab("style", true); break;
      case "manage-cms": SC.toast("Collections live in Settings › Website", "Managing posts isn't part of this preview.", "library"); break;
      case "duplicate-live": duplicateToEdit(); break;
      case "close-panel": closePanel(true); break;
    }
  });
  function itemAdd(id, key) {
    var s = secById(id); if (!s || locked()) return;
    var arr = s.f[key];
    if (key === "links") arr.push("New link");
    else if (s.key === "stats") arr.push({ value: "0", label: "Label" });
    else arr.push({ title: "New card", text: "" });
    commit(); renderPanel("i-" + id + "-" + key + "-" + (arr.length - 1) + (key === "links" ? "" : (s.key === "stats" ? "-value" : "-title"))); renderCanvas();
    var f = document.activeElement; if (f && f.select) f.select();
  }
  function itemDel(id, key, idx) {
    var s = secById(id); if (!s || locked()) return;
    s.f[key].splice(idx, 1);
    commit(); renderPanel("add-" + id + "-" + key); renderCanvas();
    announce("Removed. Undo brings it back.");
  }
  function isTextInput(el) { return el.matches('input[type="text"], textarea'); }
  panel.addEventListener("input", function (e) {
    var el = e.target, b = el.getAttribute("data-bind");
    if (!b || !isTextInput(el) || locked()) return;
    var key = el.getAttribute("data-key");
    if (b === "f") { var s = secById(el.getAttribute("data-sec")); if (!s) return; s.f[key] = el.value; afterEdit(true); }
    else if (b === "item") {
      var s2 = secById(el.getAttribute("data-sec")), idx = +el.getAttribute("data-idx"), prop = el.getAttribute("data-prop");
      if (!s2) return;
      if (prop) s2.f[key][idx][prop] = el.value; else s2.f[key][idx] = el.value;
      afterEdit(true);
    }
    else if (b === "footer") { state.footer.note = el.value; afterEdit(true); }
    else if (b === "seo") { state.seo[ui.page][key] = el.value; updateSeo(); commitSoon(); }
    else if (b === "hex") {
      var v = normHex(el.value), err = $("#hex-err-" + key);
      if (v) {
        el.removeAttribute("aria-invalid"); err.hidden = true;
        state.theme[key] = v;
        $("#hex-dot-" + key).style.setProperty("--sw", v);
        $$('.swatch[data-key="' + key + '"]', panel).forEach(function (sw) { sw.setAttribute("aria-pressed", String(sw.getAttribute("data-val") === v)); });
        renderCanvas(); commitSoon();
      } else if (el.value.replace("#", "").length >= 6) { el.setAttribute("aria-invalid", "true"); err.hidden = false; }
    }
  });
  panel.addEventListener("change", function (e) {
    var el = e.target, b = el.getAttribute("data-bind"), act = el.getAttribute("data-act");
    if (locked()) return;
    if (act === "toggle") {
      var s = secById(el.getAttribute("data-id")); if (!s) return;
      s.visible = el.checked;
      commit(); renderPanel(); renderCanvas();
      announce(s.label + (s.visible ? " shown" : " hidden"));
      return;
    }
    if (!b) return;
    if (isTextInput(el)) {
      if (b === "hex") {
        var v = normHex(el.value);
        if (!v) { el.setAttribute("aria-invalid", "true"); $("#hex-err-" + el.getAttribute("data-key")).hidden = false; return; }
        el.value = v; commit(); renderPanel(); return;
      }
      commit();
      if (b === "f" || b === "item") { var card = el.closest(".sec-card"), sub = card && $(".sec-sub", card), sec = secById(el.getAttribute("data-sec")); if (sub && sec) sub.textContent = secSummary(sec); }
      return;
    }
    if (b === "f") { var s3 = secById(el.getAttribute("data-sec")); if (!s3) return; s3.f[el.getAttribute("data-key")] = el.value; afterEdit(false); renderPanel(); }
    else if (b === "theme") { state.theme[el.getAttribute("data-key")] = el.value; afterEdit(false); renderPanel(); }
    else if (b === "seo-index") { state.seo[ui.page].index = el.checked; commit(); updateSeo(); }
  });
  panel.addEventListener("focusout", function (e) { if (e.target.getAttribute && e.target.getAttribute("data-bind") && pending) commit(); });

  /* ---------- Drag to reorder (pointer) + keyboard on the grip ---------- */
  var drag = null;
  panel.addEventListener("pointerdown", function (e) {
    var g = e.target.closest(".sec-grip");
    if (!g || g.disabled || e.button !== 0) return;
    var card = g.closest(".sec-card");
    e.preventDefault();
    drag = { card: card, list: card.parentNode, id: card.getAttribute("data-id"), moved: false, y: e.clientY };
    try { g.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    card.classList.add("is-dragging");
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    if (e.pointerType === "mouse" && e.buttons === 0) { endDrag(); return; }
    if (!drag.moved && Math.abs(e.clientY - drag.y) < 4) return;
    drag.moved = true;
    var pb = pnBody.getBoundingClientRect();
    if (e.clientY < pb.top + 48) pnBody.scrollTop -= 10; else if (e.clientY > pb.bottom - 48) pnBody.scrollTop += 10;
    var cards = $$(".sec-card:not(.is-chrome)", drag.list).filter(function (c) { return c !== drag.card; });
    var before = null;
    for (var i = 0; i < cards.length; i++) { var r = cards[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = cards[i]; break; } }
    var target = before || drag.list.querySelector('.sec-card[data-id="footer"]');
    if (target && drag.card.nextElementSibling !== target) drag.list.insertBefore(drag.card, target);
  });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    d.card.classList.remove("is-dragging");
    if (!d.moved) return;
    var order = $$(".sec-card:not(.is-chrome)", d.list).map(function (c) { return c.getAttribute("data-id"); });
    var list = state.pages[ui.page], before = list.map(function (s) { return s.id; }).join();
    if (before === order.join()) return;
    state.pages[ui.page] = order.map(function (id) { return list.find(function (s) { return s.id === id; }); });
    var pos = order.indexOf(d.id), s = secById(d.id);
    commit(); renderPanel(); renderCanvas();
    announce(s.label + " moved to position " + (pos + 1) + " of " + order.length);
  }
  // Window-level: moving the card in the DOM releases pointer capture, so the release may land anywhere.
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  panel.addEventListener("keydown", function (e) {
    var g = e.target.closest(".sec-grip");
    if (g && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); move(g.closest(".sec-card").getAttribute("data-id"), e.key === "ArrowUp" ? -1 : 1); }
  });

  /* =========================================================================
     Canvas
     ========================================================================= */
  function fitScale() {
    var cs = getComputedStyle(canvas), avail = canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(0.2, Math.min(1, avail / DEVICE_W[ui.device]));
  }
  function curScale() { return ui.zoom === "fit" ? fitScale() : ui.zoom; }
  function layoutFrame() {
    if (ui.screen !== "editor" || editor.hidden) return;
    var w = DEVICE_W[ui.device], k = curScale(), pct = Math.round(k * 100);
    vp.style.width = w + "px";
    vp.style.transform = "scale(" + k + ")";
    vp.style.setProperty("--k", k);
    frame.style.width = Math.round(w * k) + "px";
    frame.setAttribute("data-device", ui.device);
    sizer.style.height = Math.ceil(vp.offsetHeight * k) + "px";
    zoomVal.textContent = pct + "%";
    zoomVal.setAttribute("aria-label", "Zoom " + pct + "%" + (ui.zoom === "fit" ? ", fitted to the screen" : ". Fit to the screen"));
  }
  new ResizeObserver(function () { layoutFrame(); }).observe(canvas);
  new ResizeObserver(function () { if (ui.screen === "editor") sizer.style.height = Math.ceil(vp.offsetHeight * curScale()) + "px"; }).observe(vp);

  function renderCanvas() {
    vp.innerHTML = siteHTML(state, ui.page, { editing: !ui.preview, sel: ui.sel });
    var path = PAGE_META[ui.page].path;
    $("#cv-url").textContent = S.site + (path ? "/" + path : "");
  }
  var lastNotice = 0;
  vp.addEventListener("click", function (e) {
    var a = e.target.closest("a, button");
    if (a) e.preventDefault();
    if (ui.preview) {
      var g = e.target.closest("[data-goto]");
      if (g && g.getAttribute("data-goto")) { setPage(g.getAttribute("data-goto")); return; }
      if (a && Date.now() - lastNotice > 3000) { lastNotice = Date.now(); SC.toast("Links outside the site are paused", "The preview keeps you in the editor. Menu links still switch pages.", "info"); }
      return;
    }
    var blk = e.target.closest(".s-block[data-sec]");
    if (!blk) return;
    var id = blk.getAttribute("data-sec"), fe = e.target.closest("[data-field]");
    select(id, { from: "canvas", field: fe && ui.sel === id ? fe.getAttribute("data-field") : null });
  });
  vp.addEventListener("keydown", function (e) {
    if (ui.preview || !e.target.matches(".s-block[data-sec]")) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(e.target.getAttribute("data-sec"), { from: "canvas" }); }
  });

  /* ---------- Toolbar ---------- */
  function renderHistoryButtons() {
    $("#undo-btn").disabled = locked() || hi <= 0;
    $("#redo-btn").disabled = locked() || hi >= hist.length - 1;
  }
  function renderToolbar() {
    $$("[data-device]", toolbar).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-device") === ui.device)); });
    $('[data-tb="panel"]', toolbar).setAttribute("aria-expanded", String(ui.panelOpen));
    renderHistoryButtons();
  }
  function setDevice(d) {
    ui.device = d; ui.zoom = "fit";
    renderToolbar(); layoutFrame();
    announce(DEVICE_LABEL[d] + " width, " + DEVICE_W[d] + " pixels");
  }
  function zoomStep(dir) {
    var k = curScale(), next = null;
    if (dir > 0) next = ZOOMS.find(function (z) { return z > k + 0.001; });
    else next = ZOOMS.slice().reverse().find(function (z) { return z < k - 0.001; });
    if (next) { ui.zoom = next; layoutFrame(); }
  }
  toolbar.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.hasAttribute("data-device")) { setDevice(b.getAttribute("data-device")); return; }
    switch (b.getAttribute("data-tb")) {
      case "undo": undo(); break;
      case "redo": redo(); break;
      case "zoom-in": zoomStep(1); break;
      case "zoom-out": zoomStep(-1); break;
      case "zoom-fit": ui.zoom = "fit"; layoutFrame(); break;
      case "panel": if (ui.panelOpen) closePanel(); else openPanel(true); break;
    }
  });
  function openPanel(focus) {
    ui.panelOpen = true; studio.classList.add("is-panel-open"); renderToolbar();
    if (focus) $("#tab-" + ui.tab).focus();
  }
  function closePanel(returnFocus) {
    if (!ui.panelOpen) return;
    ui.panelOpen = false; studio.classList.remove("is-panel-open"); renderToolbar();
    if (returnFocus) $('[data-tb="panel"]', toolbar).focus();
  }

  /* ---------- Preview mode ---------- */
  var previewBar = $("#preview-bar");
  function setPreview(on, silent) {
    if (ui.preview === on) return;
    ui.preview = on;
    studio.classList.toggle("is-preview", on);
    previewBar.hidden = !on;
    $("#pv-page").textContent = ui.page;
    if (on) closePanel();
    renderCanvas();
    if (silent) return;
    if (on) { $("#exit-preview").focus(); announce("Preview. Press Escape to return to editing."); }
    else previewBtn.focus();
  }
  previewBtn.addEventListener("click", function () { setPreview(true); });
  $("#exit-preview").addEventListener("click", function () { setPreview(false); });

  /* =========================================================================
     Top-row menus
     ========================================================================= */
  pageMenu.addEventListener("click", function (e) { var b = e.target.closest("[data-page]"); if (b) { setPage(b.getAttribute("data-page")); $("#page-btn").focus(); } });
  moreMenu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-more]");
    if (!b || b.disabled) return;
    switch (b.getAttribute("data-more")) {
      case "template": showPicker(); break;
      case "preview": setPreview(true); break;
      case "duplicate": duplicateToEdit(); break;
      case "archive": SC.open("#archive-dialog"); break;
      case "media": openMedia(null); break;
      case "cms": setTab("pages"); if (isNarrow()) openPanel(); var h = $("#cms-h"); if (h) { h.scrollIntoView({ block: "start", behavior: smooth() }); h.focus({ preventScroll: true }); } break;
    }
  });
  // Focus the first (or checked) item when a menu opens; arrow keys move within menus.
  document.addEventListener("click", function (e) {
    var trg = e.target.closest && e.target.closest("[data-menu]");
    if (!trg) return;
    var m = $(trg.getAttribute("data-menu"));
    if (m && !m.hidden && m.getAttribute("role") === "menu") {
      var it = m.querySelector('.menu-item[aria-checked="true"]') || m.querySelector(".menu-item:not([disabled])");
      if (it) it.focus();
    }
  });
  document.addEventListener("keydown", function (e) {
    var m = e.target.closest && e.target.closest('.popover[role="menu"]');
    if (!m || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    var items = $$(".menu-item:not([disabled])", m).filter(function (x) { return x.offsetParent !== null; }), i = items.indexOf(document.activeElement);
    var n = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    if (items[n]) items[n].focus();
  });

  /* =========================================================================
     Publish · Duplicate to edit · Archive · Media
     ========================================================================= */
  var pubDlg = $("#pub-dialog");
  function sectionsShown() { var n = 0; PAGES.forEach(function (p) { n += state.pages[p].filter(function (s) { return s.visible; }).length; }); return n; }
  function openPublish() {
    if (locked() || ui.publishing) return;
    if (pending) commit();
    $("#pub-tile").hidden = false; $("#pub-ring").hidden = true; $("#pub-steps").hidden = true;
    $("#pub-summary").hidden = false; $("#pub-footer").hidden = false;
    $("#pub-title").textContent = "Publish this version?";
    $("#pub-desc").textContent = "The live site will be replaced. Published versions can't be edited — duplicate to make changes.";
    var t = state.theme;
    $("#pub-summary").innerHTML =
      "<div><dt>Address</dt><dd class=\"mono\">" + S.site + "</dd></div>" +
      "<div><dt>Template</dt><dd>" + esc(tplOf(state.tpl).name) + "</dd></div>" +
      "<div><dt>Style</dt><dd>" + esc(presetName(t)) + (customised(t) ? " · customised" : "") + "</dd></div>" +
      '<div><dt>Content</dt><dd class="tnum">' + PAGES.length + " pages · " + sectionsShown() + " sections shown</dd></div>" +
      "<div><dt>Replaces</dt><dd>Live since " + esc(ui.liveSince) + "</dd></div>";
    SC.open(pubDlg);
  }
  publishBtn.addEventListener("click", openPublish);
  $("#pub-go").addEventListener("click", function () {
    if (ui.publishing) return;
    ui.publishing = true;
    var steps = ["Saving this version", "Building " + PAGES.length + " pages", "Replacing the live site", "Checking " + S.site + " responds"];
    $("#pub-tile").hidden = true; $("#pub-ring").hidden = false;
    $("#pub-summary").hidden = true; $("#pub-footer").hidden = true;
    $("#pub-title").textContent = "Publishing to " + S.site;
    $("#pub-desc").textContent = "This takes a few seconds. You can close this window — publishing carries on.";
    var list = $("#pub-steps"); list.hidden = false;
    list.innerHTML = steps.map(function (s, i) { return '<li data-i="' + i + '"><span class="ps-mark"></span>' + s + "</li>"; }).join("");
    pubDlg.setAttribute("tabindex", "-1");
    pubDlg.focus({ preventScroll: true });
    var bar = $("#pub-ring-bar"), pct = $("#pub-pct"), i = 0, stepMs = SC.reduced() ? 250 : 700;
    function tick() {
      $$("li", list).forEach(function (li, j) { li.className = j < i ? "is-done" : j === i ? "is-active" : ""; });
      var p = Math.round((i / steps.length) * 100);
      bar.setAttribute("stroke-dashoffset", String(100 - p)); pct.textContent = p + "%";
      if (i < steps.length) announce(steps[i]);
      if (i >= steps.length) { setTimeout(finish, SC.reduced() ? 100 : 450); return; }
      i++; setTimeout(tick, stepMs);
    }
    tick();
  });
  function finish() {
    ui.publishing = false;
    SC.close(pubDlg);
    ui.mode = "published"; ui.liveSince = TODAY; ui.liveTpl = state.tpl; ui.sel = null;
    resetHistory();
    setPreview(false, true);
    renderAll();
    statusBtn.focus();
    SC.toast("Published", S.site + " now shows this version.", "circle-check");
    announce("Published. This version is now live and locked.");
  }
  function duplicateToEdit() {
    if (!locked()) return;
    ui.mode = "draft"; ui.edited = "just now";
    resetHistory(); renderAll();
    SC.toast("Duplicated to a new draft", "The live site stays as it is until you publish again.", "copy");
  }
  $("#arch-go").addEventListener("click", function () {
    SC.close("#archive-dialog");
    ui.hasDraft = false; ui.mode = "draft"; ui.sel = null; ui.page = "Home";
    state = freshState(ui.liveTpl);
    resetHistory();
    showPicker();
    SC.toast("Draft archived", "Your live site hasn't changed.", "inbox");
  });

  var mediaSheet = $("#media-sheet"), mediaGrid = $("#media-grid");
  function openMedia(forId) {
    var s = forId ? secById(forId) : null;
    mediaSheet.setAttribute("data-for", s ? forId : "");
    $("#media-title").textContent = s ? "Choose an image" : "Website media";
    $("#media-desc").textContent = s ? "For the " + s.label + " section. It updates on the page straight away." : "Images used across " + S.site + ".";
    mediaGrid.innerHTML = MEDIA.map(function (m, i) {
      var inner = '<span class="media-ph">' + I("image", 22) + '</span><span class="media-txt"><b>' + m + "</b><small>" + (i % 2 ? "1200 × 900" : "1600 × 1000") + " · JPG</small></span>";
      return s ? '<button type="button" class="media-tile" data-media="' + m + '" aria-pressed="' + (s.f.image === m) + '">' + inner + "</button>" : '<div class="media-tile">' + inner + "</div>";
    }).join("");
    SC.open(mediaSheet);
  }
  mediaGrid.addEventListener("click", function (e) {
    var b = e.target.closest("[data-media]"), id = mediaSheet.getAttribute("data-for");
    if (!b || !id || locked()) return;
    var s = secById(id); if (!s) return;
    s.f.image = b.getAttribute("data-media");
    commit(); renderCanvas();
    SC.close(mediaSheet);
    renderPanel("media-" + id);
    announce("Image set to " + s.f.image);
  });
  $("#media-upload").addEventListener("click", function () { SC.toast("Uploading isn't part of this preview", "Nothing was sent.", "upload"); });

  /* =========================================================================
     Global keys
     ========================================================================= */
  document.addEventListener("keydown", function (e) {
    if (ui.screen !== "editor") return;
    var typing = e.target.matches && e.target.matches("input, textarea, select");
    var mod = e.metaKey || e.ctrlKey, k = (e.key || "").toLowerCase();
    var overlay = document.querySelector('.dialog[data-open="true"], .sheet[data-open="true"]');
    if (mod && !typing && !overlay && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && !typing && !overlay && k === "y") { e.preventDefault(); redo(); return; }
    if (e.key !== "Escape" || overlay) return;
    var openMenu = document.querySelector(".popover[data-menu-open]");
    if (openMenu) { var trg = document.querySelector('[data-menu="#' + openMenu.id + '"]'); if (trg) setTimeout(function () { trg.focus(); }, 0); return; }
    if (ui.preview) { e.preventDefault(); setPreview(false); return; }
    if (isNarrow() && ui.panelOpen) { closePanel(true); return; }
    if (ui.sel && !typing) { var id = ui.sel; select(null); var b = vp.querySelector('.s-block[data-sec="' + id + '"]'); if (b) b.focus({ preventScroll: true }); }
  }, true);

  /* =========================================================================
     Render all + boot
     ========================================================================= */
  function renderAll() {
    renderTop(); renderTabs(); renderPanel(); renderCanvas(); renderToolbar();
    $("#pv-page").textContent = ui.page;
  }
  narrowMQ.addEventListener("change", function () { if (!isNarrow()) closePanel(); layoutFrame(); });

  if (isNarrow()) ui.device = "mobile"; // on a phone, start with the phone-width frame
  resetHistory();
  renderTop();
  renderPicker();
})();
