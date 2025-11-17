import { _qc, _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { Collapsible, Item, Tabs } from "@school-clerk/ui/composite";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { cn } from "@school-clerk/ui/cn";
import { studentDisplayName } from "@/utils/utils";
import { Menu } from "@school-clerk/ui/custom/menu";
import { Check, Import } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { RouterInputs } from "@api/trpc/routers/_app";
import { Arabic } from "@/components/arabic";
import { Button } from "@school-clerk/ui/button";
interface Props {
  classrooms: { title: string }[];
  students: {
    name: string;
    surname: string;
    otherName?: string;
    gender?: string;
    classRoom: string;
  }[];
}
const schema = z.object({
  activities: z.array(
    z.object({
      resolution: z.enum(["create_term", "create", "ignore", "delete_match"]),
      status: z.enum(["ready", "conflict", "success", "pending"]),
      matches: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          surname: z.string(),
          otherName: z.string().optional().nullable(),
          gender: z.string().optional().nullable(),
          classRoom: z.string(),
          classroomDepartmentId: z.string(),
          studentSessionFormId: z.string().optional().nullable(),
          termId: z.string(),
          termSheetId: z.string(),
          termName: z.string(),
          termStartDate: z.any(),
          sessionName: z.string(),
        })
      ),
      student: z.object({
        id: z.string(),
        name: z.string(),
        surname: z.string(),
        otherName: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        classRoom: z.string(),
      }),
      classRoom: z.object({
        id: z.string(),
        departmentName: z.string(),
      }),
    })
  ),
});
export function ImportActivity({ classrooms, students }: Props) {
  const { data: records } = useQuery(
    _trpc.students.studentsRecentRecord.queryOptions({})
  );
  const form = useZodForm(schema, {});

  useEffect(() => {
    if (!records?.students?.length) return;

    const activities = students.map((student) => {
      const nameMatching = records.students.filter((m) =>
        // m.name.localeCompare(student.name)
        compareArabic(student.name, m.name)
      );
      const matches = records.students.filter(
        (m) =>
          compareArabic(student.name, m.name) &&
          compareArabic(student.surname, m.surname)
        // m.name.localeCompare(student.name) &&
        // m.surname.localeCompare(student.surname)
      );
      const classRoom = records.classDepartments.find((cd) =>
        compareArabic(cd.departmentName, student.classRoom)
      );
      const classMatch = matches.some(
        (a) => a.classroomDepartmentId === classRoom?.id
      );
      const termMatch = matches.some(
        (a) => a.termId === records?.sessionTermId
      );
      return {
        matches,
        student,
        classRoom,
        status: matches.length
          ? classMatch && termMatch
            ? "success"
            : classMatch
            ? "pending"
            : "conflict"
          : "ready",
        resolution: undefined,
      };
    });
    console.log({ activities, records });
    form.reset({
      activities,
    });
  }, [records, classrooms, students]);
  const { fields, append, insert, update } = useFieldArray({
    name: "activities",
    control: form.control,
    keyName: "_id",
  });
  const {
    mutate: enroll,
    data: enrolledData,
    error,
    isPending: isEnrolling,
  } = useMutation(
    _trpc.academics.entrollStudentToTerm.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        // onSuccess() {
        const studentId = (variables as any).studentId;
        const index = fields.findIndex((a) =>
          a.matches?.some((s) => s.id === studentId)
        );
        const studentIndex = fields[index]?.matches?.findIndex(
          (i) => i.id === studentId
        );
        update(index, {
          ...fields[index],
          status: "success",
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.studentsRecentRecord.queryKey(),
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
  const { mutate: createStudent, isPending: isCreating } = useMutation(
    _trpc.students.createStudent.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      onError(error, variables, onMutateResult, context) {
        console.log({
          error,
          variables,
        });
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  return (
    <>
      <Tabs.Root defaultValue="activties">
        <Tabs.List>
          <Tabs.Trigger value="activties">Activities</Tabs.Trigger>
          <Tabs.Trigger value="conflicts">Conflicts</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="activties">
          <div className="space-y-2 font-mono text-xs max-h-96 overflow-y-auto">
            {fields.length === 0 ? (
              <div className="text-muted-foreground">No activities yet</div>
            ) : (
              fields.map((activity, idx) => (
                <Collapsible
                  className={cn(
                    `rounded border ${statusColors[activity.status]}`
                  )}
                  key={activity._id}
                >
                  <Collapsible.Trigger
                    // asChild={!activity?.matches?.length}
                    className="flex w-full"
                  >
                    <div
                      key={activity._id}
                      // initial={{ opacity: 0, x: -10 }}
                      // animate={{ opacity: 1, x: 0 }}
                      // transition={{ delay: idx * 0.05 }}
                      className={`p-2 flex w-full items-center justify-between`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">
                          {statusIcon[activity.status]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate inline-flex gap-1">
                            {/* <span className="text-muted-foreground">
                              line {idx + 1}:
                            </span>{" "} */}
                            <Arabic className="font-medium text-sm">
                              {studentDisplayName(activity.student)}
                              {/* {activity.student.name} {activity.student.surname} */}
                            </Arabic>

                            <Arabic
                              className={cn("text-muted-foreground ml-1")}
                            >
                              {activity.classRoom?.departmentName ||
                                activity.student.classRoom}
                              {activity?.classRoom?.id && (
                                <>{statusIcon?.success}</>
                              )}
                            </Arabic>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {activity.status} | {activity?.matches?.length}
                          </div>
                          {!activity?.matches?.length && (
                            <Button
                              onClick={(e) => {
                                const student = activity.student;
                                e.preventDefault();
                                const formData = {
                                  name: student.name,
                                  surname: student.surname,
                                  otherName: student.otherName,
                                  gender:
                                    student.gender == "M" ? "Male" : "Female",
                                  classRoomId: activity.classRoom.id,
                                  termForms: [
                                    {
                                      sessionTermId: records.sessionTermId,
                                      schoolSessionId: records.schoolSessionId,
                                    },
                                  ],
                                };
                                console.log(formData);
                                // return;
                                createStudent(formData);
                              }}
                            >
                              <Import className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* {activity.action && (
                    <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {activity.action}
                    </div>
                  )} */}
                    </div>
                  </Collapsible.Trigger>
                  <Collapsible.Content className="p-2 text-primary">
                    <Item.Group dir="rtl">
                      {activity.matches?.map((m, mi) => (
                        <Item variant="muted" key={mi}>
                          <Item.Title>{studentDisplayName(m)}</Item.Title>
                          <Item.Content>
                            <Arabic>
                              <Item.Description>
                                <span>{m.classRoom || "no class"}</span>
                                <span>
                                  {m.termName} | {m.sessionName}
                                </span>
                              </Item.Description>
                            </Arabic>
                            <Item.Actions>
                              <SubmitButton
                                variant="outline"
                                size="icon"
                                isSubmitting={isEnrolling}
                                onClick={(e) => {
                                  const enrollData = {
                                    classroomDepartmentId:
                                      activity.classRoom.id,
                                    schoolSessionId: records.schoolSessionId,
                                    sessionTermId: records.sessionTermId,
                                    studentId: m.id,
                                    studentSessionFormId:
                                      m.studentSessionFormId,
                                  } as RouterInputs["academics"]["entrollStudentToTerm"];
                                  console.log(enrollData);

                                  enroll(enrollData);
                                }}
                                type="button"
                              >
                                <Check className="size-4" />
                              </SubmitButton>
                              {/* <Menu Icon={MenuIcon}>
                                <Menu.Item></Menu.Item>
                              </Menu> */}
                            </Item.Actions>
                          </Item.Content>
                        </Item>
                      ))}
                    </Item.Group>
                  </Collapsible.Content>
                </Collapsible>
              ))
            )}
          </div>
        </Tabs.Content>
        <Tabs.Content value="conflicts"></Tabs.Content>
      </Tabs.Root>
    </>
  );
}
const statusColors = {
  pending: "text-yellow-600   ",
  success: "text-green-600  ",
  conflict: "text-orange-600    ",
  error: "text-red-600    ",
};
const statusIcon = {
  pending: "⏳",
  success: "✓",
  conflict: "⚠",
  error: "✕",
};
function normalizeArabic(str) {
  if (!str) return "";

  // remove tashkeel / diacritics and other mark ranges
  // common ranges: \u064B-\u065F (harakat + tashkeel), \u0610-\u061A, \u06D6-\u06ED (extended marks)
  // also remove tatweel (ـ)
  str = str
    .normalize("NFC")
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g,
      ""
    );

  // normalize common letter variants
  const map = {
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ٱ: "ا",
    ى: "ي",
    ئ: "ي", // optional: sometimes map hamza-y to ي
    ؤ: "و", // optional: map hamza-w to و
    ة: "ه", // optional: map ta marbuta to ه (use only if you want this)
  };

  str = str.replace(/[\u0621-\u06D3\u06FA-\u06FF]/g, (ch) => map[ch] || ch);

  // trim & collapse spaces
  return str.replace(/\s+/g, " ").trim();
}
function compareArabic(a, b) {
  return normalizeArabic(a) === normalizeArabic(b);
}
