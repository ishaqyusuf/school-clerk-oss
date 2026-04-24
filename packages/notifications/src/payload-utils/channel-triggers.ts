import type {
	NotificationRecipients,
	NotificationTriggerInput,
	SchoolClerkNotificationType,
} from "./types";
import { normalizeRecipients } from "./recipients";

type SendFn = <TType extends SchoolClerkNotificationType>(
	type: TType,
	input: NotificationTriggerInput<TType>,
) => unknown | Promise<unknown>;

type ChannelTriggerFactoryOptions = {
	getStoredRecipients?: () => NotificationRecipients;
	send: SendFn;
};

function resolveRecipients(
	explicitRecipients: NotificationRecipients | undefined,
	storedRecipients: NotificationRecipients | undefined,
) {
	if (explicitRecipients?.length) {
		return normalizeRecipients(explicitRecipients);
	}

	if (storedRecipients?.length) {
		return normalizeRecipients(storedRecipients);
	}

	return null;
}

type TriggerInput<TType extends SchoolClerkNotificationType> =
	NotificationTriggerInput<TType>;

export function createNotificationChannelTriggers(
	options: ChannelTriggerFactoryOptions,
) {
	const getStoredRecipients = options.getStoredRecipients ?? (() => null);

	function send<TType extends SchoolClerkNotificationType>(
		type: TType,
		input: TriggerInput<TType>,
	) {
		const { recipients, ...rest } = input;

		return options.send(type, {
			...rest,
			recipients: resolveRecipients(recipients, getStoredRecipients()),
		});
	}

	return {
		send,
		studentPaymentReceived(
			input: TriggerInput<"student_payment_received">,
		) {
			return send("student_payment_received", input);
		},
		studentPaymentCancelled(
			input: TriggerInput<"student_payment_cancelled">,
		) {
			return send("student_payment_cancelled", input);
		},
		servicePaymentRecorded(
			input: TriggerInput<"service_payment_recorded">,
		) {
			return send("service_payment_recorded", input);
		},
		servicePaymentCancelled(
			input: TriggerInput<"service_payment_cancelled">,
		) {
			return send("service_payment_cancelled", input);
		},
		payrollPaymentRecorded(
			input: TriggerInput<"payroll_payment_recorded">,
		) {
			return send("payroll_payment_recorded", input);
		},
		payrollPaymentCancelled(
			input: TriggerInput<"payroll_payment_cancelled">,
		) {
			return send("payroll_payment_cancelled", input);
		},
		staffInvitation(input: TriggerInput<"staff_invitation">) {
			return send("staff_invitation", input);
		},
	};
}
