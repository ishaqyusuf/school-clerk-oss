"use client";

import type { WorkflowAction } from "@/lib/assistant/shared";
import { Button } from "@school-clerk/ui/button";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ChatMessage as ChatMsg } from "./use-school-chat";
import { ClassroomListCard } from "./tool-cards/classroom-list-card";
import { FeeListCard } from "./tool-cards/fee-list-card";
import { ReceiptCard } from "./tool-cards/receipt-card";
import { StudentListCard } from "./tool-cards/student-list-card";

type Props = {
  message: ChatMsg;
  isLoading?: boolean;
  onWorkflowAction: (action: WorkflowAction) => void;
  onFeedback?: (rating: number) => void;
};

function ResultCard({ value }: { value: unknown }) {
  return (
    <div className="w-full rounded-xl border bg-card p-3 text-xs text-muted-foreground">
      <pre className="overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function ConfirmationCard({
  toolName,
  summary,
  confirmationToken,
  actionInput,
  onConfirm,
}: {
  toolName: string;
  summary: string;
  confirmationToken: string;
  actionInput: Record<string, unknown>;
  onConfirm: (action: WorkflowAction) => void;
}) {
  return (
    <div className="w-full rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">{summary}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Review the action before confirming. The assistant will execute it immediately after
        confirmation.
      </p>
      <Button
        className="mt-3"
        size="sm"
        onClick={() =>
          onConfirm({
            type: "confirm-tool",
            toolName,
            confirmationToken,
            summary,
            actionInput,
          })
        }
      >
        Confirm action
      </Button>
    </div>
  );
}

export function ChatMessage({
  message,
  isLoading,
  onWorkflowAction,
  onFeedback,
}: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "flex max-w-[88%] flex-col gap-2",
          isUser ? "items-end" : "items-start",
        ].join(" ")}
      >
        {message.parts.map((part, i) => {
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

          if (part.type === "tool-invocation" && part.state === "output-available") {
            const result = part.output as any;
            const toolName = part.toolName;

            if (result?.requiresConfirmation) {
              return (
                <ConfirmationCard
                  key={i}
                  toolName={result.toolName}
                  summary={result.summary}
                  confirmationToken={result.confirmationToken}
                  actionInput={result.actionInput}
                  onConfirm={onWorkflowAction}
                />
              );
            }

            if (toolName === "searchStudents" && Array.isArray(result)) {
              return (
                <div key={i} className="w-full max-w-sm">
                  <StudentListCard
                    students={result}
                    onSelect={(student) =>
                      onWorkflowAction({
                        type: "select-student",
                        studentId: student.id,
                        studentName: student.fullName,
                        termFormId: student.termFormId ?? null,
                        classroom: student.classroom,
                      })
                    }
                  />
                </div>
              );
            }

            if (toolName === "listClassrooms" && Array.isArray(result)) {
              return (
                <div key={i} className="w-full max-w-sm">
                  <ClassroomListCard
                    classrooms={result}
                    onSelect={(classroom) =>
                      onWorkflowAction({
                        type: "select-classroom",
                        classroomDepartmentId: classroom.id,
                        classroomName: classroom.displayName,
                      })
                    }
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
                    onConfirm={(payload) =>
                      onWorkflowAction({
                        type: "confirm-payment",
                        studentId: payload.studentId,
                        studentTermFormId: payload.studentTermFormId,
                        studentName: payload.studentName,
                        amount: payload.amount,
                        allocations: payload.allocations,
                        paymentMethod: payload.paymentMethod,
                      })
                    }
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

            if (result?.blocked && result?.message) {
              return (
                <div
                  key={i}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  {result.message}
                </div>
              );
            }

            return <ResultCard key={i} value={result} />;
          }

          return null;
        })}

        {!isUser && !isLoading && onFeedback ? (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => onFeedback(5)}>
              <ThumbsUp className="mr-1 h-3.5 w-3.5" />
              Helpful
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onFeedback(2)}>
              <ThumbsDown className="mr-1 h-3.5 w-3.5" />
              Needs work
            </Button>
          </div>
        ) : null}

        {isLoading && !isUser && (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
