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

export type StaffInvitationEmailProps = {
	ctaHref?: string | null;
	inviteeName: string;
	inviterName?: string | null;
	roleLabel: string;
	schoolName: string;
};

export function StaffInvitationEmail({
	ctaHref,
	inviteeName,
	inviterName,
	roleLabel,
	schoolName,
}: StaffInvitationEmailProps) {
	const title = `You're invited to join ${schoolName}`;
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
							Staff invitation
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
						Hello {inviteeName || "there"},
					</Text>
					<Text
						className={`text-[15px] leading-[24px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						You&apos;ve been invited to join {schoolName} as {roleLabel}.
					</Text>
					{inviterName ? (
						<Text
							className={`text-[15px] leading-[24px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							{inviterName} sent this invitation.
						</Text>
					) : null}
					{ctaHref ? (
						<Section className="mb-[12px] mt-[24px] text-center">
							<Button href={ctaHref}>
								Set password and continue
							</Button>
						</Section>
					) : null}
					<Text
						className={`mt-[28px] text-[12px] leading-[18px] ${themeClasses.secondaryText}`}
						style={{ color: lightStyles.secondaryText.color }}
					>
						This invitation was sent by {schoolName} via School Clerk.
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
