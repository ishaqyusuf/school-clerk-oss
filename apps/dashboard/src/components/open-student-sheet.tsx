import { useStudentParams } from "@/hooks/use-student-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function OpenStudentSheet() {
  const { setParams } = useStudentParams();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Enroll student"
      title="Enroll student"
      onClick={() => setParams({ createStudent: true })}
    >
      <Icons.Add />
    </Button>
  );
}
