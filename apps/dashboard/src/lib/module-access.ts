import "server-only";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getSession } from "@/auth/server";
import { getModuleAccessActor, getSchoolModuleConfiguration, prisma } from "@school-clerk/db";
import { assertModuleAccess, ModuleAccessDeniedError, resolveModuleAccess, type ModuleId } from "@school-clerk/utils/module-config";

export class DashboardAccessError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = "DashboardAccessError";
  }
}

// An unsigned workspace cookie chooses context; it never proves identity,
// account ownership, role, or module entitlement.
export async function requireDashboardSchoolContext(roles?: readonly string[]) {
  const [profile, session] = await Promise.all([getAuthCookie(), getSession()]);
  if (!session?.user.id || !profile.schoolId || profile.auth?.userId !== session.user.id) {
    throw new DashboardAccessError(401, "A signed-in school context is required.");
  }
  const user = await getModuleAccessActor(prisma, session.user.id, session.session.id);
  if (!user?.saasAccountId) {
    throw new DashboardAccessError(403, "School account membership is required.");
  }
  if (roles && !roles.some((role) => role.toLowerCase() === user.role?.toLowerCase())) {
    throw new DashboardAccessError(403, "This operation is not available for your role.");
  }
  const school = await getSchoolModuleConfiguration(prisma, {
    schoolId: profile.schoolId, accountId: user.saasAccountId,
  });
  if (!school) throw new DashboardAccessError(403, "The selected school is unavailable in this account.");
  return {
    authSessionId: session.session.id,
    profile: { ...profile, schoolId: school.id },
    user: { ...user, saasAccountId: user.saasAccountId },
    moduleConfiguration: school.moduleConfiguration,
    access: resolveModuleAccess(school.moduleConfiguration),
  };
}

export async function requireDashboardModules(requiredModules: readonly ModuleId[], roles?: readonly string[]) {
  const context = await requireDashboardSchoolContext(roles);
  try {
    assertModuleAccess(context.moduleConfiguration, requiredModules);
  } catch (error) {
    if (error instanceof ModuleAccessDeniedError) throw new DashboardAccessError(403, error.message);
    throw error;
  }
  return context;
}

export function dashboardAccessErrorResponse(error: unknown) {
  if (error instanceof DashboardAccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  // Database/infrastructure failures must not become an allow fallback.
  throw error;
}
