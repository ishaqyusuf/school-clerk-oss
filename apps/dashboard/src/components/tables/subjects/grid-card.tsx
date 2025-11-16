import { Item } from "@school-clerk/ui/composite";
import { Item as ColumnItem } from "./columns";
import ConfirmBtn from "@/components/confirm-button";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";
import { View } from "lucide-react";

export function GridCard({ item, onClick }: { item: ColumnItem; onClick? }) {
  const { mutate: deleteClassSubject, isPending: isDeleting } = useMutation(
    _trpc.subjects.deleteClassSubject.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({
            departmentId: item.classRoomDepartment.id,
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
  return (
    <Item role="button" variant="outline" dir="rtl">
      <Item.Content>
        <Item.Title>{item?.subject?.title}</Item.Title>
        <Item.Description>
          {item?._count?.assessments} assessments
        </Item.Description>
        <Item.Actions>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => onClick?.(item)}
          >
            <View className="size-4" />
          </Button>
          <ConfirmBtn
            trash
            onClick={(e) => {
              deleteClassSubject({
                id: item.id,
              });
            }}
          />
        </Item.Actions>
      </Item.Content>
    </Item>
  );
}
