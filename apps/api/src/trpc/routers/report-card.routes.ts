import {
	getMyStaffSignature,
	getReportCardPrintContext,
	getReportCardTemplate,
	listStaffSignatures,
	saveReportCardTemplate,
	updateStaffSignature,
} from "@api/db/queries/report-card-templates";
import {
	reportCardConfigSchema,
	reportCardTemplateIds,
} from "@school-clerk/utils/report-card";
import { z } from "zod";
import {
	authenticatedProcedure,
	createTRPCRouter,
	moduleProcedure,
} from "../init";

const reportProcedure = moduleProcedure(["RESULTS_AND_REPORTS"], {
	roles: ["Admin", "Registrar", "Teacher"],
});

export const reportCardRouter = createTRPCRouter({
	getTemplate: authenticatedProcedure.query(({ ctx }) =>
		getReportCardTemplate(ctx),
	),
	saveTemplate: authenticatedProcedure
		.input(
			z.object({
				templateId: z.enum(reportCardTemplateIds),
				config: reportCardConfigSchema,
			}),
		)
		.mutation(({ ctx, input }) =>
			saveReportCardTemplate(
				ctx,
				input as Parameters<typeof saveReportCardTemplate>[1],
			),
		),
	getPrintContext: reportProcedure
		.input(
			z.object({
				termId: z.string().min(1),
				departmentIds: z.array(z.string().min(1)).max(200),
			}),
		)
		.query(({ ctx, input }) =>
			getReportCardPrintContext(
				ctx,
				input as Parameters<typeof getReportCardPrintContext>[1],
			),
		),
	listStaffSignatures: authenticatedProcedure.query(({ ctx }) =>
		listStaffSignatures(ctx),
	),
	getMySignature: authenticatedProcedure.query(({ ctx }) =>
		getMyStaffSignature(ctx),
	),
	updateStaffSignature: authenticatedProcedure
		.input(
			z.object({
				staffId: z.string().min(1).optional().nullable(),
				signatureUrl: z.string().max(500_000).nullable(),
			}),
		)
		.mutation(({ ctx, input }) =>
			updateStaffSignature(
				ctx,
				input as Parameters<typeof updateStaffSignature>[1],
			),
		),
});
