import { describe, expect, test } from "bun:test";
import {
  buildTenantAppUrl,
  buildTenantHref,
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
  toInternalTenantPath,
  type TenantUrlConfig,
} from ".";

const config: TenantUrlConfig = {
  appRootDomain: "school-clerk.localhost",
  pathStyleHosts: ["localhost", "127.0.0.1"],
  reservedPaths: ["sign-up"],
};

const prefixedAppConfig: TenantUrlConfig = {
  ...config,
  internalPrefix: "/app",
};

describe("resolveTenantUrlContext", () => {
  test("resolves portless subdomain style", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "daarulhadith.school-clerk.localhost",
        pathname: "/finance",
        protocol: "http",
      },
      config,
    );

    expect(ctx.style).toBe("subdomain");
    expect(ctx.tenantSlug).toBe("daarulhadith");
    expect(ctx.productPath).toBe("/finance");
    expect(ctx.internalPath).toBe("/daarulhadith/finance");
  });

  test("resolves localhost path style", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/daarulhadith/finance",
      },
      config,
    );

    expect(ctx.style).toBe("path");
    expect(ctx.tenantSlug).toBe("daarulhadith");
    expect(ctx.productPath).toBe("/finance");
    expect(ctx.internalPath).toBe("/daarulhadith/finance");
  });

  test("ignores localhost path style when disabled", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/daarulhadith/finance",
      },
      {
        ...config,
        enablePathStyleHosts: false,
      },
    );

    expect(ctx.style).toBe("root");
    expect(ctx.tenantSlug).toBeNull();
    expect(ctx.productPath).toBe("/daarulhadith/finance");
  });

  test("resolves subdomain style when path style is disabled", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "daarulhadith.school-clerk.localhost",
        pathname: "/finance",
      },
      {
        ...config,
        enablePathStyleHosts: false,
      },
    );

    expect(ctx.style).toBe("subdomain");
    expect(ctx.tenantSlug).toBe("daarulhadith");
    expect(ctx.internalPath).toBe("/daarulhadith/finance");
  });

  test("resolves LAN IP path style", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "10.152.136.73:2200",
        pathname: "/daarulhadith/finance",
      },
      config,
    );

    expect(ctx.style).toBe("path");
    expect(ctx.tenantSlug).toBe("daarulhadith");
    expect(ctx.internalPath).toBe("/daarulhadith/finance");
  });

  test("keeps explicit internal prefixes working when configured", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/app/daarulhadith/finance",
      },
      prefixedAppConfig,
    );

    expect(ctx.style).toBe("path");
    expect(ctx.tenantSlug).toBe("daarulhadith");
    expect(ctx.productPath).toBe("/finance");
  });

  test("leaves reserved paths at root", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/sign-up",
      },
      config,
    );

    expect(ctx.tenantSlug).toBeNull();
    expect(ctx.style).toBe("root");
  });

  test("returns custom domain lookup host", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "school.example.com",
        pathname: "/finance",
      },
      config,
    );

    expect(ctx.style).toBe("custom-domain");
    expect(ctx.customDomainLookupHost).toBe("school.example.com");
  });
});

describe("buildTenantHref", () => {
  test("keeps product links root-relative for subdomain style", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "daarulhadith.school-clerk.localhost",
        pathname: "/dashboard",
      },
      config,
    );

    expect(buildTenantHref(ctx, "/finance?tab=all#top")).toBe(
      "/finance?tab=all#top",
    );
  });

  test("prefixes product links for path style", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "10.152.136.73:2200",
        pathname: "/daarulhadith/dashboard",
      },
      config,
    );

    expect(buildTenantHref(ctx, "/finance?tab=all#top")).toBe(
      "/daarulhadith/finance?tab=all#top",
    );
  });

  test("leaves absolute external URLs untouched", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/daarulhadith/dashboard",
      },
      config,
    );

    expect(buildTenantHref(ctx, "https://example.com/path")).toBe(
      "https://example.com/path",
    );
  });

  test("normalizes explicitly prefixed internal hrefs into visible path style", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/daarulhadith/dashboard",
      },
      config,
    );

    expect(
      buildTenantHref(ctx, "/app/daarulhadith/finance", prefixedAppConfig),
    ).toBe("/daarulhadith/finance");
  });

  test("does not double-prefix already visible path-style hrefs", () => {
    const ctx = resolveTenantUrlContext(
      {
        host: "localhost:2200",
        pathname: "/daarulhadith/students/1",
      },
      config,
    );

    expect(buildTenantHref(ctx, "/daarulhadith/students/2")).toBe(
      "/daarulhadith/students/2",
    );
  });
});

describe("generic package defaults", () => {
  test("does not bake a dashboard prefix into internal tenant paths", () => {
    expect(
      toInternalTenantPath({ tenantSlug: "daarulhadith" }, "/finance"),
    ).toBe("/daarulhadith/finance");
  });

  test("builds configurable project-scoped header names", () => {
    expect(getTenantUrlHeaderNames({ projectSlug: "school-clerk" })).toEqual({
      domain: "x-school-clerk-domain",
      pathname: "x-school-clerk-pathname",
      urlStyle: "x-school-clerk-url-style",
      externalBasePath: "x-school-clerk-external-base-path",
      externalPath: "x-school-clerk-external-path",
      accountId: "x-school-clerk-saas-account-id",
    });
  });
});

describe("buildTenantAppUrl", () => {
  test("builds localhost path-style target URLs", () => {
    expect(
      buildTenantAppUrl({
        tenantSlug: "daarulhadith",
        path: "/login",
        currentHost: "localhost:3000",
        targetRootDomain: "school-clerk.localhost",
        targetPort: 2200,
      }),
    ).toBe("http://localhost:2200/daarulhadith/login");
  });

  test("builds LAN IP path-style target URLs", () => {
    expect(
      buildTenantAppUrl({
        tenantSlug: "daarulhadith",
        path: "/login",
        currentHost: "10.152.136.73:3000",
        targetRootDomain: "school-clerk.localhost",
        targetPort: 2200,
      }),
    ).toBe("http://10.152.136.73:2200/daarulhadith/login");
  });

  test("builds subdomain target URLs from portless-style browsing", () => {
    expect(
      buildTenantAppUrl({
        tenantSlug: "daarulhadith",
        path: "/login",
        currentHost: "school-clerk.localhost",
        currentProtocol: "https",
        targetRootDomain: "school-clerk.localhost",
        targetPort: 2200,
      }),
    ).toBe("http://daarulhadith.school-clerk.localhost/login");
  });

  test("builds subdomain target URLs when path-style is disabled", () => {
    expect(
      buildTenantAppUrl({
        tenantSlug: "daarulhadith",
        path: "/login",
        currentHost: "localhost:3000",
        targetRootDomain: "school-clerk.localhost",
        targetPort: 2200,
        enablePathStyleHosts: false,
      }),
    ).toBe("http://daarulhadith.school-clerk.localhost/login");
  });

  test("builds clean root URLs for public-site shortcuts", () => {
    expect(
      buildTenantAppUrl({
        tenantSlug: "daarulhadith",
        path: "/",
        currentHost: "localhost:3000",
        targetRootDomain: "localhost:3001",
        targetPort: 3001,
      }),
    ).toBe("http://localhost:3001/daarulhadith");

    expect(
      buildTenantAppUrl({
        tenantSlug: "daarulhadith",
        path: "/",
        currentHost: "school-clerk.localhost",
        targetRootDomain: "localhost:3001",
      }),
    ).toBe("http://daarulhadith.localhost:3001");
  });
});
