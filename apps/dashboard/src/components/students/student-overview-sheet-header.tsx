import { useStudentParams } from "@/hooks/use-student-params";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";
import { Menu } from "../menu";
import { cn } from "@school-clerk/ui/cn";
import { useStudentsStore } from "@/store/student";
import { Avatar } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import { Badge } from "@school-clerk/ui/badge";
import { IdCard, GraduationCap, Download, Edit, ChevronDown } from "lucide-react";
import { Icons } from "@school-clerk/ui/icons";

interface Props {
  overview: RouterOutputs["students"]["overview"];
}
export function StudentOverviewSheetHeader({ overview }: Props) {
  const { setParams, ...params } = useStudentParams();
  const current = overview?.studentTerms?.find(
    (t) => t?.termId == params?.studentViewTermId
  );

  const store = useStudentsStore();
  const studentName = overview?.student?.studentName || "Student";

  return (
    <>
      <SheetHeader className="pb-4">
        <SheetTitle className="sr-only">{studentName}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
            {/* Student Identity */}
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Avatar className="h-16 w-16 border-4 border-background shadow-inner">
                  <Avatar.Image src="/placeholder.svg" alt={studentName} />
                  <Avatar.Fallback className="text-lg">
                    {getInitials(studentName)}
                  </Avatar.Fallback>
                </Avatar>
                <span
                  className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-background rounded-full"
                  title="Active"
                ></span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    <Menu
                      noSize
                      Trigger={
                        <button className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                          {studentName}
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
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
                            params.studentViewTermId == student.id &&
                              "bg-green-200"
                          )}
                        >
                          <div className="whitespace-nowrap">
                            {student?.studentName}
                          </div>
                        </Menu.Item>
                      ))}
                    </Menu>
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-xs border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {overview?.student?.id && (
                    <span className="flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5" />
                      {overview.student.id.slice(0, 8)}
                    </span>
                  )}
                  {current?.departmentName && (
                    <>
                      <span className="text-border">•</span>
                      <Menu
                        noSize
                        Trigger={
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>
                              {current?.term} {current?.departmentName}
                            </span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        }
                      >
                        {overview?.studentTerms?.map((term, ti) => (
                          <Menu.Item
                            key={ti}
                            onClick={(e) => {
                              setParams({
                                studentViewTermId: term.termId,
                                studentTermSheetId:
                                  term.studentTermId || null,
                              });
                            }}
                            shortCut={
                              params.studentViewTermId == term.termId ? (
                                <Icons.Check />
                              ) : undefined
                            }
                            className={cn(
                              params.studentViewTermId == term.termId &&
                                "bg-green-200"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "size-2 rounded-full",
                                  term?.studentTermId
                                    ? "bg-green-500"
                                    : "bg-red-400"
                                )}
                              ></div>
                              <span className="whitespace-nowrap">
                                {term?.term}
                              </span>
                            </div>
                          </Menu.Item>
                        ))}
                      </Menu>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 items-center">
              <Button variant="default" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Report Card
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </div>
          </div>
        </SheetDescription>
      </SheetHeader>
    </>
  );
}
