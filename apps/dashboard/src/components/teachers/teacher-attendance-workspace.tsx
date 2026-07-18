"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";

type TeacherClassroom = {
	id: string;
	displayName: string;
	studentCount: number;
	subjectCount: number;
};

type TeacherStudent = {
	id: string;
	studentId: string;
	classroomDepartmentId: string;
	name: string;
	gender: string;
	classroom: string;
};

type Props = {
	classrooms: TeacherClassroom[];
	students: TeacherStudent[];
};

export function TeacherAttendanceWorkspace({ classrooms, students }: Props) {
	const academicDataDirection = useAcademicDataDirection();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [selectedClassroomId, setSelectedClassroomId] = useState(
		classrooms[0]?.id ?? "",
	);
	const [title, setTitle] = useState(() =>
		new Intl.DateTimeFormat("en-NG", {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(new Date()),
	);
	const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
	const [commentMap, setCommentMap] = useState<Record<string, string>>({});

	const selectedClassroom = classrooms.find(
		(classroom) => classroom.id === selectedClassroomId,
	);

	const { data: sessions = [] } = useQuery(
		trpc.attendance.getClassroomAttendance.queryOptions(
			{ departmentId: selectedClassroomId || "-" },
			{ enabled: !!selectedClassroomId },
		),
	);
	const selectedStudents = useMemo(
		() =>
			students.filter(
				(student) => student.classroomDepartmentId === selectedClassroomId,
			),
		[selectedClassroomId, students],
	);

	const { mutate: takeAttendance, isPending } = useMutation(
		trpc.attendance.takeAttendance.mutationOptions({
			meta: {
				toastTitle: {
					error: "Failed to save attendance",
					loading: "Saving attendance...",
					success: "Attendance recorded",
				},
			},
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.attendance.getClassroomAttendance.queryKey({
						departmentId: selectedClassroomId || "-",
					}),
				});
				setStatusMap({});
				setCommentMap({});
			},
		}),
	);

	function markAllPresent() {
		setStatusMap(
			Object.fromEntries(selectedStudents.map((student) => [student.id, true])),
		);
	}

	function handleSubmit() {
		if (!selectedClassroomId || !title.trim()) return;

		takeAttendance({
			departmentId: selectedClassroomId,
			attendanceTitle: title.trim(),
			students: selectedStudents.map((student) => ({
				comment: commentMap[student.id] || undefined,
				isPresent: Boolean(statusMap[student.id]),
				studentTermFormId: student.id,
			})),
		});
	}

	if (!classrooms.length) {
		return (
			<section className="border border-dashed bg-background px-4 py-10 text-sm text-muted-foreground">
				No classroom assignments are available for attendance.
			</section>
		);
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
			<section className="border bg-background">
				<div className="space-y-4 border-b px-4 py-4 sm:px-5">
					<div>
						<h2 className="text-base font-semibold">Take attendance</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Record attendance only for classrooms assigned to your teacher
							profile.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{classrooms.map((classroom) => (
							<Button
								key={classroom.id}
								type="button"
								size="sm"
								variant={
									classroom.id === selectedClassroomId ? "default" : "outline"
								}
								onClick={() => {
									setSelectedClassroomId(classroom.id);
									setStatusMap({});
									setCommentMap({});
								}}
							>
								<span dir="auto">{classroom.displayName}</span>
							</Button>
						))}
					</div>
				</div>
				<div className="space-y-5 p-4 sm:p-5">
					<div className="grid gap-2">
						<Label htmlFor="teacher-attendance-title">Session title</Label>
						<Input
							id="teacher-attendance-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="e.g. Monday morning"
						/>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="text-sm text-muted-foreground">
							{selectedClassroom?.displayName} · {selectedStudents.length}{" "}
							students
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={markAllPresent}
							>
								Mark all present
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setStatusMap({})}
							>
								Clear
							</Button>
						</div>
					</div>

					<div
						className="overflow-hidden border"
						dir={academicDataDirection}
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Student</TableHead>
									<TableHead className="text-center">Status</TableHead>
									<TableHead>Remarks</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{selectedStudents.map((student) => {
									const isPresent = Boolean(statusMap[student.id]);
									return (
										<TableRow key={student.id}>
											<TableCell className="font-medium" dir="auto">
												{student.name}
											</TableCell>
											<TableCell>
												<div className="flex justify-center gap-1">
													<Button
														type="button"
														size="sm"
														variant={isPresent ? "default" : "outline"}
														onClick={() =>
															setStatusMap((current) => ({
																...current,
																[student.id]: true,
															}))
														}
													>
														P
													</Button>
													<Button
														type="button"
														size="sm"
														variant={!isPresent ? "default" : "outline"}
														onClick={() =>
															setStatusMap((current) => ({
																...current,
																[student.id]: false,
															}))
														}
													>
														A
													</Button>
												</div>
											</TableCell>
											<TableCell>
												<Input
													dir="auto"
													value={commentMap[student.id] ?? ""}
													onChange={(event) =>
														setCommentMap((current) => ({
															...current,
															[student.id]: event.target.value,
														}))
													}
													placeholder="Add note"
												/>
											</TableCell>
										</TableRow>
									);
								})}
								{!selectedStudents.length ? (
									<TableRow>
										<TableCell
											colSpan={3}
											className="h-24 text-center text-muted-foreground"
										>
											No students found for this classroom.
										</TableCell>
									</TableRow>
								) : null}
							</TableBody>
						</Table>
					</div>

					<Button
						type="button"
						disabled={!selectedStudents.length || !title.trim() || isPending}
						onClick={handleSubmit}
					>
						<Save className="mr-2 size-4" />
						Save attendance
					</Button>
				</div>
			</section>

			<section className="border bg-background">
				<div className="border-b px-4 py-4 sm:px-5">
					<h2 className="text-base font-semibold">Recent sessions</h2>
				</div>
				<div className="divide-y px-4 sm:px-5">
					{sessions.map((session) => (
						<div key={session.id} className="py-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{session.attendanceTitle}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{session.createdAt
											? new Date(session.createdAt).toLocaleDateString()
											: "No date"}
									</p>
								</div>
								<CalendarCheck2 className="size-4 text-muted-foreground" />
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<Badge variant="outline">{session.present} present</Badge>
								<Badge variant="secondary">{session.absent} absent</Badge>
							</div>
						</div>
					))}
					{!sessions.length ? (
						<p className="py-4 text-sm text-muted-foreground">
							No attendance sessions have been recorded for this classroom yet.
						</p>
					) : null}
				</div>
			</section>
		</div>
	);
}
