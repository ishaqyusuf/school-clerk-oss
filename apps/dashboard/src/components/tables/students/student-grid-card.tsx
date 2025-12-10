import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import type { Item as DataItem } from "./columns";

import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";

import { Icons } from "@school-clerk/ui/custom/icons";
import { ArrowUpDown, MoreHorizontal, User } from "lucide-react";
import { useStudentParams } from "@/hooks/use-student-params";
import { useAuth } from "@/hooks/use-auth";
import { Item, Avatar, DropdownMenu } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { Spinner } from "@school-clerk/ui/spinner";

export function StudentGridCard({ item: student }: { item: DataItem }) {
  const { setParams, ...params } = useStudentParams();
  const auth = useAuth();
  const { mutate: deleteStudent, isPending: isDeleting } = useMutation(
    _trpc.students.deleteStudent.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
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
    <Item variant="outline" dir="rtl">
      <Item.Media>
        <Avatar className="size-10">
          <Avatar.Image
            src={"/placeholder.svg"}
            // src={student.avatar || "/placeholder.svg"}
            alt={`${student.studentName}`}
          />
          <Avatar.Fallback>{getInitials(student.studentName)}</Avatar.Fallback>
        </Avatar>
      </Item.Media>
      <Item.Content>
        <Item.Title>{student.studentName}</Item.Title>
        <Item.Description>{student.department}</Item.Description>
      </Item.Content>
      <Item.Actions>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto">
              {isDeleting ? (
                <Spinner />
              ) : (
                <>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </>
              )}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onClick={() => {}}>
              View Details
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={(e) => {}}>
              Edit Student
            </DropdownMenu.Item>
            <DropdownMenu.Item>Contact Parents</DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={(e) =>
                deleteStudent({
                  studentId: student.id,
                })
              }
            >
              Delete Student
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Item.Actions>
    </Item>
  );
}
