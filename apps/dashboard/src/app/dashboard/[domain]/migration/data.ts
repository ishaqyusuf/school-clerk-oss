import { firstTermData } from "@/migration/first-term-data";
import {
  rawEntranceData,
  secondTermRawData,
} from "@/migration/second-term-data";
import { thirdTermData } from "@/migration/third-term-data";
import { arToEn, sum } from "@/utils/utils";

import { useMigrationStore } from "./store";
import { dotName, getClassCode, getClassSubjectList, trimName } from "./utils";

export const classList = [];
export type StudentRecord = {
  terms: Term["term"][];
  fullTerm?: boolean;
  partTerm?: boolean;
  firstName: string;
  // surname: string;
  // otherName: string;
  fullName: string;
  mergeNames: string[];
  gender: string;
  payments: PaymentStatus[];
  paymentData?: ReturnType<typeof paymentStructure>;
  classRoom: string;
};
function paymentStructure(student: StudentRecord) {
  // student.terms
  const store = useMigrationStore.getState();
  const studentName = student.fullName; // dotName(student as any);
  let storePayments = store.studentPayments?.[student.classRoom]?.[studentName];
  if (!storePayments) storePayments = {} as any;
  storePayments.studentName = studentName;
  // storePayments = studentName;

  const pays = {} as Partial<{
    [term in Term["term"]]: {
      fees: { paidIn; paid }[];
      entrance: { paidIn; amount; paid };
      // totalPaid: null;
      // totalPending: null;
    };
  }>;
  let entranceStatus = null as PaymentStatus["status"];
  [...student.payments, ...(storePayments?.payments || [])].map((p) => {
    const { term, paidIn, amountPaid } = p;
    if (!pays[p.term])
      pays[p.term] = {
        fees: [],
        entrance: {
          paidIn: null,
          amount: null,
          paid: null,
        },
      };
    if (p.paymentType == "entrance") {
      pays[p.term].entrance.paidIn = p.paidIn;
      pays[p.term].entrance.paid = p.amountPaid;
      const eAmt = (pays[p.term].entrance.amount =
        p.amountPaid || p.amountPending);
      if (eAmt) {
        entranceStatus = p.status;
      }
    } else {
      if (amountPaid)
        pays[p.term].fees.push({
          paidIn,
          paid: amountPaid,
        });
    }
  });
  if (!storePayments?.billables)
    storePayments.billables = {
      "1st": { amount: 3000 },
      "2nd": { amount: 3000 },
      "3rd": { amount: 3000 },
    };
  let paid = 0;
  let payable = 0;
  function billable(k) {
    const b = storePayments?.billables?.[k];
    return b?.free || b?.omit ? 0 : b?.amount;
  }
  Object.entries(pays).map(([k, v]) => {
    if (v?.entrance?.amount) {
      payable = sum([payable, v?.entrance?.amount]);
      paid = sum([paid, v?.entrance?.paid]);
    }
    const termAmount = billable(k);
    // storePayments?.billables?.[k]?.amount;
    v?.fees?.map((fee) => {
      paid = sum([paid, fee.paid]);
      payable = sum([payable, termAmount]);
    });
  });
  ["1st", "2nd", "3rd"].map((a) => {
    const b = billable(a);
    if (!pays?.[a]?.fees?.length && b) payable = sum([payable, b]);
  });
  return {
    storePayments,
    paid,
    payable,
    pending: sum([payable, paid * -1]),
    entranceStatus,
  };
}
function wordMatchScore(input, target) {
  const inputWords = input.toLowerCase().split(/\s+/);
  const targetWords = target.toLowerCase().split(/\s+/);

  const matchCount = inputWords.filter((word) =>
    targetWords.includes(word),
  ).length;
  const score = matchCount / inputWords.length;

  return score;
}
export function sessionRecord() {
  const store = useMigrationStore.getState();
  const terms = getTermsData();
  const second = terms.find((a) => a.term == "2nd");
  const forms = rawEntranceData
    ?.split("\n")
    ?.map((n) => {
      const payable = 1000;
      let paid = n?.endsWith("؟") ? 0 : 1000;
      const v = n?.split("؟")?.filter(Boolean)?.join();
      const student = second?.result
        ?.map((r) => {
          return r.students
            ?.map((s) => {
              const fullName = [s.firstName, s.surname, s.otherName]
                ?.filter(Boolean)
                ?.join(" ");
              const score = wordMatchScore(v, fullName);
              return {
                fullName,
                score,
                matchName: v,
                class: r.className,
                // s,
              };
            })
            .filter((a) => a.score > 0.85)
            .flat();
        })
        .flat();

      return {
        paid,
        v,
        matches: student?.length,
        matchList: student,
      };
    })
    // .sort((a, b) => a.paid - b.)
    .sort((a, b) => a.matches - b.matches);
  console.log({ forms });
  type Record = {
    [className in string]: {
      studentCount: number;
      students: StudentRecord[];
      studentByName: { [name in string]: StudentRecord };
    };
  };
  const records: Record = {};
  terms.map((term) => {
    term.result.map((res) => {
      if (!records?.[res.className]) {
        records[res.className] = {
          studentCount: 0,
          students: [],
          studentByName: {},
        };
      }
      const studentByName = records[res.className].studentByName;
      res.students.map((student) => {
        const fullName = dotName(student as any);
        const studentMergeClass = store?.studentMerge?.[res.className];
        const mergeName = studentMergeClass?.[fullName];
        let __fullName = mergeName || fullName;

        if (!studentByName[__fullName])
          studentByName[__fullName] = {
            terms: [term.term],
            firstName: student?.firstName,
            fullName: __fullName,
            mergeNames: mergeName ? [fullName] : [],
            gender: store?.genders?.[student?.firstName],
            payments: student.payments || [],
            classRoom: res.className,
          };
        else {
          if (mergeName) studentByName[__fullName].mergeNames.push(fullName);
          studentByName[__fullName].terms.push(term.term);
          studentByName[__fullName].payments.push(...(student.payments || []));
        }
      });
    });
  });

  const sortedRecords = Object.fromEntries(
    Object.entries(records).map(([name, group]) => {
      const sortedStudents = Object.values(group.studentByName)
        .sort((a, b) => {
          // First by gender
          if (a.gender > b.gender) return -1;
          if (a.gender < b.gender) return 1;
          // Then by firstName
          if (a.fullName < b.fullName) return -1;
          if (a.fullName > b.fullName) return 1;
          return 0;
        })
        .map((student) => {
          student.paymentData = paymentStructure(student);
          return student;
        });

      return [name, { ...group, students: sortedStudents }];
    }),
  );

  return sortedRecords;
}
export function getTermsData() {
  return [firstTerm(), secondTerm(), thirdTerm()].map((term) => {
    return {
      ...term,
      result: term.result.map((result) => {
        return {
          ...result,
          students: result.students.map((r) => {
            return {
              ...r,
              firstName: trimName(r.firstName),
              surname: trimName(r.surname),
              otherName: trimName(r.otherName),
            };
          }),
        };
      }),
    };
  });
}
function transformClassName(_) {
  return _?.split(" ")
    ?.filter(Boolean)
    ?.join(" ")
    ?.replace("الأول", "الأوّل")
    ?.replace("الاعدادي", "الإعدادي");
}
function firstTerm(): Term {
  const result = firstTermData.map((classRoom) => {
    let students = [];
    let subjects = [];
    classRoom.rawData
      ?.split("\n")
      .filter(validateLine)
      .map((line, index) => {
        line = line?.replaceAll("،", ",");
        if (index == 0) {
          const [n, ...s] = line.split(",").map((a) => a.trim());
          subjects = s?.map((_s) => ({
            name: _s,
          }));
        } else {
          let [name, ...scores] = line?.split(","); //?.replaceAll("  ", " ");
          name = name?.includes("-") ? name?.split("-")?.[1] : name;
          let [firstName, surname, otherName] = name
            ?.split(name.includes(".") ? "." : " ")
            ?.filter(Boolean);
          firstName = firstName?.includes("-")
            ? firstName?.split("-")?.[1]
            : firstName;
          students.push({
            firstName,
            surname,
            otherName,
            scores,
          });
        }
      });
    classRoom.class = transformClassName(classRoom.class);
    classList.push(classRoom.class);
    return {
      students,
      subjects,
      className: classRoom.class,
    } satisfies Class;
  });
  return {
    result,
    term: "1st",
  };
}
function validateLine(line) {
  if (line?.startsWith("//") || !line) return false;
  return true;
}
function secondTerm(): Term {
  let result: Term["result"] = [];
  let classData = {
    className: null,
    students: [],
    subjects: [] as Class["subjects"],
  };
  secondTermRawData
    .split("\n")
    ?.filter(validateLine)

    .map((line) => {
      line = line.replaceAll("؛", ";")?.replaceAll(". ", ";");
      let [fasl, className] = line?.split(":");

      if (fasl === "الفصل") {
        className = transformClassName(className);
        if (classData?.className) result.push({ ...classData });
        classData = {
          className: className,
          students: [],
          subjects: [],
        };
        classList.push(className);

        return;
      }
      const [name, ...scores] = line.split(";");
      if (name === "اسم") {
        //
        classData.subjects = scores.map((s) => ({
          name: s,
        }));
      } else {
        let [firstName, surname, otherName] = name
          ?.split(name.includes(".") ? "." : " ")
          ?.filter(Boolean);
        classData.students.push({
          firstName,
          surname,
          otherName,
          scores,
        });
      }
    });
  if (classData?.className) result.push({ ...classData });

  return {
    result,
    term: "2nd",
  };
}
function thirdTerm(): Term {
  studentId = 0;
  let cls: Class = null as any;
  const _classList = [] as Class[];
  let gender: Student["gender"] = "M";
  thirdTermData
    .split("\n")
    .filter(validateLine)
    .map((line) => {
      if (line.includes("📃")) {
        if (cls) {
          _classList.push({ ...cls });
          cls = null as any;
        }
        const clsName = transformClassName(line?.replace("📃", "")?.trim());
        const clsCode = getClassCode(clsName);
        cls = {
          className: clsName,

          students: [],
          code: clsCode,
          subjects: getClassSubjectList(clsCode as any),
          subs: [],
          subsCount: 0,
        };
        if (!cls.subjects) return null;
        cls.subs = cls.subjects
          .map((a) => (a.subs.length ? a.subs : [null]))
          .flat() as any;
        gender = "M";
        studentClassId = 0;
        cls.subsCount = cls.subs?.filter(Boolean).length;
        return;
      }
      if (!line || ["-", "."].some((c) => !line?.replaceAll(c, "").trim())) {
        if (cls?.students?.length) gender = "F";
        return null;
      }
      const [name, ...params] = line?.includes(". ")
        ? line.split(". ")
        : [line];
      const trimmedName = name?.split(".")?.filter(Boolean).join(".");

      if (!trimmedName) {
        if (cls?.students?.length) gender = "F";
        return null;
      }
      const [firstName, fathersName, otherName] = trimmedName
        ?.split(trimmedName?.includes(".") ? "." : " ")
        ?.filter(Boolean);
      // if (nameSplt?.length > 2 || nameSplt?.length == 1 || !nameSplt?.length)
      const student: Student = {
        gender,
        text: line,
        studentClassId: (studentClassId += 1),
        studentId: (studentId += 1),
        firstName,
        surname: fathersName,
        otherName: otherName,
        payments: [],
        examStatus: "",
        scores: [],
      };
      params?.map((p) => {
        p = p.split(".").filter(Boolean).join(".")?.trim();
        if (quranClasses.includes(p as any)) {
          student.quranClass = p as any;
          return;
        }
        if (p == "م") {
          student.payments.push({
            paymentType: "fee",
            term: "3rd",
            status: "not applicable",
            paidIn: "3rd",
          });
          student.examStatus = examStatus.free;
          return;
        }
        if (p.startsWith("رس")) {
          const a = +arToEn(p.replace("رس", ""));
          student.payments.push({
            paymentType: "fee",
            status: a == 3000 ? "paid" : "paid",
            term: "2nd",
            amountPaid: a,
            amountPending: 3000 - a,
            paidIn: "3rd",
          });
          return;
        }
        if (p.startsWith("ر")) {
          const a = +arToEn(p.replace("ر", ""));
          student.payments.push({
            paymentType: "fee",
            status: a == 3000 ? "paid" : "part paid",
            term: "3rd",
            amountPaid: a,
            amountPending: 3000 - a,
            paidIn: "3rd",
          });
          student.examStatus =
            a == 3000 ? examStatus.paid : examStatus.permitted;
          return;
        }
        switch (p) {
          case "ق":
            student.payments.push({
              paymentType: "entrance",
              status: "paid",
              term: "3rd",
              amountPaid: 1000,
              paidIn: "3rd",
            });
            return;
          case "ق*":
            student.payments.push({
              paymentType: "entrance",
              status: "pending",
              term: "3rd",
              amountPending: 1000,
              paidIn: "3rd",
            });
            return;
          case "*":
            student.examStatus = examStatus.noStatus;
            return;
        }
      });
      // if (
      //   student.examStatus != examStatus.noStatus &&
      //   !student.payments.find((a) => a.paymentType == "fee" && a.term == "3rd")
      // )
      //   student.payments.push({
      //     paymentType: "fee",
      //     paidIn: "3rd",
      //     amountPending: 3000,
      //     status: "pending",
      //     amountPaid: 0,
      //     term: "3rd",
      //   });

      cls.students.push(student);
    });
  if (cls) _classList.push(cls);
  return { result: _classList, term: "3rd" };
}
interface Term {
  term: "1st" | "2nd" | "3rd";
  result: Class[];
}
interface Class {
  className: string;
  students: Student[];
  code?;
  subjects: ReturnType<typeof getClassSubjectList>;
  subs?: Class["subjects"][number]["subs"];
  subsCount?;
}
export interface PaymentStatus {
  status: "paid" | "part paid" | "pending" | "not applicable";
  paymentType: "fee" | "entrance";
  amountPaid?: number;
  amountPending?: number;
  term: "1st" | "2nd" | "3rd";
  paidIn: "1st" | "2nd" | "3rd";
}
interface Student {
  studentId: number;
  studentClassId: number;
  firstName: string;
  surname?: string;
  otherName: string;
  //   fullName: string;
  payments: PaymentStatus[];
  gender: "M" | "F";
  examStatus;
  scores: string[];
  text: string;
  quranClass?: QuranClass;
}
export const quranClasses = ["ق:تج", "ق:ح", "ق:أ", "ق:م", "ق:ج"] as const;
type QuranClass = NonNullable<typeof quranClasses>[number];
let studentId = 0;
let studentClassId = 0;
export const examStatus = {
  permitted: "مس",
  paid: "مد",
  free: "م",
  noStatus: "x",
};
