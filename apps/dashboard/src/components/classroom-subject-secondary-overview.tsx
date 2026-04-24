import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useSubjectParams } from "@/hooks/use-subject-params";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Tabs } from "@school-clerk/ui/custom/tabs";
import Portal from "./portal";
import { useSuspenseQuery } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Suspense } from "react";
import { Skeletons } from "@school-clerk/ui/skeletons";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { SubjectAssessments } from "./subject-assessments";
import { AssessmentSubmissions } from "./asessment-submissions";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Layers3,
} from "lucide-react";
import { Menu } from "./menu";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@school-clerk/ui/badge";
import { classroomDisplayName } from "@school-clerk/utils";
export function ClassroomSubjectOverviewSecondary() {
  const ctx = useClassroomParams();

  const { subjectTab, setParams } = useSubjectParams();

  if (ctx.secondaryTab != "subject-overview") return null;
  return (
    <Suspense
      fallback={
        <Sheet.SecondaryContent>
          <Skeletons>
            <Skeletons.SheetHeader />
            <Skeletons.Tabs />
          </Skeletons>
        </Sheet.SecondaryContent>
      }
    >
      <Content />
    </Suspense>
  );
}
function Content() {
  const ctx = useClassroomParams();
  const { openSubjectSecondaryId, subjectTab, setParams } = useSubjectParams();
  const auth = useAuth();
  const { data } = useSuspenseQuery(
    _trpc.subjects.overview.queryOptions(
      {
        departmentSubjectId: openSubjectSecondaryId,
      },
      {
        enabled: !!openSubjectSecondaryId,
      }
    )
  );
  const openExternal = (permission) => {
    return `/assessment-recording?deptId=${ctx?.viewClassroomId}&deptSubjectId=${data?.subject?.id}&permission=${permission}&termId=${auth?.profile?.termId}`;
  };
  const classroomName = classroomDisplayName({
    className: data?.subject?.classRoomDepartment?.classRoom?.name,
    departmentName: data?.subject?.classRoomDepartment?.departmentName,
  });
  const assessmentCount = data?.subject?.assessments?.length ?? 0;
  const totalSubmissions =
    data?.subject?.assessments?.reduce(
      (sum, assessment) => sum + (assessment?._count?.assessmentResults ?? 0),
      0
    ) ?? 0;
  const totalWeight =
    data?.subject?.assessments?.reduce(
      (sum, assessment) => sum + (assessment?.percentageObtainable ?? 0),
      0
    ) ?? 0;
  if (ctx.secondaryTab != "subject-overview") return null;
  return (
    <>
      <Sheet.SecondaryContent>
        <Sheet.SecondaryHeader>
          <Sheet.Header className="space-y-0 border-b border-border/70 bg-background pb-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <BookOpen className="size-7" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="space-y-1">
                      <Sheet.Title>{data?.subject?.subject?.title}</Sheet.Title>
                      <Sheet.Description>
                        Subject overview for {classroomName || "this classroom"}
                      </Sheet.Description>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {classroomName || "Classroom"}
                      </Badge>
                      <Badge variant="neutral" className="rounded-full px-3 py-1">
                        {data?.subject?.classRoomDepartment?._count?.studentTermForms ?? 0} students
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <Layers3 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assessments</p>
                      <p className="text-2xl font-semibold">{assessmentCount}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                      <BarChart3 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submissions</p>
                      <p className="text-2xl font-semibold">{totalSubmissions}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="text-2xl font-semibold">{totalWeight}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Sheet.Header>
        </Sheet.SecondaryHeader>
        <Sheet.SecondaryHeaderSlot>
          <Tabs
            name={"subject-tab"}
            value={subjectTab}
            onValueChange={(e) => {
              setParams({
                subjectTab: e,
              });
            }}
          >
            <Tabs.Items>
              <Tabs.Item value={"overview"} label="Overview">
                <Tabs.Content className="">
                  <Portal noDelay nodeId={"contentArea"}>
                    <SubjectAssessments overview={data} />
                  </Portal>
                </Tabs.Content>
              </Tabs.Item>
              <Tabs.Item value={"assessments"} label="Assessments">
                <Tabs.Content className="">
                  <Portal noDelay nodeId={"contentArea"}>
                    <div></div>
                  </Portal>
                </Tabs.Content>
              </Tabs.Item>
              <Tabs.Item value={"recordings"} label="">
                <Tabs.Content className="">
                  <Portal noDelay nodeId={"contentArea"}>
                    <div className="flex gap-4">
                      <div className="flex-1"></div>
                      <Menu Icon={ExternalLink}>
                        <DropdownMenu.Label>Permission</DropdownMenu.Label>
                        <Menu.Item>
                          <Link href={openExternal("all")} target="_blank">
                            Full
                          </Link>
                        </Menu.Item>
                        <Menu.Item>
                          <Link
                            href={openExternal("classroom")}
                            target="_blank"
                          >
                            Classroom
                          </Link>
                        </Menu.Item>
                        <Menu.Item>
                          <Link href={openExternal("subject")} target="_blank">
                            Subject
                          </Link>
                        </Menu.Item>
                      </Menu>
                    </div>
                    <AssessmentSubmissions
                      deparmentSubjectId={data.subject?.id}
                    />
                  </Portal>
                </Tabs.Content>
              </Tabs.Item>
            </Tabs.Items>
          </Tabs>
        </Sheet.SecondaryHeaderSlot>
        <Sheet.Content className="h-screen bg-muted/10">
          <div id="contentArea"></div>
        </Sheet.Content>
      </Sheet.SecondaryContent>
    </>
  );
}
