import { moonDance } from "@/fonts";
import { enToAr } from "@/utils/utils";
import { cn } from "@school-clerk/ui/cn";
import { PrintLayoutProps } from "./print-layout";
import Image from "next/image";
import { configs } from "../../data";
import { useStore } from "../../store";
import signature from "public/signature.png";
// const schoolName = `مدرسـة دار الحديث لتحفيـظ القرآن والسنـة`;

export function ReportSheetFooter(
  // { term = "الثالثة", fasl, data, student }
  { data }: PrintLayoutProps,
) {
  const store = useStore();
  const report = store?.studentGrade?.[String(data?.student?.postId)];
  return (
    <>
      <div className="">
        <div className="space-y-6">
          <div
            className="border-b-2 border-dashed border-muted-foreground"
            dir="rtl"
          >
            <span className="font-bold"> {configs.comment}:</span>
            <span className="px-4 text-2xl">{report?.comment?.arabic}</span>
          </div>
          <div
            className="border-b-2 border-dashed border-muted-foreground"
            dir="ltr"
          >
            <span className="font-bold"> Comment:</span>

            <span className="px-4 text-2xl">{report?.comment?.english}</span>
          </div>
        </div>
      </div>
      <div
        id="signature"
        className={cn("print-px spb-8 pt-8s flex justify-between")}
      >
        {[configs.directorSignature, configs.teacherSignature].map((c, ci) => (
          <div className="relative">
            <div className="h-[30px]">
              {ci == 0 && (
                <div className="-top-8s absolutes right-2">
                  <Image
                    alt=""
                    width={80}
                    height={80}
                    src={signature}
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
