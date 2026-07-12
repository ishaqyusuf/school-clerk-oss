// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { normalizeStudentImportError } from "./import-errors";

describe("normalizeStudentImportError", () => {
  test("turns HTML JSON parse failures into an operator-safe message", () => {
    const result = normalizeStudentImportError(
      "verification",
      new Error(`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`),
    );

    expect(result).toMatchObject({
      title: "Import needs attention",
      isTransportError: true,
    });
    expect(result?.message).toContain(
      "returned a page instead of a data response",
    );
    expect(result?.message).not.toContain("Unexpected token");
    expect(result?.diagnostics).toContain("Operation: verification");
    expect(result?.diagnostics.join(" ")).toContain("<!DOCTYPE");
  });

  test("includes safe HTTP status and content type diagnostics when available", () => {
    const result = normalizeStudentImportError("execution", {
      message: `Unexpected token '<', "<html>Login</html>" is not valid JSON`,
      data: {
        httpStatus: 502,
      },
      meta: {
        response: {
          headers: {
            get: (key: string) => (key === "content-type" ? "text/html" : null),
          },
        },
      },
    });

    expect(result?.diagnostics).toContain("Operation: execution");
    expect(result?.diagnostics).toContain("HTTP status: 502");
    expect(result?.diagnostics).toContain("Content type: text/html");
  });

  test("does not rewrite ordinary structured tRPC errors", () => {
    const result = normalizeStudentImportError("execution", {
      message: "Classroom not found for this school session.",
      data: {
        httpStatus: 400,
      },
    });

    expect(result).toMatchObject({
      isTransportError: false,
      message: "Classroom not found for this school session.",
    });
  });

  test("redacts sensitive values from diagnostics", () => {
    const result = normalizeStudentImportError("verification", {
      message: `Unexpected token '<', "<html>token=secret session=private Bearer abc.def</html>" is not valid JSON`,
      data: {
        httpStatus: 401,
      },
    });

    const diagnostics = result?.diagnostics.join(" ") ?? "";
    expect(diagnostics).not.toContain("secret");
    expect(diagnostics).not.toContain("private");
    expect(diagnostics).not.toContain("abc.def");
    expect(diagnostics).toContain("token=[redacted]");
    expect(diagnostics).toContain("session=[redacted]");
    expect(diagnostics).toContain("Bearer [redacted]");
  });
});
