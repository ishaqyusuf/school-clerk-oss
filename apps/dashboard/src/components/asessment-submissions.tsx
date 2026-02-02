import { Skeletons } from "@school-clerk/ui/skeletons";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useDeferredValue, useEffect, useState } from "react";
import { _trpc } from "./static-trpc";
import { Accordion, InputGroup, Table } from "@school-clerk/ui/composite";
import { ScoreData, useAssessmentStore } from "@/store/assessment";
import { NumberInput } from "./currency-input";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { getScoreKey } from "@api/db/queries/assessments";
import { useDebugToast } from "@/hooks/use-debug-console";
import { AlertCircle, Check, X } from "lucide-react";
import { Spinner } from "@school-clerk/ui/spinner";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { enToAr } from "@school-clerk/utils";

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
  const { filters, setFilters } = useAssessmentRecordingParams();
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
  return (
    <Table dir="rtl">
      <Table.Header dir="rtl">
        <Table.Row>
          <Table.Head dir="rtl" className="text-start">
            الطالب
          </Table.Head>
          {store?.data?.assessments
            ?.filter((a) => !!a?.percentageObtainable)
            ?.map((a) => (
              <Table.Head key={a.id} className="w-32">
                {a.title}
              </Table.Head>
            ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {store?.data?.students?.map((student, si) => (
          <Table.Row key={student.id}>
            <Table.Cell dir="rtl">
              {enToAr(si + 1)}. {student.name}
            </Table.Cell>
            {store.data?.assessments
              ?.filter((a) => !!a?.percentageObtainable)
              ?.map((a) => (
                <ScoreInput
                  key={a.id}
                  assessment={a}
                  student={student}
                  scoreKey={getScoreKey(a.id, student.termId)}
                />
              ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
interface ScoreInputProps {
  assessment: ScoreData["assessments"][number];
  student: ScoreData["students"][number];
  scoreKey: string;
}
function ScoreInput({ scoreKey, student, assessment }: ScoreInputProps) {
  const prefix = `${assessment.title}: `;
  const {
    data: { scores, departmentId },
    update,
  } = useAssessmentStore();
  const value = useDeferredValue(scores[scoreKey]?.obtained);
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
    const scoreData = scores?.[scoreKey];
    // console.log(v, scoreData, scores, scoreKey, student);
    // return;
    mutate({
      ...scoreData,
      studentId: student?.id,
      studentTermId: student?.termId,
      obtained: v || null,
      departmentId,
    });
  }, 800);
  const [focus, setFocus] = useState(false);
  return (
    <Table.Cell className="w-32 border p-0">
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
        {/* <InputGroup.Addon className="pr-2" align="inline-start">
        {prefix}
      </InputGroup.Addon> */}
      </InputGroup>
    </Table.Cell>
  );
}
