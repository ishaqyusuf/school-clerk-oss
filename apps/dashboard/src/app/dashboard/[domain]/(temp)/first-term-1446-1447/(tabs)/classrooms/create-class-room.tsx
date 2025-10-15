"use client";
import { Button } from "@school-clerk/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { useZodForm } from "@/hooks/use-zod-form";
import { z } from "zod";

import { usePostMutate } from "../../use-global";
import { useState } from "react";
import { ClassPostData, Student } from "@api/db/queries/first-term-data";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { generateRandomString } from "@school-clerk/utils";
import FormInput from "@/components/controls/form-input";
import FormSelect from "@/components/controls/form-select";
import { Form } from "@school-clerk/ui/form";
import { indices } from "../../utils";

const createStudentSchema = z.object({
  classTitle: z.string().min(1, "Class title is required"),
  classIndex: z.string(),
});

export function CreateClassroom() {
  const [open, setOpen] = useState(false);
  const form = useZodForm(createStudentSchema, {
    defaultValues: {
      classTitle: "",
      classIndex: "",
    },
  });

  const m = usePostMutate();
  const qc = useQueryClient();
  const trpc = useTRPC();

  const onSingleSubmit = form.handleSubmit(
    async ({ classTitle, classIndex }) => {
      const studentData: Partial<ClassPostData> = {
        type: "class",
        classCode: generateRandomString(),
        classTitle,
        classIndex: Number(classIndex),
      };
      m.createAction.mutate(
        {
          data: studentData,
        },
        {
          onSuccess: () => {
            form.reset();
            setOpen(false);
            // qc.invalidateQueries({
            //   queryKey: trpc.ftd.getClassroomStudents.queryKey(),
            // });
            qc.invalidateQueries({
              queryKey: trpc.ftd.classRooms.queryKey(),
            });
          },
        }
      );
    }
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">New Class</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Form {...form}>
          <form onSubmit={onSingleSubmit} className="space-y-4 pt-4">
            <h4 className="font-medium leading-none">Add Class</h4>
            <p className="text-sm text-muted-foreground">New Class</p>
            <FormInput
              inlineLabel
              label="Class Title"
              control={form.control}
              name="classTitle"
            />
            <FormSelect
              inlineLabel
              options={indices}
              control={form.control}
              label="Class Index"
              name="classIndex"
            />
            <Button type="submit" disabled={m.createAction.isPending}>
              {m.createAction.isPending ? "Creating..." : "Create Student"}
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
