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
	const title = `${schoolName} received ${studentName}'s application`;
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
							Admission application
						</Text>
					</Section>
					<Heading
						className={`mx-0 my-[16px] text-[28px] leading-[34px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Application received
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
						We received {studentName}&apos;s admission application for{" "}
						{classroomName}. The school will review the submitted details and
						documents, then contact you with the next step.
					</Text>
					<Section style={metaCard} className="email-border">
						<Text style={metaItem} className={themeClasses.text}>
							<strong>Application reference:</strong> {applicationReference}
						</Text>
						<Text style={metaItem} className={themeClasses.text}>
							<strong>Submitted documents:</strong> {documentCount}
						</Text>
					</Section>
					{ctaHref ? (
						<Section className="mb-[12px] mt-[24px] text-center">
							<Button href={ctaHref}>View submission status</Button>
						</Section>
					) : null}
					<Text
						className={`mt-[28px] text-[12px] leading-[18px] ${themeClasses.secondaryText}`}
						style={{ color: lightStyles.secondaryText.color }}
					>
						This confirmation was sent by {schoolName} via School Clerk.
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
