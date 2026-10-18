"use client";

import { saveStaffAction } from "@/actions/save-staff";
import { useAction } from "next-safe-action/hooks";

import { useLoadingToast } from "@/hooks/use-loading-toast";
import { copyTextToClipboard } from "@/utils/clipboard";
import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type FieldErrors, useController, useWatch } from "react-hook-form";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Copy, Link2 } from "lucide-react";

import FormInput from "../controls/form-input";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useStaffFormContext } from "../staffs/form-context";
import {
  type AccessGridClass,
  StaffAccessGrid,
} from "../staffs/staff-access-grid";
import { SubmitButton } from "../submit-button";

const ASSIGNMENT_ROLES = new Set(["Teacher"]);

// First message in a react-hook-form error tree. Some refinements (e.g.
// "teachers need a classroom") have no inline field of their own.
function findErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { message } = value as { message?: unknown };
  if (typeof message === "string" && message) return message;
  for (const [key, nested] of Object.entries(value)) {
    // `ref` points at the DOM input; never walk into it.
    if (key === "ref") continue;
    const found = findErrorMessage(nested);
    if (found) return found;
  }
  return undefined;
}

type SaveResult = {
  inviteError: string | null;
  invited: boolean;
  inviteLink: string | null;
  staffId: string;
};

type Props = {
  staffId?: string | null;
  submitLabel?: string;
  closeOnSuccess?: boolean;
  onSuccess?: (data: SaveResult) => void;
};

function roleSupportsAssignments(role?: string | null) {
  return ASSIGNMENT_ROLES.has(role ?? "");
}

function OnboardingStatusBadge({
  status,
}: {
  status?: "NOT_SENT" | "PENDING" | "ACTIVE" | "FAILED";
}) {
  if (!status) return null;

  const styles = {
    NOT_SENT: "bg-muted text-muted-foreground",
    PENDING: "bg-amber-100 text-amber-900",
    ACTIVE: "bg-emerald-100 text-emerald-900",
    FAILED: "bg-red-100 text-red-900",
  }[status];

  const labels = {
    NOT_SENT: "Invite not sent",
    PENDING: "Pending onboarding",
    ACTIVE: "Active",
    FAILED: "Invite failed",
  }[status];

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {labels}
    </span>
  );
}

export function Form({
  staffId,
  submitLabel = "Save",
  closeOnSuccess = false,
  onSuccess,
}: Props) {
  const { setParams } = useStaffParams();
  const { control, handleSubmit, reset, setValue } = useStaffFormContext();
  const toast = useLoadingToast();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const role = useWatch({ control, name: "role" });
  const email = useWatch({ control, name: "email" });
  // Holds a link-only invite whose clipboard write was blocked, so the admin
  // can still copy it before the form closes.
  const [pendingInvite, setPendingInvite] = useState<SaveResult | null>(null);
  const { field: assignmentsField, fieldState: assignmentsState } =
    useController({ control, name: "assignments" });

  const { data: formData, isLoading } = useQuery(
    trpc.staff.getFormData.queryOptions(
      {
        staffId: staffId || undefined,
      },
      {
        enabled: true,
      },
    ),
  );

  const assignmentCount = assignmentsField.value?.length ?? 0;
  useEffect(() => {
    if (!roleSupportsAssignments(role) && assignmentCount) {
      setValue("assignments", []);
    }
  }, [assignmentCount, role, setValue]);

  function finishSave(data: SaveResult) {
    setPendingInvite(null);

    if (closeOnSuccess) {
      setParams({ createStaff: null });
      reset();
    }

    onSuccess?.(data);
  }

  const saveStaff = useAction(saveStaffAction, {
    async onSuccess({ data, input }) {
      if (!data) return;

      queryClient.invalidateQueries({
        queryKey: trpc.staff.getStaffList.queryKey(),
      });
      if (staffId) {
        queryClient.invalidateQueries({
          queryKey: trpc.staff.getFormData.queryKey({
            staffId,
          }),
        });
      }

      if (data.inviteLink) {
        let copied = false;
        try {
          copied = await copyTextToClipboard(data.inviteLink);
        } catch {
          // The link panel below is the fallback when clipboard writes are
          // blocked after the server round trip.
        }

        if (copied) {
          toast.success("Invite link copied. No email was sent.");
          finishSave(data);
          return;
        }

        setPendingInvite(data);
        toast.display({
          title: "Invite link ready",
          description: "Copy the link below and share it with the staff member.",
          duration: 6000,
        });
        return;
      }

      if (data.inviteError) {
        toast.error(
          input.deliveryMethod === "link"
            ? "Staff saved, but the invite link could not be created."
            : "Staff saved, but onboarding email could not be sent.",
        );
      } else if (data.invited) {
        toast.success("Onboarding email sent.");
      } else {
        toast.success(staffId ? "Staff updated." : "Staff saved.");
      }

      finishSave(data);
    },
    onError({ error }) {
      toast.error(error.serverError || "Could not save staff.");
    },
  });

  // Surface the first message so submit never looks dead.
  function onInvalid(errors: FieldErrors) {
    toast.error(findErrorMessage(errors) ?? "Check the form and try again.");
  }

  const allSubjectOptions = formData?.subjects ?? [];

  return (
    <div className="flex flex-col gap-5">
      {staffId ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Onboarding status</p>
              <p className="text-sm text-muted-foreground">
                Keep the invite current and update classroom access before the
                staff member completes onboarding.
              </p>
            </div>
            <OnboardingStatusBadge
              status={
                formData?.staff?.onboardingStatus as
                  "NOT_SENT" | "PENDING" | "ACTIVE" | "FAILED" | undefined
              }
            />
          </div>
          {formData?.staff?.lastInviteError ? (
            <p className="mt-3 text-sm text-red-600">
              Last email issue: {formData.staff.lastInviteError}
            </p>
          ) : null}
        </div>
      ) : null}

      {pendingInvite?.inviteLink ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Invite link ready</p>
            <p className="text-sm text-muted-foreground">
              Staff saved without sending an email. Share this link with them;
              it expires in 24 hours.
            </p>
          </div>
          <Input
            readOnly
            value={pendingInvite.inviteLink}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => finishSave(pendingInvite)}
            >
              Done
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                if (!pendingInvite.inviteLink) return;
                const copied = await copyTextToClipboard(
                  pendingInvite.inviteLink,
                );

                if (copied) {
                  toast.success("Invite link copied.");
                  finishSave(pendingInvite);
                  return;
                }

                toast.error("Select and copy the link manually.");
              }}
            >
              <Copy className="mr-1.5 size-3.5" />
              Copy link
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <FormInput
          name="email"
          label="Email"
          placeholder="teacher@school.com"
          control={control}
          inputProps={{
            autoComplete: "email",
          }}
        />
        <FormSelect
          name="role"
          label="Role"
          control={control}
          options={formData?.roles ?? []}
          placeholder="Select a role"
        />
      </div>

      {roleSupportsAssignments(role) ? (
        <StaffAccessGrid
          value={assignmentsField.value ?? []}
          onChange={assignmentsField.onChange}
          grid={(formData?.accessGrid ?? []) as AccessGridClass[]}
          subjects={allSubjectOptions}
          invalid={Boolean(assignmentsState.error)}
          isLoading={isLoading}
          viewerLabel={email?.trim() || undefined}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {role ? `${role}s don't need classroom access.` : null}
        </p>
      )}
      {roleSupportsAssignments(role) && assignmentsState.error ? (
        <p className="-mt-3 text-sm text-destructive">
          {findErrorMessage(assignmentsState.error) ??
            "Tick at least one classroom or subject."}
        </p>
      ) : null}

      <CustomSheetContentPortal>
        <form
          onSubmit={handleSubmit((data) =>
            saveStaff.execute({
              ...data,
              deliveryMethod: "email",
              staffId: staffId ?? data.staffId,
            }),
            onInvalid,
          )}
        >
          <div className="flex justify-end gap-2">
            {staffId ? null : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saveStaff.isExecuting || Boolean(pendingInvite)}
                onClick={handleSubmit((data) =>
                  saveStaff.execute({
                    ...data,
                    deliveryMethod: "link",
                    staffId: data.staffId,
                  }),
                  onInvalid,
                )}
              >
                <Link2 className="mr-1.5 size-3.5" />
                Copy link
              </Button>
            )}
            <SubmitButton
              size="sm"
              isSubmitting={saveStaff.isExecuting}
              disabled={Boolean(pendingInvite)}
            >
              {submitLabel}
            </SubmitButton>
          </div>
        </form>
      </CustomSheetContentPortal>
    </div>
  );
}
