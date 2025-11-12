import { useStudentParams } from "@/hooks/use-student-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { parseAsString, useQueryStates } from "nuqs";

export function OpenStudentImport() {
  const [_, setParams] = useQueryStates({
    action: parseAsString,
  });

  return (
    <div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setParams({ action: "student-import" })}
      >
        <Icons.Import />
      </Button>
    </div>
  );
}
