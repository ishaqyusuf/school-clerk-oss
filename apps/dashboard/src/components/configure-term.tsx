"use client";

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
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Form } from "@school-clerk/ui/form";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { Spinner } from "@school-clerk/ui/spinner";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Info,
  Save,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

const termDetailsSchema = z
  .object({
    startDate: z.date({
      required_error: "Term start date is required",
    }),
    endDate: z.date().optional().nullable(),
    note: z.string().trim().max(2_000).optional().nullable(),
  })
  .refine(
    (value) =>
      !value.endDate || value.endDate.getTime() >= value.startDate.getTime(),
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    },
  );

export function ConfigureTerm({ termId }: { termId: string }) {
  const trpc = useTRPC();
  const router = useTenantRouter();
  const [proceedAfterSave, setProceedAfterSave] = useState(false);
  const contextQuery = useQuery(
    trpc.academics.getTermSetupContext.queryOptions({ termId }),
  );
  const context = contextQuery.data;
  const form = useZodForm(termDetailsSchema, {
    defaultValues: {
      startDate: undefined as unknown as Date,
      endDate: null,
      note: "",
    },
  });

  useEffect(() => {
    if (!context?.target) return;
    form.reset({
      startDate: context.target.startDate
        ? new Date(context.target.startDate)
        : (undefined as unknown as Date),
      endDate: context.target.endDate ? new Date(context.target.endDate) : null,
      note: context.target.note ?? "",
    });
  }, [context?.target, form]);

  const save = useMutation(
    trpc.academics.saveTermMetaData.mutationOptions({
      onSuccess() {
        if (proceedAfterSave) {
          router.push(
            `/academic/term-getting-started/${termId}/data-migration`,
          );
        }
      },
    }),
  );

  if (contextQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (contextQuery.error || !context) {
    return (
      <Alert variant="destructive">
        <Info />
        <AlertTitle>Unable to load term setup</AlertTitle>
        <AlertDescription>
          {contextQuery.error?.message ?? "The selected term was not found."}
        </AlertDescription>
      </Alert>
    );
  }

  const isLocked =
    context.target.lifecycleStatus === "ACTIVE" ||
    context.target.lifecycleStatus === "CLOSED";

  const submit = form.handleSubmit((values) => {
    save.mutate({
      termId,
      startDate: values.startDate,
      endDate: values.endDate,
      note: values.note,
    });
  });

  return (
    <Form {...form}>
      <form
        className="mx-auto flex w-full max-w-5xl flex-col gap-6"
        onSubmit={submit}
      >
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            className="w-fit px-0"
            onClick={() => router.push("/academic")}
          >
            <ArrowLeft data-icon="inline-start" />
            Academic management
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">
              Configure {context.target.title}
            </h1>
            <Badge variant="outline">
              {context.target.lifecycleStatus ?? "LEGACY"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {context.target.session.title}
          </p>
        </div>

        <Alert>
          <Info />
          <AlertTitle>
            {context.source
              ? `Preparing from ${context.source.sessionTitle} ${context.source.title}`
              : "First academic term"}
          </AlertTitle>
          <AlertDescription>
            Save the calendar first. The next step previews every classroom,
            subject, student, fee, and teacher assignment before anything is
            copied.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Term details</CardTitle>
            <CardDescription>
              Dates and planning notes remain editable while this term is a
              draft or ready for activation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-5 md:grid-cols-2">
              <FormDate
                control={form.control}
                name="startDate"
                label="Term start date"
                description="Academic activity begins on this date."
                disabled={isLocked}
              />
              <FormDate
                control={form.control}
                name="endDate"
                label="Term end date"
                description="Academic activity ends on this date."
                disabled={isLocked}
              />
            </div>
            <FormInput
              control={form.control}
              name="note"
              type="textarea"
              label="Objective or notes"
              placeholder="Focus areas, examinations, or operational notes"
              disabled={isLocked}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={isLocked || save.isPending}
              onClick={() => setProceedAfterSave(false)}
            >
              {save.isPending && !proceedAfterSave ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Save draft
            </Button>
            <Button
              type="submit"
              disabled={isLocked || save.isPending}
              onClick={() => setProceedAfterSave(true)}
            >
              {save.isPending && proceedAfterSave ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <ArrowRight data-icon="inline-end" />
              )}
              Continue to rollover
            </Button>
          </CardFooter>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <BookOpenCheck />
              <CardTitle>Academic structure</CardTitle>
              <CardDescription>
                Subjects include their assessment templates. Results and
                attendance are never copied.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users />
              <CardTitle>People and access</CardTitle>
              <CardDescription>
                Same-session enrolments can carry forward with fees. Teacher
                term profiles and assignments are remapped explicitly.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </form>
    </Form>
  );
}
