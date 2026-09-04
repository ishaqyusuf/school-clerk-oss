import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger } from "../components/ledger";
import { Notice } from "../components/notice";

export type WorkspaceReadyEmailProps = {
	onboardingUrl: string;
	schoolName: string;
	siteUrl: string;
	workspaceUrl: string;
};

export function WorkspaceReadyEmail({
	onboardingUrl,
	schoolName,
	siteUrl,
	workspaceUrl,
}: WorkspaceReadyEmailProps) {
	return (
		<EmailFrame
			category="Getting started"
			eyebrow="Workspace ready"
			intro={
				<>
					Your School Clerk workspace for {schoolName} has been created.
					Continue onboarding to configure the school and invite your team.
				</>
			}
			preview={`${schoolName}'s School Clerk workspace is ready`}
			reference="Onboarding"
			schoolName={schoolName}
			title={`${schoolName} is ready for setup.`}
			tone="success"
		>
			<Ledger
				rows={[
					{ label: "Workspace", value: workspaceUrl },
					{ label: "Public school site", value: siteUrl },
				]}
			/>
			<Notice>
				Your addresses are reserved. Complete onboarding before sharing them
				with staff, parents, or students.
			</Notice>
			<Section style={{ margin: "26px 0 12px" }}>
				<Button href={onboardingUrl}>Continue onboarding</Button>
				<Button className="ml-[8px]" href={workspaceUrl} variant="secondary">
					Open workspace
				</Button>
			</Section>
			<FallbackLink href={onboardingUrl} />
		</EmailFrame>
	);
}

export default function WorkspaceReadyEmailPreview() {
	return (
		<WorkspaceReadyEmail
			onboardingUrl="https://dashboard.greenfield.school-clerk.com/onboarding/welcome"
			schoolName="Greenfield Academy"
			siteUrl="https://greenfield.school-clerk.com"
			workspaceUrl="https://dashboard.greenfield.school-clerk.com"
		/>
	);
}
