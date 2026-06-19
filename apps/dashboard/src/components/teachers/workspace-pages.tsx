import { getTeacherWorkspaceAction } from "@/actions/get-teacher-workspace";
import { TeacherAssessmentWorkspace } from "@/components/teachers/teacher-assessment-workspace";
import { TeacherAttendanceWorkspace } from "@/components/teachers/teacher-attendance-workspace";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Separator } from "@school-clerk/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import {
	BookOpen,
	CalendarCheck2,
	Clock3,
	FileText,
	Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

function TeacherEmptyState({ email }: { email?: string | null }) {
	return (
		<section className="flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed bg-background px-6 py-12 text-center">
			<div className="text-lg font-semibold">
				Your teacher workspace is not ready
			</div>
			<p className="max-w-xl text-sm text-muted-foreground">
				Ask an administrator to update your staff record with the same email
				address you use to sign in
				{email ? ` (${email})` : ""}, then assign your classrooms and subjects.
			</p>
			<Button asChild variant="outline">
				<Link href="/announcements">Go to announcements</Link>
			</Button>
		</section>
	);
}

function TeacherSection({
	title,
	description,
	action,
	children,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="border bg-background">
			<div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div>
					<h2 className="text-base font-semibold">{title}</h2>
					{description ? (
						<p className="mt-1 text-sm text-muted-foreground">{description}</p>
					) : null}
				</div>
				{action ? <div className="shrink-0">{action}</div> : null}
			</div>
			<div className="p-4 sm:p-5">{children}</div>
		</section>
	);
}

function TeacherStatGrid({
	stats,
}: {
	stats: Array<{
		label: string;
		value: number;
		icon: ComponentType<{ className?: string }>;
	}>;
}) {
	return (
		<div className="hidden border-y bg-background md:grid md:grid-cols-4">
			{stats.map((item) => (
				<div
					key={item.label}
					className="flex items-center justify-between gap-4 border-border px-4 py-4 md:border-r last:border-r-0"
				>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							{item.label}
						</p>
						<div className="mt-1 text-2xl font-semibold tracking-tight">
							{item.value}
						</div>
					</div>
					<item.icon className="h-4 w-4 text-muted-foreground" />
				</div>
			))}
		</div>
	);
}

function SearchForm({
	search,
}: {
	search?: string;
}) {
	return (
		<form className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<Input
				name="search"
				defaultValue={search}
				placeholder="Search students in your assigned classrooms"
				className="sm:max-w-sm"
			/>
			<Button type="submit" variant="outline" className="sm:w-auto">
				Search
			</Button>
		</form>
	);
}

function TeacherHeader({
	name,
	title,
	email,
}: {
	name: string;
	title?: string | null;
	email?: string | null;
}) {
	return (
		<section className="border-b bg-background pb-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="text-2xl font-semibold">{name}</div>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<Badge variant="outline">Teacher workspace</Badge>
						{title ? <span>{title}</span> : null}
						{email ? <span>{email}</span> : null}
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline">
						<Link href="/teacher/classes">My classes</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/teacher/students">My students</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

export async function TeacherDashboardPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<div className="flex flex-col gap-6">
			<TeacherHeader
				name={data.teacher.name}
				title={data.teacher.title}
				email={data.teacher.email}
			/>
			<TeacherStatGrid
				stats={[
					{
						label: "Assigned classes",
						value: data.stats.classroomCount,
						icon: BookOpen,
					},
					{
						label: "Assigned subjects",
						value: data.stats.subjectCount,
						icon: FileText,
					},
					{
						label: "Current students",
						value: data.stats.studentCount,
						icon: Users,
					},
					{
						label: "Attendance sessions",
						value: data.stats.attendanceSessions,
						icon: CalendarCheck2,
					},
				]}
			/>
			<div className="grid gap-4 lg:grid-cols-2">
				<TeacherSection title="Assigned classrooms">
					<div className="divide-y">
						{data.classrooms.length ? (
							data.classrooms.map((classroom) => (
								<div
									key={classroom.id}
									className="flex flex-col gap-1 py-3 text-sm text-muted-foreground first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
								>
									<div>
										<div className="font-medium text-foreground">
											{classroom.displayName}
										</div>
										<div className="mt-1">
											{classroom.studentCount} students ·{" "}
											{classroom.subjectCount} subjects
										</div>
									</div>
									<Badge variant="outline">{classroom.className}</Badge>
								</div>
							))
						) : (
							<p className="text-sm text-muted-foreground">
								No classroom assignments yet.
							</p>
						)}
					</div>
				</TeacherSection>
				<TeacherSection
					title="Next steps"
					description="Use the pages in this module to focus only on your classes."
				>
					<div className="space-y-3 text-sm text-muted-foreground">
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline">
								<Link href="/teacher/attendance">Attendance</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/teacher/assessments">Assessments</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/assessment-recording">Reports</Link>
							</Button>
						</div>
					</div>
				</TeacherSection>
			</div>
		</div>
	);
}

export async function TeacherClassesPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<TeacherSection title="My classes">
			{data.classrooms.length ? (
				<div className="overflow-hidden border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Class</TableHead>
								<TableHead>Students</TableHead>
								<TableHead>Subjects</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.classrooms.map((classroom) => (
								<TableRow key={classroom.id}>
									<TableCell className="font-medium">
										{classroom.displayName}
									</TableCell>
									<TableCell>{classroom.studentCount}</TableCell>
									<TableCell>{classroom.subjectCount}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<TeacherEmptyState email={data.signedInEmail} />
			)}
		</TeacherSection>
	);
}

export async function TeacherStudentsPanel({
	search,
}: {
	search?: string;
}) {
	const data = await getTeacherWorkspaceAction({ search });

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<div className="flex flex-col gap-6">
			<TeacherSection
				title="My students"
				description="Students listed here come from your assigned classrooms for the current term."
				action={<SearchForm search={search} />}
			>
				{data.students.length ? (
					<div className="overflow-hidden border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Gender</TableHead>
									<TableHead>Classroom</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.students.map((student) => (
									<TableRow key={student.id}>
										<TableCell className="font-medium">
											{student.name}
										</TableCell>
										<TableCell>{student.gender}</TableCell>
										<TableCell>{student.classroom}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<TeacherEmptyState email={data.signedInEmail} />
				)}
			</TeacherSection>
		</div>
	);
}

export async function TeacherAttendancePanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<div className="flex flex-col gap-6">
			<TeacherStatGrid
				stats={[
					{
						label: "Assigned classes",
						value: data.stats.classroomCount,
						icon: BookOpen,
					},
					{
						label: "Recent attendance sessions",
						value: data.recentAttendance.length,
						icon: CalendarCheck2,
					},
					{
						label: "Students covered",
						value: data.stats.studentCount,
						icon: Users,
					},
					{
						label: "Subjects covered",
						value: data.stats.subjectCount,
						icon: FileText,
					},
				]}
			/>
			<TeacherAttendanceWorkspace
				classrooms={data.classrooms}
				students={data.students}
			/>
		</div>
	);
}

export async function TeacherAssessmentsPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return <TeacherAssessmentWorkspace subjects={data.subjects} />;
}

export async function TeacherGradingPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<TeacherSection title="Grading overview">
			<div className="space-y-4 text-sm text-muted-foreground">
				<p>
					Use your assigned subjects and classrooms as the scope for grading in
					the current term.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline">
						<Link href="/teacher/assessments">Review assigned subjects</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/assessment-recording">Open report workflow</Link>
					</Button>
				</div>
				<Separator />
				<div>
					<div className="font-medium text-foreground">
						{data.stats.subjectCount} subjects across{" "}
						{data.stats.classroomCount} classes
					</div>
					<div className="mt-1">
						Keep grades aligned with the classrooms visible in this teacher
						workspace so your access stays predictable.
					</div>
				</div>
			</div>
		</TeacherSection>
	);
}

export async function TeacherReportsPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<TeacherSection title="Reports workspace">
			<div className="space-y-4 text-sm text-muted-foreground">
				<p>
					Report preparation should stay limited to your assigned classrooms and
					subjects.
				</p>
				<div className="grid gap-3 md:grid-cols-2">
					{data.classrooms.map((classroom) => (
						<div key={classroom.id} className="border-l pl-4">
							<div className="font-medium text-foreground">
								{classroom.displayName}
							</div>
							<div className="mt-1">
								{classroom.studentCount} students · {classroom.subjectCount}{" "}
								subjects
							</div>
						</div>
					))}
				</div>
				<Button asChild variant="outline">
					<Link href="/teacher/grading">Review grading scope</Link>
				</Button>
			</div>
		</TeacherSection>
	);
}

export async function TeacherTimetablePanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<div className="flex flex-col gap-6">
			<TeacherStatGrid
				stats={[
					{
						label: "Assigned classes",
						value: data.stats.classroomCount,
						icon: BookOpen,
					},
					{
						label: "Assigned subjects",
						value: data.stats.subjectCount,
						icon: FileText,
					},
					{
						label: "Students",
						value: data.stats.studentCount,
						icon: Users,
					},
					{
						label: "Planner status",
						value: data.stats.classroomCount ? 1 : 0,
						icon: Clock3,
					},
				]}
			/>
			<TeacherSection title="Timetable placeholder">
				<div className="space-y-3 text-sm text-muted-foreground">
					<p>
						A dedicated timetable builder is not live yet. For now, use this
						page as a quick summary of the classes and subjects already assigned
						to you.
					</p>
					{data.subjects.length ? (
						<div className="flex flex-wrap gap-2">
							{data.subjects.map((subject) => (
								<Badge key={subject.id} variant="outline">
									{subject.title} · {subject.displayName}
								</Badge>
							))}
						</div>
					) : (
						<p>No subject assignments yet.</p>
					)}
				</div>
			</TeacherSection>
		</div>
	);
}
