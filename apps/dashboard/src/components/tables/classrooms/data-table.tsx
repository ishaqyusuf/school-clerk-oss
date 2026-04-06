"use client";

import { useTRPC } from "@/trpc/client";
import { Card } from "@school-clerk/ui/card";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  TableProvider,
  Table,
  useTableData,
} from "@school-clerk/ui/data-table";
import { Actions, columns, mobileColumn } from "./columns";
import { useClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useMemo } from "react";
export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useClassroomStore();
  const { filters } = useClassroomFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.academics.getClassrooms,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });

  const { setParams } = useClassroomParams();
  const classViewRows = useMemo(() => {
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
          progressionMode,
        };
      })
      .sort(
        (a, b) =>
          (a.classRoom?.classLevel ?? 9999) - (b.classRoom?.classLevel ?? 9999),
      );
  }, [data]);

  if ((filters as any).view === "class") {
    return (
      <div className="grid gap-4">
        {classViewRows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{row.classRoom?.name}</h3>
                  <Badge variant="outline">
                    Level {row.classRoom?.classLevel ?? "—"}
                  </Badge>
                  <Badge variant="secondary">{row.progressionMode}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {row.rows.length > 1
                    ? `${row.rows.length} streams`
                    : "Single stream"}
                  {" · "}
                  {row.studentCount} students
                </p>
                <div className="flex flex-wrap gap-2">
                  {row.rows.map((stream) => (
                    <Badge key={stream.id} variant="outline">
                      {stream.departmentName}
                      {stream.departmentLevel != null
                        ? ` · ${stream.departmentLevel}`
                        : ""}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="shrink-0">
                  <Actions item={row.rows[0]} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setParams({
                      viewClassroomId: row.rows[0]?.id,
                      classroomTab: "students",
                    })
                  }
                >
                  Open First Stream
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {hasNextPage && <Table.LoadMore />}
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
              //   overviewQuery.open2(rowData.uuid, "sales");
              setParams({
                viewClassroomId: rowData.id,
                classroomTab: "students",
              });
            },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
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
