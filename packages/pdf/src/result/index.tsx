import { Document, Font, Page } from "@react-pdf/renderer";
import { Text, View } from "@school-clerk/react-pdf";
import path from "path";
import { fileURLToPath } from "url";
import { MetaData } from "./meta-data";

Font.register({
  family: "Amiri",
  fonts: [
    {
      src: "/fonts/Amiri-Regular.ttf",
      fontWeight: 400,
    },
  ],
});
Font.register({
  family: "DancingScript",
  fonts: [
    {
      src: "/fonts/DancingScript-Regular.ttf",
      fontWeight: 400,
    },
  ],
});
Font.register({
  family: "MoonDance",
  fonts: [
    {
      src: "/fonts/MoonDance-Regular.ttf",
      fontWeight: 400,
    },
  ],
});
const labels = {
  studentName: "اسم التلميذ/التلميذة",
  year: "لعام الدراسي",
  class: "الفصل",
  term: "الفترة",
  total: "المجموع الكلي",
  totalStudents: "عدد الطلاب في الفصل",
  position: "الدرجة",
};
interface Props {}
const schoolName = `مدرسـة دار الحديث لتحفيـظ القرآن والسنـة`;
export function ResultTemplate(props: Props) {
  return (
    <Document title="SAMPLE">
      <Page size={"LETTER"}>
        <View className="flex flex-col items-center justify-center">
          <Text
            className="text-center text-4xl font-bold text-black"
            style={{
              fontFamily: "Amiri",
            }}
          >
            {schoolName}
          </Text>
          <Text
            style={{
              fontFamily: "DancingScript",
            }}
            className="text-base text-black"
          >
            Sannushehu Street, Isale-koko, Ojagboro, Isale Gambari, Ilorin,
            Kwara State, Nigeria.
          </Text>
        </View>
        <View className="h-1 bg-black" />
        <View className="h-0.5 mt-1 bg-blue" />
        <View
          style={{
            fontFamily: "Amiri",
          }}
          className="flex flex-row flex-wrap"
        >
          <MetaData title={labels.studentName} className="col-span-3">
            <Text>...</Text>
          </MetaData>
          <MetaData title={labels.studentName} className="col-span-3">
            <Text>...</Text>
          </MetaData>
        </View>
        <View wrap={false} className="flex-1 flex flex-col justify-end">
          <Text>FOOTER</Text>
        </View>
      </Page>
    </Document>
  );
}
