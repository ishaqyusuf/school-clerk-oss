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
export type TabType = (typeof tabs)[number];
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
      secondaryTab: parseAsStringEnum<SecondaryTabTypes>(secondaryTabs as any),
    },
    options
  );

  return {
    ...params,
    setParams,
  };
}
