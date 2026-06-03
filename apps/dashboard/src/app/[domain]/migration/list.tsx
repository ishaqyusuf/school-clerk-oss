import { cn } from "@school-clerk/ui/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

import { loadCookie } from "./cookie";
import { getTermsData } from "./data";

export async function List({}) {
  const data = getTermsData();
  const cook = await loadCookie();
  return (
    <div className="">
      {data.map((term) => (
        <div className={cn(cook?.term && cook?.term != term?.term && "hidden")}>
          {term.result.map((classRoom, classId) => (
            <div
              className={cn(
                cook?.class && cook?.class != classRoom?.className && "hidden",
              )}
              key={classId}
            >
              <div className="my-4 text-lg font-bold" dir="rtl">
                <div className="">{classRoom?.className}</div>
              </div>

              <Table dir="rtl">
                <TableHeader className="h-auto">
                  <TableRow className="h-auto">
                    <TableHead align="left">Student</TableHead>
                    {classRoom?.subjects?.map((s, si) => (
                      <TableHead className="srotate-90 h-28" key={si}>
                        {s?.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classRoom?.students.map((student) => (
                    <TableRow>
                      <TableCell>
                        <div className="flex">
                          <div className="font-bold">{student.firstName}</div>
                          <div className="px-2">{student.surname}</div>
                          <div className="px-2 text-blue-500">
                            {student.otherName}
                          </div>
                        </div>
                      </TableCell>
                      {student?.scores?.map((s, si) => (
                        <TableCell align="center" key={si}>
                          {s}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
