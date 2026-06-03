"use client";
import { Button } from "@school-clerk/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { useZodForm } from "@/hooks/use-zod-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@school-clerk/ui/form";

import { usePostMutate } from "../../use-global";
import { useState } from "react";
import { Student } from "@api/db/queries/first-term-data";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { Textarea } from "@school-clerk/ui/textarea";
import FormSelect from "@/components/controls/form-select";

const createBatchStudentSchema = z.object({
  names: z.string().min(1, "Names are required"),
  gender: z.enum(["M", "F"]),
});

export function CreateStudent({ classId }: { classId: number }) {
  const [open, setOpen] = useState(false);

  const batchForm = useZodForm(createBatchStudentSchema, {
    defaultValues: {
      gender: "M",
    },
  });
  const m = usePostMutate();
  const qc = useQueryClient();
  const trpc = useTRPC();

  const onBatchSubmit = batchForm.handleSubmit(async (data) => {
    const names = data.names.split("\n").filter((name) => name.trim() !== "");
    const students = names.map((name) => {
      const separator = name.includes(".") ? "." : " ";
      const parts = name.split(separator);
      const [firstName, surname, ...otherName] = parts;
      return {
        firstName,
        surname,
        otherName: otherName.join(" "),
        gender: data.gender,
        type: "student",
        classId,
      } as Student;
    });

    m.createAction.mutate(
      {
        data: students,
      },
      {
        onSuccess: () => {
          batchForm.reset();
          setOpen(false);
          qc.invalidateQueries({
            queryKey: trpc.ftd.getClassroomStudents.queryKey(),
          });
        },
      }
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">New Student</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Form {...batchForm}>
          <form onSubmit={onBatchSubmit} className="space-y-4 pt-4">
            <h4 className="font-medium leading-none">Add Multiple Students</h4>
            <p className="text-sm text-muted-foreground">
              Enter one student name per line. Split names with a space or dot.
            </p>
            <FormField
              control={batchForm.control}
              name="names"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Names</FormLabel>
                  <FormControl>
                    <Textarea placeholder="" rows={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormSelect
              inlineLabel
              label="Gender"
              options={[
                {
                  label: "Male",
                  value: "M",
                },
                {
                  label: "Female",
                  value: "F",
                },
              ]}
              control={batchForm.control}
              name="gender"
            />
            <Button type="submit" disabled={m.createAction.isPending}>
              {m.createAction.isPending ? "Creating..." : "Create Students"}
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
