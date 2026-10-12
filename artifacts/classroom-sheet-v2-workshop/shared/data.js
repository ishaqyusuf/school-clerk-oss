/* Fictional sample data shared by all three directions. No real people, no network calls.
   Each direction must deep-clone this (SC.fresh()) so options and resets are isolated. */
(function () {
  var classrooms = [
    { id: "jss1a", displayName: "JSS 1 · Gold", className: "JSS 1", stream: "Gold" },
    { id: "jss1b", displayName: "JSS 1 · Silver", className: "JSS 1", stream: "Silver" },
    { id: "jss2a", displayName: "JSS 2 · Gold", className: "JSS 2", stream: "Gold" },
    { id: "pry4", displayName: "Primary 4", className: "Primary 4", stream: "" },
    { id: "ssse", displayName: "SS 1 · Science (empty)", className: "SS 1", stream: "Science" }
  ];

  var first = ["Amina","Chinedu","Fatima","Tunde","Ngozi","Ibrahim","Zainab","Emeka","Halima","Segun","Aisha","Obinna","Hauwa","Kelechi","Maryam","Yusuf","Chiamaka","Abdullahi","Blessing","Musa","Funmilayo","Sani","Adaeze","Bello"];
  var last = ["Bello","Okafor","Abubakar","Adeyemi","Eze","Musa","Lawal","Nwosu","Sani","Ogunleye","Danjuma","Okeke","Ibrahim","Afolabi","Yakubu","Umar","Obi","Garba","Ade","Mohammed","Balogun","Aliyu","Onyeka","Haruna"];
  var guardians = ["Mrs. Bello","Mr. Okafor","Alh. Abubakar","Mrs. Adeyemi","Mr. Eze","Hajia Musa","Mr. Lawal","Mrs. Nwosu","Mal. Sani","Mrs. Ogunleye","Mr. Danjuma","Mrs. Okeke"];
  var admission = ["RETURNING","RETURNING","RETURNING","NEW","RETURNING","NEEDS_CLASSIFICATION"];

  function makeRoster(classId, n, seed) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var f = first[(i * 7 + seed) % first.length], l = last[(i * 5 + seed * 3 + Math.floor(i / first.length)) % last.length];
      out.push({
        id: classId + "-" + (1000 + i * 37 + seed).toString(16) + "a7c2e1f",
        name: f, surname: l, otherName: i % 4 === 0 ? "Oluwaseun" : "",
        studentName: f + " " + l,
        gender: (f.match(/a$|Ngozi|Blessing|Funmilayo|Adaeze|Maryam|Halima/)) ? "Female" : "Male",
        dob: (2013 - (seed % 3)) + "-" + String(1 + (i % 12)).padStart(2, "0") + "-" + String(3 + (i * 3) % 25).padStart(2, "0"),
        enrolled: i % 11 !== 5,
        termFormId: i % 11 !== 5 ? "tf-" + i : null,
        admissionStatus: admission[i % admission.length],
        guardian: guardians[i % guardians.length],
        guardianPhone: "080" + String(31000000 + i * 1373 + seed * 91).slice(0, 8),
        createdAt: "2026-09-" + String(1 + (i % 28)).padStart(2, "0")
      });
    }
    return out;
  }

  var rosters = {
    jss1a: makeRoster("jss1a", 28, 1),
    jss1b: makeRoster("jss1b", 24, 2),
    jss2a: makeRoster("jss2a", 31, 3),
    pry4: makeRoster("pry4", 19, 4),
    ssse: []
  };
  // Duplicate name group in JSS 1 Gold (same child entered twice)
  rosters.jss1a.push(Object.assign({}, rosters.jss1a[2], { id: "jss1a-dup-0042", createdAt: "2026-09-18", admissionStatus: "NEEDS_CLASSIFICATION", guardianPhone: "" }));

  var duplicates = {
    jss1a: [{
      key: "dup1", displayName: rosters.jss1a[2].studentName, records: 2,
      survivor: { id: rosters.jss1a[2].id, className: "JSS 1 · Gold" },
      members: [
        { id: rosters.jss1a[2].id, displayName: rosters.jss1a[2].studentName, recommended: true, historyScore: 46, assessments: 12, attendance: 31, charges: 3, payments: 2 },
        { id: "jss1a-dup-0042", displayName: rosters.jss1a[2].studentName, recommended: false, historyScore: 4, assessments: 0, attendance: 2, charges: 1, payments: 0 }
      ],
      toMove: { termForms: 1, attendance: 2, assessments: 0, charges: 1, payments: 0 },
      conflicts: ["Both records have a First Term 2026/2027 term form — the newer one will be removed."],
      canMerge: true
    }]
  };

  var subjectsCatalog = ["Mathematics","English Language","Basic Science","Social Studies","Civic Education","Islamic Studies","Christian Religious Studies","Yoruba","Hausa","Igbo","Arabic","Computer Studies","Agricultural Science","Creative Arts","Physical & Health Education","Home Economics","Business Studies","French"];

  function makeSubjects(classId, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var assessments = [
        { id: "a1", title: "First CA", obtainable: 20, weight: 20, submissions: 0, print: true, children: [] },
        { id: "a2", title: "Second CA", obtainable: 20, weight: 20, submissions: 0, print: true, children: [] },
        { id: "a3", title: "Examination", obtainable: 60, weight: 60, submissions: 0, print: true, children: [] }
      ];
      if (i === 0) {
        assessments.splice(1, 0, { id: "a4", title: "Project", obtainable: null, weight: 0, submissions: 0, print: false, children: [
          { id: "a4a", title: "Proposal", obtainable: 5, weight: 0, submissions: 0 },
          { id: "a4b", title: "Presentation", obtainable: 15, weight: 0, submissions: 0 }
        ], printMode: "TOTAL" });
      }
      if (i === 2) assessments = [];
      out.push({ id: classId + "-sub-" + i, title: subjectsCatalog[i], description: "", assessments: assessments });
    }
    return out;
  }

  var subjects = { jss1a: makeSubjects("jss1a", 9), jss1b: makeSubjects("jss1b", 9), jss2a: makeSubjects("jss2a", 10), pry4: makeSubjects("pry4", 7), ssse: [] };
  var unattachedSubjects = subjectsCatalog.slice(10, 15);

  var staff = ["Mrs. Okonkwo", "Mr. Adebayo", "Mal. Idris"];
  function makeSessions(classId) {
    var r = rosters[classId]; if (!r.length) return [];
    var days = ["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09"];
    return days.map(function (d, k) {
      var records = r.filter(function (s) { return s.enrolled; }).map(function (s, i) {
        var st = (i + k) % 13 === 0 ? "ABSENT" : (i + k) % 9 === 0 ? "LATE" : "PRESENT";
        return { studentId: s.id, status: st, remarks: st === "ABSENT" ? (i % 2 ? "Sick" : "") : st === "LATE" ? "Traffic" : "" };
      });
      return {
        id: classId + "-att-" + k, title: k === 3 ? "Mathematics" : "Daily attendance",
        type: k === 3 ? "SUBJECT" : "GENERAL", subject: k === 3 ? "Mathematics" : null,
        period: k === 3 ? "Period 2" : "", date: d, takenBy: staff[k % 3], records: records,
        history: [{ action: "Created", actor: staff[k % 3], at: d + " 08:12", summary: records.length + " students marked" }]
          .concat(k === 1 ? [{ action: "Corrected", actor: "Mr. Adebayo", at: d + " 10:40", summary: "1 student changed Absent → Late" }] : [])
      };
    });
  }
  var attendanceSessions = {};
  Object.keys(rosters).forEach(function (c) { attendanceSessions[c] = makeSessions(c); });

  var fees = ["Tuition — First Term", "Development levy", "Uniform", "PTA levy"];
  function makeCharges(classId) {
    return rosters[classId].filter(function (s) { return s.enrolled; }).slice(0, 18).map(function (s, i) {
      var amount = [85000, 15000, 12500, 5000][i % 4];
      var paid = i % 3 === 0 ? amount : i % 3 === 1 ? Math.round(amount * 0.4) : 0;
      return { id: classId + "-ch-" + i, studentId: s.id, studentName: s.studentName, title: fees[i % 4], stream: classrooms.filter(function (c) { return c.id === classId; })[0].stream, amount: amount, amountPaid: paid, outstanding: amount - paid, status: paid === amount ? "PAID" : paid ? "PART_PAID" : "PENDING" };
    });
  }
  var charges = {};
  Object.keys(rosters).forEach(function (c) { charges[c] = makeCharges(c); });

  var data = {
    school: { name: "Kingsway Academy", currency: "NGN" },
    session: { id: "s2627", title: "2026/2027", term: { id: "t1", title: "First Term" } },
    viewer: { name: "Mrs. Adaobi Okonkwo", role: "Admin" }, // Admin | Registrar | Teacher
    roles: ["Admin", "Registrar", "Teacher"],
    classrooms: classrooms,
    rosters: rosters,
    duplicates: duplicates,
    subjects: subjects,
    unattachedSubjects: unattachedSubjects,
    attendanceSessions: attendanceSessions,
    charges: charges,
    feePreview: [ { title: "Tuition — First Term", amount: 85000 }, { title: "Development levy", amount: 15000 }, { title: "PTA levy", amount: 5000 } ],
    assessmentSuggestions: [ { title: "First CA", obtainable: 20, weight: 20 }, { title: "Second CA", obtainable: 20, weight: 20 }, { title: "Examination", obtainable: 60, weight: 60 }, { title: "Assignment", obtainable: 10, weight: 10 } ],
    today: "2026-10-12"
  };

  window.SC = window.SC || {};
  window.SC.data = data;
  window.SC.fresh = function () { return JSON.parse(JSON.stringify(data)); };
  window.SC.money = function (n) { return "₦" + Math.round(n || 0).toLocaleString("en-NG"); };
  window.SC.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  window.SC.initials = function (s) { return String(s || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(""); };
  window.SC.fmtDate = function (iso) { var d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
  window.SC.fmtDay = function (iso) { var d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
})();
