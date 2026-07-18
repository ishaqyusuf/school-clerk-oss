import {
	getAcademicDataDirectionSettings,
	updateAcademicDataDirectionMode,
} from "@api/db/queries/school-settings";
import { z } from "zod";

import { authenticatedProcedure, createTRPCRouter } from "../init";

const academicDataDirectionModeSchema = z.enum(["AUTO", "LTR", "RTL"]);

export const schoolSettingsRouter = createTRPCRouter({
	getAcademicDataDirection: authenticatedProcedure.query(({ ctx }) => {
		return getAcademicDataDirectionSettings(ctx);
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
