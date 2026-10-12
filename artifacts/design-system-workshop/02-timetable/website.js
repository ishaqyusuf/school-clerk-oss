/* Direction 02 — Timetable · Website generator editor (website.html).
   Local simulation only: nothing is saved, published or sent anywhere.
   The tenant preview (#site / #pk-site) is themed ONLY by the tenant theme (--s-* variables set from
   the Style panel) — never by the Timetable palette (ADR-0020). The editor chrome uses Timetable tokens. */
(function () {
  "use strict";

  var D = SC.data, W = D.website, SCH = D.school;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = SC.esc;
  var ic = function (n, s) { return SCIcons.icon(n, s || 16); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var pad2 = function (n) { return String(n).padStart(2, "0"); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var narrow = function () { return window.matchMedia("(max-width: 1023px)").matches; };

  SC.pill({ id: "02", name: "Timetable" });

  /* ------------------------------------------------------------------ */
  /* Product data                                                        */
  /* ------------------------------------------------------------------ */
  var DEVICES = { desktop: { w: 1280, label: "Desktop" }, tablet: { w: 834, label: "Tablet" }, mobile: { w: 390, label: "Mobile" } };

  var PAGE_META = {
    Home: { path: "/", icon: "house" },
    About: { path: "/about", icon: "file-text" },
    Admissions: { path: "/admissions", icon: "file-text" },
    Blog: { path: "/blog", icon: "newspaper" },
    Events: { path: "/events", icon: "calendar" },
    Resources: { path: "/resources", icon: "folder" },
    Contact: { path: "/contact", icon: "map-pin" },
  };
  var CMS = {};
  W.cms.forEach(function (c) { CMS[c.name] = c.count; });

  // Tenant theme vocabulary (values for the school's site, not the editor)
  var BASES = {
    slate: { bg: "#FFFFFF", ink: "#0F172A", muted: "#475569", line: "#E2E8F0" },
    zinc: { bg: "#FFFFFF", ink: "#18181B", muted: "#52525B", line: "#E4E4E7" },
    neutral: { bg: "#FFFFFF", ink: "#171717", muted: "#525252", line: "#E5E5E5" },
    stone: { bg: "#FDFCFA", ink: "#1C1917", muted: "#57534E", line: "#E7E5E4" },
    taupe: { bg: "#FBF8F4", ink: "#2A231E", muted: "#6B5E53", line: "#E6DDD2" },
  };
  var RADII = { none: [0, 0], sm: [4, 6], md: [8, 12], lg: [12, 18], xl: [18, 26], full: [999, 28] };
  var DENS = { compact: 0.72, comfortable: 1, airy: 1.28 };
  var BODY_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var FONTS = {
    serif: { label: "Old-style serif", stack: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif', w: 600, ls: "-0.01em" },
    didone: { label: "Didone", stack: 'Didot, "Bodoni 72", "Bodoni MT", "Times New Roman", serif', w: 500, ls: "0em" },
    grotesk: { label: "Grotesk", stack: '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif', w: 750, ls: "-0.025em" },
    humanist: { label: "Humanist sans", stack: 'Optima, Candara, "Gill Sans", "Segoe UI", sans-serif', w: 600, ls: "-0.005em" },
    rounded: { label: "Rounded", stack: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Varela Round", system-ui, sans-serif', w: 700, ls: "-0.01em" },
    slab: { label: "Slab serif", stack: 'Rockwell, "Rockwell Nova", "Roboto Slab", Georgia, serif', w: 700, ls: "-0.005em" },
  };
  var PRESETS = {
    "classic-academic": { label: "Classic academic", base: "stone", primary: "#0F766E", secondary: "#0E2A28", accent: "#E9B949", radius: "sm", density: "comfortable", font: "serif", menu: "default" },
    "bright-campus": { label: "Bright campus", base: "slate", primary: "#1D4ED8", secondary: "#0B1B4D", accent: "#F59E0B", radius: "lg", density: "comfortable", font: "rounded", menu: "default" },
    "sunlit-family": { label: "Sunlit family", base: "taupe", primary: "#15803D", secondary: "#1F2A1C", accent: "#F2A93B", radius: "xl", density: "airy", font: "humanist", menu: "translucent" },
    "executive-campus": { label: "Executive campus", base: "zinc", primary: "#1E3A5F", secondary: "#0B1320", accent: "#C8A96A", radius: "none", density: "comfortable", font: "didone", menu: "translucent" },
    nova: { label: "Nova", base: "neutral", primary: "#6D28D9", secondary: "#1E1033", accent: "#FBBF24", radius: "md", density: "comfortable", font: "grotesk", menu: "default" },
    vega: { label: "Vega", base: "stone", primary: "#BE123C", secondary: "#1C1917", accent: "#FBBF24", radius: "sm", density: "compact", font: "slab", menu: "solid" },
    maia: { label: "Maia", base: "taupe", primary: "#7C2D12", secondary: "#292524", accent: "#65A30D", radius: "lg", density: "airy", font: "humanist", menu: "default" },
    mira: { label: "Mira", base: "slate", primary: "#0E7490", secondary: "#082F49", accent: "#FB923C", radius: "md", density: "compact", font: "grotesk", menu: "solid" },
    lyra: { label: "Lyra", base: "zinc", primary: "#4338CA", secondary: "#111827", accent: "#34D399", radius: "full", density: "comfortable", font: "rounded", menu: "translucent" },
  };
  var TPL = {
    "k12-plus-template-1": { key: "scholaris", hero: "split", preset: "classic-academic" },
    "k12-plus-template-2": { key: "northfield", hero: "soft", preset: "sunlit-family" },
    "k12-plus-template-3": { key: "crestview", hero: "cover", preset: "executive-campus" },
    "k12-plus-template-4": { key: "kaleidoscope", hero: "blocks", preset: "bright-campus" },
  };
  var tplById = function (id) { return W.templates.filter(function (t) { return t.id === id; })[0]; };
  var tplLocked = function (t) { return t.plan !== "All plans"; };

  // Section content (Home from shared data; inner pages are sample copy for the preview)
  var srcOf = function (key) { return W.sections.filter(function (s) { return s.key === key; })[0] || {}; };
  var heroSrc = srcOf("hero").fields;
  var statSrc = srcOf("stats").items;
  var annSrc = srcOf("announcements").items;
  var EST = 2026 - parseInt(statSrc[2][0], 10);
  var FEATURE_TEXT = [
    "Teachers know every child by name, by strengths and by what they need next.",
    "Science and computer labs in weekly use from Basic 4 upward.",
    "Optional Islamic studies taught alongside the national curriculum.",
    "Inter-house sports, debate, music and coding clubs after lessons.",
  ];
  var FEATURE_ICONS = ["users-round", "shapes", "book-open", "trophy"];
  var ANNOUNCEMENTS = [
    { d: "30", m: "Oct", t: annSrc[0], s: "Lessons resume on Tuesday 3 Nov" },
    { d: "17", m: "Oct", t: annSrc[1], s: "10:00 · School hall" },
    { d: "09", m: "Oct", t: annSrc[2], s: "Sign up with your class teacher" },
    { d: "05", m: "Oct", t: "First CA results are on the parent portal", s: "Log in to see your child's scores" },
    { d: "28", m: "Sep", t: "Library week: book donations welcome", s: "Drop-off at the school office" },
    { d: "14", m: "Sep", t: "Welcome back to the 2026/2027 session", s: "First Term begins" },
  ];
  var BLOG = [
    { t: "How we teach early reading in Basic 1", d: "2 Oct 2026" },
    { t: "What JSS 2 built for the science fair", d: "25 Sep 2026" },
    { t: "A parent's guide to the school portal", d: "18 Sep 2026" },
    { t: "Meet the coaches behind inter-house sports", d: "11 Sep 2026" },
  ];
  var EVENTS = [
    { d: "17", m: "Oct", t: "PTA meeting", s: "Saturday · 10:00 · School hall" },
    { d: "30", m: "Oct", t: "Mid-term break", s: "30 Oct – 2 Nov · lessons resume 3 Nov" },
    { d: "18", m: "Dec", t: "End of First Term", s: "Friday · reports issued" },
  ];
  var RESOURCES = ["Term calendar 2026/2027", "Book list · JSS 1–3", "Book list · Basic 1–5", "Uniform guide", "Admission form", "Fee schedule · First Term", "Medical information form", "School bus registration", "Parent handbook"];
  var ADM_SUBS = ["Start an application for 2026/2027", "Term fees and how to pay", "Tour the campus with our admissions team", "PDF · school overview"];
  var ADM_HREF = ["/admissions", "/admissions", "/contact", "/resources"];
  var EXT = { portal: "parent portal", fees: "fee payment", tel: "phone link", mail: "email link" };

  var CONTENT = {
    hero: { kicker: heroSrc.kicker, title: heroSrc.title, body: heroSrc.body, cta: heroSrc.cta, link: "/admissions", cta2: "Book a school visit" },
    features: { eyebrow: "Why families choose Kingsway", heading: "Room to grow, from nursery to SS 3", items: srcOf("features").items.map(function (t, i) { return { t: t, b: FEATURE_TEXT[i] || "" }; }) },
    stats: { eyebrow: "Our motto", quote: SCH.motto + ".", items: statSrc.map(function (p) { return { v: p[0], l: p[1] }; }) },
    staff: { heading: "The people your child will learn with", items: [{ n: "Mrs. Ngozi Eze", r: "JSS 2 class teacher" }, { n: "Mr. Ibrahim Lawal", r: "SS 1 class teacher" }, { n: "Mrs. Bukola Fashola", r: "Registrar" }] },
    admission: { heading: "Admissions for 2026/2027", body: "Places are open from Nursery to SS 1. Start your application online and our admissions office will guide you through assessment, offer and enrolment.", links: [{ t: "Apply online" }, { t: "Fees and payment" }, { t: "Book a school visit" }, { t: "Download the prospectus" }] },
    announcements: { heading: "News & notices", count: 3 },
    story: { heading: "Our story", body: "Kingsway Academy opened in Ibadan in " + EST + " with one nursery class and a simple promise to parents: every child would be known.\n\nToday we teach from creche to SS 3, and that promise still shapes how we plan lessons, size classes and talk to families.", quote: SCH.motto + "." },
    process: { heading: "How admission works", intro: "Admission runs in four steps. Our office tells you what comes next at each one.", steps: [{ t: "Enquire or visit the school" }, { t: "Submit the application form" }, { t: "Entrance assessment and interview" }, { t: "Offer, acceptance and enrolment" }] },
    contact: { heading: "Visit or get in touch", address: "Kingsway Academy, Ibadan, Oyo State", phone: "+234 802 000 1100", email: "admissions@kingsway.edu.ng", hours: "Mon–Fri · 7:30 am – 4:00 pm" },
    posts: { heading: "From the blog", intro: "Stories from classrooms, clubs and the school office." },
    events: { heading: "Upcoming events", intro: "Dates for families this term." },
    resources: { heading: "Resources for parents", intro: "Forms, lists and calendars to download." },
  };
  var DEFAULT_BG = { stats: "brand", admission: "tint" };
  var PAGEHEAD = {
    About: ["About Kingsway", "A day school in Ibadan for children from creche to SS 3."],
    Admissions: ["Admissions", "Everything you need to apply for the 2026/2027 session."],
    Blog: ["Blog", "News and stories from around the school."],
    Events: ["Events", "What's happening at Kingsway this term."],
    Resources: ["Resources", "Forms, lists and calendars for families."],
    Contact: ["Contact", "We're happy to answer questions or show you around."],
  };
  var SEO = {
    Home: { title: "Kingsway Academy | Nursery to Secondary School in Ibadan", desc: "Kingsway Academy in Ibadan offers nursery, primary and secondary education with small classes and a caring community. Admissions open for 2026/2027." },
    About: { title: "About Kingsway Academy | Our story and values", desc: "How Kingsway Academy began in Ibadan, how we teach, and the values in our motto: knowledge, character, service." },
    Admissions: { title: "Admissions 2026/2027 | Kingsway Academy, Ibadan", desc: "How to apply to Kingsway Academy: enquire or visit, submit the form, sit the entrance assessment and accept your offer. Places open from Nursery to SS 1." },
    Blog: { title: "Blog | Kingsway Academy", desc: "Stories from classrooms, clubs and the school office at Kingsway Academy, Ibadan." },
    Events: { title: "Events | Kingsway Academy", desc: "PTA meetings, holidays and school events for Kingsway Academy families this term." },
    Resources: { title: "Resources for parents | Kingsway Academy", desc: "Download the term calendar, book lists, uniform guide, admission form and other documents from Kingsway Academy." },
    Contact: { title: "Contact Kingsway Academy | Ibadan, Oyo State", desc: "Phone, email and office hours for Kingsway Academy in Ibadan. Book a school visit or ask the admissions office a question." },
  };

  // Inspector field specs: [type, path, label, extra]
  var FIELDS = {
    hero: [["text", "kicker", "Kicker"], ["area", "title", "Title", 2], ["area", "body", "Body", 4], ["text", "cta", "Button"], ["link", "link", "Links to"], ["text", "cta2", "2nd link"]],
    features: [["text", "eyebrow", "Eyebrow"], ["area", "heading", "Heading", 2], ["list", "items", "Cards", [["t", "title"], ["b", "text"]]]],
    stats: [["text", "eyebrow", "Label"], ["text", "quote", "Motto"], ["pairs", "items", "Figures", [["v", "value"], ["l", "label"]]]],
    staff: [["area", "heading", "Heading", 2], ["list", "items", "People", [["n", "name"], ["r", "role"]]]],
    admission: [["area", "heading", "Heading", 2], ["area", "body", "Body", 4], ["list", "links", "Links", [["t", "label"]]]],
    announcements: [["text", "heading", "Heading"], ["cms", "Announcements"]],
    story: [["text", "heading", "Heading"], ["area", "body", "Story", 6], ["text", "quote", "Pull quote"]],
    process: [["text", "heading", "Heading"], ["area", "intro", "Intro", 3], ["list", "steps", "Steps", [["t", "step"]]]],
    contact: [["text", "heading", "Heading"], ["text", "address", "Address"], ["text", "phone", "Phone"], ["text", "email", "Email"], ["text", "hours", "Hours"]],
    posts: [["text", "heading", "Heading"], ["area", "intro", "Intro", 2], ["cms", "Blog posts"]],
    events: [["text", "heading", "Heading"], ["area", "intro", "Intro", 2], ["cms", "Events"]],
    resources: [["text", "heading", "Heading"], ["area", "intro", "Intro", 2], ["cms", "Resources"]],
  };

  function presetTheme(id) {
    var p = PRESETS[id];
    return { preset: id, base: p.base, primary: p.primary, secondary: p.secondary, accent: p.accent, radius: p.radius, density: p.density, font: p.font, menu: p.menu };
  }
  function makeSection(key, label, required) {
    return { id: key, key: key, label: label, required: !!required, visible: true, bg: DEFAULT_BG[key] || "plain", f: clone(CONTENT[key] || {}) };
  }
  function initialDoc() {
    var pages = {};
    W.pages.forEach(function (p) { pages[p] = []; });
    W.sections.forEach(function (s) { if (pages[s.page]) pages[s.page].push(makeSection(s.key, s.label, s.required)); });
    pages.Blog.push(makeSection("posts", "Blog posts", true));
    pages.Events.push(makeSection("events", "Events list", true));
    pages.Resources.push(makeSection("resources", "Resource library", true));
    pages.Home.forEach(function (s) { if (s.key === "staff") s.visible = false; });
    var seo = {};
    W.pages.forEach(function (p) { seo[p] = { title: SEO[p].title, desc: SEO[p].desc, index: true }; });
    return { template: W.templates[0].id, theme: presetTheme("classic-academic"), pages: pages, seo: seo };
  }

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  var doc = initialDoc();
  // The version on the live site (published 12 Sep 2026). Drafts are isolated from it.
  var liveDoc = (function () { var d = clone(doc); d.pages.Home[0].f.kicker = "Admissions open for 2025/2026"; return d; })();
  var ui = { mode: "editor", page: "Home", sel: "hero", device: "desktop", tab: "section", pane: "canvas", status: "draft", editedAt: Date.now() - 4 * 60000, liveSince: "12 Sep 2026", showHidden: true, pk: doc.template, saving: "" };
  var hist = { past: [], future: [], key: null, at: 0 };
  var publishing = false;

  var el = {
    ide: $("#ide"), picker: $("#picker"), status: $("#status"), stLive: $("#st-live"),
    pageSel: $("#page-select"), undo: $("#btn-undo"), redo: $("#btn-redo"), preview: $("#btn-preview"), previewLabel: $("#preview-label"),
    tplBtn: $("#btn-template"), publish: $("#btn-publish"), publishLabel: $("#publish-label"), more: $("#btn-more"), moreMenu: $("#more-menu"),
    tree: $("#tree"), pageCount: $("#page-count"), stack: $("#stack"), secPage: $("#sec-page"), secCount: $("#sec-count"), cmsBody: $("#cms-body"),
    cvMeta: $("#cv-meta"), notice: $("#cv-notice"), hiddenBtn: $("#btn-hidden"), lock: $("#lock-banner"),
    stage: $("#stage"), frame: $("#frame"), ruler: $("#ruler"), vp: $("#vp"), site: $("#site"),
    hov: $("#hov"), selbox: $("#selbox"), selTag: $("#sel-tag-text"), framePath: $("#frame-path"), frameTag: $("#frame-tag"),
    exitPreview: $("#exit-preview"), widthSr: $("#width-sr"), props: $("#pane-props"), propsScroll: $("#props-scroll"),
    panels: { section: $("#panel-section"), style: $("#panel-style"), seo: $("#panel-seo") },
    rowMenu: $("#row-menu"), sr: $("#sr"),
    pkList: $("#pk-list"), pkStage: $("#pk-stage"), pkFrame: $("#pk-frame"), pkRuler: $("#pk-ruler"), pkVp: $("#pk-vp"), pkSite: $("#pk-site"), pkName: $("#pk-prev-name"), pkCount: $("#pk-count"),
    dlgPub: $("#dlg-publish"), dlgArc: $("#dlg-archive"),
  };
  var mainF = { stage: el.stage, frame: el.frame, ruler: el.ruler, vp: el.vp, site: el.site, scale: 1 };
  var pkF = { stage: el.pkStage, frame: el.pkFrame, ruler: el.pkRuler, vp: el.pkVp, site: el.pkSite, scale: 1 };

  var secs = function (d, p) { return (d || doc).pages[p || ui.page]; };
  var selected = function () { return secs().filter(function (s) { return s.id === ui.sel; })[0] || null; };
  var findSec = function (d, id) { for (var p in d.pages) { var s = d.pages[p].filter(function (x) { return x.id === id; })[0]; if (s) return s; } return null; };
  var locked = function () { return ui.status === "live"; };
  var shown = function (s) { return s.visible || s.required; };
  var DIS = function () { return locked() ? " disabled" : ""; };
  function setPath(o, path, v) { var k = path.split("."); for (var i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = v; }
  function heroCta(d) { var h = (d || doc).pages.Home.filter(function (s) { return s.key === "hero"; })[0]; return (h && h.f.cta) || "Apply for admission"; }
  function contactF(d) { var c = (d || doc).pages.Contact.filter(function (s) { return s.key === "contact"; })[0]; return c ? c.f : CONTENT.contact; }
  function announce(t) { el.sr.textContent = ""; setTimeout(function () { el.sr.textContent = t; }, 40); }
  function fmtDate(d) { return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function ago(t) { var m = Math.floor((Date.now() - t) / 60000); if (m < 1) return "just now"; if (m < 60) return m + " min ago"; return Math.floor(m / 60) + " h ago"; }

  /* ------------------------------------------------------------------ */
  /* Colour maths (tenant theme)                                         */
  /* ------------------------------------------------------------------ */
  function rgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function lum(h) { var w = [0.2126, 0.7152, 0.0722]; return rgb(h).reduce(function (a, v, i) { v /= 255; return a + w[i] * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }, 0); }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function onColor(h) { return ratio(h, "#FFFFFF") >= ratio(h, "#111111") ? "#FFFFFF" : "#111111"; }
  function mixHex(a, b, t) { var A = rgb(a), B = rgb(b); return "#" + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0"); }).join(""); }
  var validHex = function (v) { return /^#?[0-9a-f]{6}$/i.test(String(v).trim()); };
  var normHex = function (v) { return "#" + String(v).trim().replace("#", "").toUpperCase(); };
  function crInfo(h) { var r = ratio(h, onColor(h)); return { txt: r.toFixed(1) + " " + (r >= 4.5 ? "AA" : r >= 3 ? "Large" : "Low"), state: r >= 4.5 ? "ok" : r >= 3 ? "warn" : "bad" }; }
  function isModified() { var p = PRESETS[doc.theme.preset], t = doc.theme; return ["base", "primary", "secondary", "accent", "radius", "density", "font", "menu"].some(function (k) { return String(p[k]).toUpperCase() !== String(t[k]).toUpperCase(); }); }

  function themeVars(t) {
    var b = BASES[t.base] || BASES.slate, r = RADII[t.radius] || RADII.md, f = FONTS[t.font] || FONTS.serif;
    return {
      "--s-primary": t.primary, "--s-on-primary": onColor(t.primary),
      "--s-secondary": t.secondary, "--s-on-secondary": onColor(t.secondary),
      "--s-accent": t.accent, "--s-on-accent": onColor(t.accent),
      "--s-bg": b.bg, "--s-ink": b.ink, "--s-muted": b.muted, "--s-line": b.line,
      "--s-r": r[0] + "px", "--s-rc": r[1] + "px", "--s-space": String(DENS[t.density] || 1),
      "--s-head": f.stack, "--s-head-w": String(f.w), "--s-head-ls": f.ls, "--s-body": BODY_FONT,
    };
  }
  function applyTheme(node, d) {
    var v = themeVars(d.theme);
    Object.keys(v).forEach(function (k) { node.style.setProperty(k, v[k]); });
    node.setAttribute("data-tpl", TPL[d.template].key);
    node.setAttribute("data-nav", d.theme.menu);
  }

  /* ------------------------------------------------------------------ */
  /* Tenant site renderer (Kingsway Academy)                             */
  /* ------------------------------------------------------------------ */
  function A(href, inner, attrs) { return '<a href="#" data-href="' + esc(href) + '" tabindex="-1"' + (attrs ? " " + attrs : "") + ">" + inner + "</a>"; }
  function ph(label) { return '<span class="s-ph">' + ic("image", 13) + esc(label) + "</span>"; }
  function crest() {
    return '<svg class="s-crest" viewBox="0 0 40 46" aria-hidden="true"><path class="c-shield" d="M20 1.5 38 7.5V22c0 11.6-7.6 18.6-18 22.5C9.6 40.6 2 33.6 2 22V7.5Z"/><path class="c-rim" d="M20 5.6 34.4 10.4V22c0 9.3-5.9 15.1-14.4 18.4C11.5 37.1 5.6 31.3 5.6 22V10.4Z"/><text class="c-txt" x="20" y="27" text-anchor="middle">' + esc(SCH.initials) + "</text></svg>";
  }
  function campusArt() {
    var cols = [114, 150, 186, 278, 314, 350].map(function (x) { return '<rect class="a-col" x="' + x + '" y="280" width="16" height="124"/>'; }).join("");
    return '<svg viewBox="0 0 480 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect class="a-sky" width="480" height="520"/><circle class="a-sun" cx="368" cy="118" r="52"/>' +
      '<path class="a-hill" d="M0 352c70-40 150-44 230-20s170 20 250-14v202H0z"/><path class="a-hill-2" d="M0 404c90-26 170-24 250-6s160 14 230-4v126H0z"/>' +
      '<rect class="a-trunk" x="60" y="352" width="8" height="74"/><circle class="a-tree" cx="64" cy="338" r="38"/><circle class="a-tree" cx="104" cy="370" r="26"/>' +
      '<rect class="a-trunk" x="414" y="356" width="7" height="68"/><circle class="a-tree" cx="418" cy="346" r="32"/>' +
      '<line class="a-pole" x1="240" y1="92" x2="240" y2="176"/><path class="a-flag" d="M242 94h44l-9 11 9 11h-44z"/>' +
      '<rect class="a-wall" x="96" y="248" width="288" height="176"/><polygon class="a-roof" points="78,252 240,170 402,252"/>' +
      '<circle class="a-clock" cx="240" cy="222" r="14"/><rect class="a-frieze" x="96" y="252" width="288" height="14"/>' + cols +
      '<path class="a-door" d="M222 424v-66a18 18 0 0 1 36 0v66z"/>' +
      '<rect class="a-step" x="84" y="424" width="312" height="10"/><rect class="a-step-2" x="70" y="434" width="340" height="10"/>' +
      '<rect class="a-ground" y="444" width="480" height="76"/><path class="a-path" d="M224 444 182 520h116l-42-76z"/></svg>';
  }
  function mapArt() {
    return '<svg viewBox="0 0 480 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect class="a-sky" width="480" height="400"/>' +
      '<rect class="a-block" x="24" y="24" width="150" height="112" rx="6"/><rect class="a-block" x="226" y="24" width="230" height="112" rx="6"/>' +
      '<rect class="a-block" x="24" y="186" width="150" height="92" rx="6"/><rect class="a-block" x="226" y="186" width="110" height="92" rx="6"/><rect class="a-block" x="364" y="186" width="92" height="92" rx="6"/>' +
      '<path class="a-road" d="M0 160H480M200 0V400M0 336c140-30 300 30 480-40"/><path class="a-grid" d="M0 80h480M0 240h480M100 0v400M300 0v400M400 0v400"/>' +
      '<path class="a-pin" d="M246 98c-26 0-46 20-46 46 0 34 46 78 46 78s46-44 46-78c0-26-20-46-46-46z"/><circle class="a-pin-dot" cx="246" cy="144" r="16"/></svg>';
  }
  function sec(s, cls, inner) { return '<section class="s-sec ' + cls + '" data-sec="' + esc(s.id) + '" data-bg="' + esc(s.bg) + '">' + inner + "</section>"; }
  function head(eyebrow, heading, more) {
    return '<div class="s-head"><div>' + (eyebrow ? '<span class="s-eyebrow">' + esc(eyebrow) + "</span>" : "") + '<h3 class="s-h2">' + esc(heading) + "</h3></div>" + (more || "") + "</div>";
  }
  var arrowR = function () { return ic("arrow-right", 18); };

  function siteHeader(d, page) {
    var key = TPL[d.template].key;
    var util = key === "kaleidoscope" ? "" :
      '<div class="s-util"><div class="s-wrap"><div class="s-util-l"><span>' + esc(SCH.city) + ", " + esc(SCH.state) + " State</span><span>" + esc(contactF(d).hours) + "</span></div>" +
      '<div class="s-util-r">' + A("portal", ic("user-round", 14) + "Parent portal") + A("fees", ic("wallet", 14) + "Pay school fees") + "</div></div></div>";
    var links = W.pages.filter(function (p) { return p !== "Home"; }).map(function (p) {
      return A(PAGE_META[p].path, esc(p), p === page ? 'aria-current="page"' : "");
    }).join("");
    return '<div class="s-header">' + util + '<div class="s-bar"><div class="s-wrap s-bar-in">' +
      A("/", crest() + "<span><b>" + esc(SCH.name) + "</b><small>" + esc(SCH.city) + " · Est. " + EST + "</small></span>", 'class="s-brand"') +
      '<div class="s-links">' + links + "</div>" +
      A("/admissions", "Apply", 'class="s-btn s-btn-accent s-btn-sm"') +
      '<button type="button" class="s-burger" tabindex="-1" aria-label="Menu">' + ic("menu", 22) + "</button>" +
      "</div></div></div>";
  }
  function siteFooter(d) {
    var c = contactF(d);
    var list = function (items) { return "<ul>" + items.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; };
    return '<div class="s-foot"><div class="s-wrap"><div class="s-foot-grid">' +
      "<div>" + A("/", crest() + "<span><b>" + esc(SCH.name) + "</b><small>" + esc(SCH.city) + " · Est. " + EST + "</small></span>", 'class="s-brand"') +
      "<p>" + esc(SCH.motto) + ". A day school for children from creche to SS 3 in " + esc(SCH.city) + ", " + esc(SCH.state) + " State.</p></div>" +
      "<div><h4>School</h4>" + list([A("/about", "About"), A("/admissions", "Admissions"), A("/events", "Events"), A("/contact", "Contact")]) + "</div>" +
      "<div><h4>Parents</h4>" + list([A("portal", "Parent portal"), A("fees", "Pay school fees"), A("/resources", "Term calendar"), A("/blog", "News & notices")]) + "</div>" +
      "<div><h4>Visit</h4>" + list([esc(c.address), A("tel", esc(c.phone)), A("mail", esc(c.email))]) + "</div>" +
      '</div><div class="s-foot-base"><span>© 2026 ' + esc(SCH.name) + "</span><span>Website by SchoolClerk</span></div></div></div>";
  }
  function pageHead(page) {
    var h = PAGEHEAD[page];
    return '<div class="s-pagehead"><div class="s-wrap"><p class="s-crumbs">' + A("/", "Home") + " / <span>" + esc(page) + '</span></p><h2 class="s-display">' + esc(h[0]) + '</h2><p class="s-lead">' + esc(h[1]) + "</p></div></div>";
  }
  function heroHTML(s, d) {
    var f = s.f, v = TPL[d.template].hero;
    var kicker = f.kicker ? '<p class="s-kicker">' + esc(f.kicker) + "</p>" : "";
    var title = '<h2 class="s-display">' + (esc(f.title) || "&nbsp;") + "</h2>";
    var body = f.body ? '<p class="s-lead">' + esc(f.body) + "</p>" : "";
    var ctas = '<div class="s-ctas">' + (f.cta ? A(f.link || "/admissions", esc(f.cta) + arrowR(), 'class="s-btn s-btn-primary"') : "") + (f.cta2 ? A("/contact", esc(f.cta2), 'class="s-btn s-btn-line"') : "") + "</div>";
    var facts = '<dl class="s-facts"><div><dt>Nursery</dt><dd>Creche – Nur 2</dd></div><div><dt>Primary</dt><dd>Basic 1 – 5</dd></div><div><dt>Secondary</dt><dd>JSS 1 – SS 3</dd></div></dl>';
    var copy = '<div class="s-hero-copy">' + kicker + title + body + ctas + facts + "</div>";
    if (v === "cover") {
      return sec(s, "s-hero s-hero--cover", '<div class="s-cover-art" role="img" aria-label="Image placeholder: wide campus photograph">' + campusArt() + ph("Image · campus, wide") + "</div>" +
        '<div class="s-wrap s-cover-in"><div class="s-cover-copy">' + kicker + title + body + ctas + facts + "</div></div>");
    }
    if (v === "soft") {
      return sec(s, "s-hero s-hero--soft", '<div class="s-wrap"><div class="s-hero-panel"><div class="s-hero-grid">' + copy +
        '<div class="s-soft-media"><div class="s-media" role="img" aria-label="Image placeholder: campus">' + campusArt() + ph("Image · campus") + "</div>" +
        '<div class="s-media" role="img" aria-label="Image placeholder">' + ph("Image") + '</div><div class="s-media" role="img" aria-label="Image placeholder">' + ph("Image") + "</div></div>" +
        "</div></div></div>");
    }
    if (v === "blocks") {
      return sec(s, "s-hero s-hero--blocks", '<div class="s-wrap s-hero-grid">' + copy + '<div class="s-blocks" aria-hidden="true"><span class="s-tile"><i></i></span><span class="s-tile"><i></i></span><span class="s-tile"><i></i></span><span class="s-tile"><i></i></span></div></div>');
    }
    return sec(s, "s-hero s-hero--split", '<div class="s-wrap s-hero-grid">' + copy +
      '<div class="s-media" role="img" aria-label="Image placeholder: campus photograph">' + campusArt() + '<span class="s-badge-est">Est.<b>' + EST + "</b>" + esc(SCH.city) + "</span>" + ph("Image · campus photo") + "</div></div>");
  }
  var RENDER = {
    hero: heroHTML,
    features: function (s) {
      var f = s.f;
      return sec(s, "s-features", '<div class="s-wrap">' + head(f.eyebrow, f.heading) + '<ul class="s-cards">' + f.items.map(function (it, i) {
        return '<li class="s-card"><span class="s-ico">' + ic(FEATURE_ICONS[i % 4], 22) + "</span><h4>" + esc(it.t) + "</h4><p>" + esc(it.b) + "</p></li>";
      }).join("") + "</ul></div>");
    },
    stats: function (s) {
      var f = s.f;
      return sec(s, "s-stats", '<div class="s-wrap s-stats-grid"><div class="s-motto">' + (f.eyebrow ? '<span class="s-eyebrow">' + esc(f.eyebrow) + "</span>" : "") + "<blockquote>" + esc(f.quote) + "</blockquote></div>" +
        '<dl class="s-stat-list">' + f.items.map(function (it) { return '<div class="s-stat"><dt>' + esc(it.l) + "</dt><dd>" + esc(it.v) + "</dd></div>"; }).join("") + "</dl></div>");
    },
    staff: function (s) {
      var f = s.f;
      return sec(s, "s-staff", '<div class="s-wrap">' + head("Staff spotlight", f.heading, A("/about", "Meet the team" + arrowR(), 'class="s-more"')) + '<ul class="s-people">' + f.items.map(function (p) {
        var ini = SC.initials(String(p.n).replace(/^(Mrs|Mr|Ms|Dr|Mal|Alh)\.?\s+/i, ""));
        return '<li class="s-person"><div class="s-portrait" role="img" aria-label="Photo placeholder for ' + esc(p.n) + '">' + esc(ini) + ph("Photo") + "</div><h4>" + esc(p.n) + "</h4><p>" + esc(p.r) + "</p></li>";
      }).join("") + "</ul></div>");
    },
    admission: function (s, d) {
      var f = s.f;
      return sec(s, "s-adm", '<div class="s-wrap s-adm-grid"><div><span class="s-eyebrow">Admissions</span><h3 class="s-h2">' + esc(f.heading) + '</h3><p class="s-lead">' + esc(f.body) + "</p>" +
        A("/admissions", esc(heroCta(d)) + arrowR(), 'class="s-btn s-btn-primary"') + '</div><ul class="s-linklist">' + f.links.map(function (l, i) {
          return "<li>" + A(ADM_HREF[i % 4], "<span><b>" + esc(l.t) + "</b><small>" + esc(ADM_SUBS[i % 4]) + '</small></span><span class="s-arrow">' + ic("arrow-up-right", 18) + "</span>") + "</li>";
        }).join("") + "</ul></div>");
    },
    announcements: function (s) {
      var f = s.f, n = Math.min(Number(f.count) || 3, ANNOUNCEMENTS.length);
      return sec(s, "s-news-sec", '<div class="s-wrap">' + head("From the school office", f.heading, A("/blog", "All announcements (" + CMS.Announcements + ")" + arrowR(), 'class="s-more"')) +
        '<ul class="s-news">' + ANNOUNCEMENTS.slice(0, n).map(function (a) { return "<li>" + A("/blog", '<span class="s-date"><b>' + a.d + "</b><span>" + a.m + "</span></span><span><strong>" + esc(a.t) + "</strong><small>" + esc(a.s) + "</small></span>") + "</li>"; }).join("") + "</ul></div>");
    },
    story: function (s) {
      var f = s.f;
      return sec(s, "s-story-sec", '<div class="s-wrap s-story"><div><span class="s-eyebrow">About</span><h3 class="s-h2">' + esc(f.heading) + '</h3><p class="s-body">' + esc(f.body) + "</p>" + (f.quote ? '<p class="s-pull">' + esc(f.quote) + "</p>" : "") + "</div>" +
        '<div class="s-media" role="img" aria-label="Image placeholder: school building">' + campusArt() + ph("Image · school building") + "</div></div>");
    },
    process: function (s, d) {
      var f = s.f;
      return sec(s, "s-process", '<div class="s-wrap"><span class="s-eyebrow">Admissions</span><h3 class="s-h2">' + esc(f.heading) + "</h3>" + (f.intro ? '<p class="s-lead s-intro">' + esc(f.intro) + "</p>" : "") +
        '<ol class="s-steps">' + f.steps.map(function (st) { return "<li><b>" + esc(st.t) + "</b></li>"; }).join("") + "</ol>" +
        '<div class="s-ctas s-after">' + A("/admissions", esc(heroCta(d)) + arrowR(), 'class="s-btn s-btn-primary"') + A("/contact", "Ask the admissions office", 'class="s-btn s-btn-line"') + "</div></div>");
    },
    contact: function (s) {
      var f = s.f;
      var rows = [["map-pin", "Address", esc(f.address)], ["phone", "Phone", A("tel", esc(f.phone))], ["mail", "Email", A("mail", esc(f.email))], ["clock", "Office hours", esc(f.hours)]];
      return sec(s, "s-contact-sec", '<div class="s-wrap s-contact"><div><span class="s-eyebrow">Contact</span><h3 class="s-h2">' + esc(f.heading) + '</h3><ul class="s-dl">' +
        rows.map(function (r) { return '<li><span class="s-ico">' + ic(r[0], 18) + "</span><span><small>" + r[1] + "</small><b>" + r[2] + "</b></span></li>"; }).join("") + "</ul></div>" +
        '<div class="s-media s-map" role="img" aria-label="Map placeholder">' + mapArt() + ph("Map") + "</div></div>");
    },
    posts: function (s) {
      var f = s.f;
      return sec(s, "s-posts-sec", '<div class="s-wrap">' + head(null, f.heading) + (f.intro ? '<p class="s-lead s-intro-b">' + esc(f.intro) + "</p>" : "") + '<ul class="s-posts">' + BLOG.slice(0, CMS["Blog posts"]).map(function (p, i) {
        return '<li class="s-post">' + A("/blog", '<div class="s-media" role="img" aria-label="Image placeholder">' + (i % 2 ? "" : campusArt()) + ph("Image") + "</div><small>" + esc(p.d) + "</small><h4>" + esc(p.t) + "</h4>") + "</li>";
      }).join("") + "</ul></div>");
    },
    events: function (s) {
      var f = s.f;
      return sec(s, "s-events-sec", '<div class="s-wrap">' + head(null, f.heading) + (f.intro ? '<p class="s-lead s-intro-b">' + esc(f.intro) + "</p>" : "") + '<ul class="s-news s-events">' + EVENTS.slice(0, CMS.Events).map(function (a) {
        return "<li>" + A("/events", '<span class="s-date"><b>' + a.d + "</b><span>" + a.m + "</span></span><span><strong>" + esc(a.t) + "</strong><small>" + esc(a.s) + "</small></span>") + "</li>";
      }).join("") + "</ul></div>");
    },
    resources: function (s) {
      var f = s.f;
      return sec(s, "s-files-sec", '<div class="s-wrap">' + head(null, f.heading) + (f.intro ? '<p class="s-lead s-intro-b">' + esc(f.intro) + "</p>" : "") + '<ul class="s-files">' + RESOURCES.slice(0, CMS.Resources).map(function (r) {
        return "<li>" + A("/resources", '<span class="s-ico">' + ic("file-text", 20) + "</span><b>" + esc(r) + "</b><small>PDF · Download</small>") + "</li>";
      }).join("") + "</ul></div>");
    },
  };
  function hiddenMark(s) { return '<div class="ed-hidden" data-sec="' + esc(s.id) + '">' + ic("eye-off", 13) + "<b>" + esc(s.id) + "</b><span>" + esc(s.label) + " · hidden on the live site</span></div>"; }
  function siteHTML(d, page, editor) {
    var body = page === "Home" ? "" : pageHead(page);
    (d.pages[page] || []).forEach(function (s) {
      if (!shown(s)) { if (editor && ui.showHidden) body += hiddenMark(s); return; }
      body += (RENDER[s.key] || function () { return ""; })(s, d);
    });
    return siteHeader(d, page) + '<div class="s-main">' + body + "</div>" + siteFooter(d);
  }

  /* ------------------------------------------------------------------ */
  /* Template thumbnails (mini renderings, SVG)                          */
  /* ------------------------------------------------------------------ */
  function thumbSVG(id) {
    var th = presetTheme(TPL[id].preset), b = BASES[th.base], key = TPL[id].key;
    var P = th.primary, S = th.secondary, AC = th.accent, BG = b.bg, INK = b.ink, LN = b.line;
    var MU = mixHex(b.muted, BG, 0.45), T1 = mixHex(P, BG, 0.9), T2 = mixHex(P, BG, 0.78);
    var ONP = onColor(P) === "#FFFFFF" ? "rgba(255,255,255,.78)" : "rgba(0,0,0,.55)";
    var r = function (x, y, w, h, fill, rx, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + fill + '"' + (extra || "") + "/>"; };
    var navLinks = function (y, fill) { return [176, 200, 224, 248].map(function (x) { return r(x, y, 16, 3, fill, 1); }).join(""); };
    var g = "";
    if (key === "scholaris") {
      g = r(0, 0, 320, 9, S) + r(14, 15, 9, 11, P, 2) + r(27, 16, 44, 4, INK, 1) + r(27, 22.5, 24, 2.5, MU, 1) + navLinks(19, MU) + r(276, 14, 30, 11, AC, 1.5) + r(0, 33, 320, 1, LN) +
        r(14, 50, 22, 2.5, AC) + r(14, 58, 132, 10, INK, 1) + r(14, 72, 100, 10, INK, 1) + r(14, 90, 124, 3, MU, 1) + r(14, 96, 110, 3, MU, 1) +
        r(14, 108, 50, 12, P, 1.5) + '<rect x="68.5" y="108.5" width="44" height="11" rx="1.5" fill="none" stroke="' + LN + '"/>' +
        r(168, 42, 138, 86, T2, 2) + '<circle cx="284" cy="60" r="9" fill="' + AC + '"/>' + '<polygon points="190,98 238,76 286,98" fill="' + S + '"/>' + r(196, 97, 84, 26, P) +
        [206, 220, 254, 268].map(function (x) { return r(x, 102, 4, 18, BG); }).join("") + r(234, 106, 8, 17, S) +
        r(0, 140, 320, 28, P) + [40, 145, 250].map(function (x) { return r(x, 148, 30, 9, ONP, 1) + r(x, 159, 20, 3, ONP, 1); }).join("") +
        [14, 90, 166, 242].map(function (x) { return r(x, 178, 64, 2, P) + r(x, 184, 44, 4, INK, 1) + r(x, 191, 56, 2.5, MU, 1); }).join("");
    } else if (key === "northfield") {
      g = r(0, 0, 320, 8, S) + '<circle cx="19" cy="20" r="6" fill="' + P + '"/>' + r(29, 16, 44, 4, INK, 2) + r(29, 22, 24, 2.5, MU, 1) + navLinks(18, MU) + r(274, 13, 32, 12, AC, 6) +
        r(10, 34, 300, 100, T1, 12) + r(24, 52, 26, 3, AC, 1.5) + r(24, 60, 120, 10, INK, 4) + r(24, 74, 90, 10, INK, 4) + r(24, 92, 116, 3, MU, 1.5) + r(24, 98, 96, 3, MU, 1.5) + r(24, 110, 52, 13, P, 6.5) +
        r(172, 44, 78, 80, T2, 10) + '<circle cx="226" cy="66" r="10" fill="' + AC + '"/>' + '<path d="M172 110c20-14 46-16 78-6v10a10 10 0 0 1-10 10h-58a10 10 0 0 1-10-10z" fill="' + P + '" opacity=".55"/>' +
        r(256, 44, 44, 38, AC, 10) + r(256, 86, 44, 38, S, 10) +
        [10, 112, 214].map(function (x) { return r(x, 146, 96, 44, BG, 10, ' stroke="' + LN + '"') + '<circle cx="' + (x + 16) + '" cy="160" r="6" fill="' + T2 + '"/>' + r(x + 10, 172, 56, 4, INK, 2) + r(x + 10, 180, 70, 2.5, MU, 1); }).join("");
    } else if (key === "crestview") {
      g = r(0, 0, 320, 132, S) +
        '<g opacity=".38"><polygon points="150,70 235,30 320,70" fill="' + AC + '"/>' + r(160, 68, 150, 56, P) + [172, 196, 220, 268, 292].map(function (x) { return r(x, 76, 7, 44, "#ffffff", 0, ' opacity=".55"'); }).join("") + "</g>" +
        r(0, 8, 320, 18, "#ffffff", 0, ' opacity=".86"') + r(14, 12, 8, 10, P, 0) + r(26, 14, 40, 3.5, INK) + navLinks(15, MU) + r(278, 11, 28, 12, P) +
        r(16, 62, 24, 2.5, AC) + r(16, 70, 140, 11, "#ffffff", 0, ' opacity=".92"') + r(16, 85, 104, 11, "#ffffff", 0, ' opacity=".92"') + r(16, 102, 120, 3, "#ffffff", 0, ' opacity=".55"') + r(16, 114, 46, 11, AC) +
        r(16, 146, 288, 1, AC) + [16, 116, 216].map(function (x) { return r(x, 156, 70, 5, INK) + r(x, 166, 88, 3, MU) + r(x, 172, 76, 3, MU); }).join("");
    } else {
      g = '<circle cx="20" cy="18" r="7" fill="' + P + '"/>' + r(31, 14, 44, 4, INK, 2) + r(31, 20, 24, 2.5, MU, 1) + navLinks(16, MU) + r(274, 11, 32, 12, P, 6) +
        r(14, 52, 28, 3, AC, 1.5) + r(14, 60, 136, 11, INK, 4) + r(14, 75, 104, 11, INK, 4) + r(14, 94, 120, 3, MU, 1.5) + r(14, 100, 100, 3, MU, 1.5) + r(14, 112, 54, 13, P, 6.5) +
        r(176, 38, 62, 62, P, 8) + '<circle cx="207" cy="69" r="18" fill="' + AC + '"/>' +
        r(244, 38, 62, 62, AC, 8) + '<polygon points="275,52 296,100 254,100" fill="' + S + '"/>' +
        r(176, 106, 62, 62, T2, 8) + '<path d="M189 168v-24a18 18 0 0 1 36 0v24z" fill="' + P + '"/>' +
        r(244, 106, 62, 62, S, 8) + [256, 272, 288].map(function (x) { return [120, 136, 152].map(function (y) { return '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="' + AC + '"/>'; }).join(""); }).join("") +
        [[14, mixHex(P, BG, 0.85)], [90, mixHex(AC, BG, 0.7)], [14 + 152, mixHex(S, BG, 0.88)], [242, mixHex(P, BG, 0.93)]].map(function (c) { return r(c[0], 178, 64, 16, c[1], 6); }).join("");
    }
    return '<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="200" fill="' + BG + '"/>' + g + "</svg>";
  }

  /* ------------------------------------------------------------------ */
  /* History                                                             */
  /* ------------------------------------------------------------------ */
  var saveT = null;
  function touched() {
    ui.editedAt = Date.now(); ui.saving = "saving…"; renderStatus();
    clearTimeout(saveT);
    saveT = setTimeout(function () { ui.saving = "saved"; renderStatus(); }, 650);
  }
  function snap() { return { d: JSON.stringify(doc), page: ui.page, sel: ui.sel }; }
  function commit(fn, opts) {
    opts = opts || {};
    if (locked()) { lockedNudge(); return false; }
    var now = Date.now();
    var merge = opts.merge && opts.merge === hist.key && now - hist.at < 1500;
    if (!merge) { hist.past.push(snap()); if (hist.past.length > 120) hist.past.shift(); }
    hist.key = opts.merge || null; hist.at = now; hist.future = [];
    fn(doc);
    touched();
    if (opts.light) { renderSite(); renderTopbar(); }
    else renderAll();
    return true;
  }
  function restore(s) {
    doc = JSON.parse(s.d);
    ui.page = doc.pages[s.page] ? s.page : ui.page;
    ui.sel = s.sel;
    if (!secs().some(function (x) { return x.id === ui.sel; })) ui.sel = (secs()[0] || {}).id;
    hist.key = null;
  }
  function undo() {
    if (locked() || !hist.past.length || ui.mode === "picker") return;
    hist.future.push(snap()); restore(hist.past.pop()); touched(); renderAll();
    announce("Undone"); notice("Undone · <mark>" + hist.past.length + "</mark> step" + (hist.past.length === 1 ? "" : "s") + " back", 2200);
  }
  function redo() {
    if (locked() || !hist.future.length || ui.mode === "picker") return;
    hist.past.push(snap()); restore(hist.future.pop()); touched(); renderAll();
    announce("Redone"); notice("Redone · <mark>" + hist.future.length + "</mark> ahead", 2200);
  }

  /* ------------------------------------------------------------------ */
  /* Rendering — editor chrome                                           */
  /* ------------------------------------------------------------------ */
  function withFocus(fn) {
    var a = document.activeElement, id = a && a !== document.body ? a.id : "", ss = null, se = null;
    try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) { ss = null; }
    fn();
    if (!id) return;
    var n = document.getElementById(id);
    if (n && n !== a && !n.disabled && n.getClientRects().length) {
      n.focus({ preventScroll: true });
      if (ss != null && typeof n.setSelectionRange === "function") { try { n.setSelectionRange(ss, se); } catch (e) { /* not a text field */ } }
    }
  }
  function renderAll() {
    withFocus(function () { renderTopbar(); renderStatus(); renderTree(); renderStack(); renderInspector(); renderSite(); renderLock(); });
  }
  function renderStatus() {
    if (locked()) {
      el.status.innerHTML = '<span class="st-tag" data-tone="live">Live</span><span class="st-sep"> </span><span class="st-text">since ' + esc(ui.liveSince) + "</span>";
      el.stLive.textContent = "";
    } else {
      el.status.innerHTML = '<span class="st-tag" data-tone="draft">Draft</span><span class="st-sep"> · </span><span class="st-text">edited ' + ago(ui.editedAt) + '</span><span class="st-save">' + (ui.saving ? "· " + ui.saving : "") + "</span>";
      el.stLive.textContent = "Live since " + ui.liveSince;
    }
    el.frameTag.textContent = locked() ? "Live" : "Draft";
    el.frameTag.setAttribute("data-tone", locked() ? "live" : "draft");
  }
  function renderTopbar() {
    var picker = ui.mode === "picker", lk = locked();
    if (el.pageSel.options.length !== W.pages.length) el.pageSel.innerHTML = W.pages.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + "</option>"; }).join("");
    el.pageSel.value = ui.page;
    el.pageSel.disabled = picker;
    $$("[data-device]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-device") === ui.device)); b.disabled = picker; });
    el.undo.disabled = picker || lk || !hist.past.length;
    el.redo.disabled = picker || lk || !hist.future.length;
    el.preview.disabled = picker;
    el.preview.setAttribute("aria-pressed", String(ui.mode === "preview"));
    el.previewLabel.textContent = ui.mode === "preview" ? "Exit preview" : "Preview";
    el.tplBtn.setAttribute("aria-pressed", String(picker));
    el.publish.setAttribute("data-live", String(lk));
    el.publish.setAttribute("aria-disabled", String(lk || picker));
    el.publishLabel.textContent = lk ? "Published" : "Publish";
    $("#mi-duplicate").disabled = !lk;
    $("#mi-archive").disabled = lk;
  }
  function renderTree() {
    el.pageCount.textContent = W.pages.length;
    el.tree.innerHTML = W.pages.map(function (p) {
      var m = PAGE_META[p];
      return '<li><button type="button" class="tree-btn" id="pg-' + p.toLowerCase() + '" data-page="' + esc(p) + '"' + (p === ui.page ? ' aria-current="page"' : "") + ">" +
        ic(m.icon, 14) + '<span class="tree-name">' + esc(p) + '</span><span class="tree-path">' + esc(m.path) + "</span></button></li>";
    }).join("");
  }
  function renderStack() {
    var list = secs(), lk = locked();
    el.secPage.textContent = ui.page;
    el.secCount.textContent = list.length + " · " + list.filter(shown).length + " visible";
    el.stack.innerHTML = list.map(function (s, i) {
      var on = s.id === ui.sel, ti = on ? "0" : "-1", hidden = !shown(s), sid = esc(s.id);
      var ctl = s.required
        ? '<span class="sec-lock" title="Required — always shown">' + ic("lock", 13) + '<span class="sr-only">Required, always shown</span></span>'
        : '<input type="checkbox" class="switch" role="switch" id="vis-' + sid + '" data-vis="' + sid + '" aria-label="Show ' + esc(s.label) + '"' + (s.visible ? " checked" : "") + (lk ? " disabled" : "") + ' tabindex="' + ti + '">';
      return '<li class="sec" data-id="' + sid + '"' + (on ? " data-selected" : "") + (hidden ? " data-hidden" : "") + ">" +
        '<span class="sec-handle" aria-hidden="true" title="Drag to reorder">' + ic("grip-vertical", 14) + "</span>" +
        '<button type="button" class="sec-main" id="sec-' + sid + '" data-id="' + sid + '" aria-current="' + on + '" tabindex="' + ti + '" aria-label="' + esc(s.label) + ", " + sid + ", position " + (i + 1) + " of " + list.length + (s.required ? ", required" : hidden ? ", hidden" : "") + '">' +
        '<span class="sec-key">' + sid + '</span><span class="sec-label">' + esc(s.label) + "</span></button>" +
        '<span class="sec-ctl">' + ctl + "</span>" +
        '<button type="button" class="sec-more" id="more-' + sid + '" data-more="' + sid + '" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + esc(s.label) + '" tabindex="' + ti + '">' + ic("ellipsis-vertical", 15) + "</button></li>";
    }).join("");
  }
  function renderCms() {
    el.cmsBody.innerHTML = W.cms.map(function (c) {
      return "<tr><td>" + esc(c.name) + '</td><td class="num">' + c.count + '</td><td><button type="button" class="cms-open" data-cms="' + esc(c.name) + '" aria-label="Open ' + esc(c.name) + ' in the CMS" title="Open in CMS">' + ic("external-link", 14) + "</button></td></tr>";
    }).join("");
    $("#mi-cms-count").textContent = W.cms.reduce(function (a, c) { return a + c.count; }, 0);
  }
  function renderLock() {
    var lk = locked();
    el.ide.setAttribute("data-locked", String(lk));
    el.lock.hidden = !lk;
  }
  function renderSite() {
    applyTheme(el.site, doc);
    el.site.innerHTML = siteHTML(doc, ui.page, ui.mode === "editor");
    var m = PAGE_META[ui.page], list = secs();
    el.framePath.textContent = m.path;
    el.cvMeta.textContent = m.path + " · " + list.filter(shown).length + "/" + list.length + " sections";
    fit();
  }

  /* ---------- Inspector ---------- */
  function group(title, inner, aside) { return '<section class="pg"><h3 class="pg-h">' + title + (aside ? "<small>" + aside + "</small>" : "") + '</h3><div class="pg-b">' + inner + "</div></section>"; }
  function seg(name, opts, val, labelledby, labels) {
    return '<div class="seg" role="radiogroup" aria-labelledby="' + labelledby + '">' + opts.map(function (o) {
      return '<label><input type="radio" name="' + name + '" id="' + name + "-" + esc(o) + '" value="' + esc(o) + '"' + (String(o) === String(val) ? " checked" : "") + DIS() + "><span>" + esc(labels ? labels[o] : o) + "</span></label>";
    }).join("") + "</div>";
  }
  function segField(name, label, opts, val, labels) {
    return '<div class="pfv"><span class="label" id="' + name + '-l">' + label + "</span>" + seg(name, opts, val, name + "-l", labels) + "</div>";
  }
  function fText(id, label, path, v) {
    return '<div class="field field-horizontal pf"><label class="label" for="' + id + '">' + label + '</label><input class="input" id="' + id + '" data-f="' + path + '" value="' + esc(v) + '" autocomplete="off"' + DIS() + "></div>";
  }
  function fArea(id, label, path, v, rows) {
    return '<div class="pfv"><div class="pfv-row"><label class="label" for="' + id + '">' + label + '</label><span class="count" data-count="' + id + '">' + String(v || "").length + "</span></div>" +
      '<textarea class="textarea" id="' + id + '" data-f="' + path + '" rows="' + rows + '"' + DIS() + ">" + esc(v) + "</textarea></div>";
  }
  function fList(sid, path, label, items, sub, pair) {
    var lid = "l-" + sid + "-" + path;
    return '<div class="pfv"><div class="pfv-row"><span class="label" id="' + lid + '">' + label + '</span><span class="count">' + items.length + "</span></div>" +
      '<div class="plist" role="group" aria-labelledby="' + lid + '">' + items.map(function (it, i) {
        return '<div class="plist-row"><span class="plist-i">' + pad2(i + 1) + '</span><div class="plist-f' + (pair ? " is-pair" : "") + '">' + sub.map(function (f) {
          return '<input class="input" id="f-' + sid + "-" + path + "-" + i + "-" + f[0] + '" data-f="' + path + "." + i + "." + f[0] + '" value="' + esc(it[f[0]]) + '" aria-label="' + label + " " + (i + 1) + ", " + f[1] + '" autocomplete="off"' + DIS() + ">";
        }).join("") + "</div></div>";
      }).join("") + "</div></div>";
  }
  function fieldHTML(s, spec) {
    var type = spec[0], path = spec[1], label = spec[2], extra = spec[3], id = "f-" + s.id + "-" + path, v = s.f[path];
    if (type === "text") return fText(id, label, path, v);
    if (type === "area") return fArea(id, label, path, v, extra);
    if (type === "list") return fList(s.id, path, label, v, extra, false);
    if (type === "pairs") return fList(s.id, path, label, v, extra, true);
    if (type === "link") {
      return '<div class="field field-horizontal pf"><label class="label" for="' + id + '">' + label + '</label><select class="select" id="' + id + '" data-f="' + path + '"' + DIS() + ">" +
        W.pages.map(function (p) { var pp = PAGE_META[p].path; return '<option value="' + pp + '"' + (pp === v ? " selected" : "") + ">" + esc(p) + " · " + pp + "</option>"; }).join("") + "</select></div>";
    }
    if (type === "cms") {
      var n = CMS[path];
      var show = s.key === "announcements"
        ? segField("ins-count", "Show on page", ["3", "6"], String(s.f.count), { 3: "3 latest", 6: "All " + n })
        : '<p class="pg-note">Shows all ' + n + " entries, newest first.</p>";
      return '<div class="cms-src"><b>' + esc(path) + '</b><button type="button" class="btn btn-outline btn-sm" data-cms="' + esc(path) + '">' + ic("external-link") + "Open CMS</button><span>CMS collection · " + n + " entries</span></div>" + show;
    }
    return "";
  }
  function sectionPanel() {
    var s = selected();
    if (!s) return '<p class="scope-note">Select a section in the outline or on the canvas.</p>';
    var list = secs(), i = list.indexOf(s), lk = locked();
    var state = s.required ? '<span class="tag tag-info">' + ic("lock", 11) + "Required</span>" : s.visible ? '<span class="tag tag-ok">Visible</span>' : '<span class="tag">Hidden</span>';
    var headHTML = '<div class="ins-head"><div class="ins-key"><code>' + esc(s.id) + "</code>" + state + '</div><h2 class="ins-title">' + esc(s.label) + '</h2><p class="ins-meta">' + esc(PAGE_META[ui.page].path) + " › " + pad2(i + 1) + " of " + pad2(list.length) + "</p></div>";
    var vis = s.required
      ? '<div class="field field-horizontal pf"><span class="label">Visible</span><span class="pf-inline"><input type="checkbox" class="switch" role="switch" checked disabled aria-label="Visible, required"><span class="pf-help">Required — always shown</span></span></div>'
      : '<div class="field field-horizontal pf"><label class="label" for="ins-vis">Visible</label><span class="pf-inline"><input type="checkbox" class="switch" role="switch" id="ins-vis" data-ins-vis' + (s.visible ? " checked" : "") + DIS() + '><span class="pf-help">' + (s.visible ? "Shown on the site" : "Hidden on the site") + "</span></span></div>";
    var order = '<div class="field field-horizontal pf"><span class="label">Order</span><div class="btn-row">' +
      '<button type="button" class="btn btn-outline btn-sm btn-icon" id="ins-up" data-ins="up" aria-label="Move up" title="Move up"' + (lk || i === 0 ? " disabled" : "") + ">" + ic("chevron-up") + "</button>" +
      '<button type="button" class="btn btn-outline btn-sm btn-icon" id="ins-down" data-ins="down" aria-label="Move down" title="Move down"' + (lk || i === list.length - 1 ? " disabled" : "") + ">" + ic("chevron-down") + "</button>" +
      '<button type="button" class="btn btn-outline btn-sm" id="ins-dup" data-ins="dup"' + DIS() + ">" + ic("copy") + "Duplicate</button></div></div>";
    var content = (FIELDS[s.key] || []).map(function (spec) { return fieldHTML(s, spec); }).join("");
    var cover = s.key === "hero" && TPL[doc.template].hero === "cover";
    var layout = cover ? '<p class="pg-note">The Crestview hero always sits on the secondary colour.</p>' : segField("ins-bg", "Background", ["plain", "tint", "brand"], s.bg);
    return headHTML + group("Section", vis + order) + group("Content", content, s.key === "hero" ? "updates the preview as you type" : "") + group("Layout", layout);
  }
  function stylePanel() {
    var t = doc.theme, tpl = tplById(doc.template), b = BASES[t.base], f = FONTS[t.font];
    var crCell = function (n, hex) { var c = crInfo(hex); return '<td class="tok-cr" id="tk-' + n + '-cr" data-state="' + c.state + '" title="Contrast of text on this colour">' + c.txt + "</td>"; };
    var tokRow = function (n, label) {
      return '<tr><td class="tok-name">' + n + "<small>" + label + "</small></td>" +
        '<td class="tok-swc"><input type="color" class="tok-sw" id="tk-' + n + '-c" data-tok-c="' + n + '" value="' + t[n].toLowerCase() + '" aria-label="' + n + ' colour picker"' + DIS() + "></td>" +
        '<td class="tok-hexc"><input class="input tok-hex" id="tk-' + n + '-h" data-tok-h="' + n + '" value="' + esc(t[n]) + '" maxlength="7" spellcheck="false" autocomplete="off" aria-label="' + n + ' hex value" aria-describedby="tok-err"' + DIS() + "></td>" + crCell(n, t[n]) + "</tr>";
    };
    var roRow = function (n, label, hex, against) {
      var r = ratio(hex, against);
      return '<tr><td class="tok-name">' + n + "<small>" + label + '</small></td><td class="tok-swc"><span class="tok-sw" style="background:' + hex + '"></span></td><td class="tok-hexc"><span class="tok-ro">' + hex + '</span></td><td class="tok-cr" data-state="' + (r >= 4.5 ? "ok" : "warn") + '">' + r.toFixed(1) + " AA</td></tr>";
    };
    var g1 = group("Template & preset",
      '<div class="field field-horizontal pf"><span class="label">Template</span><span class="pf-inline"><b>' + esc(tpl.name) + '</b><span class="count">' + esc(tpl.mood) + '</span><button type="button" class="btn btn-ghost btn-sm" id="st-tpl">Change</button></span></div>' +
      '<div class="field field-horizontal pf"><label class="label" for="st-preset">Preset</label><select class="select" id="st-preset"' + DIS() + ">" +
      W.theme.presets.map(function (p) { return '<option value="' + p + '"' + (p === t.preset ? " selected" : "") + ">" + esc(PRESETS[p].label) + "</option>"; }).join("") + "</select></div>" +
      '<p class="pg-note" id="st-mod"' + (isModified() ? "" : " hidden") + '><span class="tag tag-warn">Edited</span> Values differ from the ' + esc(PRESETS[t.preset].label) + " preset.</p>");
    var g2 = group("Colour tokens",
      segField("st-base", "Base colour", W.theme.baseColors, t.base) +
      '<table class="tok"><caption class="sr-only">Website colour tokens</caption><colgroup><col class="c-name"><col class="c-sw"><col class="c-hex"><col></colgroup>' +
      '<thead><tr><th scope="col">Token</th><th scope="col"><span class="sr-only">Swatch</span></th><th scope="col">Hex</th><th scope="col">Text</th></tr></thead><tbody>' +
      tokRow("primary", "Buttons, links") + tokRow("secondary", "Header, footer") + tokRow("accent", "Highlights") +
      roRow("surface", "From base", b.bg, b.ink) + roRow("ink", "From base", b.ink, b.bg) + "</tbody></table>" +
      '<p class="tok-err" id="tok-err" hidden>Use a 6-digit hex colour, like #0F766E.</p>' +
      '<div class="pfv"><span class="label" id="sw-l">Primary swatches</span><div class="swatches" role="radiogroup" aria-labelledby="sw-l">' +
      W.theme.swatches.map(function (h) { var on = h.toUpperCase() === t.primary.toUpperCase(); return '<button type="button" class="swatch" id="sw-' + h.slice(1) + '" data-sw="' + h + '" role="radio" aria-checked="' + on + '" aria-label="' + h.toUpperCase() + '" title="' + h.toUpperCase() + '" style="background:' + h + '"' + DIS() + "></button>"; }).join("") +
      "</div></div>");
    var g3 = group("Shape & rhythm", segField("st-radius", "Radius", W.theme.radius, t.radius) + segField("st-density", "Density", W.theme.density, t.density));
    var g4 = group("Type",
      '<div class="field field-horizontal pf"><label class="label" for="st-font">Headings</label><select class="select" id="st-font" name="st-font"' + DIS() + ">" +
      Object.keys(FONTS).map(function (k) { return '<option value="' + k + '"' + (k === t.font ? " selected" : "") + ">" + esc(FONTS[k].label) + "</option>"; }).join("") + "</select></div>" +
      '<p class="font-sample" style="font-family:' + esc(f.stack.replace(/"/g, "'")) + ";font-weight:" + f.w + '">' + esc(secs(doc, "Home")[0].f.title || SCH.name) + "<small>" + esc(f.label) + " · system font stack</small></p>");
    var g5 = group("Navigation", segField("st-menu", "Menu style", W.theme.menu, t.menu));
    var note = '<p class="scope-note">' + ic("info", 14) + "<span>These settings style the school's website only. The editor keeps its own look.</span></p>";
    return '<h2 class="sr-only">Website style</h2>' + g1 + g2 + g3 + g4 + g5 + note;
  }
  function seoPanel() {
    var s = doc.seo[ui.page], m = PAGE_META[ui.page], url = "kingsway.school-clerk.com" + (m.path === "/" ? "" : m.path);
    return '<div class="ins-head"><div class="ins-key"><code>' + esc(m.path) + "</code>" + (s.index ? '<span class="tag tag-ok">Indexed</span>' : '<span class="tag">Not indexed</span>') + '</div><h2 class="ins-title">' + esc(ui.page) + ' · search listing</h2><p class="ins-meta">' + esc(url) + "</p></div>" +
      group("Search listing",
        '<div class="pfv"><div class="pfv-row"><label class="label" for="seo-title">Page title</label><span class="count" id="seo-title-n"></span></div><input class="input" id="seo-title" data-seo="title" value="' + esc(s.title) + '" autocomplete="off" aria-describedby="seo-title-n"' + DIS() + '><div class="meter" id="seo-title-m"><span></span></div></div>' +
        '<div class="pfv"><div class="pfv-row"><label class="label" for="seo-desc">Description</label><span class="count" id="seo-desc-n"></span></div><textarea class="textarea" id="seo-desc" data-seo="desc" rows="4" aria-describedby="seo-desc-n seo-desc-h"' + DIS() + ">" + esc(s.desc) + '</textarea><div class="meter" id="seo-desc-m"><span></span></div><p class="field-description" id="seo-desc-h">Aim for 70–160 characters. Search engines cut longer text.</p></div>' +
        '<div class="pfv"><span class="label">Address</span><span class="url-ro">' + esc(url) + "</span></div>" +
        '<label class="choice" for="seo-index"><input type="checkbox" class="switch" role="switch" id="seo-index" data-seo-index' + (s.index ? " checked" : "") + DIS() + '><span class="pf-help">Show this page in search results</span></label>') +
      group("Snippet preview", '<div class="serp" id="serp" aria-live="polite"></div>', "approximate");
  }
  function renderInspector() {
    Object.keys(el.panels).forEach(function (k) { el.panels[k].hidden = k !== ui.tab; });
    $$(".rp-tabs [role=tab]").forEach(function (t) { var on = t.id === "tab-" + ui.tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    if (ui.tab === "section") el.panels.section.innerHTML = sectionPanel();
    else if (ui.tab === "style") el.panels.style.innerHTML = stylePanel();
    else { el.panels.seo.innerHTML = seoPanel(); refreshSeo(); }
  }
  function meter(id, n, max, min) {
    var st = n > max ? "over" : n < min ? "warn" : "ok";
    var c = $("#" + id + "-n"), m = $("#" + id + "-m");
    if (c) { c.textContent = n + " / " + max; c.setAttribute("data-state", st); }
    if (m) { m.setAttribute("data-state", st); m.firstElementChild.style.width = Math.min(100, (n / max) * 100) + "%"; }
  }
  function refreshSeo() {
    if (ui.tab !== "seo") return;
    var s = doc.seo[ui.page], m = PAGE_META[ui.page];
    var trunc = function (str, n) { return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str; };
    meter("seo-title", s.title.length, 60, 30);
    meter("seo-desc", s.desc.length, 160, 70);
    var serp = $("#serp");
    if (!serp) return;
    serp.innerHTML = '<div class="serp-site"><span class="serp-fav" style="background:' + doc.theme.primary + ";color:" + onColor(doc.theme.primary) + '">' + esc(SCH.initials) + '</span><span class="serp-name"><b>' + esc(SCH.name) + "</b><span>https://kingsway.school-clerk.com" + (m.path === "/" ? "" : " › " + esc(m.path.slice(1))) + "</span></span></div>" +
      '<p class="serp-title">' + esc(trunc(s.title || ui.page, 60)) + '</p><p class="serp-desc">' + esc(trunc(s.desc || "No description yet. Search engines will pick text from the page.", 160)) + "</p>" +
      (s.index ? "" : '<p class="pg-note">' + ic("eye-off", 12) + " Hidden from search results.</p>");
  }
  function refreshStyle() {
    if (ui.tab !== "style") return;
    ["primary", "secondary", "accent"].forEach(function (n) {
      var v = doc.theme[n], c = $("#tk-" + n + "-c"), h = $("#tk-" + n + "-h"), cr = $("#tk-" + n + "-cr");
      if (c && c.value.toUpperCase() !== v.toUpperCase()) c.value = v.toLowerCase();
      if (h && document.activeElement !== h) { h.value = v; h.removeAttribute("aria-invalid"); }
      if (cr) { var ci = crInfo(v); cr.textContent = ci.txt; cr.setAttribute("data-state", ci.state); }
    });
    $$(".swatch", el.panels.style).forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-sw").toUpperCase() === doc.theme.primary.toUpperCase())); });
    var mod = $("#st-mod"); if (mod) mod.hidden = !isModified();
    var err = $("#tok-err"); if (err) err.hidden = !$$(".tok-hex[aria-invalid='true']", el.panels.style).length;
  }

  /* ------------------------------------------------------------------ */
  /* Canvas: fit, selection, blocked links                               */
  /* ------------------------------------------------------------------ */
  function fitFrame(F, W0) {
    var cs = getComputedStyle(F.stage);
    var avail = F.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
    if (!(avail > 40)) return;
    var s = Math.min(1, avail / W0);
    F.scale = s;
    F.frame.style.width = Math.floor(W0 * s) + 2 + "px";
    F.site.style.width = W0 + "px";
    F.site.style.transform = s === 1 ? "none" : "scale(" + s + ")";
    F.site.style.setProperty("--inv", (1 / s).toFixed(4));
    F.vp.style.height = Math.ceil(F.site.offsetHeight * s) + "px";
    F.ruler.style.setProperty("--tick", (40 * s).toFixed(2) + "px");
    F.ruler.style.setProperty("--tick-major", (200 * s).toFixed(2) + "px");
    var w = F.ruler.querySelector(".ruler-w"), n = F.ruler.querySelector(".ruler-n");
    w.innerHTML = "<b>" + W0 + " px</b><span>· " + Math.round(s * 100) + "%</span>";
    n.textContent = W0;
  }
  function fit() {
    if (ui.mode === "picker") fitFrame(pkF, 1280);
    else { fitFrame(mainF, DEVICES[ui.device].w); positionSel(); }
  }
  function secEl(id) { return id ? el.site.querySelector('[data-sec="' + CSS.escape(id) + '"]') : null; }
  function placeBox(box, node) {
    var s = mainF.scale;
    box.style.top = node.offsetTop * s + "px";
    box.style.height = Math.max(node.offsetHeight * s, 20) + "px";
  }
  function positionSel() {
    var node = ui.mode === "editor" ? secEl(ui.sel) : null;
    el.selbox.hidden = !node;
    if (!node) return;
    placeBox(el.selbox, node);
    var s = selected();
    el.selTag.textContent = s ? s.id + " · " + s.label : "";
  }
  function revealSel() {
    requestAnimationFrame(function () {
      if (el.selbox.hidden) return;
      var r = el.selbox.getBoundingClientRect(), sr = el.stage.getBoundingClientRect();
      if (r.top < sr.top + 8 || r.top > sr.bottom - 80) el.stage.scrollBy({ top: r.top - sr.top - 40, behavior: SC.reduced() ? "auto" : "smooth" });
    });
  }
  var noticeT = null;
  function notice(html, ms) {
    el.notice.innerHTML = html;
    clearTimeout(noticeT);
    noticeT = setTimeout(function () { el.notice.innerHTML = ""; }, ms || 4500);
  }
  function lockedNudge() {
    notice('Live version is read-only <button type="button" data-dup>Duplicate to edit</button>');
    announce("This version is live and read-only. Duplicate it to edit.");
  }
  function blocked(a) {
    if (a.classList.contains("s-burger")) { notice("The menu opens on the live site"); return; }
    var href = a.getAttribute("data-href") || "";
    var page = Object.keys(PAGE_META).filter(function (p) { return PAGE_META[p].path === href; })[0];
    if (!page) { notice("Link blocked in the editor · <mark>" + esc(EXT[href] || href) + "</mark>"); return; }
    notice("Link blocked in the editor · <mark>" + esc(href) + "</mark>" + (page !== ui.page && ui.mode !== "picker" ? ' <button type="button" data-goto="' + esc(page) + '">Open ' + esc(page) + "</button>" : ""));
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */
  function select(id, opts) {
    opts = opts || {};
    if (!secs().some(function (s) { return s.id === id; })) return;
    ui.sel = id;
    if (ui.tab !== "section") ui.tab = "section";
    withFocus(function () { renderStack(); renderInspector(); });
    positionSel();
    if (opts.from !== "canvas") revealSel();
    if (opts.focus) focusRow(id);
  }
  function focusRow(id) { var b = document.getElementById("sec-" + id); if (b) b.focus(); }
  function editSelected() {
    if (narrow()) setPane("props");
    if (ui.tab !== "section") { ui.tab = "section"; renderInspector(); }
    var f = el.panels.section.querySelector(".pg:nth-of-type(2) input:not([disabled]), .pg:nth-of-type(2) textarea:not([disabled]), .pg:nth-of-type(2) select:not([disabled])");
    if (f) f.focus();
  }
  function moveSec(id, dir) {
    var list = secs(), i = list.findIndex(function (s) { return s.id === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    var label = list[i].label;
    if (!commit(function (d) { var l = d.pages[ui.page]; l.splice(j, 0, l.splice(i, 1)[0]); })) return;
    announce(label + " moved to position " + (j + 1) + " of " + list.length);
  }
  function allIds() { var set = {}; Object.keys(doc.pages).forEach(function (p) { doc.pages[p].forEach(function (s) { set[s.id] = 1; }); }); return set; }
  function dupSec(id) {
    var src = secs().filter(function (s) { return s.id === id; })[0];
    if (!src) return;
    var ids = allIds(), n = 2;
    while (ids[src.key + "-" + n]) n++;
    var nid = src.key + "-" + n;
    if (!commit(function (d) {
      var l = d.pages[ui.page], i = l.findIndex(function (s) { return s.id === id; }), c = clone(l[i]);
      c.id = nid; c.required = false; c.visible = true; c.label = c.label.replace(/ \(copy\)$/, "") + " (copy)";
      l.splice(i + 1, 0, c); ui.sel = nid;
    })) return;
    focusRow(nid);
    announce("Duplicated " + src.label + " as " + nid);
  }
  function toggleVis(id) {
    var s = secs().filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    if (s.required) { notice("Required sections stay visible"); return; }
    var next = !s.visible;
    if (commit(function (d) { findSec(d, id).visible = next; })) announce(s.label + (next ? " shown" : " hidden"));
  }
  function setPage(p) {
    if (!doc.pages[p] || p === ui.page) return;
    ui.page = p; ui.sel = (doc.pages[p][0] || {}).id;
    el.stage.scrollTop = 0; el.hov.hidden = true;
    renderAll();
    announce(p + " page");
  }
  function setDevice(d) {
    if (!DEVICES[d]) return;
    ui.device = d; el.hov.hidden = true;
    renderTopbar(); fit();
    el.widthSr.textContent = DEVICES[d].label + " preview, " + DEVICES[d].w + " pixels wide";
  }
  function setPane(p) {
    ui.pane = p; el.ide.setAttribute("data-pane", p);
    $$(".paneswitch [data-pane]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-pane") === p)); });
    if (p === "canvas") requestAnimationFrame(fit);
  }
  function setTab(tab) { ui.tab = tab; withFocus(renderInspector); }
  function setPreview(on) {
    if (ui.mode === "picker") return;
    ui.mode = on ? "preview" : "editor";
    el.ide.setAttribute("data-mode", ui.mode);
    document.body.setAttribute("data-mode", ui.mode);
    el.exitPreview.hidden = !on; el.hov.hidden = true;
    closeRowMenu(false);
    renderTopbar(); renderSite();
    requestAnimationFrame(fit);
    (on ? el.exitPreview : el.preview).focus();
    announce(on ? "Preview mode. Links are blocked. Press Escape to exit." : "Back to editing");
  }
  function openPicker() {
    closeRowMenu(false);
    if (ui.mode === "preview") setPreview(false);
    ui.mode = "picker"; ui.pk = doc.template;
    document.body.setAttribute("data-mode", "picker");
    el.ide.hidden = true; el.picker.hidden = false;
    renderTopbar(); renderPicker();
    requestAnimationFrame(function () { fit(); $("#pk-title").focus(); });
  }
  function closePicker() {
    if (ui.mode !== "picker") return;
    ui.mode = "editor";
    document.body.setAttribute("data-mode", "editor");
    el.picker.hidden = true; el.ide.hidden = false;
    renderAll();
    requestAnimationFrame(function () { fit(); el.tplBtn.focus(); });
  }
  function renderPicker() {
    el.pkCount.textContent = W.templates.length;
    withFocus(function () {
      el.pkList.innerHTML = W.templates.map(function (t) {
        var lk = tplLocked(t), cur = t.id === doc.template, foc = t.id === ui.pk;
        var create = lk
          ? '<button type="button" class="btn btn-secondary btn-sm" disabled aria-describedby="pk-lock-' + t.id + '">' + ic("lock") + "Create draft</button>"
          : cur ? '<button type="button" class="btn btn-secondary btn-sm" id="pk-keep-' + t.id + '" data-pk-close>Keep editing</button>'
            : '<button type="button" class="btn btn-default btn-sm" id="pk-create-' + t.id + '" data-pk-create="' + t.id + '">Create draft</button>';
        return '<li class="pk-card"' + (foc ? " data-focus" : "") + ">" +
          '<div class="pk-thumb">' + thumbSVG(t.id) + (lk ? '<span class="pk-lock"><span>' + ic("lock", 12) + "PRO+</span></span>" : "") + "</div>" +
          '<div class="pk-meta"><div class="pk-name"><h3>' + esc(t.name) + "</h3>" + (cur ? '<span class="tag tag-ok">Current</span>' : "") + (lk ? '<span class="tag tag-warn">' + ic("lock", 11) + "PRO+</span>" : "") + "</div>" +
          '<p class="pk-id">' + esc(t.mood) + " · " + t.pages + " pages · " + esc(t.plan) + "</p>" +
          '<p class="pk-desc">' + esc(t.desc) + "</p>" +
          (lk ? '<p class="pk-id" id="pk-lock-' + t.id + '">Available on PRO+ plans. Preview it any time.</p>' : "") +
          '<div class="pk-actions"><button type="button" class="btn btn-outline btn-sm" id="pk-prev-' + t.id + '" data-pk-preview="' + t.id + '" aria-pressed="' + foc + '">' + ic("eye") + "Preview</button>" + create + "</div></div></li>";
      }).join("");
    });
    renderPickerPreview();
  }
  function renderPickerPreview() {
    var t = tplById(ui.pk), d = clone(doc);
    d.template = t.id;
    if (t.id !== doc.template) d.theme = presetTheme(TPL[t.id].preset);
    applyTheme(el.pkSite, d);
    el.pkSite.innerHTML = siteHTML(d, "Home", false);
    el.pkName.textContent = t.name + " · " + PRESETS[d.theme.preset].label + " · Home";
    fit();
  }
  function createDraft(id) {
    var t = tplById(id);
    if (!t || tplLocked(t)) return;
    if (locked()) startDraft(true);
    commit(function (d) { d.template = id; d.theme = presetTheme(TPL[id].preset); });
    closePicker();
    SC.toast("Draft created from " + t.name, "Your content was kept. The live site doesn't change until you publish.", "layout-template");
  }
  function startDraft(silent) {
    if (!locked()) return;
    ui.status = "draft"; ui.editedAt = Date.now(); ui.saving = "";
    hist.past = []; hist.future = []; hist.key = null;
    renderAll();
    if (!silent) {
      SC.toast("Draft created", "Copied from the live version. Edits stay private until you publish.", "copy");
      announce("Draft created. You can edit now.");
    }
  }
  function cmsToast(name) {
    SC.toast(name + " · " + (CMS[name] || 0) + " entries", "The CMS opens in the dashboard. Not part of this preview.", "newspaper");
  }
  function revealCms() {
    if (ui.mode === "preview") setPreview(false);
    if (ui.mode === "picker") closePicker();
    if (narrow()) setPane("outline");
    var g = $("#cms-group");
    g.scrollIntoView({ block: "nearest", behavior: SC.reduced() ? "auto" : "smooth" });
    g.setAttribute("data-flash", "");
    setTimeout(function () { g.removeAttribute("data-flash"); }, 1400);
    var b = g.querySelector(".cms-open"); if (b) b.focus({ preventScroll: true });
  }

  /* ---------- Publish & archive ---------- */
  var tableRows = function (rows) { return "<tbody>" + rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</tbody>"; };
  var visibleTotal = function () { return W.pages.reduce(function (a, p) { return a + doc.pages[p].filter(shown).length; }, 0); };
  function openPublish() {
    if (ui.mode === "picker" || publishing) return;
    if (locked()) { SC.toast("Already live", "This version is on the live site. Duplicate it to make changes.", "info"); return; }
    var t = tplById(doc.template);
    $("#pub-title").textContent = "Publish this draft?";
    $("#pub-table").innerHTML = tableRows([["Site", "kingsway.school-clerk.com"], ["Template", t.name + " · " + PRESETS[doc.theme.preset].label], ["Pages", W.pages.length], ["Visible sections", visibleTotal()], ["Draft edited", ago(ui.editedAt)], ["Replaces", "Live since " + ui.liveSince]]);
    $("#pub-table").hidden = false; $("#pub-run").hidden = true;
    $("#pub-go").disabled = false; $("#pub-cancel").disabled = false;
    $("#pub-bar").style.width = "0%";
    SC.open(el.dlgPub);
  }
  function runPublish() {
    if (publishing || el.dlgPub.getAttribute("data-open") !== "true") return;
    publishing = true;
    var go = $("#pub-go"), cancel = $("#pub-cancel"), ov = el.dlgPub.previousElementSibling, title = $("#pub-title");
    go.disabled = true; cancel.disabled = true;
    if (ov && ov.classList.contains("overlay")) ov.style.pointerEvents = "none";
    title.textContent = "Publishing…"; title.tabIndex = -1; title.focus({ preventScroll: true });
    $("#pub-table").hidden = true; $("#pub-run").hidden = false;
    var steps = ["Checking " + W.pages.length + " pages", "Building " + visibleTotal() + " sections", "Compiling theme tokens", "Switching the live version"];
    var log = $("#pub-log"), bar = $("#pub-bar"), pb = $("#pub-progress"), dt = SC.reduced() ? 120 : 520;
    log.innerHTML = steps.map(function (s) { return '<li data-state="wait"><span>' + esc(s) + '</span><span class="st">—</span></li>'; }).join("");
    pb.setAttribute("aria-valuenow", "0");
    var chain = Promise.resolve();
    steps.forEach(function (s, i) {
      chain = chain.then(function () {
        var li = log.children[i];
        li.setAttribute("data-state", "run"); li.lastElementChild.textContent = "…";
        return wait(dt).then(function () {
          li.setAttribute("data-state", "done"); li.lastElementChild.textContent = "ok";
          var pct = Math.round(((i + 1) / steps.length) * 100);
          bar.style.width = pct + "%"; pb.setAttribute("aria-valuenow", String(pct));
        });
      });
    });
    chain.then(function () { return wait(SC.reduced() ? 60 : 280); }).then(function () {
      publishing = false;
      if (ov) ov.style.pointerEvents = "";
      SC.close(el.dlgPub);
      ui.status = "live"; ui.liveSince = fmtDate(new Date());
      liveDoc = clone(doc);
      hist.past = []; hist.future = []; hist.key = null;
      renderAll();
      SC.toast("Published", "kingsway.school-clerk.com now shows this version.", "circle-check");
      announce("Published. Status is now live.");
    });
  }
  function openArchive() {
    if (locked()) return;
    $("#arc-table").innerHTML = tableRows([["Draft", "Edited " + ago(ui.editedAt)], ["Template", tplById(doc.template).name], ["Live version", "Since " + ui.liveSince]]);
    SC.open(el.dlgArc);
  }
  function runArchive() {
    if (el.dlgArc.getAttribute("data-open") !== "true") return;
    SC.close(el.dlgArc);
    doc = clone(liveDoc); ui.status = "live";
    hist.past = []; hist.future = []; hist.key = null;
    if (!secs().some(function (s) { return s.id === ui.sel; })) ui.sel = (secs()[0] || {}).id;
    renderAll();
    SC.toast("Draft archived", "The editor shows the live version. Duplicate it to keep editing.", "folder");
  }

  /* ---------- Row actions menu ---------- */
  var rowMenuFor = null;
  function openRowMenu(id, btn) {
    var list = secs(), i = list.findIndex(function (s) { return s.id === id; }), s = list[i], lk = locked(), alt = IS_MAC ? "⌥" : "Alt+";
    var item = function (act, icon, label, kbd, dis) {
      return '<button type="button" class="menu-item" role="menuitem" data-act="' + act + '"' + (dis ? " disabled" : "") + ">" + ic(icon) + label + (kbd ? '<span class="menu-shortcut">' + kbd + "</span>" : "") + "</button>";
    };
    el.rowMenu.innerHTML = '<div class="menu-label mono">' + esc(s.id) + "</div>" +
      item("up", "chevron-up", "Move up", alt + "↑", lk || i === 0) +
      item("down", "chevron-down", "Move down", alt + "↓", lk || i === list.length - 1) +
      item("dup", "copy", "Duplicate", "D", lk) +
      '<div class="menu-sep" role="separator"></div>' +
      (s.required ? '<div class="menu-label">' + ic("lock", 12) + "Required · always shown</div>" : item("vis", s.visible ? "eye-off" : "eye", s.visible ? "Hide section" : "Show section", "V", lk));
    el.rowMenu.hidden = false;
    rowMenuFor = { id: id, btn: btn };
    btn.setAttribute("aria-expanded", "true");
    var r = btn.getBoundingClientRect(), mw = el.rowMenu.offsetWidth, mh = el.rowMenu.offsetHeight;
    var top = r.bottom + 4;
    if (top + mh > window.innerHeight - 8) top = r.top - mh - 4;
    el.rowMenu.style.top = Math.max(8, top) + "px";
    el.rowMenu.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)) + "px";
    var first = el.rowMenu.querySelector(".menu-item:not([disabled])");
    if (first) first.focus();
  }
  function closeRowMenu(refocus) {
    if (!rowMenuFor) return;
    el.rowMenu.hidden = true;
    var id = rowMenuFor.id, b = document.getElementById("more-" + id) || rowMenuFor.btn;
    rowMenuFor = null;
    if (b) { b.setAttribute("aria-expanded", "false"); if (refocus) b.focus(); }
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  // Platform-correct shortcut labels
  $$('[data-kbd="publish"]').forEach(function (k) { k.textContent = IS_MAC ? "⌘⇧P" : "Ctrl⇧P"; });
  $$('[data-kbd="enter"]').forEach(function (k) { k.textContent = IS_MAC ? "⌘↵" : "Ctrl↵"; });
  $$('[data-kbd="alt"]').forEach(function (k) { k.textContent = IS_MAC ? "⌥" : "Alt"; });
  el.publish.title = "Publish · " + (IS_MAC ? "⌘⇧P" : "Ctrl+Shift+P");
  el.undo.title = "Undo · " + (IS_MAC ? "⌘Z" : "Ctrl+Z");
  el.redo.title = "Redo · " + (IS_MAC ? "⌘⇧Z" : "Ctrl+Y");

  // Top bar
  $$("[data-device]").forEach(function (b) { b.addEventListener("click", function () { setDevice(b.getAttribute("data-device")); }); });
  el.undo.addEventListener("click", undo);
  el.redo.addEventListener("click", redo);
  el.pageSel.addEventListener("change", function () { setPage(el.pageSel.value); });
  el.preview.addEventListener("click", function () { setPreview(ui.mode !== "preview"); });
  el.exitPreview.addEventListener("click", function () { setPreview(false); });
  el.tplBtn.addEventListener("click", function () { if (ui.mode === "picker") closePicker(); else openPicker(); });
  el.publish.addEventListener("click", openPublish);
  el.more.addEventListener("click", function () {
    setTimeout(function () { if (!el.moreMenu.hidden) { var f = el.moreMenu.querySelector(".menu-item:not([disabled])"); if (f) f.focus(); } }, 0);
  });
  $("#mi-duplicate").addEventListener("click", function () { startDraft(); });
  $("#mi-archive").addEventListener("click", openArchive);
  $("#mi-template").addEventListener("click", openPicker);
  $("#mi-media").addEventListener("click", function () { SC.toast("Website media", "Media lives in Settings › Website Media in the dashboard. Not part of this preview.", "images"); });
  $("#mi-cms").addEventListener("click", revealCms);
  $("#pub-go").addEventListener("click", runPublish);
  $("#arc-go").addEventListener("click", runArchive);
  $("#lock-duplicate").addEventListener("click", function () { startDraft(); });

  // Panes (< 1024px)
  $$(".paneswitch [data-pane]").forEach(function (b) { b.addEventListener("click", function () { setPane(b.getAttribute("data-pane")); }); });

  // Page tree
  el.tree.addEventListener("click", function (e) { var b = e.target.closest("[data-page]"); if (b) setPage(b.getAttribute("data-page")); });

  // CMS buttons (outline table + inspector)
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-cms]");
    if (b) cmsToast(b.getAttribute("data-cms"));
  });

  // Section stack: select, visibility, menu
  el.stack.addEventListener("click", function (e) {
    var main = e.target.closest(".sec-main");
    if (main) { select(main.getAttribute("data-id")); return; }
    var more = e.target.closest(".sec-more");
    if (more) {
      var id = more.getAttribute("data-more");
      if (rowMenuFor && rowMenuFor.id === id) closeRowMenu(true); else { closeRowMenu(false); openRowMenu(id, more); }
    }
  });
  el.stack.addEventListener("change", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-vis")) toggleVis(t.getAttribute("data-vis"));
  });
  el.stack.addEventListener("keydown", function (e) {
    var b = e.target.closest(".sec-main");
    if (!b) return;
    var id = b.getAttribute("data-id"), list = secs(), i = list.findIndex(function (s) { return s.id === id; });
    var up = e.key === "ArrowUp", down = e.key === "ArrowDown";
    if ((up || down) && e.altKey) { e.preventDefault(); moveSec(id, up ? -1 : 1); focusRow(id); return; }
    if (up || down || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      var j = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : Math.max(0, Math.min(list.length - 1, i + (up ? -1 : 1)));
      select(list[j].id, { focus: true });
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "d" || e.key === "D") { e.preventDefault(); dupSec(id); }
    else if (e.key === "v" || e.key === "V") { e.preventDefault(); toggleVis(id); focusRow(id); }
    else if (e.key === "Enter") { e.preventDefault(); select(id); editSelected(); }
  });

  // Drag to reorder (pointer events: mouse, pen and touch)
  var drag = null;
  el.stack.addEventListener("pointerdown", function (e) {
    var h = e.target.closest(".sec-handle");
    if (!h || locked() || e.button > 0) return;
    var li = h.closest(".sec"), rows = $$(".sec", el.stack), from = rows.indexOf(li);
    e.preventDefault();
    closeRowMenu(false);
    drag = { li: li, rows: rows, from: from, to: from, y0: e.clientY, h: li.offsetHeight, mids: rows.map(function (r) { var b = r.getBoundingClientRect(); return b.top + b.height / 2; }) };
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
    li.classList.add("is-dragging");
    el.stack.classList.add("is-sorting");
  });
  el.stack.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dy = e.clientY - drag.y0, y = drag.mids[drag.from] + dy, to = 0;
    drag.li.style.transform = "translateY(" + dy + "px)";
    drag.mids.forEach(function (m, i) { if (i !== drag.from && y > m) to++; });
    drag.to = to;
    drag.rows.forEach(function (r, i) {
      if (i === drag.from) return;
      var k = i < drag.from ? i : i - 1, shift = 0;
      if (i < drag.from && k >= to) shift = drag.h;
      if (i > drag.from && k < to) shift = -drag.h;
      r.style.transform = shift ? "translateY(" + shift + "px)" : "";
    });
  });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    d.rows.forEach(function (r) { r.style.transform = ""; });
    d.li.classList.remove("is-dragging");
    el.stack.classList.remove("is-sorting");
    if (d.to === d.from) return;
    var label = secs()[d.from].label, id = secs()[d.from].id;
    if (commit(function (doc0) { var l = doc0.pages[ui.page]; l.splice(d.to, 0, l.splice(d.from, 1)[0]); ui.sel = id; })) announce(label + " moved to position " + (d.to + 1));
  }
  el.stack.addEventListener("pointerup", endDrag);
  el.stack.addEventListener("pointercancel", endDrag);

  // Row menu
  el.rowMenu.addEventListener("click", function (e) {
    var it = e.target.closest("[data-act]");
    if (!it || it.disabled || !rowMenuFor) return;
    var id = rowMenuFor.id, act = it.getAttribute("data-act");
    closeRowMenu(false);
    if (act === "up") moveSec(id, -1);
    else if (act === "down") moveSec(id, 1);
    else if (act === "dup") dupSec(id);
    else if (act === "vis") toggleVis(id);
    focusRow(ui.sel);
  });
  document.addEventListener("click", function (e) {
    if (rowMenuFor && !el.rowMenu.contains(e.target) && !(e.target.closest && e.target.closest("[data-more]"))) closeRowMenu(false);
  });
  $("#pane-outline .pane-scroll").addEventListener("scroll", function () { closeRowMenu(false); }, { passive: true });
  window.addEventListener("resize", function () { closeRowMenu(false); });

  // Properties: tabs
  var tabList = $(".rp-tabs");
  tabList.addEventListener("click", function (e) { var t = e.target.closest("[role=tab]"); if (t) setTab(t.id.slice(4)); });
  tabList.addEventListener("keydown", function (e) {
    var tabs = $$("[role=tab]", tabList), i = tabs.indexOf(document.activeElement), j = null;
    if (i < 0) return;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") j = (i + tabs.length - 1) % tabs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    setTab(tabs[j].id.slice(4));
    tabs[j].focus();
  });

  // Properties: typing (live preview)
  el.props.addEventListener("input", function (e) {
    var t = e.target, s = selected();
    if (t.hasAttribute("data-f") && t.tagName !== "SELECT") {
      if (!s) return;
      var path = t.getAttribute("data-f"), val = t.value;
      commit(function (d) { setPath(findSec(d, s.id).f, path, val); }, { merge: "f:" + s.id + ":" + path, light: true });
      var c = el.props.querySelector('[data-count="' + t.id + '"]');
      if (c) c.textContent = val.length;
      return;
    }
    if (t.hasAttribute("data-seo")) {
      var k = t.getAttribute("data-seo"), v = t.value;
      commit(function (d) { d.seo[ui.page][k] = v; }, { merge: "seo:" + ui.page + ":" + k, light: true });
      refreshSeo();
      return;
    }
    if (t.hasAttribute("data-tok-c")) {
      var n = t.getAttribute("data-tok-c"), hx = t.value.toUpperCase();
      commit(function (d) { d.theme[n] = hx; }, { merge: "tok:" + n, light: true });
      refreshStyle();
      return;
    }
    if (t.hasAttribute("data-tok-h")) {
      var n2 = t.getAttribute("data-tok-h"), ok = validHex(t.value);
      t.setAttribute("aria-invalid", String(!ok));
      if (ok) { var hv = normHex(t.value); commit(function (d) { d.theme[n2] = hv; }, { merge: "tok:" + n2, light: true }); }
      refreshStyle();
    }
  });
  // Properties: discrete changes (selects, radios, switches)
  el.props.addEventListener("change", function (e) {
    var t = e.target, s = selected();
    if (t.tagName === "SELECT" && t.hasAttribute("data-f") && s) { var p = t.getAttribute("data-f"), v = t.value; commit(function (d) { setPath(findSec(d, s.id).f, p, v); }); return; }
    if (t.hasAttribute("data-ins-vis") && s) { toggleVis(s.id); return; }
    if (t.name === "ins-bg" && s) { var bg = t.value; commit(function (d) { findSec(d, s.id).bg = bg; }); return; }
    if (t.name === "ins-count" && s) { var cnt = Number(t.value); commit(function (d) { findSec(d, s.id).f.count = cnt; }); return; }
    if (t.id === "st-preset") { var pid = t.value; if (commit(function (d) { d.theme = presetTheme(pid); })) announce(PRESETS[pid].label + " preset applied"); return; }
    if (t.name && t.name.indexOf("st-") === 0) { var key = t.name.slice(3), val = t.value; commit(function (d) { d.theme[key] = val; }); return; }
    if (t.hasAttribute("data-seo-index")) { var on = t.checked; commit(function (d) { d.seo[ui.page].index = on; }); return; }
    if (t.hasAttribute("data-tok-h")) {
      if (validHex(t.value)) { t.value = normHex(t.value); t.removeAttribute("aria-invalid"); refreshStyle(); }
    }
  });
  el.props.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || b.disabled) return;
    var act = b.getAttribute("data-ins");
    if (act === "up" || act === "down") {
      moveSec(ui.sel, act === "up" ? -1 : 1);
      var same = $("#ins-" + act), other = $("#ins-" + (act === "up" ? "down" : "up"));
      if (same && same.disabled && other && !other.disabled) other.focus();
    }
    else if (act === "dup") dupSec(ui.sel);
    else if (b.hasAttribute("data-sw")) { var hx = b.getAttribute("data-sw").toUpperCase(); commit(function (d) { d.theme.primary = hx; }); }
    else if (b.id === "st-tpl") openPicker();
  });

  // Canvas: select sections, block navigation, hover outline
  el.site.addEventListener("click", function (e) {
    var link = e.target.closest("a, button");
    if (link) { e.preventDefault(); blocked(link); }
    if (ui.mode !== "editor") return;
    var node = e.target.closest("[data-sec]");
    if (node) select(node.getAttribute("data-sec"), { from: "canvas" });
  });
  el.vp.addEventListener("mousemove", function (e) {
    if (ui.mode !== "editor") return;
    var node = e.target.closest && e.target.closest("[data-sec]");
    if (!node || !el.site.contains(node) || node.getAttribute("data-sec") === ui.sel) { el.hov.hidden = true; return; }
    el.hov.hidden = false;
    placeBox(el.hov, node);
    el.hov.querySelector(".sel-tag").textContent = node.getAttribute("data-sec");
  });
  el.vp.addEventListener("mouseleave", function () { el.hov.hidden = true; });
  $("#sel-edit").addEventListener("click", editSelected);
  el.hiddenBtn.addEventListener("click", function () {
    ui.showHidden = !ui.showHidden;
    el.hiddenBtn.setAttribute("aria-pressed", String(ui.showHidden));
    renderSite();
    announce(ui.showHidden ? "Hidden sections shown as markers" : "Hidden sections not shown");
  });
  el.notice.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-goto")) setPage(b.getAttribute("data-goto"));
    else if (b.hasAttribute("data-dup")) startDraft();
    el.notice.innerHTML = "";
  });

  // Template picker
  el.pkList.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.hasAttribute("data-pk-preview")) {
      ui.pk = b.getAttribute("data-pk-preview");
      renderPicker();
      if (narrow()) $(".pk-preview").scrollIntoView({ block: "start", behavior: SC.reduced() ? "auto" : "smooth" });
    } else if (b.hasAttribute("data-pk-create")) createDraft(b.getAttribute("data-pk-create"));
    else if (b.hasAttribute("data-pk-close")) closePicker();
  });
  $("#pk-close").addEventListener("click", closePicker);
  el.pkVp.addEventListener("click", function (e) { if (e.target.closest("a, button")) e.preventDefault(); });

  // Menus: arrow keys inside any role="menu"
  document.addEventListener("keydown", function (e) {
    var m = e.target.closest && e.target.closest('[role="menu"]');
    if (!m) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].indexOf(e.key) > -1) {
      var items = $$(".menu-item:not([disabled])", m), i = items.indexOf(document.activeElement), j;
      if (!items.length) return;
      if (e.key === "Home") j = 0; else if (e.key === "End") j = items.length - 1;
      else j = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      e.preventDefault();
      items[j].focus();
    } else if (m === el.rowMenu && (e.key === "Escape" || e.key === "Tab")) {
      e.preventDefault();
      closeRowMenu(true);
    }
  });

  // Capture phase: remember open menus, and keep the publish run from being dismissed mid-way
  var moreWasOpen = false;
  window.addEventListener("keydown", function (e) {
    moreWasOpen = !el.moreMenu.hidden;
    if (publishing && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // Global shortcuts
  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey;
    var dialogOpen = !!document.querySelector('.dialog[data-open="true"]');
    if (mod && e.shiftKey && e.code === "KeyP") {
      e.preventDefault();
      if (!dialogOpen) openPublish();
      return;
    }
    if (dialogOpen) {
      if (mod && e.key === "Enter") {
        if (el.dlgPub.getAttribute("data-open") === "true") { e.preventDefault(); runPublish(); }
        else if (el.dlgArc.getAttribute("data-open") === "true") { e.preventDefault(); runArchive(); }
      }
      return;
    }
    if (e.key === "Escape") {
      if (e.defaultPrevented) return;
      if (moreWasOpen) { el.more.focus(); return; }
      if (rowMenuFor) { closeRowMenu(true); return; }
      if (ui.mode === "preview") { setPreview(false); return; }
      if (ui.mode === "picker") { closePicker(); return; }
      return;
    }
    var typing = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
    if (mod && e.code === "KeyZ" && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.code === "KeyY" && !typing) { e.preventDefault(); redo(); }
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { fit(); });
    [el.stage, el.site, el.pkStage, el.pkSite].forEach(function (n) { ro.observe(n); });
  } else {
    window.addEventListener("resize", fit);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  setInterval(function () { if (!locked()) renderStatus(); }, 30000);

  document.body.setAttribute("data-mode", "editor");
  renderCms();
  renderAll();
  setPane("canvas");
})();
