import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger } from "../components/ledger";
import { Notice } from "../components/notice";

export type AdmissionSubmissionEmailProps = {
	applicationReference: string;
	classroomName: string;
	ctaHref?: string | null;
	documentCount: number;
	parentName: string;
	schoolName: string;
	studentName: string;
};

export function AdmissionSubmissionEmail({
	applicationReference,
	classroomName,
	ctaHref,
	documentCount,
	parentName,
	schoolName,
	studentName,
}: AdmissionSubmissionEmailProps) {
	return (
		<EmailFrame
			category="Admissions"
			contactLine="Admissions office"
			eyebrow="Application received"
			intro={
				<>
					Hello {parentName || "there"}, we received {studentName}&apos;s
					admission application. {schoolName} will review the submitted details
					and contact you with the next step.
				</>
			}
			preview={`${schoolName} received ${studentName}'s admission application`}
			reference={`Admissions · ${applicationReference}`}
			schoolName={schoolName}
			title="Application received and ready for review."
			tone="info"
		>
			<Ledger
				rows={[
					{ label: "Reference", value: applicationReference },
					{ label: "Student", value: studentName },
					{ label: "Class", value: classroomName },
					{ label: "Documents", value: documentCount },
				]}
			/>
			<Notice>
				Keep the application reference for future correspondence. The school
				will contact you when its review is complete.
			</Notice>
			{ctaHref ? (
				<Section style={{ margin: "26px 0 12px" }}>
					<Button href={ctaHref}>View submission status</Button>
				</Section>
			) : null}
			<FallbackLink href={ctaHref} />
		</EmailFrame>
	);
}

export default function AdmissionSubmissionEmailPreview() {
	return (
		<AdmissionSubmissionEmail
			applicationReference="AMR-0248"
			classroomName="Junior Secondary 1"
			ctaHref="https://greenfield.school-clerk.com/enroll/AMR-0248"
			documentCount={3}
			parentName="Chioma"
			schoolName="Greenfield Academy"
			studentName="Amara Okafor"
		/>
	);
}
