import { Skeletons } from "@school-clerk/ui/skeletons";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useDeferredValue, useEffect } from "react";
import { _trpc } from "./static-trpc";
import { Accordion } from "@school-clerk/ui/composite";
import { ScoreData, useAssessmentStore } from "@/store/assessment";
import { NumberInput } from "./currency-input";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { getScoreKey } from "@api/db/queries/assessments";
import { useDebugToast } from "@/hooks/use-debug-console";

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
  const { data, isPending } = useSuspenseQuery(
    _trpc.assessments.getSubjectAssessmentRecordings.queryOptions({
      deparmentSubjectId: props.deparmentSubjectId, //props.overview?.subject?.id,
    })
  );
  const store = useAssessmentStore();
  useEffect(() => {
    if (isPending) return;
    useAssessmentStore.getState().update("data", data);
  }, [data, isPending]);

  return (
    <Accordion collapsible type="single">
      {store?.data?.students?.map((student) => (
        <Accordion.Item
          dir="rtl"
          key={student.id}
          className=""
          value={String(student.id)}
        >
          <Accordion.Trigger className="gap-2">
            <span>{student.name}</span>
            <div className="flex-1"></div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              {store.data?.assessments?.map((a) => (
                <span key={a.id}>
                  {a.title}:{" "}
                  {store.data?.scores?.[getScoreKey(a.id, student.termId)]
                    ?.obtained || "-"}
                </span>
              ))}
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div className="grid grid-cols-3 gap-4">
              {store.data?.assessments?.map((a) => (
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
    })
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
    <NumberInput
      placeholder={`${prefix}-/${assessment?.obtainable}`}
      prefix={`${prefix}`}
      suffix={`/${assessment?.obtainable}`}
      dir="rtl"
      type="tel"
      customInput={Input}
      onValueChange={(e) => {
        handleUpdate(e.floatValue || ("" as any));
      }}
      defaultValue={value}
      className={cn(
        value > assessment?.obtainable && "border-red-400",
        "w-28 placeholder:font-semibold text-primary",
        isPending && "border-dashed",
        isSuccess && "border-green-500"
      )}
    />
  );
}
