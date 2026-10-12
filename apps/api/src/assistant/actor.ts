import type { TRPCContext } from "../trpc/init";
import { getAuthSessionWhere } from "../trpc/init";
import {
	getModuleAccessActor,
	getSchoolModuleConfiguration,
} from "@school-clerk/db";
import {
	getAllowedCapabilities,
	getSchoolAiAvailableToolNames,
} from "@school-clerk/ai";
import {
	assertModuleAccess,
	resolveModuleAccess,
} from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";

export async function resolveAssistantActor(
	ctx: TRPCContext,
	settingsRecovery = false,
	db: Pick<
		TRPCContext["db"],
		| "user"
		| "session"
		| "schoolProfile"
		| "schoolModuleConfiguration"
		| "schoolAssistantConfig"
		| "schoolSession"
		| "sessionTerm"
	> = ctx.db,
) {
	const { schoolId, authSessionId } = ctx.profile;
	const userId = ctx.currentUser?.id;
	if (!schoolId || !authSessionId || !userId)
		throw new TRPCError({ code: "UNAUTHORIZED" });
	// Browser tRPC carries the bearer token; server routes carry the session ID.
	// Resolve both through the same live-session predicate before membership checks.
	const login = await db.session.findFirst({
		where: { ...getAuthSessionWhere(authSessionId), userId },
		select: { id: true },
	});
	if (!login) throw new TRPCError({ code: "UNAUTHORIZED" });
	const user = await getModuleAccessActor(db, userId, login.id);
	if (!user?.saasAccountId || user.role !== "Admin")
		throw new TRPCError({ code: "FORBIDDEN" });
	const school = await getSchoolModuleConfiguration(db, {
		schoolId,
		accountId: user.saasAccountId,
	});
	if (!school) throw new TRPCError({ code: "FORBIDDEN" });
	const access = resolveModuleAccess(school.moduleConfiguration);
	if (!settingsRecovery) {
		try {
			assertModuleAccess(school.moduleConfiguration, ["AI_ASSISTANT"]);
		} catch {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Assistant is unavailable for this school.",
			});
		}
	}

	if (!settingsRecovery) {
		if (
			ctx.profile.sessionId &&
			!(await db.schoolSession.findFirst({
				where: { id: ctx.profile.sessionId, schoolId, deletedAt: null },
				select: { id: true },
			}))
		)
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "The academic session is unavailable.",
			});
		if (
			ctx.profile.termId &&
			(!ctx.profile.sessionId ||
				!(await db.sessionTerm.findFirst({
					where: {
						id: ctx.profile.termId,
						schoolId,
						sessionId: ctx.profile.sessionId,
						deletedAt: null,
					},
					select: { id: true },
				})))
		)
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "The academic term is unavailable.",
			});
	}
	const config = await db.schoolAssistantConfig.findFirst({
		where: { schoolProfileId: schoolId, deletedAt: null },
	});
	if (!settingsRecovery && !config?.enabled)
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Assistant is disabled. An administrator can enable it in Assistant settings.",
		});
	const capabilities = config
		? getAllowedCapabilities({ role: user.role, config, moduleAccess: access })
		: [];
	return {
		authSessionId: login.id,
		schoolId,
		userId,
		userName: user.name ?? "Administrator",
		role: user.role,
		sessionId: ctx.profile.sessionId ?? null,
		termId: ctx.profile.termId ?? null,
		moduleAccess: access,
		config,
		capabilities,
		availableTools: getSchoolAiAvailableToolNames(access, capabilities),
	};
}
export type AssistantActor = Awaited<ReturnType<typeof resolveAssistantActor>>;
