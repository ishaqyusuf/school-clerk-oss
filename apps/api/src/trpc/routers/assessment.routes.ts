import { createTRPCRouter, publicProcedure } from "../init";

import {
  getSubjectAssessmentRecordings,
  getSubjectAssessmentRecordingsSchema,
  saveAssessement,
  saveAssessementSchema,
  updateAssessmentScore,
  updateAssessmentScoreSchema,
} from "@api/db/queries/assessments";
export const assessmentRouter = createTRPCRouter({
  saveAssessement: publicProcedure
    .input(saveAssessementSchema)
    .mutation(async (props) => {
      return saveAssessement(props.ctx, props.input);
    }),
  getSubjectAssessmentRecordings: publicProcedure
    .input(getSubjectAssessmentRecordingsSchema)
    .query(async (props) => {
      return getSubjectAssessmentRecordings(props.ctx, props.input);
    }),
  updateAssessmentScore: publicProcedure
    .input(updateAssessmentScoreSchema)
    .mutation(async (props) => {
      return updateAssessmentScore(props.ctx, props.input);
    }),
});
