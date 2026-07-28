import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { parseAsString, useQueryStates } from "nuqs";

export function OpenStudentImport() {
  const [_, setParams] = useQueryStates({
    action: parseAsString,
  });

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Import students"
      title="Import students"
      onClick={() => setParams({ action: "student-import" })}
    >
      <Icons.Import />
    </Button>
  );
}
