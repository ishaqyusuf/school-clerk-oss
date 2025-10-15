"use server";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { createSchoolFee } from "@/actions/create-school-fee";
import { createStudentAcademicProfile } from "@/actions/create-student-academic-profile";
import { createStudentFee } from "@/actions/create-student-fee";
import { transaction } from "@/utils/db";
import { prisma } from "@school-clerk/db";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

export async function loadStudentPayments() {
  return unstable_cache(
    async () => {
      const data = await prisma.posts.findMany({
        where: {
          name: "student-migrate-data",
        },
        select: {
          id: true,
          data: true,
        },
      });
      const transformed = {};
      data.map((item) => {
        const {
          className,
          studentName,
          billables,
          payments,
          departmentId,
          studentId,
          ...rest
        } = (item.data as any) || {};
        if (!transformed[className]) transformed[className] = {};
        transformed[className][studentName] = {
          payments,
          billables,
          studentName,
          postId: item.id,
          departmentId,
          studentId,
          ...rest,
        };
      });
      return transformed;
    },
    ["student-migrate-data"],
    {
      tags: ["student-migrate-data"],
    }
  )();
}
export async function updateStudent(id, className, studentName, data) {
  if (id) {
    await prisma.posts.update({
      where: {
        id,
      },
      data: {
        data: {
          ...data,
          className,
          studentName,
        },
      },
    });
  } else {
    const p = await prisma.posts.create({
      data: {
        name: "student-migrate-data",
        data: {
          ...data,
          className,
          studentName,
        },
      },
    });
    id = p.id;
  }
  // revalidateTag("student-migrate-data");
  return id;
}
export async function loadGenders() {
  return unstable_cache(
    async () => {
      const data = await prisma.posts.findFirst({
        where: {
          name: "student-genders",
        },
        select: {
          id: true,
          data: true,
        },
      });
      return data.data as any;
    },
    ["student-genders"],
    {
      tags: ["student-genders"],
    }
  )();
}
export async function loadStudentMergeData() {
  return unstable_cache(
    async () => {
      const data = await prisma.posts.findFirst({
        where: {
          name: "student-merge-data",
        },
        select: {
          id: true,
          data: true,
        },
      });
      return data.data as any;
    },
    ["student-merge-data"],
    {
      tags: ["student-merge-data"],
    }
  )();
}
export async function updateGenderData(data) {
  await prisma.posts.updateMany({
    where: {
      name: "student-genders",
    },
    data: {
      data,
    },
  });
  // revalidateTag("student-genders");
}
export async function dumpData(gender, studentData, studentMergeData) {
  return transaction(async (tx) => {
    await tx.posts.deleteMany({
      where: {
        name: {
          in: ["student-genders", "student-merge-data", "student-migrate-data"],
        },
      },
    });
    await tx.posts.create({
      data: {
        name: "student-genders",
        data: gender,
      },
    });
    await tx.posts.create({
      data: {
        name: "student-merge-data",
        data: studentMergeData,
      },
    });
    await Promise.all(
      studentData?.map(async (d) => {
        await tx.posts.create({
          data: {
            name: "student-migrate-data",
            data: d,
          },
        });
      })
    );
  });
}
export async function setStudentClassroomAction(
  data,
  departmentId,
  prevDepartmentId?,
  feeId?
) {
  return await transaction(async (tx) => {
    let post = data?.paymentData?.storePayments;
    const pr = await getAuthCookie();
    const profile = await createStudentAcademicProfile(
      {
        classroomDepartmentId: departmentId,
        studentId: post.studentId,
        termIds: [
          {
            sessionTermId: pr.termId,
            schoolSessionId: pr.sessionId,
          },
        ],
      },
      tx
    );
    const termFrom = profile.sessionForms
      .filter((a) => a.schoolSessionId == pr.sessionId)
      .map((f) => {
        return f.termForms.find((tf) => tf.sessionTermId == pr.termId);
      })?.[0];
    const fee = await tx.feeHistory.findFirst({
      where: {
        id: feeId,
      },
      select: {
        id: true,
        amount: true,
        fee: {
          select: {
            title: true,
          },
        },
      },
    });
    if (fee) {
      const studentFee = await createStudentFee(
        {
          amount: fee.amount,
          feeId: fee.id,
          studentId: post.studentId,
          paid: 0,
          studentTermId: termFrom.id,
          title: fee.fee.title,
        },
        tx
      );
      console.log(studentFee, fee);
    }
    // if (!post) post = {} as any;
    const { postId, ...postData } = post;
    postData.departmentId = departmentId;

    // postData.studentId = student.id;
    await updateStudent(postId, data.classRoom, data.fullName, postData);
    return {
      postData: {
        ...postData,
        postId,
      },
    };
  });
}
