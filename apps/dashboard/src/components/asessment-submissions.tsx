import { Skeletons } from "@school-clerk/ui/skeletons";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useDeferredValue, useEffect } from "react";
import { _trpc } from "./static-trpc";
import { Accordion, InputGroup, Table } from "@school-clerk/ui/composite";
import { ScoreData, useAssessmentStore } from "@/store/assessment";
import { NumberInput } from "./currency-input";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { getScoreKey } from "@api/db/queries/assessments";
import { useDebugToast } from "@/hooks/use-debug-console";
import { X } from "lucide-react";
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
                <Table.Cell key={a.id} className="w-32">
                  {/* {store.data?.scores?.[getScoreKey(a.id, student.termId)]
                    ?.obtained || "-"} */}
                  <ScoreInput
                    assessment={a}
                    student={student}
                    scoreKey={getScoreKey(a.id, student.termId)}
                  />
                </Table.Cell>
              ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
  return (
    <Accordion collapsible type="single">
      {store?.data?.students?.map((student, si) => (
        <Accordion.Item
          dir="rtl"
          key={student.id}
          className=""
          value={String(student.id)}
        >
          <Accordion.Trigger className="gap-2 max-lg:px-4">
            <span>
              {enToAr(si + 1)}. {student.name}
            </span>
            <div className="flex-1"></div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              {store.data?.assessments
                ?.filter((a) => !!a?.percentageObtainable)
                ?.map((a) => (
                  <span
                    className={cn(
                      store.data?.scores?.[getScoreKey(a.id, student.termId)]
                        ?.obtained && "text-green-400",
                    )}
                    key={a.id}
                  >
                    {a.title}:{" "}
                    {store.data?.scores?.[getScoreKey(a.id, student.termId)]
                      ?.obtained || "-"}
                  </span>
                ))}
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div className="grid grid-cols-3 max-lg:px-4 gap-4">
              {store.data?.assessments
                ?.filter((a) => !!a?.percentageObtainable)
                ?.map((a) => (
                  <span key={a.id}>
                    <ScoreInput
                      assessment={a}
                      student={student}
                      scoreKey={getScoreKey(a.id, student.termId)}
                    />
                    {/* {store.data?.scores?.[getScoreKey(a.id, student.termId)]
                  ?.obtained || "-"} */}
                  </span>
                ))}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
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
  const { isPending, mutate, error, isSuccess } = useMutation(
    _trpc.assessments.updateAssessmentScore.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        // console.log(data);
        update(`data.scores.${scoreKey}.obtained`, data.obtained);
        update(`data.scores.${scoreKey}.id`, data.id);
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

  return (
    <InputGroup
      className={cn("w-32", value > assessment?.obtainable && "border-red-400")}
    >
      <InputGroup.Input
        defaultValue={value}
        onChange={(e) => {
          // console.log(e.target?.value);
          handleUpdate(+e.target?.value || ("" as any));
        }}
        className="  [appearance:textfield]
      [&::-webkit-inner-spin-button]:appearance-none
      [&::-webkit-outer-spin-button]:appearance-none"
        type="number"
        placeholder={``}
      />
      <InputGroup.Addon className="" align="inline-end">
        {" / "}
        {enToAr(assessment?.obtainable)}
      </InputGroup.Addon>
      <InputGroup.Addon className="pl-2" align="inline-end">
        <InputGroup.Button
          disabled={!value}
          className={cn("rounded-full")}
          size="icon-xs"
        >
          {isPending ? <Spinner /> : <X className="size-4" />}
        </InputGroup.Button>
      </InputGroup.Addon>
      {/* <InputGroup.Addon className="pr-2" align="inline-start">
        {prefix}
      </InputGroup.Addon> */}
    </InputGroup>
  );
}
