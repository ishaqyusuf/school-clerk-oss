import {
  getClassroomReportSheet,
  getClassroomReportSheetSchema,
} from "@api/db/queries/report-sheet";
import { createTRPCRouter, publicProcedure } from "../init";

import {
  getAssessmentSuggestions,
  getAssessmentSuggestionsSchema,
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
  getAssessmentSuggestions: publicProcedure
    .input(getAssessmentSuggestionsSchema)
    .query(async (props) => {
      return getAssessmentSuggestions(props.ctx, props.input);
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
  getClassroomReportSheet: publicProcedure
    .input(getClassroomReportSheetSchema)
    .query(async (props) => {
      return getClassroomReportSheet(props.ctx, props.input);
    }),
});
