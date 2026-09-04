import { describe, expect, it } from "bun:test";
import { createNotificationFromType } from "../index";

const schoolName = "Greenfield Academy";

describe("tenant notification email subjects", () => {
	it("prefixes finance subjects with the tenant name", () => {
		const notification = createNotificationFromType(
			"student_payment_received",
			{
				amount: "₦125,000",
				schoolName,
				studentName: "Amara Okafor",
			},
		);

		expect(notification.emailTemplate?.subject).toBe(
			"Greenfield Academy: payment received from Amara Okafor",
		);
	});

	it("prefixes assessment subjects with the tenant name", () => {
		const notification = createNotificationFromType(
			"assessment_public_link_approved",
			{
				requesterName: "Adaeze Nwosu",
				schoolName,
				scopeLabel: "JSS 1 Mathematics",
			},
		);

		expect(notification.emailTemplate?.subject).toBe(
			"Greenfield Academy: your assessment link is ready",
		);
	});

	it("prefixes staff invitation subjects with the tenant name", () => {
		const notification = createNotificationFromType("staff_invitation", {
			recipientEmail: "adaeze@example.com",
			roleLabel: "Class Teacher",
			schoolName,
			staffId: "staff-1",
			staffName: "Adaeze Nwosu",
		});

		expect(notification.emailTemplate?.subject).toBe(
			"Greenfield Academy: you're invited to join as Class Teacher",
		);
	});
});
