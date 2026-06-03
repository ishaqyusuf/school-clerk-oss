"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@school-clerk/ui/collapsible";
import { Badge } from "@school-clerk/ui/badge";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableRow, TableCell } from "@school-clerk/ui/table";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { useGlobalParams } from "../../use-global";
import { PrintLayout } from "./print-layout";
import { sortClassroomStudents } from "../../utils";
import { useStore } from "../../store";
import { Label } from "@school-clerk/ui/label";
import { Button } from "@school-clerk/ui/button";
import { useMedia } from "./use-media";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@school-clerk/ui/sheet";
import { enToAr } from "@/utils/utils";

function ClassroomSidebar({ classrooms, isLoading }) {
  const isDesktop = useMedia("(min-width: 1024px)");
  const [isOpen, setIsOpen] = useState(false);

  const classroomContent = (
    <div className="space-y-2">
      {isLoading ? (
        <p>Loading classrooms...</p>
      ) : (
        classrooms?.map((classroom) => (
          <ClassroomItem key={classroom.postId} classroom={classroom} />
        ))
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="w-72 h-[80vh] overflow-auto fixed border-r bg-gray-50 hide-on-print">
        <h2 className="text-lg font-semibold mb-4 p-4">Classrooms</h2>
        <div className="p-4">{classroomContent}</div>
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="lg:hidden fixed bottom-4 right-4 z-10 hide-on-print"
        >
          Classrooms
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Classrooms</SheetTitle>
        </SheetHeader>
        <div className="py-4">{classroomContent}</div>
      </SheetContent>
    </Sheet>
  );
}

export default function ReportSheetPage() {
  const trpc = useTRPC();
  const { data: classrooms, isLoading: isLoadingClassrooms } = useQuery(
    trpc.ftd.classRooms.queryOptions()
  );
  const g = useGlobalParams();

  return (
    <div className="flex h-full">
      <ClassroomSidebar
        classrooms={classrooms}
        isLoading={isLoadingClassrooms}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 print:m-0 p-4 print:p-0 overflow-y-auto space-y-8 print:space-y-0">
        <h1 className="text-2xl print:hidden font-bold mb-4 print:hover:">
          Report Sheet Print Page
        </h1>
        <div className="flex gap-4 items-center">
          <div className="print:hidden flex gap-2">
            <Checkbox
              checked={g.params.printHideSubjects}
              onCheckedChange={(e) =>
                g.setParams({
                  printHideSubjects: !g.params.printHideSubjects,
                })
              }
            />
            <Label>Hide Subjects</Label>
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              g.setParams({
                selectedStudentIds: null,
              });
            }}
          >
            Clear Selections
          </Button>
        </div>
        {g.params?.selectedStudentIds?.map((p, i) => (
          <div key={p} className={cn(i > 0 && "print:break-before-all")}>
            <PrintLayout studentId={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClassroomItemProps {
  classroom: any;
}

function ClassroomItem({ classroom }: ClassroomItemProps) {
  const g = useGlobalParams();
  const isOpen = g.params.printFilterClassIds?.includes(classroom.postId);
  const trpc = useTRPC();
  const store = useStore();
  const classroomPrintData = useStore(
    (s) => s.classroomPrintData[classroom.postId]
  );
  const storeStudents = classroomPrintData?.classroomData?.students;
  const { data: printData, isLoading: isLoadingPrintData } = useQuery(
    trpc.ftd.getClassroomPrintData.queryOptions(
      { classRoomId: classroom.postId },
      {
        enabled: isOpen && !storeStudents?.length,
      }
    )
  );
  useEffect(() => {
    if (!printData?.classroomData?.students?.length) return;
    store.update(`classroomPrintData.${classroom.postId}`, printData as any);
    const students = printData?.classroomData?.students;
    const sorted = sortClassroomStudents([...students], "grade");
    sorted.map((a, i) => {
      const totalSubjects = a.subjectAssessments.filter((b) =>
        b.assessments?.some((a) => !!a.subjectAssessment?.obtainable)
      )?.length;
      const sittedSubjects = a.subjectAssessments.filter((b) =>
        b.assessments?.some((a) => !!a.studentAssessment?.markObtained)
      )?.length;
      store.update(`studentGrade.${a.postId}`, {
        totalScore: a.totalScore!,
        position:
          sorted.filter((b) => b.totalScore! > a.totalScore!)?.length + 1,
        totalStudents: sorted.length,
        comment: a.comment,
        totalObtainable: a.totalObtainable!,
        sittedSubjects,
        totalSubjects,
      });
    });
    Object.entries(printData?.printDataObjectByStudentId).map(([k, s]) => {
      store.update(`printDataObjectByStudentId.${k}`, s);
    });
  }, [printData]);

  const sortedStudents = useMemo(() => {
    return sortClassroomStudents([...(storeStudents || [])], "name");
  }, [storeStudents]);

  const handleScroll = (id) => {
    const element = document.getElementById(`result-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };
  // ٧٧٩.٥
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(e) => {
        const newRes = e
          ? [...(g.params.printFilterClassIds || []), classroom.postId]
          : g.params.printFilterClassIds?.filter(
              (a) => a != classroom.postId
            ) || null;
        g.setParams({
          printFilterClassIds: newRes,
        });
      }}
      className="w-full space-y-2"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border p-2 py-2 text-left font-medium transition-all hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180">
        {classroom.classTitle}
        {isOpen ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 p-2 pb-2">
        {isLoadingPrintData ? (
          <p>Loading students...</p>
        ) : (
          <Table dir="rtl" className="">
            <TableBody>
              {sortedStudents?.map((student: any) => {
                const grade = store.studentGrade[student.postId];
                return (
                  <TableRow
                    className={
                      cn(
                        g.params.selectedStudentIds?.includes(student.postId)
                      ) && "cursor-pointer"
                    }
                    onClick={(e) => {
                      if (g.params.selectedStudentIds?.includes(student.postId))
                        handleScroll(student.postId);
                    }}
                    key={student.postId}
                  >
                    <TableCell className="inline-flex  gap-2 items-center">
                      <Checkbox
                        disabled={!grade?.sittedSubjects}
                        checked={
                          !!g.params.selectedStudentIds?.includes(
                            student.postId
                          )
                        }
                        onCheckedChange={(checked) => {
                          const newRes = checked
                            ? [
                                ...(g.params.selectedStudentIds || []),
                                student.postId,
                              ]
                            : g.params.selectedStudentIds?.filter(
                                (a) => a != student.postId
                              ) || null;
                          g.setParams({
                            selectedStudentIds: newRes,
                          });
                        }}
                      />
                      <div dir="rtl" className="font-medium inline-flex gap-1">
                        {[
                          student.firstName,
                          student.surname,
                          student.otherName,
                        ].map((a, ai) => (
                          <span key={ai}>{a}</span>
                        ))}
                      </div>
                      <div className="">{`${grade?.sittedSubjects}/${grade.totalSubjects}`}</div>
                      <div className="">{enToAr(grade?.position) || ""}</div>
                      {student.payments?.map((payment: any, index: number) => (
                        <Badge
                          key={index}
                          className={cn(
                            payment.status === "paid"
                              ? "bg-green-500"
                              : "bg-red-500",
                            "text-white"
                          )}
                        >
                          {payment.term} - {payment.paymentType}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
