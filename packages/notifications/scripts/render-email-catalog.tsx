import {
	AdmissionApprovalEmail,
	AdmissionSubmissionEmail,
	PasswordResetEmail,
	SignupVerificationEmail,
	StaffInvitationEmail,
	WorkspaceReadyEmail,
	render,
} from "@school-clerk/email";
import { createNotificationFromType } from "../src";

const outputDir = process.argv[2] ?? "/private/tmp/school-clerk-email-concepts";
const schoolName = "Greenfield Academy";
const dashboard = "https://dashboard.greenfield.school-clerk.com";

function notification(
	type: Parameters<typeof createNotificationFromType>[0],
	payload: unknown,
) {
	const email = createNotificationFromType(type, payload).emailTemplate;
	if (!email) throw new Error(`${type} does not have an email template.`);
	return email.content;
}

const catalog = {
	"01-password-reset": PasswordResetEmail({
		name: "Adaeze Nwosu",
		staffRole: "Class Teacher",
		schoolName,
		url: `${dashboard}/reset-password/sample-token`,
	}),
	"02-signup-verification": SignupVerificationEmail({
		schoolName,
		verificationUrl: `${dashboard}/verify-email?token=sample-token`,
	}),
	"03-workspace-ready": WorkspaceReadyEmail({
		onboardingUrl: `${dashboard}/onboarding/welcome`,
		schoolName,
		siteUrl: "https://greenfield.school-clerk.com",
		workspaceUrl: dashboard,
	}),
	"04-staff-invitation": StaffInvitationEmail({
		ctaHref: `${dashboard}/reset-password/invite-token`,
		inviteeName: "Adaeze Nwosu",
		inviterName: "Principal Ibrahim",
		roleLabel: "Class Teacher",
		schoolName,
	}),
	"05-admission-submission": AdmissionSubmissionEmail({
		applicationReference: "AMR-0248",
		classroomName: "Junior Secondary 1",
		ctaHref: "https://greenfield.school-clerk.com/enroll/AMR-0248",
		documentCount: 3,
		parentName: "Chioma",
		schoolName,
		studentName: "Amara Okafor",
	}),
	"06-admission-approval": AdmissionApprovalEmail({
		admissionLetterUrl: `${dashboard}/admissions/AMR-0248/letter`,
		classroomName: "Junior Secondary 1",
		parentName: "Chioma",
		paymentAmount: "₦125,000",
		paymentDueAt: "5 September 2026",
		paymentInstructions:
			"Pay online or use the bank instructions in the admission letter. Your place is held until the due date.",
		paymentLabel: "Acceptance fee",
		paymentLink: `${dashboard}/admissions/AMR-0248/payment`,
		paymentRequired: true,
		schoolName,
		studentName: "Amara Okafor",
	}),
	"07-student-payment-received": notification("student_payment_received", {
		actorName: "Bola Ahmed",
		amount: "₦125,000",
		link: `${dashboard}/finance/transactions`,
		paymentMethod: "Bank transfer",
		schoolName,
		studentName: "Amara Okafor",
	}),
	"08-student-payment-cancelled": notification("student_payment_cancelled", {
		actorName: "Bola Ahmed",
		amount: "₦125,000",
		link: `${dashboard}/finance/transactions`,
		schoolName,
		studentName: "Amara Okafor",
	}),
	"09-service-payment-recorded": notification("service_payment_recorded", {
		actorName: "Bola Ahmed",
		amount: "₦85,000",
		expenseTitle: "Generator maintenance",
		link: `${dashboard}/finance/payments`,
		schoolName,
	}),
	"10-service-payment-cancelled": notification("service_payment_cancelled", {
		actorName: "Bola Ahmed",
		amount: "₦85,000",
		expenseTitle: "Generator maintenance",
		link: `${dashboard}/finance/payments`,
		schoolName,
	}),
	"11-payroll-payment-recorded": notification("payroll_payment_recorded", {
		actorName: "Bola Ahmed",
		amount: "₦180,000",
		link: `${dashboard}/staff/payroll`,
		schoolName,
		staffName: "Adaeze Nwosu",
	}),
	"12-payroll-payment-cancelled": notification("payroll_payment_cancelled", {
		actorName: "Bola Ahmed",
		amount: "₦180,000",
		link: `${dashboard}/staff/payroll`,
		schoolName,
		staffName: "Adaeze Nwosu",
	}),
	"13-assessment-link-requested": notification(
		"assessment_public_link_requested",
		{
			link: `${dashboard}/assessment-recording`,
			reason: "External examiner entry",
			requesterName: "Adaeze Nwosu",
			schoolName,
			scopeLabel: "JSS 1 Mathematics",
		},
	),
	"14-assessment-link-approved": notification(
		"assessment_public_link_approved",
		{
			actorName: "Principal Ibrahim",
			expiresAt: "5 September 2026",
			link: "https://greenfield.school-clerk.com/assessment/sample",
			requesterName: "Adaeze Nwosu",
			schoolName,
			scopeLabel: "JSS 1 Mathematics",
		},
	),
	"15-assessment-link-rejected": notification(
		"assessment_public_link_rejected",
		{
			actorName: "Principal Ibrahim",
			link: `${dashboard}/assessment-recording`,
			note: "Confirm the examiner's dates before requesting another link.",
			requesterName: "Adaeze Nwosu",
			schoolName,
			scopeLabel: "JSS 1 Mathematics",
		},
	),
};

await Promise.all(
	Object.entries(catalog).map(async ([name, content]) => {
		await Bun.write(
			`${outputDir}/implemented-${name}.html`,
			await render(content),
		);
	}),
);

const links = Object.keys(catalog)
	.map(
		(name) =>
			`<li><a href="implemented-${name}.html">${name.replace(/^\\d+-/, "").replaceAll("-", " ")}</a></li>`,
	)
	.join("");

await Bun.write(
	`${outputDir}/implemented-index.html`,
	`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>School Clerk email catalog</title><style>body{margin:0;padding:32px;background:#ebe7dd;color:#17263d;font-family:Arial,sans-serif}main{max-width:760px;margin:auto;background:#fffdf8;border:1px solid #d9d1bf;padding:36px}h1{font:400 36px/1.1 Georgia,serif}li{border-top:1px solid #d9d1bf;list-style:none}ul{padding:0}a{display:block;padding:14px 0;color:#17263d;text-transform:capitalize;text-decoration:none;font-weight:700}</style></head><body><main><p>School Clerk · Clerk Ledger</p><h1>All 15 active email messages</h1><ul>${links}</ul></main></body></html>`,
);
