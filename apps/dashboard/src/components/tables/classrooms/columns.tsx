import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Menu } from "@school-clerk/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@school-clerk/ui/cn";

import { useAuth } from "@/hooks/use-auth";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";

export type Item = RouterOutputs["academics"]["getClassrooms"]["data"][number];
interface ItemProps {
  item: Item;
}
type Column = ColumnDef<Item>;

export const columns: Column[] = [
  {
    header: "Class Name",
    accessorKey: "class_room",
    meta: {
      className: "w-[25%]",
    },
    cell: ({ row: { original: item } }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {item?.displayName}
        </span>
        <span className="text-xs text-muted-foreground">
          {item?.classRoom?.name}
        </span>
      </div>
    ),
  },
  {
    header: "Level",
    accessorKey: "level",
    meta: {
      className: "w-[12%]",
    },
    cell: ({ row: { original: item } }) => {
      const classLevel = item?.classRoom?.classLevel;
      return (
        <span className="inline-flex min-w-14 items-center justify-center rounded-full border border-border px-2.5 py-1 text-xs font-medium">
          {classLevel ?? "—"}
        </span>
      );
    },
  },
  {
    header: "Students",
    accessorKey: "department",
    meta: {
      className: "w-[23%]",
    },
    cell: ({ row: { original: item } }) => {
      const count = item?._count?.studentSessionForms ?? 0;
      const capacity = 40;
      const percentage = capacity > 0 ? (count / capacity) * 100 : 0;
      return (
        <div className="flex flex-col gap-1.5 max-w-[160px]">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">
              of {capacity} seats
            </span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                count === 0
                  ? "bg-transparent"
                  : percentage > 90
                    ? "bg-orange-500"
                    : "bg-primary",
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    header: "Active Term",
    accessorKey: "term",
    meta: {
      className: "w-[20%]",
    },
    cell: ({ row: { original: item } }) => {
      const termTitle = item?.classRoom?.session?.title;
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            termTitle
              ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30"
              : "bg-secondary text-muted-foreground border-border",
          )}
        >
          {termTitle || "Setup Pending"}
        </span>
      );
    },
  },
  {
    header: "",
    accessorKey: "action",
    meta: {
      actionCell: true,
      preventDefault: true,
      className: "w-[80px]",
    },
    cell: ({ row: { original: item } }) => (
      <>
        <Actions item={item} />
      </>
    ),
  },
];

export function Actions({ item }: ItemProps) {
  const isMobile = useIsMobile();
  const auth = useAuth();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { setParams } = useClassroomParams();
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const { data: allClassroomsData } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );
  const moveTargets = Array.from(
    new Map(
      (allClassroomsData?.data ?? [])
        .filter((row) => row.classRoom?.id && row.classRoom?.id !== item.classRoom?.id)
        .map((row) => [row.classRoom.id, row]),
    ).values(),
  );
  const selectedMoveTarget = useMemo(
    () => moveTargets.find((target) => target.classRoom?.id === moveTargetId) ?? null,
    [moveTargetId, moveTargets],
  );
  const { mutate: deleteClassroomDepartmentGrade } = useMutation(
    trpc.classrooms.deleteClassroomTermDepartment.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.classrooms.all.queryKey({}),
        });
        qc.invalidateQueries({
          queryKey: trpc.academics.getClassrooms.infiniteQueryKey({}),
        });
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    }),
  );
  const { mutate: updateClassroomLevel, isPending: isUpdatingLevel } =
    useMutation(
      trpc.classrooms.updateClassroomLevel.mutationOptions({
        onSuccess() {
          qc.invalidateQueries({
            queryKey: trpc.classrooms.all.queryKey({}),
          });
          qc.invalidateQueries({
            queryKey: trpc.academics.getClassrooms.infiniteQueryKey({}),
          });
        },
        meta: {
          toastTitle: {
            error: "Unable to update level",
            loading: "Updating level...",
            success: "Class level updated",
          },
        },
    }),
  );
  const { mutate: moveClassroomStreams, isPending: isMovingClassroomStreams } =
    useMutation(
      trpc.classrooms.moveClassroomStreams.mutationOptions({
        onSuccess(data) {
          qc.invalidateQueries({
            queryKey: trpc.classrooms.all.queryKey({}),
          });
          qc.invalidateQueries({
            queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey(),
          });
          qc.invalidateQueries({
            queryKey: trpc.academics.getClassrooms.infiniteQueryKey({}),
          });
          setMoveTargetId(null);
        },
        meta: {
          toastTitle: {
            error: "Unable to move streams",
            loading: "Moving streams...",
            success: "Streams moved successfully",
          },
        },
      }),
    );
  return (
    <div className="relative flex justify-end z-10">
      <Menu
        triggerSize={isMobile ? "default" : "xs"}
        Trigger={
          <Button className={cn(isMobile || "size-4 p-0")} variant="ghost">
            <Icons.MoreHoriz className="" />
          </Button>
        }
      >
        <Menu.Item
          onClick={() =>
            setParams({
              editClassroomId: item.classRoom.id,
            })
          }
        >
          Edit Class
        </Menu.Item>
        <Menu.Item
          SubMenu={
            <>
              {[...Array(12)].map((a, i) => (
                <Menu.Item
                  disabled={isUpdatingLevel}
                  onClick={(e) => {
                    updateClassroomLevel({
                      classRoomId: item.classRoom.id,
                      classLevel: i + 1,
                    });
                  }}
                  key={i}
                >
                  Level {i + 1}
                </Menu.Item>
              ))}
              <Menu.Item
                disabled={isUpdatingLevel}
                onClick={() =>
                  updateClassroomLevel({
                    classRoomId: item.classRoom.id,
                    classLevel: null,
                  })
                }
              >
                Clear Level
              </Menu.Item>
            </>
          }
        >
          Arrange Class Level
        </Menu.Item>
        <Menu.Item
          SubMenu={
            <>
              {moveTargets.map((target) => (
                <Menu.Item
                  key={target.id}
                  disabled={isMovingClassroomStreams}
                  onClick={() => setMoveTargetId(target.classRoom.id)}
                >
                  {target.classRoom?.name}
                </Menu.Item>
              ))}
            </>
          }
        >
          Move &gt; Other Classrooms
        </Menu.Item>

        <Link
          target="_blank"
          href={`/student-report?departmentId=${item.id}&termId=${auth?.profile?.termId}`}
        >
          <Menu.Item>Report Sheet</Menu.Item>
        </Link>
        <Menu.Item
          icon="trash"
          onClick={() => {
            deleteClassroomDepartmentGrade({ departmentId: item.id });
          }}
        >
          Delete Classroom
        </Menu.Item>
      </Menu>
      <AlertDialog
        open={Boolean(moveTargetId)}
        onOpenChange={(open) => !open && setMoveTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move streams to another class?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  This will move all streams in{" "}
                  <span className="font-semibold">{item.classRoom?.name}</span> to{" "}
                  <span className="font-semibold">
                    {selectedMoveTarget?.classRoom?.name ?? "the selected class"}
                  </span>{" "}
                  and then delete the source class.
                </p>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="font-medium text-foreground">
                    Do you want to walk back the higher grades after the move?
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    If yes, every class above level{" "}
                    <span className="font-medium text-foreground">
                      {item.classRoom?.classLevel ?? "this class"}
                    </span>{" "}
                    will shift down by one level to close the gap left by this class.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMoveTargetId(null)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              disabled={isMovingClassroomStreams || !selectedMoveTarget}
              onClick={() => {
                if (!selectedMoveTarget?.classRoom?.id) return;
                moveClassroomStreams({
                  sourceClassRoomId: item.classRoom.id,
                  targetClassRoomId: selectedMoveTarget.classRoom.id,
                  walkBackHigherGrades: false,
                });
              }}
            >
              {isMovingClassroomStreams ? "Moving..." : "No, move only"}
            </Button>
            <AlertDialogAction
              disabled={isMovingClassroomStreams || !selectedMoveTarget}
              onClick={() => {
                if (!selectedMoveTarget?.classRoom?.id) return;
                moveClassroomStreams({
                  sourceClassRoomId: item.classRoom.id,
                  targetClassRoomId: selectedMoveTarget.classRoom.id,
                  walkBackHigherGrades: true,
                });
              }}
            >
              {isMovingClassroomStreams ? "Moving..." : "Yes, walk back"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
export const mobileColumn: ColumnDef<Item>[] = [
  {
    header: "",
    accessorKey: "row",
    meta: {
      className: "flex-1 p-0",
    },
    cell: ({ row: { original: item } }) => {
      return <ItemCard item={item} />;
    },
  },
];
function ItemCard({ item }: ItemProps) {
  const count = item?._count?.studentSessionForms ?? 0;
  const termTitle = item?.classRoom?.session?.title;
  const classLevel = item?.classRoom?.classLevel;
  return (
    <div className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {item?.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {item?.classRoom?.name}
          </span>
        </div>
        <Actions item={item} />
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Level <span className="font-medium text-foreground">{classLevel ?? "—"}</span>
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{count}</span> students
        </span>
        {termTitle && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30">
            {termTitle}
          </span>
        )}
      </div>
    </div>
  );
}
