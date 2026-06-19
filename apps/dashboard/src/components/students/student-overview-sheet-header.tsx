import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import { Menu } from "../menu";
import { cn } from "@school-clerk/ui/cn";
import { useStudentsStore } from "@/store/student";
import { Avatar } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import { Badge } from "@school-clerk/ui/badge";
import {
  IdCard,
  GraduationCap,
  Download,
  Edit,
  ChevronDown,
} from "lucide-react";
import { Icons } from "@school-clerk/ui/icons";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { useStudentParams } from "@/hooks/use-student-params";

interface Props {
  overview: RouterOutputs["students"]["overview"];
  mode?: "sheet" | "page";
}
export function StudentOverviewSheetHeader({
  overview,
  mode = "sheet",
}: Props) {
  const { activeStudentTerm, selectStudent, selectTerm } =
    useStudentOverviewSheet();
  const { setParams } = useStudentParams();
  const store = useStudentsStore();
  const studentName = overview?.student?.studentName || "Student";
  const current = activeStudentTerm;
  const hasStudentSwitcher = (store?.studentsList?.length ?? 0) > 0;

  return (
    <section
      className={cn(
        "w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl",
        mode === "page" ? "p-4 sm:p-6 md:p-8" : "p-4 sm:p-5",
      )}
    >
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16 border-4 border-background shadow-inner sm:h-20 sm:w-20 md:h-24 md:w-24">
              <Avatar.Image src="/placeholder.svg" alt={studentName} />
              <Avatar.Fallback className="text-base sm:text-lg">
                {getInitials(studentName)}
              </Avatar.Fallback>
            </Avatar>
            <span
              className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-primary"
              title="Active"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="min-w-0 max-w-full text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {hasStudentSwitcher ? (
                  <Menu
                    noSize
                    Trigger={
                      <button className="inline-flex max-w-full min-w-0 items-center gap-1 text-left transition-colors hover:text-primary">
                        <span className="truncate">{studentName}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    }
                  >
                    {store?.studentsList?.map((student, si) => (
                      <Menu.Item
                        key={si}
                        dir="rtl"
                        onClick={() => {
                          selectStudent(student.id, {
                            termId: student.termFormSessionTermId,
                            termSheetId: student.termFormId,
                          });
                        }}
                        shortCut={
                          overview?.student?.id === student.id ? (
                            <Icons.Check />
                          ) : undefined
                        }
                      >
                        <div className="whitespace-nowrap">
                          {student.studentName}
                        </div>
                      </Menu.Item>
                    ))}
                  </Menu>
                ) : (
                  <span className="block truncate">{studentName}</span>
                )}
              </h2>
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary"
              >
                Active
              </Badge>
            </div>

            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {overview?.student?.id && (
                <span className="flex min-w-0 items-center gap-1">
                  <IdCard className="h-3.5 w-3.5 shrink-0" />
                  {overview.student.id.slice(0, 8)}
                </span>
              )}
              {current?.departmentName && (
                <>
                  <span className="text-border">•</span>
                  <Menu
                    noSize
                    Trigger={
                      <button className="inline-flex min-w-0 max-w-full items-center gap-1 transition-colors hover:text-primary">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {current.term} {current.departmentName}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      </button>
                    }
                  >
                    {overview?.studentTerms?.map((term, ti) => (
                      <Menu.Item
                        key={ti}
                        onClick={() => {
                          selectTerm(term.termId, term.studentTermId || null);
                        }}
                        shortCut={
                          current?.termId === term.termId ? (
                            <Icons.Check />
                          ) : undefined
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "size-2 rounded-full",
                              term.studentTermId
                                ? "bg-primary"
                                : "bg-muted-foreground/40",
                            )}
                          />
                          <span className="whitespace-nowrap">{term.term}</span>
                        </div>
                      </Menu.Item>
                    ))}
                  </Menu>
                </>
              )}
              {overview?.student?.gender && (
                <>
                  <span className="text-border">•</span>
                  <span>{overview.student.gender}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button variant="default" size="sm" className="min-w-0 justify-center gap-2">
            <Download className="h-4 w-4" />
            <span className="truncate">Report Card</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="min-w-0 justify-center gap-2"
            onClick={() => {
              if (!overview?.student?.id) return;
              setParams({ studentEditId: overview.student.id });
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="truncate">Edit</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
