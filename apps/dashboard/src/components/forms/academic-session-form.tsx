"use client";

import { useEffect, useState } from "react";
import { FormProvider, useFieldArray } from "react-hook-form";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { ArrowRight } from "lucide-react";

import { Button } from "@school-clerk/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@school-clerk/ui/field";
import { Icons } from "@school-clerk/ui/icons";
import { Switch } from "@school-clerk/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

import { FormDate } from "@school-clerk/ui/controls/form-date";
import FormInput from "../controls/form-input";
import { SubmitButton } from "../submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useAcademicParams } from "@/hooks/use-academic-params";
import { createAcademicSessionSchema } from "@api/trpc/schemas/schemas";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@school-clerk/ui/use-toast";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";

const DEFAULT_TERMS = [
  { title: "First Term", startDate: undefined, endDate: undefined },
  { title: "Second Term", startDate: undefined, endDate: undefined },
  { title: "Third Term", startDate: undefined, endDate: undefined },
];

function toFormDate(value?: Date | string | null) {
  return value ? new Date(value) : undefined;
}

function isSameFormDate(
  left?: Date | string | null,
  right?: Date | string | null,
) {
  if (!left && !right) return true;
  if (!left || !right) return false;

  return new Date(left).getTime() === new Date(right).getTime();
}

export function AcademicSessionForm({
  mode = "default",
}: {
  mode?: "default" | "onboarding";
}) {
  const { params, setParams } = useAcademicParams();
  const router = useRouter();
  const [initWithTerms, setInitWithTerms] = useState(true);

  const form = useZodForm(createAcademicSessionSchema, {
    defaultValues: {
      sessionId: params?.sessionId,
      startDate: null,
      endDate: null,
      terms: params?.sessionId ? [] : DEFAULT_TERMS,
    },
  });
  const terms = useFieldArray({
    control: form.control,
    name: "terms",
    keyName: "_id",
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const setupFirstTerm = useMutation(
    trpc.academics.applyTermSetup.mutationOptions(),
  );
  const activateFirstTerm = useMutation(
    trpc.academics.activateTerm.mutationOptions(),
  );

  // Only fetch prefill when creating a new session (no sessionId in params)
  const { data: prefill } = useQuery(
    trpc.academics.getSessionPrefill.queryOptions({}),
  );

  // Auto-populate title and terms from prefill when data loads
  useEffect(() => {
    if (!prefill) return;
    if (!form.getValues("title")) {
      form.setValue("title", prefill.suggestedTitle);
    }
    if (!form.getValues("startDate") && prefill.suggestedStartDate) {
      form.setValue("startDate", toFormDate(prefill.suggestedStartDate));
    }
    if (!form.getValues("endDate") && prefill.suggestedEndDate) {
      form.setValue("endDate", toFormDate(prefill.suggestedEndDate));
    }
    if (initWithTerms && prefill.previousTerms.length > 0) {
      terms.replace(
        prefill.previousTerms.map((t) => ({
          title: t.title,
          startDate: toFormDate(t.startDate),
          endDate: toFormDate(t.endDate),
        })),
      );
    }
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInitToggle = (checked: boolean) => {
    setInitWithTerms(checked);
    if (checked && prefill && prefill.previousTerms.length > 0) {
      terms.replace(
        prefill.previousTerms.map((t) => ({
          title: t.title,
          startDate: toFormDate(t.startDate),
          endDate: toFormDate(t.endDate),
        })),
      );
    } else if (!checked) {
      terms.replace([]);
    }
  };

  const save = useMutation(
    trpc.academics.createAcademicSession.mutationOptions({
      async onSuccess(data) {
        await queryClient.invalidateQueries({
          queryKey: trpc.academics.dashboard.queryKey({}),
        });
        toast({
          title: data.alreadyExists
            ? "Session already exists"
            : "Session created!",
          description: data.alreadyExists
            ? "Continuing with the existing academic session."
            : "Your academic session has been saved.",
        });

        if (mode === "onboarding") {
          const firstTerm = data?.terms?.[0];
          if (!firstTerm) {
            throw new Error(
              "Create at least one academic term before continuing onboarding.",
            );
          }
          await setupFirstTerm.mutateAsync({
            termId: firstTerm.id,
            previousTermId: null,
            classroomOption: "empty",
            subjectOption: "empty",
            studentOption: "empty",
            teacherOption: "empty",
            selectedClassroomIds: [],
            selectedSubjectIds: [],
            selectedStudentIds: [],
            selectedTeacherIds: [],
            idempotencyKey: `onboarding-${firstTerm.id}`,
          });
          const activeTerm = await activateFirstTerm.mutateAsync({
            termId: firstTerm.id,
          });
          await switchSessionTerm(activeTerm);

          router.push("/onboarding/setup-classrooms");
          return;
        }

        const firstTerm = data?.terms?.[0];
        if (firstTerm) {
          router.push(`/academic/term-getting-started/${firstTerm.id}`);
        } else {
          setParams(null);
        }
      },
      onError(error) {
        toast({
          title: "Unable to save academic session",
          description:
            error.message || "Something went wrong. Please try again later.",
          variant: "destructive",
        });
      },
    }),
  );
  const onSubmit = form.handleSubmit((data) => {
    if (mode === "onboarding") {
      const firstTerm = data.terms?.[0];
      if (!firstTerm) {
        toast({
          title: "Add an academic term",
          description:
            "Create at least one term before continuing school onboarding.",
          variant: "destructive",
        });
        return;
      }
      if (!firstTerm.startDate) {
        form.setError("terms.0.startDate", {
          type: "manual",
          message: "The first term start date is required for activation.",
        });
        return;
      }
    }
    save.mutate(data);
  });
  const watch = form.watch();

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "startDate") {
        const sessionStartDate = value.startDate;
        const firstTermStartDate = value.terms?.[0]?.startDate;

        if (
          !sessionStartDate ||
          !value.terms?.length ||
          isSameFormDate(sessionStartDate, firstTermStartDate)
        ) {
          return;
        }

        form.setValue("terms.0.startDate", sessionStartDate);
      }

      if (name === "terms.0.startDate") {
        const sessionStartDate = value.startDate;
        const firstTermStartDate = value.terms?.[0]?.startDate;

        if (
          !firstTermStartDate ||
          isSameFormDate(sessionStartDate, firstTermStartDate)
        ) {
          return;
        }

        form.setValue("startDate", firstTermStartDate);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          {!!watch.sessionId || (
            <FormInput
              control={form.control}
              name="title"
              label="Session Title"
              placeholder="2025/2026"
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormDate
              control={form.control}
              name="startDate"
              label="Session Start Date"
              placeholder="Start Date"
            />
            <FormDate
              control={form.control}
              name="endDate"
              label="Session End Date"
              placeholder="End Date"
            />
          </div>

          {/* Initialize with Terms toggle */}
          {!watch.sessionId && (
            <Field orientation="horizontal">
              <FieldLabel htmlFor="initialize-session-terms">
                <FieldContent>
                  <FieldTitle>Initialize with terms</FieldTitle>
                  <FieldDescription>
                    Auto-populate terms based on the previous session
                  </FieldDescription>
                </FieldContent>
              </FieldLabel>
              <Switch
                id="initialize-session-terms"
                checked={initWithTerms}
                onCheckedChange={handleInitToggle}
              />
            </Field>
          )}

          <div className="h-auto">
            <Table className="h-auto table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms?.fields.map((t, ti) => (
                  <TableRow key={t._id}>
                    <TableCell>
                      <FormInput
                        control={form.control}
                        name={`terms.${ti}.title`}
                        placeholder="1st Term"
                      />
                    </TableCell>
                    <TableCell>
                      <FormDate
                        control={form.control}
                        name={`terms.${ti}.startDate`}
                        placeholder="Start Date"
                      />
                    </TableCell>
                    <TableCell>
                      <FormDate
                        control={form.control}
                        name={`terms.${ti}.endDate`}
                        placeholder="End Date"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => {
                terms.append({
                  endDate: undefined,
                  startDate:
                    terms.fields.length === 0 ? watch.startDate : undefined,
                  title: "",
                });
              }}
            >
              <Icons.Add data-icon="inline-start" />
              Add term
            </Button>
          </div>
          <div className="flex justify-end">
            <SubmitButton
              isSubmitting={
                save.isPending ||
                setupFirstTerm.isPending ||
                activateFirstTerm.isPending
              }
            >
              {mode === "onboarding" ? (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Create session"
              )}
            </SubmitButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
