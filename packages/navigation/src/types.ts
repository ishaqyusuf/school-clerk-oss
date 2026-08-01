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
	| "finance-office"
	| "people"
	| "staff"
	| "support";

export type ModuleKey =
	| "overview"
	| "people"
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
	icon?: string | null;
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
	icon: string;
	key: ModuleKey;
	sections: NavSectionDefinition[];
	subtitle?: string;
	title: string;
	workspace: WorkspaceKey;
};

export type NavigationSurface =
	| "sidebar"
	| "compact"
	| "header-only"
	| "unavailable";

export type NavigationPresentationItem = {
	key: string;
	title?: string;
};

export type NavigationPresentationSection = {
	items: NavigationPresentationItem[];
	key: NavSectionKey;
	title?: string | null;
};

export type NavigationModulePresentation = {
	key: ModuleKey;
	sections?: NavigationPresentationSection[];
	subtitle?: string;
	title?: string;
};

export type NavigationWorkspaceProfile = {
	defaultHref: string;
	key: WorkspaceKey;
	moduleOrder: ModuleKey[];
	presentation?: NavigationModulePresentation[];
	roles: Role[];
	surface: NavigationSurface;
};

export type ResolvedNavItem = {
	childPaths: string[];
	children: ResolvedNavItem[];
	href: string;
	icon?: string | null;
	key: string;
	status: NavStatus;
	title: string;
};

export type ResolvedNavSection = {
	items: ResolvedNavItem[];
	key: NavSectionKey;
	title?: string | null;
};

export type ResolvedNavModule = {
	defaultHref: string | null;
	icon: string;
	key: ModuleKey;
	sections: ResolvedNavSection[];
	subtitle?: string;
	title: string;
	workspace: WorkspaceKey;
};

export type ResolvedNavigation = {
	defaultHref: string;
	modules: ResolvedNavModule[];
	profile: NavigationWorkspaceProfile | null;
	role: Role | null;
	surface: NavigationSurface;
	totalLinks: number;
};
