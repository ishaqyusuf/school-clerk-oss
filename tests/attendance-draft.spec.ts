import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

let fixtureDirectory: string;

test.use({ launchOptions: { channel: "chrome" } });
test.beforeAll(() => {
	fixtureDirectory = mkdtempSync(join(tmpdir(), "attendance-draft-"));
	execFileSync("bun", [
		"tests/fixtures/attendance-draft/build.ts",
		fixtureDirectory,
	]);
});
test.afterAll(() => rmSync(fixtureDirectory, { recursive: true, force: true }));

for (const width of [390, 1280]) {
	test(`attendance survives student registration at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 844 });
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.goto(
			pathToFileURL(join(fixtureDirectory, "index.html")).toString(),
		);
		await page.getByRole("combobox").first().click();
		await page
			.getByRole("option", { name: "Subject attendance", exact: true })
			.click();
		await page.getByRole("combobox").nth(1).click();
		await page
			.getByRole("option", { name: "Mathematics", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Previous attendance date" })
			.click();
		const attendanceDate = await page
			.getByRole("button", { name: "Attendance date", exact: true })
			.innerText();

		const first = page.getByRole("group", {
			name: "Attendance status for Student 01",
		});
		const second = page.getByRole("group", {
			name: "Attendance status for Student 02",
		});
		await first.getByRole("radio", { name: "Present", exact: true }).click();
		await second.getByRole("radio", { name: "Late", exact: true }).click();
		await page.getByLabel("Remarks for Student 02").fill("Bus delay");
		await page.getByLabel("Session title").fill("Unsaved morning register");
		await page.getByLabel(/Period or time/).fill("Period 2");

		await page
			.getByRole("button", { name: "Add student", exact: true })
			.click();
		if (width < 1024)
			await expect(page.getByLabel("Session title")).toHaveCount(0);
		await page.getByRole("button", { name: "Cancel registration" }).click();
		await expect(page.getByLabel("Session title")).toHaveValue(
			"Unsaved morning register",
		);
		await expect(page.getByLabel("Remarks for Student 02")).toHaveValue(
			"Bus delay",
		);
		await expect(
			page.getByRole("button", { name: "Attendance date", exact: true }),
		).toHaveText(attendanceDate);
		await expect(page.getByRole("combobox").nth(1)).toHaveText("Mathematics");
		await expect(
			first.getByRole("radio", { name: "Present", exact: true }),
		).toHaveAttribute("data-state", "on");

		await page
			.getByRole("button", { name: "Add student", exact: true })
			.click();
		await page.getByRole("button", { name: "Complete registration" }).click();
		await expect(page.getByLabel("Session title")).toHaveValue(
			"Unsaved morning register",
		);
		await expect(page.getByLabel(/Period or time/)).toHaveValue("Period 2");
		await expect(page.getByLabel("Remarks for Student 02")).toHaveValue(
			"Bus delay",
		);
		const added = page.getByRole("group", {
			name: "Attendance status for New Student",
		});
		await expect(added).toBeVisible();
		await expect(added.locator('[data-state="on"]')).toHaveCount(0);

		await page
			.getByRole("button", { name: "Save attendance", exact: true })
			.click();
		await expect(first.locator('[data-state="on"]')).toHaveCount(0);
		await page.getByRole("button", { name: "Inspect submission" }).click();
		const payload = JSON.parse(await page.locator("#payload").innerText())[0];
		expect(payload.attendanceTitle).toBe("Unsaved morning register");
		expect(payload.periodLabel).toBe("Period 2");
		expect(payload.scope).toBe("SUBJECT");
		expect(payload.departmentSubjectId).toBe("math");
		expect(payload.students).toEqual([
			{ studentTermFormId: "form-0", status: "PRESENT" },
			{ studentTermFormId: "form-1", status: "LATE", comment: "Bus delay" },
		]);

		await page.getByLabel("Session title").fill("Class A draft");
		await first.getByRole("radio", { name: "Absent", exact: true }).click();
		await page.getByRole("button", { name: "Switch classroom" }).click();
		await expect(page.getByLabel("Session title")).toHaveValue(
			"Daily attendance",
		);
		await expect(first.locator('[data-state="on"]')).toHaveCount(0);
		await page.getByLabel("Session title").fill("Term A draft");
		await page.getByRole("button", { name: "Switch term" }).click();
		await expect(page.getByLabel("Session title")).toHaveValue(
			"Daily attendance",
		);
		await page.getByLabel("Session title").fill("Closed workspace draft");
		await page.getByRole("button", { name: "Close classroom" }).click();
		await page.getByRole("button", { name: "Reopen classroom" }).click();
		await expect(page.getByLabel("Session title")).toHaveValue(
			"Daily attendance",
		);
		expect(errors).toEqual([]);
	});
}
