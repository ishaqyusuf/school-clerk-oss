export type ListItem = {
	id: string;
	name: string;
	title: string | null;
	email: string | null;
	staffTermId: string | null;
	role: string;
	onboardingStatus: "NOT_SENT" | "PENDING" | "ACTIVE" | "FAILED";
	inviteSentAt: Date | null;
	inviteResentAt: Date | null;
	lastInviteError: string | null;
	classroomCount: number;
	subjectCount: number;
	classroomLabels: string[];
	subjectLabels: string[];
	canResend: boolean;
	canManageAssignments: boolean;
};
