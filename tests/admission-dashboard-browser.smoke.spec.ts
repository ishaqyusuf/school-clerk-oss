import { expect, test } from "@playwright/test";

const dashboardBaseUrl = process.env.DASHBOARD_BASE_URL;
const adminEmail = process.env.DASHBOARD_ADMIN_EMAIL;
const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD ?? "lorem-ipsum";
const visibleLinkCode = process.env.SMOKE_VISIBLE_LINK_CODE;
const hiddenLinkCode = process.env.SMOKE_HIDDEN_LINK_CODE;
const schoolSiteBaseUrl = process.env.SCHOOL_SITE_BASE_URL;
const schoolId = process.env.SMOKE_SCHOOL_ID;
const sessionId = process.env.SMOKE_SESSION_ID;
const termId = process.env.SMOKE_TERM_ID;

function resolveSchoolSiteHref(href: string) {
  const target = new URL(href, schoolSiteBaseUrl);
  return new URL(`${target.pathname}${target.search}`, schoolSiteBaseUrl).toString();
}

test("dashboard admissions and document templates render seeded phase data", async ({
  page,
}) => {
  test.setTimeout(120_000);
  test.skip(!dashboardBaseUrl, "DASHBOARD_BASE_URL is required");
  test.skip(!adminEmail, "DASHBOARD_ADMIN_EMAIL is required");
  test.skip(!visibleLinkCode, "SMOKE_VISIBLE_LINK_CODE is required");
  test.skip(!hiddenLinkCode, "SMOKE_HIDDEN_LINK_CODE is required");
  test.skip(!schoolSiteBaseUrl, "SCHOOL_SITE_BASE_URL is required");
  test.skip(!schoolId, "SMOKE_SCHOOL_ID is required");
  test.skip(!sessionId, "SMOKE_SESSION_ID is required");
  test.skip(!termId, "SMOKE_TERM_ID is required");

  const dashboardUrl = new URL(dashboardBaseUrl!);
  const tenantSlug = dashboardUrl.hostname.split(".")[0];
  const signInResponse = await page.context().request.post(
    new URL("/api/auth/sign-in/email", dashboardBaseUrl).toString(),
    {
      data: {
        email: adminEmail,
        password: adminPassword,
        rememberMe: true,
      },
    },
  );
  expect(signInResponse.ok()).toBeTruthy();
  const signIn = await signInResponse.json();
  expect(signIn.token).toBeTruthy();
  expect(signIn.user?.id).toBeTruthy();

  await page.context().addCookies([
    {
      name: `${tenantSlug}-session-cookie`,
      url: dashboardBaseUrl,
      value: JSON.stringify({
        auth: {
          bearerToken: signIn.token,
          userId: signIn.user.id,
        },
        domain: tenantSlug,
        schoolId,
        sessionId,
        sessionTitle: "2026/2027",
        termId,
        termTitle: "First Term",
      }),
    },
  ]);

  await page.goto(new URL("/students/enrollment", dashboardBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.waitForURL(/\/students\/enrollment/, { timeout: 90_000 });

  await expect(
    page.getByRole("heading", { name: "Generate enrollment link" }),
  ).toBeVisible();
  await expect(page.getByText("Show on public website")).toBeVisible();
  await expect(page.getByText("2026 Admissions", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Manual admission link", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Website").first()).toBeVisible();
  await expect(page.getByText("Manual").first()).toBeVisible();
  await expect(page.getByText("Application review")).toBeVisible();
  await expect(page.getByText("Admission letter template").first()).toBeVisible();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await expect(page.getByText("Payment label").first()).toBeVisible();
  await expect(page.getByText("Payment instructions").first()).toBeVisible();
  await expect(page.locator('option[value^="custom-admission-"]').first()).toHaveText(
    "Smoke custom admission letter",
  );
  const openLetterHref = await page
    .getByRole("link", { name: "Open letter" })
    .first()
    .getAttribute("href");
  expect(openLetterHref).toBeTruthy();
  const openLetterResponse = await page
    .context()
    .request.get(resolveSchoolSiteHref(openLetterHref!));
  expect(openLetterResponse.ok()).toBeTruthy();
  expect(openLetterResponse.headers()["content-type"]).toContain("application/pdf");

  const downloadLetterHref = await page
    .getByRole("link", { name: "Download PDF" })
    .first()
    .getAttribute("href");
  expect(downloadLetterHref).toContain("download=true");
  const downloadLetterResponse = await page
    .context()
    .request.get(resolveSchoolSiteHref(downloadLetterHref!));
  expect(downloadLetterResponse.ok()).toBeTruthy();
  expect(downloadLetterResponse.headers()["content-type"]).toContain(
    "application/pdf",
  );

  const visibleEnrollmentUrl = new URL(`/enroll/${visibleLinkCode}`, schoolSiteBaseUrl);
  const hiddenEnrollmentUrl = new URL(`/enroll/${hiddenLinkCode}`, schoolSiteBaseUrl);

  await page.goto(new URL("/", schoolSiteBaseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: "Admission applications are open" }),
  ).toBeVisible();
  await expect(page.getByText("2026 Admissions", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Apply now" }).first(),
  ).toHaveAttribute("href", `/enroll/${visibleLinkCode}`);
  await expect(
    page.getByText("Manual admission link", { exact: true }),
  ).toHaveCount(0);

  await page.goto(new URL("/admissions", schoolSiteBaseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await expect(page.getByText("2026 Admissions", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Manual admission link", { exact: true }),
  ).toHaveCount(0);

  await page.goto(visibleEnrollmentUrl.toString(), { waitUntil: "networkidle" });
  await expect(page.getByText("2026 Admissions")).toBeVisible();
  await expect(
    page.getByText("Select a classroom to see its admission requirements."),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Classroom" }).selectOption({ index: 1 });
  await expect(page.getByText("Birth certificate *", { exact: true })).toBeVisible();
  await expect(page.getByText("Passport photo *", { exact: true })).toBeVisible();

  await page.goto(hiddenEnrollmentUrl.toString(), { waitUntil: "networkidle" });
  await expect(page.getByText("Manual admission link")).toBeVisible();
  await page.getByRole("combobox", { name: "Classroom" }).selectOption({ index: 1 });
  await page.getByLabel("Student first name").fill("Browser");
  await page.getByLabel("Student surname").fill("Smoke");
  await page.getByLabel("Other name").fill("Admission");
  await page.getByLabel("Date of birth").fill("2020-01-15");
  await page.getByLabel("Gender").selectOption("Female");
  await page.getByLabel("Primary parent name").fill("Browser Parent");
  await page.getByLabel("Relation").fill("Mother");
  await page
    .getByLabel("Email")
    .fill(`browser-parent-${Date.now()}@example.com`);
  await page.getByLabel("Primary phone").fill("+2348012345000");
  await page.getByLabel("Other information").fill("Submitted from browser smoke.");
  await Promise.all([
    page.waitForURL(/submitted=/, { timeout: 90_000 }),
    page.getByRole("button", { name: "Submit enrollment application" }).click(),
  ]);
  await expect(page.getByText("Application submitted")).toBeVisible();

  await page.goto(new URL("/students/enrollment", dashboardBaseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await page
    .locator('label:has-text("Amount") input:not([disabled])')
    .first()
    .fill("15000");
  await page
    .locator('label:has-text("Payment instructions") textarea:not([disabled])')
    .first()
    .fill("Pay at the bursary before resumption.");
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("enrollmentLinks.approveApplication"),
    ),
    page.getByRole("button", { name: "Approve admission" }).first().click(),
  ]);
  await expect(page.getByText("Approved").first()).toBeVisible();

  await page.goto(new URL("/settings/document-templates", dashboardBaseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await expect(page.getByText("Document Templates", { exact: true })).toBeVisible();
  await expect(page.getByText("Result sheet template")).toBeVisible();
  await expect(page.getByText("Smoke custom result").first()).toBeVisible();
  await expect(page.getByText("Request a custom template build")).toBeVisible();
  await expect(page.getByText("Custom template requests")).toBeVisible();
  await expect(page.getByText("JSON admission template preview")).toBeVisible();
});
