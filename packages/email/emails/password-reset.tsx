import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger } from "../components/ledger";
import { Notice } from "../components/notice";

export type PasswordResetEmailProps = {
	name: string;
	staffRole?: string | null;
	schoolName?: string | null;
	url: string;
};

export function PasswordResetEmail({
	name,
	staffRole,
	schoolName,
	url,
}: PasswordResetEmailProps) {
	const accountName = schoolName || "School Clerk";

	return (
		<EmailFrame
			category="Account security"
			eyebrow="Password access"
			intro={
				<>
					Hello {name || "there"}, use the secure link below to choose a
					password and continue with your {accountName} account.
				</>
			}
			preview={`Set or reset your ${accountName} password`}
			reference="Security"
			schoolName={accountName}
			title="Set your password and continue."
			tone="info"
		>
			<Ledger
				rows={[
					{ label: "Account", value: accountName },
					...(staffRole ? [{ label: "Role", value: staffRole }] : []),
					{ label: "Action", value: "Set or reset password" },
				]}
			/>
			<Notice>
				This link is private and should only be used by the person it was sent
				to. If you did not request it, you can ignore this email.
			</Notice>
			<Section style={{ margin: "26px 0 12px" }}>
				<Button href={url}>Set password</Button>
			</Section>
			<FallbackLink href={url} />
		</EmailFrame>
	);
}

export default function PasswordResetEmailPreview() {
	return (
		<PasswordResetEmail
			name="Adaeze Nwosu"
			staffRole="Class Teacher"
			schoolName="Greenfield Academy"
			url="https://dashboard.greenfield.school-clerk.com/reset-password/sample-token"
		/>
	);
}
