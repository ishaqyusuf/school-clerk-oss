"use server";

import { StudentRecord } from "@/app/dashboard/[domain]/migration/data";
import { getAuthCookie } from "./cookies/auth-cookie";
import { prisma } from "@school-clerk/db";
import { transaction } from "@/utils/db";
import { createStudent } from "./create-student";
import { createClassroom } from "./create-classroom";
import { setMonth, setYear } from "date-fns";
import { createSchoolFee } from "./create-school-fee";
import { createStudentFee } from "./create-student-fee";
import { createStudentFeePayment } from "./create-student-fee-payment";
import { getSchoolFees } from "./get-school-fees";
import { createStudentAcademicProfile } from "./create-student-academic-profile";
import { updateStudent } from "@/app/dashboard/[domain]/migration/server";

export async function importStudentAction(
  data: StudentRecord,
  _classRoom?: {
    departmentId: string;
  }
) {
  const postId = data.paymentData?.storePayments?.postId;
  const profile = await getAuthCookie();
  const prevTermId = profile?.termId;

  const rsp = await transaction(async (tx) => {
    const { session } = await getSession(tx);
    const terms = session.terms.filter(
      (t) =>
        // data.terms.some((d) => t?.title?.startsWith(d)),
        !!Object.entries(data.paymentData.storePayments.billables).find(
          ([a, b]) => t.title?.startsWith(a) && !b.omit
        )
    );

    // await switchSessionTerm(terms?.[0]?.id, tx, false);

    let student;
    const classRoom = await createClassroom(
      {
        className: data?.classRoom,
        departments: [],
      },
      tx
    );

    const [name, surname, otherName] = data?.fullName
      ?.replaceAll("-", "")
      .split("_");

    student = await createStudent(
      {
        classRoomId: classRoom?.classRoomDepartments?.[0]?.id,
        name,
        surname,
        otherName,
        gender: data.gender as any,
        termForms: terms.map((t) => ({
          schoolSessionId: session.id,
          sessionTermId: t.id,
        })),
      },
      tx
    );

    const studentTermForms = await tx.studentTermForm.findMany({
      where: {
        studentId: student.id,
        schoolSessionId: session.id,
      },
      select: {
        id: true,
        sessionTermId: true,
      },
    });
    for (const term of terms) {
      // await switchSessionTerm(term.id, tx, false);
      const payments = data.payments
        ?.filter((p) => term?.title?.startsWith(p?.term))
        .filter((p) => p.paymentType == "entrance");
      const studenForm = studentTermForms?.find(
        (f) => f.sessionTermId == term.id
      );

      for (const payment of payments) {
        if (!payment.amountPaid) return;
        const paidIn = terms?.find((t) => t.title?.startsWith(payment.paidIn));
        await createFee(
          {
            amount: 1000,
            paidAmount: payment.amountPaid,
            payments: [],
            title: "Admission Fee",
            studentId: student.id,
            // paymentTermId: paidIn?.id,
            studentTermId: studenForm?.id,
          },
          tx
        );
      }
      // fees
      for (const [termName, pData] of Object.entries(
        data.paymentData.storePayments?.billables
      )) {
        if (term?.title?.startsWith(termName)) {
          if (pData?.free || pData?.omit) {
            continue;
          }
          const payments = [
            ...data.payments.filter(
              (p) =>
                p.paymentType == "fee" && termName == p.term && p.amountPaid
            ),
            ...(data.paymentData.storePayments?.payments?.filter(
              (p) =>
                p.paymentType == "fee" && termName == p.term && p.amountPaid
            ) || []),
          ];

          await createFee(
            {
              amount: 3000,
              title: "Term Fee",
              studentId: student.id,
              // paymentTermId: paidIn?.id,
              studentTermId: studenForm?.id,
              term: termName,
              payments: payments.map((payment) => {
                const paidIn = terms?.find((t) =>
                  t.title?.startsWith(payment.paidIn)
                );

                return {
                  termId: paidIn?.id,
                  amount: payment.amountPaid,
                };
              }),
            },
            tx
          );
        }
      }
    }

    // await resetProfile(tx, false);
    if (_classRoom?.departmentId) {
      const pr = await getAuthCookie();
      await createStudentAcademicProfile(
        {
          classroomDepartmentId: _classRoom.departmentId,
          studentId: student.id,
          termIds: [
            {
              sessionTermId: pr.termId,
              schoolSessionId: pr.sessionId,
            },
          ],
        },
        tx
      );
    }
    console.log("THROWING>>");
    // throw new Error("break on purpose");
    let post = data.paymentData?.storePayments;
    if (!post) post = {} as any;
    const { postId, ...postData } = post;
    postData.studentId = student.id;
    await updateStudent(postId, data.classRoom, data.fullName, postData);

    return {
      studentId: student.id,
      postData: {
        ...postData,
        postId,
      },
    };
  }, 30000);
  // await resetProfile(prisma, false);
  return rsp;
}
async function createFee(
  props: CreateFeeProps,
  tx: typeof prisma,
  retries = 0
) {
  // return;
  const profile = await getAuthCookie();
  const { termId } = profile;

  const fees = await getSchoolFees(
    {
      termId: profile.termId,
      title: props.title,
    },
    tx
  );
  const fee = fees?.data?.[0];

  if (retries > 2) throw new Error("Cannot create");
  const history = fee?.feeHistory?.[0];

  if (!fee || !history) {
    const f = await createSchoolFee(
      {
        title: props.title,
        amount: props.amount,
        description: props.description,
      },
      tx
    );

    return createFee(props, tx, ++retries);
  }

  const studentFee = await createStudentFee(
    {
      amount: history.amount,
      feeId: history.id,
      studentId: props.studentId,
      paid: props.paidAmount,
      studentTermId: props.studentTermId,
      title: fee.title,
    },
    tx
  );

  if (props.payments?.length > 0) {
    for (const payment of props.payments) {
      if (payment.termId && termId != payment.termId) {
        // await switchSessionTerm(payment.termId, tx, false);
      }

      await createStudentFeePayment(
        {
          amount: payment.amount,
          paymentType: studentFee.feeTitle,
          studentFeeId: studentFee.id,
          termFormId: props.studentTermId,
        },
        tx
      );
      console.log("PAYMENT APPLIED");
      // if (termId != payment.termId) await switchSessionTerm(termId, tx, false);
    }
  } else {
    console.log("NO PAYMENT");
  }
}
async function getSession(tx: typeof prisma) {
  const profile = await getAuthCookie();
  let session = await tx.schoolSession.findFirst({
    where: {
      title: `1445/1446`,
      schoolId: profile?.schoolId,
    },
    select: {
      title: true,
      id: true,
      terms: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  if (!session)
    session = await tx.schoolSession.create({
      data: {
        title: `1445/1446`,
        schoolId: profile?.schoolId,
        createdAt: setMonth(setYear(new Date(), 2024), 4),
        terms: {
          createMany: {
            data: ["1st", "2nd", "3rd"].map((t, i) => ({
              schoolId: profile?.schoolId,
              title: `${t} term`,
              createdAt: setMonth(
                setYear(new Date(), 2024),
                i == 0 ? 4 : i == 1 ? 8 : 12
              ),
              startDate: setMonth(
                setYear(new Date(), 2024),
                i == 0 ? 4 : i == 1 ? 8 : 12
              ),
              endDate: setMonth(
                setYear(new Date(), i == 2 ? 2025 : 2024),
                i == 0 ? 7 : i == 1 ? 12 : 2
              ),
            })),
          },
        },
      },
      select: {
        title: true,
        id: true,
        terms: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

  return {
    session,
  };
}
interface CreateFeeProps {
  title: "Admission Fee" | "Term Fee";
  description?: string;
  term?: string;
  amount: number;
  studentId?: string;
  paymentTermId?: string;
  studentTermId?: string;
  paidAmount?;
  payments: {
    termId: string;
    amount: number;
  }[];
}
