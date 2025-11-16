import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "./static-trpc";
import { Menu } from "./menu";
import { Bolt, ListPlus } from "lucide-react";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { Button } from "@school-clerk/ui/button";

interface Props {
  departmentId: string;
}
export function QuickAddSubject(props: Props) {
  const { data: subjects } = useQuery(
    _trpc.subjects.getQuickAddSubjects.queryOptions(
      {
        departmentId: props.departmentId,
      },
      {
        enabled: !!props.departmentId,
      }
    )
  );
  const { mutate: quickCreate, isPending: isCreating } = useMutation(
    _trpc.subjects.saveSubject.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.byClassroom.queryKey({
            departmentId: props.departmentId,
          }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({
            departmentId: props.departmentId,
          }),
        });
      },
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  if (!subjects?.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button size="sm">
          <ListPlus className="size-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="">
        {subjects.map((s) => (
          <DropdownMenu.Item
            onClick={(e) => {
              quickCreate({
                departmentId: props.departmentId,
                subjectId: s.id,
                title: s.title,
              });
            }}
            className="pr-8"
            key={s.id}
          >
            {s.title}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
