import { Button } from "@school-clerk/ui/button";
import Sheet from "@school-clerk/ui/custom/sheet";
import {
	QueryClient,
	QueryClientProvider,
	useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AttendanceDraftProvider } from "../../../apps/dashboard/src/components/attendance-draft-context";
import { ClassroomAttendanceRecorder } from "../../../apps/dashboard/src/components/classroom-attendance-form";
import { WorkspaceContext, students, submissions } from "./adapters";
const client = new QueryClient({
	defaultOptions: {
		queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
	},
});
function Workspace() {
	const [departmentId, setDepartmentId] = useState("class-a");
	const [termId, setTermId] = useState("term-a");
	const [secondaryTab, setSecondaryTab] = useState<string | null>(null);
	const [open, setOpen] = useState(true);
	const qc = useQueryClient();
	const setParams = (next: { secondaryTab?: string | null }) => {
		if ("secondaryTab" in next) setSecondaryTab(next.secondaryTab ?? null);
	};
	const finish = async (add: boolean) => {
		if (add)
			students.push({
				id: "new-student",
				studentName: "New Student",
				studentTermFormId: "new-form",
			});
		await qc.invalidateQueries({
			queryKey: ["attendance.getAttendanceRoster", { departmentId }],
		});
		setSecondaryTab(null);
	};
	return (
		<WorkspaceContext.Provider
			value={{ departmentId, termId, secondaryTab, setParams }}
		>
			<Button onClick={() => setOpen(true)}>Reopen classroom</Button>
			<AttendanceDraftProvider
				key={JSON.stringify([departmentId, termId, open])}
				departmentId={departmentId}
			>
				<Sheet
					open={open}
					onOpenChange={setOpen}
					sheetName="attendance-regression"
					secondaryOpened={!!secondaryTab}
					onCloseSecondary={() => setSecondaryTab(null)}
				>
					<Sheet.MultiContent>
						<Sheet.PrimaryContent>
							<Sheet.Title>Attendance fixture</Sheet.Title>
						</Sheet.PrimaryContent>
						<Sheet.PrimaryContent>
							<Sheet.Content>
								<ClassroomAttendanceRecorder departmentId={departmentId} />
								<Button
									onClick={() =>
										setDepartmentId(
											departmentId === "class-a" ? "class-b" : "class-a",
										)
									}
								>
									Switch classroom
								</Button>
								<Button
									onClick={() =>
										setTermId(termId === "term-a" ? "term-b" : "term-a")
									}
								>
									Switch term
								</Button>
								<Button onClick={() => setOpen(false)}>Close classroom</Button>
								<Button
									onClick={() => {
										const output = document.getElementById("payload");
										if (output)
											output.textContent = JSON.stringify(submissions);
									}}
								>
									Inspect submission
								</Button>
								<output id="payload" />
							</Sheet.Content>
						</Sheet.PrimaryContent>
						{secondaryTab ? (
							<Sheet.SecondaryContent>
								<Sheet.Title>New student fixture</Sheet.Title>
								<Button onClick={() => finish(true)}>
									Complete registration
								</Button>
								<Button onClick={() => finish(false)}>
									Cancel registration
								</Button>
							</Sheet.SecondaryContent>
						) : null}
					</Sheet.MultiContent>
				</Sheet>
			</AttendanceDraftProvider>
		</WorkspaceContext.Provider>
	);
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
	<QueryClientProvider client={client}>
		<Workspace />
	</QueryClientProvider>,
);
