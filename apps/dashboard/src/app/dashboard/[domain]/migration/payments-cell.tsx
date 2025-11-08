"use client";

import { useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import FormInput from "@/components/controls/form-input";
import FormSelect from "@/components/controls/form-select";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Menu } from "@/components/menu";
import { generateRandomString } from "@/utils/utils";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";

import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

import { StudentRecord } from "./data";
import { useMigrationStore } from "./store";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@school-clerk/ui/tabs";
import FormCheckbox from "@/components/controls/form-checkbox";
import { Actions } from "./actions-cell";
import { updateStudent } from "./server";

export function PaymentCell({ student }: { student: StudentRecord }) {
  const store = useMigrationStore();
  const { paid, payable, entranceStatus } = student?.paymentData || {};
  const [open, openChanged] = useState(false);
  async function __updateStudent(data) {
    console.log({ data });

    const studentName = student.fullName;
    const { postId, ...rest } = data;
    updateStudent(postId, student.classRoom, studentName, rest).then(
      (postId) => {
        data.postId = postId;
        store.update(
          `studentPayments.${student.classRoom}.${studentName}`,
          data
        );
        store.update("refreshToken", generateRandomString());
      }
    );
  }
  return (
    <div className="flex gap-4">
      <Menu
        open={open}
        onOpenChanged={openChanged}
        Icon={null}
        triggerSize="xs"
        label={
          <div className="inline-flex gap-4">
            {!entranceStatus || (
              <span
                className={cn(
                  "uppercase",
                  entranceStatus == "paid" ? "text-green-700" : null
                )}
              >
                Form:{entranceStatus}
              </span>
            )}
            <div
              className={cn(
                "inline-flex",
                paid > 0
                  ? paid == payable
                    ? "text-green-700"
                    : "text-red-700"
                  : ""
              )}
            >
              <AnimatedNumber maximumFractionDigits={0} value={paid} />
              <span>/</span>
              <AnimatedNumber maximumFractionDigits={0} value={payable} />
            </div>
          </div>
        }
        noSize
      >
        <div className="min-w-max max-w-md p-4">
          <PayData
            __updateStudent={__updateStudent}
            student={student}
            openChanged={openChanged}
          />
        </div>
      </Menu>
      <Actions student={student} __updateStudent={__updateStudent} />
    </div>
  );
}
function PayData({
  student,
  openChanged,
  __updateStudent,
}: {
  student: StudentRecord;
  openChanged;
  __updateStudent;
}) {
  const form = useForm({
    defaultValues: {
      ...student.paymentData?.storePayments,
    },
  });
  const store = useMigrationStore();
  function save() {
    // const _name = student.fullName;
    const data = form.getValues();
    __updateStudent(data);
    // store.update(`studentPayments.${student.classRoom}.${_name}`, data);
    // store.update("refreshToken", generateRandomString());
  }
  const arr = useFieldArray({
    control: form.control,
    name: "payments",
    keyName: "_id",
  });

  return (
    <FormProvider {...form}>
      <div className="w-[400px] flex flex-col gap-4">
        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="billables">Billables</TabsTrigger>
          </TabsList>
          <TabsContent value="payments">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Paid In</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student?.payments?.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p?.paymentType}</TableCell>
                    <TableCell>{p?.term}</TableCell>
                    <TableCell>{p?.paidIn}</TableCell>
                    <TableCell>{p?.amountPaid}</TableCell>
                  </TableRow>
                ))}
                {arr.fields.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <FormSelect
                        className="w-24"
                        control={form.control}
                        name={`payments.${i}.paymentType`}
                        options={["fee", "entrance"]}
                      />
                    </TableCell>
                    <TableCell>
                      <FormSelect
                        className="w-24"
                        control={form.control}
                        name={`payments.${i}.term`}
                        options={["1st", "2nd", "3rd"]}
                      />
                    </TableCell>
                    <TableCell>
                      <FormSelect
                        className="w-24"
                        control={form.control}
                        name={`payments.${i}.paidIn`}
                        options={["1st", "2nd", "3rd"]}
                      />
                    </TableCell>
                    <TableCell>
                      <FormInput
                        numericProps={{
                          prefix: "NGN ",
                        }}
                        className="w-24"
                        control={form.control}
                        name={`payments.${i}.amountPaid`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex gap-4">
              <Button
                size="xs"
                onClick={(e) => {
                  arr.append({} as any);
                }}
              >
                <Icons.add className="size-4" />
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="billables">
            <div className="flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Omit</TableHead>
                    <TableHead>Free</TableHead>
                    <TableHead>Term</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    student.paymentData?.storePayments?.billables
                  )?.map(([term, value]) => (
                    <TableRow className="" key={term}>
                      <TableCell className="flex">
                        <FormCheckbox
                          control={form.control}
                          name={`billables.${term}.omit`}
                        />
                        <div className="font-bold">{term}</div>
                      </TableCell>
                      <TableCell>
                        <FormCheckbox
                          control={form.control}
                          name={`billables.${term}.free`}
                        />
                      </TableCell>
                      <TableCell>
                        <FormInput
                          key={term}
                          control={form.control}
                          name={`billables.${term}.amount`}
                          numericProps={{
                            prefix: "NGN ",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end">
          <Button
            size="xs"
            onClick={(e) => {
              save();
              openChanged(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}
