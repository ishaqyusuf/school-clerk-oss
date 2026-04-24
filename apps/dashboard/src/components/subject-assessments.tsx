import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import {
  Accordion,
  DropdownMenu,
  Empty,
} from "@school-clerk/ui/composite";
import { useEffect, useState } from "react";
import { AssessmentForm, AssessmentFormAction } from "./forms/assessment-form";
import {
  saveAssessementSchema,
} from "@api/db/queries/assessments";
import { _qc, _trpc } from "./static-trpc";
import { Badge } from "@school-clerk/ui/badge";
import { Icons } from "@school-clerk/ui/icons";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  Clock3,
  FileText,
  ListPlus,
} from "lucide-react";
import { Separator } from "@school-clerk/ui/separator";
import { cn } from "@school-clerk/ui/cn";

interface Props {
  overview: RouterOutputs["subjects"]["overview"];
}
export function SubjectAssessments(props: Props) {
  const assessments = props.overview?.subject?.assessments;
  const totalSubmissions =
    assessments?.reduce(
      (sum, assessment) => sum + (assessment?._count?.assessmentResults ?? 0),
      0
    ) ?? 0;
  const totalWeight =
    assessments?.reduce(
      (sum, assessment) => sum + (assessment?.percentageObtainable ?? 0),
      0
    ) ?? 0;
  const [view, setView] = useState("general");
  const [defaultFormValue, setDefaultFormValue] =
    useState<typeof saveAssessementSchema._type>(null);
  useEffect(() => {
    // if (defaultFormValue)
    setView(defaultFormValue ? "form" : "general");
  }, [defaultFormValue]);
  const deptSubjectId = props.overview.subject.id;
  const { data: suggestions, refetch } = useQuery(
    _trpc.assessments.getAssessmentSuggestions.queryOptions(
      {
        deptSubjectId,
      },
      {
        enabled: !!deptSubjectId,
      }
    )
  );
  const { mutate } = useMutation(
    _trpc.assessments.saveAssessement.mutationOptions({
      onSuccess(data, variables, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.overview.queryKey({}),
        });
        refetch();
      },
      onError(data, variables, context) {},
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
    })
  );
  const { setParams } = useSubjectParams();

  const Suggestion = ({
    children,
    defaultValues,
  }: {
    children?;
    defaultValues?: {
      index?;
      id?;
    };
  }) => (
    <DropdownMenu dir="rtl">
      <DropdownMenu.Trigger disabled={!suggestions?.length}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="">
        {suggestions?.map((s) => (
          <DropdownMenu.Item
            onClick={(e) => {
              mutate({
                departmentSubjectId: deptSubjectId,
                index: assessments?.length,
                obtainable: s?.obtainable,
                percentageObtainable: s?.percentageObtainable,
                title: s?.title,
                ...(defaultValues || {}),
              });
            }}
            className="pr-8"
            key={s.uid}
          >
            {s.title}
            <DropdownMenu.Sub>
              - {s?.obtainable} | {s?.percentageObtainable}%
            </DropdownMenu.Sub>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
  return (
    <>
      <div className="grid gap-6">
        <Accordion
          collapsible
          type="single"
          onValueChange={setView}
          value={view}
        >
          <Accordion.Item className="border-none" value="general">
            <Accordion.Content>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  icon={FileText}
                  label="Total assessments"
                  value={assessments?.length ?? 0}
                  tone="emerald"
                />
                <StatCard
                  icon={BarChart3}
                  label="Total submissions"
                  value={totalSubmissions}
                  tone="amber"
                />
                <StatCard
                  icon={Clock3}
                  label="Configured weight"
                  value={`${totalWeight}%`}
                  tone="indigo"
                />
              </div>

              <div className="mt-2 flex flex-col gap-4 rounded-3xl border border-border bg-background p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Assessments
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Manage quizzes, tests, and exam components for this subject.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ButtonGroup>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDefaultFormValue({
                            departmentSubjectId: deptSubjectId,
                            index: assessments?.length,
                          });
                        }}
                      >
                        Create
                      </Button>
                      <Separator orientation="vertical" />
                      <Suggestion>
                        <Button size="sm">
                          <ListPlus className="size-4" />
                        </Button>
                      </Suggestion>
                    </ButtonGroup>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setParams({
                          subjectTab: "recordings",
                        });
                      }}
                    >
                      Record submission
                    </Button>
                  </div>
                </div>

                {assessments?.length ? (
                  <div className="grid gap-4">
                    {assessments.map((a, ai) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                              <CalendarClock className="size-5" />
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div className="space-y-1">
                                <h3 className="truncate text-base font-semibold text-foreground">
                                  {a.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Assessment #{(a.index ?? ai) + 1} for this subject.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full px-3 py-1">
                                  {a.percentageObtainable}% weight
                                </Badge>
                                <Badge variant="neutral" className="rounded-full px-3 py-1">
                                  {a._count?.assessmentResults ?? 0} submissions
                                </Badge>
                                {a.obtainable ? (
                                  <Badge
                                    variant="success"
                                    className="rounded-full px-3 py-1"
                                  >
                                    {a.obtainable} points
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Suggestion
                              defaultValues={{
                                id: a.id,
                                index: a.index || ai,
                              }}
                            >
                              <Button size="sm" variant="outline" className="gap-2">
                                <Icons.Edit className="size-4" />
                                Edit
                              </Button>
                            </Suggestion>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty>
                    <Empty.Content>
                      <Empty.Title>No Assessment</Empty.Title>
                      <Empty.Description>
                        You have no assessment record
                      </Empty.Description>
                    </Empty.Content>
                  </Empty>
                )}
              </div>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="form" className="border-none">
            <Accordion.Content>
              <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
                <div className="mb-5 space-y-1">
                  <h2 className="text-lg font-bold text-foreground">
                    {defaultFormValue?.id ? "Edit assessment" : "Create assessment"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure the title, obtainable score, and weighted contribution.
                  </p>
                </div>
                <AssessmentForm defaultValues={defaultFormValue}>
                  <div className="flex gap-2">
                    <div className="flex-1"></div>
                    <Button
                      onClick={() => {
                        setDefaultFormValue(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <AssessmentFormAction
                      onSuccess={(e) => {
                        setDefaultFormValue(null);
                        _qc.invalidateQueries({
                          queryKey: _trpc.subjects.overview.queryKey({}),
                        });
                      }}
                    />
                  </div>
                </AssessmentForm>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: "emerald" | "amber" | "indigo";
}) {
  const toneStyles = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-xl p-2", toneStyles[tone])}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
