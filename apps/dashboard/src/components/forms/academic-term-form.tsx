"use client";

import { useAcademicParams } from "@/hooks/use-academic-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { useTenantRouter } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@school-clerk/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Spinner } from "@school-clerk/ui/spinner";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

const academicTermFormSchema = z
  .object({
    sessionId: z.string().min(1, "Select an academic session"),
    title: z.string().trim().min(1, "Term title is required"),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
    note: z.string().trim().max(2_000).optional().nullable(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      value.endDate.getTime() >= value.startDate.getTime(),
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    },
  );

export function AcademicTermForm() {
  const trpc = useTRPC();
  const router = useTenantRouter();
  const queryClient = useQueryClient();
  const { params, setParams } = useAcademicParams();
  const { data: dashboard } = useQuery(
    trpc.academics.dashboard.queryOptions({}),
  );
  const currentSession =
    dashboard?.sessions.find((session) => session.status === "current") ??
    dashboard?.sessions[0];
  const form = useZodForm(academicTermFormSchema, {
    defaultValues: {
      sessionId: params.sessionId ?? "",
      title: "",
      startDate: null,
      endDate: null,
      note: "",
    },
  });

  useEffect(() => {
    if (!form.getValues("sessionId") && currentSession?.id) {
      form.setValue("sessionId", currentSession.id);
    }
  }, [currentSession?.id, form]);

  const createTerm = useMutation(
    trpc.academics.createTermDraft.mutationOptions({
      async onSuccess(term) {
        toast({
          title: "Term draft created",
          description: `${term.title} is ready to configure.`,
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.academics.dashboard.queryKey({}),
        });
        router.push(`/academic/term-getting-started/${term.id}`);
      },
      onError(error) {
        toast({
          title: "Unable to create term",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-6"
        onSubmit={form.handleSubmit((values) => createTerm.mutate(values))}
      >
        <FormField
          control={form.control}
          name="sessionId"
          render={({ field, fieldState }) => (
            <FormItem data-invalid={fieldState.invalid}>
              <FormLabel>Academic session</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {dashboard?.sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormInput
          control={form.control}
          name="title"
          label="Term title"
          placeholder="2nd Term"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormDate
            control={form.control}
            name="startDate"
            label="Start date"
            placeholder="Start date"
          />
          <FormDate
            control={form.control}
            name="endDate"
            label="End date"
            placeholder="End date"
          />
        </div>

        <FormInput
          control={form.control}
          name="note"
          type="textarea"
          label="Objective or notes"
          placeholder="Optional planning notes for this term"
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={createTerm.isPending}>
            {createTerm.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ArrowRight data-icon="inline-end" />
            )}
            Create and configure
          </Button>
        </div>
      </form>
    </Form>
  );
}
