"use client";
import { Streamdown, type Components } from "streamdown";

const components: Components = {
	img: () => null,
	a: ({ href, children }) => {
		if (
			!href?.startsWith("https://") &&
			!(href?.startsWith("/") && !href.startsWith("//"))
		)
			return <span>{children}</span>;
		return (
			<a href={href} rel="noreferrer" className="underline underline-offset-4">
				{children}
			</a>
		);
	},
};

export function AssistantAnswer({
	text,
	streaming,
}: { text: string; streaming: boolean }) {
	return (
		<div className="min-w-0 break-words text-sm leading-7 [&_table]:w-full [&_th]:border-b [&_th]:p-2 [&_td]:border-b [&_td]:p-2 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
			<Streamdown
				skipHtml
				controls={false}
				components={components}
				isAnimating={streaming}
			>
				{text}
			</Streamdown>
		</div>
	);
}
