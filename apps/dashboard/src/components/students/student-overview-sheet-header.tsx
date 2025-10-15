import { useStudentParams } from "@/hooks/use-student-params";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";
import { Menu } from "../menu";
import { cn } from "@school-clerk/ui/cn";
import { useStudentsStore } from "@/store/student";
interface Props {
  overview: RouterOutputs["students"]["overview"];
}
export function StudentOverviewSheetHeader({ overview }: Props) {
  const { setParams, ...params } = useStudentParams();
  const current = overview?.studentTerms?.find(
    (t) => t?.termId == params?.studentViewTermId
  );

  const store = useStudentsStore();
  return (
    <>
      <SheetHeader>
        <SheetTitle>{/* {overview?.student?.studentName} */}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex gap-2 pb-2">
            <div className="inline-flex border rounded-full items-center p-1 gap-2 bg-secondary px-2">
              <span className="text-sm">{overview?.student?.studentName}</span>
              <Menu
                noSize
                Trigger={
                  <Button className="size-5 rounded-xl p-0" variant="secondary">
                    <Icons.ChevronDown className="size-4" />
                  </Button>
                }
              >
                {store?.studentsList?.map((student, si) => (
                  <Menu.Item
                    key={si}
                    dir="rtl"
                    onClick={(e) => {
                      setParams({
                        studentViewId: student?.id,
                        studentTermSheetId: student.termFormId,
                        studentViewTermId: student.termFormSessionTermId,
                      });
                    }}
                    shortCut={
                      params.studentViewTermId == student.id ? (
                        <Icons.Check />
                      ) : undefined
                    }
                    className={cn(
                      params.studentViewTermId == student.id && "bg-green-200"
                    )}
                  >
                    <div className="whitespace-nowrap">
                      {student?.studentName}
                    </div>
                  </Menu.Item>
                ))}
              </Menu>
            </div>
            <div className="">
              <Menu
                noSize
                Trigger={
                  <Button className="" variant="link">
                    <div className="inline-flex  p-1 gap-2 bg-secondary px-2 items-center border hover:no-underline rounded-xl">
                      <span>{current?.term || "Select Term"}</span>
                      <span>{current?.departmentName}</span>
                      {/* <div className="size-5 rounded-xl"> */}
                      <Icons.ChevronDown className="size-4" />
                      {/* </div> */}
                    </div>
                  </Button>
                }
              >
                {overview?.studentTerms?.map((term, ti) => (
                  <Menu.Item
                    key={ti}
                    onClick={(e) => {
                      setParams({
                        studentViewTermId: term.termId,
                        studentTermSheetId: term.studentTermId || null,
                      });
                    }}
                    shortCut={
                      params.studentViewTermId == term.termId ? (
                        <Icons.Check />
                      ) : undefined
                    }
                    className={cn(
                      params.studentViewTermId == term.termId && "bg-green-200"
                    )}
                  >
                    <div className=" flex items-center">
                      <div
                        className={cn(
                          "size-3",
                          term?.studentTermId ? "bg-green-300" : "bg-red-300"
                        )}
                      ></div>
                    </div>
                    <span className="whitespace-nowrap">{term?.term}</span>
                  </Menu.Item>
                ))}
              </Menu>
            </div>
          </div>
        </SheetDescription>
      </SheetHeader>
    </>
  );
}
