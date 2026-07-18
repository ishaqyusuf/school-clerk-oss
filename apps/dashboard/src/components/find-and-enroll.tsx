import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "./static-trpc";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Item } from "@school-clerk/ui/composite";
import { useDeferredValue, useState } from "react";
import { Button } from "@school-clerk/ui/button";
import { useStudentFormContext } from "./students/form-context";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
interface Props {
  onSelect?;
  query?;
}
export function FindAndEnroll(props: Props) {
  const academicDataDirection = useAcademicDataDirection();
  const deferredSearch = useDeferredValue(props?.query);

  const { control, getValues } = useStudentFormContext();
  const {
    mutate,
    data: enrolledData,
    error,
    isPending,
  } = useMutation(
    _trpc.academics.entrollStudentToTerm.mutationOptions({
      onSuccess() {
        //   svc.refresh();
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.analytics.queryKey(),
        });
      },
      meta: {
        toastTitle: {
          loading: "Enrolling...",
          success: "Enrolled",
          error: "Unable to complete!",
        },
      },
    })
  );
  const { data: result } = useQuery(
    _trpc.students.index.queryOptions(
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
  const enroll = (studentId) => {
    const data = getValues();
    const termForm = data?.termForms?.[0];
    mutate({
      classroomDepartmentId: data.classRoomId,
      sessionTermId: termForm?.sessionTermId,
      schoolSessionId: termForm?.schoolSessionId,
      studentId,
    });
  };
  return (
    <div className="grid grid-cols-2 gap-2 w-full ">
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
