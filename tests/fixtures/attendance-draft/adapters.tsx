import { createContext, useContext } from "react";
export const WorkspaceContext = createContext({
	departmentId: "class-a",
	termId: "term-a",
	secondaryTab: null as string | null,
	setParams: (_: object) => {},
});
export const useClassroomParams = () => {
	const workspace = useContext(WorkspaceContext);
	return {
		viewClassroomId: workspace.departmentId,
		secondaryTab: workspace.secondaryTab,
		setParams: workspace.setParams,
	};
};
export const useAuth = () => {
	const workspace = useContext(WorkspaceContext);
	return {
		id: "admin",
		sessionId: "login",
		role: "ADMIN",
		profile: {
			schoolId: "school",
			sessionId: "session",
			termId: workspace.termId,
		},
	};
};
export const students = Array.from({ length: 28 }, (_, i) => ({
	id: `student-${i}`,
	studentName: `Student ${String(i + 1).padStart(2, "0")}`,
	studentTermFormId: `form-${i}`,
}));
export const submissions: unknown[] = [];
function procedure<T>(name: string, read: () => T) {
	return {
		queryKey: (input?: unknown) => [name, input],
		queryOptions: (input: unknown, options: object = {}) => ({
			queryKey: [name, input],
			queryFn: async () => read(),
			...options,
		}),
		mutationOptions: (options: object) => ({
			mutationFn: async (input: unknown) => {
				submissions.push(input);
				return {};
			},
			...options,
		}),
	};
}
const trpc = {
	attendance: {
		getAttendanceRoster: procedure("attendance.getAttendanceRoster", () => ({
			students: [...students],
		})),
		getAttendanceOptions: procedure("attendance.getAttendanceOptions", () => ({
			subjects: [{ id: "math", title: "Mathematics" }],
		})),
		getAttendanceSession: procedure(
			"attendance.getAttendanceSession",
			() => null,
		),
		getClassroomAttendance: procedure(
			"attendance.getClassroomAttendance",
			() => [],
		),
		getStudentAttendanceHistory: procedure(
			"attendance.getStudentAttendanceHistory",
			() => [],
		),
		getAttendanceReport: procedure("attendance.getAttendanceReport", () => ({
			rows: [],
		})),
		takeAttendance: procedure("attendance.takeAttendance", () => ({})),
		updateAttendanceSession: procedure(
			"attendance.updateAttendanceSession",
			() => ({}),
		),
	},
};
export const useTRPC = () => trpc;
