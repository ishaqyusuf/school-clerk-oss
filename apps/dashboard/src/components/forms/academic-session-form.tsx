"use client";

import { FormProvider, useFieldArray } from "react-hook-form";

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
import { useMutation } from "@tanstack/react-query";
import { toast } from "@school-clerk/ui/use-toast";

export function AcademicSessionForm() {
  const { params } = useAcademicParams();
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
  const save = useMutation(
    trpc.academics.createAcademicSession.mutationOptions({
      onSuccess(data, variables, context) {
        toast({
          title: "Success",
          description: "Your academic session has been saved.",
        });
      },
      onError(error, variables, context) {
        console.log(error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again later.",
        });
      },
    })
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
