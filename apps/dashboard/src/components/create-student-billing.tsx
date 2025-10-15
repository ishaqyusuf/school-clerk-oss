import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
  createSchoolFeeSchema,
  createStudentFeeSchema,
} from "@api/db/queries/accounting";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { FormSelect } from "@school-clerk/ui/controls/form-select";
import { FormCombobox } from "@school-clerk/ui/controls/form-combobox";
import { Form } from "@school-clerk/ui/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { selectOptions, uniqueList } from "@school-clerk/utils";
import { Label } from "@school-clerk/ui/label";
import { Button } from "@school-clerk/ui/button";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CreateSchoolBill } from "./create-school-billing";
import { AnimatedNumber } from "./animated-number";
import { SubmitButton } from "./submit-button";
import { FormDebugBtn } from "./form-debug-btn";
import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useStudentParams } from "@/hooks/use-student-params";

interface Props {
  studentId: string;
  termId: string;
}

export function CreateStudentBilling(props: Props) {
  const trpc = useTRPC();
  const { data: termFeeData, refetch } = useQuery(
    trpc.transactions.getTermFees.queryOptions({
      termId: props.termId,
    })
  );
  const saveFee = useMutation(
    trpc.transactions.createStudentFee.mutationOptions({
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
      onSuccess(data, variables, context) {
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey({
            studentId: params.studentViewId,
          }),
        });
      },
    })
  );
  const qc = useQueryClient();
  const { setParams, ...params } = useStudentParams();
  const form = useZodForm(createStudentFeeSchema, {
    defaultValues: {
      //   termId: props.termId,
      feeHistoryId: null,
      paid: null,
      //   payable: null,
      //   paymentTermId: props.termId,
      studentId: props.studentId,
      studentTermId: params.studentTermSheetId,
    },
  });

  const onSubmit = (data) => {
    saveFee.mutate(data);
  };
  const onCreate = (title) => {};
  const onEdit = (item) => {};
  //   const [schoolBill,setSchoolBill] = useState()
  const sbForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      opened: false,
    },
  });
  const sbData = sbForm.watch();
  return (
    <div>
      {!sbData?.opened ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="relative grid gap-4">
              <div className="absolute right-0">
                <Button
                  onClick={(e) => {
                    sbForm.reset({
                      description: "",
                      opened: true,
                      title: "",
                    });
                  }}
                  size="xs"
                  type="button"
                  variant="link"
                >
                  Create New
                </Button>
              </div>
              <FormCombobox
                control={form.control}
                label={"Fee"}
                name="feeHistoryId"
                comboProps={{
                  onCreate(value) {},
                  renderSelectedItem(item) {
                    return (
                      <div className="flex items-center justify-between w-full group gap-2 flex-1">
                        <span>{item.label as any}</span>
                        <span>{item.data?.description}</span>
                        <span>
                          <AnimatedNumber
                            value={item?.data?.amount}
                            currency="NGN"
                          />
                        </span>
                      </div>
                    );
                  },
                  renderOnCreate: (name) => {
                    return (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onCreate?.(name)}
                        >{`Create "${name}"`}</button>
                      </div>
                    );
                  },
                  items: [
                    ...selectOptions(
                      termFeeData?.activeFees || [],
                      "title",
                      "feeHistoryId"
                    ),
                    ...selectOptions(
                      uniqueList(termFeeData?.activatableFees || [], "slug"),
                      "title",
                      "id"
                    ),
                  ],
                  renderListItem(item) {
                    return (
                      <div className="flex flex-col w-full">
                        {!item?.item?.data?.startItem || (
                          <div className="my-2">
                            <Label>Create from old fees</Label>
                          </div>
                        )}
                        <div className="flex items-center justify-between w-full group gap-2 flex-1">
                          <div className="flex-col flex">
                            <span>{item.item?.label as any}</span>
                            <span>{item.item.data?.description}</span>
                          </div>
                          {/* <span>{item.item.data?.amount}</span> */}
                          <AnimatedNumber
                            value={item.item.data?.amount}
                            currency="NGN"
                          />
                          <div className="flex-1"></div>
                          {/* <button
                          type="button"
                          onClick={() => onEdit?.(item.item.id)}
                          className="text-xs opacity-0 group-hover:opacity-50 hover:opacity-100"
                        >
                          Edit
                        </button> */}
                        </div>
                      </div>
                    );
                  },
                }}
              />
              <div className="">
                <SubmitButton isSubmitting={saveFee.isPending}>
                  Create
                </SubmitButton>
                <FormDebugBtn />
              </div>
            </div>
          </form>
        </Form>
      ) : (
        <div>
          <CreateSchoolBill
            termId={props.termId}
            onCreate={(e) => {
              sbForm.reset({
                opened: false,
              });
            }}
            onClose={(e) => {
              sbForm.reset({
                opened: false,
              });
              refetch();
            }}
          />
        </div>
      )}
    </div>
  );
}
