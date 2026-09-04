import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger } from "../components/ledger";
import { Notice } from "../components/notice";

export type SignupVerificationEmailProps = {
	expiresIn?: string;
	schoolName: string;
	verificationUrl: string;
};

export function SignupVerificationEmail({
	expiresIn = "24 hours",
	schoolName,
	verificationUrl,
}: SignupVerificationEmailProps) {
	return (
		<EmailFrame
			category="Owner account"
			eyebrow="Email verification"
			intro={
				<>
					Your School Clerk workspace for {schoolName} is ready. Verify this
					email address to secure the owner account before continuing.
				</>
			}
			preview={`Verify the owner account for ${schoolName}`}
			reference="Owner access"
			schoolName={schoolName}
			title="Confirm your email to secure the workspace."
			tone="info"
		>
			<Ledger
				rows={[
					{ label: "Workspace", value: schoolName },
					{ label: "Account", value: "School owner" },
					{ label: "Link expires", value: expiresIn },
				]}
			/>
			<Notice>
				Only use this link if you created the workspace. It expires after{" "}
				{expiresIn}.
			</Notice>
			<Section style={{ margin: "26px 0 12px" }}>
				<Button href={verificationUrl}>Verify email</Button>
			</Section>
			<FallbackLink href={verificationUrl} />
		</EmailFrame>
	);
}

export default function SignupVerificationEmailPreview() {
	return (
		<SignupVerificationEmail
			schoolName="Greenfield Academy"
			verificationUrl="https://dashboard.greenfield.school-clerk.com/verify-email?token=sample"
		/>
	);
}
