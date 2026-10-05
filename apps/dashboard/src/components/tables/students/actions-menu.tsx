"use client";

import { useAuth } from "@/hooks/use-auth";
import { useDeleteStudent } from "@/hooks/use-delete-student";
import { useStudentParams } from "@/hooks/use-student-params";
import { useRemoveStudentTerms } from "@/hooks/use-remove-student-terms";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import { Button } from "@school-clerk/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { Spinner } from "@school-clerk/ui/spinner";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import type { Item } from "./columns";

function canManageStudents(role?: string | null) {
	return role === "ADMIN" || role === "Admin" || role === "Registrar";
}

export function StudentActionsMenu({ student }: { student: Item }) {
	const auth = useAuth();
	const { setParams } = useStudentParams();
	const [confirmAction, setConfirmAction] = useState<
		"remove" | "delete" | null
	>(null);

	const deleteStudent = useDeleteStudent(student.id);
	const removeTerm = useRemoveStudentTerms({ contextKey: JSON.stringify([student.id, student.termFormId]) });
	const isPending = deleteStudent.isPending || removeTerm.isPending;
	const canManage = canManageStudents(auth.role);
	useEffect(() => {
		setConfirmAction(null);
	}, [deleteStudent.scopeKey, removeTerm.scopeKey]);

	const confirm = async () => {
		if (isPending || !deleteStudent.ready) return;
		if (confirmAction === "remove" && student.termFormId) {
			try {
				await removeTerm.mutateAsync({ ids: [student.termFormId] });
				setConfirmAction(null);
			} catch {
				// Keep the confirmation and error visible for an explicit retry.
			}
		}
		if (confirmAction === "delete") {
			if (await deleteStudent.submit()) setConfirmAction(null);
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-11"
						disabled={isPending}
						aria-label={`Actions for ${student.studentName}`}
						onClick={(event) => event.stopPropagation()}
					>
						{isPending ? <Spinner /> : <MoreHorizontal className="size-4" />}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onClick={(event) => event.stopPropagation()}
				>
					<DropdownMenuItem
						onClick={() => setParams({ studentViewId: student.id })}
					>
						View details
					</DropdownMenuItem>
					{canManage ? (
						<DropdownMenuItem
							onClick={() => setParams({ studentEditId: student.id })}
						>
							Edit information
						</DropdownMenuItem>
					) : null}
					{canManage ? <DropdownMenuSeparator /> : null}
					{canManage && student.termFormId ? (
						<DropdownMenuItem
							className="text-destructive"
							onClick={() => setConfirmAction("remove")}
						>
							Remove from current term
						</DropdownMenuItem>
					) : null}
					{canManage ? (
						<DropdownMenuItem
							className="text-destructive"
							onClick={() => setConfirmAction("delete")}
						>
							Delete student
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog
				open={confirmAction !== null}
				onOpenChange={(open) => {
					if (!open && !isPending) setConfirmAction(null);
				}}
			>
				<AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmAction === "delete"
								? "Delete this student?"
								: "Remove this student from the current term?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmAction === "delete"
								? `This archives ${student.studentName} and their active academic records. Financial, assessment and guardian history is retained; outstanding balances are not cancelled.`
								: "The student record and historical terms remain available, but the current term enrollment is removed."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{(confirmAction === "delete" ? deleteStudent.error : removeTerm.error?.message) ? (
						<p role="alert" className="break-words text-sm text-destructive">
							{confirmAction === "delete" ? deleteStudent.error : removeTerm.error?.message} Refresh the directory if the response was interrupted.
						</p>
					) : null}
					{!deleteStudent.ready ? <p role="status" className="text-sm text-muted-foreground">Student workspace is unavailable. Close this dialog and refresh before making changes.</p> : null}
					<AlertDialogFooter>
						<AlertDialogCancel className="min-h-11" disabled={isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction className="min-h-11 whitespace-normal" disabled={isPending || !deleteStudent.ready} onClick={(event) => { event.preventDefault(); void confirm(); }}>
							{isPending ? "Saving…" : confirmAction === "delete"
								? "Delete student"
								: "Remove enrollment"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
