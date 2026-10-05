"use server";

import { requireLegacyMigrationAccess } from "@/lib/legacy-migration-access";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { createSchoolFee } from "@/actions/create-school-fee";
import { createStudentAcademicProfile } from "@/actions/create-student-academic-profile";
import { transaction } from "@/utils/db";
import { prisma } from "@school-clerk/db";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

export async function loadStudentPayments() {
  await requireLegacyMigrationAccess();
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
  await requireLegacyMigrationAccess();
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
  await requireLegacyMigrationAccess();
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
  await requireLegacyMigrationAccess();
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
  await requireLegacyMigrationAccess();
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
  await requireLegacyMigrationAccess();
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
  await requireLegacyMigrationAccess();
  return await transaction(async (tx) => {
    let post = data?.paymentData?.storePayments;
    const pr = await getAuthCookie();
    await createStudentAcademicProfile(
      {
        classroomDepartmentId: departmentId,
        studentId: post.studentId,
        admissionType: "UNCLASSIFIED",
        termIds: [
          {
            sessionTermId: pr.termId,
            schoolSessionId: pr.sessionId,
          },
        ],
      },
      tx
    );
    void feeId;
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
