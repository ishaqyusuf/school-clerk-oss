import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { entrollStudentToTermSchema } from "@school-clerk/assessment-results";
import { toast } from "@school-clerk/ui/use-toast";
import { Item } from "@school-clerk/ui/composite";
import { useDeferredValue, useEffect, useRef } from "react";
import { Button } from "@school-clerk/ui/button";
import { useStudentFormContext } from "./students/form-context";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
interface Props {
  onSelect?: () => void;
  query?;
}
export function FindAndEnroll(props: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const academicDataDirection = useAcademicDataDirection();
  const deferredSearch = useDeferredValue(props?.query);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const { getValues } = useStudentFormContext();
  const {
    mutate,
    error,
    isPending,
  } = useMutation(
    trpc.academics.entrollStudentToTerm.mutationOptions({
      retry: false,
      onSuccess() {
        //   svc.refresh();
        queryClient.invalidateQueries({
          queryKey: trpc.students.index.infiniteQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.students.analytics.queryKey(),
        });
        queryClient.invalidateQueries({ queryKey: trpc.students.overview.queryKey() });
        if (mounted.current) props.onSelect?.();
      },
      meta: {
        toastTitle: {
          loading: "Enrolling...",
          success: "Enrollment confirmed",
          error: "Unable to complete!",
        },
      },
    })
  );
  const { data: result } = useQuery(
    trpc.students.index.queryOptions(
      {
        status: "not enrolled",
        size: 5,
        q: deferredSearch,
      },
      {
        enabled: !!deferredSearch,
      }
    )
  );
  const enroll = (studentId: string) => {
    if (isPending) return;
    const data = getValues();
    const termForm = data?.termForms?.[0];
    const parsed = entrollStudentToTermSchema.safeParse({
      classroomDepartmentId: data.classRoomId,
      sessionTermId: termForm?.sessionTermId,
      schoolSessionId: termForm?.schoolSessionId,
      studentId,
    });
    if (!parsed.success) {
      toast({ title: "Select a classroom, academic session and term before enrolling.", variant: "error" });
      return;
    }
    mutate(parsed.data);
  };
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      {error ? <p role="alert" className="break-words text-sm text-destructive sm:col-span-2">Enrollment could not be confirmed. Refresh student history before trying again.</p> : null}
      {result?.data?.map((student) => (
        <Item dir={academicDataDirection} variant="outline" key={student?.id}>
          <Item.Content>
            <Item.Title>
              <span dir="auto">{student.studentName}</span>
            </Item.Title>
            <Item.Description className="">
              <span dir="auto">{student?.department || "-"}</span>
            </Item.Description>
          </Item.Content>
          <Item.Actions dir="ltr">
            <Button
              onClick={(e) => {
                enroll(student.id);
              }}
              type="button"
              size="sm"
              className="min-h-11"
              disabled={isPending}
              variant="outline"
            >
              Enroll
            </Button>
          </Item.Actions>
        </Item>
      ))}
      {/* <InputGroup>
        <InputGroup.Input placeholder="Find and Enroll..." />
        <InputGroup.Addon>
          <Icons.Search />
        </InputGroup.Addon>
        <InputGroup.Addon align="inline-end">
          {result?.meta?.count} results
        </InputGroup.Addon>
      </InputGroup> */}
      <div className=""></div>
    </div>
  );
}
