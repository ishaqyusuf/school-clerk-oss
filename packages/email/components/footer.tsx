import { Hr, Link, Section, Text } from "@react-email/components";
import { getAppUrl } from "@school-clerk/utils/envs";
import { LogoFooter } from "./logo-footer";
import { getEmailInlineStyles, getEmailThemeClasses } from "./theme";

const baseUrl = getAppUrl();

export function Footer() {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<Section className="w-full">
			<Hr
				className={themeClasses.border}
				style={{ borderColor: lightStyles.container.borderColor }}
			/>

			<Text
				className={`font-serif text-[21px] font-normal mt-[32px] mb-[24px] ${themeClasses.text}`}
				style={{ color: lightStyles.text.color }}
			>
				Run your school operations with more clarity.
			</Text>

			<Text
				className={`text-[13px] leading-relaxed ${themeClasses.mutedText}`}
				style={{ color: lightStyles.mutedText.color }}
			>
				<Link
					href={baseUrl}
					className={themeClasses.mutedLink}
					style={{ color: lightStyles.mutedText.color }}
				>
					Dashboard
				</Link>
				{" · "}
				<Link
					href={`${baseUrl}/notifications`}
					className={themeClasses.mutedLink}
					style={{ color: lightStyles.mutedText.color }}
				>
					Notifications
				</Link>
			</Text>

			<Text
				className={`text-xs ${themeClasses.secondaryText}`}
				style={{ color: lightStyles.secondaryText.color }}
			>
				School Clerk · Tenant-aware school operations platform
			</Text>

			<br />

			<LogoFooter />
		</Section>
	);
}
