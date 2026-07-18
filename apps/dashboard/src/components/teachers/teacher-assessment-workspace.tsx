"use client";

import { SubjectAssessments } from "@/components/subject-assessments";
import { useTRPC } from "@/trpc/client";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { Spinner } from "@school-clerk/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";

type TeacherSubject = {
	id: string;
	title: string;
	classRoomDepartmentId: string;
	displayName: string;
	numberOfAssessments: number;
	numberOfRecordings: number;
};

type Props = {
	subjects: TeacherSubject[];
};

export function TeacherAssessmentWorkspace({ subjects }: Props) {
	const trpc = useTRPC();
	const [selectedSubjectId, setSelectedSubjectId] = useState(
		subjects[0]?.id ?? "",
	);
	const selectedSubject = useMemo(
		() => subjects.find((subject) => subject.id === selectedSubjectId),
		[selectedSubjectId, subjects],
	);
	const { data: overview, isLoading } = useQuery(
		trpc.subjects.overview.queryOptions(
			{
				departmentSubjectId: selectedSubjectId,
			},
			{
				enabled: !!selectedSubjectId,
			},
		),
	);
	const selectedTermId = overview?.subject?.sessionTermId;

	if (!subjects.length) {
		return (
			<section className="border border-dashed bg-background px-4 py-10 text-sm text-muted-foreground">
				No subject assignments are available for assessment setup.
			</section>
		);
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
			<aside className="hidden border bg-background xl:block">
				<div className="border-b px-4 py-4">
					<h2 className="text-base font-semibold">Assigned subjects</h2>
				</div>
				<div className="divide-y">
					{subjects.map((subject) => (
						<button
							key={subject.id}
							type="button"
							onClick={() => setSelectedSubjectId(subject.id)}
							className={[
								"w-full p-4 text-left transition-colors",
								subject.id === selectedSubjectId
									? "bg-primary/5"
									: "hover:bg-muted/50",
							].join(" ")}
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium text-foreground" dir="auto">{subject.title}</p>
									<p className="mt-1 text-xs text-muted-foreground" dir="auto">
										{subject.displayName}
									</p>
									<div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
										<Badge
											variant="secondary"
											className="px-1.5 py-0 font-normal"
										>
											{subject.numberOfAssessments} assessments
										</Badge>
										<Badge
											variant="secondary"
											className="px-1.5 py-0 font-normal"
										>
											{subject.numberOfRecordings} recordings
										</Badge>
									</div>
								</div>
								<BookOpenText className="size-4 shrink-0 text-muted-foreground" />
							</div>
						</button>
					))}
				</div>
			</aside>

			<div className="space-y-4">
				<div className="xl:hidden">
					<Select
						value={selectedSubjectId}
						onValueChange={setSelectedSubjectId}
					>
						<SelectTrigger className="w-full bg-background h-auto py-2 px-3">
							<SelectValue placeholder="Select a subject" />
						</SelectTrigger>
						<SelectContent>
							{subjects.map((subject) => (
								<SelectItem key={subject.id} value={subject.id}>
									<div className="flex flex-col gap-1 py-1 text-left">
										<span className="font-medium" dir="auto">{subject.title}</span>
										<span className="text-xs text-muted-foreground" dir="auto">
											{subject.displayName} · {subject.numberOfAssessments}{" "}
											assessments · {subject.numberOfRecordings} recordings
										</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<section className="border-b bg-background pb-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="text-xl font-semibold" dir="auto">
									{selectedSubject?.title ?? "Assessment setup"}
								</h2>
								{selectedSubject ? (
									<Badge variant="outline" dir="auto">{selectedSubject.displayName}</Badge>
								) : null}
							</div>
							<p className="mt-1 text-sm text-muted-foreground">
								Create and update the assessment sheet for this assigned
								subject.
							</p>
						</div>
						{selectedSubject ? (
							<Button asChild variant="outline">
								<Link
									href={`/assessment-recording?${new URLSearchParams({
										...(selectedTermId ? { termId: selectedTermId } : {}),
										deptId: selectedSubject.classRoomDepartmentId,
										deptSubjectId: selectedSubject.id,
										permission: "subject",
									}).toString()}`}
								>
									<ClipboardList className="mr-2 size-4" />
									Record scores
								</Link>
							</Button>
						) : null}
					</div>
				</section>

				{isLoading ? (
					<section className="flex h-40 items-center justify-center border bg-background">
						<Spinner size={16} />
					</section>
				) : overview?.subject ? (
					<SubjectAssessments overview={overview} />
				) : (
					<section className="border border-dashed bg-background px-4 py-10 text-sm text-muted-foreground">
						Select a subject to manage its assessment sheet.
					</section>
				)}
			</div>
		</div>
	);
}
