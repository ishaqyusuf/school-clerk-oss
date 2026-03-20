import { useTRPC } from "@/trpc/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../tables/skeleton";
import { Suspense } from "react";
import { useStudentParams } from "@/hooks/use-student-params";
import { Card, CardContent } from "@school-clerk/ui/card";
import { IdCard, GraduationCap, CalendarDays, User } from "lucide-react";

export function StudentOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const { setParams, ...params } = useStudentParams();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useSuspenseQuery(
    trpc.students.overview.queryOptions(
      {
        studentId: params.studentViewId,
        termSheetId: params.studentTermSheetId,
      },
      {
        enabled: true,
        staleTime: 60 * 1000,
      }
    )
  );

  const student = data?.student;
  const currentTerm = data?.studentTerms?.find(
    (t) => t?.termId == params?.studentViewTermId
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
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

        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
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

        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
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

        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
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

      {/* Term History */}
      {data?.studentTerms && data.studentTerms.length > 0 && (
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                Term Enrollment History
              </h3>
            </div>
            <div className="divide-y divide-border">
              {data.studentTerms.map((term, index) => (
                <div
                  key={index}
                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setParams({
                      studentViewTermId: term.termId,
                      studentTermSheetId: term.studentTermId || null,
                    });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-2.5 rounded-full ${
                        term?.studentTermId ? "bg-green-500" : "bg-red-400"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {term?.term}
                      </p>
                      {term?.departmentName && (
                        <p className="text-xs text-muted-foreground">
                          {term.departmentName}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {term?.studentTermId ? "Enrolled" : "Not enrolled"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
