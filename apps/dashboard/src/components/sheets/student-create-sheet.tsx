import { useStudentParams } from "@/hooks/use-student-params";
import { useAssistantStudentForm } from "@/store/assistant-student-form";
import { useAuth } from "@/hooks/use-auth";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { useMemo } from "react";

import { Form } from "../forms/student-form";
import { StudentFormAction } from "../forms/student-form-action";
import { FormContext } from "../students/form-context";
import Sheet from "@school-clerk/ui/custom/sheet";
export function StudentCreateSheet({}) {
  const { createStudent, createStudentPrefillName, createStudentReturnTo, setParams } =
    useStudentParams();
  const isOpen = createStudent;
  const auth = useAuth();
  const scopeReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!auth.id && !!auth.sessionId && !!auth.profile?.schoolId && auth.profile.auth?.userId === auth.id;
  const scopeKey = JSON.stringify([auth.profile?.schoolId, auth.id, auth.sessionId, auth.profile?.sessionId, auth.profile?.termId]);

  const seed = useAssistantStudentForm((state) => state.seed);
  const setSeed = useAssistantStudentForm((state) => state.setSeed);
  const assistantScope = [auth.profile?.schoolId, auth.id, auth.profile?.sessionId, auth.profile?.termId].join(":");
  const assistant = createStudentReturnTo === "assistant" && scopeReady &&
    seed?.kind === "register" && seed.scope === assistantScope ? seed.input : undefined;
  const defaultValues = useMemo(
    () => ({
      name: assistant?.givenName ?? assistant?.name ?? createStudentPrefillName ?? "",
      surname: assistant?.surname ?? "",
      otherName: assistant?.otherName ?? "",
      gender: "Male" as const,
      dob: null,
      classRoomId: assistant?.classroomId ?? null,
      admissionType: assistant?.admissionType ?? (assistant?.fees.length ? "NEW_ADMISSION" as const : "UNCLASSIFIED" as const),
      paymentDetails: assistant ? {
        method: assistant.method === "Bank Transfer" ? "TRANSFER" : assistant.method === "Cheque" ? "Cheque" : "CASH",
        reference: assistant.reference,
        paymentDate: assistant.date ? new Date(`${assistant.date}T12:00:00+01:00`) : undefined,
      } : undefined,
      fees: [],
      termForms: [],
      guardian: {
        id: null,
        name: null,
        phone: null,
        phone2: null,
      },
    }),
    [assistant, createStudentPrefillName],
  );

  if (!isOpen) return null;

  return (
      <Sheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => {
          if (assistant) setSeed(null);
          void setParams({
            createStudent: null,
            createStudentPrefillName: null,
            createStudentReturnTo: null,
          });
        }}
        sheetName="create-student"
      >
        <SheetHeader>
          <SheetTitle>Student Form</SheetTitle>
        </SheetHeader>
        {scopeReady ? (
          <FormContext key={JSON.stringify([scopeKey, assistant])} defaultValues={defaultValues}>
            <Sheet.Content className="flex min-w-0 flex-col gap-2">
              <Form assistantFees={assistant?.fees} />
            </Sheet.Content>
            <Sheet.Footer className="shrink-0 border-t bg-background py-3">
              <StudentFormAction requireClassroom={Boolean(assistant)} expectedPaymentCount={assistant?.fees.length} />
            </Sheet.Footer>
          </FormContext>
        ) : (
          <Sheet.Content>
            <div role="status" className="min-w-0 space-y-2 py-6 text-sm">
              <p>{auth.isPending || auth.isProfileLoading ? "Loading your registration workspace…" : "Registration workspace is unavailable."}</p>
              <p className="text-muted-foreground">Wait for your school context to load, or close this form and refresh before entering student details.</p>
            </div>
          </Sheet.Content>
        )}
      </Sheet>
  );
}
