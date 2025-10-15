import { useQueryStates, parseAsString, parseAsStringEnum } from "nuqs";

const tabs = ["overview", "assessments", "recordings"] as const;
export type TabType = (typeof tabs)[number];
export function useSubjectParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openSubjectId: parseAsString,
      openSubjectSecondaryId: parseAsString,
      subjectTab: parseAsStringEnum<TabType>(tabs as any),
    },
    options
  );
  const opened = !!params.openSubjectId;
  return {
    ...params,
    setParams,
    opened,
  };
}
