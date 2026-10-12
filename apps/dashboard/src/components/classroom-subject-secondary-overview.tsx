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
import { ExternalLink } from "lucide-react";
import { Menu } from "./menu";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useAuth } from "@/hooks/use-auth";
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
  if (ctx.secondaryTab != "subject-overview") return null;
  return (
    <>
      <Sheet.SecondaryContent>
        <Sheet.SecondaryHeader>
          <div className="min-w-0 space-y-1">
            <Sheet.Title>
              <span dir="auto">{data?.subject?.subject?.title}</span>
            </Sheet.Title>
            <Sheet.Description>
              <bdi>{classroomName || "This classroom"}</bdi> ·{" "}
              {data?.subject?.classRoomDepartment?._count?.studentTermForms ?? 0}{" "}
              students
            </Sheet.Description>
          </div>
        </Sheet.SecondaryHeader>
        <Sheet.SecondaryHeaderSlot>
          <Tabs
            name={"subject-tab"}
            value={subjectTab === "recordings" ? "recordings" : "overview"}
            onValueChange={(e) => {
              setParams({
                subjectTab: e,
              });
            }}
          >
            <Tabs.Items>
              <Tabs.Item value={"overview"} label="Assessments">
                <Tabs.Content className="">
                  <Portal noDelay nodeId={"contentArea"}>
                    <SubjectAssessments overview={data} />
                  </Portal>
                </Tabs.Content>
              </Tabs.Item>
              <Tabs.Item value={"recordings"} label="Score entry">
                <Tabs.Content className="">
                  <Portal noDelay nodeId={"contentArea"}>
                    <div className="flex gap-4">
                      <div className="flex-1"></div>
                      <Menu Icon={ExternalLink} label="Open recorder">
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
        <Sheet.Content className="bg-muted/10">
          <div id="contentArea"></div>
        </Sheet.Content>
      </Sheet.SecondaryContent>
    </>
  );
}
