import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "../static-trpc";
import { useStudentFormContext } from "../students/form-context";
import { toast } from "@school-clerk/ui/use-toast";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import { SubmitButton } from "../submit-button";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { useStudentParams } from "@/hooks/use-student-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useRouter } from "next/navigation";

export function StudentFormAction({}) {
  const router = useRouter();
  const studentParams = useStudentParams();
  const receivePaymentParams = useReceivePaymentParams();
  const { mutate, data, reset, isPending } = useMutation(
    _trpc.students.createStudent.mutationOptions({
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
      onSuccess(data, variables, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.analytics.queryKey(),
        });

        router.refresh();

        if (studentParams.createStudentReturnTo === "receive-payment") {
          receivePaymentParams.setParams({
            receivePayment: true,
            receivePaymentStudentId: data.id,
            receivePaymentCreatedStudentId: data.id,
            receivePaymentStudentName: null,
            receivePaymentReturnTo: "student-create",
          });
          studentParams.setParams({
            createStudent: null,
            createStudentPrefillName: null,
            createStudentReturnTo: null,
          });
        }
      },
    })
  );
  const { control, handleSubmit, reset: resetForm } = useStudentFormContext();

  const onSubmit = (formData) => {
    mutate(formData);
  };

  if (data && studentParams.createStudentReturnTo !== "receive-payment") {
    return (
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Student created
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset();
              resetForm();
            }}
          >
            Create New
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset();
              studentParams.setParams({
                createStudent: null,
                createStudentPrefillName: null,
                createStudentReturnTo: null,
              });
            }}
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              reset();
              receivePaymentParams.setParams({
                receivePayment: true,
                receivePaymentStudentId: data.id,
                receivePaymentCreatedStudentId: data.id,
                receivePaymentStudentName: null,
                receivePaymentReturnTo: "student-create",
              });
              studentParams.setParams({
                createStudent: null,
                createStudentPrefillName: null,
                createStudentReturnTo: null,
              });
            }}
          >
            Apply Payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <form
        onSubmit={handleSubmit(onSubmit, (arg) => {
          toast({
            title: "Invalid Form Data",
            variant: "error",
          });
        })}
      >
        <div className="flex">
          <ButtonGroup>
            <SubmitButton size="sm" isSubmitting={isPending}>
              Submit
            </SubmitButton>
            <Button variant="outline" size="sm" type="button">
              <Icons.Menu className="size-4" />
            </Button>
          </ButtonGroup>
        </div>
      </form>
    </div>
  );
}
