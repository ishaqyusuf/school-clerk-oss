import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger } from "../components/ledger";
import { Notice } from "../components/notice";

export type StaffInvitationEmailProps = {
	ctaHref?: string | null;
	inviteeName: string;
	inviterName?: string | null;
	roleLabel: string;
	schoolName: string;
};

export function StaffInvitationEmail({
	ctaHref,
	inviteeName,
	inviterName,
	roleLabel,
	schoolName,
}: StaffInvitationEmailProps) {
	const title = `Your ${roleLabel} workspace is ready to join.`;

	return (
		<EmailFrame
			category="Staff access"
			eyebrow="Staff invitation"
			intro={
				<>
					Hello {inviteeName || "there"}, you have been invited to join{" "}
					{schoolName}
					as {roleLabel}. Set your password to enter the school workspace.
				</>
			}
			preview={`You're invited to join ${schoolName} as ${roleLabel}`}
			reference="Staff access"
			schoolName={schoolName}
			title={title}
			tone="info"
		>
			<Ledger
				rows={[
					{ label: "Staff member", value: inviteeName },
					{ label: "Role", value: roleLabel },
					...(inviterName ? [{ label: "Invited by", value: inviterName }] : []),
				]}
			/>
			<Notice>
				This private link lets you choose a password and continue to your
				dashboard. Do not forward it to anyone else.
			</Notice>
			{ctaHref ? (
				<Section style={{ margin: "26px 0 12px" }}>
					<Button href={ctaHref}>Set password and continue</Button>
				</Section>
			) : null}
			<FallbackLink href={ctaHref} />
		</EmailFrame>
	);
}

export default function StaffInvitationEmailPreview() {
	return (
		<StaffInvitationEmail
			ctaHref="https://dashboard.greenfield.school-clerk.com/reset-password/invite-token"
			inviteeName="Adaeze Nwosu"
			inviterName="Principal Ibrahim"
			roleLabel="Class Teacher"
			schoolName="Greenfield Academy"
		/>
	);
}
