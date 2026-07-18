import { Skeletons } from "@school-clerk/ui/skeletons";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useDeferredValue, useEffect, useState } from "react";
import { _trpc } from "./static-trpc";
import { InputGroup } from "@school-clerk/ui/composite";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";
import { ScoreData, useAssessmentStore } from "@/store/assessment";
import { cn } from "@school-clerk/ui/cn";
import { useDebouncedCallback } from "use-debounce";
import { getScoreKey } from "@school-clerk/assessment-results";
import { useDebugToast } from "@/hooks/use-debug-console";
import { AlertCircle, Check, X } from "lucide-react";
import { Spinner } from "@school-clerk/ui/spinner";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { enToAr } from "@school-clerk/utils";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";

interface Props {
  // overview: RouterOutputs["subjects"]["overview"];
  deparmentSubjectId;
}
export function AssessmentSubmissions(props: Props) {
  return (
    <Suspense
      fallback={
        <Skeletons>
          <Skeletons.List />
        </Skeletons>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
function Content(props: Props) {
  const academicDataDirection = useAcademicDataDirection();
  const { filters } = useAssessmentRecordingParams();
  const { data, isPending } = useSuspenseQuery(
    _trpc.assessments.getSubjectAssessmentRecordings.queryOptions({
      deparmentSubjectId: props.deparmentSubjectId, //props.overview?.subject?.id,
      termId: filters?.termId,
    }),
  );
  const store = useAssessmentStore();
  useEffect(() => {
    if (isPending) return;
    useAssessmentStore.getState().update("data", data);
  }, [data, isPending]);
  const tableData =
    store.data?.departmentId === data.departmentId &&
    store.data?.sessionTermId === data.sessionTermId
      ? store.data
      : data;
  const visibleAssessments =
    tableData?.assessments?.filter((a) => !!a?.percentageObtainable) ?? [];
  return (
    <Table dir={academicDataDirection}>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">
            الطالب
          </TableHead>
          {visibleAssessments.map((a) => (
            <TableHead key={a.id} className="w-32">
              {a.displayTitle || a.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableData?.students?.map((student, si) => (
          <TableRow key={student.id}>
            <TableCell dir="auto">
              {enToAr(si + 1)}. {student.name}
            </TableCell>
            {visibleAssessments.map((a) => (
              <ScoreInput
                key={a.id}
                assessment={a}
                student={student}
                scoreKey={getScoreKey(a.id, student.termId)}
                scoreData={tableData.scores[getScoreKey(a.id, student.termId)]}
                departmentId={tableData.departmentId}
              />
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
interface ScoreInputProps {
  assessment: ScoreData["assessments"][number];
  student: ScoreData["students"][number];
  scoreKey: string;
  scoreData: ScoreData["scores"][string];
  departmentId: string;
}
function ScoreInput({
  scoreKey,
  student,
  assessment,
  scoreData,
  departmentId,
}: ScoreInputProps) {
  const { update } = useAssessmentStore();
  const storeScore = useAssessmentStore(
    (state) => state.data?.scores?.[scoreKey],
  );
  const currentScore =
    storeScore ??
    scoreData ??
    {
      assessmentId: assessment.id,
      studentTermId: student.termId,
      obtained: null,
      percentageObtained: null,
      scoreKey,
    };
  const value = useDeferredValue(currentScore?.obtained);
  const { isPending, mutate, error, isSuccess, reset } = useMutation(
    _trpc.assessments.updateAssessmentScore.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        // console.log(data);
        update(`data.scores.${scoreKey}.obtained`, data.obtained);
        update(`data.scores.${scoreKey}.id`, data.id);
        setTimeout(() => {
          reset();
        }, 2000);
      },
    }),
  );
  useDebugToast("Error", error);

  const handleUpdate = useDebouncedCallback((v) => {
    // console.log(v, scoreData, scores, scoreKey, student);
    // return;
    mutate({
      ...currentScore,
      studentId: student?.id,
      studentTermId: student?.termId,
      obtained: v || null,
      departmentId,
    });
  }, 800);
  const [focus, setFocus] = useState(false);
  return (
    <TableCell className="w-32 border p-0">
      <InputGroup
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className={cn(
          "w-32",
          value > assessment?.obtainable && "border-red-400",
          "border-none focus-within:border-primary group rounded-none ring-0",
        )}
      >
        <InputGroup.Input
          defaultValue={value}
          placeholder={`-`}
          onChange={(e) => {
            // console.log(e.target?.value);
            handleUpdate(+e.target?.value || ("" as any));
          }}
          className="  [appearance:textfield]
      [&::-webkit-inner-spin-button]:appearance-none
      [&::-webkit-outer-spin-button]:appearance-none"
          type="number"
        />
        <InputGroup.Addon
          className="opacity-0 group-focus-within:opacity-100"
          align="inline-end"
        >
          {" / "}
          {enToAr(assessment?.obtainable)}
        </InputGroup.Addon>
        <InputGroup.Addon
          className={cn(
            isPending || isSuccess || !!error ? "" : "opacity-0",
            "pl-2  group-focus-within:opacity-100",
          )}
          align="inline-end"
        >
          <InputGroup.Button
            disabled={!value}
            className={cn("rounded-full")}
            size="icon-xs"
          >
            {!!error ? (
              <AlertCircle className="text-red-500 size-4" />
            ) : isSuccess ? (
              <Check className="text-green-500 size-4" />
            ) : isPending ? (
              <Spinner />
            ) : (
              <X className="size-4" />
            )}
          </InputGroup.Button>
        </InputGroup.Addon>
      </InputGroup>
    </TableCell>
  );
}
