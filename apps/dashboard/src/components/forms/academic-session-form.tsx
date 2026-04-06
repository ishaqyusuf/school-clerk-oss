"use client";

import { useEffect, useState } from "react";
import { FormProvider, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { addYears } from "date-fns";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@school-clerk/ui/use-toast";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";

export function AcademicSessionForm() {
  const { params, setParams } = useAcademicParams();
  const router = useRouter();
  const [initWithTerms, setInitWithTerms] = useState(true);

  const form = useZodForm(createAcademicSessionSchema, {
    defaultValues: {
      sessionId: params?.sessionId,
    },
  });
  const terms = useFieldArray({
    control: form.control,
    name: "terms",
    keyName: "_id",
  });

  const trpc = useTRPC();

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
    if (initWithTerms && prefill.previousTerms.length > 0) {
      terms.replace(
        prefill.previousTerms.map((t) => ({
          title: t.title,
          startDate: undefined,
          endDate: undefined,
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
          startDate: undefined,
          endDate: undefined,
        })),
      );
    } else if (!checked) {
      terms.replace([]);
    }
  };

  const save = useMutation(
    trpc.academics.createAcademicSession.mutationOptions({
      async onSuccess(data) {
        toast({
          title: "Session created!",
          description: "Your academic session has been saved.",
        });

        const firstTerm = data?.terms?.[0];
        const lastTermId = prefill?.lastTermId;

        if (firstTerm && lastTermId) {
          // Auto-switch the active session/term cookie to the new session
          await switchSessionTerm({
            sessionId: data.sessionId,
            sessionTitle: data.sessionTitle,
            termId: firstTerm.id,
            termTitle: firstTerm.title,
          });
          setParams(null);
          router.push(`/academic/progression/${lastTermId}/${firstTerm.id}`);
        } else {
          setParams(null);
        }
      },
      onError(error) {
        console.log(error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again later.",
        });
      },
    }),
  );
  const onSubmit = form.handleSubmit((data) => {
    save.mutate(data);
  });
  const watch = form.watch();
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

          {/* Initialize with Terms toggle */}
          {!watch.sessionId && (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={initWithTerms}
                  onChange={(e) => handleInitToggle(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors ${initWithTerms ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${initWithTerms ? "translate-x-4" : "translate-x-0"}`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Initialize with Terms</p>
                <p className="text-xs text-muted-foreground">
                  Auto-populate terms based on previous session
                </p>
              </div>
            </label>
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
              variant={"outline"}
              type="button"
              className="w-full"
              onClick={(e) => {
                terms.append({
                  endDate: undefined,
                  startDate: undefined,
                  title: "",
                });
              }}
            >
              <Icons.Add className="size-4" />
              <span>Add</span>
            </Button>
          </div>
          <div className="flex justify-end">
            <SubmitButton isSubmitting={save?.isPending}>Submit</SubmitButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
