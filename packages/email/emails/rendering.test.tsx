import { describe, expect, it } from "bun:test";
import { render } from "../render";
import { AdmissionApprovalEmail } from "./admission-approval";
import { AdmissionSubmissionEmail } from "./admission-submission";
import { FinanceNotificationEmail } from "./finance-notification";
import { PasswordResetEmail } from "./password-reset";
import { SignupVerificationEmail } from "./signup-verification";
import { StaffInvitationEmail } from "./staff-invitation";
import { WorkspaceReadyEmail } from "./workspace-ready";

const schoolName = "Greenfield Academy";

const layouts = [
	{
		content: AdmissionApprovalEmail({
			admissionLetterUrl: "https://example.com/letter",
			classroomName: "Junior Secondary 1",
			parentName: "Chioma",
			paymentAmount: "₦125,000",
			paymentDueAt: "5 September 2026",
			paymentInstructions: "Pay before the due date.",
			paymentLabel: "Acceptance fee",
			paymentLink: "https://example.com/payment",
			paymentRequired: true,
			schoolName,
			studentName: "Amara Okafor",
		}),
		label: "Admission approved",
	},
	{
		content: AdmissionSubmissionEmail({
			applicationReference: "AMR-0248",
			classroomName: "Junior Secondary 1",
			ctaHref: "https://example.com/application",
			documentCount: 3,
			parentName: "Chioma",
			schoolName,
			studentName: "Amara Okafor",
		}),
		label: "Application received",
	},
	{
		content: StaffInvitationEmail({
			ctaHref: "https://example.com/invite",
			inviteeName: "Adaeze Nwosu",
			inviterName: "Principal Ibrahim",
			roleLabel: "Class Teacher",
			schoolName,
		}),
		label: "Staff invitation",
	},
	{
		content: FinanceNotificationEmail({
			amount: "₦125,000",
			ctaHref: "https://example.com/finance",
			eventLabel: "Student payment received",
			message: `${schoolName} recorded a student payment.`,
			metadata: [{ label: "Student", value: "Amara Okafor" }],
			schoolName,
			title: "Payment received from Amara Okafor",
		}),
		label: "Student payment received",
	},
	{
		content: PasswordResetEmail({
			name: "Adaeze Nwosu",
			staffRole: "Class Teacher",
			schoolName,
			url: "https://example.com/reset",
		}),
		label: "Password access",
	},
	{
		content: SignupVerificationEmail({
			schoolName,
			verificationUrl: "https://example.com/verify",
		}),
		label: "Email verification",
	},
	{
		content: WorkspaceReadyEmail({
			onboardingUrl: "https://example.com/onboarding",
			schoolName,
			siteUrl: "https://greenfield.example.com",
			workspaceUrl: "https://dashboard.greenfield.example.com",
		}),
		label: "Workspace ready",
	},
];

describe("Clerk Ledger email layouts", () => {
	for (const layout of layouts) {
		it(`renders ${layout.label}`, async () => {
			const html = await render(layout.content);

			expect(html).toContain(schoolName);
			expect(html).toContain(layout.label);
			expect(html).toContain("Clear records. Confident school decisions.");
			expect(html).toContain("#17263d");
			expect(html).not.toContain("undefined");
			expect(html).not.toContain("gnd-prodesk.vercel.app");
			expect(html).not.toContain("localhost:3000");
		});
	}

	it("renders action buttons with explicit email-safe padding", async () => {
		const html = await render(
			PasswordResetEmail({
				name: "Adaeze Nwosu",
				schoolName,
				url: "https://example.com/reset",
			}),
		);

		expect(html).toContain("padding:13px 19px");
	});

	it("renders the no-payment admission branch", async () => {
		const html = await render(
			AdmissionApprovalEmail({
				classroomName: "Junior Secondary 1",
				parentName: "Chioma",
				paymentRequired: false,
				schoolName,
				studentName: "Amara Okafor",
			}),
		);

		expect(html).toContain("Admission payment");
		expect(html).toContain("Not required");
	});
});
