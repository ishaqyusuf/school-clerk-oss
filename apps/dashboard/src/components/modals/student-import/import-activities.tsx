import { _qc, _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { Collapsible, Item, Select, Tabs } from "@school-clerk/ui/composite";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { cn } from "@school-clerk/ui/cn";
import { studentDisplayName } from "@/utils/utils";
import { Menu } from "@school-clerk/ui/custom/menu";
import { Check, Import, Link } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { RouterInputs } from "@api/trpc/routers/_app";
import { Arabic } from "@/components/arabic";
import { Button } from "@school-clerk/ui/button";
import { Separator } from "@school-clerk/ui/separator";

interface Props {
  classrooms: { title: string }[];
  students: {
    name: string;
    surname: string;
    otherName?: string;
    gender?: string;
    classRoom: string;
    classroomDepartmentId: string;
    lineNumber: number;
    originalText: string;
    parsedGender?: "M" | "F";
  }[];
}

const matches = z.object({
  id: z.string(),
  name: z.string(),
  surname: z.string().optional().nullable(),
  otherName: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  classRoom: z.string().optional().nullable(),
  classroomDepartmentId: z.string().optional().nullable(),
  studentSessionFormId: z.string().optional().nullable(),
  studentTermFormId: z.string().optional().nullable(),
  termId: z.string().optional().nullable(),
  termSheetId: z.string().optional().nullable(),
  termName: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  sessionName: z.string().optional().nullable(),
  isCurrentTermMatch: z.boolean().optional().nullable(),
  isCurrentClassroomMatch: z.boolean().optional().nullable(),
  confidence: z.number().optional().nullable(),
  reason: z.string().optional().nullable(),
});

const schema = z.object({
  activities: z.array(
    z.object({
      resolution: z.enum(["create_term", "create", "ignore", "delete_match"]).optional().nullable(),
      status: z.enum(["ready", "conflict", "success", "pending"]),
      partialMatches: z.array(matches),
      matches: z.array(matches),
      student: z.object({
        id: z.string(),
        name: z.string(),
        surname: z.string(),
        otherName: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        classRoom: z.string(),
        classroomDepartmentId: z.string(),
        lineNumber: z.number(),
        originalText: z.string(),
        parsedGender: z.string().optional().nullable(),
      }),
      classRoom: z.object({
        id: z.string(),
        departmentName: z.string(),
      }).optional().nullable(),
      needsGender: z.boolean().optional().nullable(),
      inferredGender: z.string().optional().nullable(),
      genderInferenceDetails: z.any().optional().nullable(),
    })
  ),
});
export function ImportActivity({ classrooms, students }: Props) {
  const [classroomDeptId, setClassroomDeptId] = useState<string>("");
  const { data: records, refetch, isPending: isRecentRecordsPending } = useQuery(
    _trpc.students.studentsRecentRecord.queryOptions({})
  );
  const form = useZodForm(schema, {});

  useEffect(() => {
    if (classroomDeptId) return;
    if (!records?.classDepartments?.length) return;
    const firstStudent = students[0];
    if (!firstStudent) return;
    if (firstStudent.classroomDepartmentId) {
      setClassroomDeptId(firstStudent.classroomDepartmentId);
      return;
    }
    const matched = records.classDepartments.find(
      (cd) =>
        compareArabic(cd.departmentName, firstStudent.classRoom) ||
        compareArabic(cd.classRoom.name, firstStudent.classRoom)
    );
    if (matched) {
      setClassroomDeptId(matched.id);
    } else {
      setClassroomDeptId(records.classDepartments[0].id);
    }
  }, [records, students, classroomDeptId]);

  const verifyInput = useMemo(() => {
    if (!classroomDeptId || !students.length) return null;
    return {
      classroomDepartmentId: classroomDeptId,
      rows: students.map((s) => ({
        lineNumber: s.lineNumber,
        originalText: s.originalText,
        name: s.name,
        surname: s.surname,
        originalClassRoom: s.classRoom,
        otherName: s.otherName || null,
        gender:
          s.gender === "M"
            ? "Male"
            : s.gender === "F"
              ? "Female"
              : s.gender || null,
      })),
    };
  }, [classroomDeptId, students]);

  const { data: verificationReport, isPending: isVerifying, refetch: refetchVerification } = useQuery(
    _trpc.students.verifyStudentImport.queryOptions(verifyInput!, {
      enabled: !!verifyInput,
    })
  );

  useEffect(() => {
    if (!verificationReport?.results || !records) return;

    const classRoom = records.classDepartments.find((cd) => cd.id === classroomDeptId);

    const activities = verificationReport.results.map((row) => {
      let uiStatus: "ready" | "conflict" | "success" | "pending" = "ready";
      if (row.status === "matchFound" && row.fullMatch) {
        if (row.fullMatch.isCurrentTermMatch && row.fullMatch.isCurrentClassroomMatch) {
          uiStatus = "success";
        } else if (row.fullMatch.isCurrentClassroomMatch && !row.fullMatch.isCurrentTermMatch) {
          uiStatus = "pending";
        } else {
          uiStatus = "conflict";
        }
      } else if (row.status === "needsAttention") {
        uiStatus = "conflict";
      }

      return {
        matches: row.fullMatch ? [row.fullMatch] : [],
        partialMatches: row.suspectedMatches || [],
        student: {
          id: String(row.lineNumber),
          name: row.name,
          surname: row.surname,
          otherName: row.otherName || null,
          gender: row.inferredGender || row.inputGender || null,
          classRoom: classRoom?.departmentName || "",
          classroomDepartmentId: classroomDeptId,
          lineNumber: row.lineNumber,
          originalText: row.originalText,
          parsedGender: undefined,
        },
        classRoom: classRoom ? {
          id: classRoom.id,
          departmentName: classRoom.departmentName,
        } : undefined,
        status: uiStatus,
        resolution: undefined,
        needsGender: row.needsGender,
        inferredGender: row.inferredGender,
        genderInferenceDetails: row.genderInferenceDetails,
      };
    });

    form.reset({
      activities: activities as any,
    });
  }, [verificationReport, records, classroomDeptId]);
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
          queryKey: _trpc.students.analytics.queryKey(),
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
  const { mutate: updateStudent, isPending: isUpdatingStudent } = useMutation(
    _trpc.students.updateStudentBasicProfile.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.analytics.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.studentsRecentRecord.queryKey(),
        });
      },
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
  const { mutate: createStudent, isPending: isCreating } = useMutation(
    _trpc.students.createStudent.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.studentsRecentRecord.queryKey(),
        });
      },
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

  const {
    mutate: executeBatch,
    isPending: isExecutingBatch,
    data: batchResult,
  } = useMutation(
    _trpc.students.executeStudentImport.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.analytics.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.studentsRecentRecord.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.classrooms.all.queryKey({}),
        });
      },
      meta: {
        toastTitle: {
          loading: "Executing import...",
          success: "Import executed",
          error: "Import failed",
        },
      },
    })
  );

  const [rowSelections, setRowSelections] = useState<
    Record<
      number,
      {
        action: "import_new" | "keep_match" | "update_match_with_name";
        existingStudentId: string | null;
      }
    >
  >({});
  const [preSubmitError, setPreSubmitError] = useState<string | null>(null);

  const executeAll = () => {
    setPreSubmitError(null);

    if (!classroomDeptId) {
      setPreSubmitError("Select a target classroom before executing the import.");
      return;
    }

    const importRows: Array<{
      lineNumber: number;
      name: string;
      surname: string;
      otherName: string | null;
      gender: "Male" | "Female";
      action: "import_new" | "keep_match" | "update_match_with_name";
      existingStudentId: string | null;
    }> = [];
    const needsDecisionLines: number[] = [];

    fields.forEach((activity, idx) => {
      const selection = rowSelections[idx];
      const gender =
        activity.student.gender === "Female" || activity.student.gender === "F"
          ? "Female"
          : activity.student.gender === "Male" || activity.student.gender === "M"
            ? "Male"
            : null;

      if (!gender) {
        needsDecisionLines.push(idx + 1);
        return;
      }

      if (selection) {
        importRows.push({
          lineNumber: activity.student.lineNumber || idx + 1,
          name: activity.student.name,
          surname: activity.student.surname,
          otherName: activity.student.otherName ?? null,
          gender,
          action: selection.action,
          existingStudentId: selection.existingStudentId,
        });
        return;
      }

      const hasMatches = Boolean(activity.matches?.length || activity.partialMatches?.length);
      if (!hasMatches) {
        importRows.push({
          lineNumber: activity.student.lineNumber || idx + 1,
          name: activity.student.name,
          surname: activity.student.surname,
          otherName: activity.student.otherName ?? null,
          gender,
          action: "import_new",
          existingStudentId: null,
        });
        return;
      }

      needsDecisionLines.push(idx + 1);
    });

    if (needsDecisionLines.length > 0) {
      setPreSubmitError(
        "Lines " +
          needsDecisionLines.join(", ") +
          " need gender or an import action before execution."
      );
      return;
    }

    if (!importRows.length) {
      setPreSubmitError("No rows to execute.");
      return;
    }

    executeBatch({
      classroomDepartmentId: classroomDeptId,
      rows: importRows,
    });
  };

  const opts = ["all", "imported", "conflict", "new"] as const;
  const [show, setShow] = useState<(typeof opts)[number]>("all");

  return (
    <>
      <div className="flex gap-4 pb-2 items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target Classroom</span>
          <Select
            value={classroomDeptId}
            onValueChange={(e) => {
              setClassroomDeptId(e);
            }}
          >
            <Select.Trigger value={classroomDeptId} className="w-64 h-9">
              <Select.Value placeholder="Select Classroom" />
            </Select.Trigger>
            <Select.Content className="max-h-60 overflow-y-auto">
              {records?.classDepartments?.map((cd) => (
                <Select.Item value={cd.id} key={cd.id}>
                  {cd.classRoom.name} - {cd.departmentName}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Filter Status</span>
          <Select
            value={show}
            onValueChange={(e) => {
              setShow(e as (typeof opts)[number]);
            }}
          >
            <Select.Trigger value={show} className="w-32 h-9">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {opts.map((o) => (
                <Select.Item value={o} key={o}>
                  {o}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            refetch();
            refetchVerification();
          }}
          className="h-9 ml-auto"
        >
          Refresh
        </Button>
        <SubmitButton
          isSubmitting={isExecutingBatch}
          onClick={executeAll}
          className="h-9"
          type="button"
        >
          Execute All
        </SubmitButton>
      </div>

      {preSubmitError && (
        <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
          {preSubmitError}
        </div>
      )}
      {batchResult && (
        <div className="mb-2 rounded border bg-muted/20 p-3 text-xs font-mono">
          <div className="flex flex-wrap gap-4">
            <span className="text-green-600">Created: {batchResult.createdStudents}</span>
            <span className="text-blue-600">Kept: {batchResult.keptMatches}</span>
            <span className="text-orange-600">Updated: {batchResult.updatedMatches}</span>
            <span className="text-yellow-600">Term Sheets: {batchResult.termSheetsCreated}</span>
            <span className="text-red-600">Failed: {batchResult.failedRows}</span>
          </div>
          {batchResult.rows.filter((row) => row.status === "failed").length > 0 && (
            <div className="mt-1 text-red-600">
              {batchResult.rows
                .filter((row) => row.status === "failed")
                .map((row) => (
                  <div key={row.lineNumber}>
                    Line {row.lineNumber}: {row.reason}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <Separator />

      {isVerifying ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 font-mono text-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground animate-pulse">Running verification and match analysis...</p>
        </div>
      ) : (
        <div className="space-y-2 font-mono text-xs max-h-[50vh] overflow-y-auto pr-1">
          {fields.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center">No activities yet</div>
          ) : (
            fields
              ?.filter((a) => {
                switch (show) {
                  case "all":
                    return true;
                  case "conflict":
                    return a.status == "conflict";
                  case "new":
                    return a.status == "ready";
                  case "imported":
                    return a.status == "success";
                }
                return true;
              })
              .map((activity, idx) => (
                <Collapsible
                  className={cn(
                    `rounded-lg border transition-all duration-200 ${statusColors[activity.status]} bg-card`
                  )}
                  key={activity._id}
                >
                  <Collapsible.Trigger className="flex w-full text-left p-3 hover:bg-muted/30 focus:outline-none transition-colors">
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-base flex-shrink-0">
                          {statusIcon[activity.status]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Arabic className="font-semibold text-sm">
                              {studentDisplayName(activity.student)}
                            </Arabic>
                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                              {activity.student.gender || "No Gender Specified"}
                            </span>
                            {activity.student.otherName && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({activity.student.otherName})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Status: <span className="font-semibold uppercase">{activity.status}</span>
                            {activity.matches?.length > 0 && ` | ${activity.matches.length} exact match(es)`}
                            {activity.partialMatches?.length > 0 && ` | ${activity.partialMatches.length} suspected match(es)`}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        Line {idx + 1}
                      </span>
                    </div>
                  </Collapsible.Trigger>

                  <Collapsible.Content className="p-3 border-t border-dashed bg-muted/10 space-y-3">
                    {/* Gender Selection & Inference Details */}
                    {activity.needsGender && !activity.student.gender && (
                      <div className="flex flex-col gap-1.5 bg-destructive/5 dark:bg-destructive/10 p-2.5 rounded border border-destructive/20">
                        <span className="text-[10px] text-destructive font-bold uppercase">Gender Required</span>
                        <div className="flex items-center gap-2">
                          <Select
                            value={activity.student.gender || ""}
                            onValueChange={(val) => {
                              const currentActivities = form.getValues("activities");
                              currentActivities[idx].student.gender = val;
                              currentActivities[idx].needsGender = false;
                              form.reset({ activities: currentActivities });
                            }}
                          >
                            <Select.Trigger className="h-8 text-[11px] w-32">
                              <Select.Value placeholder="Select Gender" />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="Male">Male</Select.Item>
                              <Select.Item value="Female">Female</Select.Item>
                            </Select.Content>
                          </Select>
                          <span className="text-[10px] text-muted-foreground">Select a gender to proceed with import.</span>
                        </div>
                      </div>
                    )}

                    {activity.inferredGender && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded border border-emerald-200/50 flex flex-col gap-1">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase">Gender Inferred</span>
                        <span className="text-xs">
                          Inferred as <span className="font-semibold">{activity.inferredGender}</span>
                          {activity.genderInferenceDetails && (
                            <span className="text-muted-foreground font-normal ml-1 text-[10px]">
                              (confidence: {activity.genderInferenceDetails.confidence}%, samples: {activity.genderInferenceDetails.sampleSize})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Exact Matches (Enrolling) */}
                    {activity.matches && activity.matches.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Exact Matching Student Found</span>
                        <Item.Group dir="rtl" className="w-full">
                          {activity.matches.map((m, mi) => (
                            <Item variant="muted" key={mi} className="w-full flex items-center justify-between p-2 rounded bg-background/50 border">
                              <div className="flex flex-col gap-0.5 text-right flex-1">
                                <span className="font-semibold text-xs">{studentDisplayName(m)}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  Classroom: {m.classRoom || "No Classroom"} | Term: {m.termName || "None"} ({m.sessionName || "No Session"})
                                </span>
                              </div>
                              <Item.Actions className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-600 font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200">
                                  {m.isCurrentTermMatch && m.isCurrentClassroomMatch ? "Enrolled" : "Existing"}
                                </span>
                                <Button
                                  variant={
                                    rowSelections[idx]?.action === "keep_match" &&
                                    rowSelections[idx]?.existingStudentId === m.id
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="h-7 text-[10px] px-2.5"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setRowSelections((prev) => ({
                                      ...prev,
                                      [idx]: { action: "keep_match", existingStudentId: m.id },
                                    }));
                                  }}
                                >
                                  Keep Match
                                </Button>
                                {(!m.isCurrentTermMatch || !m.isCurrentClassroomMatch) && (
                                  <SubmitButton
                                    variant="outline"
                                    size="sm"
                                    isSubmitting={isEnrolling}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const enrollData = {
                                        classroomDepartmentId: classroomDeptId,
                                        schoolSessionId: records.schoolSessionId,
                                        sessionTermId: records.sessionTermId,
                                        studentId: m.id,
                                        studentSessionFormId: m.studentSessionFormId,
                                      } as RouterInputs["academics"]["entrollStudentToTerm"];
                                      enroll(enrollData);
                                    }}
                                    type="button"
                                    className="h-7 text-[10px] px-2.5"
                                  >
                                    <Check className="size-3 mr-1" /> Enroll in this Classroom & Term
                                  </SubmitButton>
                                )}
                              </Item.Actions>
                            </Item>
                          ))}
                        </Item.Group>
                      </div>
                    )}

                    {/* Suspected Matches (Update / Link) */}
                    {activity.partialMatches && activity.partialMatches.length > 0 && (
                      <div className="space-y-1.5 border-t border-dashed pt-2">
                        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Suspected Existing Students (Typos / Close Matches)</span>
                        <div className="space-y-1.5">
                          {activity.partialMatches.map((a, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between bg-background/50 p-2 rounded border border-amber-200/30">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold">{studentDisplayName(a)}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  Classroom: {a.classRoom || "No classroom"} | Confidence: <span className="font-semibold">{a.confidence}%</span>
                                  {a.reason && ` - ${a.reason}`}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] px-2.5"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setRowSelections((prev) => ({
                                    ...prev,
                                    [idx]: {
                                      action: "update_match_with_name",
                                      existingStudentId: a.id,
                                    },
                                  }));
                                }}
                              >
                                Select Update Match
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Import As New Button */}
                    {activity.status === "ready" && (
                      <div className="border-t border-dashed pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">This student name does not match any existing record.</span>
                        <Button
                          disabled={activity.needsGender && !activity.student.gender}
                          onClick={(e) => {
                            const student = activity.student;
                            e.preventDefault();
                            setRowSelections((prev) => ({
                              ...prev,
                              [idx]: { action: "import_new", existingStudentId: null },
                            }));
                          }}
                          className="h-8 text-[11px] px-3"
                        >
                          <Import className="size-3.5 mr-1" /> Select Import as New
                        </Button>
                      </div>
                    )}
                  </Collapsible.Content>
                </Collapsible>
              ))
          )}
        </div>
      )}
    </>
  );
}
const statusColors: Record<string, string> = {
  ready: "text-blue-600",
  pending: "text-yellow-600",
  success: "text-green-600",
  conflict: "text-orange-600",
  error: "text-red-600",
};
const statusIcon: Record<string, string> = {
  ready: "○",
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
