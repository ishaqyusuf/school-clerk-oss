"use client";

import { OpenAssistant } from "@/components/assistant/open-assistant";
import {
	type CollectionView,
	DirectoryCollection,
	DirectoryRecord,
} from "@/components/tables/core";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Actions, type Item } from "./columns";

export type ClassGroup = {
	id: string;
	classRoom: Item["classRoom"];
	rows: Item[];
	studentCount: number;
	subjectCount: number;
	progressionMode: string;
};

function plural(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function RecordActions({ item }: { item: Item }) {
	return (
		<div className="flex items-center gap-1" dir="ltr">
			<OpenAssistant
				compact
				records={[
					{
						kind: "classroom",
						id: item.id,
						label: item.displayName ?? item.classRoom?.name ?? "Classroom",
					},
				]}
			/>
			<Actions item={item} />
		</div>
	);
}

/** Streams (one row per class department) as List items or Cards. */
export function ClassroomCollection({
	items,
	view,
	onOpen,
}: {
	items: Item[];
	view: CollectionView;
	onOpen: (classroomId: string) => void;
}) {
	return (
		<DirectoryCollection view={view} label="Classrooms">
			{items.map((item) => {
				const termTitle = item.classRoom?.session?.title;
				const className = item.classRoom?.name;
				return (
					<DirectoryRecord
						key={item.id}
						view={view}
						title={<span dir="auto">{item.displayName}</span>}
						description={
							className && className !== item.displayName ? (
								<span dir="auto">{className}</span>
							) : undefined
						}
						badges={
							<>
								<Badge variant="outline" className="rounded-none">
									Level {item.classRoom?.classLevel ?? "—"}
								</Badge>
								<Badge
									variant={termTitle ? "secondary" : "outline"}
									className="rounded-none"
								>
									{termTitle || "Setup pending"}
								</Badge>
							</>
						}
						highlight={{
							label: "Students",
							value: item._count?.studentSessionForms ?? 0,
						}}
						details={[
							{
								label: "Subjects",
								value: plural(item._count?.subjects ?? 0, "subject"),
							},
						]}
						actions={<RecordActions item={item} />}
						onOpen={() => onOpen(item.id)}
					/>
				);
			})}
		</DirectoryCollection>
	);
}

/** "View by Class": one record per class with its streams as badges. */
export function ClassGroupCollection({
	groups,
	view,
	onOpen,
}: {
	groups: ClassGroup[];
	view: CollectionView;
	onOpen: (classroomId: string) => void;
}) {
	return (
		<DirectoryCollection view={view} label="Classes">
			{groups.map((group) => {
				const firstStream = group.rows[0];
				return (
					<DirectoryRecord
						key={group.id}
						view={view}
						title={<span dir="auto">{group.classRoom?.name}</span>}
						description={`${
							group.rows.length > 1
								? `${group.rows.length} streams`
								: "Single stream"
						} · ${group.progressionMode}`}
						badges={
							<>
								<Badge variant="outline" className="rounded-none">
									Level {group.classRoom?.classLevel ?? "—"}
								</Badge>
								{group.rows.map((stream) => (
									<Badge
										key={stream.id}
										variant="secondary"
										className="rounded-none"
										dir="auto"
									>
										{stream.departmentName}
										{stream.departmentLevel != null
											? ` · ${stream.departmentLevel}`
											: ""}
									</Badge>
								))}
							</>
						}
						highlight={{ label: "Students", value: group.studentCount }}
						details={[
							{
								label: "Subjects",
								value: plural(group.subjectCount, "subject"),
							},
						]}
						actions={
							firstStream ? (
								<>
									<Actions item={firstStream} />
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => onOpen(firstStream.id)}
									>
										Open first stream
									</Button>
								</>
							) : undefined
						}
						onOpen={firstStream ? () => onOpen(firstStream.id) : undefined}
					/>
				);
			})}
		</DirectoryCollection>
	);
}
