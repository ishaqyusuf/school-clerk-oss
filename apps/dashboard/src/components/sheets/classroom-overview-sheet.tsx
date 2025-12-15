import Sheet from "@school-clerk/ui/custom/sheet";
import {
  Tabs as TabsBase,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@school-clerk/ui/tabs";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { ClassroomStudents } from "../classroom-students";
import { ClassroomSubject } from "../classroom-subjects";
import { FormContext } from "../students/form-context";
import { Form } from "../forms/student-form";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { Suspense } from "react";
import { ClassroomSubjectSecondaryForm } from "../classroom-subject-secondary-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { StudentFormAction } from "../forms/student-form-action";
import { ClassroomSubjectOverviewSecondary } from "../classroom-subject-secondary-overview";
import { _trpc } from "../static-trpc";

export function ClassroomOverviewSheet({}) {
  const { setParams, ...params } = useClassroomParams();
  const { viewClassroomId } = params;
  const isOpen = Boolean(params.viewClassroomId);
  return (
    <Sheet
      // floating
      // rounded
      primarySize="xl"
      secondarySize="5xl"
      open={isOpen}
      onOpenChange={() => setParams(null)}
      onCloseSecondary={() => setParams({ secondaryTab: null })}
      sheetName="student-overview"
      secondaryOpened={!!params.secondaryTab}
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content />
      </Suspense>
    </Sheet>
  );
}
export function Content({}) {
  const { setParams, ...params } = useClassroomParams();
  const { viewClassroomId } = params;
  const isOpen = !!params.viewClassroomId;
  // const trpc = useTRPC();
  const { data: classRoom } = useSuspenseQuery(
    _trpc.classrooms.getClassroomOverview.queryOptions(
      {
        departmentId: params.viewClassroomId || "-",
      },
      {
        enabled: isOpen,
      }
    )
  );
  // const s =
  if (!isOpen) return null;
  return (
    <>
      <Sheet.MultiContent className="bg-background">
        <Sheet.Header className="bg-background">
          <Sheet.Title>
            <Sheet.PrimaryContent>
              {classRoom?.displayName} {params?.classroomTab || "!"}
            </Sheet.PrimaryContent>
          </Sheet.Title>
          <Sheet.Description>
            <Sheet.PrimaryContent>
              {classRoom?._count?.studentSessionForms} students
            </Sheet.PrimaryContent>
          </Sheet.Description>
        </Sheet.Header>
        <Sheet.PrimaryContent>
          <TabsBase
            onValueChange={(e) => {
              setParams({
                classroomTab: e as any,
              });
            }}
            value={params?.classroomTab}
          >
            <TabsList className="w-full">
              {/* <TabsTrigger value="overview">Overview</TabsTrigger> */}
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              {/* <TabsTrigger value="finance">Finance</TabsTrigger> */}
            </TabsList>
          </TabsBase>
          <Sheet.ScrollArea className="flex flex-col gap-2">
            <TabsBase value={params?.classroomTab}>
              <TabsContent value="students" className="h-screen">
                <ClassroomStudents departmentId={viewClassroomId} />
              </TabsContent>
              <TabsContent value="subjects" className="h-screen">
                <ClassroomSubject departmentId={viewClassroomId} />
              </TabsContent>
            </TabsBase>
          </Sheet.ScrollArea>
        </Sheet.PrimaryContent>
        <Sheet.PrimaryContent>
          <Sheet.Footer className="bg-red-400">Student Footer</Sheet.Footer>
        </Sheet.PrimaryContent>
        <StudentForm
          schoolSessionId={classRoom?.classRoom?.session?.id}
          sessionTermId={classRoom?.classRoom?.session?.term?.id}
        />
        <ClassroomSubjectSecondaryForm />
        <ClassroomSubjectOverviewSecondary />
      </Sheet.MultiContent>
    </>
  );
}

function StudentForm({ schoolSessionId, sessionTermId }) {
  const ctx = useClassroomParams();
  if (ctx.secondaryTab != "student-form") return null;
  return (
    <>
      <Sheet.SecondaryContent>
        <Sheet.SecondaryHeader>
          <Sheet.Header className="bg-background flex-row items-start gap-4 space-y-0">
            {/* <Sheet.CloseSecondary /> */}
            <div className="grid gap-2">
              <Sheet.Title>
                <>Title</>
              </Sheet.Title>
              <Sheet.Description>
                <>Subtitle</>
              </Sheet.Description>
            </div>
          </Sheet.Header>
        </Sheet.SecondaryHeader>
        {/* <Sheet.SecondaryHeader ctx={ctx} title="New  Student" /> */}
        <Sheet.Content>
          <FormContext
            defaultValues={{
              classRoomId: ctx?.viewClassroomId,
              termForms: [
                {
                  schoolSessionId,
                  sessionTermId,
                },
              ],
            }}
          >
            <Form />
            <Sheet.SecondaryFooter>
              <StudentFormAction />
            </Sheet.SecondaryFooter>
          </FormContext>
        </Sheet.Content>
      </Sheet.SecondaryContent>
    </>
  );
}
function LoadingSkeleton() {
  return (
    <>
      <Sheet.Header>
        <Sheet.Title></Sheet.Title>
        <Sheet.Description asChild>
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-8 col-span-1" />
            <Skeleton className="h-8 col-span-2" />
            <div className=""></div>
          </div>
        </Sheet.Description>
      </Sheet.Header>
      <div className="grid grid-cols-6 gap-4">
        <div className=""></div>
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <div className=""></div>

        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />

        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />

        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />
      </div>
    </>
  );
}
