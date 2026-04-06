import type { IconKeys } from "@school-clerk/ui/custom/icons";

export type Role =
  | "Admin"
  | "Teacher"
  | "Student"
  | "Parent"
  | "Accountant"
  | "Registrar"
  | "HR"
  | "Staff"
  | "Support";

export type WorkspaceKey =
  | "admin"
  | "teacher"
  | "parent"
  | "student"
  | "registrar"
  | "finance-office";

export type ModuleKey =
  | "home"
  | "students"
  | "academics"
  | "finance"
  | "staff"
  | "operations"
  | "communication"
  | "settings"
  | "teacher-workspace"
  | "parent-portal"
  | (string & {});

export type InstitutionType =
  | "PRESCHOOL"
  | "PRIMARY"
  | "SECONDARY"
  | "COLLEGE"
  | "POLYTECHNIC"
  | "UNIVERSITY"
  | "TRAINING_CENTER"
  | "RELIGIOUS_SCHOOL";

export type NavStatus = "live" | "beta" | "upcoming" | "hidden";

export type NavSectionKey = "dashboard" | "main" | (string & {});

export type NavAvailability = {
  institutionTypes?: InstitutionType[];
  permissions?: string[];
  requiresModules?: string[];
  roles?: Role[];
  status?: NavStatus;
};

export type NavItemDefinition = NavAvailability & {
  children?: NavItemDefinition[];
  childPaths?: string[];
  href: string;
  icon?: IconKeys | null;
  key: string;
  module: ModuleKey;
  section: NavSectionKey;
  sectionTitle?: string | null;
  title: string;
  workspace: WorkspaceKey;
};

export type NavSectionDefinition = NavAvailability & {
  items: NavItemDefinition[];
  key: NavSectionKey;
  title?: string | null;
};

export type NavModuleDefinition = NavAvailability & {
  icon: IconKeys;
  key: ModuleKey;
  sections: NavSectionDefinition[];
  subtitle?: string;
  title: string;
  workspace: WorkspaceKey;
};
