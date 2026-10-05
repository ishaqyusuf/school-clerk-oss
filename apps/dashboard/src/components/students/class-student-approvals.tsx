"use client";

import { _trpc } from "@/components/static-trpc";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@school-clerk/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

function fullName(student: { name: string; surname?: string | null; otherName?: string | null } | null) {
  return [student?.name, student?.otherName, student?.surname].filter(Boolean).join(" ");
}

export function ClassStudentApprovals() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchStudentId, setMatchStudentId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const requests = useQuery(_trpc.students.classStudentRequests.queryOptions());
  const matches = useQuery(_trpc.students.classStudentMatches.queryOptions(
    { studentTermFormId: selectedId ?? "" },
    { enabled: !!selectedId },
  ));
  const selected = requests.data?.find((request) => request.id === selectedId);
  const review = useMutation(_trpc.students.reviewClassStudent.mutationOptions({
    onSuccess: async () => {
      setSelectedId(null);
      setMatchStudentId(null);
      setNote("");
      setError("");
      await queryClient.invalidateQueries({ queryKey: _trpc.students.classStudentRequests.queryKey() });
      await queryClient.invalidateQueries({ queryKey: _trpc.students.index.infiniteQueryKey() });
      await queryClient.invalidateQueries({ queryKey: _trpc.assessments.getClassroomReportSheet.queryKey() });
      router.refresh();
    },
    onError: (cause) => setError(cause.message),
  }));
  const pending = requests.data?.filter((request) => request.registrationReviewStatus === "PENDING") ?? [];
  const reviewed = requests.data?.filter((request) => request.registrationReviewStatus !== "PENDING") ?? [];

  if (requests.isLoading) return <p className="text-sm text-muted-foreground">Loading student submissions…</p>;
  if (requests.error) return <p role="alert" className="text-sm text-destructive">{requests.error.message}</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold">Pending review ({pending.length})</h2><p className="text-sm text-muted-foreground">Open a name to compare existing student records before deciding.</p></div>
        <div className="overflow-x-auto border">
          <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Classroom</TableHead><TableHead>Term</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
            <TableBody>{pending.length ? pending.map((request) => (
              <TableRow key={request.id} className="cursor-pointer" onClick={() => { setSelectedId(request.id); setMatchStudentId(null); setError(""); }}>
                <TableCell><button type="button" className="font-medium underline-offset-4 hover:underline" dir="auto">{fullName(request.student)}</button></TableCell>
                <TableCell dir="auto">{[request.classroomDepartment?.classRoom?.name, request.classroomDepartment?.departmentName].filter(Boolean).join(" ")}</TableCell>
                <TableCell>{request.sessionTerm?.title ?? "—"}</TableCell>
                <TableCell>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No students are waiting for review.</TableCell></TableRow>}</TableBody>
          </Table>
        </div>
      </section>
      {reviewed.length ? <section className="space-y-3"><h2 className="text-lg font-semibold">Recently reviewed</h2><div className="space-y-2">{reviewed.slice(0, 20).map((request) => (
        <div key={request.id} className="flex items-center justify-between gap-3 border px-4 py-3 text-sm"><span dir="auto">{fullName(request.student)}</span><Badge variant={request.registrationReviewStatus === "APPROVED" ? "success" : "destructive"}>{request.registrationReviewStatus === "APPROVED" ? "Approved" : "Unapproved"}</Badge></div>
      ))}</div></section> : null}
      <Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setMatchStudentId(null); setError(""); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle dir="auto">Review {fullName(selected?.student ?? null)}</SheetTitle>
            <SheetDescription>Choose an existing student only when this is the same person. Attendance and scores recorded on this submission will stay with the term record.</SheetDescription>
          </SheetHeader>
          {selected ? <div className="mt-6 space-y-5">
            <div className="border p-4 text-sm"><p><strong>Submitted name:</strong> <span dir="auto">{fullName(selected.student)}</span></p><p><strong>Gender:</strong> {selected.student?.gender ?? "—"}</p><p><strong>Term:</strong> {selected.sessionTerm?.title ?? "—"}</p></div>
            <div className="space-y-2"><h3 className="font-medium">Possible existing students</h3>
              {matches.isLoading ? <p className="text-sm text-muted-foreground">Checking records…</p> : null}
              {matches.error ? <p role="alert" className="text-sm text-destructive">{matches.error.message}</p> : null}
              {matches.data?.length ? matches.data.map((candidate) => (
                <label key={candidate.id} className="flex cursor-pointer items-start gap-3 border p-3 text-sm">
                  <input type="radio" name="student-match" checked={matchStudentId === candidate.id} disabled={candidate.alreadyInTerm} onChange={() => setMatchStudentId(candidate.id)} />
                  <span className="min-w-0"><span className="block font-medium" dir="auto">{fullName(candidate)}</span><span className="text-muted-foreground">{candidate.gender} · {candidate.termForms.map((form) => form.sessionTerm?.title).filter(Boolean).join(", ") || "No term history"}{candidate.alreadyInTerm ? " · Already in this term" : ""}</span></span>
                </label>
              )) : !matches.isLoading ? <p className="text-sm text-muted-foreground">No possible matches found.</p> : null}
              <label className="flex cursor-pointer items-center gap-3 border p-3 text-sm"><input type="radio" name="student-match" checked={!matchStudentId} onChange={() => setMatchStudentId(null)} />Create as a new student</label>
            </div>
            <div className="space-y-2"><Label htmlFor="student-review-note">Review note (optional)</Label><Input id="student-review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} /></div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={review.isPending || matches.isLoading} onClick={() => review.mutate({ studentTermFormId: selected.id, decision: "APPROVED", matchStudentId: matchStudentId ?? undefined, note: note || undefined })}>Approve {matchStudentId ? "and match" : "as new"}</Button>
              <Button variant="outline" disabled={review.isPending} onClick={() => review.mutate({ studentTermFormId: selected.id, decision: "REJECTED", note: note || undefined })}>Mark unapproved</Button>
            </div>
          </div> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
