import { expect, test } from "bun:test";
import { studentSuggestionsSchema } from "./student-suggestions";

test("bounds suggestion inputs and rejects empty searches and malformed cursors", () => {
	expect(studentSuggestionsSchema.safeParse({ name: " " }).success).toBe(false);
	expect(studentSuggestionsSchema.safeParse({ name: "A" }).success).toBe(false);
	expect(
		studentSuggestionsSchema.safeParse({ surname: "Bello", cursor: "3:0" })
			.success,
	).toBe(false);
	expect(
		studentSuggestionsSchema.safeParse({ name: "Ahmad", pageSize: 100 })
			.success,
	).toBe(false);
	expect(
		studentSuggestionsSchema.parse({ surname: " Bello ", cursor: "2:5" }),
	).toMatchObject({ name: "", surname: "Bello", otherName: "", pageSize: 5 });
});
