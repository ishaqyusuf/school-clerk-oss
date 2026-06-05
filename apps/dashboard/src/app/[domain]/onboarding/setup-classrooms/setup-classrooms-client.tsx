"use client";

import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@school-clerk/ui/tabs";
import { FormContext } from "@/components/classroom/form-context";
import { Form as ClassroomForm } from "@/components/forms/classroom-form";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";

export function SetupClassroomsOnboardingClient({
  domain,
}: {
  domain: string;
}) {
  const [savedCount, setSavedCount] = useState(0);
  const [activeTab, setActiveTab] = useState("new");
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(
    null
  );

  const trpc = useTRPC();
  const { data: classroomStructures } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );

  const { data: editingStructure } = useQuery({
    ...trpc.classrooms.getClassroomStructure.queryOptions({
      classRoomId: editingClassroomId ?? "",
    }),
    enabled: !!editingClassroomId,
  });

  const savedClassroomsList = useMemo(() => {
    if (!classroomStructures?.data) return [];
    const map = new Map<
      string,
      { id: string; name: string; streams: string[]; feeCount: number; subjects: Set<string> }
    >();
    for (const c of classroomStructures.data) {
      if (c.classRoom?.name && c.classRoom?.id) {
        if (!map.has(c.classRoom.id)) {
          map.set(c.classRoom.id, {
            id: c.classRoom.id,
            name: c.classRoom.name,
            streams: [],
            feeCount: 0,
            subjects: new Set(),
          });
        }
        const cls = map.get(c.classRoom.id)!;
        if (c.departmentName) {
          cls.streams.push(c.departmentName);
        }
        if (c.financeItemApplicabilities) {
          cls.feeCount += c.financeItemApplicabilities.length;
        }
        if (c.subjects) {
          for (const s of c.subjects) {
            cls.subjects.add(s.subject.title);
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ).map(cls => ({
      ...cls,
      subjects: Array.from(cls.subjects).sort()
    }));
  }, [classroomStructures?.data]);

  const displayCount = Math.max(savedCount, savedClassroomsList.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[2rem] border-border/70 shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1.5 text-sm"
            >
              Onboarding step 3 of 5
            </Badge>
            <h1 className="text-3xl font-semibold tracking-[-0.05em]">
              Set up classrooms
            </h1>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Add the classes and streams teachers will be assigned to during
              staff onboarding.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="new"
                onClick={() => setEditingClassroomId(null)}
              >
                {editingClassroomId ? "Edit Classroom" : "New Classroom"}
              </TabsTrigger>
              <TabsTrigger value="saved">
                Saved Classrooms ({displayCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="new" className="pt-6">
              <FormContext defaultValues={editingStructure}>
                <ClassroomForm
                  submitLabel={editingClassroomId ? "Update classroom" : "Save classroom"}
                  submitPlacement="inline"
                  onSuccess={() => {
                    setSavedCount((count) => count + 1);
                    setEditingClassroomId(null);
                  }}
                />
              </FormContext>
            </TabsContent>

            <TabsContent value="saved" className="pt-6">
              {savedClassroomsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedClassroomsList.map((cls) => (
                    <Card
                      key={cls.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        setEditingClassroomId(cls.id);
                        setActiveTab("new");
                      }}
                    >
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-base">
                            {cls.name}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {cls.streams.length > 0 ? (
                            <div className="flex items-center gap-1.5 border border-border/50 bg-accent/30 rounded-md px-2 py-1">
                              <span className="font-medium text-foreground/80">Streams:</span>
                              <span className="flex gap-1">
                                {cls.streams.map((stream) => (
                                  <Badge key={stream} variant="secondary" className="px-1.5 py-0 rounded-sm text-[10px] leading-none">
                                    {stream}
                                  </Badge>
                                ))}
                              </span>
                            </div>
                          ) : (
                            <span className="border border-border/50 bg-accent/30 rounded-md px-2 py-1">
                              No streams
                            </span>
                          )}
                          <div className="flex items-center border border-border/50 bg-accent/30 rounded-md px-2 py-1">
                            {cls.feeCount} fee{cls.feeCount === 1 ? "" : "s"} attached
                          </div>
                          {cls.subjects && cls.subjects.length > 0 && (
                            <div className="flex items-center gap-1.5 border border-border/50 bg-accent/30 rounded-md px-2 py-1">
                              <span className="font-medium text-foreground/80">Subjects:</span>
                              <span className="flex flex-wrap gap-1">
                                {cls.subjects.map((subject) => (
                                  <Badge key={subject} variant="outline" className="px-1.5 py-0 rounded-sm text-[10px] leading-none bg-background/50">
                                    {subject}
                                  </Badge>
                                ))}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No classrooms saved yet.
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end border-t pt-5">
            <Button asChild size="lg">
              <Link href="/onboarding/setup-fees">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/70 bg-[#171410] text-white shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              Academic structure
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Classrooms before staff
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/75">
            <p>
              Staff invites work best after the core classrooms are available.
            </p>
            <p>
              Use sub-classes for streams like A/B/C or Emerald/Gold/Silver.
            </p>
            <p>
              General fees for all classes are set in the next onboarding step.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <p className="font-medium">Recommended setup</p>
            </div>
            <p className="mt-2">
              Start with the active classes for this academic session, then add
              staff assignments in the next step.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
