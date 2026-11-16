import { createHash } from "node:crypto";
import { closeSync, openSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@school-clerk/db";
import { z } from "zod";
import {
	getPaymentImportJob,
	processFinancePaymentImportJob,
	startPaymentImportJob,
	verifyPaymentImport,
} from "../src/db/queries/payment-import";
import type { TRPCContext } from "../src/trpc/init";
import { startPaymentImportJobSchema } from "../src/trpc/schemas/payment-import";

const manifestSchema = z
	.object({
		schoolId: z.string().uuid(),
		batches: z
			.array(startPaymentImportJobSchema.omit({ sourceFileName: true }))
			.min(1),
	})
	.strict();

async function run() {
	const [mode, inputPath, expectedHash] = Bun.argv.slice(2);
	if (
		(mode !== "verify" && mode !== "apply") ||
		!inputPath ||
		(mode === "apply" && !/^[a-f0-9]{64}$/.test(expectedHash ?? ""))
	) {
		throw new Error(
			"Usage: bun apply-reviewed-local-payments.ts verify|apply <manifest.json> [verified-sha256]",
		);
	}
	const database = new URL(process.env.DATABASE_URL ?? "");
	if (
		process.env.SCHOOL_CLERK_DB_MODE !== "local" ||
		!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
	) {
		throw new Error("A loopback School Clerk local profile is required.");
	}
	const path = resolve(inputPath);
	const source = await Bun.file(path).text();
	const hash = createHash("sha256").update(source).digest("hex");
	if (mode === "apply" && hash !== expectedHash)
		throw new Error("The manifest changed after review.");
	const manifest = manifestSchema.parse(JSON.parse(source));
	for (const batch of manifest.batches) {
		if (batch.rows.some((row) => row.skip || row.allowDuplicate)) {
			throw new Error(
				"The reviewed manifest must contain only actionable, non-duplicate rows.",
			);
		}
	}
	console.log(
		JSON.stringify({ mode, database: database.pathname.slice(1), hash }),
	);
	const school = await prisma.schoolProfile.findFirstOrThrow({
		where: { id: manifest.schoolId, deletedAt: null },
		select: { id: true, accountId: true },
	});
	if (!school.accountId) throw new Error("The school needs an owning account.");
	const actor = await prisma.user.findFirstOrThrow({
		where: { saasAccountId: school.accountId, role: "Admin", deletedAt: null },
		orderBy: { id: "asc" },
		select: {
			id: true,
			role: true,
			saasAccountId: true,
			name: true,
			email: true,
		},
	});
	const ctx: TRPCContext = {
		db: prisma,
		currentUser: actor,
		profile: { schoolId: school.id },
	};

	const lockPath = `${path}.apply.lock`;
	const lock = mode === "apply" ? openSync(lockPath, "wx", 0o600) : undefined;
	try {
		const verified: Array<{
			batch: (typeof manifest.batches)[number];
			sourceFileName: string;
			jobId?: string;
		}> = [];
		for (const [index, batch] of manifest.batches.entries()) {
			const sourceFileName = `reviewed-local-seed:${hash}:${index + 1}`;
			const existing = await prisma.financePaymentImportJob.findMany({
				where: { schoolProfileId: school.id, sourceFileName, deletedAt: null },
				take: 2,
				select: {
					id: true,
					status: true,
					totalRows: true,
					_count: { select: { rows: true } },
				},
			});
			if (
				existing.length > 1 ||
				existing.some(
					(job) =>
						job.totalRows !== batch.rows.length ||
						job._count.rows !== batch.rows.length,
				)
			) {
				throw new Error(
					`Batch ${index + 1} already has conflicting or incomplete job records.`,
				);
			}
			if (existing[0]) {
				verified.push({ batch, sourceFileName, jobId: existing[0].id });
				continue;
			}
			const preview = await verifyPaymentImport(ctx, batch);
			const blocked = preview.rows.filter((row) => row.status !== "READY");
			console.log(
				JSON.stringify({
					batch: index + 1,
					mode: batch.mode,
					rows: batch.rows.length,
					amount: batch.rows.reduce((sum, row) => sum + row.amount, 0),
					blockedLines: blocked.map((row) => row.lineNumber),
				}),
			);
			if (blocked.length)
				throw new Error(
					"Resolve the reported lines before applying this manifest.",
				);
			verified.push({ batch, sourceFileName });
		}
		if (mode === "verify") return;
		for (const [index, entry] of verified.entries()) {
			const jobId =
				entry.jobId ??
				(
					await startPaymentImportJob(
						ctx,
						{
							...entry.batch,
							sourceFileName: entry.sourceFileName,
						},
						{ enqueue: false },
					)
				)?.id;
			if (!jobId)
				throw new Error("The import job did not return an identifier.");
			await processFinancePaymentImportJob(prisma, jobId);
			const summary = await getPaymentImportJob(ctx, { jobId });
			console.log(
				JSON.stringify({
					batch: index + 1,
					jobId,
					status: summary?.status,
					importedRows: summary?.importedRows,
					failedRows: summary?.failedRows,
					importedAmount: summary?.importedAmount,
				}),
			);
			if (
				summary?.status !== "COMPLETED" ||
				summary?.importedRows !== entry.batch.rows.length
			) {
				throw new Error(
					"A payment batch did not finish; inspect it before resuming.",
				);
			}
		}
	} finally {
		if (lock !== undefined) {
			closeSync(lock);
			unlinkSync(lockPath);
		}
	}
}

try {
	await run();
} finally {
	await prisma.$disconnect();
}
