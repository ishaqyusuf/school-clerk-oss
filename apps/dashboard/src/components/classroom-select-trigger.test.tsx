// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { Select, SelectValue } from "@school-clerk/ui/select";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassroomSelectTrigger } from "./classroom-select-trigger";

describe("ClassroomSelectTrigger", () => {
	test("shows a chevron beside the selected classroom", () => {
		const markup = renderToStaticMarkup(
			<Select defaultValue="classroom">
				<ClassroomSelectTrigger aria-label="Switch classroom">
					<SelectValue />
				</ClassroomSelectTrigger>
			</Select>,
		);

		expect(markup).toContain("lucide-chevron-down");
	});
});
