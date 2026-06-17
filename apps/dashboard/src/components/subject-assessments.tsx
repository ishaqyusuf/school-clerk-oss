import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import {
  Accordion,
  DropdownMenu,
  Empty,
} from "@school-clerk/ui/composite";
import { useEffect, useState } from "react";
import { AssessmentForm, AssessmentFormAction } from "./forms/assessment-form";
import { saveAssessementSchema } from "@school-clerk/assessment-results";
import { _qc, _trpc } from "./static-trpc";
import { Badge } from "@school-clerk/ui/badge";
import { Icons } from "@school-clerk/ui/icons";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarClock,
  Clock3,
  FileText,
  FolderTree,
  ListPlus,
  Trash2,
} from "lucide-react";
import { Separator } from "@school-clerk/ui/separator";
import { cn } from "@school-clerk/ui/cn";

interface Props {
  overview: RouterOutputs["subjects"]["overview"];
}
export function SubjectAssessments(props: Props) {
  const assessments = props.overview?.subject?.assessments;
  const scoreableAssessments =
    assessments?.flatMap((assessment) =>
      assessment?.childAssessments?.length ? assessment.childAssessments : [assessment],
    ) ?? [];
  const totalSubmissions =
    scoreableAssessments?.reduce(
      (sum, assessment) => sum + (assessment?._count?.assessmentResults ?? 0),
      0
    ) ?? 0;
  const totalWeight =
    scoreableAssessments?.reduce(
      (sum, assessment) => sum + (assessment?.percentageObtainable ?? 0),
      0
    ) ?? 0;
  const groupedAssessmentCount =
    assessments?.filter((assessment) => assessment?.childAssessments?.length)
      ?.length ?? 0;
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
        _qc.invalidateQueries({
          queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
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
  const invalidateAssessmentViews = () => {
    _qc.invalidateQueries({
      queryKey: _trpc.subjects.overview.queryKey({}),
    });
    _qc.invalidateQueries({
      queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
    });
    _qc.invalidateQueries({
      queryKey: _trpc.assessments.getSubjectAssessmentRecordings.queryKey({}),
    });
  };
  const { mutate: deleteAssessment, isPending: isDeletingAssessment } =
    useMutation(
      _trpc.assessments.deleteAssessment.mutationOptions({
        onSuccess() {
          invalidateAssessmentViews();
        },
        meta: {
          toastTitle: {
            error: "Unable to delete assessment",
            loading: "Deleting...",
            success: "Assessment deleted",
          },
        },
      })
    );
  const { mutate: reorderAssessments, isPending: isReorderingAssessments } =
    useMutation(
      _trpc.assessments.reorderAssessments.mutationOptions({
        onSuccess() {
          invalidateAssessmentViews();
        },
        meta: {
          toastTitle: {
            error: "Unable to reorder assessments",
            loading: "Saving order...",
            success: "Assessment order saved",
          },
        },
      })
    );
  const { setParams } = useSubjectParams();

  function moveAssessment(id: number, direction: "up" | "down") {
    const currentIds = assessments?.map((assessment) => assessment.id) ?? [];
    const index = currentIds.indexOf(id);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentIds.length) return;

    const nextIds = [...currentIds];
    const item = nextIds[index];
    if (item === undefined) return;
    nextIds.splice(index, 1);
    nextIds.splice(nextIndex, 0, item);
    reorderAssessments({
      departmentSubjectId: deptSubjectId,
      assessmentIds: nextIds,
    });
  }

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
            onClick={() => {
              mutate({
                departmentSubjectId: deptSubjectId,
                index: assessments?.length ?? 0,
                obtainable: s?.obtainable,
                percentageObtainable: s?.percentageObtainable,
                title: s?.title,
                isGroup: false,
                childAssessments: [],
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
              <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={FileText}
                  label="Score items"
                  value={scoreableAssessments?.length ?? 0}
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
                <StatCard
                  icon={FolderTree}
                  label="Grouped items"
                  value={groupedAssessmentCount}
                  tone="emerald"
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
                            index: assessments?.length ?? 0,
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
                        className="rounded-3xl border border-border bg-muted/20 p-5 transition-colors hover:bg-muted/30"
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
                                {a.childAssessments?.length ? (
                                  <Badge
                                    variant="neutral"
                                    className="rounded-full px-3 py-1"
                                  >
                                    {a.childAssessments.length} sub-assessments
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={ai === 0 || isReorderingAssessments}
                              onClick={() => moveAssessment(a.id, "up")}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={
                                ai === assessments.length - 1 ||
                                isReorderingAssessments
                              }
                              onClick={() => moveAssessment(a.id, "down")}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                setDefaultFormValue({
                                  id: a.id,
                                  departmentSubjectId: deptSubjectId,
                                  index: Number(a.index ?? ai),
                                  title: a.title,
                                  obtainable: a.obtainable ?? 0,
                                  percentageObtainable:
                                    a.percentageObtainable ?? 0,
                                  isGroup: !!a.childAssessments?.length,
                                  childAssessments:
                                    a.childAssessments?.map((child) => ({
                                      id: child.id,
                                      title: child.title,
                                      obtainable: child.obtainable ?? 0,
                                      percentageObtainable:
                                        child.percentageObtainable ?? 0,
                                    })) ?? [],
                                });
                              }}
                            >
                              <Icons.Edit className="size-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isDeletingAssessment}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete ${a.title}? Existing scores for this assessment will be hidden.`,
                                  )
                                ) {
                                  deleteAssessment({ id: a.id });
                                }
                              }}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {a.childAssessments?.length ? (
                          <div className="mt-5 grid gap-3 border-t border-border/70 pt-4">
                            {a.childAssessments.map((child, childIndex) => (
                              <div
                                key={child.id}
                                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <p className="font-medium text-foreground">
                                    {child.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Part {childIndex + 1} under {a.title}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full px-3 py-1"
                                  >
                                    {child.percentageObtainable ?? 0}% weight
                                  </Badge>
                                  <Badge
                                    variant="success"
                                    className="rounded-full px-3 py-1"
                                  >
                                    {child.obtainable ?? 0} points
                                  </Badge>
                                  <Badge
                                    variant="neutral"
                                    className="rounded-full px-3 py-1"
                                  >
                                    {child._count?.assessmentResults ?? 0} submissions
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
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
                    Configure the title, obtainable score, weighted contribution, and optional sub-assessments.
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
                        invalidateAssessmentViews();
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
