import { RouterOutputs } from "@api/trpc/routers/_app";
import { ReportSheetHeader } from "./report-sheet-header";
import { cn } from "@school-clerk/ui/cn";
import { arabic } from "@/fonts";
import { ReportSheetFooter } from "./report-sheet-footer";
import { enToAr } from "@school-clerk/utils";
import { useGlobalParams } from "../../use-global";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useStore } from "../../store";
export interface PrintLayoutProps {
  data?: RouterOutputs["ftd"]["studentPrintData"][number];
  studentId: number;
}
export function PrintLayout(props: PrintLayoutProps) {
  const g = useGlobalParams();
  const trpc = useTRPC();
  const { data: __printList } = useQuery(
    trpc.ftd.studentPrintData.queryOptions(
      {
        studentIds: [props.studentId], //g.params.selectedStudentIds,
      },
      {
        enabled: false, // !!props.studentId,
      }
    )
  );
  const data = useStore(
    (s) => s.printDataObjectByStudentId?.[String(props?.studentId)]
  );
  // const data = printList?.[0];
  if (!data) return null;
  return (
    <div
      id={`result-${data.student?.postId}`}
      className={cn(
        "p-4 mx-auto border shadow-lg bg-white print:p-0 print:mx-0 print:border-0 print:shadow-none print:bg-transparent   flex flex-col pt-10 text-lg",
        arabic.className,
        `result-lines-${data?.lineCount}`,
        data?.lineCount > 8
          ? "result-lines-lg space-y-4"
          : "result-lines-sm space-y-8",
        g.params.printHideSubjects || "--h-[11.6in] h-[297mm]"
      )}
    >
      <ReportSheetHeader studentId={props.studentId} data={data as any} />
      <div
        className={cn(
          "flex flex-col text-xl",
          g.params.printHideSubjects && "hidden print:flex"
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
                    <div className="inline-flex">
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

      <ReportSheetFooter data={data} studentId={props.studentId} />

      <div className="h-20"></div>
    </div>
  );
}
