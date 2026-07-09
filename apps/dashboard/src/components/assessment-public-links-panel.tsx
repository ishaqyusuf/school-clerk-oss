"use client";

import { useAuth } from "@/hooks/use-auth";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import { useLocalTenantHref } from "@school-clerk/tenant-url/react";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, Select } from "@school-clerk/ui/composite";
import { Textarea } from "@school-clerk/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Copy, Link2, X } from "lucide-react";
import { useMemo, useState } from "react";

const DURATION_OPTIONS = [
  { label: "24 hours", value: "24" },
  { label: "2 days", value: "48" },
  { label: "7 days", value: "168" },
] as const;

type Props = {
  allSubjectIds: string[];
  departmentId: string;
  selectedSubjectIds: string[];
  termId: string;
};

type PublicLinkRow = {
  effectiveStatus: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "REVOKED";
  expiresAt: Date | string | null;
  id: string;
  publicUrl: string | null;
  reason: string | null;
  rejectionNote: string | null;
  requestedDurationHours: number;
  requesterName: string | null;
  scopeLabel: string;
};

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "ADMIN";
}

function formatDate(value?: Date | string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariant(status: PublicLinkRow["effectiveStatus"]) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "REJECTED" || status === "REVOKED")
    return "destructive" as const;
  return "neutral" as const;
}

function statusLabel(status: PublicLinkRow["effectiveStatus"]) {
  return status.toLowerCase().replaceAll("_", " ");
}

export function AssessmentPublicLinksPanel({
  allSubjectIds,
  departmentId,
  selectedSubjectIds,
  termId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [durationHours, setDurationHours] = useState("24");
  const [reason, setReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const auth = useAuth();
  const trpc = useTRPC();
  const tenantHref = useLocalTenantHref();
  const queryClient = useQueryClient();
  const toast = useLoadingToast();
  const isAdmin = isAdminRole(auth.role);
  const scopeSubjectIds = useMemo(
    () => (selectedSubjectIds.length ? selectedSubjectIds : allSubjectIds),
    [allSubjectIds, selectedSubjectIds],
  );
  const listQuery = trpc.assessments.listPublicAssessmentLinks.queryOptions(
    {
      departmentId,
      termId,
    },
    {
      enabled: open && !!departmentId && !!termId,
    },
  );
  const { data: links = [], isLoading } = useQuery(listQuery);

  const invalidateLinks = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.assessments.listPublicAssessmentLinks.queryKey({
        departmentId,
        termId,
      }),
    });

  function absolutePublicUrl(publicUrl?: string | null) {
    if (!publicUrl || typeof window === "undefined") return null;
    return new URL(tenantHref(publicUrl), window.location.origin).toString();
  }

  async function copyPublicUrl(publicUrl?: string | null) {
    const url = absolutePublicUrl(publicUrl);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  }

  const createLink = useMutation(
    trpc.assessments.createPublicAssessmentLink.mutationOptions({
      onError(error) {
        toast.error(error.message || "Could not create link.");
      },
      async onSuccess(data) {
        await invalidateLinks();
        await copyPublicUrl(data.publicUrl);
      },
    }),
  );
  const requestLink = useMutation(
    trpc.assessments.requestPublicAssessmentLink.mutationOptions({
      onError(error) {
        toast.error(error.message || "Could not request link.");
      },
      async onSuccess() {
        setReason("");
        await invalidateLinks();
        toast.success("Request sent.");
      },
    }),
  );
  const approveLink = useMutation(
    trpc.assessments.approvePublicAssessmentLink.mutationOptions({
      onError(error) {
        toast.error(error.message || "Could not approve link.");
      },
      async onSuccess(data) {
        await invalidateLinks();
        await copyPublicUrl(data.publicUrl);
      },
    }),
  );
  const rejectLink = useMutation(
    trpc.assessments.rejectPublicAssessmentLink.mutationOptions({
      onError(error) {
        toast.error(error.message || "Could not reject request.");
      },
      async onSuccess() {
        await invalidateLinks();
        toast.success("Request rejected.");
      },
    }),
  );
  const revokeLink = useMutation(
    trpc.assessments.revokePublicAssessmentLink.mutationOptions({
      onError(error) {
        toast.error(error.message || "Could not revoke link.");
      },
      async onSuccess() {
        await invalidateLinks();
        toast.success("Link revoked.");
      },
    }),
  );

  const commonScope = {
    departmentId,
    durationHours: Number(durationHours),
    selectedStudentTermFormIds: [],
    selectedSubjectIds: scopeSubjectIds,
    termId,
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={!departmentId || !termId || !scopeSubjectIds.length}
        onClick={() => setOpen(true)}
      >
        <Link2 className="size-4" />
        Public link
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content className="max-h-[90vh] max-w-2xl overflow-auto">
          <Dialog.Header>
            <Dialog.Title>Public assessment links</Dialog.Title>
            <Dialog.Description>
              Links use the current term, classroom, and selected subject scope.
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4">
            <div className="grid gap-3 border-y py-4 sm:grid-cols-[160px_1fr]">
              <Field>
                <Field.Label>Expiry</Field.Label>
                <Select value={durationHours} onValueChange={setDurationHours}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select expiry" />
                  </Select.Trigger>
                  <Select.Content>
                    {DURATION_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </Field>
              {isAdmin ? (
                <div className="flex items-end justify-start">
                  <Button
                    type="button"
                    disabled={createLink.isPending}
                    onClick={() => createLink.mutate(commonScope)}
                  >
                    Generate link
                  </Button>
                </div>
              ) : (
                <Field>
                  <Field.Label>Reason</Field.Label>
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain why this public score-entry link is needed"
                    rows={3}
                  />
                  <Button
                    type="button"
                    className="mt-2 w-fit"
                    disabled={requestLink.isPending || reason.trim().length < 8}
                    onClick={() =>
                      requestLink.mutate({
                        ...commonScope,
                        reason,
                      })
                    }
                  >
                    Request link
                  </Button>
                </Field>
              )}
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="border-y py-6 text-sm text-muted-foreground">
                  Loading link history...
                </div>
              ) : links.length ? (
                (links as PublicLinkRow[]).map((link) => (
                  <div key={link.id} className="border-y py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariant(link.effectiveStatus)}>
                            {statusLabel(link.effectiveStatus)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(link.expiresAt)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium">
                          {link.scopeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested by {link.requesterName ?? "Unknown"}
                          {link.reason ? `: ${link.reason}` : ""}
                        </p>
                        {link.rejectionNote ? (
                          <p className="text-xs text-destructive">
                            {link.rejectionNote}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {link.publicUrl &&
                        link.effectiveStatus === "APPROVED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => copyPublicUrl(link.publicUrl)}
                          >
                            <Copy className="size-4" />
                            Copy
                          </Button>
                        ) : null}
                        {isAdmin && link.effectiveStatus === "PENDING" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2"
                              disabled={approveLink.isPending}
                              onClick={() =>
                                approveLink.mutate({
                                  durationHours: link.requestedDurationHours,
                                  linkId: link.id,
                                })
                              }
                            >
                              <Check className="size-4" />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={rejectLink.isPending}
                              onClick={() =>
                                rejectLink.mutate({
                                  linkId: link.id,
                                  note: rejectNotes[link.id] ?? null,
                                })
                              }
                            >
                              <X className="size-4" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {isAdmin && link.effectiveStatus === "APPROVED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            disabled={revokeLink.isPending}
                            onClick={() =>
                              revokeLink.mutate({ linkId: link.id })
                            }
                          >
                            <Ban className="size-4" />
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {isAdmin && link.effectiveStatus === "PENDING" ? (
                      <Textarea
                        className="mt-2"
                        value={rejectNotes[link.id] ?? ""}
                        onChange={(event) =>
                          setRejectNotes((current) => ({
                            ...current,
                            [link.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional rejection note"
                        rows={2}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="border-y py-6 text-sm text-muted-foreground">
                  No public links or requests for this scope yet.
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
