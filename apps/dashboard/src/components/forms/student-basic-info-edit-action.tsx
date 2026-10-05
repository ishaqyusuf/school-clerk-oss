"use client";

import { useRouter } from "next/navigation";

import { useUpdateStudentProfile } from "@/hooks/use-update-student-profile";
import { SubmitButton } from "../submit-button";
import { useStudentFormContext } from "../students/form-context";
import { toast } from "@school-clerk/ui/use-toast";

type Props = {
  studentId: string;
  onSuccess?: () => void;
};

export function StudentBasicInfoEditAction({ studentId, onSuccess }: Props) {
  const router = useRouter();
  const { handleSubmit, watch } = useStudentFormContext();
  const draft = watch(["name", "surname", "otherName", "dob", "gender", "guardian"]);
  const update = useUpdateStudentProfile({ studentId, contextKey: JSON.stringify(draft),
    onSuccess(result) {
      toast({ title: "Student updated", description: result.genderChanged
        ? `Open-term fees reconciled. ${result.preservedTermFormIds.length} closed-term fee histories preserved.` : undefined });
      router.refresh();
      onSuccess?.();
    },
  });

  return (
    <form
      className="flex w-full min-w-0 flex-col gap-2"
      onSubmit={handleSubmit(
        (formData) => {
          void update.save({
            data: {
              gender: formData.gender,
              name: formData.name,
              otherName: formData.otherName || null,
              surname: formData.surname,
              dob: formData.dob || null,
              guardian: formData.guardian || null,
            },
          });
        },
        () => {
          toast({
            title: "Invalid student information",
            variant: "error",
          });
        },
      )}
    >
      <p className="break-words text-xs text-muted-foreground">Gender corrections can add or cancel eligible open-term fees. Closed-term fees and protected payments are retained. Shared or login-bound guardian contacts require their own review workflow.</p>
      {update.error ? <p role="alert" className="break-words text-sm text-destructive">{update.error} If the response was interrupted, check the profile and fees before retrying.</p> : null}
      {!update.ready ? <p role="status" className="text-sm text-muted-foreground">Student workspace unavailable. Reopen the editor before saving.</p> : null}
      <SubmitButton type="submit" className="min-h-11 w-full sm:w-auto sm:self-end" size="sm" disabled={!update.ready} isSubmitting={update.isPending}>
        Save changes
      </SubmitButton>
    </form>
  );
}
