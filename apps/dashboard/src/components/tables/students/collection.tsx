"use client";

import {
	type CollectionView,
	DirectoryCollection,
	DirectoryRecord,
} from "@/components/tables/core";
import { Badge } from "@school-clerk/ui/badge";
import { Avatar } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import type { Row } from "@tanstack/react-table";
import { StudentActionsMenu } from "./actions-menu";
import { AdmissionTypeCell } from "./admission-type-cell";
import { type Item, StatusCell } from "./columns";

/** Students as List items or Cards; the same rows and selection as the table. */
export function StudentCollection({
	rows,
	view,
	onOpen,
}: {
	rows: Row<Item>[];
	view: CollectionView;
	onOpen: (studentId: string) => void;
}) {
	return (
		<DirectoryCollection view={view} label="Students">
			{rows.map((row) => {
				const student = row.original;
				const details = [
					student.guardianName
						? { label: "Guardian", value: student.guardianName }
						: null,
					student.guardianPhone
						? {
								label: "Guardian phone",
								value: <span dir="ltr">{student.guardianPhone}</span>,
							}
						: null,
				].filter((detail) => detail !== null);
				return (
					<DirectoryRecord
						key={row.id}
						row={row}
						view={view}
						selectLabel={`Select ${student.studentName}`}
						media={
							<Avatar className="size-9 shrink-0 border bg-muted">
								<Avatar.Fallback>
									{getInitials(student.studentName)}
								</Avatar.Fallback>
							</Avatar>
						}
						title={<span dir="auto">{student.studentName}</span>}
						description={
							<span dir="auto">
								{student.department || "No class assigned"}
							</span>
						}
						badges={
							<>
								<Badge variant="outline" className="rounded-none">
									{student.gender}
								</Badge>
								<StatusCell status={student.status} />
								<AdmissionTypeCell admissionType={student.admissionType} />
							</>
						}
						details={details}
						actions={<StudentActionsMenu student={student} />}
						onOpen={() => onOpen(student.id)}
					/>
				);
			})}
		</DirectoryCollection>
	);
}
