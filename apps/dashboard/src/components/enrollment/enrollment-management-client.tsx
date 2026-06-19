"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, LinkIcon, PauseCircle, XCircle } from "lucide-react";

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

function publicEnrollmentPath(code: string) {
  return `/enroll/${code}`;
}

function classroomName(classroom: any) {
  return classroom.displayName ?? classroom.departmentName ?? classroom.id;
}

export function EnrollmentManagementClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("New student enrollment");
  const [capacityMode, setCapacityMode] = useState<CapacityMode>("TOTAL");
  const [totalCapacity, setTotalCapacity] = useState(30);
  const [instructions, setInstructions] = useState("");
  const [selectedClassrooms, setSelectedClassrooms] = useState<
    Record<string, { selected: boolean; capacity: number }>
  >({});
  const [documentText, setDocumentText] = useState(
    "Birth certificate\nPrevious school report\nPassport photograph",
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
        })),
    [capacityMode, classrooms, selectedClassrooms],
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
      capacityMode,
      totalCapacity: capacityMode === "TOTAL" ? totalCapacity : null,
      instructions: instructions || null,
      classrooms: selectedClassroomRows,
      documentRequirements: documentText
        .split("\n")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label, index) => ({
          label,
          description: null,
          uploadRequired: true,
          sortOrder: index,
        })),
    });
  };

  const copyLink = async (code: string) => {
    const path = publicEnrollmentPath(code);
    const url =
      typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    toast({ title: "Enrollment link copied" });
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
                {classrooms.map((classroom: any) => (
                  <label
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border p-2 text-sm"
                    key={classroom.id}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        checked={Boolean(selectedClassrooms[classroom.id]?.selected)}
                        type="checkbox"
                        onChange={(event) =>
                          setSelectedClassrooms((current) => ({
                            ...current,
                            [classroom.id]: {
                              capacity: current[classroom.id]?.capacity ?? 30,
                              selected: event.target.checked,
                            },
                          }))
                        }
                      />
                      {classroomName(classroom)}
                    </span>
                    {capacityMode === "PER_CLASSROOM" ? (
                      <Input
                        className="w-20"
                        min={1}
                        type="number"
                        value={selectedClassrooms[classroom.id]?.capacity ?? 30}
                        onChange={(event) =>
                          setSelectedClassrooms((current) => ({
                            ...current,
                            [classroom.id]: {
                              selected: current[classroom.id]?.selected ?? false,
                              capacity: Number(event.target.value),
                            },
                          }))
                        }
                      />
                    ) : null}
                  </label>
                ))}
              </div>
            </div>

            <label className="block space-y-1 text-sm">
              <span>Required documents</span>
              <Textarea
                rows={4}
                value={documentText}
                onChange={(event) => setDocumentText(event.target.value)}
              />
            </label>

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
                        {link.classrooms.length} classrooms • {link.documentRequirements.length} documents • {link.counts.applications} applications
                      </p>
                    </div>
                    <Badge variant={link.status === "ACTIVE" ? "success" : "secondary"}>
                      {link.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(link.code)}>
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
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {application.classroomName} • Parent:{" "}
                    {application.primaryParent?.name ?? "No parent"} • Documents:{" "}
                    {application.documentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From {application.linkTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={application.status === "APPROVED"}
                    size="sm"
                    onClick={() =>
                      approveApplication.mutate({ applicationId: application.id })
                    }
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Approve
                  </Button>
                  <Button
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
