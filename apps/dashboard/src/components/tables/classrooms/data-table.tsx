"use client";

import { useTRPC } from "@/trpc/client";
import { DirectoryToolbar } from "@/components/tables/core";
import { useDirectoryView } from "@/hooks/use-directory-view";
import type { DirectoryView } from "@/utils/directory-view-settings";
import {
  TableProvider,
  Table,
  useTableData,
} from "@school-clerk/ui/data-table";
import { columns, mobileColumn } from "./columns";
import {
  type ClassGroup,
  ClassGroupCollection,
  ClassroomCollection,
} from "./collection";
import { getClassroomViews } from "./view-options";
import { useClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useMemo } from "react";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
export function DataTable({
  savedView,
}: {
  savedView: DirectoryView | null;
}) {
  const academicDataDirection = useAcademicDataDirection();
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useClassroomStore();
  const { filters } = useClassroomFilterParams();
  const grouping = (filters as any).view as string | null;
  const { view } = useDirectoryView({
    pageId: "classrooms",
    savedView,
    options: getClassroomViews(grouping),
  });
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.academics.getClassrooms,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });

  const { setParams } = useClassroomParams();
  const openClassroom = (classroomId: string) =>
    setParams({ viewClassroomId: classroomId, classroomTab: "students" });
  const classViewRows = useMemo<ClassGroup[]>(() => {
    const grouped = new Map<string, { classRoom: any; rows: typeof data }>();
    for (const row of data) {
      const classRoomId = row.classRoom?.id;
      if (!classRoomId) continue;
      const current = grouped.get(classRoomId) ?? {
        classRoom: row.classRoom,
        rows: [],
      };
      current.rows.push(row);
      grouped.set(classRoomId, current);
    }

    return Array.from(grouped.values())
      .map((group) => {
        const rows = [...group.rows].sort(
          (a, b) => (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999),
        );
        const uniqueLevels = new Set(
          rows
            .map((row) => row.departmentLevel)
            .filter((level) => level !== null && level !== undefined),
        );
        const progressionMode =
          uniqueLevels.size > 1 ? "Within Sub-classes" : "Between Classes";

        return {
          id: group.classRoom.id,
          classRoom: group.classRoom,
          rows,
          studentCount: rows.reduce(
            (sum, row) => sum + (row?._count?.studentSessionForms ?? 0),
            0,
          ),
          subjectCount: rows.reduce(
            (max, row) => Math.max(max, row?._count?.subjects ?? 0),
            0,
          ),
          progressionMode,
        };
      })
      .sort(
        (a, b) =>
          (a.classRoom?.classLevel ?? 9999) - (b.classRoom?.classLevel ?? 9999),
      );
  }, [data]);

  if (view !== "table") {
    const isClassGroups = grouping === "class";
    const count = isClassGroups ? classViewRows.length : data.length;
    return (
      <div className="flex flex-col gap-3" dir={academicDataDirection}>
        <DirectoryToolbar
          view={view}
          summary={`${count}${hasNextPage ? "+" : ""} ${
            isClassGroups ? "classes" : "classrooms"
          }`}
        />
        {isClassGroups ? (
          <ClassGroupCollection
            groups={classViewRows}
            view={view}
            onOpen={openClassroom}
          />
        ) : (
          <ClassroomCollection
            items={data}
            view={view}
            onOpen={openClassroom}
          />
        )}
        {hasNextPage ? (
          // useTableData fetches the next page when this sentinel is in view.
          <div
            ref={ref}
            className="py-3 text-center text-xs text-muted-foreground"
          >
            Loading more…
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <TableProvider
      args={[
        {
          columns,
          mobileColumn,
          data,
          props: {
            hasNextPage,
            loadMoreRef: ref,
          },
          // tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
            rowClick(id, rowData) {
              openClassroom(rowData.id);
            },
          },
        },
      ]}
    >
      <div className="flex w-full flex-col gap-4" dir={academicDataDirection}>
        <div
          // ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <Table.Header />
            <Table.Body>
              <Table.Row />
            </Table.Body>
          </Table>
        </div>
        {hasNextPage && <Table.LoadMore />}
        {/* <BatchActions /> */}
      </div>
    </TableProvider>
  );
}
