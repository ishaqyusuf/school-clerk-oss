import { createHmac, timingSafeEqual } from "node:crypto";
import {
	adoptQaAccounts,
	createSchoolClerkQaPurgeRun,
	discoverQaAccountCandidates,
	previewSchoolClerkQaPurge,
} from "@school-clerk/db";
import { qaPurgeTaskId } from "@school-clerk/utils/task-contracts";
import { tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, platformAdminProcedure } from "../init";

const confirmation = "PURGE ALL QA DATA";

function secret() {
	const value =
		process.env.QA_MAINTENANCE_SECRET?.trim() ??
		process.env.BETTER_AUTH_SECRET?.trim();
	if (!value) throw new Error("QA maintenance secret is not configured.");
	return value;
}

function sign(fingerprint: string, expiresAt: number) {
	const payload = `${expiresAt}.${fingerprint}`;
	const signature = createHmac("sha256", secret())
		.update(payload)
		.digest("hex");
	return `${payload}.${signature}`;
}

function isValid(token: string, fingerprint: string) {
	const [expires, signedFingerprint, signature] = token.split(".");
	const expiresAt = Number(expires);
	if (
		!signature ||
		signedFingerprint !== fingerprint ||
		!Number.isFinite(expiresAt) ||
		expiresAt <= Date.now()
	) {
		return false;
	}
	const expected = sign(fingerprint, expiresAt).split(".").at(-1) ?? "";
	return (
		expected.length === signature.length &&
		timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
	);
}

export const qaMaintenanceRouter = createTRPCRouter({
	candidates: platformAdminProcedure.query(({ ctx }) =>
		discoverQaAccountCandidates(ctx.db),
	),
	adopt: platformAdminProcedure
		.input(z.object({ accountIds: z.array(z.string().min(1)).min(1) }))
		.mutation(({ ctx, input }) => adoptQaAccounts(input.accountIds, ctx.db)),
	preview: platformAdminProcedure.query(async ({ ctx }) => {
		const preview = await previewSchoolClerkQaPurge(ctx.db);
		const expiresAt = Date.now() + 10 * 60_000;
		const { files: _files, ...safePreview } = preview;
		return {
			...safePreview,
			previewExpiresAt: new Date(expiresAt),
			previewToken: sign(preview.fingerprint, expiresAt),
		};
	}),
	start: platformAdminProcedure
		.input(
			z.object({
				confirmation: z.literal(confirmation),
				previewToken: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const preview = await previewSchoolClerkQaPurge(ctx.db);
			if (!isValid(input.previewToken, preview.fingerprint)) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "The QA purge preview expired or changed.",
				});
			}
			if (!preview.accounts.length || preview.blockers.length) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "QA purge is empty or blocked by live resources.",
				});
			}
			const run = await createSchoolClerkQaPurgeRun(ctx.currentUser.id);
			await tasks.trigger(qaPurgeTaskId, { runId: run.id });
			return { id: run.id, status: run.status };
		}),
	run: platformAdminProcedure
		.input(z.object({ runId: z.string().min(1) }))
		.query(({ ctx, input }) =>
			ctx.db.qaPurgeRun.findUnique({ where: { id: input.runId } }),
		),
});
