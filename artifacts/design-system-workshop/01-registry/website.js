/* Direction 01 — Registry · Website generator ("editorial workbench").
   Editor chrome follows Registry; the Kingsway site preview is themed only by the tenant's own
   --t-* variables (ADR-0020). Everything is a local simulation: nothing is saved, sent or published. */
(() => {
  "use strict";
  const SC = window.SC;
  const D = SC.data, W = D.website, SCH = D.school;
  const esc = SC.esc;
  const ic = (n, s) => window.SCIcons.icon(n, s || 16);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const pad = (n) => String(n).padStart(2, "0");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const MIN = 60000;

  /* ===================== Tenant theme vocabulary (the school's, not SchoolClerk's) ===================== */
  const BASES = {
    slate: { bg: "#ffffff", surface: "#f8fafc", tint: "#eef2f7", ink: "#0f172a", muted: "#475569", line: "#e2e8f0" },
    zinc: { bg: "#ffffff", surface: "#fafafa", tint: "#f1f1f3", ink: "#18181b", muted: "#52525b", line: "#e4e4e7" },
    neutral: { bg: "#ffffff", surface: "#fafafa", tint: "#f3f3f3", ink: "#171717", muted: "#525252", line: "#e5e5e5" },
    stone: { bg: "#fdfcfb", surface: "#f7f6f4", tint: "#efedea", ink: "#1c1917", muted: "#57534e", line: "#e7e5e4" },
    taupe: { bg: "#fcfaf7", surface: "#f5f0ea", tint: "#ece4da", ink: "#2a221d", muted: "#6b5e53", line: "#e3d9cd" },
  };
  const RADII = { none: [0, 0], sm: [4, 6], md: [8, 10], lg: [12, 16], xl: [16, 24], full: [999, 28] };
  const RADIUS_LABELS = { none: "None", sm: "S", md: "M", lg: "L", xl: "XL", full: "Full" };
  const DENSITY = { compact: 0.78, comfortable: 1, airy: 1.28 };
  const FONTS = {
    charter: { label: "Charter", note: "Book serif", stack: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif", w: 700 },
    didone: { label: "Didone", note: "High-contrast serif", stack: "Didot, 'Bodoni 72', 'Bodoni MT', 'Big Caslon', Georgia, serif", w: 400 },
    slab: { label: "Slab", note: "Sturdy serif", stack: "Rockwell, 'Rockwell Nova', 'Roboto Slab', Georgia, serif", w: 700 },
    grotesk: { label: "Grotesk", note: "Neutral sans", stack: "'Helvetica Neue', Helvetica, Arial, sans-serif", w: 700 },
    geometric: { label: "Geometric", note: "Round sans", stack: "'Avenir Next', Avenir, 'Century Gothic', 'Segoe UI', sans-serif", w: 600 },
    humanist: { label: "Humanist", note: "Warm sans", stack: "Optima, Candara, 'Gill Sans', 'Segoe UI', sans-serif", w: 600 },
  };
  const PRESETS = {
    "classic-academic": { base: "slate", primary: "#1d4ed8", secondary: "#0f1f3d", accent: "#f2b230", radius: "sm", density: "comfortable", heading: "charter", menu: "default" },
    "bright-campus": { base: "zinc", primary: "#6d28d9", secondary: "#1e1340", accent: "#10b981", radius: "lg", density: "comfortable", heading: "geometric", menu: "default" },
    "sunlit-family": { base: "taupe", primary: "#7c2d12", secondary: "#2f2219", accent: "#e9a23b", radius: "xl", density: "airy", heading: "humanist", menu: "solid" },
    "executive-campus": { base: "neutral", primary: "#0f766e", secondary: "#0c1716", accent: "#c9a86a", radius: "none", density: "airy", heading: "didone", menu: "translucent" },
    nova: { base: "zinc", primary: "#be123c", secondary: "#18181b", accent: "#f59e0b", radius: "md", density: "compact", heading: "grotesk", menu: "default" },
    vega: { base: "slate", primary: "#15803d", secondary: "#0b2a1a", accent: "#facc15", radius: "md", density: "comfortable", heading: "slab", menu: "solid" },
    maia: { base: "stone", primary: "#6d28d9", secondary: "#2e1065", accent: "#f472b6", radius: "full", density: "airy", heading: "geometric", menu: "default" },
    mira: { base: "neutral", primary: "#1d4ed8", secondary: "#111827", accent: "#22d3ee", radius: "lg", density: "compact", heading: "grotesk", menu: "translucent" },
    lyra: { base: "taupe", primary: "#7c2d12", secondary: "#1c1917", accent: "#d97706", radius: "sm", density: "comfortable", heading: "didone", menu: "default" },
  };
  const PRESET_LABELS = { "classic-academic": "Classic academic", "bright-campus": "Bright campus", "sunlit-family": "Sunlit family", "executive-campus": "Executive campus", nova: "Nova", vega: "Vega", maia: "Maia", mira: "Mira", lyra: "Lyra" };
  const TEMPLATES = W.templates.map((t) => Object.assign({}, t, { key: t.name.toLowerCase(), locked: t.plan !== "All plans" }));
  const TEMPLATE_PRESET = { scholaris: "classic-academic", northfield: "sunlit-family", crestview: "executive-campus", kaleidoscope: "bright-campus" };
  const DEVICES = { desktop: { w: 1200, label: "Desktop" }, tablet: { w: 768, label: "Tablet" }, mobile: { w: 390, label: "Mobile" } };
  const PAGES = W.pages;
  const SLUGS = { Home: "", About: "about", Admissions: "admissions", Blog: "blog", Events: "events", Resources: "resources", Contact: "contact" };
  const COLLECTION_OF = { Blog: "Blog posts", Events: "Events", Resources: "Resources" };

  /* ===================== Tenant content ===================== */
  const CMS = {
    Announcements: [["Mid-term break: 30 Oct – 2 Nov", "5 Oct"], ["PTA meeting, Saturday 17 Oct", "2 Oct"], ["Inter-house sports registration open", "28 Sep"], ["Welcome to our new JSS 1 pupils", "14 Sep"], ["Uniform and book lists for 2026/2027", "10 Sep"], ["First Term begins Monday 14 September", "1 Sep"]],
    "Blog posts": [
      ["Inside the JSS 2 science fair", "6 Oct", "A very full hall, careful explanations, and a working water filter built from sand and charcoal."],
      ["Reading at home: a short guide for parents", "29 Sep", "Ten minutes a day, the right books for each class, and how to talk about a story together."],
      ["A first look at the new computer lab", "21 Sep", "New workstations for coding club and computing lessons from Basic 4 to SS 3."],
      ["Welcome back: notes from the Principal", "14 Sep", "What is new this session, from the timetable to the after-school clubs."],
    ],
    Events: [["PTA meeting", "17 Oct", "Saturday · 10:00 · School hall"], ["Mid-term break", "30 Oct", "Friday 30 Oct – Monday 2 Nov · School closed"], ["Inter-house sports", "14 Nov", "Saturday · 08:30 · Sports field"]],
    Resources: [["Term calendar 2026/2027", "PDF"], ["School fees — First Term", "PDF"], ["Book list — Primary", "PDF"], ["Book list — Junior Secondary", "PDF"], ["Book list — Senior Secondary", "PDF"], ["Uniform list", "PDF"], ["Admission form", "PDF"], ["Medical information form", "PDF"], ["Parent handbook", "PDF"]],
  };
  const SEO_DEFAULT = {
    Home: { title: "Kingsway Academy | Nursery to Secondary School in Ibadan", desc: "Nursery, primary and secondary education in Ibadan with small classes, STEM labs, Qur’an and Arabic, and a caring community. Admissions open for 2026/2027.", slug: "" },
    About: { title: "About Kingsway Academy | Our story and values", desc: "Since 2011 Kingsway Academy has taught children from creche to SS 3 on one campus in Ibadan. Read our story and what we value.", slug: "about" },
    Admissions: { title: "Admissions 2026/2027 | Kingsway Academy, Ibadan", desc: "How to apply to Kingsway Academy: online application, entrance assessment, family meeting and offer. Places available from Nursery to SS 1.", slug: "admissions" },
    Blog: { title: "News and stories | Kingsway Academy", desc: "Stories from classrooms, clubs and the staff room at Kingsway Academy, Ibadan.", slug: "blog" },
    Events: { title: "Events | Kingsway Academy", desc: "Dates for families this term at Kingsway Academy, Ibadan: PTA meetings, holidays and sports days.", slug: "events" },
    Resources: { title: "Forms, lists and handbooks | Kingsway Academy", desc: "Download the term calendar, school fees, book lists, uniform list, admission and medical forms, and the parent handbook.", slug: "resources" },
    Contact: { title: "Contact Kingsway Academy | Ring Road, Ibadan", desc: "Visit, call or email the Kingsway Academy school office on Ring Road, Ibadan. Open Monday to Friday, 7:30 am to 4:00 pm.", slug: "contact" },
  };
  const FEATURE_META = [
    ["users", "Classes are kept small, so every teacher knows each child by name."],
    ["pencil-ruler", "Science, computing and design are taught hands-on in equipped labs."],
    ["book-open", "Daily Qur’an and Arabic lessons sit alongside the national curriculum."],
    ["trophy", "Inter-house sports, debate, music and coding clubs run every week."],
  ];
  const TEACHERS = D.classrooms.map((c) => ({ name: c.teacher, cls: c.name }));
  const ADM_LINKS = [["apply", "Apply online", "Admissions", ""], ["prospectus", "Download the prospectus", "", "PDF"], ["visit", "Book a school visit", "Contact", ""], ["fees", "School fees for 2026/2027", "Resources", ""]];
  const PROCESS_STEPS = [["Apply online", "Complete the form and upload your child’s latest report card."], ["Entrance assessment", "English and Mathematics, set at your child’s level."], ["Meet the family", "A short conversation with the head of section."], ["Offer and acceptance", "We send an offer letter with the term’s fees."], ["Resume", "Your child joins a class with a form teacher and a timetable."]];
  const MASTS = { About: ["About Kingsway", "A school in Ibadan since 2011."], Admissions: ["Admissions", "Applications for the 2026/2027 session are open."], Blog: ["News and stories", "From classrooms, clubs and the staff room."], Events: ["Events", "Dates for families this term."], Resources: ["Resources", "Forms, lists and handbooks to download."], Contact: ["Contact us", "Visit, call or write to the school office."] };

  function defaultFields(src) {
    switch (src.key) {
      case "hero": return Object.assign({}, src.fields, { ctaTarget: "Admissions", visual: "composition" });
      case "features": return { heading: "Why families choose Kingsway", intro: "A complete education from creche to SS 3, on one campus in Ibadan.", items: src.items.map((t, i) => ({ title: t, body: FEATURE_META[i][1], icon: FEATURE_META[i][0] })) };
      case "stats": return { items: src.items.map((x) => ({ value: x[0], label: x[1] })), note: "Figures for the 2026/2027 session." };
      case "staff": return { heading: "Meet some of our teachers", intro: "Form teachers who know their classes — and their families — well.", count: "3" };
      case "admission": return { heading: "Admissions for 2026/2027 are open", body: "Places are available from Nursery to SS 1. Apply online, then book a visit to meet the admissions team.", links: { apply: true, prospectus: true, visit: true, fees: true } };
      case "announcements": return { heading: "Notice board", count: "3" };
      case "story": return { heading: "A school that knows every child", body: "Kingsway Academy opened in Ibadan in 2011 with a single nursery class. Today we teach children from creche to SS 3 on one campus.\n\nWe keep classes small, teach the national curriculum alongside Qur’an and Arabic, and expect every pupil to leave with knowledge, character and a habit of service.", quote: SCH.motto };
      case "process": return { heading: "How admission works", intro: "Applications for 2026/2027 are open for every class with places available." };
      case "contact": return { heading: "Visit or call the school office", address: "Ring Road, Ibadan, Oyo State", phone: "+234 802 555 0142", email: "admissions@kingsway.edu.ng", hours: "Monday to Friday, 7:30 am – 4:00 pm" };
      default: return {};
    }
  }

  /* Inspector schema: numbered field groups per section type */
  const SCHEMA = {
    hero: [
      { g: "Text", fields: [["kicker", "Kicker", "input"], ["title", "Title", "textarea", { rows: 2 }], ["body", "Body", "textarea", { rows: 4 }]] },
      { g: "Call to action", fields: [["cta", "Button label", "input"], ["ctaTarget", "Button opens", "select", { options: ["Admissions", "Contact", "About"] }]] },
      { g: "Visual", fields: [["visual", "Hero visual", "seg", { options: [["composition", "Composition"], ["image", "Image slot"]] }]], note: "The image slot shows a marked placeholder until a photo is chosen in Media." },
    ],
    features: [
      { g: "Heading", fields: [["heading", "Heading", "input"], ["intro", "Intro", "textarea", { rows: 2 }]] },
      { g: "Cards", list: "items", item: "Card", itemFields: [["title", "Title", "input"], ["body", "Text", "textarea"]] },
    ],
    stats: [
      { g: "Figures", list: "items", item: "Figure", pair: true, itemFields: [["value", "Figure"], ["label", "Label"]] },
      { g: "Footnote", fields: [["note", "Footnote", "input"]] },
    ],
    staff: [
      { g: "Heading", fields: [["heading", "Heading", "input"], ["intro", "Intro", "textarea", { rows: 2 }]] },
      { g: "Teachers", fields: [["count", "Teachers shown", "seg", { options: [["3", "3"], ["6", "6"]] }]], note: "Portraits show initials until photos are chosen in Media." },
    ],
    admission: [
      { g: "Text", fields: [["heading", "Heading", "input"], ["body", "Body", "textarea", { rows: 3 }]] },
      { g: "Links", checks: "links" },
    ],
    announcements: [
      { g: "Heading", fields: [["heading", "Heading", "input"]] },
      { g: "Entries", fields: [["count", "Show the latest", "seg", { options: [["3", "3"], ["4", "4"], ["6", "6"]] }]], note: "From the Announcements collection (6 entries)." },
    ],
    story: [{ g: "Text", fields: [["heading", "Heading", "input"], ["body", "Story", "textarea", { rows: 7 }], ["quote", "Pull quote", "input"]] }],
    process: [{ g: "Text", fields: [["heading", "Heading", "input"], ["intro", "Intro", "textarea", { rows: 3 }]] }],
    contact: [{ g: "Details", fields: [["heading", "Heading", "input"], ["address", "Address", "input"], ["phone", "Phone", "input"], ["email", "Email", "input"], ["hours", "Office hours", "input"]] }],
  };

  /* ===================== Versions & state ===================== */
  let seq = 0;
  const newUid = () => "s" + (++seq);
  const presetTheme = (p) => Object.assign({ preset: p }, PRESETS[p]);
  function makeConfig(template) {
    const pages = {};
    PAGES.forEach((p) => { pages[p] = []; });
    W.sections.forEach((src) => pages[src.page].push({ uid: newUid(), key: src.key, label: src.label, required: !!src.required, visible: true, fields: defaultFields(src) }));
    return { template, theme: presetTheme(TEMPLATE_PRESET[template]), pages, seo: clone(SEO_DEFAULT) };
  }
  const draftCfg = makeConfig("scholaris");
  const liveCfg = clone(draftCfg);
  liveCfg.pages.Home[0].fields.title = "Welcome to Kingsway Academy";
  liveCfg.pages.Home.find((s) => s.key === "staff").visible = false;
  const oldCfg = clone(liveCfg);
  oldCfg.template = "northfield";
  oldCfg.theme = presetTheme("sunlit-family");
  oldCfg.pages.Home[0].fields.kicker = "Admissions open for 2025/2026";
  oldCfg.pages.Home.find((s) => s.key === "announcements").visible = false;

  const versions = [
    { n: 1, status: "archived", note: "Live 3 Jun – 12 Sep 2026", config: oldCfg },
    { n: 2, status: "live", since: "12 Sep 2026", config: liveCfg },
    { n: 3, status: "draft", editedAt: Date.now() - 4 * MIN, config: draftCfg },
  ];
  const ui = { viewing: 3, page: "Home", selected: draftCfg.pages.Home[0].uid, tab: "content", device: "desktop", drawer: null };

  const cur = () => versions.find((v) => v.n === ui.viewing);
  const cfg = () => cur().config;
  const editable = () => cur().status === "draft";
  const liveVersion = () => versions.find((v) => v.status === "live");
  const latestDraft = () => versions.filter((v) => v.status === "draft").sort((a, b) => b.n - a.n)[0];
  const isChrome = (id) => id === "header" || id === "footer";
  const mode = () => document.body.dataset.mode;
  const numOf = (page, i) => `${PAGES.indexOf(page) + 1}.${i + 1}`;
  const tplName = (k) => (TEMPLATES.find((t) => t.key === k) || { name: k }).name;
  const cmsCount = (name) => (W.cms.find((c) => c.name === name) || { count: 0 }).count;
  function findSec(uid, c) {
    c = c || cfg();
    for (const p of PAGES) {
      const list = c.pages[p] || [];
      const i = list.findIndex((s) => s.uid === uid);
      if (i > -1) return { s: list[i], page: p, i };
    }
    return null;
  }
  function verName(v) { return { draft: "Draft", live: "Live", archived: "Archived" }[v.status] + " v" + v.n; }
  function agoText(t) { const m = Math.floor((Date.now() - t) / MIN); return m < 1 ? "just now" : m < 60 ? m + " min ago" : "over an hour ago"; }
  function statusText(v) { return v.status === "draft" ? "Draft · edited " + agoText(v.editedAt) : v.status === "live" ? "Live since " + v.since : "Archived · v" + v.n; }
  function subText(v) { return v.status === "draft" ? "Edited " + agoText(v.editedAt) : v.status === "live" ? "Live since " + v.since : v.note; }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function todayLabel() { const d = new Date(); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  function isCustom(t) { const p = PRESETS[t.preset]; return !p || Object.keys(p).some((k) => String(p[k]).toLowerCase() !== String(t[k]).toLowerCase()); }

  /* ===================== Colour maths (contrast-safe ink on tenant colours) ===================== */
  const HEX = /^#?([0-9a-f]{6})$/i;
  const DARK_INK = "#14161a";
  function lum(h) {
    const x = h.replace("#", "");
    const c = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  const inkOn = (h) => (contrast(h, "#ffffff") >= contrast(h, DARK_INK) ? "#ffffff" : DARK_INK);

  function applySiteTheme(el, c) {
    const t = c.theme, b = BASES[t.base] || BASES.slate, r = RADII[t.radius] || RADII.sm, f = FONTS[t.heading] || FONTS.charter;
    const v = {
      "--t-p": t.primary, "--t-p-ink": inkOn(t.primary), "--t-s": t.secondary, "--t-s-ink": inkOn(t.secondary), "--t-a": t.accent, "--t-a-ink": inkOn(t.accent),
      "--t-bg": b.bg, "--t-surface": b.surface, "--t-tint": b.tint, "--t-ink": b.ink, "--t-muted": b.muted, "--t-line": b.line,
      "--t-r-btn": r[0] + "px", "--t-r-card": r[1] + "px", "--t-d": String(DENSITY[t.density] || 1), "--t-hf": f.stack, "--t-hw": String(f.w),
    };
    Object.keys(v).forEach((k) => el.style.setProperty(k, v[k]));
    el.dataset.template = c.template;
    el.dataset.menu = t.menu;
  }

  /* ===================== Tenant site renderer ===================== */
  function lk(o, goto, cls, inner) {
    return `<a href="#"${goto ? ` data-goto="${goto}"` : ""}${cls ? ` class="${cls}"` : ""}${o.editing ? ' tabindex="-1"' : ""}>${inner}</a>`;
  }
  function crest(size, t) {
    const P = t ? t.primary : "var(--t-p)", A = t ? t.accent : "var(--t-a)", I = t ? inkOn(t.primary) : "var(--t-p-ink)", F = t ? FONTS[t.heading].stack : "var(--t-hf)";
    return `<svg class="s-crest" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true" focusable="false"><path d="M20 1.5 38 6.5V22c0 11.6-7.6 18.6-18 22.5C9.6 40.6 2 33.6 2 22V6.5Z" style="fill:${P}"/><path d="M20 5.6 34.4 9.6V22c0 9.3-6 15-14.4 18.3C11.6 37 5.6 31.3 5.6 22V9.6Z" fill="none" stroke-width="1.3" style="stroke:${A}"/><text x="20" y="27.5" text-anchor="middle" font-size="13" style="fill:${I};font-family:${F};font-weight:700">${esc(SCH.initials)}</text></svg>`;
  }
  function heroArt() {
    return `<svg viewBox="0 0 480 420" role="img" aria-label="Illustration of the school archway">
      <circle cx="376" cy="98" r="54" style="fill:var(--t-a)"/>
      <path d="M84 420V196a156 156 0 0 1 312 0v224Z" style="fill:var(--t-p)"/>
      <rect x="230" y="31" width="20" height="18" rx="2" style="fill:var(--t-a)"/>
      <path d="M124 420V204a116 116 0 0 1 232 0v216Z" style="fill:var(--t-p-ink)" opacity=".12"/>
      <path d="M201.3 94.6V372M278.7 94.6V372M124 262h232M124 320h232" fill="none" stroke-width="2" stroke-opacity=".42" style="stroke:var(--t-p-ink)"/>
      <rect x="64" y="372" width="352" height="20" opacity=".85" style="fill:var(--t-s)"/>
      <rect x="40" y="392" width="400" height="28" style="fill:var(--t-s)"/>
      <path d="M240 336c-18-10-42-12-60-8v38c18-4 42-2 60 8Z" style="fill:var(--t-bg)"/>
      <path d="M240 336c18-10 42-12 60-8v38c-18-4-42-2-60 8Z" opacity=".9" style="fill:var(--t-bg)"/>
      <path d="M192 342c14-2 30-1 40 4M192 352c14-2 30-1 40 4M248 346c10-5 26-6 40-4M248 356c10-5 26-6 40-4" fill="none" stroke-width="1.6" stroke-opacity=".45" style="stroke:var(--t-p)"/>
    </svg>`;
  }
  function ph(label, size, cls, kind) {
    return `<div class="s-ph${cls ? " " + cls : ""}" role="img" aria-label="${esc((kind || "Image") + " placeholder: " + label)}">${ic(kind === "Map" ? "map-pin" : "image", 22)}<b>${kind || "Image"}</b><small>${esc(label)}${size ? " · " + size : ""}</small></div>`;
  }
  function contactOf(c) {
    const s = (c.pages.Contact || []).find((x) => x.key === "contact");
    return s ? s.fields : defaultFields({ key: "contact" });
  }

  const RENDER = {
    hero(f, o) {
      return `<div class="s-wrap s-hero-grid"><div class="s-hero-copy">
        ${f.kicker ? `<p class="s-kicker">${esc(f.kicker)}</p>` : ""}
        <h2 class="s-display">${esc(f.title) || "&nbsp;"}</h2>
        ${f.body ? `<p class="s-lede">${esc(f.body)}</p>` : ""}
        <div class="s-actions">${f.cta ? lk(o, f.ctaTarget, "s-btn", esc(f.cta) + ic("arrow-right", 18)) : ""}${lk(o, "Contact", "s-link", "Book a school visit")}</div>
        <ul class="s-facts"><li>Creche to SS 3</li><li>National curriculum</li><li>${esc(SCH.city)}, ${esc(SCH.state)} State</li></ul>
      </div><div class="s-hero-art">${f.visual === "image" ? ph("Hero image", "1600 × 1280") : heroArt()}</div></div>`;
    },
    features(f) {
      return `<div class="s-wrap"><div class="s-head"><div><p class="s-eyebrow">Why Kingsway</p><h2 class="s-h2">${esc(f.heading)}</h2></div>${f.intro ? `<p>${esc(f.intro)}</p>` : ""}</div>
        <ul class="s-cards">${f.items.map((it) => `<li class="s-card"><span class="s-card-ic">${ic(it.icon || "star", 20)}</span><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></li>`).join("")}</ul></div>`;
    },
    stats(f) {
      return `<div class="s-wrap"><dl class="s-stats-grid">${f.items.map((it) => `<div class="s-stat"><dt>${esc(it.label)}</dt><dd>${esc(it.value)}</dd></div>`).join("")}</dl>${f.note ? `<p class="s-note">${esc(f.note)}</p>` : ""}</div>`;
    },
    staff(f) {
      const n = parseInt(f.count, 10) || 3;
      return `<div class="s-wrap"><div class="s-head"><div><p class="s-eyebrow">Our teachers</p><h2 class="s-h2">${esc(f.heading)}</h2></div>${f.intro ? `<p>${esc(f.intro)}</p>` : ""}</div>
        <ul class="s-staff-grid">${TEACHERS.slice(0, n).map((t) => `<li><div class="s-portrait"><span>${esc(SC.initials(t.name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/, "")))}</span><small>${ic("image", 12)}Portrait</small></div><h3>${esc(t.name)}</h3><p>Form teacher, ${esc(t.cls)}</p></li>`).join("")}</ul></div>`;
    },
    admission(f, o) {
      const links = ADM_LINKS.filter((l) => f.links && f.links[l[0]]);
      return `<div class="s-wrap s-adm-grid"><div><p class="s-eyebrow">Admissions</p><h2 class="s-h2">${esc(f.heading)}</h2>${f.body ? `<p>${esc(f.body)}</p>` : ""}</div>
        ${links.length ? `<ul class="s-adm-links">${links.map((l) => `<li>${lk(o, l[2], "", `<span>${l[1]}</span>${l[3] ? `<small>${l[3]}</small>` : ""}${ic("arrow-right", 20)}`)}</li>`).join("")}</ul>` : ""}</div>`;
    },
    announcements(f, o) {
      const n = parseInt(f.count, 10) || 3;
      return `<div class="s-wrap"><div class="s-head is-row"><div><p class="s-eyebrow">News</p><h2 class="s-h2">${esc(f.heading)}</h2></div>${lk(o, "", "s-link", `All announcements (${cmsCount("Announcements")})`)}</div>
        <ol class="s-notices">${CMS.Announcements.slice(0, n).map((a) => { const dm = a[1].split(" "); return `<li><p class="s-date"><b>${dm[0]}</b><span>${dm[1]}</span></p><div><h3>${esc(a[0])}</h3><p>Announcement · posted ${a[1]}</p></div>${ic("arrow-right", 18)}</li>`; }).join("")}</ol></div>`;
    },
    story(f) {
      return `<div class="s-wrap s-story-grid"><div><p class="s-eyebrow">Our story</p><h2 class="s-h2">${esc(f.heading)}</h2><p class="s-body">${esc(f.body)}</p></div>${f.quote ? `<blockquote class="s-quote"><p>“${esc(f.quote)}”</p><footer>The Kingsway motto</footer></blockquote>` : ""}</div>`;
    },
    process(f) {
      return `<div class="s-wrap"><div class="s-head"><div><p class="s-eyebrow">Admissions process</p><h2 class="s-h2">${esc(f.heading)}</h2></div>${f.intro ? `<p>${esc(f.intro)}</p>` : ""}</div><ol class="s-steps">${PROCESS_STEPS.map((s) => `<li><h3>${s[0]}</h3><p>${s[1]}</p></li>`).join("")}</ol></div>`;
    },
    contact(f) {
      const rows = [["Address", f.address], ["Phone", f.phone], ["Email", f.email], ["Office hours", f.hours]].filter((r) => r[1]);
      return `<div class="s-wrap s-contact-grid"><div><p class="s-eyebrow">School office</p><h2 class="s-h2">${esc(f.heading)}</h2><dl>${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl></div>${ph("Ring Road, Ibadan", "", "is-sm", "Map")}</div>`;
    },
  };

  function wrap(id, label, o, cls, inner, tag) {
    tag = tag || "section";
    const sel = o.editing && o.selected === id;
    const attrs = o.editing ? ` data-sec="${id}" tabindex="0" aria-label="${esc(label)} — select to edit"` : "";
    return `<${tag} class="${cls}${sel ? " is-selected" : ""}"${attrs}>${o.editing ? `<span class="s-tag" aria-hidden="true">${esc(label)}</span>` : ""}${inner}</${tag}>`;
  }
  function headerHTML(c, page, o) {
    const ci = contactOf(c);
    const links = PAGES.filter((p) => p !== "Home").map((p) => lk(o, p, p === page ? "is-on" : "", p)).join("");
    return wrap("header", "Site header", o, "s-chrome", `
      <div class="s-util"><div class="s-wrap"><span>${esc(ci.address)} · Creche to SS 3</span><span class="s-util-r">${lk(o, "", "", "Parent portal")}<span aria-hidden="true">·</span><span>${esc(ci.phone)}</span></span></div></div>
      <div class="s-nav"><div class="s-wrap s-nav-in">
        ${lk(o, "Home", "s-brand", crest(38) + `<span class="s-brand-t"><b>${esc(SCH.name)}</b><small>${esc(SCH.city)} · Est. 2011</small></span>`)}
        <nav class="s-links" aria-label="Kingsway Academy">${links}</nav>
        ${lk(o, "Admissions", "s-btn s-btn-sm", "Apply")}
        <span class="s-burger" aria-hidden="true">${ic("menu", 22)}</span>
      </div></div>`, "header");
  }
  function footerHTML(c, o) {
    const ci = contactOf(c);
    const col = (title, items) => `<div class="s-foot-col"><p class="s-foot-h">${title}</p><ul>${items.map((x) => `<li>${lk(o, x[1], "", x[0])}</li>`).join("")}</ul></div>`;
    return wrap("footer", "Site footer", o, "s-foot", `<div class="s-wrap"><div class="s-foot-grid">
        <div class="s-foot-brand">${crest(40)}<p class="s-foot-name">${esc(SCH.name)}</p><p class="s-foot-motto">${esc(SCH.motto)}</p><address>${esc(ci.address)}<br>${esc(ci.phone)}<br>${esc(ci.email)}</address></div>
        ${col("School", [["About", "About"], ["Admissions", "Admissions"], ["Contact", "Contact"]])}
        ${col("Community", [["News", "Blog"], ["Events", "Events"], ["Resources", "Resources"]])}
        ${col("Families", [["Parent portal", ""], ["School fees", "Resources"], ["Book a visit", "Contact"]])}
      </div><div class="s-foot-base"><span>© 2026 ${esc(SCH.name)}, ${esc(SCH.city)}</span><span>Website by SchoolClerk</span></div></div>`, "footer");
  }
  function mastHTML(page, o) {
    const m = MASTS[page];
    return `<div class="s-mast"><div class="s-wrap"><p class="s-crumbs">${lk(o, "Home", "", "Home")}<span aria-hidden="true">/</span><span>${page}</span></p><h2 class="s-display">${m[0]}</h2><p class="s-lede">${m[1]}</p></div></div>`;
  }
  function collectionHTML(page) {
    let inner;
    if (page === "Blog") inner = `<div class="s-posts">${CMS["Blog posts"].map((p) => `<article class="s-post">${ph("Post image", "", "is-sm")}<p class="s-meta">${p[1]}</p><h3>${esc(p[0])}</h3><p>${esc(p[2])}</p></article>`).join("")}</div>`;
    else if (page === "Events") inner = `<ol class="s-notices">${CMS.Events.map((e) => { const dm = e[1].split(" "); return `<li><p class="s-date"><b>${dm[0]}</b><span>${dm[1]}</span></p><div><h3>${esc(e[0])}</h3><p>${esc(e[2])}</p></div>${ic("calendar", 18)}</li>`; }).join("")}</ol>`;
    else inner = `<ul class="s-files">${CMS.Resources.map((r) => `<li>${ic("file-text", 20)}<b>${esc(r[0])}</b><small>${r[1]}</small>${ic("download", 18)}</li>`).join("")}</ul>`;
    return `<div class="s-sec s-coll"><div class="s-wrap">${inner}</div></div>`;
  }
  function siteHTML(c, page, o) {
    let h = headerHTML(c, page, o);
    if (page !== "Home") h += mastHTML(page, o);
    if (COLLECTION_OF[page]) h += collectionHTML(page);
    (c.pages[page] || []).forEach((s, i) => {
      const label = `${numOf(page, i)} ${s.label}`;
      if (!s.visible) {
        if (o.editing) h += wrap(s.uid, label, o, "s-off", `${ic("eye-off", 16)}<span><b>${esc(label)}</b> is hidden — it won’t appear on the published site.</span>`, "div");
        return;
      }
      const r = RENDER[s.key];
      if (r) h += wrap(s.uid, label, o, `s-sec s-${s.key}`, r(s.fields, o, c));
    });
    return h + footerHTML(c, o);
  }

  /* ===================== Elements ===================== */
  const body = document.body;
  const outlineEl = $("#outline"), inspectorEl = $("#inspector"), desk = $("#canvas"), stage = $("#stage");
  const frame = $("#frame"), frameView = $("#frameView"), siteEl = $("#site");
  const pubDialog = $("#pubDialog"), tplDialog = $("#tplDialog"), tplSite = $("#tplSite");
  const narrow = window.matchMedia("(max-width: 1023px)");
  const phone = window.matchMedia("(max-width: 559px)");

  function announce(msg) { const l = $("#live"); l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 40); }
  function rescueFocus(el) { const a = document.activeElement; if (!a || a === document.body || !a.isConnected) (el || $("#statusBtn")).focus({ preventScroll: true }); }
  function keepFocus(fn, fallback) {
    const a = document.activeElement, key = a && a.dataset ? a.dataset.fk : null;
    fn();
    if (!key) return;
    let el = document.querySelector(`[data-fk="${key}"]`);
    if ((!el || el.disabled) && fallback) el = document.querySelector(`[data-fk="${fallback}"]`);
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }

  /* ===================== Canvas ===================== */
  function fitInto(site, logical, avail) {
    if (!avail) return 0;
    const k = Math.min(1, avail / logical);
    site.style.width = logical + "px";
    site.style.transform = k < 1 ? `scale(${k})` : "none";
    site.style.setProperty("--k", String(k));
    return k;
  }
  function fitCanvas() {
    const cw = desk.clientWidth;
    if (!cw) return;
    const cs = getComputedStyle(desk);
    const avail = cw - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
    const dev = DEVICES[ui.device];
    const k = fitInto(siteEl, dev.w, avail);
    const w = Math.floor(dev.w * k);
    stage.style.width = w + 2 + "px";
    frameView.style.height = Math.ceil(siteEl.offsetHeight * k) + "px";
    frame.classList.toggle("is-narrow", w < 560);
    $("#deskMeta").textContent = `${dev.label} · ${dev.w} px${k < 0.995 ? ` · shown at ${Math.round(k * 100)}%` : ""}`;
  }
  function renderSite() {
    const c = cfg(), editing = mode() !== "preview";
    applySiteTheme(siteEl, c);
    siteEl.classList.toggle("is-editing", editing);
    siteEl.innerHTML = siteHTML(c, ui.page, { editing, selected: ui.selected });
    renderFrameBar();
    renderDeskHead();
    fitCanvas();
  }
  function markCanvasSelection() { $$("[data-sec]", siteEl).forEach((el) => el.classList.toggle("is-selected", el.dataset.sec === ui.selected)); }
  function scrollCanvasTo(uid) {
    const el = $(`[data-sec="${uid}"]`, siteEl);
    if (!el) return;
    const r = el.getBoundingClientRect(), d = desk.getBoundingClientRect();
    if (r.top >= d.top + 40 && r.top < d.bottom - 120) return;
    desk.scrollBy({ top: r.top - d.top - 64, behavior: SC.reduced() ? "auto" : "smooth" });
  }

  let noteTimer = 0, noteFlash = false;
  function noteText() { const v = cur(); return mode() === "preview" ? "Preview · links work" : v.status === "draft" ? "Draft — not public" : v.status === "live" ? "Live version" : "Archived version"; }
  function flashNote(t) {
    const n = $("#frameNote");
    noteFlash = true; n.textContent = t; n.classList.add("is-flash");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { noteFlash = false; n.classList.remove("is-flash"); n.textContent = noteText(); }, 2800);
  }
  function renderFrameBar() {
    const c = cfg(), seo = c.seo[ui.page] || {};
    const slug = ui.page === "Home" ? "" : SC.slugify(seo.slug || SLUGS[ui.page]);
    $("#frameTab").innerHTML = crest(13, c.theme) + `<span>${esc(seo.title || SCH.name)}</span>`;
    $("#frameUrl").innerHTML = ic("lock", 12) + `<span><b>${SCH.site}</b>/${esc(slug)}</span>`;
    if (!noteFlash) $("#frameNote").textContent = noteText();
  }
  function renderDeskHead() {
    const pi = PAGES.indexOf(ui.page), list = cfg().pages[ui.page] || [], coll = COLLECTION_OF[ui.page];
    const hidden = list.filter((s) => !s.visible).length;
    $("#deskTitle").innerHTML = `<span class="n">${pad(pi + 1)}</span> — ${ui.page}`;
    $("#deskSub").textContent = coll ? `${coll} · ${cmsCount(coll)} entries` : `${list.length} section${list.length === 1 ? "" : "s"}${hidden ? ` · ${hidden} hidden` : ""}`;
  }
  function renderBanner() {
    const v = cur(), b = $("#banner"), d = latestDraft();
    const openDraft = d && d.n !== v.n ? `<button type="button" class="btn btn-outline btn-sm" data-ver="${d.n}">Open ${verName(d)}</button>` : "";
    let h = "";
    if (mode() === "preview") h = `${ic("eye", 16)}<p><b>Previewing ${verName(v)}.</b> Links between pages work here; nothing is public.</p><div class="wb-banner-actions"><button type="button" class="btn btn-outline btn-sm" data-act="preview">Exit preview</button></div>`;
    else if (v.status === "live") h = `${ic("lock", 16)}<p><b>Version ${v.n} is live.</b> Published versions can’t be edited — duplicate to make changes.</p><div class="wb-banner-actions">${openDraft}<button type="button" class="btn btn-default btn-sm" data-act="duplicate">${ic("copy", 14)}Duplicate to edit</button></div>`;
    else if (v.status === "archived") h = `${ic("history", 16)}<p><b>Version ${v.n} is archived.</b> Duplicate it to start a new draft from this version.</p><div class="wb-banner-actions">${openDraft}<button type="button" class="btn btn-default btn-sm" data-act="duplicate">${ic("copy", 14)}Duplicate to edit</button></div>`;
    b.innerHTML = h;
    b.hidden = !h;
  }

  /* ===================== Top bar & menus ===================== */
  function renderTop() {
    const v = cur(), st = statusText(v);
    $("#statusText").textContent = st;
    $("#statusDot").className = "dot" + (v.status === "live" ? " is-live" : v.status === "archived" ? " is-archived" : "");
    $("#statusBtn").setAttribute("aria-label", `${verName(v)}: ${st}. Show versions`);
    $("#pageName").textContent = ui.page;
    $("#publishBtn").disabled = !editable();
    $("#publishLabel").textContent = v.status === "live" ? "Published" : "Publish";
    $("#mDuplicate").disabled = v.status === "draft";
    $("#mArchive").disabled = v.status !== "draft";
    $("#undoBtn").disabled = !editable() || !hist.undo.length;
    $("#redoBtn").disabled = !editable() || !hist.redo.length;
    $$("#deviceSeg [data-device]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.device === ui.device)));
    $("#previewBtn").setAttribute("aria-pressed", String(mode() === "preview"));
    $("#olToggle").disabled = mode() !== "editor";
    $("#inToggle").disabled = mode() !== "editor";
    renderMenus();
  }
  function renderMenus() {
    $("#pageMenu").innerHTML = `<p class="menu-label">Pages</p>` + PAGES.map((p, i) => `<button type="button" class="menu-item" role="menuitemradio" aria-checked="${p === ui.page}" data-page="${p}"><span class="menu-num">${pad(i + 1)}</span>${p}${p === ui.page ? `<span class="menu-shortcut">${ic("check", 14)}</span>` : ""}</button>`).join("");
    const vs = versions.slice().sort((a, b) => b.n - a.n);
    $("#verMenu").innerHTML = `<p class="menu-label">Versions</p>` + vs.map((v) => `<button type="button" class="menu-item ver-item" role="menuitemradio" aria-checked="${v.n === ui.viewing}" data-ver="${v.n}"><span class="dot${v.status === "live" ? " is-live" : v.status === "archived" ? " is-archived" : ""}" aria-hidden="true"></span><span><b>${verName(v)}</b><small>${esc(subText(v))}</small></span>${v.n === ui.viewing ? `<span class="menu-shortcut">${v.status === "draft" ? "Editing" : "Viewing"}</span>` : ""}</button>`).join("") + `<div class="menu-sep" role="separator"></div><p class="ver-foot">Drafts stay private. One version is live at a time.</p>`;
  }
  function syncMenuTriggers(e) {
    $$("[data-menu]").forEach((b) => { const m = $(b.dataset.menu); if (m) b.setAttribute("aria-expanded", String(!m.hidden)); });
    const trg = e && e.target.closest && e.target.closest("[data-menu]");
    if (!trg) return;
    const m = $(trg.dataset.menu);
    if (!m || m.hidden) return;
    const items = $$(".menu-item", m).filter((b) => !b.disabled && b.offsetParent !== null);
    const target = items.find((b) => b.getAttribute("aria-checked") === "true") || items[0];
    if (target) target.focus();
  }

  /* ===================== Outline ===================== */
  function secRow(s, p, pi, i, n, ro) {
    const sel = ui.selected === s.uid, name = esc(s.label);
    const sw = s.required
      ? `<span class="ol-lock" title="Required — always shown">${ic("lock", 13)}</span><input type="checkbox" class="switch is-sm" role="switch" checked disabled aria-label="${name} is required and always shown">`
      : `<span class="ol-lock" aria-hidden="true"></span><input type="checkbox" class="switch is-sm" role="switch" data-vis="${s.uid}" data-fk="vis-${s.uid}"${s.visible ? " checked" : ""}${ro ? " disabled" : ""} aria-label="Show ${name} on the site">`;
    return `<li class="ol-sec${sel ? " is-selected" : ""}${s.visible ? "" : " is-off"}" data-uid="${s.uid}">
      <button type="button" class="ol-sec-btn" data-select="${s.uid}" aria-pressed="${sel}" data-fk="sel-${s.uid}"><span class="ol-num">${pi + 1}.${i + 1}</span><span class="ol-sec-name">${name}</span>${s.visible ? "" : '<span class="sr-only">, hidden</span>'}</button>
      <span class="ol-tools">
        <button type="button" class="ol-ib" data-move="up" data-uid="${s.uid}" data-fk="up-${s.uid}" aria-label="Move ${name} up" title="Move up"${ro || i === 0 ? " disabled" : ""}>${ic("chevron-up", 15)}</button>
        <button type="button" class="ol-ib" data-move="down" data-uid="${s.uid}" data-fk="down-${s.uid}" aria-label="Move ${name} down" title="Move down"${ro || i === n - 1 ? " disabled" : ""}>${ic("chevron-down", 15)}</button>
        <button type="button" class="ol-ib" data-dup="${s.uid}" data-fk="dup-${s.uid}" aria-label="Duplicate ${name}" title="Duplicate"${ro ? " disabled" : ""}>${ic("copy", 13)}</button>
      </span>${sw}</li>`;
  }
  function chromeRow(id, label) {
    const sel = ui.selected === id;
    return `<li class="ol-sec${sel ? " is-selected" : ""}" data-uid="${id}"><button type="button" class="ol-sec-btn" data-select="${id}" aria-pressed="${sel}" data-fk="sel-${id}"><span class="ol-num">—</span><span class="ol-sec-name">${label}</span></button><span class="ol-count">Shared</span></li>`;
  }
  function renderOutline() {
    const c = cfg(), ro = !editable(), tpl = TEMPLATES.find((t) => t.key === c.template) || TEMPLATES[0];
    let h = `<div class="ol-block"><p class="eb">Template</p><div class="ol-tpl"><span class="ol-tpl-name">${tpl.name}</span><span class="ol-tpl-mood">${tpl.mood} · ${PRESET_LABELS[c.theme.preset] || "Custom"}${isCustom(c.theme) ? ", customised" : ""}</span><button type="button" class="ol-link" data-act="templates">Change template</button></div></div>`;
    h += `<div class="ol-h"><p class="eb">Contents</p><p class="eb">${PAGES.length} pages</p></div><ol class="ol-pages">`;
    PAGES.forEach((p, pi) => {
      const list = c.pages[p] || [], on = p === ui.page, coll = COLLECTION_OF[p];
      const count = coll ? cmsCount(coll) : list.length;
      h += `<li class="ol-page${on ? " is-current" : ""}"><button type="button" class="ol-page-btn" data-page="${p}" data-fk="pg-${p}"${on ? ' aria-current="page"' : ""}><span class="ol-num">${pad(pi + 1)}</span><span class="ol-page-name">${p}</span><span class="ol-leader" aria-hidden="true"></span><span class="ol-count">${count}<span class="sr-only"> ${coll ? "entries" : "sections"}</span></span></button>`;
      if (on) {
        h += `<ol class="ol-secs">`;
        if (coll) h += `<li class="ol-sec is-coll"><button type="button" class="ol-sec-btn" data-act="cms"><span class="ol-num">${pi + 1}.0</span><span class="ol-sec-name">${coll} collection</span></button><span class="ol-coll-n">${count}</span></li>`;
        list.forEach((s, i) => { h += secRow(s, p, pi, i, list.length, ro); });
        h += `</ol>`;
      }
      h += `</li>`;
    });
    h += `</ol><div class="ol-h"><p class="eb">On every page</p></div><ol class="ol-secs is-shared">${chromeRow("header", "Site header")}${chromeRow("footer", "Site footer")}</ol>`;
    h += `<div class="ol-h"><p class="eb">Collections</p><button type="button" class="ol-link" data-act="cms">Open CMS</button></div><ul class="ol-cms">${W.cms.map((x) => `<li><button type="button" class="ol-cms-btn" data-act="cms"><span>${x.name}</span><span class="ol-leader" aria-hidden="true"></span><span class="ol-count">${x.count}</span></button></li>`).join("")}</ul>`;
    outlineEl.innerHTML = h;
  }

  /* ===================== Inspector ===================== */
  function fieldHTML(s, fd) {
    const k = fd[0], label = fd[1], type = fd[2], opt = fd[3] || {}, id = "f-" + k;
    const v = s.fields[k] == null ? "" : s.fields[k];
    if (type === "textarea") return `<div class="field"><label class="label" for="${id}">${label}</label><textarea class="textarea" id="${id}" rows="${opt.rows || 3}" data-f="${k}" data-fk="f-${k}">${esc(v)}</textarea></div>`;
    if (type === "select") return `<div class="field"><label class="label" for="${id}">${label}</label><select class="select" id="${id}" data-f="${k}" data-fk="f-${k}">${opt.options.map((x) => `<option value="${x}"${x === v ? " selected" : ""}>${x} page</option>`).join("")}</select></div>`;
    if (type === "seg") return `<div class="field"><span class="label" id="${id}-l">${label}</span><div class="wb-seg is-block" role="radiogroup" aria-labelledby="${id}-l">${opt.options.map((x) => `<button type="button" role="radio" aria-checked="${String(x[0]) === String(v)}" data-segf="${k}" data-v="${x[0]}" data-fk="seg-${k}-${x[0]}">${x[1]}</button>`).join("")}</div></div>`;
    return `<div class="field"><label class="label" for="${id}">${label}</label><input class="input" id="${id}" data-f="${k}" data-fk="f-${k}" value="${esc(v)}" autocomplete="off"></div>`;
  }
  function groupHTML(s, g, gi) {
    let h = `<div class="in-sec"><p class="in-sec-h"><span class="n">${gi + 1}</span>·<span>${g.g}</span></p>`;
    (g.fields || []).forEach((fd) => { h += fieldHTML(s, fd); });
    if (g.list) {
      (s.fields[g.list] || []).forEach((it, idx) => {
        const one = (f) => {
          const id = `li-${g.list}-${idx}-${f[0]}`, attrs = `id="${id}" data-list="${g.list}" data-idx="${idx}" data-ik="${f[0]}" data-fk="${id}"`;
          const lab = g.pair ? `<label class="label" for="${id}">${f[1]} ${idx + 1}</label>` : `<label class="label" for="${id}"><span class="sr-only">${g.item} ${idx + 1} </span>${f[1]}</label>`;
          return f[2] === "textarea" ? `<div class="field">${lab}<textarea class="textarea" rows="2" ${attrs}>${esc(it[f[0]])}</textarea></div>` : `<div class="field">${lab}<input class="input" ${attrs} value="${esc(it[f[0]])}" autocomplete="off"></div>`;
        };
        h += g.pair ? `<div class="in-pair">${g.itemFields.map(one).join("")}</div>` : `<div class="in-item"><p class="in-item-h" aria-hidden="true"><b>${g.item} ${idx + 1}</b></p>${g.itemFields.map(one).join("")}</div>`;
      });
    }
    if (g.checks) h += `<div class="in-checks">${ADM_LINKS.map((l) => `<label class="choice"><input type="checkbox" class="checkbox" data-check="${g.checks}" data-v="${l[0]}" data-fk="ck-${l[0]}"${s.fields[g.checks] && s.fields[g.checks][l[0]] ? " checked" : ""}>${l[1]}</label>`).join("")}</div>`;
    if (g.note) h += `<p class="field-description">${g.note}</p>`;
    return h + `</div>`;
  }
  function menuSeg(t) {
    return `<div class="field"><span class="label" id="menu-l">Menu style</span><div class="wb-seg is-block" role="radiogroup" aria-labelledby="menu-l">${W.theme.menu.map((m) => `<button type="button" role="radio" aria-checked="${t.menu === m}" data-segt="menu" data-v="${m}" data-fk="t-menu-${m}">${cap(m)}</button>`).join("")}</div></div>`;
  }
  function chromePanel(id, ro) {
    if (id === "header") return `<div class="in-head"><p class="eb">On every page</p><h2 class="in-title">Site header</h2><p class="in-sub">The school name and crest come from School Profile.</p></div><fieldset class="in-fs"${ro ? " disabled" : ""}><legend class="sr-only">Site header</legend><div class="in-sec"><p class="in-sec-h"><span class="n">1</span>·<span>Menu</span></p>${menuSeg(cfg().theme)}<p class="field-description">The menu lists every page. “Apply” opens the Admissions page.</p></div></fieldset>`;
    return `<div class="in-head"><p class="eb">On every page</p><h2 class="in-title">Site footer</h2><p class="in-sub">Address, phone and email come from the Contact page.</p></div><div class="in-sec"><div><button type="button" class="btn btn-outline btn-sm" data-page="Contact" data-select-key="contact">${ic("arrow-right", 14)}Edit on the Contact page</button></div></div>`;
  }
  function pagePanel() {
    const page = ui.page, pi = PAGES.indexOf(page), list = cfg().pages[page] || [], coll = COLLECTION_OF[page], seo = cfg().seo[page];
    let h = `<div class="in-head"><p class="eb">Page ${pad(pi + 1)}</p><h2 class="in-title">${page}</h2><p class="in-sub mono">/${esc(page === "Home" ? "" : SC.slugify(seo.slug))}</p></div>`;
    if (coll) h += `<div class="in-sec"><p class="in-sec-h"><span class="n">1</span>·<span>Collection page</span></p><p class="in-text">This page lists entries from the <b>${coll}</b> collection, newest first.</p><dl class="wb-ledger"><dt>Entries</dt><dd>${cmsCount(coll)}</dd></dl><div><button type="button" class="btn btn-outline btn-sm" data-act="cms">${ic("newspaper", 14)}Open CMS</button></div></div>`;
    if (list.length) h += `<div class="in-sec"><p class="in-sec-h"><span class="n">${coll ? 2 : 1}</span>·<span>Sections</span></p><ol class="in-toc">${list.map((s, i) => `<li><button type="button" data-select="${s.uid}"${s.visible ? "" : ' class="is-off"'}><span class="ol-num">${numOf(page, i)}</span>${esc(s.label)}${s.visible ? "" : '<span class="sr-only">, hidden</span>'}</button></li>`).join("")}</ol><p class="field-description">Select a section here, in the outline or on the canvas to edit it.</p></div>`;
    return h;
  }
  function contentPanel() {
    const ro = !editable(), sel = ui.selected;
    if (isChrome(sel)) return chromePanel(sel, ro);
    const f = sel && findSec(sel);
    if (!f) return pagePanel();
    const s = f.s, page = f.page, i = f.i, list = cfg().pages[page];
    let h = `<div class="in-head"><p class="eb">${page} · Section ${numOf(page, i)}</p><h2 class="in-title">${esc(s.label)}</h2>`;
    h += s.required ? `<p class="in-req">${ic("lock", 13)}Required — always shown on ${page}</p>` : `<label class="in-vis"><input type="checkbox" class="switch" role="switch" data-vis="${s.uid}" data-fk="in-vis"${s.visible ? " checked" : ""}${ro ? " disabled" : ""}>Shown on the site</label>`;
    h += `</div><fieldset class="in-fs"${ro ? " disabled" : ""}><legend class="sr-only">${esc(s.label)} content</legend>`;
    (SCHEMA[s.key] || []).forEach((g, gi) => { h += groupHTML(s, g, gi); });
    h += `</fieldset><div class="in-actions">
      <button type="button" class="btn btn-outline btn-sm" data-move="up" data-uid="${s.uid}" data-fk="in-up"${ro || i === 0 ? " disabled" : ""}>${ic("chevron-up", 14)}Move up</button>
      <button type="button" class="btn btn-outline btn-sm" data-move="down" data-uid="${s.uid}" data-fk="in-down"${ro || i === list.length - 1 ? " disabled" : ""}>${ic("chevron-down", 14)}Move down</button>
      <button type="button" class="btn btn-outline btn-sm" data-dup="${s.uid}" data-fk="in-dup"${ro ? " disabled" : ""}>${ic("copy", 14)}Duplicate</button></div>`;
    return h;
  }
  function segT(k, label, vals, labels) {
    return `<div class="field"><span class="label" id="${k}-l">${label}</span><div class="wb-seg is-block" role="radiogroup" aria-labelledby="${k}-l">${vals.map((v) => `<button type="button" role="radio" aria-checked="false" data-segt="${k}" data-v="${v}" data-fk="t-${k}-${v}">${labels ? labels[v] : cap(v)}</button>`).join("")}</div></div>`;
  }
  function colorRow(k, label) {
    return `<div class="color-row"><label class="label" for="${k}Hex">${label}</label><input type="color" class="color-in" data-color="${k}" data-fk="t-col-${k}" aria-label="${label} colour picker"><input class="input mono" id="${k}Hex" data-hex="${k}" data-fk="t-hex-${k}" maxlength="7" spellcheck="false" autocomplete="off"></div>`;
  }
  function stylePanel() {
    const ro = !editable(), t = cfg().theme, th = W.theme;
    return `<div class="in-head"><p class="eb">Every page · website only</p><h2 class="in-title">Style</h2><p class="in-sub">These colours and fonts belong to Kingsway’s website. They don’t change SchoolClerk.</p></div>
    <fieldset class="in-fs"${ro ? " disabled" : ""}><legend class="sr-only">Website style</legend>
      <div class="in-sec"><p class="in-sec-h"><span class="n">1</span>·<span>Preset</span><span class="in-aside" id="presetFlag"></span></p>
        <div class="field"><label class="label" for="presetSel">Style preset</label><select class="select" id="presetSel" data-preset data-fk="t-preset">${th.presets.map((p) => `<option value="${p}">${PRESET_LABELS[p]}</option>`).join("")}</select><p class="field-description">Sets colours, shape and type together. Adjust anything below afterwards.</p></div></div>
      <div class="in-sec"><p class="in-sec-h"><span class="n">2</span>·<span>Colour</span></p>
        <div class="field"><span class="label" id="base-l">Base colour</span><div class="base-grid" role="radiogroup" aria-labelledby="base-l">${th.baseColors.map((b) => `<button type="button" class="base-opt" role="radio" aria-checked="false" data-base="${b}" data-fk="t-base-${b}"><span class="base-chip" style="--b1:${BASES[b].tint};--b2:${BASES[b].ink}"></span>${cap(b)}</button>`).join("")}</div></div>
        <div class="field"><span class="label" id="prim-l">Primary colour</span>
          <div class="sw-row" role="radiogroup" aria-labelledby="prim-l">${th.swatches.map((c) => `<button type="button" class="sw" role="radio" aria-checked="false" aria-label="${c.toUpperCase()}" data-swatch="${c}" data-fk="t-sw-${c}" style="--c:${c}"></button>`).join("")}</div>
          <div class="input-group"><span class="input-addon"><span class="hex-chip" id="primChip"></span></span><input class="input mono" id="primHex" data-hex="primary" data-fk="t-hex-primary" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Primary colour, hex value" aria-describedby="primErr"></div>
          <p class="field-error" id="primErr" hidden>Use a 6-digit hex colour, like #1D4ED8.</p>
          <p class="contrast" id="contrastOut"></p></div>
        ${colorRow("secondary", "Secondary")}${colorRow("accent", "Accent")}</div>
      <div class="in-sec"><p class="in-sec-h"><span class="n">3</span>·<span>Shape &amp; spacing</span></p>${segT("radius", "Corner radius", th.radius, RADIUS_LABELS)}${segT("density", "Density", th.density)}</div>
      <div class="in-sec"><p class="in-sec-h"><span class="n">4</span>·<span>Type</span></p><div class="field"><span class="label" id="hf-l">Heading font</span><div class="font-list" role="radiogroup" aria-labelledby="hf-l">${Object.keys(FONTS).map((k) => `<label class="font-opt"><input type="radio" class="radio" name="hf" value="${k}" data-font data-fk="t-hf-${k}"${t.heading === k ? " checked" : ""}><span class="font-aa" style="font-family:${FONTS[k].stack};font-weight:${FONTS[k].w}" aria-hidden="true">Aa</span><span class="font-name">${FONTS[k].label}<small>${FONTS[k].note}</small></span></label>`).join("")}</div></div></div>
      <div class="in-sec"><p class="in-sec-h"><span class="n">5</span>·<span>Navigation</span></p>${menuSeg(t)}</div>
    </fieldset>`;
  }
  function syncStyle() {
    const p = inspectorEl, t = cfg().theme;
    $$("[data-segt]", p).forEach((b) => b.setAttribute("aria-checked", String(t[b.dataset.segt] === b.dataset.v)));
    const sel = $("#presetSel");
    if (!sel) return;
    sel.value = t.preset;
    $("#presetFlag").innerHTML = isCustom(t) ? `<span class="in-badge">Customised</span>` : "";
    $$("[data-base]", p).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.base === t.base)));
    $$("[data-swatch]", p).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.swatch.toLowerCase() === t.primary.toLowerCase())));
    ["primary", "secondary", "accent"].forEach((k) => {
      const h = $(`[data-hex="${k}"]`, p);
      if (h && document.activeElement !== h) { h.value = t[k].toUpperCase(); h.removeAttribute("aria-invalid"); }
      const c = $(`[data-color="${k}"]`, p);
      if (c && document.activeElement !== c) c.value = t[k];
    });
    $("#primErr").hidden = true;
    $("#primChip").style.setProperty("--c", t.primary);
    $$("[data-font]", p).forEach((r) => { r.checked = r.value === t.heading; });
    const ink = inkOn(t.primary), r = contrast(t.primary, ink);
    $("#contrastOut").innerHTML = `<span class="contrast-chip" style="background:${t.primary};color:${ink}" aria-hidden="true">Aa</span><span>Button text on primary · <b>${r.toFixed(1)}:1</b> · ${r >= 4.5 ? "passes AA" : r >= 3 ? "large text only" : "too low to read"}</span>`;
  }
  function seoPanel() {
    const ro = !editable(), page = ui.page, s = cfg().seo[page], home = page === "Home";
    return `<div class="in-head"><p class="eb">Search · ${page} page</p><h2 class="in-title">SEO</h2><p class="in-sub">How this page appears in search results and browser tabs.</p></div>
    <fieldset class="in-fs"${ro ? " disabled" : ""}><legend class="sr-only">${page} page search settings</legend>
      <div class="in-sec"><p class="in-sec-h"><span class="n">1</span>·<span>Search listing</span></p>
        <div class="field"><div class="label-row"><label class="label" for="seoTitle">Page title</label><span class="count" id="seoTitleN"></span></div><input class="input" id="seoTitle" data-seo="title" data-fk="seo-title" value="${esc(s.title)}" aria-describedby="seoTitleHint" autocomplete="off"><p class="field-description" id="seoTitleHint"></p></div>
        <div class="field"><div class="label-row"><label class="label" for="seoDesc">Meta description</label><span class="count" id="seoDescN"></span></div><textarea class="textarea" id="seoDesc" rows="4" data-seo="desc" data-fk="seo-desc" aria-describedby="seoDescHint">${esc(s.desc)}</textarea><p class="field-description" id="seoDescHint"></p></div>
        <div class="field"><label class="label" for="seoSlug">Page address</label><div class="input-group"><span class="input-addon mono">/</span><input class="input mono" id="seoSlug" data-seo="slug" data-fk="seo-slug" value="${esc(s.slug)}"${home ? " disabled" : ""} aria-describedby="seoSlugHint" autocomplete="off" spellcheck="false"></div><p class="field-description" id="seoSlugHint">${home ? "The home page always lives at the site address." : "Lowercase letters, numbers and hyphens."}</p></div>
      </div>
      <div class="in-sec"><p class="in-sec-h"><span class="n">2</span>·<span>Search result preview</span></p><div class="serp" id="serp"></div></div>
    </fieldset>`;
  }
  function syncSeo() {
    if (!$("#serp")) return;
    const s = cfg().seo[ui.page], tl = s.title.length, dl = s.desc.length;
    const tn = $("#seoTitleN");
    tn.textContent = `${tl} / 60`;
    tn.className = "count" + (tl > 60 ? " is-warn" : "");
    $("#seoTitleHint").textContent = tl === 0 ? "Add a title — search engines show it as the link." : tl > 60 ? "Titles over 60 characters may be shortened in results." : "Shown as the link in search results and on the browser tab.";
    const dn = $("#seoDescN");
    dn.textContent = `${dl} / 160`;
    dn.className = "count" + (dl > 160 ? " is-over" : dl < 70 ? " is-warn" : "");
    $("#seoDescHint").textContent = dl > 160 ? "Search engines usually cut descriptions after about 160 characters." : dl < 70 ? "A little short — aim for 120 to 160 characters." : "A good length for a search summary.";
    const slug = ui.page === "Home" ? "" : SC.slugify(s.slug || SLUGS[ui.page]);
    const trunc = (x, n) => (x.length > n ? x.slice(0, n - 1).trimEnd() + "…" : x);
    $("#serp").innerHTML = `<div class="serp-site"><span class="serp-fav">${crest(14, cfg().theme)}</span><span><b>${esc(SCH.name)}</b><small>https://${SCH.site}${slug ? " › " + esc(slug) : ""}</small></span></div><p class="serp-title">${esc(trunc(s.title || SCH.name, 60))}</p><p class="serp-desc">${s.desc ? esc(trunc(s.desc, 160)) : "No description yet — search engines will pick text from the page."}</p>`;
  }
  function renderInspector() {
    $$(".in-tabs [data-tab]").forEach((t) => { const on = t.dataset.tab === ui.tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    ["content", "style", "seo"].forEach((k) => {
      const panel = $("#panel-" + k), on = k === ui.tab;
      panel.hidden = !on;
      if (!on) { panel.innerHTML = ""; return; }
      panel.innerHTML = k === "content" ? contentPanel() : k === "style" ? stylePanel() : seoPanel();
    });
    if (ui.tab === "style" || isChrome(ui.selected)) syncStyle();
    if (ui.tab === "seo") syncSeo();
  }
  function setTab(k) { ui.tab = k; renderInspector(); }

  function renderAll() { renderTop(); renderOutline(); renderInspector(); renderBanner(); renderSite(); }

  /* ===================== History (undo / redo) ===================== */
  const hist = { undo: [], redo: [], key: null, at: 0 };
  const snap = () => ({ cfg: JSON.stringify(cfg()), page: ui.page, sel: ui.selected });
  function checkpoint(key) {
    const now = Date.now();
    if (key && hist.key === key && now - hist.at < 1500) { hist.at = now; return; }
    hist.undo.push(snap());
    if (hist.undo.length > 120) hist.undo.shift();
    hist.redo = [];
    hist.key = key || null;
    hist.at = now;
  }
  function restore(st) {
    cur().config = JSON.parse(st.cfg);
    ui.page = st.page;
    ui.selected = st.sel;
    if (ui.selected && !isChrome(ui.selected) && !findSec(ui.selected)) ui.selected = null;
    touched();
    renderAll();
  }
  function undo() { if (!editable() || !hist.undo.length) return; hist.redo.push(snap()); restore(hist.undo.pop()); hist.key = null; announce("Undone"); }
  function redo() { if (!editable() || !hist.redo.length) return; hist.undo.push(snap()); restore(hist.redo.pop()); hist.key = null; announce("Redone"); }
  function clearHistory() { hist.undo = []; hist.redo = []; hist.key = null; }
  function touched() { const v = cur(); if (v.status === "draft") v.editedAt = Date.now(); renderTop(); }
  function mutate(key, fn) {
    if (!editable()) { flashNote("Duplicate this version to edit it"); return false; }
    checkpoint(key);
    fn();
    touched();
    return true;
  }

  /* ===================== Edits ===================== */
  function labelOf(id) { if (id === "header") return "Site header"; if (id === "footer") return "Site footer"; const f = findSec(id); return f ? f.s.label : ""; }
  function select(uid, opts) {
    opts = opts || {};
    ui.selected = uid;
    ui.tab = "content";
    keepFocus(() => { renderOutline(); renderInspector(); });
    markCanvasSelection();
    if (opts.scrollCanvas) scrollCanvasTo(uid);
    if (opts.fromCanvas) {
      const row = $(`.ol-sec[data-uid="${uid}"]`);
      if (row) row.scrollIntoView({ block: "nearest" });
    }
    if (narrow.matches && (opts.fromCanvas || opts.fromOutline)) setDrawer("inspector", !!opts.fromOutline);
    announce(`${labelOf(uid)} selected`);
  }
  function setPage(p, selectKey) {
    if (PAGES.indexOf(p) < 0) return;
    ui.page = p;
    ui.selected = null;
    if (selectKey) { const s = (cfg().pages[p] || []).find((x) => x.key === selectKey); if (s) ui.selected = s.uid; }
    keepFocus(renderAll);
    rescueFocus(mode() === "preview" ? desk : null);
    desk.scrollTop = 0;
    announce(`${p} page`);
  }
  function moveSec(uid, dir) {
    const f = findSec(uid);
    if (!f) return;
    const list = cfg().pages[f.page], j = f.i + dir;
    if (j < 0 || j >= list.length) return;
    if (!mutate(null, () => { list.splice(f.i, 1); list.splice(j, 0, f.s); })) return;
    keepFocus(() => { renderOutline(); renderInspector(); }, document.activeElement && document.activeElement.closest("#inspector") ? "in-dup" : "sel-" + uid);
    renderSite();
    scrollCanvasTo(uid);
    announce(`${f.s.label} moved to position ${j + 1}`);
  }
  function dupSec(uid) {
    const f = findSec(uid);
    if (!f) return;
    const copy = clone(f.s);
    copy.uid = newUid();
    copy.required = false;
    copy.visible = true;
    copy.label = f.s.label.replace(/ \(copy\)$/, "") + " (copy)";
    if (!mutate(null, () => { cfg().pages[f.page].splice(f.i + 1, 0, copy); })) return;
    const fromPanel = document.activeElement && document.activeElement.closest("#outline, #inspector");
    ui.selected = copy.uid;
    renderOutline();
    renderInspector();
    renderSite();
    if (fromPanel) { const b = $(`[data-fk="sel-${copy.uid}"]`); if (b) b.focus({ preventScroll: true }); }
    scrollCanvasTo(copy.uid);
    announce(`${copy.label} added`);
  }
  function setVisible(uid, on) {
    const f = findSec(uid);
    if (!f || f.s.required) return;
    if (!mutate(null, () => { f.s.visible = on; })) return;
    keepFocus(() => { renderOutline(); if (ui.tab === "content") renderInspector(); });
    renderSite();
    announce(`${f.s.label} ${on ? "shown" : "hidden"}`);
  }
  function selected() { return ui.selected && !isChrome(ui.selected) ? findSec(ui.selected) : null; }
  function onFieldInput(t) {
    const f = selected();
    if (!f) return;
    const s = f.s, d = t.dataset;
    const key = d.list != null ? `${s.uid}:${d.list}:${d.idx}:${d.ik}` : `${s.uid}:${d.f}`;
    if (!mutate("f:" + key, () => { if (d.list != null) s.fields[d.list][+d.idx][d.ik] = t.value; else s.fields[d.f] = t.value; })) return;
    renderSite();
  }
  function setField(k, v) {
    const f = selected();
    if (!f || String(f.s.fields[k]) === String(v)) return;
    if (!mutate(null, () => { f.s.fields[k] = v; })) return;
    keepFocus(renderInspector);
    renderSite();
  }
  function toggleCheck(t) {
    const f = selected();
    if (!f) return;
    if (!mutate(null, () => { f.s.fields[t.dataset.check][t.dataset.v] = t.checked; })) return;
    renderSite();
  }
  function setTheme(k, v, key) {
    const t = cfg().theme;
    if (String(t[k]).toLowerCase() === String(v).toLowerCase()) return;
    if (!mutate(key || null, () => { t[k] = v; })) return;
    renderSite();
    syncStyle();
    renderOutline();
  }
  function applyPreset(p) {
    if (!PRESETS[p]) return;
    if (!mutate(null, () => { cfg().theme = presetTheme(p); })) return;
    renderSite();
    syncStyle();
    renderOutline();
    announce(`${PRESET_LABELS[p]} preset applied`);
  }
  function onHexInput(t) {
    const m = HEX.exec(t.value.trim()), k = t.dataset.hex, err = k === "primary" ? $("#primErr") : null;
    if (m) {
      t.removeAttribute("aria-invalid");
      if (err) err.hidden = true;
      setTheme(k, "#" + m[1].toLowerCase(), "hex:" + k);
    } else if (t.value.replace("#", "").length >= 6) {
      t.setAttribute("aria-invalid", "true");
      if (err) err.hidden = false;
    }
  }
  function onHexCommit(t) {
    if (HEX.test(t.value.trim())) { t.value = cfg().theme[t.dataset.hex].toUpperCase(); return; }
    t.setAttribute("aria-invalid", "true");
    if (t.dataset.hex === "primary") $("#primErr").hidden = false;
  }
  function onSeoInput(t) {
    const page = ui.page, k = t.dataset.seo;
    if (!mutate(`seo:${page}:${k}`, () => { cfg().seo[page][k] = t.value; })) return;
    syncSeo();
    renderFrameBar();
  }
  function onSlugCommit(t) {
    const page = ui.page, v = SC.slugify(t.value) || SLUGS[page];
    if (v !== t.value) { t.value = v; cfg().seo[page].slug = v; syncSeo(); renderFrameBar(); }
  }

  /* ===================== Modes, devices, drawers ===================== */
  function setDevice(d) {
    if (!DEVICES[d] || d === ui.device) return;
    ui.device = d;
    renderTop();
    fitCanvas();
    if (!SC.reduced()) { frame.classList.remove("is-swap"); void frame.offsetWidth; frame.classList.add("is-swap"); }
    announce(`${DEVICES[d].label} width, ${DEVICES[d].w} pixels`);
  }
  function setMode(m) {
    const prev = mode();
    if (prev === m) return;
    body.dataset.mode = m;
    $("#templates").hidden = m !== "templates";
    setDrawer(null);
    renderTop();
    renderBanner();
    renderSite();
    if (m === "templates") { renderTemplates(); $("#tplTitle").focus({ preventScroll: true }); $("#templates").scrollTop = 0; }
    if (m === "editor" && prev === "templates") { const b = $(".ol-link", outlineEl); if (b && !narrow.matches) b.focus({ preventScroll: true }); }
    if (m === "preview") announce("Preview mode. Press Escape to exit.");
    if (m !== "templates") rescueFocus(m === "preview" ? desk : null);
  }
  function setDrawer(which, focusIn) {
    if (!narrow.matches || mode() !== "editor") which = null;
    ui.drawer = which;
    outlineEl.toggleAttribute("data-open", which === "outline");
    inspectorEl.toggleAttribute("data-open", which === "inspector");
    $("#scrim").hidden = !which;
    $("#olToggle").setAttribute("aria-expanded", String(which === "outline"));
    $("#inToggle").setAttribute("aria-expanded", String(which === "inspector"));
    if (which && focusIn) {
      const panel = which === "outline" ? outlineEl : inspectorEl;
      setTimeout(() => { const f = panel.querySelector("button:not([disabled]), input:not([disabled]), [tabindex='0']"); if (f) f.focus({ preventScroll: true }); }, 30);
    }
  }

  /* ===================== Versions, publish, templates ===================== */
  function newDraft(c) {
    const n = Math.max.apply(null, versions.map((v) => v.n)) + 1;
    const v = { n, status: "draft", editedAt: Date.now(), config: clone(c) };
    versions.push(v);
    ui.viewing = n;
    clearHistory();
    if (ui.selected && !isChrome(ui.selected) && !findSec(ui.selected)) ui.selected = null;
    return v;
  }
  function viewVersion(n) {
    if (n === ui.viewing || !versions.some((v) => v.n === n)) return;
    ui.viewing = n;
    clearHistory();
    if (ui.selected && !isChrome(ui.selected) && !findSec(ui.selected)) ui.selected = null;
    renderAll();
    if (mode() === "templates") renderTemplates();
    rescueFocus();
    announce(`Showing ${verName(cur())}`);
  }
  function duplicateToEdit() {
    const from = cur();
    if (from.status === "draft") return;
    const v = newDraft(from.config);
    renderAll();
    $("#statusBtn").focus({ preventScroll: true });
    SC.toast(`Draft v${v.n} created`, `Copied from ${verName(from)}. Changes stay private until you publish.`, "copy");
  }
  function archiveDraft() {
    const v = cur();
    if (v.status !== "draft") return;
    v.status = "archived";
    v.note = "Draft archived " + todayLabel();
    const next = liveVersion() || versions.filter((x) => x.n !== v.n).sort((a, b) => b.n - a.n)[0];
    ui.viewing = next.n;
    clearHistory();
    if (ui.selected && !isChrome(ui.selected) && !findSec(ui.selected)) ui.selected = null;
    renderAll();
    $("#statusBtn").focus({ preventScroll: true });
    SC.toast(`Draft v${v.n} archived`, "It stays in Versions. The live site is unchanged.", "inbox");
  }

  let publishing = false;
  function openPublish() {
    if (!editable()) return;
    const v = cur(), live = liveVersion(), c = cfg();
    const shown = PAGES.reduce((n, p) => n + c.pages[p].filter((s) => s.visible).length, 0);
    const total = PAGES.reduce((n, p) => n + c.pages[p].length, 0);
    $("#pubEyebrow").textContent = `Publish · ${verName(v)}`;
    $("#pubTitle").textContent = `Publish draft v${v.n}?`;
    $("#pubStep2").textContent = `Saving version ${v.n}`;
    $("#pubLedger").innerHTML = `<dt>Address</dt><dd class="mono">${SCH.site}</dd><dt>Replaces</dt><dd>${live ? `${verName(live)} · since ${live.since}` : "Nothing is live yet"}</dd><dt>Template</dt><dd>${tplName(c.template)} · ${PRESET_LABELS[c.theme.preset] || "Custom"}${isCustom(c.theme) ? ", customised" : ""}</dd><dt>Pages</dt><dd>${PAGES.length} pages · ${shown} of ${total} sections shown</dd>`;
    $("#pubRun").hidden = true;
    $("#pubFoot").hidden = false;
    $$("#pubSteps li").forEach((li) => { li.className = ""; $(".pub-ic", li).innerHTML = ""; });
    $("#pubBar").style.transform = "scaleX(0)";
    $("#pubBarWrap").setAttribute("aria-valuenow", "0");
    publishing = false;
    SC.open(pubDialog);
  }
  function runPublish() {
    if (publishing || !editable()) return;
    publishing = true;
    const v = cur(), steps = $$("#pubSteps li"), bar = $("#pubBar"), T = SC.reduced() ? 150 : 820;
    $("#pubFoot").hidden = true;
    $("#pubRun").hidden = false;
    $("#pubRun").focus({ preventScroll: true });
    pubDialog.setAttribute("aria-busy", "true");
    let i = 0;
    (function step() {
      if (i > 0) { steps[i - 1].className = "is-done"; $(".pub-ic", steps[i - 1]).innerHTML = ic("check", 11); }
      if (i < steps.length) {
        steps[i].className = "is-active";
        bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
        $("#pubBarWrap").setAttribute("aria-valuenow", String(Math.round(((i + 1) / steps.length) * 100)));
        i++;
        setTimeout(step, T);
        return;
      }
      setTimeout(() => finishPublish(v), SC.reduced() ? 60 : 380);
    })();
  }
  function finishPublish(v) {
    const today = todayLabel();
    versions.forEach((x) => { if (x.status === "live") { x.status = "archived"; x.note = `Live ${x.since} – ${today}`; } });
    v.status = "live";
    v.since = today;
    ui.viewing = v.n;
    publishing = false;
    clearHistory();
    pubDialog.removeAttribute("aria-busy");
    SC.close(pubDialog);
    renderAll();
    $("#statusBtn").focus({ preventScroll: true });
    SC.toast("Site published", `${SCH.site} now shows version ${v.n}.`, "circle-check");
    announce(`Published. Version ${v.n} is live.`);
  }

  function templateConfig(key) {
    const c = clone(cfg());
    if (key === c.template) return c;
    c.template = key;
    c.theme = presetTheme(TEMPLATE_PRESET[key]);
    const hero = c.pages.Home.find((s) => s.key === "hero");
    if (hero) hero.fields.visual = key === "crestview" ? "image" : "composition";
    return c;
  }
  function fitThumbs() { $$("#tplGrid .tp-thumb").forEach((th) => fitInto($(".site", th), 1200, th.clientWidth)); }
  function renderTemplates() {
    const c = cfg();
    $("#tplGrid").innerHTML = TEMPLATES.map((t, i) => {
      const inUse = t.key === c.template;
      const main = t.locked ? `<button type="button" class="btn btn-default btn-sm" disabled>${ic("lock", 14)}Requires PRO+</button>`
        : inUse ? `<button type="button" class="btn btn-default btn-sm" data-act="back-editor">Keep editing</button>`
        : `<button type="button" class="btn btn-default btn-sm" data-tpl-create="${t.key}">Create draft</button>`;
      return `<li class="tp-card${t.locked ? " is-locked" : ""}">
        <div class="tp-thumb" inert aria-hidden="true">${t.locked ? `<span class="tp-seal">${ic("lock", 12)}PRO+</span>` : ""}<div class="tp-fit"><div class="site" data-tpl="${t.key}"></div></div></div>
        <div class="tp-meta"><span class="tp-no" aria-hidden="true">${pad(i + 1)}</span><h3 class="tp-name">${t.name}${inUse ? `<span class="tp-inuse">In use</span>` : ""}</h3><p class="eb tp-mood">${t.mood}</p>
          <p class="tp-desc">${t.desc}</p><p class="tp-facts">${t.pages} page layouts · ${t.locked ? "PRO+ plans" : "All plans"} · ${PRESET_LABELS[TEMPLATE_PRESET[t.key]]} preset</p>
          <div class="tp-actions"><button type="button" class="btn btn-outline btn-sm" data-tpl-preview="${t.key}" aria-label="Preview ${t.name}">${ic("eye", 14)}Preview</button>${main}</div></div></li>`;
    }).join("");
    $$("#tplGrid .site").forEach((el) => {
      const tc = templateConfig(el.dataset.tpl);
      applySiteTheme(el, tc);
      el.innerHTML = siteHTML(tc, "Home", { editing: false });
    });
    fitThumbs();
  }
  let tplPending = null;
  function fitTplPreview() { const k = fitInto(tplSite, 1200, $("#tplView").clientWidth); if (k) $("#tplFit").style.height = Math.ceil(tplSite.offsetHeight * k) + "px"; }
  function openTplPreview(key) {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    const c = cfg(), tc = templateConfig(key), inUse = key === c.template;
    tplPending = key;
    $("#tplDEyebrow").textContent = `Template preview · ${t.mood}`;
    $("#tplDTitle").textContent = t.name;
    $("#tplDDesc").textContent = `${t.desc} Shown with Kingsway’s content and the ${PRESET_LABELS[TEMPLATE_PRESET[key]]} preset.`;
    applySiteTheme(tplSite, tc);
    tplSite.innerHTML = siteHTML(tc, "Home", { editing: false });
    const btn = $("#tplDCreate");
    btn.disabled = t.locked || inUse;
    btn.innerHTML = t.locked ? ic("lock", 16) + "Requires PRO+" : inUse ? "In use" : "Create draft";
    $("#tplDNote").textContent = t.locked ? "Crestview is available on PRO+ plans." : inUse ? "This is the template your draft uses." : "";
    SC.open(tplDialog);
    requestAnimationFrame(() => requestAnimationFrame(fitTplPreview));
  }
  function createFromTemplate(key) {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t || t.locked) return;
    const from = cur(), v = newDraft(templateConfig(key));
    if (tplDialog.getAttribute("data-open") === "true") SC.close(tplDialog);
    setMode("editor");
    renderAll();
    const back = $(".ol-link", outlineEl);
    if (back && !narrow.matches) back.focus({ preventScroll: true }); else $("#statusBtn").focus({ preventScroll: true });
    SC.toast(`Draft v${v.n} created`, `${t.name} layout with your content. ${verName(from)} is unchanged.`, "layout-template");
  }

  function openCMS() {
    $("#cmsBody").innerHTML = W.cms.map((c, i) => `<section class="cms-coll" aria-label="${c.name}"><h3><span class="n">${i + 1}</span><span>${c.name}</span><span class="ol-leader" aria-hidden="true"></span><span class="c">${c.count}</span></h3><ul>${(CMS[c.name] || []).map((e) => `<li><span>${esc(e[0])}</span><span>${esc(e[1])}</span></li>`).join("")}</ul></section>`).join("");
    SC.open($("#cmsSheet"));
  }
  function openMedia() {
    const t = cfg().theme;
    const empty = (label, note) => `<div class="media-slot"><div class="media-art is-empty"><span>${ic("image", 20)}Image</span></div><b>${label}</b><small>${note}</small></div>`;
    $("#mediaBody").innerHTML = `<div class="media-grid"><div class="media-slot"><div class="media-art">${crest(56, t)}</div><b>School crest</b><small>From School Profile</small></div>${empty("Hero image", "Not chosen · 1600 × 1280")}${empty("Teacher portraits", "Not chosen · 6 slots")}${empty("Post images", "Not chosen · 4 posts")}</div><div class="media-drop">${ic("upload", 20)}<span>Drop images here or choose files</span><button type="button" class="btn btn-outline btn-sm" disabled>Choose files</button></div>`;
    SC.open($("#mediaSheet"));
  }

  /* ===================== Events ===================== */
  function act(a) {
    switch (a) {
      case "undo": return undo();
      case "redo": return redo();
      case "preview": return setMode(mode() === "preview" ? "editor" : "preview");
      case "publish": return openPublish();
      case "templates": return setMode("templates");
      case "back-editor": return setMode("editor");
      case "duplicate": return duplicateToEdit();
      case "archive": return archiveDraft();
      case "media": return openMedia();
      case "cms": return openCMS();
      default: return undefined;
    }
  }
  const CLICKABLE = "[data-act],[data-page],[data-select],[data-move],[data-dup],[data-device],[data-ver],[data-tpl-preview],[data-tpl-create],[data-segf],[data-segt],[data-swatch],[data-base],[data-tab]";
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest(CLICKABLE);
    if (t && !t.disabled && !t.closest(".site")) {
      const d = t.dataset;
      const pop = t.closest(".popover");
      if (pop) { const trg = $(`[data-menu="#${pop.id}"]`); if (trg) trg.focus({ preventScroll: true }); }
      if (d.act) act(d.act);
      else if (d.tab) setTab(d.tab);
      else if (d.page) setPage(d.page, d.selectKey);
      else if (d.select) select(d.select, { scrollCanvas: true, fromOutline: !!t.closest("#outline") });
      else if (d.move) moveSec(d.uid, d.move === "up" ? -1 : 1);
      else if (d.dup) dupSec(d.dup);
      else if (d.device) setDevice(d.device);
      else if (d.ver) viewVersion(+d.ver);
      else if (d.tplPreview) openTplPreview(d.tplPreview);
      else if (d.tplCreate) createFromTemplate(d.tplCreate);
      else if (d.segf) setField(d.segf, d.v);
      else if (d.segt) setTheme(d.segt, d.v);
      else if (d.swatch) setTheme("primary", d.swatch);
      else if (d.base) setTheme("base", d.base);
    }
    syncMenuTriggers(e);
  });

  $("#pubGo").addEventListener("click", runPublish);
  $("#tplDCreate").addEventListener("click", () => { if (tplPending) createFromTemplate(tplPending); });
  $("#olToggle").addEventListener("click", () => setDrawer(ui.drawer === "outline" ? null : "outline", true));
  $("#inToggle").addEventListener("click", () => setDrawer(ui.drawer === "inspector" ? null : "inspector", true));
  $("#scrim").addEventListener("click", () => setDrawer(null));

  inspectorEl.addEventListener("input", (e) => {
    const t = e.target;
    if (t.tagName === "SELECT") return;
    if (t.dataset.f != null || t.dataset.list != null) onFieldInput(t);
    else if (t.dataset.seo) onSeoInput(t);
    else if (t.dataset.hex) onHexInput(t);
    else if (t.dataset.color) setTheme(t.dataset.color, t.value.toLowerCase(), "color:" + t.dataset.color);
  });
  inspectorEl.addEventListener("change", (e) => {
    const t = e.target;
    if (t.tagName === "SELECT" && t.dataset.f) {
      const f = selected();
      if (f && mutate(null, () => { f.s.fields[t.dataset.f] = t.value; })) renderSite();
    } else if (t.matches("[data-preset]")) applyPreset(t.value);
    else if (t.matches("[data-font]")) setTheme("heading", t.value);
    else if (t.matches("[data-check]")) toggleCheck(t);
    else if (t.matches("[data-vis]")) setVisible(t.dataset.vis, t.checked);
    else if (t.matches("[data-hex]")) onHexCommit(t);
    else if (t.matches('[data-seo="slug"]')) onSlugCommit(t);
  });
  outlineEl.addEventListener("change", (e) => { if (e.target.matches("[data-vis]")) setVisible(e.target.dataset.vis, e.target.checked); });

  frameView.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) e.preventDefault();
    if (mode() === "preview") {
      if (a && a.dataset.goto) { setPage(a.dataset.goto); flashNote(`Opened ${a.dataset.goto}`); }
      else if (a) flashNote("This link opens on the live site");
      return;
    }
    const s = e.target.closest("[data-sec]");
    if (s) select(s.dataset.sec, { fromCanvas: true });
    if (a) flashNote("Links are paused while you edit — use Preview to follow them");
  });
  frameView.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-sec]")) { e.preventDefault(); select(e.target.dataset.sec, { fromCanvas: true }); }
  });
  $("#tplView").addEventListener("click", (e) => { if (e.target.closest("a")) e.preventDefault(); });

  $(".in-tabs").addEventListener("keydown", (e) => {
    const tabs = $$(".in-tabs [role=tab]"), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setTab(tabs[j].dataset.tab);
    tabs[j].focus();
  });

  // Radio groups built from buttons: arrow keys move and select.
  document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(e.key) < 0) return;
    const b = e.target.closest && e.target.closest('[role="radiogroup"] > [role="radio"]');
    if (!b) return;
    const items = $$(':scope > [role="radio"]', b.parentElement).filter((x) => !x.disabled);
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const n = items[(items.indexOf(b) + dir + items.length) % items.length];
    e.preventDefault();
    n.focus();
    n.click();
  });

  // Menus: arrow keys between items.
  document.addEventListener("keydown", (e) => {
    const menu = e.target.closest && e.target.closest(".popover[data-menu-open]");
    if (!menu || ["ArrowDown", "ArrowUp", "Home", "End"].indexOf(e.key) < 0) return;
    const items = $$(".menu-item", menu).filter((b) => !b.disabled && b.offsetParent !== null);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    const j = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    e.preventDefault();
    items[j].focus();
  });

  // Undo / redo shortcuts (native undo stays inside text fields).
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k !== "z" && k !== "y") return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (document.querySelector(".dialog[data-open='true'], .sheet[data-open='true']")) return;
    e.preventDefault();
    if (k === "y" || e.shiftKey) redo(); else undo();
  });

  // Escape: menus first (workshop.js closes them), then drawers, then preview/template modes.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openMenu = document.querySelector(".popover[data-menu-open]");
    if (openMenu) {
      const trg = document.querySelector(`[data-menu="#${openMenu.id}"]`);
      setTimeout(() => { syncMenuTriggers(); if (trg && openMenu.hidden) trg.focus(); }, 0);
      return;
    }
    if (document.querySelector(".dialog[data-open='true'], .sheet[data-open='true']")) return;
    if (ui.drawer) { const w = ui.drawer; setDrawer(null); $(w === "outline" ? "#olToggle" : "#inToggle").focus(); e.preventDefault(); return; }
    if (mode() === "preview" || mode() === "templates") { e.preventDefault(); setMode("editor"); }
  }, true);

  narrow.addEventListener("change", () => setDrawer(null));
  phone.addEventListener("change", () => { if (phone.matches) setDevice("mobile"); });

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      fitCanvas();
      if (mode() === "templates") fitThumbs();
      if (tplDialog.getAttribute("data-open") === "true") fitTplPreview();
    });
    [desk, siteEl, $("#templates"), tplSite, $("#tplView")].forEach((el) => ro.observe(el));
  } else {
    window.addEventListener("resize", () => { fitCanvas(); fitThumbs(); });
  }

  /* ===================== Init ===================== */
  SC.pill({ id: "01", name: "Registry" });
  if (phone.matches) ui.device = "mobile";
  $("#mCmsCount").textContent = `${W.cms.reduce((n, c) => n + c.count, 0)} entries`;
  renderAll();
  setInterval(() => { if (cur().status === "draft") { $("#statusText").textContent = statusText(cur()); } }, 30000);
})();
