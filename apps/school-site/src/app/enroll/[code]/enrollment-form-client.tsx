"use client";

import { useMemo, useState } from "react";

import { submitEnrollmentApplication } from "@/lib/enrollment/actions";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Textarea } from "@school-clerk/ui/textarea";

type ClassroomOption = {
  id: string;
  classRoomDepartmentId: string;
  name: string;
  capacity: number | null;
  used: number;
  isFull: boolean;
  minimumAgeMonths: number | null;
  maximumAgeMonths: number | null;
  ageCutoffDate: string | null;
  requirementNotes: string | null;
};

type DocumentRequirement = {
  id: string;
  label: string;
  description: string | null;
  documentType: string;
  uploadRequired: boolean;
  sortOrder: number;
  classRoomDepartmentId: string | null;
};

function documentAcceptValue(requirement: DocumentRequirement) {
  return requirement.documentType === "PASSPORT_PHOTO"
    ? "image/png,image/jpeg"
    : ".pdf,image/png,image/jpeg";
}

function formatAgeMonths(months: number) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years && remainingMonths) {
    return `${years} year${years === 1 ? "" : "s"} ${remainingMonths} month${
      remainingMonths === 1 ? "" : "s"
    }`;
  }

  if (years) return `${years} year${years === 1 ? "" : "s"}`;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function formatCutoffDate(value: string | null) {
  if (!value) return "submission date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function EnrollmentFormClient({
  code,
  classrooms,
  documentRequirements,
}: {
  code: string;
  classrooms: ClassroomOption[];
  documentRequirements: DocumentRequirement[];
}) {
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const selectedClassroom = classrooms.find(
    (classroom) => classroom.classRoomDepartmentId === selectedClassroomId,
  );
  const visibleRequirements = useMemo(
    () =>
      documentRequirements.filter(
        (requirement) =>
          !requirement.classRoomDepartmentId ||
          requirement.classRoomDepartmentId === selectedClassroomId,
      ),
    [documentRequirements, selectedClassroomId],
  );
  const hasAgeRule =
    selectedClassroom?.minimumAgeMonths != null ||
    selectedClassroom?.maximumAgeMonths != null;

  return (
    <form action={submitEnrollmentApplication.bind(null, code)} className="space-y-5">
      <label className="block space-y-1 text-sm">
        <span>Classroom</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="classRoomDepartmentId"
          required
          value={selectedClassroomId}
          onChange={(event) => setSelectedClassroomId(event.target.value)}
        >
          <option value="">Select classroom</option>
          {classrooms.map((classroom) => (
            <option
              disabled={classroom.isFull}
              key={classroom.id}
              value={classroom.classRoomDepartmentId}
            >
              {classroom.name}
              {classroom.isFull ? " (full)" : ""}
            </option>
          ))}
        </select>
      </label>

      {selectedClassroom ? (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{selectedClassroom.name}</span>
            <Badge variant={selectedClassroom.isFull ? "destructive" : "secondary"}>
              {selectedClassroom.capacity
                ? `${selectedClassroom.used}/${selectedClassroom.capacity}`
                : "Open"}
            </Badge>
          </div>
          {hasAgeRule ? (
            <p className="text-slate-600">
              Age requirement:{" "}
              {selectedClassroom.minimumAgeMonths != null
                ? `minimum ${formatAgeMonths(selectedClassroom.minimumAgeMonths)}`
                : "no minimum"}
              {selectedClassroom.maximumAgeMonths != null
                ? `, maximum ${formatAgeMonths(selectedClassroom.maximumAgeMonths)}`
                : ""}
              {" "}as of {formatCutoffDate(selectedClassroom.ageCutoffDate)}.
            </p>
          ) : null}
          {selectedClassroom.requirementNotes ? (
            <p className="text-slate-600">{selectedClassroom.requirementNotes}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Student first name</span>
          <Input name="studentFirstName" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Student surname</span>
          <Input name="studentSurname" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Other name</span>
          <Input name="studentOtherName" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Date of birth</span>
          <Input name="studentDob" required type="date" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Gender</span>
          <select
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            name="studentGender"
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span>Primary parent name</span>
          <Input name="parentName" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Relation</span>
          <Input name="parentRelation" placeholder="Mother, Father..." />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <Input name="parentEmail" required type="email" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Primary phone</span>
          <Input name="parentPhone" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Alternative phone</span>
          <Input name="parentPhone2" />
        </label>
      </div>

      {selectedClassroomId ? (
        visibleRequirements.length ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Admission documents</h2>
            {visibleRequirements.map((requirement) => (
              <label
                className="block space-y-1 rounded-md border border-slate-200 p-3 text-sm"
                key={requirement.id}
              >
                <span>
                  {requirement.label}
                  {requirement.uploadRequired ? " *" : ""}
                </span>
                {requirement.description ? (
                  <span className="block text-xs text-slate-500">
                    {requirement.description}
                  </span>
                ) : null}
                <Input
                  accept={documentAcceptValue(requirement)}
                  name={`document:${requirement.id}`}
                  required={requirement.uploadRequired}
                  type="file"
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
            No document uploads are required for this classroom.
          </div>
        )
      ) : (
        <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
          Select a classroom to see its admission requirements.
        </div>
      )}

      <label className="block space-y-1 text-sm">
        <span>Other information</span>
        <Textarea name="additionalNotes" rows={4} />
      </label>

      <Button className="w-full" type="submit">
        Submit enrollment application
      </Button>
    </form>
  );
}
