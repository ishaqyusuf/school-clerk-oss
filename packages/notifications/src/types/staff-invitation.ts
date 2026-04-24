import * as React from "react";
import { z } from "zod";
import {
	StaffInvitationEmail,
	type StaffInvitationEmailProps,
} from "@school-clerk/email/emails/staff-invitation";
import { defineSchoolNotification } from "./shared";

const schema = z.object({
	inviteLink: z.string().url().optional().nullable(),
	invitedByName: z.string().optional().nullable(),
	recipientEmail: z.string().email(),
	roleLabel: z.string().min(1),
	schoolName: z.string().min(1),
	staffName: z.string().min(1),
});

function createStaffInvitationTemplate(props: StaffInvitationEmailProps) {
	return React.createElement(StaffInvitationEmail, props);
}

export const staffInvitation = defineSchoolNotification({
	buildBody: (payload) =>
		`You've been invited to join ${payload.schoolName} as ${payload.roleLabel}.${payload.invitedByName ? ` Invited by ${payload.invitedByName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createStaffInvitationTemplate({
			ctaHref: payload.inviteLink,
			inviteeName: payload.staffName,
			inviterName: payload.invitedByName,
			roleLabel: payload.roleLabel,
			schoolName: payload.schoolName,
		}),
		subject: `${payload.schoolName}: you're invited to join as ${payload.roleLabel}`,
	}),
	buildLink: (payload) => payload.inviteLink ?? null,
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Staff invitation for ${payload.staffName}`,
	variant: "info",
});
