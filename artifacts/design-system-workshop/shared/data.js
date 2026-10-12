/* School Clerk design-system workshop — shared sample data.
   Every direction renders the SAME content so the comparison is about design, not copy.
   Illustrative only: names and figures are invented examples, never customer evidence. */
(function () {
  var school = {
    name: "Kingsway Academy",
    short: "Kingsway",
    initials: "KA",
    motto: "Knowledge, character, service",
    city: "Ibadan",
    state: "Oyo",
    type: "k12",
    subdomain: "kingsway",
    site: "kingsway.school-clerk.com",
    dashboard: "dashboard.kingsway.school-clerk.com",
    students: 486,
    staff: 41,
  };

  var session = { title: "2026/2027", term: "First Term", termShort: "1st Term", week: 4, weeks: 13, start: "14 Sep 2026", end: "18 Dec 2026" };
  var sessions = [
    { title: "2026/2027", terms: ["First Term", "Second Term", "Third Term"], current: true },
    { title: "2025/2026", terms: ["First Term", "Second Term", "Third Term"], current: false },
  ];

  var user = { name: "Aisha Bello", first: "Aisha", initials: "AB", role: "Administrator", email: "aisha.bello@kingsway.edu.ng" };

  // Canonical institution types (apps/dashboard/src/features/signup/institution-types.ts)
  var institutionTypes = [
    { id: "k12", label: "K-12 School", desc: "Nursery, primary and secondary under one roof.", status: "ready", badge: "Ready" },
    { id: "college", label: "College", desc: "Departments, programmes and semesters.", status: "soon", badge: "Coming soon" },
    { id: "university", label: "University", desc: "Faculties, departments and credit units.", status: "soon", badge: "Coming soon" },
    { id: "vocational", label: "Vocational Institute", desc: "Short courses, cohorts and certificates.", status: "soon", badge: "Coming soon" },
    { id: "other", label: "Other Institution", desc: "Religious schools, training centres and more.", status: "contact", badge: "Contact us" },
  ];
  // Marketing-level institution fit list (apps/marketing/src/components/landing/data.ts)
  var institutionFit = ["Pre-school", "Primary", "Secondary", "College", "Polytechnic", "University", "Training institute", "Religious school"];

  var classSuggestions = ["Creche", "Pre Nur", "Nur 1", "Nur 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

  var classrooms = [
    { name: "Nur 2", level: 4, arms: ["A", "B"], students: 38, teacher: "Mrs. Funmi Adeyemi" },
    { name: "Basic 3", level: 7, arms: ["A", "B"], students: 52, teacher: "Mr. Chidi Okafor" },
    { name: "Basic 5", level: 9, arms: ["Emerald", "Gold"], students: 47, teacher: "Mrs. Halima Sani" },
    { name: "JSS 1", level: 10, arms: ["A", "B", "C"], students: 71, teacher: "Mr. Tunde Bakare" },
    { name: "JSS 2", level: 11, arms: ["A", "B"], students: 64, teacher: "Mrs. Ngozi Eze" },
    { name: "SS 1", level: 13, arms: ["Science", "Arts"], students: 58, teacher: "Mr. Ibrahim Lawal" },
  ];

  // status: active | pending | withdrawn ; admission: new | returning ; fee: paid | part | owing | overdue
  var students = [
    { id: "KWA/2026/0142", first: "Adaeze", last: "Okonkwo", gender: "F", cls: "JSS 2", arm: "A", admission: "returning", status: "enrolled", fee: "paid", billed: 205500, paid: 205500, guardian: "Mr. Emeka Okonkwo", phone: "+234 803 412 7781", dob: "2014-03-11" },
    { id: "KWA/2026/0188", first: "Ibrahim", last: "Musa", gender: "M", cls: "JSS 2", arm: "A", admission: "returning", status: "enrolled", fee: "part", billed: 205500, paid: 120000, guardian: "Hajiya Zainab Musa", phone: "+234 806 220 1934", dob: "2013-11-02" },
    { id: "KWA/2026/0203", first: "Toluwani", last: "Adebayo", gender: "F", cls: "JSS 2", arm: "B", admission: "new", status: "not-enrolled", fee: "owing", billed: 208000, paid: 0, guardian: "Mrs. Bisi Adebayo", phone: "+234 809 551 0042", dob: "2014-06-21" },
    { id: "KWA/2026/0119", first: "Chinedu", last: "Eze", gender: "M", cls: "JSS 2", arm: "B", admission: "returning", status: "enrolled", fee: "overdue", billed: 205500, paid: 50000, guardian: "Dr. Ifeoma Eze", phone: "+234 802 774 3310", dob: "2013-08-15" },
    { id: "KWA/2026/0156", first: "Maryam", last: "Abdullahi", gender: "F", cls: "JSS 2", arm: "A", admission: "returning", status: "enrolled", fee: "paid", billed: 205500, paid: 205500, guardian: "Alh. Sani Abdullahi", phone: "+234 805 118 9027", dob: "2014-01-30" },
    { id: "KWA/2026/0171", first: "David", last: "Olawale", gender: "M", cls: "JSS 2", arm: "B", admission: "returning", status: "enrolled", fee: "part", billed: 205500, paid: 160000, guardian: "Mr. Kunle Olawale", phone: "+234 816 902 4418", dob: "2013-12-09" },
    { id: "KWA/2026/0210", first: "Fatima", last: "Yusuf", gender: "F", cls: "JSS 2", arm: "A", admission: "new", status: "enrolled", fee: "paid", billed: 208000, paid: 208000, guardian: "Mal. Yusuf Garba", phone: "+234 703 664 2251", dob: "2014-04-17" },
    { id: "KWA/2026/0134", first: "Oluwaseun", last: "Ajayi", gender: "M", cls: "JSS 2", arm: "A", admission: "returning", status: "enrolled", fee: "owing", billed: 205500, paid: 0, guardian: "Mrs. Kemi Ajayi", phone: "+234 813 337 5096", dob: "2013-09-27" },
    { id: "KWA/2026/0162", first: "Amarachi", last: "Nwosu", gender: "F", cls: "JSS 2", arm: "B", admission: "returning", status: "enrolled", fee: "paid", billed: 205500, paid: 205500, guardian: "Mr. Obinna Nwosu", phone: "+234 806 740 1183", dob: "2014-02-05" },
    { id: "KWA/2026/0097", first: "Yusuf", last: "Danjuma", gender: "M", cls: "JSS 2", arm: "B", admission: "unclassified", status: "not-enrolled", fee: "part", billed: 205500, paid: 100000, guardian: "Mr. Danjuma Bala", phone: "+234 802 993 6604", dob: "2013-07-19" },
    { id: "KWA/2026/0215", first: "Temiloluwa", last: "Ogunleye", gender: "F", cls: "JSS 2", arm: "A", admission: "new", status: "not-enrolled", fee: "owing", billed: 208000, paid: 0, guardian: "Mrs. Yemisi Ogunleye", phone: "+234 811 205 7730", dob: "2014-05-08" },
    { id: "KWA/2026/0128", first: "Emmanuel", last: "Udo", gender: "M", cls: "JSS 2", arm: "A", admission: "returning", status: "enrolled", fee: "paid", billed: 205500, paid: 205500, guardian: "Mrs. Grace Udo", phone: "+234 708 431 9952", dob: "2013-10-23" },
  ];

  var feeLabels = { paid: "Paid", part: "Part-paid", owing: "Owing", overdue: "Overdue" };
  var statusLabels = { enrolled: "Enrolled", "not-enrolled": "Not enrolled" };
  var admissionLabels = { new: "New admission", returning: "Returning", unclassified: "Needs classification" };

  var fees = [
    { title: "Tuition", type: "Required", audience: "JSS 1 – JSS 3", amount: 185000 },
    { title: "PTA Levy", type: "Required", audience: "All classes", amount: 10000 },
    { title: "Exam Fee", type: "Required", audience: "All classes", amount: 7500 },
    { title: "Portal Fee", type: "Required", audience: "All classes", amount: 3000 },
    { title: "ID Card", type: "Required", audience: "New students", amount: 2500 },
    { title: "Uniform (2 sets)", type: "Optional", audience: "New students", amount: 32500 },
    { title: "School Bus", type: "Optional", audience: "Opt-in", amount: 45000 },
  ];

  // Payments received (finance › payments). method: Transfer | Cash | POS
  var payments = [
    { receipt: "RCP-26-00412", date: "09 Oct", student: "Adaeze Okonkwo", cls: "JSS 2 A", payer: "Emeka Okonkwo", method: "Transfer", amount: 92500, allocation: "Tuition, PTA Levy", status: "paid", by: "Bursar · Kola" },
    { receipt: "RCP-26-00411", date: "09 Oct", student: "Ibrahim Musa", cls: "JSS 2 A", payer: "Zainab Musa", method: "POS", amount: 70000, allocation: "Tuition", status: "paid", by: "Bursar · Kola" },
    { receipt: "RCP-26-00410", date: "08 Oct", student: "David Olawale", cls: "JSS 2 B", payer: "Kunle Olawale", method: "Transfer", amount: 60000, allocation: "Pending allocation", status: "paid", by: "Parent portal" },
    { receipt: "RCP-26-00409", date: "08 Oct", student: "Fatima Yusuf", cls: "JSS 2 A", payer: "Yusuf Garba", method: "Cash", amount: 208000, allocation: "All term fees", status: "paid", by: "Bursar · Kola" },
    { receipt: "RCP-26-00408", date: "07 Oct", student: "Chinedu Eze", cls: "JSS 2 B", payer: "Ifeoma Eze", method: "Transfer", amount: 50000, allocation: "Tuition", status: "paid", by: "Bursar · Kola" },
    { receipt: "RCP-26-00407", date: "07 Oct", student: "Amarachi Nwosu", cls: "JSS 2 B", payer: "Obinna Nwosu", method: "Transfer", amount: 205500, allocation: "All term fees", status: "paid", by: "Parent portal" },
    { receipt: "RCP-26-00406", date: "06 Oct", student: "Yusuf Danjuma", cls: "JSS 2 B", payer: "Danjuma Bala", method: "Cash", amount: 20000, allocation: "Refund requested", status: "refunded", by: "Bursar · Kola" },
    { receipt: "RCP-26-00405", date: "06 Oct", student: "Emmanuel Udo", cls: "JSS 2 A", payer: "Grace Udo", method: "POS", amount: 112500, allocation: "Tuition, Exam Fee", status: "paid", by: "Bursar · Kola" },
  ];
  var paymentStatusLabels = { paid: "Paid", refunded: "Refunded", cancelled: "Cancelled" };
  // Charge statuses (finance-charges): draft | pending | partially_paid | paid | cancelled | waived
  var chargeStatusLabels = { draft: "Draft", pending: "Pending", partially_paid: "Partially paid", paid: "Paid", cancelled: "Cancelled", waived: "Waived" };


  // Admin navigation (apps/dashboard/src/features/navigation/dashboard-nav-modules/*). Upcoming items omitted.
  var nav = [
    { module: "Overview", icon: "layout-dashboard", sections: [ { items: [ { label: "Dashboard", icon: "layout-dashboard" }, { label: "Assistant", icon: "sparkles" } ] } ] },
    { module: "People", icon: "users", sections: [
      { title: "Student Records", items: [ { label: "Students", icon: "users", count: 486 }, { label: "Enrollment", icon: "user-plus", count: 3 } ] },
      { title: "Staff", items: [ { label: "Teachers", icon: "graduation-cap" }, { label: "Non-Teaching Staff", icon: "briefcase" }, { label: "Departments", icon: "building-2" } ] },
      { title: "Workforce", items: [ { label: "Staff Attendance", icon: "calendar-check" } ] } ] },
    { module: "Academics", icon: "book-open", sections: [
      { items: [ { label: "Overview", icon: "layout-grid" } ] },
      { title: "Curriculum", items: [ { label: "Classes", icon: "school" }, { label: "Subjects", icon: "book-open" } ] },
      { title: "Assessment & Results", items: [ { label: "Assessment Recording", icon: "notebook-pen" }, { label: "Class Report Sheets", icon: "file-spreadsheet" }, { label: "Student Reports", icon: "file-text" } ] } ] },
    { module: "Finance", icon: "wallet", sections: [
      { items: [ { label: "Overview", icon: "chart-column" } ] },
      { title: "Collections", items: [ { label: "Receive Payment", icon: "hand-coins" }, { label: "Student Balances", icon: "scale" }, { label: "Collections", icon: "coins" } ] },
      { title: "Payables", items: [ { label: "All Payables", icon: "receipt" }, { label: "Service Bills", icon: "receipt-text" }, { label: "Owing & Repayments", icon: "history" } ] },
      { title: "Accounting", items: [ { label: "Accounts", icon: "landmark" }, { label: "Transfers", icon: "arrow-up-down" }, { label: "Ledger", icon: "notebook-tabs" }, { label: "Reconciliation", icon: "check-check" } ] },
      { title: "Setup", items: [ { label: "Fee Structures", icon: "layers" }, { label: "Service Billables", icon: "tags" } ] } ] },
    { module: "Operations", icon: "boxes", sections: [ { items: [ { label: "Inventory", icon: "boxes" } ] } ] },
    { module: "Settings", icon: "settings", sections: [
      { title: "School", items: [ { label: "School Profile", icon: "school" }, { label: "Assistant", icon: "sparkles" } ] },
      { title: "Documents", items: [ { label: "Document Templates", icon: "file-text" } ] },
      { title: "Website", items: [ { label: "Website", icon: "globe" }, { label: "Website Media", icon: "images" } ] } ] },
  ];
  // Teacher role gets one module: Teaching — My Classes, My Students, Attendance, Score Entry, Reports.

  // Website generator (packages/template-registry). Drafts are isolated; published configs are immutable (duplicate to edit).
  var website = {
    templates: [
      { id: "k12-plus-template-1", name: "Scholaris", mood: "Academic", desc: "Formal, editorial, results-forward.", pages: 10, plan: "All plans" },
      { id: "k12-plus-template-2", name: "Northfield", mood: "Warm & family", desc: "Friendly photography, parent-first copy.", pages: 10, plan: "All plans" },
      { id: "k12-plus-template-3", name: "Crestview", mood: "Premium", desc: "Executive campus look with large imagery.", pages: 10, plan: "PRO+" },
      { id: "k12-plus-template-4", name: "Kaleidoscope", mood: "Colourful", desc: "Bright blocks for nursery and primary.", pages: 10, plan: "All plans" },
    ],
    pages: ["Home", "About", "Admissions", "Blog", "Events", "Resources", "Contact"],
    sections: [
      { page: "Home", key: "hero", label: "Hero", required: true, fields: { kicker: "Admissions open for 2026/2027", title: "A school where every child is known", body: "Kingsway Academy in Ibadan offers nursery, primary and secondary education with small classes, strong results and a caring community.", cta: "Apply for admission" } },
      { page: "Home", key: "features", label: "Feature cards", required: false, items: ["Small classes", "STEM labs", "Qur’an & Arabic", "Sports & clubs"] },
      { page: "Home", key: "stats", label: "Stats", required: false, items: [["486", "Students"], ["41", "Staff"], ["15", "Years"]] },
      { page: "Home", key: "staff", label: "Staff spotlight", required: false },
      { page: "Home", key: "admission", label: "Admission links", required: false },
      { page: "Home", key: "announcements", label: "Announcements", required: false, items: ["Mid-term break: 30 Oct – 2 Nov", "PTA meeting, Saturday 17 Oct", "Inter-house sports registration open"] },
      { page: "About", key: "story", label: "School story", required: true },
      { page: "Admissions", key: "process", label: "Admissions process", required: true },
      { page: "Contact", key: "contact", label: "Contact information", required: true },
    ],
    theme: {
      presets: ["classic-academic", "bright-campus", "sunlit-family", "executive-campus", "nova", "vega", "maia", "mira", "lyra"],
      baseColors: ["slate", "zinc", "neutral", "stone", "taupe"],
      radius: ["none", "sm", "md", "lg", "xl", "full"],
      density: ["compact", "comfortable", "airy"],
      menu: ["default", "translucent", "solid"],
      swatches: ["#1d4ed8", "#0f766e", "#7c2d12", "#6d28d9", "#be123c", "#15803d"],
    },
    cms: [ { name: "Announcements", count: 6 }, { name: "Blog posts", count: 4 }, { name: "Events", count: 3 }, { name: "Resources", count: 9 } ],
    status: { draft: "Draft · edited 4 min ago", live: "Live since 12 Sep 2026" },
  };

  var finance = { billed: 98450000, collected: 71320000, outstanding: 27130000, rate: 72.4, todayCollected: 1842500 };

  var attendance = { present: 451, absent: 23, late: 12, rate: 92.8, classesMarked: 17, classesTotal: 21 };

  var staff = [
    { name: "Kola Adewale", role: "Accountant", email: "kola@kingsway.edu.ng", status: "active" },
    { name: "Ngozi Eze", role: "Teacher", email: "ngozi.eze@kingsway.edu.ng", status: "active", classes: "JSS 2 A, JSS 2 B" },
    { name: "Ibrahim Lawal", role: "Teacher", email: "i.lawal@kingsway.edu.ng", status: "invited" },
    { name: "Bukola Fashola", role: "Registrar", email: "registrar@kingsway.edu.ng", status: "active" },
  ];
  var staffRoles = ["Admin", "Teacher", "Accountant", "Registrar", "HR", "Staff", "Support"];

  // Things that need attention today (dashboard home / activity)
  var tasks = [
    { icon: "user-check", text: "3 admissions waiting for approval", meta: "Students › Approvals", tone: "warning" },
    { icon: "clipboard-check", text: "4 classes haven’t marked attendance", meta: "Attendance › Today", tone: "info" },
    { icon: "hand-coins", text: "₦60,000 transfer needs allocation", meta: "Finance › Payments", tone: "warning" },
    { icon: "notebook-pen", text: "JSS 2 Mathematics CA 2 is 80% recorded", meta: "Academics › Assessments", tone: "neutral" },
  ];

  var plans = [
    { eyebrow: "One-time setup", price: "₦50k–₦200k", desc: "Configuration, guided onboarding, and data migration shaped around your institution." },
    { eyebrow: "Monthly platform", price: "₦10k–₦50k", desc: "A school-sized subscription covering the platform, updates, and ongoing support.", featured: true },
    { eyebrow: "Optional add-ons", price: "As needed", desc: "Add AI assistance, SMS notifications, or a white-label mobile app when you are ready." },
  ];

  var faqs = [
    { q: "Which institutions can use SchoolClerk?", a: "SchoolClerk supports pre-schools, primary and secondary schools, colleges, polytechnics, universities, training institutes, religious schools, and education groups." },
    { q: "Can it match our academic structure?", a: "Yes. Configure terms or semesters, class arms or levels, departments, programmes, grading rules, and the modules your institution actually uses." },
    { q: "What happens to our existing records?", a: "The setup process includes guided migration. We map your existing student, academic, and finance records into the SchoolClerk structure before your team goes live." },
    { q: "Do we have to enable every module?", a: "No. Start with the workflows you need today and enable more modules as your operations mature. Each school keeps its own configuration." },
    { q: "Do we get a school website?", a: "Yes. Every school gets a public website at its own address, built from a template you can edit, with admissions and the parent portal linked in." },
    { q: "How is pricing calculated?", a: "Pricing is sized to the institution and the modules it needs. The current range is ₦50,000–₦200,000 for setup and ₦10,000–₦50,000 monthly." },
  ];

  // Product story beats (marketing). Truthful: describe workflows that exist.
  var workflows = [
    { key: "admit", title: "Admit students once", body: "Move approved applicants into complete student records without entering the same information again.", chain: ["Application", "Enrolment", "Student profile"] },
    { key: "day", title: "Run the school day", body: "Keep attendance, classes, assessments, report cards, staff, and communication in the same academic context.", chain: ["Class roster", "Attendance", "Results"] },
    { key: "money", title: "See every payment", body: "Connect fee schedules, family balances, collections, payables, and finance reporting without spreadsheet reconciliation.", chain: ["Billable", "Payment", "Ledger"] },
  ];

  var roles = [
    { id: "admin", label: "Administrator", title: "See the whole institution without chasing updates.", body: "Monitor setup, student movement, staff activity, attendance, finance, and the work that still needs attention.", actions: ["Review pending admissions", "Publish the academic term", "Check school-wide activity"] },
    { id: "bursar", label: "Bursar", title: "Move from balances to the underlying records in one click.", body: "Track collections, allocations, accounts, services, payroll, owing, and reconciliations from one finance workspace.", actions: ["Receive a student payment", "Review outstanding owing", "Reconcile the term ledger"] },
    { id: "teacher", label: "Teacher", title: "Keep the school day focused on the class in front of you.", body: "Move between assigned classes, student rosters, attendance, assessment scores, and reports with the correct class already selected.", actions: ["Take morning attendance", "Record assessment scores", "Prepare term reports"] },
    { id: "parent", label: "Parent", title: "Give families one dependable view of school life.", body: "Parents can follow ward enrollment, balances, collection status, and school-provided items without calling the office for every answer.", actions: ["Review ward status", "Check the fee summary", "See books and uniform items"] },
  ];

  var modules = [
    { icon: "users", name: "Students", body: "Profiles, admissions, approvals, class changes, promotion." },
    { icon: "clipboard-check", name: "Attendance", body: "Daily class registers with partial marking and late arrivals." },
    { icon: "notebook-pen", name: "Assessments & results", body: "CA and exam scores, grading, report cards, result portal." },
    { icon: "wallet", name: "Fees & finance", body: "Billables, payments, allocations, ledger, payables, streams." },
    { icon: "briefcase", name: "Staff", body: "Invitations, roles, class and subject access." },
    { icon: "globe", name: "School website", body: "A public site at your own address, built from templates." },
    { icon: "megaphone", name: "Announcements", body: "Notices to staff, classes and families." },
    { icon: "boxes", name: "Inventory", body: "Books, uniforms and school-provided items." },
  ];

  function money(n, opts) {
    opts = opts || {};
    var v = Math.round(n);
    var s = v.toLocaleString("en-NG");
    return (opts.noSymbol ? "" : "₦") + s;
  }
  function compact(n) {
    if (n >= 1e6) return "₦" + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, "") + "m";
    if (n >= 1e3) return "₦" + Math.round(n / 1e3) + "k";
    return "₦" + n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function initials(name) {
    return String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("") || "—";
  }
  function slugify(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }
  var reserved = ["www", "app", "dashboard", "admin", "api", "mail", "help", "support", "school", "schools", "login"];
  var taken = ["greenfield", "greenfield-academy", "kings-college", "queens-school", "lagos-grammar"];
  // Simulated subdomain check — mirrors product messages. Never calls a server.
  function checkSubdomain(v) {
    v = String(v || "").toLowerCase();
    if (!v) return { state: "idle", msg: "" };
    if (!/^[a-z0-9-]+$/.test(v)) return { state: "error", msg: "Use only letters, numbers, and hyphens." };
    if (v.length < 2) return { state: "error", msg: "Use at least 2 characters." };
    if (reserved.indexOf(v) > -1) return { state: "error", msg: "That subdomain is reserved." };
    if (taken.indexOf(v) > -1) return { state: "error", msg: "That subdomain is already taken." };
    return { state: "ok", msg: "This subdomain is available." };
  }

  window.SC = window.SC || {};
  Object.assign(window.SC, {
    data: {
      school: school, session: session, sessions: sessions, user: user,
      institutionTypes: institutionTypes, institutionFit: institutionFit,
      classSuggestions: classSuggestions, classrooms: classrooms,
      students: students, feeLabels: feeLabels, statusLabels: statusLabels, admissionLabels: admissionLabels,
      fees: fees, payments: payments, paymentStatusLabels: paymentStatusLabels, chargeStatusLabels: chargeStatusLabels, nav: nav, website: website, finance: finance,
      attendance: attendance, staff: staff, staffRoles: staffRoles, tasks: tasks,
      plans: plans, faqs: faqs, workflows: workflows, roles: roles, modules: modules,
    },
    money: money, compact: compact, esc: esc, initials: initials, slugify: slugify, checkSubdomain: checkSubdomain,
  });
})();
