import { getTeacherWorkspaceAction } from "@/actions/get-teacher-workspace";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { BookOpen, CalendarCheck2, Clock3, FileText, Users } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

function TeacherEmptyState({ email }: { email?: string | null }) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<div className="text-lg font-semibold">Your teacher workspace is not ready</div>
				<p className="max-w-xl text-sm text-muted-foreground">
					Ask an administrator to update your staff record with the same email
					address you use to sign in
					{email ? ` (${email})` : ""}, then assign your classrooms and subjects.
				</p>
				<Button asChild variant="outline">
					<Link href="/announcements">Go to announcements</Link>
				</Button>
			</CardContent>
		</Card>
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
		<div className="grid gap-4 md:grid-cols-4">
			{stats.map((item) => (
				<Card key={item.label}>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{item.label}
						</CardTitle>
						<item.icon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{item.value}</div>
					</CardContent>
				</Card>
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
		<Card>
			<CardContent className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
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
			</CardContent>
		</Card>
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
				<Card>
					<CardHeader>
						<CardTitle>Assigned classrooms</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{data.classrooms.length ? (
							data.classrooms.map((classroom) => (
								<div
									key={classroom.id}
									className="rounded-xl border p-4 text-sm text-muted-foreground"
								>
									<div className="font-medium text-foreground">
										{classroom.displayName}
									</div>
									<div className="mt-1">
										{classroom.studentCount} students · {classroom.subjectCount} subjects
									</div>
								</div>
							))
						) : (
							<p className="text-sm text-muted-foreground">
								No classroom assignments yet.
							</p>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Next steps</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>Use the pages in this module to focus only on your classes.</p>
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline">
								<Link href="/teacher/attendance">Attendance</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/teacher/assessments">Assessments</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/teacher/reports">Reports</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
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
		<Card>
			<CardHeader>
				<CardTitle>My classes</CardTitle>
			</CardHeader>
			<CardContent>
				{data.classrooms.length ? (
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
				) : (
					<TeacherEmptyState email={data.signedInEmail} />
				)}
			</CardContent>
		</Card>
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
			<Card>
				<CardHeader className="gap-4">
					<div>
						<CardTitle>My students</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Students listed here come from your assigned classrooms for the
							current term.
						</p>
					</div>
					<SearchForm search={search} />
				</CardHeader>
				<CardContent>
					{data.students.length ? (
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
										<TableCell className="font-medium">{student.name}</TableCell>
										<TableCell>{student.gender}</TableCell>
										<TableCell>{student.classroom}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<TeacherEmptyState email={data.signedInEmail} />
					)}
				</CardContent>
			</Card>
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
			<Card>
				<CardHeader>
					<CardTitle>Attendance workflow</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Open a classroom and use the Attendance tab to record daily presence
						for students in your assigned classes.
					</p>
					{data.recentAttendance.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Session</TableHead>
									<TableHead>Classroom</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.recentAttendance.map((attendance) => (
									<TableRow key={attendance.id}>
										<TableCell>{attendance.title}</TableCell>
										<TableCell>{attendance.classroom || "—"}</TableCell>
										<TableCell>
											{attendance.createdAt
												? attendance.createdAt.toLocaleDateString()
												: "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<p className="text-sm text-muted-foreground">
							No attendance sessions have been recorded for your assigned
							classrooms yet.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export async function TeacherAssessmentsPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Assigned assessment load</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					These are the subjects currently assigned to your profile. Use them as
					your working list while the dedicated assessment screens continue to
					evolve.
				</p>
				{data.subjects.length ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Subject</TableHead>
								<TableHead>Class</TableHead>
								<TableHead>Department</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.subjects.map((subject) => (
								<TableRow key={subject.id}>
									<TableCell className="font-medium">{subject.title}</TableCell>
									<TableCell colSpan={2}>{subject.displayName}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-muted-foreground">
						No subjects have been assigned to your teacher profile yet.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export async function TeacherGradingPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Grading overview</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-sm text-muted-foreground">
				<p>
					Use your assigned subjects and classrooms as the scope for grading in
					the current term.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline">
						<Link href="/teacher/assessments">Review assigned subjects</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/teacher/reports">Open report workflow</Link>
					</Button>
				</div>
				<div className="rounded-xl border p-4">
					<div className="font-medium text-foreground">
						{data.stats.subjectCount} subjects across {data.stats.classroomCount} classes
					</div>
					<div className="mt-1">
						Keep grades aligned with the classrooms visible in this teacher
						workspace so your access stays predictable.
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export async function TeacherReportsPanel() {
	const data = await getTeacherWorkspaceAction();

	if (!data.teacher) {
		return <TeacherEmptyState email={data.signedInEmail} />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Reports workspace</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-sm text-muted-foreground">
				<p>
					Report preparation should stay limited to your assigned classrooms and
					subjects.
				</p>
				<div className="grid gap-3 md:grid-cols-2">
					{data.classrooms.map((classroom) => (
						<div key={classroom.id} className="rounded-xl border p-4">
							<div className="font-medium text-foreground">
								{classroom.displayName}
							</div>
							<div className="mt-1">
								{classroom.studentCount} students · {classroom.subjectCount} subjects
							</div>
						</div>
					))}
				</div>
				<Button asChild variant="outline">
					<Link href="/teacher/grading">Review grading scope</Link>
				</Button>
			</CardContent>
		</Card>
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
			<Card>
				<CardHeader>
					<CardTitle>Timetable placeholder</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm text-muted-foreground">
					<p>
						A dedicated timetable builder is not live yet. For now, use this page
						as a quick summary of the classes and subjects already assigned to
						you.
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
				</CardContent>
			</Card>
		</div>
	);
}
