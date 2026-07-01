import * as React from "react";
import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

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
	const title = `${studentName}'s admission was approved`;
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider preview={<Preview>{title}</Preview>}>
			<Body style={body}>
				<Container
					className={`my-[40px] mx-auto p-[32px] max-w-[560px] ${themeClasses.container}`}
					style={{
						...container,
						borderColor: lightStyles.container.borderColor,
					}}
				>
					<Logo />
					<Section className="mt-[18px] mb-[12px]">
						<Text className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#7c5f10]">
							Admission approved
						</Text>
					</Section>
					<Heading
						className={`mx-0 my-[16px] text-[28px] leading-[34px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						{title}
					</Heading>
					<Text
						className={`text-[15px] leading-[24px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						Hello {parentName || "there"},
					</Text>
					<Text
						className={`text-[15px] leading-[24px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						{schoolName} has approved {studentName}&apos;s admission into{" "}
						{classroomName}. Please review the next steps below.
					</Text>
					{paymentRequired ? (
						<Section style={metaCard} className="email-border">
							<Text style={metaItem} className={themeClasses.text}>
								<strong>Payment:</strong> {paymentLabel || "Admission payment"}
							</Text>
							{paymentAmount ? (
								<Text style={metaItem} className={themeClasses.text}>
									<strong>Amount:</strong> {paymentAmount}
								</Text>
							) : null}
							{paymentDueAt ? (
								<Text style={metaItem} className={themeClasses.text}>
									<strong>Due date:</strong> {paymentDueAt}
								</Text>
							) : null}
							{paymentInstructions ? (
								<Text style={metaItem} className={themeClasses.text}>
									<strong>Instructions:</strong> {paymentInstructions}
								</Text>
							) : null}
						</Section>
					) : (
						<Text
							className={`text-[15px] leading-[24px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							No admission payment is required before the next step.
						</Text>
					)}
					{paymentLink ? (
						<Section className="mb-[12px] mt-[24px] text-center">
							<Button href={paymentLink}>Open payment link</Button>
						</Section>
					) : null}
					{admissionLetterUrl ? (
						<Section className="mb-[12px] mt-[12px] text-center">
							<Button href={admissionLetterUrl}>Download admission letter</Button>
						</Section>
					) : null}
					<Text
						className={`mt-[28px] text-[12px] leading-[18px] ${themeClasses.secondaryText}`}
						style={{ color: lightStyles.secondaryText.color }}
					>
						This admission notice was sent by {schoolName} via School Clerk.
					</Text>
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

const body = {
	backgroundColor: "#f5f4ef",
	fontFamily: "Arial, sans-serif",
	margin: 0,
	padding: "24px 0",
};

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #e7e5dd",
	borderRadius: "16px",
	margin: "0 auto",
	maxWidth: "560px",
	padding: "32px",
};

const metaCard = {
	backgroundColor: "#fafaf9",
	border: "1px solid #ece8df",
	borderRadius: "14px",
	margin: "20px 0",
	padding: "16px 20px",
};

const metaItem = {
	color: "#3f3f46",
	fontSize: "14px",
	lineHeight: "22px",
	margin: "0 0 6px",
};
