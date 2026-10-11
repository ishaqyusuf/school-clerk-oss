"use client";

import { useMoveStudentTerms } from "@/hooks/use-move-student-terms";
import type { RouterOutputs } from "@school-clerk/api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { toast } from "@school-clerk/ui/use-toast";
import { useState } from "react";

export type StudentSuggestion =
	RouterOutputs["students"]["suggestions"]["data"][number];

export function StudentSuggestionRecordDialog({
	student,
	onClose,
}: { student: StudentSuggestion; onClose: () => void }) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg">
				<DialogHeader>
					<DialogTitle dir="auto">{student.studentName}</DialogTitle>
					<DialogDescription>
						Check this student’s identity before choosing their record.
					</DialogDescription>
				</DialogHeader>
				<dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt className="text-xs text-muted-foreground">Student ID</dt>
						<dd className="break-all">{student.id}</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Date of birth</dt>
						<dd>
							{student.dob
								? new Date(student.dob).toLocaleDateString("en-GB", {
										day: "numeric",
										month: "short",
										year: "numeric",
									})
								: "Not provided"}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Guardian</dt>
						<dd className="break-words" dir="auto">
							{student.guardianName || "Not provided"}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Current term</dt>
						<dd>
							{student.status === "not enrolled"
								? "Not enrolled"
								: student.status === "pending approval"
									? "Pending approval"
									: student.status === "needs review"
										? "Enrollment needs review"
										: student.classroomName || "Class unavailable"}
						</dd>
					</div>
				</dl>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						className="min-h-11"
						onClick={onClose}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function StudentSuggestionClassDialog({
	student,
	onClose,
	onSaved,
}: { student: StudentSuggestion; onClose: () => void; onSaved: () => void }) {
	const [classroomDepartmentId, setClassroomDepartmentId] = useState(
		student.classroomId ?? "",
	);
	const move = useMoveStudentTerms({
		studentTermFormIds: student.termFormId ? [student.termFormId] : [],
		classroomDepartmentId,
		contextKey: student.id,
		selectionAvailable: !!student.termFormId && student.status === "enrolled",
		onSuccess(result) {
			toast({
				title: result.count ? "Student class updated" : "Already in this class",
			});
			onSaved();
			onClose();
		},
	});
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !move.isPending) onClose();
			}}
		>
			<DialogContent
				hideClose={move.isPending}
				className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg"
			>
				<DialogHeader>
					<DialogTitle>Edit enrolled class</DialogTitle>
					<DialogDescription>
						<span dir="auto">{student.studentName}</span> is currently in{" "}
						<span dir="auto">{student.classroomName}</span>. Change their
						placement for the current term.
					</DialogDescription>
				</DialogHeader>
				{move.optionsLoading ? (
					<output className="block text-sm text-muted-foreground">
						Loading available classes…
					</output>
				) : null}
				{move.optionsError || move.error ? (
					<p role="alert" className="break-words text-sm text-destructive">
						{move.optionsError || move.error} Refresh to check the placement
						before retrying if the response was interrupted.
					</p>
				) : null}
				<div className="min-w-0 space-y-2">
					<Label htmlFor="suggestion-destination">Move to class / stream</Label>
					<Select
						value={classroomDepartmentId}
						onValueChange={setClassroomDepartmentId}
						disabled={!move.data || move.isPending}
					>
						<SelectTrigger id="suggestion-destination" className="min-h-11">
							<SelectValue placeholder="Choose a class" />
						</SelectTrigger>
						<SelectContent>
							{move.data?.classrooms.map((classroom) => (
								<SelectItem
									key={classroom.id}
									value={classroom.id}
									className="min-h-11 whitespace-normal"
								>
									<span dir="auto">{classroom.displayName}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{move.data?.classrooms.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No available classes in this session.
						</p>
					) : null}
					<Button
						type="button"
						variant="ghost"
						className="min-h-11"
						disabled={!move.canRefresh}
						onClick={move.refresh}
					>
						Refresh classes
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					Existing fees are not recalculated. Scores and attendance keep their
					original class links. Your new-student draft stays open.
				</p>
				<DialogFooter className="gap-2">
					<Button
						type="button"
						variant="outline"
						className="min-h-11"
						disabled={move.isPending}
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="min-h-11"
						disabled={
							!move.ready ||
							move.isPending ||
							classroomDepartmentId === student.classroomId
						}
						onClick={move.submit}
					>
						{move.isPending ? "Saving…" : "Save class change"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
