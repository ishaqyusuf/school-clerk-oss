import { namePrintFormat } from "@/app/dashboard/[domain]/(temp)/first-term-1446-1447/utils";
import { configs } from "@/configs";
import { arabic, moonDance } from "@/fonts";
import { useReportPageContext } from "@/hooks/use-report-page";
import { cn } from "@school-clerk/ui/cn";
import { enToAr } from "@school-clerk/utils";
import Image from "next/image";
// import signature from "@public/signature.png";
export function StudentReportPage({ studentId }) {
  const [width, height] = [595, 842];
  const ctx = useReportPageContext();
  const data = ctx?.reportsById?.[studentId];
  return (
    <div
      className={cn(
        "p-4 mx-auto border shadow-lg bg-white print:p-0s print:mx-0 print:border-0 print:shadow-none print:bg-transparent   flex flex-col pt-10 text-lg",
        arabic.className,
        `result-lines-${data?.lineCount}`,
        data?.lineCount > 8
          ? "result-lines-lg space-y-4"
          : "result-lines-sm space-y-8",
        "h-[297mm]"
        // g.params.printHideSubjects || "--h-[11.6in] h-[297mm]"
      )}
      style={{
        // maxWidth: width,
        height,
      }}
    >
      <ReportHeader studentId={studentId} />
      <div
        className={cn(
          "flex flex-col text-xl"
          // g.params.printHideSubjects && "hidden print:flex",
        )}
      >
        {/* {props.data?.lineCount} */}
        {data?.tables?.map((table, ti) => (
          <table
            dir={"rtl"}
            className={cn(
              "w-full result",
              `lines-${data?.lineCount}`,

              ti == 0 && "border-t border-muted-foreground"
            )}
            key={ti}
          >
            <thead className="">
              <tr>
                {table.columns?.map((c, ci) => (
                  <th
                    key={ci}
                    className={cn(
                      ci > 0 && "w-24",
                      ci === table.columns.length - 1 && "w-28",
                      ci === table?.columns?.length - 1 ? "last" : "",
                      ci == 0 && "first"
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{c.label}</span>
                      {c.subLabel ? <span>{c.subLabel}</span> : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.columns.map((rc, rci) => (
                    <td
                      className={cn(
                        rci === r?.columns?.length - 1 ? "last" : "",
                        rci == 0 && "first"
                      )}
                      align={rci > 0 ? "center" : "right"}
                      key={rci}
                    >
                      {rc.value ? enToAr(rc.value) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <div className="flex-1"></div>

      <ReportFooter studentId={studentId} />

      <div className="h-20"></div>
    </div>
  );
}

function ReportFooter({ studentId }) {
  const ctx = useReportPageContext();
  const data = ctx?.reportsById?.[studentId];
  return (
    <>
      <div className="">
        <div className="space-y-10">
          <div
            className="border-b-2 border-dashed border-muted-foreground"
            dir="rtl"
          >
            <span className="font-bold text-xl"> {configs.comment}:</span>
            <span className="px-4 text-4xl">{data?.comment?.arabic}</span>
          </div>
          <div
            className="border-b-2 border-dashed border-muted-foreground"
            dir="ltr"
          >
            <span className="font-bold text-xl"> Comment:</span>

            <span className="px-4 text-4xl">{data?.comment?.english}</span>
          </div>
        </div>
      </div>
      <div
        id="signature"
        className={cn("print-px spb-8 pt-8s flex justify-between")}
      >
        {[configs.directorSignature, configs.teacherSignature].map((c, ci) => (
          <div key={ci} className="relative">
            <div className="h-[30px]">
              {ci == 0 && (
                <div className="-top-8s absolutes right-2">
                  <Image
                    alt=""
                    width={80}
                    height={80}
                    src={`/signature.png`}
                    className="object-fill"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
            <div
              className="flex w-[120px] justify-center border-t border-dashed border-black/50"
              key={ci}
            >
              {c}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function ReportHeader({ studentId }) {
  const ctx = useReportPageContext();
  const data = ctx?.reportsById?.[studentId];
  return (
    <div className="mb-3">
      <div className="space-y-4 flex flex-col">
        <div className="flex flex-col items-center justify-center">
          <p id="schoolName" className="text-xl font-bold  text-black/70">
            {configs.schoolName}
          </p>

          <p
            id="address"
            className={cn(moonDance.className, "text-base text-black")}
          >
            {configs.schoolAddress}
          </p>
        </div>
        <div className="space-y-1">
          <div className="w-full border-b-4 border-muted-foreground"></div>
          <div className="under-line w-full"></div>
        </div>
        <div className="space-y-4 text-xl font-semibold" dir="rtl">
          <div className="flex gap-2">
            <div className="flex w-2/3 items-end">
              <div className="whitespace-nowrap text-black/70">
                اسم التلميذ/التلميذة
              </div>
              <span>:</span>
              <div className="inline-flex w-full border-b-2 border-dashed border-muted-foreground px-4 text-xl">
                {/* {student.fullName} */}
                {namePrintFormat(
                  data.student.name,
                  data.student.surname,
                  data.student.otherName
                )?.map((p, i) => (
                  <div key={i} className="px-2">
                    {p}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <span className="text-black/70">العام الدراسي</span>
              <span>:</span>
              <span className="mx-1">١٤٤٦/١٤٤٧هـ</span>
            </div>
          </div>
          <div className="flex-wraps flex items-end gap-2 whitespace-nowrap ">
            <div className="flex items-end">
              <span className="text-black/70">الفصل</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {ctx.classroomName}
              </span>
            </div>
            <div className="flex items-end">
              <span className="text-black/70">الفترة</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {`الأولى`}
              </span>
            </div>
            <div className="">
              <span className="text-black/70">النسبة المئوية</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {`${enToAr(data?.grade?.percentage)}%`}
              </span>
            </div>
            {/* <div className="">
              <span className="text-black/70">المجموع الكلي</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {`${enToAr(data?.grade?.obtained)}/${enToAr(
                  data?.grade?.obtainable
                )}`}
              </span>
            </div> */}
            {/* <div className="">
              <span className="text-black/70">عدد الطلاب في الفصل</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {enToAr(report?.totalStudents)}
              </span>
            </div>
            <div className="">
              <span className="text-black/70">الدرجة</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {`${enToAr(report?.position)}`}
              </span>
            </div> */}
            <div className="">
              <span className="text-black/70">الدرجة</span>
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {`${enToAr(data?.grade?.position)} من ${enToAr(
                  data?.grade?.totalStudents
                )} ${data?.grade?.totalStudents >= 10 ? "طالبا" : "طلابا"}`}
              </span>
            </div>
            <div className="">
              <span className="text-black/70">تاريخ العودة</span>
              {/* <span className="text-black/70">تاريخ العودة للعام الجديد</span> */}
              <span>:</span>
              <span className="mx-1 border-b border-muted-foreground">
                {enToAr("27/07/25")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
