import { Img, Link, Section } from "@react-email/components";
import { getAppUrl } from "@school-clerk/utils/envs";

const baseUrl = getAppUrl();

export function LogoFooter() {
	return (
		<Section>
			<Link href={baseUrl}>
				<Img
					src={`${baseUrl}/logo.png`}
					width="110"
					alt="School Clerk"
					className="block"
				/>
			</Link>
		</Section>
	);
}
