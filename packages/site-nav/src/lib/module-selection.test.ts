import { describe, expect, test } from "bun:test";
import type { ResolvedNavModule } from "@school-clerk/navigation";

import { resolveSelectedModule } from "./module-selection";

const overview = {
	defaultHref: "/",
	icon: "school",
	key: "overview",
	sections: [],
	title: "Overview",
	workspace: "admin",
} satisfies ResolvedNavModule;

const people = {
	defaultHref: "/students/list",
	icon: "users",
	key: "people",
	sections: [],
	title: "People",
	workspace: "people",
} satisfies ResolvedNavModule;

describe("resolveSelectedModule", () => {
	test("keeps an explicit selection ahead of the route module", () => {
		expect(
			resolveSelectedModule([overview, people], "people", "overview")?.key,
		).toBe("people");
	});

	test("uses the active route module when no valid selection exists", () => {
		expect(
			resolveSelectedModule([overview, people], "finance", "people")?.key,
		).toBe("people");
	});

	test("falls back to the first permitted module", () => {
		expect(resolveSelectedModule([overview, people], null, null)?.key).toBe(
			"overview",
		);
	});
});
