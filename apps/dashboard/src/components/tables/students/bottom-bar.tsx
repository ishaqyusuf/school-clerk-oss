"use client";

import { BottomBar as CoreBottomBar } from "@/components/tables/core";
import { useAuth } from "@/hooks/use-auth";
import { useRemoveStudentTerms } from "@/hooks/use-remove-student-terms";
import { useMoveStudentTerms } from "@/hooks/use-move-student-terms";
import { useClassifyStudentTerms } from "@/hooks/use-classify-student-terms";
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
import { toast } from "@school-clerk/ui/use-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { Download, GraduationCap, Tags, UserMinus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Item } from "./columns";

type Props = {
	data: Item[];
	rowSelection: RowSelectionState;
	setRowSelection: (selection: RowSelectionState) => void;
};

function canManageStudents(role?: string | null) {
	return role === "ADMIN" || role === "Admin" || role === "Registrar";
}

function csvCell(value: unknown) {
	const text = value == null ? "" : String(value);
	return `"${text.replaceAll('"', '""')}"`;
}

export function StudentsBottomBar({
	data,
	rowSelection,
	setRowSelection,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
  const [action, setAction] = useState<"move" | "admission" | "remove" | null>(
    null,
  );
	const [classroomDepartmentId, setClassroomDepartmentId] = useState("");
  const [admissionType, setAdmissionType] = useState<
    "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING"
  >("NEW_ADMISSION");
	const selectedStudents = useMemo(
		() => data.filter((student) => rowSelection[student.id]),
		[data, rowSelection],
	);
	const selectedTermFormIds = selectedStudents
		.map((student) => student.termFormId)
		.filter((id): id is string => Boolean(id));
	const canManage = canManageStudents(auth.role);
	const hasUnavailableSelection = Object.keys(rowSelection).filter((id) => rowSelection[id]).length !== selectedStudents.length || selectedTermFormIds.length !== selectedStudents.length;

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
		setRowSelection({});
	};

	const moveStudents = useMoveStudentTerms({
		studentTermFormIds: selectedTermFormIds,
		classroomDepartmentId,
		contextKey: JSON.stringify(Object.keys(rowSelection).filter((id) => rowSelection[id]).sort()),
		selectionAvailable: !hasUnavailableSelection,
		onSuccess(result) {
			toast({ title: result.count ? "Class placements updated" : "Already in class", description: `${result.count} moved; ${result.alreadyInClass} already in the selected class.` });
			setAction(null);
			setRowSelection({});
		},
	});
	useEffect(() => { setClassroomDepartmentId(""); setAction(null); }, [moveStudents.selectionKey]);
	const removeStudents = useRemoveStudentTerms({
		contextKey: JSON.stringify([[...selectedTermFormIds].sort(), Object.keys(rowSelection).filter((id) => rowSelection[id]).sort()]),
		onSuccess: invalidateDirectory,
	});
	useEffect(() => { setAction(null); }, [removeStudents.scopeKey]);
  const classifyStudents = useClassifyStudentTerms({
    studentTermFormIds: selectedTermFormIds, admissionType,
    contextKey: JSON.stringify(Object.keys(rowSelection).filter((id) => rowSelection[id]).sort()),
    selectionAvailable: !hasUnavailableSelection,
    onSuccess(result) {
      const applied = result.reconciliation.reduce((count, row) => count + row.applied, 0);
      const cancelled = result.reconciliation.reduce((count, row) => count + row.cancelled, 0);
      const retained = result.reconciliation.reduce((count, row) => count + row.retained, 0);
      toast({ title: "Admission classification processed", description: `${result.updated} updated; ${result.alreadyClassified} already classified. ${applied} fees added; ${cancelled} unpaid fees cancelled; ${retained} protected fees retained for finance review.` });
      setAction(null);
      setRowSelection({});
    },
  });
  useEffect(() => { setAction(null); setAdmissionType("NEW_ADMISSION"); }, [classifyStudents.selectionKey]);

	const exportCsv = () => {
		const rows = [
			[
				"Student ID",
				"Student",
				"Class",
				"Gender",
				"Status",
				"Guardian",
				"Phone",
			],
			...selectedStudents.map((student) => [
				student.id,
				student.studentName,
				student.department,
				student.gender,
				student.status,
				student.guardianName,
				student.guardianPhone,
			]),
		];
		const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
		const url = URL.createObjectURL(
			new Blob([csv], { type: "text/csv;charset=utf-8;" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = "students.csv";
		link.click();
		URL.revokeObjectURL(url);
	};

	const confirmAction = async () => {
		if (moveStudents.isPending || removeStudents.isPending || classifyStudents.isPending) return;
		if (action === "move" && classroomDepartmentId) {
			if (!moveStudents.ready) return;
			moveStudents.submit();
			return;
		}
		if (action === "remove") {
			if (!removeStudents.ready || hasUnavailableSelection) return;
			try {
				await removeStudents.mutateAsync({ ids: selectedTermFormIds });
				setAction(null);
			} catch {
				// An invalid batch must remain visible with its error, not look completed.
			}
			return;
		}
    if (action === "admission") {
      void classifyStudents.submit();
      return;
    }
		setAction(null);
	};

	return (
		<>
			<CoreBottomBar
				selectedCount={selectedStudents.length}
				onDeselect={() => setRowSelection({})}
			>
				<Button variant="outline" size="sm" onClick={exportCsv}>
					<Download className="size-4" />
					<span className="hidden sm:inline">Export CSV</span>
				</Button>
        {canManage ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!classifyStudents.ready || classifyStudents.isPending || moveStudents.isPending || removeStudents.isPending}
            className="min-h-11"
            aria-label="Set admission status for selected students"
            onClick={() => setAction("admission")}
          >
            <Tags className="size-4" />
            <span className="hidden sm:inline">Set admission status</span>
          </Button>
        ) : null}
				{canManage ? (
					<Button
						variant="outline"
						size="sm"
						disabled={selectedTermFormIds.length === 0 || classifyStudents.isPending || moveStudents.isPending || removeStudents.isPending}
						onClick={() => setAction("move")}
						className="min-h-11"
						aria-label="Move selected students"
					>
						<GraduationCap className="size-4" />
						<span className="hidden sm:inline">Move class</span>
					</Button>
				) : null}
				{canManage ? (
					<Button
						variant="outline"
						size="sm"
						className="text-destructive"
						disabled={selectedTermFormIds.length === 0 || classifyStudents.isPending || moveStudents.isPending || removeStudents.isPending}
						onClick={() => setAction("remove")}
					>
						<UserMinus className="size-4" />
						<span className="hidden sm:inline">Remove from term</span>
					</Button>
				) : null}
			</CoreBottomBar>

			<AlertDialog
				open={action !== null}
				onOpenChange={(open) => {
					if (!open && !removeStudents.isPending && !moveStudents.isPending && !classifyStudents.isPending) setAction(null);
				}}
			>
				<AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{action === "move"
								? "Move selected students?"
                : action === "admission"
                  ? "Update admission status?"
								: "Remove selected term enrollments?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{action === "move"
								? "The selected term placements and their session defaults move together to this class, or none change. Other term placements, scores, attendance and financial records remain unchanged; fees are not recalculated."
                : action === "admission"
                  ? "All selected statuses and applicable fees are reconciled together, or none change. Newly applicable required fees may be added; obsolete unpaid automatic/selected fees may be cancelled. Paid, allocated, ledger-linked and manual charges are retained."
								: "The selected enrollment records are removed together or none are changed. Student identities, other terms and financial/assessment history remain. Outstanding balances are not cancelled."}
						</AlertDialogDescription>
					</AlertDialogHeader>
          {action === "admission" && classifyStudents.error ? <p role="alert" className="break-words text-sm text-destructive">{classifyStudents.error} If the response was interrupted, refresh and check statuses and balances before retrying.</p> : null}
          {action === "admission" && !classifyStudents.ready ? <p role="status" className="break-words text-sm text-muted-foreground">Your workspace or selection is unavailable. Select 1–100 available enrollments; partial batches are not submitted.</p> : null}
					{action === "move" ? <p className="text-xs text-muted-foreground">Existing scores and attendance keep their original class links. They are not remapped into the destination class's subjects or registers.</p> : null}
					{action === "move" && moveStudents.error ? (
						<p role="alert" className="break-words text-sm text-destructive">{moveStudents.error} Refresh to check placements before retrying if the response was interrupted.</p>
					) : null}
					{action === "move" && (hasUnavailableSelection || selectedTermFormIds.length === 0 || selectedTermFormIds.length > 100) ? (
						<p role="status" className="text-sm text-muted-foreground">Select between 1 and 100 available enrollments. Unavailable selections are not partially submitted.</p>
					) : null}
					{action === "remove" && removeStudents.error ? (
						<p role="alert" className="break-words text-sm text-destructive">{removeStudents.error.message} Refresh the directory if the response was interrupted.</p>
					) : null}
					{action === "remove" && (!removeStudents.ready || hasUnavailableSelection) ? (
						<p role="status" className="break-words text-sm text-muted-foreground">Your workspace or selected rows are unavailable. Refresh and reselect the enrollment records; no partial selection will be submitted.</p>
					) : null}
					{action === "remove" && (selectedTermFormIds.length === 0 || selectedTermFormIds.length > 100) ? (
						<p role="status" className="text-sm text-muted-foreground">Select between 1 and 100 enrollment records for one removal.</p>
					) : null}
					{action === "move" ? (
						<div className="min-w-0 space-y-2">
						{moveStudents.optionsLoading ? <p role="status" className="text-sm text-muted-foreground">Loading current destinations…</p> : null}
						{moveStudents.optionsError ? <p role="alert" className="break-words text-sm text-destructive">{moveStudents.optionsError}</p> : null}
						{moveStudents.data?.classrooms.length === 0 ? <p role="status" className="text-sm text-muted-foreground">No destination classes are available in this session.</p> : null}
						<Select
							value={classroomDepartmentId}
							disabled={moveStudents.isPending || !moveStudents.data}
							onValueChange={setClassroomDepartmentId}
						>
							<SelectTrigger className="min-h-11" aria-label="Destination class">
								<SelectValue placeholder="Choose a class" />
							</SelectTrigger>
							<SelectContent>
								{moveStudents.data?.classrooms.map((department) => (
									<SelectItem className="min-h-11 whitespace-normal" key={department.id} value={department.id}>
										{department.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={!moveStudents.canRefresh} onClick={moveStudents.refresh}>Refresh destinations</Button>
						</div>
					) : null}
          {action === "admission" ? (
            <Select
              value={admissionType}
              disabled={classifyStudents.isPending}
              onValueChange={(value) =>
                setAdmissionType(
                  value as "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING",
                )
              }
            >
              <SelectTrigger className="min-h-11" aria-label="Admission classification">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="min-h-11 whitespace-normal" value="NEW_ADMISSION">New admission</SelectItem>
                <SelectItem className="min-h-11 whitespace-normal" value="RETURNING">Returning student</SelectItem>
                <SelectItem className="min-h-11 whitespace-normal" value="UNCLASSIFIED">
                  Needs classification
                </SelectItem>
              </SelectContent>
            </Select>
          ) : null}
					<AlertDialogFooter>
						<AlertDialogCancel className="min-h-11" disabled={removeStudents.isPending || moveStudents.isPending || classifyStudents.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="min-h-11 whitespace-normal"
							disabled={
								moveStudents.isPending ||
								removeStudents.isPending ||
                classifyStudents.isPending ||
                (action === "admission" && !classifyStudents.ready) ||
								(action === "remove" && (!removeStudents.ready || hasUnavailableSelection || selectedTermFormIds.length === 0 || selectedTermFormIds.length > 100)) ||
								(action === "move" && !moveStudents.ready)
							}
							onClick={(event) => { event.preventDefault(); void confirmAction(); }}
						>
              {action === "move"
                ? moveStudents.isPending ? "Moving…" : "Move students"
                : action === "admission"
                  ? classifyStudents.isPending ? "Updating status and fees…" : "Update status and fees"
                  : removeStudents.isPending ? "Removing…" : "Remove enrollments"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
