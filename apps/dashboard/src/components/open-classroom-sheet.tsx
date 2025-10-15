import { useClassroomParams } from "@/hooks/use-classroom-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function OpenClassroomSheet() {
  const { setParams } = useClassroomParams();

  return (
    <div>
      <Button variant="outline" size="icon" onClick={() => setParams({})}>
        <Icons.Add />
      </Button>
    </div>
  );
}
