import {
  createNavLink,
  createNavModule,
  createNavSection,
  initPermAccess,
  initRoleAccess,
} from "@school-clerk/ui/nav/utils";
type Permission = any | null | string | undefined;
type moduleNames =
  | "HRM"
  | "Bursary"
  | "Community"
  | "Settings"
  | "PTA"
  | "Academic";

type sectionNames = "main" | "sales";
type Link = {
  name;
  title;
  href?;
  links?: {
    name;
    link: string;
    title;
  }[];
};
const _section = (
  name: any,
  title?: string,
  links?: Link[],
  access: Access[] = [],
) => ({
  name,
  title,
  links,
  access,
});
// type linkNames = "HRM" | "customer-services" | "Dashboard" | "Sales";

type Access = {
  type: "role" | "permission";
  equator: "is" | "isNot" | "in" | "notIn" | "every" | "some";
  values: string[];
};
const __access = (
  type: Access["type"],
  equator: Access["equator"],
  ...values
) => ({ type, equator, values }) as Access;

type Role =
  | "Admin"
  | "Teacher"
  | "Student"
  | "Parent"
  | "Accountant"
  | "Registrar"
  | "HR"
  | "Staff"
  | "Support";
const _role = initRoleAccess("" as Role);
const _perm = initPermAccess("" as Permission);

export const linkModules = [
  createNavModule("Community", "school", "School Management", [
    createNavSection("main", "General", [
      createNavLink("Dashboard", "dashboard", "/dashboard").access(
        _role.in("Admin", "Staff"),
      ).data,
      createNavLink("Announcements", "speaker", "/announcements").access(
        _role.in("Admin", "Teacher"),
      ).data,
      createNavLink("Calendar", "calendar", "/calendar").access(
        _role.in("Admin", "Staff"),
      ).data,
    ]),
  ]),

  createNavModule("HRM", "users", "HR & Staff", [
    createNavSection("main", "Staff Management", [
      createNavLink("Teachers", "users", "/staff/teachers").access(
        _role.is("Admin"),
      ).data,
      createNavLink(
        "Non-Teaching Staff",
        "users",
        "/staff/non-teaching",
      ).access(_role.is("Admin")).data,
      createNavLink("Departments", "building", "/staff/departments").access(
        _role.is("Admin"),
      ).data,
      createNavLink("Attendance", "calendar-check", "/staff/attendance").access(
        _role.in("Admin", "HR"),
      ).data,
      createNavLink("Payroll", "wallet", "/staff/payroll").access(
        _role.is("Admin"),
      ).data,
    ]),
  ]),

  createNavModule("Bursary", "wallet", "Finance & Payments", [
    createNavSection("dashboard", null, [
      createNavLink("Dashboard", "dashboard", "/finance").access(
        _role.is("Admin"),
      ).data,
    ]),
    createNavSection("main", "Finance Managment", [
      createNavLink(
        "Fee Management",
        "coins",
        "/finance/fees-management",
      ).access(_role.is("Admin")).data,
      createNavLink("Billables", "coins", "/finance/billables").access(
        _role.is("Admin"),
      ).data,
    ]),
    createNavSection("main", "Fees", [
      createNavLink(
        "Transactions",
        "file-text",
        "/finance/transactions",
      ).access(_role.in("Admin", "Accountant")).data,
      createNavLink(
        "Student Fees",
        "file-text",
        "/finance/student-fees",
      ).access(_role.in("Admin", "Accountant")).data,
      createNavLink("Bills", "file-text", "/finance/bills").access(
        _role.in("Admin", "Accountant"),
      ).data,
      createNavLink("Payments", "credit-card", "/finance/payments").access(
        _role.in("Admin", "Accountant"),
      ).data,
    ]),
  ]),

  createNavModule("Academic", "graduation-cap", "Academic", [
    createNavSection("dashboard", null, [
      createNavLink("Dashboard", "dashboard", "/academic")
        .access(_role.is("Admin"))
        .childPaths("/academic").data,
    ]),
    // createNavLink("Student List", "users", "/students/list").access(
    //   _role.in("Admin", "Teacher"),
    // ).data,
    createNavSection("main", "Students", [
      createNavLink("Student List", "users", "/students/list").access(
        _role.in("Admin", "Teacher"),
      ).data,
      createNavLink("Enrollment", "user-plus", "/students/enrollment").access(
        _role.in("Admin", "Registrar"),
      ).data,
      createNavLink("Classes", "list", "/academic/classes").access(
        _role.in("Admin", "Teacher"),
      ).data,
      createNavLink("Subjects", "book", "/academic/subjects").access(
        _role.in("Admin", "Teacher"),
      ).data,
    ]),
    createNavSection("main", "Assessment", [
      createNavLink(
        "Tests & Exams",
        "clipboard-list",
        "/academic/assessments",
      ).access(_role.in("Admin", "Teacher")).data,
      createNavLink("Grading", "award", "/academic/grading").access(
        _role.in("Admin", "Teacher"),
      ).data,
      createNavLink("Report Cards", "file-text", "/academic/reports").access(
        _role.in("Admin", "Teacher"),
      ).data,
    ]),
  ]),

  createNavModule("PTA", "user", "Parent Portal", [
    createNavSection("main", "Engagement", [
      createNavLink(
        "Student Performance",
        "bar-chart",
        "/parents/performance",
      ).access(_role.is("Parent")).data,
      createNavLink(
        "Communication",
        "message-square",
        "/parents/messages",
      ).access(_role.is("Parent")).data,
      createNavLink("Payments", "credit-card", "/parents/payments").access(
        _role.is("Parent"),
      ).data,
    ]),
  ]),

  createNavModule("Settings", "settings", "Settings", [
    createNavSection("main", "Configuration", [
      createNavLink(
        "School Profile",
        "settings",
        "/settings/school-profile",
      ).access(_role.is("Admin")).data,
      createNavLink(
        "Academic Session",
        "calendar",
        "/settings/sessions",
      ).access(_role.is("Admin")).data,
      createNavLink("Roles & Permissions", "shield", "/settings/roles").access(
        _role.is("Admin"),
      ).data,
    ]),
  ]),
];
export function getLinkModules() {
  let i = {
    section: 0,
    links: 0,
    subLinks: 0,
  };
  const modules = linkModules.map((m, mi) => {
    m.index = mi;
    m.sections = m.sections.map((s, si) => {
      s.index = si;
      s.globalIndex = i.section++;
      // i.section += 1;
      s.links = s.links.map((l, li) => {
        l.index = li;
        l.globalIndex = i.links++;
        return l;
      });
      return s;
    });
    return m;
  });
  return modules;
}
