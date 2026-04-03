import { TableSkeleton } from "../tables/skeleton";
import { Suspense } from "react";
import { Card, CardContent } from "@school-clerk/ui/card";
import {
  CalendarDays,
  GraduationCap,
  IdCard,
  Info,
  User,
} from "lucide-react";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { cn } from "@school-clerk/ui/cn";

export function StudentOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const { overviewData, activeStudentTerm, selectTerm } =
    useStudentOverviewSheet();

  const student = overviewData?.student;
  const currentTerm = activeStudentTerm;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Student ID
                </p>
                <p className="text-sm font-bold text-foreground font-mono">
                  {student?.id ? student.id.slice(0, 8) : "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Class
                </p>
                <p className="text-sm font-bold text-foreground">
                  {currentTerm?.departmentName || "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Term
                </p>
                <p className="text-sm font-bold text-foreground">
                  {currentTerm?.term || "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gender
                </p>
                <p className="text-sm font-bold text-foreground">
                  {student?.gender || "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {overviewData?.studentTerms && overviewData.studentTerms.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-border px-5 py-4">
                <h3 className="text-base font-bold text-foreground">
                  Term Enrollment History
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the student&apos;s academic timeline and switch between
                  enrolled terms.
                </p>
              </div>
              <div className="divide-y divide-border">
                {overviewData.studentTerms.map((term, index) => {
                  const isActive = currentTerm?.termId === term.termId;

                  return (
                    <button
                      key={index}
                      className={cn(
                        "flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40",
                        isActive && "bg-muted/50"
                      )}
                      onClick={() =>
                        selectTerm(term.termId, term.studentTermId || null)
                      }
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            term.studentTermId
                              ? "bg-primary"
                              : "bg-muted-foreground/40"
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {term.term}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {term.departmentName || "Class pending assignment"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium",
                          term.studentTermId
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {term.studentTermId ? "Enrolled" : "Not enrolled"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Current Selection
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active term details used across attendance, academics, and
                  payments.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Selected Term
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {currentTerm?.term || "--"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentTerm?.departmentName || "No class assigned yet"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Overview Notes
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enrollment status is resolved from the student&apos;s term
                      form records, so promoted students remain available across
                      the active term experience.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
