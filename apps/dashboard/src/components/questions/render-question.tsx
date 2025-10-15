import { configs } from "@/configs";
import { moonDance } from "@/fonts";
import { buildQuestion } from "@/utils/question-builder";
import { cn } from "@school-clerk/ui/cn";
import { cva } from "class-variance-authority";
import { Fragment } from "react";

const pageVariant = cva("", {
  variants: {
    page: {
      half: "h-[5.85in]",
      half2: "h-[5.85in]",
      //   half2: "h-[5.85in] space-y-2 pt-8",
      //   half3: "h-[5.85in] space-y-2 pt-8",
      full: "h-[11.6in]",
    },
  },
});
const questionStyle = cva("", {
  variants: {
    t: {
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
      "5xl": "text-5xl",
    },
    mt: {
      "1": "mt-1",
      "2": "mt-2",
      "4": "mt-4",
      "6": "mt-6",
      "8": "mt-8",
      "10": "mt-10",
      "12": "mt-12",
    },
    bb: {
      "1": "border-b-2 border-dashed border-muted-foreground/60",
    },
    h: {
      "8": "h-8",
      "12": "h-12",
      "16": "h-16",
      "20": "h-20",
      "24": "h-24",
    },
  },
});
export function RenderQuestion({ data }) {
  const questLines = buildQuestion(data?.question);
  return (
    <div dir={"rtl"}>
      <ExamPaperHeader subject={data?.subject} fasl={data?.className} />
      {questLines?.map((ln, i) => (
        <div
          className={cn(ln.qNo && "mt-2", "my-2", questionStyle(ln?.styles))}
        >
          {/* {!ln.options?.length || ( */}
          <div
            className={cn(
              "w-fulls my-0.5 inline-flex flex-1 flex-wrap space-x-2",
              ln.type == "instruction" && "w-full flex-1 justify-center",
              ln.grids?.length && "hidden",
            )}
          >
            {!ln.qNo || <span className="mx-2">{ln.qNo}.</span>}
            <span className="">{ln.text}</span>
            {ln.options?.map((o, oi) => (
              <Fragment key={oi}>
                <div
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full border border-muted-foreground text-sm",
                    "mx-2",
                    oi == 0 && "mr-3",
                  )}
                >
                  {o.index}
                </div>
                <div className="">{o.text}</div>
              </Fragment>
            ))}
          </div>
          {/* )} */}
          {!ln?.grids?.length || (
            <div
              className={cn(
                "mr-6 grid gap-2",
                ln.grids.length == 2 && "grid-cols-2",
                ln.grids.length == 3 && "grid-cols-3",
                ln.grids.length == 4 && "grid-cols-4",
                ln.grids.length == 5 && "grid-cols-5",
              )}
            >
              {ln.grids?.map((g, i) => (
                <div key={i}>
                  {g.index && (
                    <span className="borders ml-2 inline-flex size-5 items-center justify-center rounded-full border-muted-foreground text-sm">
                      {g.index}
                      {")"}
                    </span>
                  )}
                  <span>{g.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function ExamPaperHeader({ subject, term = "الأولى", fasl }) {
  return (
    <div className="mb-3">
      <div className="space-y-2">
        <div className="flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-black/70">
            {configs.schoolName}
          </p>

          <p className={cn(moonDance.className, "text-base text-black")}>
            Sannushehu Street, Isale-koko, Ojagboro, Isale Gambari, Ilorin,
            Kwara State, Nigeria.
          </p>
        </div>
        <div className="space-y-3 font-semibold" dir="rtl">
          <div className="flex gap-4">
            <div className="flex w-2/3">
              <div className="whitespace-nowrap">اسم التلميذ/التلميذة</div>
              <span>:</span>
              <div className="w-full border-b-2 border-dashed border-muted-foreground"></div>
            </div>
            <div className="">
              <span>العام الدراسي</span>
              <span>:</span>
              <span className="mx-2">١٤٤٦/١٤٤٧</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <span>الفصل</span>
              <span>:</span>
              <span className="mx-2">{fasl}</span>
            </div>
            <div className="flex-1">
              <span>الفترة</span>
              <span>:</span>
              <span className="mx-2">{term}</span>
            </div>
            <div className="flex-1">
              <span>المادة</span>
              <span>:</span>
              <span className="mx-2">{subject}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
