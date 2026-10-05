import { NextResponse } from "next/server";

import { getSignupDomainCollision, hasSignupDomainTable, prisma } from "@school-clerk/db";

import {
  getInstitutionType,
  isInstitutionTypeEnabled,
} from "@/features/signup/institution-types";
import { getSignupPreviewSuffix } from "@/features/signup/tenant-urls";

const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "dashboard",
  "demo",
  "docs",
  "help",
  "login",
  "school-clerk",
  "school-clerk-dashboard",
  "sign-in",
  "sign-up",
  "staff",
  "support",
  "www",
]);

function isValidSubdomain(value: string) {
  return value.length >= 2 && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawValue = searchParams.get("value") ?? "";
  const institutionTypeId = searchParams.get("institutionType");
  const value = rawValue.trim().toLowerCase();

  const institutionType = getInstitutionType(institutionTypeId);

  if (!value) {
    return NextResponse.json({
      available: false,
      hostSuffix: getSignupPreviewSuffix(),
      reason: "Subdomain is required.",
    });
  }

  if (!isValidSubdomain(value)) {
    return NextResponse.json({
      available: false,
      hostSuffix: getSignupPreviewSuffix(),
      reason: "Use only letters, numbers, and hyphens.",
    });
  }

  if (RESERVED_SUBDOMAINS.has(value)) {
    return NextResponse.json({
      available: false,
      hostSuffix: getSignupPreviewSuffix(),
      reason: "That subdomain is reserved.",
    });
  }

  if (!institutionType || !isInstitutionTypeEnabled(institutionType.id)) {
    return NextResponse.json({
      available: false,
      hostSuffix: getSignupPreviewSuffix(),
      reason: institutionType ? `${institutionType.label} is not enabled for self-serve signup yet.` : "Choose a released institution type.",
    });
  }

  const existing = await getSignupDomainCollision(prisma, {
    domainName: value, domainTableAvailable: await hasSignupDomainTable(prisma),
  });

  return NextResponse.json({
    available: !existing,
    hostSuffix: getSignupPreviewSuffix(),
    reason: existing ? "That subdomain is already taken." : null,
  });
}
