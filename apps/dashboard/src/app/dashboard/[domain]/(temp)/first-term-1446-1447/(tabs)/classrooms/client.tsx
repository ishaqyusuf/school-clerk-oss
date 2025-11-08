"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGlobalParams, usePostMutate } from "../../use-global";
import { Table, TableBody, TableCell, TableRow } from "@school-clerk/ui/table";
import { Fragment } from "react";
import { ClassroomSubjects } from "./subjects";
import { ClassroomStudents } from "./students";

import { Button } from "@school-clerk/ui/button";

import { CreateStudent } from "./create-student";
import { CreateClassroom } from "./create-class-room";
import { Menu } from "@/components/menu";
import { indices } from "../../utils";
import { cn } from "@school-clerk/ui/cn";

import { useAuth } from "@/hooks/use-auth";
export function Client() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.ftd.classRooms.queryOptions());
  const g = useGlobalParams();
  const m = usePostMutate();
  const qc = useQueryClient();
  const auth = useAuth();
  const updateIndex = (id, inddex) =>
    m.updateAction.mutate(
      {
        id,
        data: {
          classIndex: inddex,
        },
      },
      {
        onSuccess(data, variables, context) {
          qc.invalidateQueries({
            queryKey: trpc.ftd.classRooms.queryKey(),
          });
        },
      }
    );
  return (
    <div className="pb-56 md:pb-10">
      {g.params.entryMode || (
        <div className="">
          <CreateClassroom />
        </div>
      )}
      <Table dir={"rtl"} className="">
        <TableBody>
          {data
            ?.filter((a) => {
              if (g.params.entryMode) {
                return a.postId === g.params.openStudentsForClass;
              }
              return true;
            })
            .map((classroom, ci) => (
              <Fragment key={ci}>
                <TableRow className="">
                  <TableCell className="inline-flex items-center gap-4">
                    <span className="inline-flex gap-2 items-center">
                      <Menu
                        disabled={g.params.entryMode}
                        Icon={null}
                        label={`${classroom.classIndex}.`}
                      >
                        {indices.map((i) => (
                          <Menu.Item
                            key={i}
                            onClick={(e) => {
                              updateIndex(classroom.postId, Number(i));
                            }}
                          >
                            {i}
                          </Menu.Item>
                        ))}
                      </Menu>{" "}
                      {classroom.classTitle}
                    </span>
                    <div
                      className={cn(
                        "flex gap-2",
                        g.params.entryMode && "hidden"
                      )}
                    >
                      <Button
                        variant={
                          g.params.openClassSubjectId === classroom.postId &&
                          g.params.tab === "classSubjects"
                            ? "default"
                            : "secondary"
                        }
                        onClick={(e) => {
                          g.setParams({
                            openClassSubjectId: classroom.postId,
                            tab: "classSubjects",
                          });
                        }}
                      >
                        Subjects
                      </Button>
                      <Button
                        variant={
                          g.params.openStudentsForClass === classroom.postId &&
                          g.params.tab === "classStudents"
                            ? "default"
                            : "secondary"
                        }
                        onClick={(e) => {
                          g.setParams({
                            openStudentsForClass: classroom.postId,
                            tab: "classStudents",
                          });
                        }}
                      >
                        Students
                      </Button>
                      <CreateStudent classId={classroom.postId} />
                    </div>
                  </TableCell>
                </TableRow>
                <ClassroomSubjects classRoomId={classroom.postId} />
                <ClassroomStudents classRoomId={classroom.postId} />
              </Fragment>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
