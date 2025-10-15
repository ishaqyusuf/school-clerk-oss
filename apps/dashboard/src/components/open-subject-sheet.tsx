import { useSubjectParams } from "@/hooks/use-subject-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function OpenSubjectSheet() {
  const { setParams } = useSubjectParams();

  return (
    <div>
      <Button variant="outline" size="icon" onClick={() => setParams({})}>
        <Icons.Add />
      </Button>
    </div>
  );
}
