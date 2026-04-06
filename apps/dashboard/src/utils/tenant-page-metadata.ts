import { prisma } from "@school-clerk/db";
import { cache } from "react";
import { constructMetadata } from "./construct-metadata";

type TenantMetadataInput = {
	domain: string;
	pathname?: string | null;
	title?: string;
	description?: string;
	noIndex?: boolean;
	host?: string | null;
	protocol?: string | null;
};

type RouteMetadata = {
	title: string;
	description: string;
	noIndex?: boolean;
};

const getTenantSchool = cache(async (domain: string) => {
	if (!domain) return null;

	return prisma.schoolProfile.findFirst({
		where: {
			domains: {
				some: {
					subdomain: domain,
				},
			},
		},
		select: {
			name: true,
		},
	});
});

function normalizePathname(pathname?: string | null) {
	if (!pathname) return "/";

	const [pathOnly] = pathname.split("?");
	const trimmed = pathOnly?.trim();
	if (!trimmed) return "/";

	return trimmed === "/" ? "/" : trimmed.replace(/\/+$/, "");
}

function toTitleCase(value: string) {
	return value
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function fallbackRouteMetadata(pathname: string): RouteMetadata {
	if (pathname === "/") {
		return {
			title: "Dashboard",
			description:
				"View the latest school activity across academics, students, staff, and finance.",
		};
	}

	const segments = pathname.split("/").filter(Boolean);
	const meaningfulSegments = segments.filter(
		(segment) =>
			!/^[0-9a-f-]{8,}$/i.test(segment) &&
			!/^\d+$/.test(segment) &&
			!["firstTerm", "lastTerm", "streamId", "studentId", "id"].includes(
				segment,
			),
	);

	const lastSegment = meaningfulSegments.at(-1) ?? "dashboard";
	const section = meaningfulSegments[0];
	const title = toTitleCase(lastSegment);

	if (section && section !== lastSegment) {
		return {
			title,
			description: `Manage ${title.toLowerCase()} in the ${toTitleCase(section).toLowerCase()} workspace.`,
		};
	}

	return {
		title,
		description: `Open the ${title.toLowerCase()} workspace.`,
	};
}

function resolveRouteMetadata(pathname: string): RouteMetadata {
	const routes: Array<{
		test: RegExp;
		metadata: RouteMetadata;
	}> = [
		{
			test: /^\/$/,
			metadata: {
				title: "Dashboard",
				description:
					"View the latest school activity across academics, students, staff, and finance.",
			},
		},
		{
			test: /^\/login$/,
			metadata: {
				title: "Login",
				description: "Sign in to this school workspace.",
				noIndex: true,
			},
		},
		{
			test: /^\/forgot-password$/,
			metadata: {
				title: "Forgot Password",
				description: "Reset access to this school workspace account.",
				noIndex: true,
			},
		},
		{
			test: /^\/reset-password$/,
			metadata: {
				title: "Reset Password",
				description: "Choose a new password for this school workspace account.",
				noIndex: true,
			},
		},
		{
			test: /^\/signout$/,
			metadata: {
				title: "Sign Out",
				description: "Sign out of this school workspace.",
				noIndex: true,
			},
		},
		{
			test: /^\/onboarding\/create-school$/,
			metadata: {
				title: "Create School",
				description: "Set up the tenant profile for this school workspace.",
				noIndex: true,
			},
		},
		{
			test: /^\/onboarding\/create-academic-session$/,
			metadata: {
				title: "Create Academic Session",
				description: "Configure the first academic session for this tenant.",
				noIndex: true,
			},
		},
		{
			test: /^\/migration$/,
			metadata: {
				title: "Migration",
				description: "Import and migrate school records into this workspace.",
			},
		},
		{
			test: /^\/questions$/,
			metadata: {
				title: "Questions",
				description: "Manage assessment questions for subjects and classes.",
			},
		},
		{
			test: /^\/dashboard$/,
			metadata: {
				title: "Dashboard",
				description:
					"View the latest school activity across academics, students, staff, and finance.",
			},
		},
		{
			test: /^\/notifications$/,
			metadata: {
				title: "Notifications",
				description: "Review school alerts, reminders, and recent updates.",
			},
		},
		{
			test: /^\/announcements$/,
			metadata: {
				title: "Announcements",
				description:
					"Manage school-wide announcements and communication updates.",
			},
		},
		{
			test: /^\/calendar$/,
			metadata: {
				title: "Calendar",
				description: "View academic dates, events, and school schedules.",
			},
		},
		{
			test: /^\/inventory$/,
			metadata: {
				title: "Inventory",
				description: "Track school inventory items, stock, and records.",
			},
		},
		{
			test: /^\/students$/,
			metadata: {
				title: "Students",
				description:
					"Manage student records, term activity, and classroom history.",
			},
		},
		{
			test: /^\/students\/list$/,
			metadata: {
				title: "Student List",
				description: "Browse and manage all students in this school workspace.",
			},
		},
		{
			test: /^\/students\/enrollment$/,
			metadata: {
				title: "Enrollment",
				description:
					"Track student enrollment activity and current admissions.",
			},
		},
		{
			test: /^\/students\/[^/]+$/,
			metadata: {
				title: "Student Overview",
				description:
					"Review an individual student's profile, academics, and finance.",
			},
		},
		{
			test: /^\/staff\/teachers$/,
			metadata: {
				title: "Teachers",
				description:
					"Manage teaching staff, assignments, and classroom coverage.",
			},
		},
		{
			test: /^\/staff\/non-teaching$/,
			metadata: {
				title: "Non-Teaching Staff",
				description: "Manage administrative and operational staff records.",
			},
		},
		{
			test: /^\/staff\/departments$/,
			metadata: {
				title: "Staff Departments",
				description: "Organize staff into departments and functional teams.",
			},
		},
		{
			test: /^\/staff\/attendance$/,
			metadata: {
				title: "Staff Attendance",
				description: "Review attendance patterns and staff presence records.",
			},
		},
		{
			test: /^\/staff\/payroll$/,
			metadata: {
				title: "Payroll",
				description: "Manage payroll runs, staff payments, and salary records.",
			},
		},
		{
			test: /^\/parents\/messages$/,
			metadata: {
				title: "Parent Messages",
				description: "Review parent communication and school correspondence.",
			},
		},
		{
			test: /^\/parents\/payments$/,
			metadata: {
				title: "Parent Payments",
				description:
					"Review parent-facing payment activity and collection history.",
			},
		},
		{
			test: /^\/parents\/performance$/,
			metadata: {
				title: "Parent Performance",
				description: "View student performance insights prepared for parents.",
			},
		},
		{
			test: /^\/finance$/,
			metadata: {
				title: "Finance Overview",
				description:
					"Track collections, streams, bills, and finance operations.",
			},
		},
		{
			test: /^\/finance\/collections$/,
			metadata: {
				title: "Collections",
				description: "Monitor fee collections and school payment receipts.",
			},
		},
		{
			test: /^\/finance\/streams$/,
			metadata: {
				title: "Finance Streams",
				description:
					"Manage incoming and outgoing finance streams for the current term.",
			},
		},
		{
			test: /^\/finance\/streams\/[^/]+$/,
			metadata: {
				title: "Stream Overview",
				description: "Inspect activity and balances for a finance stream.",
			},
		},
		{
			test: /^\/finance\/payments$/,
			metadata: {
				title: "Payments",
				description: "Review student payments and finance transaction history.",
			},
		},
		{
			test: /^\/finance\/transactions$/,
			metadata: {
				title: "Transactions",
				description: "Track wallet movement and posted finance transactions.",
			},
		},
		{
			test: /^\/finance\/bills$/,
			metadata: {
				title: "Bills",
				description: "Manage staff and operational bills for this school.",
			},
		},
		{
			test: /^\/finance\/billables$/,
			metadata: {
				title: "Service Billables",
				description:
					"Manage staff and operational billables used for school service billing.",
			},
		},
		{
			test: /^\/finance\/fees-management$/,
			metadata: {
				title: "Fees Management",
				description:
					"Manage school fees, classroom applicability, and term pricing.",
			},
		},
		{
			test: /^\/finance\/student-fees$/,
			metadata: {
				title: "Student Fees",
				description: "Review student fee assignments and outstanding balances.",
			},
		},
		{
			test: /^\/academic$/,
			metadata: {
				title: "Academic Overview",
				description:
					"Manage classes, subjects, grading, reports, and academic setup.",
			},
		},
		{
			test: /^\/academic\/classes$/,
			metadata: {
				title: "Classrooms",
				description: "Manage class structures, departments, and assignments.",
			},
		},
		{
			test: /^\/academic\/subjects$/,
			metadata: {
				title: "Subjects",
				description:
					"Manage subjects, curriculum structure, and teaching coverage.",
			},
		},
		{
			test: /^\/academic\/assessments$/,
			metadata: {
				title: "Assessments",
				description: "Configure assessment structures and recording workflows.",
			},
		},
		{
			test: /^\/academic\/grading$/,
			metadata: {
				title: "Grading",
				description: "Manage grading scales, reports, and result workflows.",
			},
		},
		{
			test: /^\/academic\/reports$/,
			metadata: {
				title: "Academic Reports",
				description:
					"Review generated reports and academic performance summaries.",
			},
		},
		{
			test: /^\/academic\/promotion\/[^/]+\/[^/]+$/,
			metadata: {
				title: "Academic Promotion",
				description:
					"Review and apply class promotion decisions for the session.",
			},
		},
		{
			test: /^\/academic\/term-getting-started\/[^/]+$/,
			metadata: {
				title: "Term Setup",
				description: "Complete setup tasks for the selected academic term.",
			},
		},
		{
			test: /^\/academic\/term-getting-started\/[^/]+\/data-migration$/,
			metadata: {
				title: "Term Data Migration",
				description:
					"Configure and import academic data into the selected term.",
			},
		},
		{
			test: /^\/teacher$/,
			metadata: {
				title: "Teacher Dashboard",
				description:
					"Access teaching tasks, classroom work, and daily academic tools.",
			},
		},
		{
			test: /^\/teacher\/classes$/,
			metadata: {
				title: "Teacher Classes",
				description: "Review assigned classes and classroom teaching activity.",
			},
		},
		{
			test: /^\/teacher\/students$/,
			metadata: {
				title: "Teacher Students",
				description: "Review students linked to the teacher's active classes.",
			},
		},
		{
			test: /^\/teacher\/assessments$/,
			metadata: {
				title: "Teacher Assessments",
				description: "Manage classroom assessments and score entry workflows.",
			},
		},
		{
			test: /^\/teacher\/grading$/,
			metadata: {
				title: "Teacher Grading",
				description: "Review grading progress and subject result entry work.",
			},
		},
		{
			test: /^\/teacher\/attendance$/,
			metadata: {
				title: "Teacher Attendance",
				description: "Take and review attendance for assigned classes.",
			},
		},
		{
			test: /^\/teacher\/reports$/,
			metadata: {
				title: "Teacher Reports",
				description:
					"Review classroom reporting and teacher performance summaries.",
			},
		},
		{
			test: /^\/teacher\/timetable$/,
			metadata: {
				title: "Teacher Timetable",
				description: "View the teaching timetable for the current term.",
			},
		},
		{
			test: /^\/student-report$/,
			metadata: {
				title: "Student Report",
				description:
					"View the student report sheet and result summary for the active term.",
			},
		},
		{
			test: /^\/assessment-recording$/,
			metadata: {
				title: "Assessment Recording",
				description: "Record assessments and manage subject score entry.",
			},
		},
		{
			test: /^\/result$/,
			metadata: {
				title: "Results Portal",
				description:
					"Review published result records and class performance summaries.",
			},
		},
		{
			test: /^\/settings\/school-profile$/,
			metadata: {
				title: "School Profile",
				description:
					"Manage tenant branding, school details, and profile settings.",
			},
		},
		{
			test: /^\/settings\/sessions$/,
			metadata: {
				title: "Academic Sessions",
				description: "Manage school sessions, terms, and calendar structure.",
			},
		},
		{
			test: /^\/settings\/roles$/,
			metadata: {
				title: "Roles & Permissions",
				description: "Manage roles, permissions, and workspace access control.",
			},
		},
		{
			test: /^\/first-term-1446-1447/,
			metadata: {
				title: "Legacy Workspace",
				description: "Open legacy term tools and archived academic workflows.",
				noIndex: true,
			},
		},
	];

	return (
		routes.find((route) => route.test.test(pathname))?.metadata ??
		fallbackRouteMetadata(pathname)
	);
}

export async function buildTenantPageMetadata({
	domain,
	pathname,
	title,
	description,
	noIndex,
	host,
	protocol,
}: TenantMetadataInput) {
	const school = await getTenantSchool(domain);
	const tenantName = school?.name || toTitleCase(domain) || "School Clerk";
	const resolvedPathname = normalizePathname(pathname);
	const routeMetadata = resolveRouteMetadata(resolvedPathname);
	const pageTitle = title ?? routeMetadata.title;
	const pageDescription = description ?? routeMetadata.description;
	const pageNoIndex = noIndex ?? routeMetadata.noIndex ?? false;
	const titleWithTenant = `${pageTitle} | ${tenantName} | School Clerk`;
	const descriptionWithTenant = `${pageDescription} Tenant: ${tenantName}.`;
	const metadataBase =
		host && protocol ? new URL(`${protocol}://${host}`) : undefined;

	return constructMetadata({
		title: titleWithTenant,
		description: descriptionWithTenant,
		noIndex: pageNoIndex,
		metadataBase,
	});
}
