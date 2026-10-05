"use client";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { cn } from "@school-clerk/ui/cn";
import { Mars, Venus } from "lucide-react";

import { useUpdateStudentProfile } from "@/hooks/use-update-student-profile";
import { toast } from "@school-clerk/ui/use-toast";

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
  const update = useUpdateStudentProfile({ studentId: studentId || "", contextKey: JSON.stringify([normalizedGender, disabled]),
    onSuccess(result) {
      toast({ title: "Gender updated", description: `Open-term fees reconciled; ${result.preservedTermFormIds.length} closed-term fee histories preserved.` });
      onUpdated?.();
    },
  });

  const updateGender = (nextGender: Gender) => {
    if (!studentId || disabled || normalizedGender === nextGender || !update.ready || update.isPending) return;
    if (!window.confirm("Update gender and reconcile eligible open-term fees? Closed-term fees, paid/allocated and manual charges are retained.")) return;
    void update.save({ gender: nextGender });
  };

  return (
    <div className="min-w-0 space-y-1">
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!studentId || disabled || update.isPending || !update.ready}
          aria-label={`Change student gender; current value ${normalizedGender ?? "unset"}`}
          className="min-h-11 min-w-[84px] justify-start gap-1.5 px-2"
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
          className="min-h-11"
          disabled={normalizedGender === "Male" || update.isPending || !update.ready}
          onSelect={() => updateGender("Male")}
        >
          Set as Male
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className="min-h-11"
          disabled={normalizedGender === "Female" || update.isPending || !update.ready}
          onSelect={() => updateGender("Female")}
        >
          Set as Female
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
    {update.error ? <p role="alert" className="max-w-xs whitespace-normal break-words text-xs text-destructive">{update.error} Check the profile and fees before retrying an interrupted response.</p> : null}
    </div>
  );
}
