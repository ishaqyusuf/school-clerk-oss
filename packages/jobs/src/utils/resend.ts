import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@school-clerk/email/render";
import { getEmailDeliveryRoutes } from "@school-clerk/utils/envs";
import { nanoid } from "nanoid";
import { logger } from "@trigger.dev/sdk";

export const resend = new Resend(process.env.RESEND_API_KEY!);
interface SendEmailProps {
  subject: string;
  from: string;
  to: string | string[];
  content: ReactElement;
  successLog?: string;
  errorLog?: string;
  task: {
    id: string;
    payload: any;
  };
}
export async function sendEmail({
  subject,
  from,
  to,
  content,
  errorLog,
  successLog,
}: SendEmailProps) {
	const html = await render(content);
	const routes = getEmailDeliveryRoutes(to);

	for (const route of routes) {
		if (route.transport === "console") {
			logger.info("email captured by console delivery", {
				originalRecipient: route.originalRecipient,
    subject,
			});
			continue;
		}

		const response = await resend.emails.send({
			subject: route.qaRouted
				? `[QA: ${route.originalRecipient}] ${subject}`
				: subject,
    from,
			to: route.recipient,
    headers: {
      "X-Entity-Ref-ID": nanoid(),
				...(route.qaRouted
					? { "X-QA-Original-Recipient": route.originalRecipient }
					: {}),
    },
			html: route.qaRouted
				? `<p><strong>QA routed for ${route.originalRecipient}</strong></p>${html}`
				: html,
  });
  if (response.error) {
    logger.error(errorLog || "email failed to send", {
      error: response.error,
				originalRecipient: route.originalRecipient,
				qaRouted: route.qaRouted,
    });
    throw new Error(errorLog || "email failed to send");
  }
	}
  logger.info(successLog || "email sent");
}
