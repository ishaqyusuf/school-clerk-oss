import type { PageFilterData } from "@school-clerk/utils/types";

export function getFilterOptionLabel(
  options: PageFilterData["options"],
  value: unknown,
) {
  const selectedOption = options?.find(
    (option) => String(option.value) === String(value),
  );

  return selectedOption?.label ?? value;
}
