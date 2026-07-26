// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SubjectCatalogMobileCard } from "./catalog-columns";

describe("SubjectCatalogMobileCard", () => {
  test("renders a compact singular class count", () => {
    const html = renderToStaticMarkup(
      createElement(SubjectCatalogMobileCard, {
        item: {
          classroomCount: 1,
          id: "subject-1",
          title: "Mathematics",
        },
      }),
    );

    expect(html).toContain("Mathematics");
    expect(html).toContain("1");
    expect(html).toContain("class");
    expect(html).not.toContain("classes");
  });

  test("renders plural class counts", () => {
    const html = renderToStaticMarkup(
      createElement(SubjectCatalogMobileCard, {
        item: {
          classroomCount: 3,
          id: "subject-2",
          title: "Arabic",
        },
      }),
    );

    expect(html).toContain("3");
    expect(html).toContain("classes");
  });
});
