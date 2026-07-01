"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  LinkIcon,
  PauseCircle,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";
import { Textarea } from "@school-clerk/ui/textarea";
import { useToast } from "@school-clerk/ui/use-toast";

type CapacityMode = "TOTAL" | "PER_CLASSROOM";
type DocumentType =
  | "GENERAL"
  | "PASSPORT_PHOTO"
  | "BIRTH_CERTIFICATE"
  | "PREVIOUS_SCHOOL_REPORT"
  | "OTHER";
type AdmissionLetterTemplateOption = {
  id: string;
  label: string;
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  GENERAL: "General",
  PASSPORT_PHOTO: "Passport photo",
  BIRTH_CERTIFICATE: "Birth certificate",
  PREVIOUS_SCHOOL_REPORT: "Previous report",
  OTHER: "Other",
};

const DEFAULT_ADMISSION_LETTER_TEMPLATES: AdmissionLetterTemplateOption[] = [
  { id: "admission-classic-v1", label: "Admission Classic" },
  { id: "admission-json-simple-v1", label: "Admission JSON Simple" },
  { id: "admission-modern-v1", label: "Admission Modern" },
];

type ClassroomSelection = {
  selected: boolean;
  capacity: number;
  minimumAgeYears: string;
  maximumAgeYears: string;
  ageCutoffDate: string;
  requirementNotes: string;
};

type RequirementDraft = {
  key: string;
  label: string;
  description: string;
  documentType: DocumentType;
  uploadRequired: boolean;
  classRoomDepartmentId: string;
};

function publicEnrollmentPath(code: string) {
  return `/enroll/${code}`;
}

function classroomName(classroom: any) {
  return classroom.displayName ?? classroom.departmentName ?? classroom.id;
}

function createRequirementKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createRequirementDraft(
  label = "",
  key = createRequirementKey(),
  documentType: DocumentType = "GENERAL",
): RequirementDraft {
  return {
    key,
    label,
    description: "",
    documentType,
    uploadRequired: true,
    classRoomDepartmentId: "",
  };
}

function defaultClassroomSelection(selected = false): ClassroomSelection {
  return {
    selected,
    capacity: 30,
    minimumAgeYears: "",
    maximumAgeYears: "",
    ageCutoffDate: "",
    requirementNotes: "",
  };
}

function yearsToMonths(value: string) {
  if (!value.trim()) return null;
  const years = Number(value);
  if (!Number.isFinite(years) || years < 0) return null;
  return Math.round(years * 12);
}

function dateInputToDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function admissionLetterTemplateOptions(
  templates?: AdmissionLetterTemplateOption[],
) {
  const merged = [...DEFAULT_ADMISSION_LETTER_TEMPLATES, ...(templates ?? [])];
  return Array.from(new Map(merged.map((template) => [template.id, template])).values());
}

function ApprovalPaymentForm({
  application,
  admissionLetterTemplates,
  isPending,
  onApprove,
}: {
  application: any;
  admissionLetterTemplates: AdmissionLetterTemplateOption[];
  isPending: boolean;
  onApprove: (input: {
    admissionLetterTemplateId: string;
    applicationId: string;
    paymentAmount: number | null;
    paymentCurrency: string;
    paymentDueAt: Date | null;
    paymentInstructions: string | null;
    paymentLabel: string | null;
    paymentLink: string | null;
    paymentRequired: boolean;
  }) => void;
}) {
  const [paymentRequired, setPaymentRequired] = useState(
    application.status === "APPROVED"
      ? Boolean(application.admissionPaymentRequired)
      : true,
  );
  const [paymentLabel, setPaymentLabel] = useState(
    application.admissionPaymentLabel ?? "Admission payment",
  );
  const [paymentAmount, setPaymentAmount] = useState(
    application.admissionPaymentAmount?.toString?.() ?? "",
  );
  const [paymentCurrency, setPaymentCurrency] = useState(
    application.admissionPaymentCurrency ?? "NGN",
  );
  const [paymentDueAt, setPaymentDueAt] = useState(
    dateToInputValue(application.admissionPaymentDueAt),
  );
  const [paymentLink, setPaymentLink] = useState(
    application.admissionPaymentLink ?? "",
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    application.admissionPaymentInstructions ?? "",
  );
  const [admissionLetterTemplateId, setAdmissionLetterTemplateId] = useState(
    application.admissionLetterTemplateId ?? admissionLetterTemplates[0]!.id,
  );
  const hasPaymentDetails =
    Number(paymentAmount) > 0 &&
    Boolean(paymentInstructions.trim() || paymentLink.trim());
  const isApproved = application.status === "APPROVED";

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={!paymentRequired}
          disabled={isApproved}
          type="checkbox"
          onChange={(event) => setPaymentRequired(!event.target.checked)}
        />
        No admission payment required
      </label>
      {paymentRequired ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1 text-xs">
            <span>Payment label</span>
            <Input
              disabled={isApproved}
              value={paymentLabel}
              onChange={(event) => setPaymentLabel(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>Amount</span>
            <Input
              disabled={isApproved}
              min="0"
              step="0.01"
              type="number"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>Currency</span>
            <Input
              disabled={isApproved}
              maxLength={3}
              value={paymentCurrency}
              onChange={(event) =>
                setPaymentCurrency(event.target.value.toUpperCase())
              }
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>Due date</span>
            <Input
              disabled={isApproved}
              type="date"
              value={paymentDueAt}
              onChange={(event) => setPaymentDueAt(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-xs sm:col-span-2">
            <span>Payment link</span>
            <Input
              disabled={isApproved}
              placeholder="https://..."
              type="url"
              value={paymentLink}
              onChange={(event) => setPaymentLink(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-xs sm:col-span-2">
            <span>Payment instructions</span>
            <Textarea
              disabled={isApproved}
              rows={2}
              value={paymentInstructions}
              onChange={(event) => setPaymentInstructions(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      <label className="block space-y-1 text-xs">
        <span>Admission letter template</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={isApproved}
          value={admissionLetterTemplateId}
          onChange={(event) => setAdmissionLetterTemplateId(event.target.value)}
        >
          {admissionLetterTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={
          isApproved ||
          isPending ||
          (paymentRequired && !hasPaymentDetails)
        }
        size="sm"
        onClick={() =>
          onApprove({
            admissionLetterTemplateId,
            applicationId: application.id,
            paymentAmount:
              paymentRequired && Number(paymentAmount) > 0
                ? Number(paymentAmount)
                : null,
            paymentCurrency: paymentCurrency || "NGN",
            paymentDueAt: paymentRequired ? dateInputToDate(paymentDueAt) : null,
            paymentInstructions: paymentRequired
              ? paymentInstructions.trim() || null
              : null,
            paymentLabel: paymentRequired ? paymentLabel.trim() || null : null,
            paymentLink: paymentRequired ? paymentLink.trim() || null : null,
            paymentRequired,
          })
        }
      >
        <CheckCircle2 className="mr-2 size-4" />
        {isApproved ? "Approved" : "Approve admission"}
      </Button>
    </div>
  );
}

function admissionLetterUrl(
  baseUrl: string,
  templateId: string,
  download = false,
) {
  const url = new URL(
    baseUrl,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  url.searchParams.set("templateId", templateId);
  if (download) url.searchParams.set("download", "true");
  return url.toString();
}

function AdmissionLetterActions({
  admissionLetterTemplates,
  application,
}: {
  admissionLetterTemplates: AdmissionLetterTemplateOption[];
  application: any;
}) {
  const [templateId, setTemplateId] = useState(
    application.admissionLetterTemplateId ?? admissionLetterTemplates[0]!.id,
  );

  if (application.status !== "APPROVED" || !application.admissionLetterUrl) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <label className="block space-y-1 text-xs">
        <span>Admission letter template</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          {admissionLetterTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a
            href={admissionLetterUrl(application.admissionLetterUrl, templateId)}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="mr-2 size-4" />
            Open letter
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={admissionLetterUrl(
              application.admissionLetterUrl,
              templateId,
              true,
            )}
          >
            Download PDF
          </a>
        </Button>
      </div>
    </div>
  );
}

export function EnrollmentManagementClient({
  admissionLetterTemplates,
}: {
  admissionLetterTemplates?: AdmissionLetterTemplateOption[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("New student enrollment");
  const [showOnWebsite, setShowOnWebsite] = useState(false);
  const [capacityMode, setCapacityMode] = useState<CapacityMode>("TOTAL");
  const [totalCapacity, setTotalCapacity] = useState(30);
  const [instructions, setInstructions] = useState("");
  const [selectedClassrooms, setSelectedClassrooms] = useState<
    Record<string, ClassroomSelection>
  >({});
  const [documentRequirements, setDocumentRequirements] = useState<RequirementDraft[]>(
    [
      createRequirementDraft(
        "Birth certificate",
        "birth-certificate",
        "BIRTH_CERTIFICATE",
      ),
      createRequirementDraft(
        "Previous school report",
        "previous-school-report",
        "PREVIOUS_SCHOOL_REPORT",
      ),
      createRequirementDraft(
        "Passport photograph",
        "passport-photograph",
        "PASSPORT_PHOTO",
      ),
    ],
  );

  const linksQuery = useQuery(trpc.enrollmentLinks.listLinks.queryOptions());
  const applicationsQuery = useQuery(
    trpc.enrollmentLinks.getApplications.queryOptions({}),
  );
  const classroomsQuery = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );

  const links = linksQuery.data ?? [];
  const applications = applicationsQuery.data ?? [];
  const classrooms = classroomsQuery.data?.data ?? [];
  const selectableAdmissionLetterTemplates = useMemo(
    () => admissionLetterTemplateOptions(admissionLetterTemplates),
    [admissionLetterTemplates],
  );
  const selectedClassroomRows = useMemo(
    () =>
      classrooms
        .filter((classroom: any) => selectedClassrooms[classroom.id]?.selected)
        .map((classroom: any) => ({
          classRoomDepartmentId: classroom.id,
          capacity:
            capacityMode === "PER_CLASSROOM"
              ? selectedClassrooms[classroom.id]?.capacity || 1
              : null,
          minimumAgeMonths: yearsToMonths(
            selectedClassrooms[classroom.id]?.minimumAgeYears ?? "",
          ),
          maximumAgeMonths: yearsToMonths(
            selectedClassrooms[classroom.id]?.maximumAgeYears ?? "",
          ),
          ageCutoffDate: dateInputToDate(
            selectedClassrooms[classroom.id]?.ageCutoffDate ?? "",
          ),
          requirementNotes:
            selectedClassrooms[classroom.id]?.requirementNotes || null,
        })),
    [capacityMode, classrooms, selectedClassrooms],
  );
  const selectedClassroomIds = useMemo(
    () => new Set(selectedClassroomRows.map((row) => row.classRoomDepartmentId)),
    [selectedClassroomRows],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.enrollmentLinks.listLinks.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.enrollmentLinks.getApplications.queryKey({}),
    });
  };

  const createLink = useMutation(
    trpc.enrollmentLinks.createOrUpdateLink.mutationOptions({
      onSuccess() {
        invalidate();
        toast({ title: "Enrollment link saved" });
      },
      onError(error) {
        toast({
          title: "Could not save enrollment link",
          description: error.message,
          variant: "error",
        });
      },
    }),
  );

  const setStatus = useMutation(
    trpc.enrollmentLinks.setLinkStatus.mutationOptions({
      onSuccess: invalidate,
    }),
  );

  const approveApplication = useMutation(
    trpc.enrollmentLinks.approveApplication.mutationOptions({
      onSuccess() {
        invalidate();
        toast({ title: "Application approved" });
      },
      onError(error) {
        toast({
          title: "Could not approve application",
          description: error.message,
          variant: "error",
        });
      },
    }),
  );

  const rejectApplication = useMutation(
    trpc.enrollmentLinks.rejectApplication.mutationOptions({
      onSuccess() {
        invalidate();
        toast({ title: "Application rejected" });
      },
    }),
  );

  const submit = () => {
    createLink.mutate({
      title,
      status: "ACTIVE",
      showOnWebsite,
      capacityMode,
      totalCapacity: capacityMode === "TOTAL" ? totalCapacity : null,
      instructions: instructions || null,
      classrooms: selectedClassroomRows,
      documentRequirements: documentRequirements
        .map((requirement) => ({
          ...requirement,
          label: requirement.label.trim(),
          description: requirement.description.trim() || null,
        }))
        .filter((requirement) => requirement.label)
        .map((requirement, index) => ({
          label: requirement.label,
          description: requirement.description,
          documentType: requirement.documentType,
          uploadRequired: requirement.uploadRequired,
          sortOrder: index,
          classRoomDepartmentId:
            requirement.classRoomDepartmentId &&
            selectedClassroomIds.has(requirement.classRoomDepartmentId)
              ? requirement.classRoomDepartmentId
              : null,
        })),
    });
  };

  const copyLink = async (link: any) => {
    const path = publicEnrollmentPath(link.code);
    const url =
      link.publicUrl ??
      (typeof window === "undefined"
        ? path
        : new URL(path, window.location.origin).toString());
    await navigator.clipboard.writeText(url);
    toast({ title: "Enrollment link copied" });
  };

  const updateClassroomSelection = (
    classroomId: string,
    patch: Partial<ClassroomSelection>,
  ) => {
    setSelectedClassrooms((current) => ({
      ...current,
      [classroomId]: {
        ...(current[classroomId] ?? defaultClassroomSelection()),
        ...patch,
      },
    }));
  };

  const updateRequirement = (
    key: string,
    patch: Partial<RequirementDraft>,
  ) => {
    setDocumentRequirements((current) =>
      current.map((requirement) =>
        requirement.key === key ? { ...requirement, ...patch } : requirement,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Active links</CardDescription>
            <CardTitle>{links.filter((link: any) => link.status === "ACTIVE").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Pending applications</CardDescription>
            <CardTitle>
              {applications.filter((row: any) => row.status === "SUBMITTED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle>
              {applications.filter((row: any) => row.status === "APPROVED").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Generate enrollment link</CardTitle>
            <CardDescription>
              Choose classrooms, capacity, and required documents for parents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span>Link title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
              <input
                checked={showOnWebsite}
                className="mt-1"
                type="checkbox"
                onChange={(event) => setShowOnWebsite(event.target.checked)}
              />
              <span>
                <span className="block font-medium">Show on public website</span>
                <span className="block text-xs text-muted-foreground">
                  Keep this off when the school wants to share the admission link manually.
                </span>
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Capacity mode</span>
                <select
                  className="h-9 w-full border border-border bg-transparent px-3 text-sm"
                  value={capacityMode}
                  onChange={(event) => setCapacityMode(event.target.value as CapacityMode)}
                >
                  <option value="TOTAL">Total</option>
                  <option value="PER_CLASSROOM">Per classroom</option>
                </select>
              </label>
              {capacityMode === "TOTAL" ? (
                <label className="block space-y-1 text-sm">
                  <span>Maximum enrollment</span>
                  <Input
                    min={1}
                    type="number"
                    value={totalCapacity}
                    onChange={(event) => setTotalCapacity(Number(event.target.value))}
                  />
                </label>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Available classrooms</p>
              <div className="max-h-64 space-y-2 overflow-auto rounded-md border border-border p-2">
                {classrooms.map((classroom: any) => {
                  const selection =
                    selectedClassrooms[classroom.id] ?? defaultClassroomSelection();
                  const isSelected = Boolean(selection.selected);

                  return (
                    <div
                      className="space-y-3 rounded-md border border-border p-3 text-sm"
                      key={classroom.id}
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            checked={isSelected}
                            type="checkbox"
                            onChange={(event) =>
                              updateClassroomSelection(classroom.id, {
                                selected: event.target.checked,
                              })
                            }
                          />
                          {classroomName(classroom)}
                        </label>
                        {capacityMode === "PER_CLASSROOM" ? (
                          <Input
                            className="w-20"
                            min={1}
                            type="number"
                            value={selection.capacity}
                            onChange={(event) =>
                              updateClassroomSelection(classroom.id, {
                                capacity: Number(event.target.value),
                              })
                            }
                          />
                        ) : null}
                      </div>

                      {isSelected ? (
                        <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
                          <label className="block space-y-1">
                            <span className="text-xs text-muted-foreground">
                              Min age
                            </span>
                            <Input
                              min={0}
                              placeholder="Years"
                              step="0.5"
                              type="number"
                              value={selection.minimumAgeYears}
                              onChange={(event) =>
                                updateClassroomSelection(classroom.id, {
                                  minimumAgeYears: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs text-muted-foreground">
                              Max age
                            </span>
                            <Input
                              min={0}
                              placeholder="Years"
                              step="0.5"
                              type="number"
                              value={selection.maximumAgeYears}
                              onChange={(event) =>
                                updateClassroomSelection(classroom.id, {
                                  maximumAgeYears: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs text-muted-foreground">
                              Cutoff date
                            </span>
                            <Input
                              type="date"
                              value={selection.ageCutoffDate}
                              onChange={(event) =>
                                updateClassroomSelection(classroom.id, {
                                  ageCutoffDate: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block space-y-1 sm:col-span-3">
                            <span className="text-xs text-muted-foreground">
                              Class requirement notes
                            </span>
                            <Textarea
                              rows={2}
                              value={selection.requirementNotes}
                              onChange={(event) =>
                                updateClassroomSelection(classroom.id, {
                                  requirementNotes: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Admission documents</p>
                  <p className="text-xs text-muted-foreground">
                    Apply each upload requirement to all classes or one selected class.
                  </p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDocumentRequirements((current) => [
                      ...current,
                      createRequirementDraft(),
                    ])
                  }
                >
                  <Plus className="mr-2 size-4" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {documentRequirements.map((requirement) => (
                  <div
                    className="space-y-3 rounded-md border border-border p-3"
                    key={requirement.key}
                  >
                    <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
                      <label className="block space-y-1 text-sm">
                        <span>Document name</span>
                        <Input
                          value={requirement.label}
                          onChange={(event) =>
                            updateRequirement(requirement.key, {
                              label: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span>Applies to</span>
                        <select
                          className="h-9 w-full border border-border bg-transparent px-3 text-sm"
                          value={requirement.classRoomDepartmentId}
                          onChange={(event) =>
                            updateRequirement(requirement.key, {
                              classRoomDepartmentId: event.target.value,
                            })
                          }
                        >
                          <option value="">All classes</option>
                          {selectedClassroomRows.map((row) => {
                            const classroom = classrooms.find(
                              (item: any) => item.id === row.classRoomDepartmentId,
                            );

                            return (
                              <option
                                key={row.classRoomDepartmentId}
                                value={row.classRoomDepartmentId}
                              >
                                {classroom ? classroomName(classroom) : "Class"}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span>Type</span>
                        <select
                          className="h-9 w-full border border-border bg-transparent px-3 text-sm"
                          value={requirement.documentType}
                          onChange={(event) =>
                            updateRequirement(requirement.key, {
                              documentType: event.target.value as DocumentType,
                            })
                          }
                        >
                          {Object.entries(DOCUMENT_TYPE_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <Button
                        className="self-end"
                        disabled={documentRequirements.length === 1}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setDocumentRequirements((current) =>
                            current.filter((row) => row.key !== requirement.key),
                          )
                        }
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={requirement.uploadRequired}
                        type="checkbox"
                        onChange={(event) =>
                          updateRequirement(requirement.key, {
                            uploadRequired: event.target.checked,
                          })
                        }
                      />
                      Required upload
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span>Description</span>
                      <Textarea
                        rows={2}
                        value={requirement.description}
                        onChange={(event) =>
                          updateRequirement(requirement.key, {
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <label className="block space-y-1 text-sm">
              <span>Other instructions</span>
              <Textarea
                rows={3}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
              />
            </label>

            <Button
              disabled={!selectedClassroomRows.length || createLink.isPending}
              onClick={submit}
            >
              <LinkIcon className="mr-2 size-4" />
              Generate enrollment link
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Current links</CardTitle>
            <CardDescription>Copy or pause links used by parents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!links.length ? (
              <p className="text-sm text-muted-foreground">No enrollment links yet.</p>
            ) : (
              links.map((link: any) => (
                <div className="rounded-md border border-border p-3" key={link.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{link.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {link.classrooms.length} classrooms • {link.documentRequirements.length} requirements • {link.counts.applications} applications
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant={link.status === "ACTIVE" ? "success" : "secondary"}>
                        {link.status}
                      </Badge>
                      <Badge variant={link.showOnWebsite ? "success" : "secondary"}>
                        {link.showOnWebsite ? "Website" : "Manual"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(link)}>
                      <Copy className="mr-2 size-4" />
                      Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setStatus.mutate({
                          id: link.id,
                          status: link.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        })
                      }
                    >
                      <PauseCircle className="mr-2 size-4" />
                      {link.status === "ACTIVE" ? "Pause" : "Activate"}
                    </Button>
                  </div>
                  {link.showOnWebsite ? (
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="size-3.5" />
                      Eligible for the public website admission section.
                    </p>
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <EyeOff className="size-3.5" />
                      Hidden from the website; share manually with the copied link.
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Application review</CardTitle>
          <CardDescription>
            Approving creates the student record, guardian link, current term sheet,
            and applicable fee charges.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!applications.length ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            applications.map((application: any) => (
              <div
                className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto]"
                key={application.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{application.studentName}</p>
                    <Badge variant="secondary">{application.status}</Badge>
                    {application.admissionApprovalEmailSentAt ? (
                      <Badge variant="success">Approval email sent</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {application.classroomName} • Parent:{" "}
                    {application.primaryParent?.name ?? "No parent"} • Documents:{" "}
                    {application.documentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From {application.linkTitle}
                  </p>
                  {application.documents?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.documents.map((document: any) => (
                        <a
                          className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                          href={document.fileUrl}
                          key={document.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Badge
                            variant={
                              document.documentType === "PASSPORT_PHOTO"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {DOCUMENT_TYPE_LABELS[
                              document.documentType as DocumentType
                            ] ?? "Document"}
                          </Badge>
                          <span>{document.label}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-stretch gap-2">
                  <ApprovalPaymentForm
                    admissionLetterTemplates={selectableAdmissionLetterTemplates}
                    application={application}
                    isPending={approveApplication.isPending}
                    onApprove={(input) => approveApplication.mutate(input)}
                  />
                  <AdmissionLetterActions
                    admissionLetterTemplates={selectableAdmissionLetterTemplates}
                    application={application}
                  />
                  <Button
                    className="self-end"
                    disabled={application.status === "APPROVED"}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      rejectApplication.mutate({
                        applicationId: application.id,
                        reason: "Rejected from enrollment review.",
                      })
                    }
                  >
                    <XCircle className="mr-2 size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
