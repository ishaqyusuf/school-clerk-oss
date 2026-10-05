"use client";

import { _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@school-clerk/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@school-clerk/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Classroom = { id: string; displayName: string };

export function SubmitClassStudentSheet({
  classrooms,
  termId,
  initialClassroomId,
  label = "Add student",
}: {
  classrooms: Classroom[];
  termId: string;
  initialClassroomId?: string;
  label?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classroomDepartmentId, setClassroomDepartmentId] = useState(initialClassroomId ?? classrooms[0]?.id ?? "");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [error, setError] = useState("");
  const submit = useMutation(_trpc.students.submitClassStudent.mutationOptions({
    onSuccess: async () => {
      setError("");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: _trpc.assessments.getClassroomReportSheet.queryKey() });
      router.refresh();
    },
    onError: (cause) => setError(cause.message),
  }));

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(""); }}>
      <SheetTrigger asChild>
        <Button type="button" disabled={!classrooms.length || !termId}>{label}</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add a student to the class</SheetTitle>
          <SheetDescription>
            The student appears in attendance and assessment entry immediately. An administrator will review the identity later.
          </SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-5" onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const values = new FormData(event.currentTarget);
          submit.mutate({
            classroomDepartmentId,
            sessionTermId: termId,
            name: String(values.get("name") ?? "").trim(),
            surname: String(values.get("surname") ?? "").trim() || undefined,
            otherName: String(values.get("otherName") ?? "").trim() || undefined,
            gender,
          });
        }}>
          <div className="space-y-2">
            <Label htmlFor="quick-student-classroom">Classroom</Label>
            <Select value={classroomDepartmentId} onValueChange={setClassroomDepartmentId}>
              <SelectTrigger id="quick-student-classroom"><SelectValue placeholder="Select classroom" /></SelectTrigger>
              <SelectContent>{classrooms.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>{classroom.displayName}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-student-name">First name</Label>
            <Input id="quick-student-name" name="name" required maxLength={100} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-student-surname">Surname</Label>
            <Input id="quick-student-surname" name="surname" maxLength={100} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-student-other">Other name</Label>
            <Input id="quick-student-other" name="otherName" maxLength={100} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-student-gender">Gender</Label>
            <Select value={gender} onValueChange={(value) => setGender(value as "Male" | "Female")}>
              <SelectTrigger id="quick-student-gender"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={!classroomDepartmentId || submit.isPending} className="w-full">
            {submit.isPending ? "Submitting…" : "Add for review"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
