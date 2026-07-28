"use client";

import { useAuth } from "@/hooks/use-auth";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { Item } from "./columns";

function canManageStudents(role?: string | null) {
	return role === "ADMIN" || role === "Admin" || role === "Registrar";
}

export function StudentActionsMenu({ student }: { student: Item }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const { setParams } = useStudentParams();
	const [confirmAction, setConfirmAction] = useState<
		"remove" | "delete" | null
	>(null);

	const invalidateDirectory = () => {
		queryClient.invalidateQueries({
			queryKey: trpc.students.index.infiniteQueryKey(),
		});
		queryClient.invalidateQueries({
			queryKey: trpc.students.analytics.queryKey(),
		});
		queryClient.invalidateQueries({
			queryKey: trpc.students.duplicateGroups.queryKey(),
		});
	};

	const deleteStudent = useMutation(
		trpc.students.deleteStudent.mutationOptions({
			onSuccess: invalidateDirectory,
		}),
	);
	const removeTerm = useMutation(
		trpc.students.bulkDeleteTermSheets.mutationOptions({
			onSuccess: invalidateDirectory,
		}),
	);
	const isPending = deleteStudent.isPending || removeTerm.isPending;
	const canManage = canManageStudents(auth.role);

	const confirm = () => {
		if (confirmAction === "remove" && student.termFormId) {
			removeTerm.mutate({ ids: [student.termFormId] });
		}
		if (confirmAction === "delete") {
			deleteStudent.mutate({ studentId: student.id });
		}
		setConfirmAction(null);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
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
					if (!open) setConfirmAction(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmAction === "delete"
								? "Delete this student?"
								: "Remove this student from the current term?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmAction === "delete"
								? "This removes the canonical student record and should only be used when the record is no longer needed."
								: "The student record and historical terms remain available, but the current term enrollment is removed."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirm}>
							{confirmAction === "delete"
								? "Delete student"
								: "Remove enrollment"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
