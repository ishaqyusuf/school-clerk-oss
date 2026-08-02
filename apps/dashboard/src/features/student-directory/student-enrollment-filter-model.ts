type FilterOption = {
  label?: string;
  value?: string;
  parentValue?: string;
};

type FilterDefinition = {
  value?: string;
  options?: FilterOption[];
};

type StudentEnrollmentFilters = {
  sessionId?: string | null;
  sessionTermId?: string | null;
};

export function filterTermsBySession<T extends FilterDefinition>(
  filterList: T[],
  sessionId?: string | null,
) {
  if (!sessionId) return filterList;

  return filterList.map((filter) =>
    filter.value === "sessionTermId"
      ? {
          ...filter,
          options: filter.options?.filter(
            (option) => option.parentValue === sessionId,
          ),
        }
      : filter,
  ) as T[];
}

export function getEnrollmentFilterSelectionUpdate({
  filterKey,
  option,
  currentFilters,
  filterList,
}: {
  filterKey?: string;
  option: FilterOption;
  currentFilters: StudentEnrollmentFilters;
  filterList: FilterDefinition[];
}) {
  if (!option.value) return null;

  if (filterKey === "sessionTermId") {
    return {
      sessionId: option.parentValue ?? null,
      sessionTermId: option.value,
    };
  }

  if (filterKey === "sessionId") {
    const termOptions = filterList.find(
      (filter) => filter.value === "sessionTermId",
    )?.options;
    const selectedTerm = termOptions?.find(
      (term) => term.value === currentFilters.sessionTermId,
    );

    return {
      sessionId: option.value,
      sessionTermId:
        selectedTerm?.parentValue === option.value
          ? (currentFilters.sessionTermId ?? null)
          : null,
    };
  }

  return null;
}

export function getEnrollmentFilterRemovalUpdate(filterKey: string) {
  if (filterKey === "sessionId") {
    return { sessionId: null, sessionTermId: null };
  }
  if (filterKey === "sessionTermId") {
    return { sessionTermId: null };
  }
  return null;
}
