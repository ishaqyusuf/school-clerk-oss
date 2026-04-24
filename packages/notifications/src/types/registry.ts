import { defineNotificationTypes } from "../notification-types";
import { payrollPaymentCancelled } from "./payroll-payment-cancelled";
import { payrollPaymentRecorded } from "./payroll-payment-recorded";
import { servicePaymentCancelled } from "./service-payment-cancelled";
import { servicePaymentRecorded } from "./service-payment-recorded";
import { staffInvitation } from "./staff-invitation";
import { studentPaymentCancelled } from "./student-payment-cancelled";
import { studentPaymentReceived } from "./student-payment-received";

export const schoolClerkNotificationTypes = defineNotificationTypes({
	payroll_payment_cancelled: payrollPaymentCancelled,
	payroll_payment_recorded: payrollPaymentRecorded,
	service_payment_cancelled: servicePaymentCancelled,
	service_payment_recorded: servicePaymentRecorded,
	staff_invitation: staffInvitation,
	student_payment_cancelled: studentPaymentCancelled,
	student_payment_received: studentPaymentReceived,
});

export * from "./shared";
export * from "./payroll-payment-cancelled";
export * from "./payroll-payment-recorded";
export * from "./service-payment-cancelled";
export * from "./service-payment-recorded";
export * from "./staff-invitation";
export * from "./student-payment-cancelled";
export * from "./student-payment-received";
