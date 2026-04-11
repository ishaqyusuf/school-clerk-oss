"use client";

import { Loader2 } from "lucide-react";
import type { ChatMessage as ChatMsg } from "./use-school-chat";
import { ClassroomListCard } from "./tool-cards/classroom-list-card";
import { FeeListCard } from "./tool-cards/fee-list-card";
import { ReceiptCard } from "./tool-cards/receipt-card";
import { StudentListCard } from "./tool-cards/student-list-card";

type Props = {
  message: ChatMsg;
  isLoading?: boolean;
  onAppend: (content: string) => void;
};

export function ChatMessage({ message, isLoading, onAppend }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "flex max-w-[85%] flex-col gap-2",
          isUser ? "items-end" : "items-start",
        ].join(" ")}
      >
        {message.parts.map((part, i) => {
          // ── Text parts ─────────────────────────────────────────────────
          if (part.type === "text" && part.text.trim()) {
            return (
              <div
                key={i}
                className={[
                  "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                ].join(" ")}
              >
                {part.text.split("\n").map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </div>
            );
          }

          // ── Tool invocation parts ───────────────────────────────────────
          if (part.type === "tool-invocation" && part.state === "output-available") {
            const result = part.output as any;
            const toolName = part.toolName;

            if (toolName === "searchStudents" && Array.isArray(result)) {
              return (
                <div key={i} className="w-full max-w-sm">
                  <StudentListCard
                    students={result}
                    onSelect={(student) => {
                      onAppend(
                        `select student id:${student.id} name:${student.fullName} termFormId:${student.termFormId ?? "none"}`,
                      );
                    }}
                  />
                </div>
              );
            }

            if (toolName === "listClassrooms" && Array.isArray(result)) {
              return (
                <div key={i} className="w-full max-w-sm">
                  <ClassroomListCard
                    classrooms={result}
                    onSelect={(classroom) => {
                      onAppend(
                        `select classroom id:${classroom.id} name:${classroom.displayName}`,
                      );
                    }}
                  />
                </div>
              );
            }

            if (toolName === "getStudentPaymentData" && result?.fees) {
              return (
                <div key={i} className="w-full max-w-sm">
                  <FeeListCard
                    studentName={result.studentName}
                    studentId={result.studentId}
                    studentTermFormId={result.studentTermFormId}
                    fees={result.fees}
                    totalPending={result.totalPending}
                    onConfirm={(payload) => {
                      onAppend(
                        `confirm payment studentId:${payload.studentId} studentTermFormId:${payload.studentTermFormId} studentName:${payload.studentName} amount:${payload.amount} method:${payload.paymentMethod} allocations:${JSON.stringify(payload.allocations)}`,
                      );
                    }}
                  />
                </div>
              );
            }

            if (toolName === "enrollStudent" && result?.success) {
              return (
                <ReceiptCard
                  key={i}
                  data={{
                    type: "enrollment",
                    studentName: result.studentName,
                    classroomName: result.classroomName,
                    action: result.action,
                  }}
                />
              );
            }

            if (toolName === "receiveStudentPayment" && result?.success) {
              return (
                <ReceiptCard
                  key={i}
                  data={{
                    type: "payment",
                    studentName: result.studentName,
                    amountReceived: result.amountReceived,
                    paymentMethod: result.paymentMethod,
                    paymentCount: result.paymentCount,
                  }}
                />
              );
            }

            if (toolName === "recordInventoryIssuance" && result?.success) {
              return (
                <ReceiptCard
                  key={i}
                  data={{
                    type: "issuance",
                    itemTitle: result.itemTitle,
                    quantity: result.quantity,
                    issuedTo: result.issuedTo,
                    note: result.note,
                  }}
                />
              );
            }
          }

          return null;
        })}

        {/* Loading spinner for in-progress AI message */}
        {isLoading && !isUser && (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Thinking…</span>
          </div>
        )}
      </div>
    </div>
  );
}
