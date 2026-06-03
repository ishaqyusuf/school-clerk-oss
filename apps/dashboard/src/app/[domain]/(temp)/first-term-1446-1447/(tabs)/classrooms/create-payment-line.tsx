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
import { PaymentRaw, Student } from "@api/db/queries/first-term-data";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { Textarea } from "@school-clerk/ui/textarea";
import FormSelect from "@/components/controls/form-select";

const createBatchStudentSchema = z.object({
  lines: z.string().min(1, "Names are required"),
});

export function CreatePaymentLine() {
  const [open, setOpen] = useState(false);

  const batchForm = useZodForm(createBatchStudentSchema, {
    defaultValues: {
      lines: "",
    },
  });
  const m = usePostMutate();
  const qc = useQueryClient();
  const trpc = useTRPC();

  const onBatchSubmit = batchForm.handleSubmit(async (data) => {
    const line = data.lines.split("\n").filter(Boolean);

    m.createAction.mutate(
      {
        data: line.map(
          (line) =>
            ({
              type: "raw-payment",
              line,
            }) as PaymentRaw
        ),
      },
      {
        onSuccess: () => {
          batchForm.reset();
          setOpen(false);
          qc.invalidateQueries({
            queryKey: trpc.ftd.getPaymentsList.queryKey(),
          });
        },
      }
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">New Payments</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Form {...batchForm}>
          <form onSubmit={onBatchSubmit} className="space-y-4 pt-4">
            <h4 className="font-medium leading-none">
              Add Multiple Payment Line s
            </h4>
            <p className="text-sm text-muted-foreground">
              Enter one payment information per line
            </p>
            <FormField
              control={batchForm.control}
              name="lines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Lines</FormLabel>
                  <FormControl>
                    <Textarea placeholder="" rows={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={m.createAction.isPending}>
              {m.createAction.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
