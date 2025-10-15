import { useMutation } from "@tanstack/react-query";
import { _trpc } from "../static-trpc";
import { useStudentFormContext } from "../students/form-context";
import { toast } from "@school-clerk/ui/use-toast";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import { SubmitButton } from "../submit-button";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function StudentFormAction({}) {
  const { mutate, data, reset, isPending } = useMutation(
    _trpc.students.createStudent.mutationOptions({
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
      onSuccess(data, variables, context) {},
    })
  );
  const { control, handleSubmit } = useStudentFormContext();

  const onSubmit = (data) => {
    mutate(data);
  };
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
