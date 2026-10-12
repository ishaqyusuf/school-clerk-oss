"use client";

import {
	type AttendanceScope,
	type AttendanceStatus,
	todayAttendanceDate,
} from "@/lib/attendance";
import {
	type ReactNode,
	createContext,
	useContext,
	useRef,
	useState,
} from "react";

export const ATTENDANCE_ROSTER_BATCH_SIZE = 25;

function useDraftState() {
	const [title, setTitle] = useState("Daily attendance");
	const [attendanceDate, setAttendanceDate] = useState(todayAttendanceDate);
	const [scope, setScope] = useState<AttendanceScope>("GENERAL");
	const [periodLabel, setPeriodLabel] = useState("");
	const [departmentSubjectId, setDepartmentSubjectId] = useState("");
	const [statusMap, setStatusMap] = useState<
		Record<string, AttendanceStatus | undefined>
	>({});
	const [commentMap, setCommentMap] = useState<Record<string, string>>({});
	const [visibleRosterCount, setVisibleRosterCount] = useState(
		ATTENDANCE_ROSTER_BATCH_SIZE,
	);
	const idempotencyRequestRef = useRef<{
		fingerprint: string;
		key: string;
	} | null>(null);
	const previousRosterRef = useRef<{
		departmentId?: string | null;
		keys: Set<string>;
	} | null>(null);

	return {
		title,
		setTitle,
		attendanceDate,
		setAttendanceDate,
		scope,
		setScope,
		periodLabel,
		setPeriodLabel,
		departmentSubjectId,
		setDepartmentSubjectId,
		statusMap,
		setStatusMap,
		commentMap,
		setCommentMap,
		visibleRosterCount,
		setVisibleRosterCount,
		idempotencyRequestRef,
		previousRosterRef,
	};
}

const AttendanceDraftContext = createContext<
	(ReturnType<typeof useDraftState> & { departmentId?: string | null }) | null
>(null);

export function AttendanceDraftProvider({
	children,
	departmentId,
}: {
	children: ReactNode;
	departmentId?: string | null;
}) {
	const draft = useDraftState();
	return (
		<AttendanceDraftContext.Provider value={{ ...draft, departmentId }}>
			{children}
		</AttendanceDraftContext.Provider>
	);
}

export function useAttendanceDraft({
	departmentId,
	shared,
}: {
	departmentId?: string | null;
	shared: boolean;
}) {
	const workspaceDraft = useContext(AttendanceDraftContext);
	const localDraft = useDraftState();
	const isWorkspaceDraft = Boolean(
		shared && workspaceDraft && workspaceDraft.departmentId === departmentId,
	);
	return {
		...(isWorkspaceDraft && workspaceDraft ? workspaceDraft : localDraft),
		isWorkspaceDraft,
	};
}
