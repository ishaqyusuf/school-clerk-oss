import { useStudentParams } from "@/hooks/use-student-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function OpenStudentSheet() {
  const { setParams } = useStudentParams();

  return (
    <div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setParams({ createStudent: true })}
      >
        <Icons.Add />
      </Button>
    </div>
  );
}
