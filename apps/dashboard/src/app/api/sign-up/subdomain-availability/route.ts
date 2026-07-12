import { NextResponse } from "next/server";

import { prisma } from "@school-clerk/db";

import {
  getInstitutionType,
  isInstitutionTypeEnabled,
} from "@/features/signup/institution-types";
import { getSignupPreviewSuffix } from "@/features/signup/tenant-urls";
import { isTenantDomainTableMissing } from "@/utils/tenant-domain-context";

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
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
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

  if (institutionType && !isInstitutionTypeEnabled(institutionType.id)) {
    return NextResponse.json({
      available: false,
      hostSuffix: getSignupPreviewSuffix(),
      reason: `${institutionType.label} is not enabled for self-serve signup yet.`,
    });
  }

  let existing: { id: string } | null = null;

  try {
    existing = await prisma.tenantDomain.findFirst({
      where: {
        deletedAt: null,
        OR: [{ subdomain: value }, { customDomain: value }],
      },
      select: { id: true },
    });
  } catch (error) {
    if (!isTenantDomainTableMissing(error)) {
      throw error;
    }

    existing = await prisma.schoolProfile.findFirst({
      where: {
        deletedAt: null,
        subDomain: value,
      },
      select: { id: true },
    });
  }

  return NextResponse.json({
    available: !existing,
    hostSuffix: getSignupPreviewSuffix(),
    reason: existing ? "That subdomain is already taken." : null,
  });
}
