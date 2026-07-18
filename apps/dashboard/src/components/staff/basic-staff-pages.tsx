import {
	getStaffDepartmentOverviewAction,
	getStaffDirectoryAction,
} from "@/actions/get-staff-pages";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
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
import type { ComponentType, ReactNode } from "react";
import { AcademicDataSurface } from "@/components/academic-data-direction/provider";

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
		<div className="hidden border-y bg-background md:grid md:grid-cols-3">
			{items.map((item) => (
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

function StaffSection({
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
		<div className="flex flex-col items-center gap-3 border border-dashed px-6 py-12 text-center">
			<div className="text-lg font-semibold">{title}</div>
			<p className="max-w-xl text-sm text-muted-foreground">{description}</p>
			{actionLabel && actionHref ? (
				<Button asChild variant="outline">
					<Link href={actionHref}>{actionLabel}</Link>
				</Button>
			) : null}
		</div>
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
						value: data.stats.attendanceReadyCount,
						icon: CalendarCheck2,
					},
				]}
			/>

			<StaffSection
				title="Staff directory"
				description="Use this page to review non-teaching roles already onboarded in the active school session."
				action={
					<SearchForm
						search={search}
						placeholder="Search by staff name, title, or email"
					/>
				}
			>
				{data.items.length ? (
					<AcademicDataSurface className="overflow-hidden border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Contact</TableHead>
									<TableHead>Current assignments</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											<div className="font-medium" dir="auto">{item.name}</div>
											<div className="text-xs text-muted-foreground" dir="auto">
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
											{item.classroomCount} classrooms · {item.subjectCount}{" "}
											subjects
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AcademicDataSurface>
				) : (
					<EmptyState
						title="No non-teaching staff found"
						description="Add staff with Accountant, Registrar, HR, Staff, or Support roles from the staff sheets to see them here."
						actionLabel="Manage teachers & staff"
						actionHref="/staff/teachers"
					/>
				)}
			</StaffSection>
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

			<StaffSection
				title="Department staffing"
				description="Review which class departments already have staff coverage in the active session."
				action={
					<SearchForm
						search={search}
						placeholder="Search by class or department name"
					/>
				}
			>
				{data.items.length ? (
					<AcademicDataSurface className="overflow-hidden border">
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
										<TableCell dir="auto">{item.className}</TableCell>
										<TableCell dir="auto">{item.departmentName}</TableCell>
										<TableCell>{item.teacherCount}</TableCell>
										<TableCell>{item.subjectCount}</TableCell>
										<TableCell>{item.studentCount}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AcademicDataSurface>
				) : (
					<EmptyState
						title="No class departments found"
						description="Create classrooms first, then assign staff to the resulting departments."
						actionLabel="Open classes"
						actionHref="/academic/classes"
					/>
				)}
			</StaffSection>
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

			<StaffSection
				title="Attendance readiness"
				description="Staff attendance capture is still lightweight, so this page shows which staff members already have classroom assignments and recent class attendance activity."
				action={
					<SearchForm
						search={search}
						placeholder="Search by staff name, title, or email"
					/>
				}
			>
				{data.items.length ? (
					<AcademicDataSurface className="overflow-hidden border">
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
												<div className="font-medium" dir="auto">{item.name}</div>
												<div className="text-xs text-muted-foreground" dir="auto">
													{item.title || "No title"}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{item.role}</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{item.classroomCount} classrooms · {item.subjectCount}{" "}
												subjects
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{item.attendanceSessions} sessions
											</TableCell>
											<TableCell>
												<Badge
													variant={hasAssignments ? "default" : "secondary"}
												>
													{hasAssignments ? "Ready" : "Needs assignment"}
												</Badge>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</AcademicDataSurface>
				) : (
					<EmptyState
						title="No staff attendance data yet"
						description="Once staff have classroom assignments or attendance entries, they will appear in this readiness view."
						actionLabel="Manage teachers & staff"
						actionHref="/staff/teachers"
					/>
				)}
			</StaffSection>
		</div>
	);
}
