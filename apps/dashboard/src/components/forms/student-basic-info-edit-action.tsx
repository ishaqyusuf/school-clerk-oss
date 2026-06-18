import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { _qc, _trpc } from "../static-trpc";
import { SubmitButton } from "../submit-button";
import { useStudentFormContext } from "../students/form-context";
import { toast } from "@school-clerk/ui/use-toast";

type Props = {
  studentId: string;
  onSuccess?: () => void;
};

export function StudentBasicInfoEditAction({ studentId, onSuccess }: Props) {
  const router = useRouter();
  const { handleSubmit } = useStudentFormContext();
  const { mutate, isPending } = useMutation(
    _trpc.students.updateStudentBasicProfile.mutationOptions({
      meta: {
        toastTitle: {
          error: "Could not update student",
          loading: "Saving student...",
          success: "Student updated",
        },
      },
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.students.overview.queryKey({ studentId }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.studentsRecentRecord.queryKey(),
        });
        router.refresh();
        onSuccess?.();
      },
    }),
  );

  return (
    <form
      className="flex justify-end"
      onSubmit={handleSubmit(
        (formData) => {
          mutate({
            id: studentId,
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
      <SubmitButton size="sm" isSubmitting={isPending}>
        Save changes
      </SubmitButton>
    </form>
  );
}
