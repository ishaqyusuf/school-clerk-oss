// import { ICan, PermissionScope } from "@/types/auth";
import type { IconKeys } from "@school-clerk/ui/custom/icons";
import {
  createNavLink,
  createNavModule,
  createNavSection,
  initRoleAccess,
} from "@school-clerk/ui/nav/utils";
// import { IconKeys } from "../_v1/icons";
// import { schema } from "./context";
// import { sum } from "@/lib/utils";

type moduleNames =
  | "Teachers"
  | "HRM"
  | "Bursary"
  | "Community"
  | "Settings"
  | "PTA"
  | "Academic";
const _module = (
  name: moduleNames,
  icon: IconKeys,
  // title?,
  subtitle?,
  sections: ReturnType<typeof _section>[] = [],
) => ({
  name,
  icon,
  title: name,
  subtitle,
  sections,
  index: -1,
  activeLinkCount: 0,
  activeSubLinkCount: 0,
  defaultLink: null,
});
// type sectionNames = "main" | "sales";
export type LinkItem = {
  name;
  title;
  href?;
  paths?: string[];
  level?;
  show?: boolean;
  meta?: boolean;
  globalIndex?;
  index?;
  access?;
  // links?: {
  //     name;
  //     link: string;
  //     title;
  // }[];
};
const _section = (
  name: string,
  title?: string,
  links?: (ReturnType<typeof _link>["data"] | undefined)[],
  access: Access[] = [],
) => ({
  name,
  title,
  links: links.filter(Boolean).map((a) => a),
  access,
  index: -1,
  globalIndex: -1,
  linksCount: 0,
});
// type linkNames = "HRM" | "customer-services" | "Dashboard" | "Sales";
const _subLink = (name, href, access?: Access[]) =>
  _link(name, null, href, null, access);

const _link = (
  name, //: linkNames,
  // title?: string,
  icon?: IconKeys,
  href?,
  subLinks: LinkItem[] = [],
  access: Access[] = [],
) => {
  const res = {
    name,
    title: name?.split("-").join(" "),
    icon,
    href,
    subLinks,
    access,
    index: -1,
    globalIndex: -1,
    show: false,
    paths: [],
    level: null,
  };
  const ctx = {
    data: res,
    level(level) {
      res.level = level;
      return ctx;
    },
    access(...access: Access[]) {
      res.access = access;
      return ctx;
    },
    childPaths(...paths) {
      res.paths = paths?.map((p) => (p?.startsWith("/") ? p : `/${p}`));
      return ctx;
    },
  };
  return ctx;
};
export type Access = {
  type: "role" | "permission"; // | "userId";
  equator: "is" | "isNot" | "in" | "notIn" | "every" | "some";
  values: string[];
};
export const __access = (
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
export function validateRules(accessList: Access[], can?, userId?, _role?) {
  const permissions = can ?? {};
  const role = typeof _role === "string" ? _role : _role?.name;
  return accessList.every((a) => {
    switch (a.type) {
      // case "userId":
      //     return Number(a.values[0]) == userId;
      //     break;
      case "permission":
        switch (a.equator) {
          case "every":
          case "is":
            return a.values?.every((p) => permissions?.[p]);
          case "in":
          case "some":
            return a.values?.some((p) => permissions?.[p]);
          case "isNot":
          case "notIn":
            return a.values.every((p) => !permissions?.[p]);
        }
        break;
      case "role":
        switch (a.equator) {
          case "every":
          case "is":
            return a.values?.every((p) => role === p);
          case "in":
          case "some":
            return a.values?.some((p) => role === p);
          case "isNot":
          case "notIn":
            return a.values.every((p) => role !== p);
        }
        break;
    }

    return true;
  });
}

export const linkModules = [
  createNavModule("Teachers", "graduation-cap", "Teacher Workspace", [
    createNavSection("dashboard", null, [
      createNavLink("Overview", "dashboard", "/teacher")
        .access(_role.is("Teacher"))
        .childPaths("/teacher").data,
    ]),
    createNavSection("main", "Classroom Work", [
      createNavLink("My Classes", "list", "/teacher/classes").access(
        _role.is("Teacher"),
      ).data,
      createNavLink("My Students", "users", "/teacher/students").access(
        _role.is("Teacher"),
      ).data,
      createNavLink("Attendance", "calendar-check", "/teacher/attendance").access(
        _role.is("Teacher"),
      ).data,
    ]),
    createNavSection("main", "Assessment", [
      createNavLink("Assessments", "clipboard-list", "/teacher/assessments").access(
        _role.is("Teacher"),
      ).data,
      createNavLink("Grading", "award", "/teacher/grading").access(
        _role.is("Teacher"),
      ).data,
      createNavLink("Reports", "file-text", "/teacher/reports").access(
        _role.is("Teacher"),
      ).data,
      createNavLink("Timetable", "calendar", "/teacher/timetable").access(
        _role.is("Teacher"),
      ).data,
    ]),
  ]),

  createNavModule("Community", "school", "School Management", [
    createNavSection("main", "General", [
      createNavLink("Dashboard", "dashboard", "/dashboard").access(
        _role.in("Admin", "Staff"),
      ).data,
      createNavLink("Announcements", "speaker", "/announcements").access(
        _role.in("Admin", "Teacher"),
      ).data,
      createNavLink("Calendar", "calendar", "/calendar").access(
        _role.in("Admin", "Teacher", "Staff"),
      ).data,
    ]),
  ]),

  _module("HRM", "users", "HR & Staff", [
    _section("main", "Staff Management", [
      _link("Teachers", "graduation-cap", "/staff/teachers").access(
        _role.is("Admin"),
      ).data,
      _link("Non-Teaching Staff", "user", "/staff/non-teaching").access(
        _role.in("Admin", "HR"),
      ).data,
      _link("Departments", "building", "/staff/departments").access(
        _role.in("Admin", "HR"),
      ).data,
      _link("Attendance", "calendar-check", "/staff/attendance").access(
        _role.in("Admin", "HR"),
      ).data,
      _link("Payroll", "wallet", "/staff/payroll").access(_role.is("Admin"))
        .data,
    ]),
  ]),

  _module("Bursary", "wallet", "Finance & Payments", [
    _section("dashboard", null, [
      _link("Dashboard", "dashboard", "/finance").access(_role.is("Admin"))
        .data,
    ]),
    _section("main", "Finance Managment", [
      _link("Fee Management", "wallet", "/finance/fees-management").access(
        _role.is("Admin"),
      ).data,
      _link("Billables", "page", "/finance/billables").access(
        _role.is("Admin"),
      ).data,
    ]),
    _section("main", "Fees", [
      _link("Transactions", "reciept", "/finance/transactions").access(
        _role.in("Admin", "Accountant"),
      ).data,
      _link("Student Fees", "coins", "/finance/student-fees").access(
        _role.in("Admin", "Accountant"),
      ).data,
      _link("Bills", "post", "/finance/bills").access(
        _role.in("Admin", "Accountant"),
      ).data,
      _link("Payments", "credit-card", "/finance/payments").access(
        _role.in("Admin", "Accountant"),
      ).data,
    ]),
  ]),

  createNavModule("Academic", "graduation-cap", "Academic", [
    createNavSection("main", "Students", [
      createNavLink("Student List", "users", "/students/list").access(_role.is(
        "Admin",
      )).data,
      createNavLink("Enrollment", "user-plus", "/students/enrollment").access(
        _role.in("Admin", "Registrar"),
      ).data,
      createNavLink("Classes", "school", "/academic/classes").access(_role.is(
        "Admin",
      )).data,
      createNavLink("Subjects", "book", "/academic/subjects").access(_role.is(
        "Admin",
      )).data,
    ]),
    createNavSection("main", "Assessment", [
      createNavLink(
        "Tests & Exams",
        "clipboard-list",
        "/academic/assessments",
      ).access(_role.is("Admin")).data,
      createNavLink("Grading", "award", "/academic/grading").access(_role.is(
        "Admin",
      )).data,
      createNavLink("Report Cards", "file-text", "/academic/reports").access(
        _role.is("Admin"),
      ).data,
    ]),
  ]),

  _module("PTA", "user", "Parent Portal", [
    _section("main", "Engagement", [
      _link("Student Performance", "bar-chart", "/parents/performance").access(
        _role.is("Parent"),
      ).data,
      _link("Communication", "message-square", "/parents/messages").access(
        _role.is("Parent"),
      ).data,
      _link("Payments", "credit-card", "/parents/payments").access(
        _role.is("Parent"),
      ).data,
    ]),
  ]),

  _module("Settings", "settings", "Settings", [
    _section("main", "Configuration", [
      _link("School Profile", "school", "/settings/school-profile").access(
        _role.is("Admin"),
      ).data,
      _link("Academic Session", "calendar", "/settings/sessions").access(
        _role.is("Admin"),
      ).data,
      _link("Roles & Permissions", "roles", "/settings/roles").access(
        _role.is("Admin"),
      ).data,
    ]),
  ]),
];
