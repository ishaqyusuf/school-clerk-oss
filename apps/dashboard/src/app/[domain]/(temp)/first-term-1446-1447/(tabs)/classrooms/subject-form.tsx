import { useZodForm } from "@/hooks/use-zod-form";
import { useEffect, useState } from "react";
import { z } from "zod";
import { usePostMutate } from "../../use-global";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { Form } from "@school-clerk/ui/form";
import FormInput from "@/components/controls/form-input";
import FormSelect from "@/components/controls/form-select";
import { SubmitButton } from "@/components/submit-button";
import { ClassSubject, SubjectPostData } from "@api/db/queries/first-term-data";
import { generateRandomString } from "@school-clerk/utils";
import { toast } from "@school-clerk/ui/use-toast";

interface SubjectFormProps {
  subject: Partial<ClassSubject>;
  children?;
  selectableSubjects: Partial<SubjectPostData>[];
}
export function SubjectForm({
  children,
  subject,
  selectableSubjects,
}: SubjectFormProps) {
  const { postId, classId, subjectId, type } = subject;
  //   selectableSubjects?.[0]?.
  const [opened, setOpened] = useState(false);

  const form = useZodForm(
    z.object({
      subjectId: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
    }),
    {
      defaultValues: {
        // classId,
        title: "",
        subjectId: "-1",
        // title,
        // obtainable,
        // assessmentType,
        // index,
      },
    }
  );
  const m = usePostMutate();
  const trpc = useTRPC();
  const qc = useQueryClient();
  async function onSubmit(data) {
    if (isNew && !data.title) {
      toast({
        variant: "error",
        title: "Error",
        description: "Please provide a title for the subject.",
      });
      return;
    }

    const events = {
      onError(error, variables, context) {
        console.log(error);
      },
      onSuccess(data, variables, context) {
        qc.invalidateQueries({
          queryKey: trpc.ftd.getClassRoomSubjects.queryKey(),
        });
        form.setValue("subjectId", null);
        toast({
          variant: "success",
          title: "Subject created successfully",
        });
        setOpened(false);
      },
    };
    if (isNew) {
      m.createAction.mutate(
        {
          data: {
            code: generateRandomString(5),
            title: data.title!,
            type: "subject",
          } as SubjectPostData,
        },
        events
      );
    } else {
      m.createAction.mutate(
        {
          data: {
            classId,
            subjectId: Number(data.subjectId),
            type: "class-subject",
          } as ClassSubject,
        },
        events
      );
    }
  }
  const subjectIdWatch = form.watch("subjectId");
  const isNew = subjectIdWatch === "-1";
  useEffect(() => {
    form.reset({
      subjectId: "-1",
      title: "",
    });
  }, [opened]);
  return (
    <Popover open={opened} onOpenChange={setOpened}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="">
          <Form {...form}>
            <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormSelect
                inlineLabel
                label="Subject"
                options={[
                  {
                    label: "Create",
                    value: "-1",
                  },
                  ...(selectableSubjects?.map((s) => ({
                    label: s.title,
                    value: String(s.postId),
                  })) || []),
                ]}
                control={form.control}
                name="subjectId"
              />
              <FormInput
                inlineLabel
                disabled={!isNew}
                label="Subject"
                control={form.control}
                name="title"
              />

              <SubmitButton isSubmitting={m.isPending}>Submit</SubmitButton>
            </form>
          </Form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
