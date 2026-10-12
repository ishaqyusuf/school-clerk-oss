import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { z } from "zod";

const lineItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

const tabs = [
  "overview",
  "students",
  "subjects",
  "attendance",
  "payments",
  "performance",
] as const;
const secondaryTabs = [
  "student-form",
  "subject-form",
  "student-overview",
  "subject-overview",
  "attendance-form",
  "attendance-overview",
] as const;
const attendanceViews = ["take"] as const;
export type TabType = (typeof tabs)[number];
export type AttendanceViewType = (typeof attendanceViews)[number];
export type SecondaryTabTypes = (typeof secondaryTabs)[number];
export function useClassroomParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      createClassroom: parseAsBoolean,
      editClassroomId: parseAsString,
      viewClassroomId: parseAsString,
      attendanceSessionId: parseAsString,
      subjectOverviewId: parseAsString,
      classroomTab: parseAsStringEnum<TabType>(tabs as any),
      /** Attendance section page: null = today + history, "take" = recorder. */
      attendanceView: parseAsStringEnum<AttendanceViewType>(
        attendanceViews as any
      ),
      secondaryTab: parseAsStringEnum<SecondaryTabTypes>(secondaryTabs as any),
    },
    options
  );

  return {
    ...params,
    setParams,
  };
}
