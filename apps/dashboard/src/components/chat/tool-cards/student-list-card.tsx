"use client";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { UserRound } from "lucide-react";

type Student = {
  id: string;
  fullName: string;
  classroom: string | null;
  termFormId: string | null;
  totalPending: number;
  isEnrolledThisTerm: boolean;
};

type Props = {
  students: Student[];
  onSelect: (student: Student) => void;
};

export function StudentListCard({ students, onSelect }: Props) {
  if (!students.length) {
    return (
      <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No students found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {students.map((student) => (
        <button
          key={student.id}
          onClick={() => onSelect(student)}
          className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{student.fullName}</span>
            {student.classroom ? (
              <span className="text-xs text-muted-foreground">{student.classroom}</span>
            ) : (
              <span className="text-xs text-muted-foreground/60">Not enrolled this term</span>
            )}
          </div>
          {student.totalPending > 0 && (
            <Badge variant="outline" className="shrink-0 text-xs text-amber-600 border-amber-300 bg-amber-50">
              ₦{student.totalPending.toLocaleString()} owed
            </Badge>
          )}
          {student.isEnrolledThisTerm && student.totalPending === 0 && (
            <Badge variant="outline" className="shrink-0 text-xs text-green-600 border-green-300 bg-green-50">
              Paid
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
