"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useFieldArray } from "react-hook-form";

import { Button } from "@school-clerk/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

import { useClassroomFormContext } from "../classroom/form-context";
import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { SubmitButton } from "../submit-button";
import ConfirmBtn from "../confirm-button";

export function Form({}) {
  const { setParams } = useClassroomParams();
  const { control, handleSubmit } = useClassroomFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation(
    trpc.classrooms.createClassroom.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({ queryKey: trpc.classrooms.all.queryKey({}) });
        setParams(null);
      },
    })
  );
  const departments = useFieldArray({
    control,
    name: "departments",
    keyName: "_id",
  });
  return (
    <div className="grid gap-4 ">
      <FormInput name="className" label="Class Name" control={control} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead>Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.fields.map((d, i) => (
            <TableRow key={d._id}>
              <TableCell>
                <FormInput name={`departments.${i}.name`} control={control} />
              </TableCell>
              <TableCell>
                <FormInput
                  type="number"
                  name={`departments.${i}.departmentLevel`}
                  control={control}
                />
              </TableCell>
              <TableCell className="w-12">
                <ConfirmBtn
                  trash
                  onClick={(e) => {
                    departments.remove(i);
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            departments.append({ name: "" });
          }}
        >
          Add Department
        </Button>
      </div>
      <CustomSheetContentPortal>
        <form onSubmit={handleSubmit((data) => mutate(data))}>
          <div className="flex justify-end">
            <SubmitButton isSubmitting={isPending}>Submit</SubmitButton>
          </div>
        </form>
      </CustomSheetContentPortal>
    </div>
  );
}
