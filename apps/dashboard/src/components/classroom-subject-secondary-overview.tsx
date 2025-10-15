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
import { Empty } from "@school-clerk/ui/composite";
import { SubjectAssessments } from "./subject-assessments";
import { AssessmentSubmissions } from "./asessment-submissions";
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
                    <AssessmentSubmissions overview={data} />
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
