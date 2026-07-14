export const processStudentImportJobTaskId = "process-student-import-job";
export const sendStaffInvitationEmailTaskId = "send-staff-invitation-email";

export type SendStaffInvitationEmailPayload = {
  ctaHref: string;
  email: string;
  invitedByName?: string | null;
  roleLabel: string;
  schoolName: string;
  staffName: string;
};
