import {
	beginSchoolClerkQaPurgeRun,
	deleteSchoolClerkQaAccount,
	finishSchoolClerkQaPurgeRun,
	getSchoolClerkQaPurgeRun,
	previewSchoolClerkQaPurge,
} from "@school-clerk/db";
import { qaPurgeTaskId } from "@school-clerk/utils/task-contracts";
import { schemaTask } from "@trigger.dev/sdk";
import { del } from "@vercel/blob";
import { z } from "zod";

async function removeVercelDomain(projectId: string, domain: string) {
	const token = process.env.VERCEL_BEARER_TOKEN;
	const teamId = process.env.VERCEL_TEAM_ID;
	if (!token || !teamId) throw new Error("Vercel credentials are unavailable.");
	const response = await fetch(
		`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}?teamId=${encodeURIComponent(teamId)}`,
		{
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		},
	);
	if (!response.ok && response.status !== 404) {
		throw new Error(`Vercel domain cleanup failed with ${response.status}.`);
	}
}

export const qaPurgeTask = schemaTask({
	id: qaPurgeTaskId,
	schema: z.object({ runId: z.string().min(1) }),
	maxDuration: 60 * 30,
	run: async ({ runId }) => {
		const run = await getSchoolClerkQaPurgeRun(runId);
		if (!run || run.status !== "PENDING") return;

		const preview = await previewSchoolClerkQaPurge();
		if (preview.blockers.length) {
			await finishSchoolClerkQaPurgeRun({
				id: runId,
				status: "BLOCKED",
				errorCategory: preview.blockers[0],
			});
			return;
		}
		if (preview.files.length && !process.env.BLOB_READ_WRITE_TOKEN) {
			await finishSchoolClerkQaPurgeRun({
				id: runId,
				status: "BLOCKED",
				errorCategory: "STORAGE_CREDENTIAL_UNAVAILABLE",
			});
			return;
		}

		await beginSchoolClerkQaPurgeRun(runId);
		let files = 0;
		let workspaces = 0;
		let schools = 0;
		let records = 0;
		let errorCategory: string | undefined;

		for (const account of preview.accounts) {
			try {
				const accountFiles = preview.files.filter(
					(file: (typeof preview.files)[number]) =>
						file.accountId === account.id,
				);
				for (const file of accountFiles) {
					try {
						await del(file.storageKey, {
							token: process.env.BLOB_READ_WRITE_TOKEN,
						});
					} catch (error) {
						const message = error instanceof Error ? error.message : "";
						if (!/not found|404/i.test(message)) throw error;
					}
					files += 1;
				}
				const rootDomain = (
					process.env.SCHOOL_SITE_ROOT_DOMAIN ??
					process.env.APP_ROOT_DOMAIN ??
					"school-clerk.com"
				)
					.replace(/^https?:\/\//, "")
					.replace(/^dashboard\./, "")
					.replace(/\/+$/, "");
				const siteProjectId = process.env.VERCEL_SITE_PROJECT_ID;
				const dashboardProjectId = process.env.VERCEL_DASHBOARD_PROJECT_ID;
				if (!siteProjectId || !dashboardProjectId) {
					throw new Error("Vercel project configuration is unavailable.");
				}
				for (const domain of account.domains) {
					if (!domain.subdomain) continue;
					await removeVercelDomain(
						siteProjectId,
						`${domain.subdomain}.${rootDomain}`,
					);
					await removeVercelDomain(
						dashboardProjectId,
						`dashboard.${domain.subdomain}.${rootDomain}`,
					);
				}
				const deleted = await deleteSchoolClerkQaAccount(account.id);
				workspaces += deleted.workspaces;
				schools += deleted.schools;
				records += deleted.records;
			} catch (error) {
				errorCategory = error instanceof Error ? error.name : "QA_PURGE_FAILED";
			}
		}

		await finishSchoolClerkQaPurgeRun({
			id: runId,
			status:
				workspaces === preview.accounts.length
					? "COMPLETED"
					: workspaces
						? "PARTIAL"
						: "FAILED",
			deletedWorkspaceCount: workspaces,
			deletedSchoolCount: schools,
			deletedRecordCount: records,
			deletedFileCount: files,
			errorCategory,
		});
	},
});
