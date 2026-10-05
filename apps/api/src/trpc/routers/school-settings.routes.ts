import {
	getAcademicDataDirectionSettings,
	getGeneralSchoolSettings,
	updateAcademicDataDirectionMode,
	updateStudentNameFormat,
} from "@api/db/queries/school-settings";
import { z } from "zod";
import {
	getInstitutionSettings,
	getPlatformInstitutionSettings,
	updateInstitutionSettings,
	updatePlatformInstitutionSettings,
} from "@api/db/queries/school-institution";
import { institutionSettingsSchema } from "@school-clerk/utils/institution-config";
import {
	initializeModuleConfigSchema,
	updateEnabledModulesSchema,
	updateModuleEntitlementsSchema,
} from "@school-clerk/utils/module-config";
import {
	getModuleSettings,
	getPlatformModuleSettings,
	initializePlatformModuleSettings,
	updateEnabledModules,
	updatePlatformModuleEntitlements,
} from "@api/db/queries/school-modules";

import { authenticatedProcedure, createTRPCRouter, platformAdminProcedure } from "../init";

const academicDataDirectionModeSchema = z.enum(["AUTO", "LTR", "RTL"]);
const studentNameFormatSchema = z.enum([
	"FIRST_SURNAME_OTHER",
	"SURNAME_FIRST_OTHER",
	"FIRST_OTHER_SURNAME",
]);

export const schoolSettingsRouter = createTRPCRouter({
	getModules: authenticatedProcedure
		.input(z.object({ schoolId: z.string().trim().min(1) }).strict())
		.query(({ ctx, input }) => getModuleSettings(ctx, input.schoolId)),
	updateModules: authenticatedProcedure
		.input(updateEnabledModulesSchema.extend({ schoolId: z.string().trim().min(1) }))
		.mutation(({ ctx, input }) => updateEnabledModules(ctx, input)),
	getModulesForSchool: platformAdminProcedure
		.input(z.object({ schoolId: z.string().trim().min(1) }).strict())
		.query(({ ctx, input }) => getPlatformModuleSettings(ctx, input.schoolId)),
	initializeModulesForSchool: platformAdminProcedure
		.input(initializeModuleConfigSchema.extend({ schoolId: z.string().trim().min(1) }))
		.mutation(({ ctx, input }) => initializePlatformModuleSettings(ctx, input)),
	updateModuleEntitlementsForSchool: platformAdminProcedure
		.input(updateModuleEntitlementsSchema.extend({ schoolId: z.string().trim().min(1) }))
		.mutation(({ ctx, input }) => updatePlatformModuleEntitlements(ctx, input)),
	getInstitution: authenticatedProcedure.query(({ ctx }) => getInstitutionSettings(ctx)),
	updateInstitution: authenticatedProcedure
		.input(institutionSettingsSchema)
		.mutation(({ ctx, input }) => updateInstitutionSettings(ctx, input.institutionType)),
	getInstitutionForSchool: platformAdminProcedure
		.input(z.object({ schoolId: z.string().trim().min(1) }).strict())
		.query(({ ctx, input }) => getPlatformInstitutionSettings(ctx, input.schoolId)),
	updateInstitutionForSchool: platformAdminProcedure
		.input(institutionSettingsSchema.extend({ schoolId: z.string().trim().min(1) }))
		.mutation(({ ctx, input }) => updatePlatformInstitutionSettings(ctx, input.schoolId, input.institutionType)),
	getGeneral: authenticatedProcedure.query(({ ctx }) => {
		return getGeneralSchoolSettings(ctx);
	}),
	getAcademicDataDirection: authenticatedProcedure.query(({ ctx }) => {
		return getAcademicDataDirectionSettings(ctx);
	}),
	updateStudentNameFormat: authenticatedProcedure
		.input(
			z.object({
				format: studentNameFormatSchema,
			}),
		)
		.mutation(({ ctx, input }) => {
			return updateStudentNameFormat(ctx, input.format);
		}),
	updateAcademicDataDirection: authenticatedProcedure
		.input(
			z.object({
				mode: academicDataDirectionModeSchema,
			}),
		)
		.mutation(({ ctx, input }) => {
			return updateAcademicDataDirectionMode(ctx, input.mode);
		}),
});
