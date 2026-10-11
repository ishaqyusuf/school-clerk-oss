"use client";

import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@school-clerk/ui/item";
import type { StudentSuggestion } from "./student-suggestion-dialogs";

export function StudentSuggestionRows({
	students,
	canManage,
	disabled,
	enrollingId,
	onEdit,
	onView,
	onEnroll,
}: {
	students: StudentSuggestion[];
	canManage: boolean;
	disabled: boolean;
	enrollingId: string | null;
	onEdit: (student: StudentSuggestion) => void;
	onView: (student: StudentSuggestion) => void;
	onEnroll: (id: string) => void;
}) {
	const direction = useAcademicDataDirection();
	return (
		<ItemGroup dir={direction}>
			{students.map((student) => (
				<Item
					key={student.id}
					className={`min-w-0 rounded-none border-b p-4 last:border-b-0 ${student.match !== "partial" ? "border-s-2 border-s-primary" : ""}`}
				>
					<ItemContent className="min-w-0">
						<ItemTitle className="break-words">
							<span dir="auto">{student.studentName}</span>
						</ItemTitle>
						<ItemDescription className="break-words text-xs">
							{student.match === "partial"
								? "Partial name match"
								: "Matches entered name fields"}
						</ItemDescription>
						<ItemDescription className="break-words text-xs">
							{student.dob
								? `Born ${new Date(student.dob).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
								: "Birth date not provided"}
							{student.guardianName ? (
								<>
									{" "}
									· Guardian: <span dir="auto">{student.guardianName}</span>
								</>
							) : null}
						</ItemDescription>
						<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
							<span>
								{student.status === "not enrolled" ? (
									"No enrollment in the current term"
								) : (
									<>
										Current class:{" "}
										<strong dir="auto">
											{student.classroomName || "Unavailable"}
										</strong>
									</>
								)}
							</span>
							<Badge variant="secondary" className="whitespace-normal">
								{student.status === "enrolled"
									? "Enrolled this term"
									: student.status === "pending approval"
										? "Pending approval"
										: student.status === "needs review"
											? "Needs review"
											: "Not enrolled this term"}
							</Badge>
						</div>
						<ItemActions className="mt-2 flex w-full flex-wrap gap-2" dir="ltr">
							{canManage &&
							student.status === "enrolled" &&
							student.termFormId ? (
								<Button
									type="button"
									variant="outline"
									className="min-h-11"
									disabled={disabled}
									onClick={() => onEdit(student)}
								>
									Edit class
								</Button>
							) : null}
							{canManage && student.status === "not enrolled" ? (
								<Button
									type="button"
									variant="outline"
									className="min-h-11"
									disabled={disabled}
									onClick={() => onEnroll(student.id)}
								>
									{enrollingId === student.id ? "Enrolling…" : "Enroll student"}
								</Button>
							) : null}
							<Button
								type="button"
								variant="ghost"
								className="ms-auto min-h-11"
								disabled={disabled}
								onClick={() => onView(student)}
							>
								View record
							</Button>
						</ItemActions>
					</ItemContent>
				</Item>
			))}
		</ItemGroup>
	);
}
