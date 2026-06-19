import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@school-clerk/email/render";
import { getRecipient } from "@school-clerk/utils/envs";
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
  const toEmail = getRecipient(to!);
  const response = await resend.emails.send({
    subject,
    from,
    to: toEmail,
    headers: {
      "X-Entity-Ref-ID": nanoid(),
    },
    html: await render(content),
  });
  if (response.error) {
    logger.error(errorLog || "email failed to send", {
      error: response.error,
      customerEmail: toEmail,
    });
    throw new Error(errorLog || "email failed to send");
  }
  logger.info(successLog || "email sent");
}
