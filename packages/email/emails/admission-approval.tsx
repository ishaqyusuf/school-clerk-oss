import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger, type LedgerRow } from "../components/ledger";
import { Notice } from "../components/notice";

export type AdmissionApprovalEmailProps = {
	admissionLetterUrl?: string | null;
	classroomName: string;
	parentName: string;
	paymentAmount?: string | null;
	paymentDueAt?: string | null;
	paymentInstructions?: string | null;
	paymentLabel?: string | null;
	paymentLink?: string | null;
	paymentRequired: boolean;
	schoolName: string;
	studentName: string;
};

export function AdmissionApprovalEmail({
	admissionLetterUrl,
	classroomName,
	parentName,
	paymentAmount,
	paymentDueAt,
	paymentInstructions,
	paymentLabel,
	paymentLink,
	paymentRequired,
	schoolName,
	studentName,
}: AdmissionApprovalEmailProps) {
	const title = `${studentName} has a place in ${classroomName}.`;
	const primaryHref = paymentLink ?? admissionLetterUrl;
	const rows: LedgerRow[] = [
		{ label: "Student", value: studentName },
		{ label: "Class", value: classroomName },
		...(paymentRequired
			? [
					{
						label: paymentLabel || "Admission payment",
						value: paymentAmount || "Required",
					},
					...(paymentDueAt ? [{ label: "Due date", value: paymentDueAt }] : []),
				]
			: [{ label: "Admission payment", value: "Not required" }]),
	];

	return (
		<EmailFrame
			category="Admissions"
			contactLine="Admissions office"
			eyebrow="Admission approved"
			intro={
				<>
					Hello {parentName || "there"}, {schoolName} has approved {studentName}
					&apos;s admission. Review the enrolment details and complete the next
					step below.
				</>
			}
			preview={`${studentName}'s admission to ${schoolName} was approved`}
			reference="Admissions"
			schoolName={schoolName}
			title={title}
			tone="success"
		>
			<Ledger rows={rows} />
			<Notice>
				{paymentRequired
					? paymentInstructions ||
						"Complete the admission payment to secure the offered place."
					: "No admission payment is required before the next step."}
			</Notice>
			{primaryHref ? (
				<Section style={{ margin: "26px 0 12px" }}>
					{paymentLink ? (
						<Button href={paymentLink}>Complete payment</Button>
					) : null}
					{admissionLetterUrl ? (
						<Button
							className={paymentLink ? "ml-[8px]" : ""}
							href={admissionLetterUrl}
							variant="secondary"
						>
							Admission letter
						</Button>
					) : null}
				</Section>
			) : null}
			<FallbackLink href={primaryHref} />
		</EmailFrame>
	);
}

export default function AdmissionApprovalEmailPreview() {
	return (
		<AdmissionApprovalEmail
			admissionLetterUrl="https://dashboard.greenfield.school-clerk.com/admissions/AMR-0248/letter"
			classroomName="Junior Secondary 1"
			parentName="Chioma"
			paymentAmount="₦125,000"
			paymentDueAt="5 September 2026"
			paymentInstructions="Pay online or use the bank instructions in the admission letter. Your place is held until the due date."
			paymentLabel="Acceptance fee"
			paymentLink="https://dashboard.greenfield.school-clerk.com/admissions/AMR-0248/payment"
			paymentRequired
			schoolName="Greenfield Academy"
			studentName="Amara Okafor"
		/>
	);
}
