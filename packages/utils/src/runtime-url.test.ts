import { describe, expect, test } from "bun:test";

import { buildRuntimeAppUrl } from "./runtime-url";

describe("buildRuntimeAppUrl", () => {
  test("constructs portless local URLs without the configured app port", () => {
    const url = buildRuntimeAppUrl({
      config: {
        appPort: 2200,
        appRootDomain: "school-clerk.localhost",
        defaultProtocol: "https",
        portlessRootDomain: "school-clerk.localhost",
        productionRootDomain: "app.school-clerk.com",
      },
      currentHost: "school-clerk.localhost",
      currentProtocol: "https",
      path: "/sign-up",
    });

    expect(url).toBe("https://school-clerk.localhost/sign-up");
  });

  test("keeps the configured app port for bare localhost URLs", () => {
    const url = buildRuntimeAppUrl({
      config: {
        appPort: 2200,
        defaultProtocol: "http",
        portlessRootDomain: "school-clerk.localhost",
      },
      currentHost: "localhost",
      currentProtocol: "http",
      path: "/sign-up",
    });

    expect(url).toBe("http://localhost:2200/sign-up");
  });
});
