"use client";
import { useTRPC } from "@/trpc/client";
import { transformData } from "./data";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@school-clerk/ui/button";
import { Menu } from "@/components/menu";

export default function Page({}) {
  const data = transformData();

  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.course}>
          <h2 className="text-2xl font-bold p-4" dir="rtl">
            {d.course}
          </h2>
          <div className="overflow-x-auto">
            <table
              dir="rtl"
              className="w-full table-auto border-collapse border"
            >
              <thead>
                <tr>
                  <th className="border p-2"></th>
                  <th className="border p-2">Student Name</th>
                  {d.subjects.map((s) => (
                    <th
                      key={s.code}
                      className="border p-2"
                      colSpan={s.assessments.length}
                    >
                      {s.subject}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="border p-2"></th>
                  <th className="border p-2"></th>
                  {d.subjects.map((s) =>
                    s.assessments.map((a) => (
                      <th key={`${s.code}-${a.code}`} className="border p-2">
                        {a.type}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {d.students.map((student, i) => (
                  <tr key={i}>
                    <td>{i + 1}.</td>
                    <td className="border p-2 flex">
                      <span className="font-semibold">{student.firstName}</span>
                      <span className="mx-1">{student.surname}</span>
                      <span className="text-destructive">
                        {student.otherName}
                      </span>
                      {/* {[student.firstName, student.surname, student.otherName]
                        .filter(Boolean)
                        .join(" ")} */}
                    </td>
                    {d.subjects.map((s) =>
                      s.assessments.map((a) => {
                        const assessment = student.assessments.find(
                          (sa) =>
                            sa.subjectCode === s.code &&
                            sa.assessmentCode === a.code,
                        );
                        return (
                          <td
                            key={`${s.code}-${a.code}`}
                            className="border p-2 text-center"
                          >
                            {assessment ? assessment.score : ""}
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
