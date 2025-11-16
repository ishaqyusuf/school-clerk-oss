import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useSubjectParams } from "@/hooks/use-subject-params";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Tabs } from "@school-clerk/ui/custom/tabs";
import Portal from "./portal";
import { Button } from "@school-clerk/ui/button";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Suspense } from "react";
import { Skeletons } from "@school-clerk/ui/skeletons";
import { DropdownMenu, Empty } from "@school-clerk/ui/composite";
import { SubjectAssessments } from "./subject-assessments";
import { AssessmentSubmissions } from "./asessment-submissions";
import { ExternalLink } from "lucide-react";
import { Menu } from "./menu";
import Link from "next/link";
export function ClassroomSubjectOverviewSecondary() {
  const ctx = useClassroomParams();
  const { openSubjectSecondaryId, subjectTab, setParams } = useSubjectParams();

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
  const { data, isPending } = useSuspenseQuery(
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
    return `/assessment-recording?deptId=${ctx?.viewClassroomId}&deptSubjectId=${data?.subject?.id}&permission=${permission}`;
  };
  if (ctx.secondaryTab != "subject-overview") return null;
  return (
    <>
      <Sheet.SecondaryContent>
        <Sheet.SecondaryHeader>
          <Sheet.Header className="bg-background flex-row items-start gap-4 space-y-0">
            <div className="grid gap-1">
              <Sheet.Title>
                <>{data?.subject?.subject?.title}</>
              </Sheet.Title>
              <Sheet.Description>Overview</Sheet.Description>
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
        <Sheet.Content className="h-screen">
          <div id="contentArea"></div>
        </Sheet.Content>
      </Sheet.SecondaryContent>
    </>
  );
}
