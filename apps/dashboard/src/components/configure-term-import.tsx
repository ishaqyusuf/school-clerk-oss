"use client";

import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { useTenantRouter } from "@school-clerk/tenant-url/next";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Checkbox } from "@school-clerk/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@school-clerk/ui/field";
import { Progress } from "@school-clerk/ui/progress";
import { RadioGroup, RadioGroupItem } from "@school-clerk/ui/radio-group";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { Spinner } from "@school-clerk/ui/spinner";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleAlert,
  GraduationCap,
  LayoutTemplate,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { z } from "zod";

const copyOptionSchema = z.enum(["copy-all", "select", "empty"]);
const setupResultSchema = z.object({
  classrooms: z.number(),
  subjects: z.number(),
  assessments: z.number(),
  students: z.number(),
  teachers: z.number(),
  fees: z.number(),
});
const setupFormSchema = z.object({
  classroomOption: copyOptionSchema,
  subjectOption: copyOptionSchema,
  studentOption: copyOptionSchema,
  teacherOption: copyOptionSchema,
  selectedClassroomIds: z.array(z.string()),
  selectedSubjectIds: z.array(z.string()),
  selectedStudentIds: z.array(z.string()),
  selectedTeacherIds: z.array(z.string()),
});

type SetupForm = z.infer<typeof setupFormSchema>;
type Stage = "configure" | "review" | "complete";
type SelectableItem = { id: string; label: string; context?: string };

const copyOptions = [
  {
    id: "copy-all" as const,
    title: "Copy all",
    description: "Carry every available record forward.",
  },
  {
    id: "select" as const,
    title: "Choose specific records",
    description: "Select exactly which records should carry forward.",
  },
  {
    id: "empty" as const,
    title: "Start empty",
    description: "Keep existing target data and add nothing from the source.",
  },
];

function SelectionChecklist({
  control,
  name,
  items,
}: {
  control: Control<SetupForm>;
  name:
    | "selectedClassroomIds"
    | "selectedSubjectIds"
    | "selectedStudentIds"
    | "selectedTeacherIds";
  items: SelectableItem[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = new Set(field.value);
        return (
          <FieldGroup className="max-h-64 overflow-y-auto border p-3">
            {items.map((item) => {
              const checked = selected.has(item.id);
              return (
                <Field key={item.id} orientation="horizontal">
                  <Checkbox
                    id={`${name}-${item.id}`}
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      const next = new Set(field.value);
                      if (nextChecked) next.add(item.id);
                      else next.delete(item.id);
                      field.onChange([...next]);
                    }}
                  />
                  <FieldLabel htmlFor={`${name}-${item.id}`}>
                    <FieldContent>
                      <FieldTitle>{item.label}</FieldTitle>
                      {item.context ? (
                        <FieldDescription>{item.context}</FieldDescription>
                      ) : null}
                    </FieldContent>
                  </FieldLabel>
                </Field>
              );
            })}
          </FieldGroup>
        );
      }}
    />
  );
}

function CopyOptionCard({
  control,
  optionName,
  selectionName,
  title,
  description,
  icon: Icon,
  items,
  disabledOptions = [],
}: {
  control: Control<SetupForm>;
  optionName:
    "classroomOption" | "subjectOption" | "studentOption" | "teacherOption";
  selectionName:
    | "selectedClassroomIds"
    | "selectedSubjectIds"
    | "selectedStudentIds"
    | "selectedTeacherIds";
  title: string;
  description: string;
  icon: typeof LayoutTemplate;
  items: SelectableItem[];
  disabledOptions?: SetupForm["subjectOption"][];
}) {
  return (
    <Card>
      <CardHeader>
        <Icon />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          control={control}
          name={optionName}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Rollover policy</FieldLegend>
              <RadioGroup
                value={field.value as string}
                onValueChange={field.onChange}
              >
                {copyOptions.map((option) => {
                  const disabled = disabledOptions.includes(option.id);
                  return (
                    <FieldLabel
                      key={option.id}
                      htmlFor={`${optionName}-${option.id}`}
                      aria-disabled={disabled}
                    >
                      <Field
                        orientation="horizontal"
                        data-disabled={disabled || undefined}
                      >
                        <FieldContent>
                          <FieldTitle>{option.title}</FieldTitle>
                          <FieldDescription>
                            {option.description}
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem
                          id={`${optionName}-${option.id}`}
                          value={option.id}
                          disabled={disabled}
                        />
                      </Field>
                    </FieldLabel>
                  );
                })}
              </RadioGroup>
            </FieldSet>
          )}
        />
        <Controller
          control={control}
          name={optionName}
          render={({ field }) =>
            field.value === "select" ? (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Selected{" "}
                  {items.length ? "records" : "records (none available)"}
                </p>
                <SelectionChecklist
                  control={control}
                  name={selectionName}
                  items={items}
                />
              </div>
            ) : (
              <></>
            )
          }
        />
      </CardContent>
    </Card>
  );
}

export function ConfigureTermImport({ termId }: { termId: string }) {
  const trpc = useTRPC();
  const router = useTenantRouter();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("configure");
  const [previewInput, setPreviewInput] = useState<
    (SetupForm & { termId: string; previousTermId?: string | null }) | null
  >(null);
  const [applyResult, setApplyResult] = useState<{
    runId: string;
    result: {
      classrooms: number;
      subjects: number;
      assessments: number;
      students: number;
      teachers: number;
      fees: number;
    };
    alreadyApplied: boolean;
  } | null>(null);
  const idempotencyKeyRef = useRef(
    globalThis.crypto?.randomUUID?.() ??
      `${termId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const initializedRef = useRef<string | null>(null);
  const contextQuery = useQuery(
    trpc.academics.getTermSetupContext.queryOptions({ termId }),
  );
  const context = contextQuery.data;
  const form = useZodForm(setupFormSchema, {
    defaultValues: {
      classroomOption: "copy-all",
      subjectOption: "copy-all",
      studentOption: "copy-all",
      teacherOption: "copy-all",
      selectedClassroomIds: [],
      selectedSubjectIds: [],
      selectedStudentIds: [],
      selectedTeacherIds: [],
    },
  });

  useEffect(() => {
    if (!context || initializedRef.current === termId) return;
    initializedRef.current = termId;
    const completedResult = setupResultSchema.safeParse(
      context.latestRun?.result,
    );
    if (context.latestRun?.status === "COMPLETED" && completedResult.success) {
      const result = completedResult.data;
      setApplyResult({
        runId: context.latestRun.id,
        result: {
          classrooms: result.classrooms ?? 0,
          subjects: result.subjects ?? 0,
          assessments: result.assessments ?? 0,
          students: result.students ?? 0,
          teachers: result.teachers ?? 0,
          fees: result.fees ?? 0,
        },
        alreadyApplied: true,
      });
      setStage("complete");
    }
    form.reset({
      classroomOption: "copy-all",
      subjectOption: "copy-all",
      studentOption: context.promotional ? "empty" : "copy-all",
      teacherOption: "copy-all",
      selectedClassroomIds: [],
      selectedSubjectIds: [],
      selectedStudentIds: [],
      selectedTeacherIds: [],
    });
  }, [context, form, termId]);

  const previewQuery = useQuery({
    ...trpc.academics.previewTermSetup.queryOptions(
      previewInput ?? {
        termId,
        previousTermId: context?.source?.id,
        classroomOption: "empty",
        subjectOption: "empty",
        studentOption: "empty",
        teacherOption: "empty",
        selectedClassroomIds: [],
        selectedSubjectIds: [],
        selectedStudentIds: [],
        selectedTeacherIds: [],
      },
    ),
    enabled: Boolean(previewInput),
  });

  const applySetup = useMutation(
    trpc.academics.applyTermSetup.mutationOptions({
      onSuccess(result) {
        setApplyResult(result);
        setStage("complete");
        queryClient.invalidateQueries({
          queryKey: trpc.academics.getTermSetupContext.queryKey({ termId }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.academics.dashboard.queryKey({}),
        });
      },
      onError(error) {
        toast({
          title: "Term setup failed",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const activationQuery = useQuery({
    ...trpc.academics.previewTermActivation.queryOptions({ termId }),
    enabled: stage === "complete",
  });
  const activateTerm = useMutation(
    trpc.academics.activateTerm.mutationOptions({
      async onSuccess(result) {
        await switchSessionTerm(result);
        toast({
          title: "Academic term activated",
          description: `${result.termTitle} is now active.`,
        });
        router.push("/academic");
      },
      onError(error) {
        toast({
          title: "Unable to activate term",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  if (contextQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-3 w-full" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (contextQuery.error || !context) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Unable to load rollover setup</AlertTitle>
        <AlertDescription>
          {contextQuery.error?.message ?? "The selected term was not found."}
        </AlertDescription>
      </Alert>
    );
  }

  const openReview = form.handleSubmit((values) => {
    setPreviewInput({
      ...values,
      termId,
      previousTermId: context.source?.id,
    });
    setStage("review");
  });

  const preview = previewQuery.data;
  const sourceLabel = context.source
    ? `${context.source.sessionTitle} ${context.source.title}`
    : "No previous term";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          className="w-fit px-0"
          onClick={() => {
            if (stage === "review") setStage("configure");
            else router.push(`/academic/term-getting-started/${termId}`);
          }}
        >
          <ArrowLeft data-icon="inline-start" />
          {stage === "review" ? "Change rollover settings" : "Term details"}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">
              Set up {context.target.title}
            </h1>
            <p className="text-muted-foreground">Source: {sourceLabel}</p>
          </div>
          <Badge variant="outline">
            {context.promotional ? "NEW SESSION" : "SAME SESSION"}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span>
              {stage === "configure"
                ? "Rollover settings"
                : stage === "review"
                  ? "Review changes"
                  : "Setup complete"}
            </span>
            <span>
              {stage === "configure"
                ? "1/3"
                : stage === "review"
                  ? "2/3"
                  : "3/3"}
            </span>
          </div>
          <Progress
            value={stage === "configure" ? 33 : stage === "review" ? 66 : 100}
          />
        </div>
      </div>

      {stage === "configure" ? (
        <form className="flex flex-col gap-6" onSubmit={openReview}>
          {!context.source ? (
            <Alert>
              <CircleAlert />
              <AlertTitle>This is the first term</AlertTitle>
              <AlertDescription>
                Choose “Start empty” for each category, then finish setup and
                configure records directly in the new term.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            {context.promotional ? (
              <CopyOptionCard
                control={form.control}
                optionName="classroomOption"
                selectionName="selectedClassroomIds"
                title="Classrooms"
                description={`${context.available.classrooms.length} source classrooms can be copied into the new session.`}
                icon={LayoutTemplate}
                items={context.available.classrooms}
              />
            ) : (
              <Card>
                <CardHeader>
                  <LayoutTemplate />
                  <CardTitle>Classrooms</CardTitle>
                  <CardDescription>
                    Classrooms belong to the session and will be reused without
                    duplication.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    {context.available.classrooms.length} reused
                  </Badge>
                </CardContent>
              </Card>
            )}

            <CopyOptionCard
              control={form.control}
              optionName="subjectOption"
              selectionName="selectedSubjectIds"
              title="Subjects and assessments"
              description="Copies curriculum links and assessment templates, never scores."
              icon={BookOpen}
              items={context.available.subjects}
            />

            <CopyOptionCard
              control={form.control}
              optionName="studentOption"
              selectionName="selectedStudentIds"
              title="Student enrolments and fees"
              description={
                context.promotional
                  ? "Cross-session movement must use the progression workflow."
                  : "New term enrolments receive applicable active fees exactly once."
              }
              icon={GraduationCap}
              items={context.available.students}
              disabledOptions={
                context.promotional ? ["copy-all", "select"] : []
              }
            />

            <CopyOptionCard
              control={form.control}
              optionName="teacherOption"
              selectionName="selectedTeacherIds"
              title="Teachers and academic access"
              description="Creates term profiles and remaps classroom, department, and subject grants."
              icon={Users}
              items={context.available.teachers}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">
              <ArrowRight data-icon="inline-end" />
              Preview changes
            </Button>
          </div>
        </form>
      ) : null}

      {stage === "review" ? (
        <div className="flex flex-col gap-6">
          {previewQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : null}

          {preview ? (
            <>
              {preview.blockers.map((blocker) => (
                <Alert key={blocker.key} variant="destructive">
                  <CircleAlert />
                  <AlertTitle>Setup blocked</AlertTitle>
                  <AlertDescription>{blocker.message}</AlertDescription>
                </Alert>
              ))}
              {preview.warnings.map((warning) => (
                <Alert key={warning.key}>
                  <ShieldCheck />
                  <AlertTitle>Rollover note</AlertTitle>
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              ))}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Classrooms", preview.counts.classrooms],
                    ["Subjects", preview.counts.subjects],
                    ["Assessment templates", preview.counts.assessments],
                    ["Student enrolments", preview.counts.students],
                    ["Teacher profiles", preview.counts.teachers],
                    ["Student fees", preview.counts.fees],
                  ] as const
                ).map(([label, value]) => (
                  <Card key={label}>
                    <CardHeader>
                      <CardDescription>{label}</CardDescription>
                      <CardTitle>{value}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <Alert>
                <ShieldCheck />
                <AlertTitle>Non-destructive apply</AlertTitle>
                <AlertDescription>
                  Existing target records are preserved. Repeating this exact
                  request reuses its persisted setup run and creates no
                  duplicates.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStage("configure")}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={
                    applySetup.isPending ||
                    preview.blockers.length > 0 ||
                    !previewInput
                  }
                  onClick={() => {
                    if (!previewInput) return;
                    applySetup.mutate({
                      ...previewInput,
                      idempotencyKey: idempotencyKeyRef.current,
                    });
                  }}
                >
                  {applySetup.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Play data-icon="inline-start" />
                  )}
                  Apply rollover
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {stage === "complete" && applyResult ? (
        <div className="flex flex-col gap-6">
          <Alert>
            <Check />
            <AlertTitle>Term setup completed</AlertTitle>
            <AlertDescription>
              Setup run {applyResult.runId} completed successfully
              {applyResult.alreadyApplied ? " and was safely reused." : "."}
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(applyResult.result).map(([label, value]) => (
              <Card key={label}>
                <CardHeader>
                  <CardDescription className="capitalize">
                    {label}
                  </CardDescription>
                  <CardTitle>{value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          {activationQuery.data?.blockers.map((blocker) => (
            <Alert key={blocker.key}>
              <CircleAlert />
              <AlertTitle>Activation requirement</AlertTitle>
              <AlertDescription>{blocker.message}</AlertDescription>
            </Alert>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Finish the transition</CardTitle>
              <CardDescription>
                Activation changes the school’s operational term and closes the
                previous academic term.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap justify-end gap-3">
              {context.promotional && context.source ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/academic/progression/${context.source?.id}/${termId}`,
                    )
                  }
                >
                  <GraduationCap data-icon="inline-start" />
                  Progress students
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={
                  activateTerm.isPending ||
                  activationQuery.isLoading ||
                  !activationQuery.data?.canActivate
                }
                onClick={() => activateTerm.mutate({ termId })}
              >
                {activateTerm.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Check data-icon="inline-start" />
                )}
                Activate term
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
