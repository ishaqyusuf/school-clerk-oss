"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEnrollSuggestedStudent } from "@/hooks/use-enroll-suggested-student";
import { useStudentSuggestions } from "@/hooks/use-student-suggestions";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@school-clerk/ui/collapsible";
import { Label } from "@school-clerk/ui/label";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
	type StudentSuggestion,
	StudentSuggestionClassDialog,
	StudentSuggestionRecordDialog,
} from "./students/student-suggestion-dialogs";
import { StudentSuggestionRows } from "./students/student-suggestion-rows";

type Props = {
	onSelect?: () => void;
	names: {
		name?: string | null;
		surname?: string | null;
		otherName?: string | null;
	};
};

export function FindAndEnroll({ names, onSelect }: Props) {
	const auth = useAuth();
	const checkboxId = useId();
	const [enabled, setEnabled] = useState(true);
	const [open, setOpen] = useState(true);
	const scopeKey = JSON.stringify([
		auth.id,
		auth.sessionId,
		auth.profile?.schoolId,
		auth.profile?.sessionId,
		auth.profile?.termId,
	]);
	const [selection, setSelected] = useState<{
		student: StudentSuggestion;
		action: "view" | "edit";
		scopeKey: string;
	} | null>(null);
	const selected = selection?.scopeKey === scopeKey ? selection : null;
	useEffect(() => {
		setSelected((current) => (current?.scopeKey !== scopeKey ? null : current));
	}, [scopeKey]);
	const suggestions = useStudentSuggestions(names, enabled);
	const canManage = ["ADMIN", "REGISTRAR"].includes(
		auth.role?.toUpperCase() ?? "",
	);
	const enrollment = useEnrollSuggestedStudent(onSelect);

	const busy = suggestions.isFetching || suggestions.isUpdatingName;
	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className="min-w-0 rounded-lg border border-border"
		>
			<div className="flex min-w-0 items-center gap-2 rounded-t-lg bg-muted/40 px-3">
				<Checkbox
					id={checkboxId}
					checked={enabled}
					disabled={enrollment.isPending}
					onCheckedChange={(checked) => {
						const next = checked === true;
						if (!next) {
							suggestions.stop();
							setSelected(null);
						}
						setEnabled(next);
					}}
				/>
				<Label
					htmlFor={checkboxId}
					className="flex min-h-11 flex-1 cursor-pointer items-center text-sm"
				>
					Check student suggestions
				</Label>
				{enabled &&
				suggestions.hasName &&
				suggestions.workspaceReady &&
				!suggestions.isUpdatingName &&
				suggestions.isSuccess ? (
					<Badge
						variant="secondary"
						aria-label={`${suggestions.count} possible matches`}
					>
						{suggestions.count}
					</Badge>
				) : null}
				<CollapsibleTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="min-h-11 min-w-11"
						aria-label={
							open
								? "Collapse student suggestions"
								: "Expand student suggestions"
						}
					>
						{open ? (
							<ChevronUp className="size-4" />
						) : (
							<ChevronDown className="size-4" />
						)}
					</Button>
				</CollapsibleTrigger>
			</div>
			<CollapsibleContent className="border-t">
				{!enabled ? (
					<p className="p-4 text-sm text-muted-foreground">
						Suggestions are off. Check the box to search the register.
					</p>
				) : !suggestions.workspaceReady ? (
					<output className="block p-4 text-sm text-muted-foreground">
						Select an available school, academic session, and term to check the
						register.
					</output>
				) : !suggestions.hasName ? (
					<p className="p-4 text-sm text-muted-foreground">
						Enter at least two characters in a name field to find students
						across all classes.
					</p>
				) : (
					<>
						<div className="space-y-1 border-b px-4 py-3">
							<output
								aria-live="polite"
								className="text-xs text-muted-foreground"
							>
								{busy
									? "Checking the register…"
									: `${suggestions.matchingCount} match the entered name fields · ${Math.max(0, suggestions.count - suggestions.matchingCount)} partial matches`}
							</output>
							<p className="text-xs text-muted-foreground">
								Compare the name, date of birth, and guardian before choosing a
								record.
							</p>
						</div>
						{suggestions.isPending ? (
							<div
								className="space-y-3 p-4"
								aria-label="Loading student suggestions"
							>
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-16 w-full" />
							</div>
						) : null}
						{suggestions.isError ? (
							<Alert variant="destructive" className="m-3 w-auto">
								<AlertDescription className="space-y-2">
									<p>
										Suggestions could not be loaded. This does not mean no
										matching students exist.
									</p>
									<Button
										type="button"
										variant="outline"
										className="min-h-11"
										disabled={busy}
										onClick={() => {
											void suggestions.refetch();
										}}
									>
										Retry suggestions
									</Button>
								</AlertDescription>
							</Alert>
						) : null}
						{!suggestions.isPending &&
						!suggestions.isError &&
						suggestions.students.length === 0 ? (
							<p className="p-4 text-sm text-muted-foreground">
								No matching records. Check the spelling, or continue with a new
								student.
							</p>
						) : null}
						<StudentSuggestionRows
							students={suggestions.students}
							canManage={canManage}
							disabled={enrollment.isPending || busy}
							enrollingId={enrollment.enrollingId}
							onEdit={(student) =>
								setSelected({ student, action: "edit", scopeKey })
							}
							onView={(student) =>
								setSelected({ student, action: "view", scopeKey })
							}
							onEnroll={(id) => {
								void enrollment.enroll(id);
							}}
						/>
						{enrollment.error ? (
							<p
								role="alert"
								className="break-words px-4 py-3 text-sm text-destructive"
							>
								Enrollment could not be confirmed. Refresh student history
								before trying again.
							</p>
						) : null}
						{suggestions.students.length > 0 ? (
							<div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2">
								<span className="text-xs text-muted-foreground">
									Showing {suggestions.students.length} of {suggestions.count}
								</span>
								{suggestions.hasNextPage ? (
									<Button
										type="button"
										variant="ghost"
										className="min-h-11"
										disabled={busy}
										onClick={() => {
											void suggestions.fetchNextPage();
										}}
									>
										{suggestions.isFetchingNextPage ? "Loading…" : "Show more"}
									</Button>
								) : null}
							</div>
						) : null}
					</>
				)}
			</CollapsibleContent>
			{selected?.action === "view" ? (
				<StudentSuggestionRecordDialog
					student={selected.student}
					onClose={() => setSelected(null)}
				/>
			) : null}
			{selected?.action === "edit" ? (
				<StudentSuggestionClassDialog
					key={selected.student.id}
					student={selected.student}
					onClose={() => setSelected(null)}
					onSaved={suggestions.invalidate}
				/>
			) : null}
		</Collapsible>
	);
}
