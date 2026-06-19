import {
  sendStaffInvitationEmailSchema,
  sendStaffInvitationEmailTaskId,
} from "@jobs/schema";
import { StaffInvitationEmail } from "@school-clerk/email";
import { queue, schemaTask } from "@trigger.dev/sdk";
import React from "react";
import { sendEmail } from "../utils/resend";

export const sendStaffInvitationEmailQueue = queue({
  concurrencyLimit: 10,
  name: "send-staff-invitation-email",
});

export const sendStaffInvitationEmail = schemaTask({
  id: sendStaffInvitationEmailTaskId,
  schema: sendStaffInvitationEmailSchema,
  maxDuration: 60,
  queue: sendStaffInvitationEmailQueue,
  run: async (payload) => {
    await sendEmail({
      subject: `${payload.schoolName}: you're invited to join as ${payload.roleLabel}`,
      from:
        process.env.RESEND_FROM_EMAIL ??
        "School Clerk <noreply@school-clerk.com>",
      to: payload.email,
      content: React.createElement(StaffInvitationEmail, {
        ctaHref: payload.ctaHref,
        inviteeName: payload.staffName,
        inviterName: payload.invitedByName,
        roleLabel: payload.roleLabel,
        schoolName: payload.schoolName,
      }),
      successLog: "staff invitation email sent",
      errorLog: "staff invitation email failed to send",
      task: {
        id: sendStaffInvitationEmailTaskId,
        payload,
      },
    });
  },
});
