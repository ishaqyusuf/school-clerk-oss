import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGlobalParams, usePostMutate } from "../../use-global";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { Fragment, useEffect, useMemo, useState } from "react";
import { StudentSubjectAssessment } from "@api/db/queries/first-term-data";
import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { enToAr, sum } from "@/utils/utils";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { cn } from "@school-clerk/ui/cn";
import { generateRandomString } from "@school-clerk/utils";
import { useDebounce } from "use-debounce";
import { toast } from "@school-clerk/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { calculateScore, sortClassroomStudents } from "../../utils";
import { Input } from "@school-clerk/ui/input";
import { arabic } from "@/fonts";

export function ClassroomStudents({ classRoomId }) {
  const trpc = useTRPC();
  const g = useGlobalParams();
  const opened =
    g.params.openStudentsForClass === classRoomId &&
    g.params.tab === "classStudents";
  const { data } = useQuery(
    trpc.ftd.getClassroomStudents.queryOptions(
      {
        classRoomId,
      },
      {
        enabled: opened,
      },
    ),
  );

  const [sortBy, setSortBy] = useState<"name" | "grade">("name");

  const sortedStudents = useMemo(() => {
    console.log(data);
    return sortClassroomStudents([...(data?.students || [])], sortBy);
  }, [data?.students, sortBy]);

  if (!opened) return null;
  return (
    <tr className={cn(arabic.className)}>
      <td colSpan={100}>
        <div className=" overflow-x-auto  w-[90vw] bg-gray-100 rounded-lg">
          <div className="flex gap-4 mb-4 items-center">
            <div className=""></div>
            <p className="font-semibold text-lg">Students</p>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Subject:</label>
              <Select
                onValueChange={(value) =>
                  // setSortBy(value as "name" | "grade")
                  g.setParams({
                    studentSubjectFilterId: value == "0" ? null : Number(value),
                  })
                }
                defaultValue={String(g.params.studentSubjectFilterId || 0)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {g.params.entryMode || <SelectItem value="0">All</SelectItem>}
                  {data?.classSubjects?.classroomSubjects?.map((subject) => (
                    <SelectItem value={String(subject.postId)}>
                      {subject?.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Sort By:</label>
              <Select
                onValueChange={(value) => setSortBy(value as "name" | "grade")}
                defaultValue={sortBy}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="grade">Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto relative" style={{ height: "600px" }}>
            <table className="w-full pb-56 md:pb-4 border-collapse bg-white">
              <thead className="sticky top-0 bg-gray-200 z-20">
                <tr>
                  <th className="border p-2 sticky left-0 bg-gray-200 z-30">
                    Student Name
                  </th>
                  {data?.classSubjects?.classroomSubjects
                    // .filter((sa) =>
                    //   ,
                    // )
                    // ?.
                    .map((cs, csi) => (
                      <th
                        className={cn(
                          "border text-center p-2",
                          (g.params.studentSubjectFilterId || g.params.entryMode
                            ? g.params.studentSubjectFilterId == cs.postId
                            : true) || "hidden",
                          csi % 2 == 0 ? "bg-muted" : "",
                        )}
                        colSpan={cs?.assessments?.length + 1}
                        key={csi}
                      >
                        {cs.title}
                      </th>
                    ))}
                </tr>
                <tr>
                  <th className="border p-2 sticky left-0 bg-gray-200 z-30"></th>
                  {data?.classSubjects?.classroomSubjects
                    // .filter((sa) =>
                    //   g.params.studentSubjectFilterId || g.params.entryMode
                    //     ? g.params.studentSubjectFilterId == sa.postId
                    //     : true,
                    // )
                    ?.map((cs, csi) => (
                      <Fragment key={csi}>
                        {cs?.assessments?.map((ass, asi) => (
                          <th
                            className={cn(
                              "transform rotate-45 h-16 border p-2",
                              (g.params.studentSubjectFilterId ||
                              g.params.entryMode
                                ? g.params.studentSubjectFilterId == cs.postId
                                : true) || "hidden",
                              csi % 2 == 0 ? "bg-muted" : "",
                            )}
                            colSpan={1}
                            key={asi}
                          >
                            {ass.title}{" "}
                            <span className="text-xs fontbold">
                              ({enToAr(ass?.obtainable)})
                            </span>
                          </th>
                        ))}
                        <th
                          className={cn(
                            "border transform rotate-45 p-2",
                            (g.params.studentSubjectFilterId ||
                            g.params.entryMode
                              ? g.params.studentSubjectFilterId == cs.postId
                              : true) || "hidden",
                            csi % 2 == 0 ? "bg-muted" : "",
                          )}
                        >
                          Total
                        </th>
                      </Fragment>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedStudents.map((student, i) => (
                  <tr className="hover:bg-gray-50" key={student.postId}>
                    <td className="border p-2 sticky left-0 bg-white z-10">
                      <div className="flex gap-2 items-center">
                        <span className="font-mono text-sm text-gray-500">
                          {enToAr(i + 1)}.
                        </span>
                        <span className="font-medium">{student.firstName}</span>
                        <span className="font-semibold">{student.surname}</span>
                        <span className="text-gray-600">
                          {student.otherName}
                        </span>
                      </div>
                    </td>
                    {student.subjectAssessments
                      // .filter((sa) =>
                      //   g.params.studentSubjectFilterId || g.params.entryMode
                      //     ? g.params.studentSubjectFilterId ==
                      //       sa.classroomSubjectId
                      //     : true,
                      // )
                      .map((sa, sai) => (
                        <Assessment
                          show={
                            g.params.studentSubjectFilterId ||
                            g.params.entryMode
                              ? g.params.studentSubjectFilterId ==
                                sa.classroomSubjectId
                              : true
                          }
                          studentId={student.postId}
                          student={student}
                          index={i % 2 == 0 ? sai : sai + 1}
                          subjectAssessment={sa}
                          key={sai}
                        />
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
}

type ClassRoomStudent =
  RouterOutputs["ftd"]["getClassroomStudents"]["students"][number];
interface AssessmentProps {
  subjectAssessment: ClassRoomStudent["subjectAssessments"][number]; //["assessments"][number];
  student: ClassRoomStudent; //["assessments"][number];
  index;
  studentId;
  show?: boolean;
}
function Assessment({
  subjectAssessment,
  student,
  show,
  index,
}: AssessmentProps) {
  const [opened, setOpened] = useState(false);

  const { assessments: _assessments } = subjectAssessment;
  const [assessments, setAssessments] = useState(_assessments);

  const scoreUpdated = (updates: ScoreUpdates[]) => {
    setAssessments((prev) => {
      return prev.map((p) => {
        // p.studentAssessment.classSubjectId;
        const update = updates.find(
          (u) => u.subjectAssessmentId == p.subjectAssessment.postId,
        );
        if (update) {
          if (!p.studentAssessment)
            p.studentAssessment = {
              classId: student?.classId,
              type: "student-subject-assessment",
              studentId: student.postId,
              subjectAssessmentId: p.subjectAssessment?.postId,
              classSubjectId: p.subjectAssessment?.classSubjectId,
              calculatedScore: 0,
              markObtained: 0,
              // postId: update.studentSubjectAssessmentId,
            };
          p.studentAssessment.markObtained = update.markObtained;
        }
        return p;
      });
    });
  };
  const total = sum(
    assessments?.map((a) =>
      calculateScore(
        a?.studentAssessment?.markObtained,
        a?.subjectAssessment?.assessmentTotal,
        a?.subjectAssessment?.obtainable,
      ),
    ),
  );
  return (
    <Fragment>
      {assessments.map((ass, asi) => (
        <td
          onClick={(e) => {
            setOpened(!opened);
          }}
          className={cn(
            "score",
            index % 2 == 0 ? "bg-muted" : "bg",
            show || "hidden",
          )}
          key={asi}
        >
          {ass.studentAssessment?.markObtained
            ? enToAr(
                calculateScore(
                  ass.studentAssessment?.markObtained,
                  ass?.subjectAssessment?.assessmentTotal,
                  ass?.subjectAssessment?.obtainable,
                ),
              )
            : "-"}
          {/* {JSON.stringify([
            ass.studentAssessment?.markObtained,
            ass?.subjectAssessment?.assessmentTotal,
            ass?.subjectAssessment?.obtainable,
          ])} */}
          {/* {ass.studentAssessment?.markObtained} */}
        </td>
      ))}
      <Popover modal={true} open={opened} onOpenChange={setOpened}>
        <PopoverTrigger asChild>
          {/* {children} */}
          <td
            className={cn(
              "score total",
              index % 2 == 0 ? "bg-muted" : "bg",
              show || "hidden",
            )}
          >
            {total ? enToAr(total) : "-"}
          </td>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="grid gap-4">
            {assessments?.map((a, ai) => (
              <div
                key={ai}
                className={cn(a.subjectAssessment.obtainable || "hidden")}
              >
                <AssessmentInput
                  key={ai}
                  label={a.subjectAssessment?.title}
                  onUpdate={scoreUpdated}
                  assessmentData={a}
                  value={a.studentAssessment?.markObtained}
                  meta={{
                    classId: student?.classId,
                    type: "student-subject-assessment",
                    studentId: student.postId,
                    subjectAssessmentId: a.subjectAssessment?.postId,
                    classSubjectId: a.subjectAssessment?.classSubjectId,
                    calculatedScore: 0,
                    markObtained: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </Fragment>
  );
}
interface ScoreUpdates {
  subjectAssessmentId;
  markObtained;
}
interface AssessmentInput {
  onUpdate?(updates: ScoreUpdates[]);
  label?;
  value?;
  // subjectAssessment: ClassSubjectAssessment
  assessmentData: ClassRoomStudent["subjectAssessments"][number]["assessments"][number];
  meta?: StudentSubjectAssessment;
}
function AssessmentInput({
  value: _value,
  label,
  onUpdate,
  meta,
  assessmentData,
}: AssessmentInput) {
  const [typing, setTyping] = useState(null);
  const [debounceValue] = useDebounce(typing, 300, {});
  const [focus, setFocus] = useState(false);
  const trpc = useTRPC();
  const updater = useMutation(
    trpc.ftd.updateStudentAssessment.mutationOptions({
      onSuccess(data, variables, context) {
        onUpdate?.([
          {
            markObtained: data.markObtained,
            subjectAssessmentId: data.subjectAssessmentId,
          },
        ]);
        toast({
          variant: "success",
          title: "Assessment updated successfully",
          description: "Assessment updated successfully",
        });
      },
      onError(error, variables, context) {},
    }),
  );
  const [value, setValue] = useState(_value);
  const obtainable =
    assessmentData?.subjectAssessment?.assessmentTotal ||
    assessmentData?.subjectAssessment?.obtainable;
  useEffect(() => {
    if (!debounceValue) return;
    const _meta = { ...meta };
    _meta.markObtained = Number(value) || 0;
    _meta.calculatedScore = calculateScore(
      _meta.markObtained,
      assessmentData?.subjectAssessment?.assessmentTotal,
      assessmentData?.subjectAssessment?.obtainable,
    );

    //Number(value) || 0;
    if (_meta.markObtained > obtainable) {
      toast({
        variant: "error",
        title: "Mark obtained cannot be greater than obtainable mark",
        description: "Mark obtained cannot be greater than obtainable mark",
      });
      return;
    }

    updater.mutate({
      meta: _meta,
    });
  }, [debounceValue]);

  return (
    <>
      {/* <span>{assessmentData?.studentAssessment?.postId || "NOT FOUDN"}</span> */}
      <NumericFormat
        disabled={!obtainable}
        value={value}
        customInput={Input}
        dir={`rtl`}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onInput={() => setTyping(generateRandomString(2))}
        type="tel"
        suffix={`/${obtainable}`}
        prefix={`${label}:`}
        // placeholder={`${label}: -/${obtainable}`}
        placeholder={`${label}: -/${obtainable}`}
        className={cn(
          updater?.isPending ? "border-dashed" : "",
          updater.isSuccess && "border-green-500",
        )}
        onValueChange={(e) => {
          setValue(e.floatValue);
        }}
      />
    </>
  );
}
