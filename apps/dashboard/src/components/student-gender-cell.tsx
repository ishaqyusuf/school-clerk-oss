"use client";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { cn } from "@school-clerk/ui/cn";
import { useMutation } from "@tanstack/react-query";
import { Mars, Venus } from "lucide-react";

import { _qc, _trpc } from "@/components/static-trpc";

type Gender = "Male" | "Female";

type Props = {
  studentId?: string | null;
  gender?: string | null;
  disabled?: boolean;
  align?: "start" | "end";
  onUpdated?: () => void;
};

export function StudentGenderCell({
  studentId,
  gender,
  disabled,
  align = "end",
  onUpdated,
}: Props) {
  const normalizedGender = gender === "Male" || gender === "Female" ? gender : null;
  const { mutate: changeGender, isPending } = useMutation(
    _trpc.students.changeGender.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
        });
        onUpdated?.();
      },
      meta: {
        toastTitle: {
          error: "Unable to update gender",
          loading: "Updating...",
          success: "Gender updated.",
        },
      },
    }),
  );

  const updateGender = (nextGender: Gender) => {
    if (!studentId || disabled || normalizedGender === nextGender) return;
    changeGender({ id: studentId, gender: nextGender });
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!studentId || disabled || isPending}
          className="h-8 min-w-[84px] justify-start gap-1.5 px-2"
        >
          {normalizedGender === "Female" ? (
            <Venus className="size-3.5 text-pink-600" />
          ) : (
            <Mars className="size-3.5 text-blue-600" />
          )}
          <Badge
            variant="outline"
            className={cn(
              "px-1.5 py-0 text-[10px]",
              normalizedGender === "Female"
                ? "border-pink-200 text-pink-700"
                : "border-blue-200 text-blue-700",
            )}
          >
            {normalizedGender ?? "Set"}
          </Badge>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align={align}>
        <DropdownMenu.Item
          disabled={normalizedGender === "Male"}
          onSelect={() => updateGender("Male")}
        >
          Set as Male
        </DropdownMenu.Item>
        <DropdownMenu.Item
          disabled={normalizedGender === "Female"}
          onSelect={() => updateGender("Female")}
        >
          Set as Female
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
