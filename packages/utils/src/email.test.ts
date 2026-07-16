import { describe, expect, test } from "bun:test";

import { formatTenantEmailSubject } from "./email";

describe("formatTenantEmailSubject", () => {
  test("prefixes tenant email subjects with the school name", () => {
    expect(
      formatTenantEmailSubject({
        message: "verify your account",
        schoolName: "Crestview Academy",
      }),
    ).toBe("Crestview Academy: verify your account");
  });

  test("sanitizes school names and subject copy", () => {
    expect(
      formatTenantEmailSubject({
        message: " set or\nreset your   password ",
        schoolName: ' Crestview\n"Academy" <tag> ',
      }),
    ).toBe("Crestview 'Academy' tag: set or reset your password");
  });

  test("uses a non-platform fallback when the school name is unavailable", () => {
    expect(
      formatTenantEmailSubject({
        message: "set or reset your password",
        schoolName: null,
      }),
    ).toBe("your school: set or reset your password");
  });
});
