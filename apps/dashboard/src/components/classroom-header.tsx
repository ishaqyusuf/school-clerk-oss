"use client";
import { SearchFilter } from "@school-clerk/ui/search-filter";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useQueryStates } from "nuqs";
import { _trpc } from "./static-trpc";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "@school-clerk/ui/use-toast";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@school-clerk/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";

export function ClassroomHeader({}) {
  const [filters, setFilters] = useQueryStates(classroomFilterParams);
  const { setParams } = useClassroomParams();
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
      <div className="flex-1 w-full sm:w-auto">
        <SearchFilter
          filterSchema={classroomFilterParams}
          placeholder="Search classrooms..."
          trpcRoute={_trpc.filters.classroom}
          trpQueryOptions={{}}
          {...{ filters, setFilters }}
        />
      </div>
      <div className="flex gap-2 shrink-0">
        <Select
          value={filters.view ?? "stream"}
          onValueChange={(value) => setFilters({ view: value as any })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="View mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stream">View by Stream</SelectItem>
            <SelectItem value="class">View by Class</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setImportOpen(true)}
        >
          <Download className="h-4 w-4" />
          Import from Session
        </Button>
        <Button
          className="gap-2 shadow-sm"
          onClick={() => setParams({ createClassroom: true })}
        >
          <Icons.Add className="h-4 w-4" />
          Add Classroom
        </Button>
      </div>
      <ImportClassroomsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}

function ImportClassroomsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [fromSessionId, setFromSessionId] = useState<string>("");

  const { data: sessionsData } = useQuery(
    trpc.academics.dashboard.queryOptions({}, { enabled: open }),
  );

  const sessions = sessionsData?.sessions ?? [];

  const { data: previewData } = useQuery(
    trpc.classrooms.getClassroomsForSession.queryOptions(fromSessionId, {
      enabled: open && !!fromSessionId,
    }),
  );
  const previewClassrooms = previewData?.data ?? [];

  const importMutation = useMutation(
    trpc.classrooms.importFromPreviousSession.mutationOptions({
      onSuccess(data) {
        toast({
          title: "Classrooms imported",
          description: `${data.created} classroom(s) added to the current session.`,
        });
        qc.invalidateQueries({
          queryKey: trpc.classrooms.all.queryKey({}),
        });
        qc.invalidateQueries({
          queryKey: trpc.academics.getClassrooms.infiniteQueryKey({}),
        });
        onClose();
      },
      onError() {
        toast({
          title: "Import failed",
          description: "Could not import classrooms. Please try again.",
          variant: "destructive",
        });
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Classrooms from Previous Session</DialogTitle>
          <DialogDescription>
            Copy all classrooms and sub-departments from a previous academic
            session into the current session. Existing classrooms are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source Session</label>
            <Select value={fromSessionId} onValueChange={setFromSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a session…" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fromSessionId && previewClassrooms.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {previewClassrooms.length} classroom(s) to import
              </p>
              {previewClassrooms.map((c) => (
                <div
                  key={c.id}
                  className="text-sm text-foreground py-0.5 border-b last:border-0"
                >
                  {c.displayName}
                </div>
              ))}
            </div>
          )}

          {fromSessionId && previewClassrooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No classrooms found in the selected session.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !fromSessionId ||
              previewClassrooms.length === 0 ||
              importMutation.isPending
            }
            onClick={() => importMutation.mutate({ fromSessionId })}
          >
            {importMutation.isPending
              ? "Importing…"
              : `Import ${previewClassrooms.length || ""} Classrooms`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
