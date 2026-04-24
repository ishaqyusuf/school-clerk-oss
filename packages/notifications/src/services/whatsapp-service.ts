import type { NotificationChannelDispatch } from "../core-types";

export type WhatsAppDispatchHandler = (
	dispatch: NotificationChannelDispatch,
) => void | Promise<void>;

export class WhatsAppService {
	constructor(private readonly sendWhatsApp?: WhatsAppDispatchHandler) {}

	async sendBulk(dispatches: NotificationChannelDispatch[]) {
		const whatsappDispatches = dispatches.filter(
			(dispatch) => dispatch.channel === "whatsapp",
		);

		if (!whatsappDispatches.length || !this.sendWhatsApp) {
			return {
				failed: 0,
				sent: 0,
				skipped: dispatches.length,
			};
		}

		let sent = 0;
		let failed = 0;

		for (const dispatch of whatsappDispatches) {
			try {
				await this.sendWhatsApp(dispatch);
				sent += 1;
			} catch {
				failed += 1;
			}
		}

		return {
			failed,
			sent,
			skipped: dispatches.length - whatsappDispatches.length,
		};
	}
}
