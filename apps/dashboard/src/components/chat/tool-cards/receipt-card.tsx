"use client";

import { Badge } from "@school-clerk/ui/badge";
import { CheckCircle2, Package, UserRound } from "lucide-react";

type EnrollmentReceipt = {
  type: "enrollment";
  studentName: string;
  classroomName: string;
  action: "enrolled" | "updated";
};

type PaymentReceipt = {
  type: "payment";
  studentName: string;
  amountReceived: number;
  paymentMethod: string;
  paymentCount: number;
};

type IssuanceReceipt = {
  type: "issuance";
  itemTitle: string;
  quantity: number;
  issuedTo?: string;
  note?: string;
};

type Props = {
  data: EnrollmentReceipt | PaymentReceipt | IssuanceReceipt;
};

export function ReceiptCard({ data }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-0.5">
        {data.type === "enrollment" && (
          <>
            <p className="text-sm font-semibold text-green-800">
              {data.action === "enrolled" ? "Enrolled" : "Classroom Updated"}
            </p>
            <p className="text-sm text-green-700">
              <span className="font-medium">{data.studentName}</span> is now in{" "}
              <span className="font-medium">{data.classroomName}</span>.
            </p>
          </>
        )}
        {data.type === "payment" && (
          <>
            <p className="text-sm font-semibold text-green-800">Payment Received</p>
            <p className="text-sm text-green-700">
              <span className="font-medium">
                ₦{data.amountReceived.toLocaleString()}
              </span>{" "}
              received from <span className="font-medium">{data.studentName}</span> via{" "}
              {data.paymentMethod}.
            </p>
            {data.paymentCount > 1 && (
              <p className="text-xs text-green-600">
                Applied to {data.paymentCount} fee items.
              </p>
            )}
          </>
        )}
        {data.type === "issuance" && (
          <>
            <p className="text-sm font-semibold text-green-800">Item Issued</p>
            <p className="text-sm text-green-700">
              <span className="font-medium">{data.quantity}×</span>{" "}
              <span className="font-medium">{data.itemTitle}</span>
              {data.issuedTo && (
                <>
                  {" "}issued to{" "}
                  <span className="font-medium">{data.issuedTo}</span>
                </>
              )}
              .
            </p>
            {data.note && (
              <p className="text-xs text-green-600">{data.note}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
