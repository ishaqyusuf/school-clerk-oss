import type { Metadata } from "next";

export function constructMetadata({
	title = `${process.env.NEXT_PUBLIC_APP_NAME} | School Operations Platform`,
	description = `${process.env.NEXT_PUBLIC_APP_NAME} helps schools manage academics, finance, staff, and student records in one workspace.`,
	image = "https://assets.gndprodesk.com/thumbnail.png",
	icons = [
		{
			rel: "apple-touch-icon",
			sizes: "128x128",
			url: "/favicon.png",
		},
		{
			rel: "icon",
			type: "image/png",
			sizes: "128x128",
			url: "/favicon.png",
		},
	],
	noIndex = false,
	metadataBase,
}: {
	title?: string;
	description?: string;
	image?: string | null;
	icons?: Metadata["icons"];
	noIndex?: boolean;
	metadataBase?: string | URL | null;
} = {}): Metadata {
	const resolvedMetadataBase =
		metadataBase ??
		(process.env.NEXT_PUBLIC_APP_URL
			? new URL(
					`http${process.env.NODE_ENV === "production" ? "s" : ""}://${process.env.NEXT_PUBLIC_APP_URL}`,
				)
			: undefined);

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			...(image
				? {
						images: [
							{
								url: image,
							},
						],
					}
				: {}),
		},
		twitter: {
			title,
			description,
			...(image
				? {
						card: "summary_large_image",
						images: [image],
					}
				: {}),
			creator: "@ishaaq_yusuf",
		},
		icons,
		metadataBase: resolvedMetadataBase,
		...(noIndex
			? {
					robots: {
						index: false,
						follow: false,
					},
				}
			: {}),
	};
}
