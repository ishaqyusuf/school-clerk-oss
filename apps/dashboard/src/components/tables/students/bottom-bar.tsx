"use client";

import { BottomBar as CoreBottomBar } from "@/components/tables/core";
import { useAuth } from "@/hooks/use-auth";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { Download, GraduationCap, Tags, UserMinus } from "lucide-react";
import { useMemo, useState } from "react";
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

	const { data: classrooms } = useQuery(
		trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
	);

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

	const moveStudents = useMutation(
		trpc.students.bulkChangeClass.mutationOptions({
			onSuccess: invalidateDirectory,
		}),
	);
	const removeStudents = useMutation(
		trpc.students.bulkDeleteTermSheets.mutationOptions({
			onSuccess: invalidateDirectory,
		}),
	);
  const classifyStudents = useMutation(
    trpc.students.bulkSetAdmissionType.mutationOptions({
      onSuccess: invalidateDirectory,
    }),
  );

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

	const confirmAction = () => {
		if (action === "move" && classroomDepartmentId) {
			moveStudents.mutate({
				studentTermFormIds: selectedTermFormIds,
				classroomDepartmentId,
			});
		}
		if (action === "remove") {
			removeStudents.mutate({ ids: selectedTermFormIds });
		}
    if (action === "admission") {
      classifyStudents.mutate({
        studentTermFormIds: selectedTermFormIds,
        admissionType,
      });
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
            disabled={selectedTermFormIds.length === 0}
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
						disabled={selectedTermFormIds.length === 0}
						onClick={() => setAction("move")}
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
						disabled={selectedTermFormIds.length === 0}
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
					if (!open) setAction(null);
				}}
			>
				<AlertDialogContent>
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
								? "Every selected current-term enrollment will move to the chosen class. Duplicate enrollment guards still apply."
                : action === "admission"
                  ? "This updates the selected term records and safely reconciles admission-targeted required fees."
								: "Student identities and historical terms remain available."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{action === "move" ? (
						<Select
							value={classroomDepartmentId}
							onValueChange={setClassroomDepartmentId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Choose a class" />
							</SelectTrigger>
							<SelectContent>
								{classrooms?.data?.map((department) => (
									<SelectItem key={department.id} value={department.id}>
										{Array.from(
											new Set([
												department.classRoom?.name,
												department.departmentName,
											]),
										)
											.filter(Boolean)
											.join(" ")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : null}
          {action === "admission" ? (
            <Select
              value={admissionType}
              onValueChange={(value) =>
                setAdmissionType(
                  value as "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING",
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW_ADMISSION">New admission</SelectItem>
                <SelectItem value="RETURNING">Returning student</SelectItem>
                <SelectItem value="UNCLASSIFIED">
                  Needs classification
                </SelectItem>
              </SelectContent>
            </Select>
          ) : null}
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={
								moveStudents.isPending ||
								removeStudents.isPending ||
                classifyStudents.isPending ||
								(action === "move" && !classroomDepartmentId)
							}
							onClick={confirmAction}
						>
              {action === "move"
                ? "Move students"
                : action === "admission"
                  ? "Update status"
                  : "Remove enrollments"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
