export const processStudentImportJobTaskId = "process-student-import-job";
export const processFinancePaymentImportJobTaskId =
	"process-finance-payment-import-job";
export const sendStaffInvitationEmailTaskId = "send-staff-invitation-email";
export const qaPurgeTaskId = "qa-purge";

export type SendStaffInvitationEmailPayload = {
  deliveryId: string;
  ctaHref: string;
};
