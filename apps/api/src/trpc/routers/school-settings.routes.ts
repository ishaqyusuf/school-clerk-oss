import {
	getAcademicDataDirectionSettings,
	getGeneralSchoolSettings,
	updateAcademicDataDirectionMode,
	updateStudentNameFormat,
} from "@api/db/queries/school-settings";
import { z } from "zod";

import { authenticatedProcedure, createTRPCRouter } from "../init";

const academicDataDirectionModeSchema = z.enum(["AUTO", "LTR", "RTL"]);
const studentNameFormatSchema = z.enum([
	"FIRST_SURNAME_OTHER",
	"SURNAME_FIRST_OTHER",
	"FIRST_OTHER_SURNAME",
]);

export const schoolSettingsRouter = createTRPCRouter({
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
