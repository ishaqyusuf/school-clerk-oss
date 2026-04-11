"use client";

import { School } from "lucide-react";

type Classroom = {
  id: string;
  displayName: string;
  className: string | null;
  streamName: string | null;
  sessionId: string | null;
};

type Props = {
  classrooms: Classroom[];
  onSelect: (classroom: Classroom) => void;
};

export function ClassroomListCard({ classrooms, onSelect }: Props) {
  if (!classrooms.length) {
    return (
      <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No classrooms found for this session.
      </div>
    );
  }

  // Group by class name for cleaner display
  const groups = classrooms.reduce<Record<string, Classroom[]>>((acc, c) => {
    const key = c.className ?? "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(groups).map(([className, items]) => (
        <div key={className}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {className}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <School className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{c.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
