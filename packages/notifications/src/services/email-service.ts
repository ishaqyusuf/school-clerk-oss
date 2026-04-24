import type { NotificationChannelDispatch } from "../core-types";

export type EmailDispatchHandler = (
	dispatch: NotificationChannelDispatch,
) => void | Promise<void>;

export class EmailService {
	constructor(private readonly sendEmail?: EmailDispatchHandler) {}

	async sendBulk(dispatches: NotificationChannelDispatch[]) {
		const emailDispatches = dispatches.filter(
			(dispatch) => dispatch.channel === "email",
		);

		if (!emailDispatches.length || !this.sendEmail) {
			return {
				failed: 0,
				sent: 0,
				skipped: dispatches.length,
			};
		}

		let sent = 0;
		let failed = 0;

		for (const dispatch of emailDispatches) {
			try {
				await this.sendEmail(dispatch);
				sent += 1;
			} catch {
				failed += 1;
			}
		}

		return {
			failed,
			sent,
			skipped: dispatches.length - emailDispatches.length,
		};
	}
}
