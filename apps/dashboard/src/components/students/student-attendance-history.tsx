"use client";

import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import {
  type AttendanceStatus,
  attendanceRate,
  attendanceStatusLabel,
  normalizeAttendanceStatus,
} from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
import { Badge, type BadgeProps } from "@school-clerk/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@school-clerk/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@school-clerk/ui/item";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Suspense } from "react";
import { OverviewDetails, OverviewMeter, OverviewSection } from "./overview-section";
import { StudentAttendanceSkeleton } from "./student-overview.loading";

const GOOD_STANDING = 75;

const STATUS_BADGE: Record<AttendanceStatus, BadgeProps["variant"]> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "destructive",
  EXCUSED: "neutral",
  LEAVE: "neutral",
};

/** "Class Department", without repeating a department that already names the class. */
function joinClassName(classroom?: string | null, department?: string | null) {
  if (!classroom) return department ?? "";
  if (!department || department.includes(classroom)) return department || classroom;
  return `${classroom} ${department}`;
}

export function StudentAttendanceHistory() {
  return (
    <Suspense fallback={<StudentAttendanceSkeleton />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const { studentId } = useStudentOverviewSheet();
  const trpc = useTRPC();
  const { data: records } = useSuspenseQuery(
    trpc.attendance.getStudentAttendanceHistory.queryOptions(
      { studentId: studentId ?? "" },
      { enabled: !!studentId },
    ),
  );

  if (!records?.length) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>No attendance yet</EmptyTitle>
          <EmptyDescription>Sessions appear here once a teacher takes the class register.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const statuses = records.map((record) => normalizeAttendanceStatus(record.status, record.isPresent));
  const count = (status: AttendanceStatus) => statuses.filter((value) => value === status).length;
  const present = count("PRESENT");
  const late = count("LATE");
  const absent = count("ABSENT");
  const excused = count("EXCUSED");
  const leave = count("LEAVE");
  const total = records.length;
  const eligible = Math.max(total - excused - leave, 0);
  const rate = attendanceRate({ present, late, excused, leave, total });
  const goodStanding = rate >= GOOD_STANDING;

  return (
    <div className="divide-y divide-border">
      <div className="pb-5">
        <OverviewDetails
          size="lg"
          className="pb-3"
          details={[
            {
              label: "Attendance",
              value: `${rate}%`,
              hint: goodStanding ? "Good standing" : `Below ${GOOD_STANDING}%`,
              className: goodStanding ? undefined : "text-status-warning-fg",
            },
            {
              label: "Attended",
              value: present + late,
              hint: late ? `of ${eligible} · ${late} late` : `of ${eligible} counted`,
            },
            { label: "Absent", value: absent, hint: `of ${total} sessions` },
            { label: "Excused", value: excused + leave, hint: "Not counted" },
          ]}
        />
        <OverviewMeter value={rate} label="Attendance rate" tone={goodStanding ? "success" : "primary"} />
      </div>

      <OverviewSection
        title="Sessions"
        description="Synced from the class register. Ask the class teacher about any mistakes."
      >
        <ItemGroup className="-mx-2">
          {records.map((record, index) => {
            const status = statuses[index] ?? "ABSENT";
            const attendance = record.classroomAttendance;
            const when = attendance?.attendanceDate ?? attendance?.createdAt ?? record.createdAt;
            const classLabel = joinClassName(record.department?.classRoom?.name, record.department?.departmentName);
            const session = [
              attendance?.attendanceTitle || "Session",
              attendance?.departmentSubject?.subject.title,
              attendance?.periodLabel,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={record.id}>
                {index > 0 ? <ItemSeparator /> : null}
                <Item size="sm">
                  <ItemContent className="min-w-0">
                    <ItemTitle className="tabular-nums">
                      {when ? format(new Date(when), "EEE, d MMM yyyy") : "Undated session"}
                    </ItemTitle>
                    <ItemDescription className="line-clamp-none break-words">
                      {classLabel ? (
                        <>
                          <bdi>{classLabel}</bdi>
                          {" · "}
                        </>
                      ) : null}
                      {session}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant={STATUS_BADGE[status]}>{attendanceStatusLabel(status)}</Badge>
                  </ItemActions>
                </Item>
              </div>
            );
          })}
        </ItemGroup>
      </OverviewSection>
    </div>
  );
}
