import {
	getStaffDepartmentOverviewAction,
	getStaffDirectoryAction,
} from "@/actions/get-staff-pages";
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
import { CalendarCheck2, FolderKanban, Users } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

function SearchForm({
	placeholder,
	search,
}: {
	placeholder: string;
	search?: string;
}) {
	return (
		<form className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<Input
				name="search"
				defaultValue={search}
				placeholder={placeholder}
				className="sm:max-w-sm"
			/>
			<Button type="submit" variant="outline" className="sm:w-auto">
				Search
			</Button>
		</form>
	);
}

function StatGrid({
	items,
}: {
	items: Array<{
		label: string;
		value: number;
		icon: ComponentType<{ className?: string }>;
	}>;
}) {
	return (
		<div className="grid gap-4 md:grid-cols-3">
			{items.map((item) => (
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

function EmptyState({
	title,
	description,
	actionLabel,
	actionHref,
}: {
	title: string;
	description: string;
	actionLabel?: string;
	actionHref?: string;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<div className="text-lg font-semibold">{title}</div>
				<p className="max-w-xl text-sm text-muted-foreground">{description}</p>
				{actionLabel && actionHref ? (
					<Button asChild variant="outline">
						<Link href={actionHref}>{actionLabel}</Link>
					</Button>
				) : null}
			</CardContent>
		</Card>
	);
}

export async function NonTeachingStaffPanel({
	search,
}: {
	search?: string;
}) {
	const data = await getStaffDirectoryAction({
		category: "non-teaching",
		search,
	});

	return (
		<div className="flex flex-col gap-6">
			<StatGrid
				items={[
					{
						label: "Non-teaching staff",
						value: data.items.length,
						icon: Users,
					},
					{
						label: "Total active staff",
						value: data.stats.totalStaff,
						icon: FolderKanban,
					},
					{
						label: "Attendance-ready staff",
						value: data.items.filter((item) => item.classroomCount > 0).length,
						icon: CalendarCheck2,
					},
				]}
			/>

			<Card>
				<CardHeader className="gap-4">
					<div>
						<CardTitle>Staff directory</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Use this page to review non-teaching roles already onboarded in
							the active school session.
						</p>
					</div>
					<SearchForm
						search={search}
						placeholder="Search by staff name, title, or email"
					/>
				</CardHeader>
				<CardContent>
					{data.items.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Contact</TableHead>
									<TableHead>Assignments</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											<div className="font-medium">{item.name}</div>
											<div className="text-xs text-muted-foreground">
												{item.title || "No title"}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline">{item.role}</Badge>
										</TableCell>
										<TableCell>
											<div className="text-sm">{item.email || "No email"}</div>
											<div className="text-xs text-muted-foreground">
												{item.phone || "No phone"}
											</div>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{item.classroomCount} classrooms · {item.subjectCount} subjects
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<EmptyState
							title="No non-teaching staff found"
							description="Add staff with Accountant, Registrar, HR, Staff, or Support roles from the staff sheets to see them here."
							actionLabel="Manage teachers & staff"
							actionHref="/staff/teachers"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export async function StaffDepartmentsPanel({
	search,
}: {
	search?: string;
}) {
	const data = await getStaffDepartmentOverviewAction({ search });

	return (
		<div className="flex flex-col gap-6">
			<StatGrid
				items={[
					{
						label: "Departments",
						value: data.stats.totalDepartments,
						icon: FolderKanban,
					},
					{
						label: "Staffed departments",
						value: data.stats.staffedDepartments,
						icon: Users,
					},
					{
						label: "Students covered",
						value: data.stats.totalStudents,
						icon: CalendarCheck2,
					},
				]}
			/>

			<Card>
				<CardHeader className="gap-4">
					<div>
						<CardTitle>Department staffing</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Review which class departments already have staff coverage in the
							active session.
						</p>
					</div>
					<SearchForm
						search={search}
						placeholder="Search by class or department name"
					/>
				</CardHeader>
				<CardContent>
					{data.items.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Class</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Teachers</TableHead>
									<TableHead>Subjects</TableHead>
									<TableHead>Students</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((item) => (
									<TableRow key={item.id}>
										<TableCell>{item.className}</TableCell>
										<TableCell>{item.departmentName}</TableCell>
										<TableCell>{item.teacherCount}</TableCell>
										<TableCell>{item.subjectCount}</TableCell>
										<TableCell>{item.studentCount}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<EmptyState
							title="No class departments found"
							description="Create classrooms first, then assign staff to the resulting departments."
							actionLabel="Open classes"
							actionHref="/academic/classes"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export async function StaffAttendancePanel({
	search,
}: {
	search?: string;
}) {
	const data = await getStaffDirectoryAction({
		category: "all",
		search,
	});

	return (
		<div className="flex flex-col gap-6">
			<StatGrid
				items={[
					{
						label: "Active staff",
						value: data.stats.totalStaff,
						icon: Users,
					},
					{
						label: "Attendance-ready staff",
						value: data.stats.attendanceReadyCount,
						icon: CalendarCheck2,
					},
					{
						label: "Recorded attendance sessions",
						value: data.stats.recentAttendanceCount,
						icon: FolderKanban,
					},
				]}
			/>

			<Card>
				<CardHeader className="gap-4">
					<div>
						<CardTitle>Attendance readiness</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Staff attendance capture is still lightweight, so this page shows
							which staff members already have classroom assignments and recent
							class attendance activity.
						</p>
					</div>
					<SearchForm
						search={search}
						placeholder="Search by staff name, title, or email"
					/>
				</CardHeader>
				<CardContent>
					{data.items.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Staff</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Assignments</TableHead>
									<TableHead>Attendance activity</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((item) => {
									const hasAssignments = item.classroomCount > 0;
									return (
										<TableRow key={item.id}>
											<TableCell>
												<div className="font-medium">{item.name}</div>
												<div className="text-xs text-muted-foreground">
													{item.title || "No title"}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{item.role}</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{item.classroomCount} classrooms · {item.subjectCount} subjects
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{item.attendanceSessions} sessions
											</TableCell>
											<TableCell>
												<Badge variant={hasAssignments ? "default" : "secondary"}>
													{hasAssignments ? "Ready" : "Needs assignment"}
												</Badge>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					) : (
						<EmptyState
							title="No staff attendance data yet"
							description="Once staff have classroom assignments or attendance entries, they will appear in this readiness view."
							actionLabel="Manage teachers & staff"
							actionHref="/staff/teachers"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
