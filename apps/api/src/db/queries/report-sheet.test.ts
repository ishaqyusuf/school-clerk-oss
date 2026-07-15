import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { getClassroomReportSheet } = await import("./report-sheet");

function createTeacherReportCtx() {
  const departments = [
    { id: "science", classRoomsId: "class-1" },
    { id: "art", classRoomsId: "class-1" },
  ];
  const departmentSubjects = [
    {
      id: "science-math",
      classRoomDepartmentId: "science",
      subjectId: "math",
      title: "Mathematics",
    },
    {
      id: "art-english",
      classRoomDepartmentId: "art",
      subjectId: "english",
      title: "English",
    },
  ];
  const capturedFindUniqueArgs: any[] = [];

  const ctx = {
    profile: {
      authSessionId: "session-1",
      schoolId: "school-1",
      sessionId: "session-1",
      termId: "term-1",
    },
    db: {
      session: {
        findFirst: async () => ({
          user: {
            email: "teacher@school.test",
            id: "user-1",
            name: "Teacher One",
            role: "Teacher",
          },
        }),
      },
      schoolProfile: {
        findFirst: async () => ({
          accountId: "account-1",
          id: "school-1",
          name: "School",
          subDomain: "school",
        }),
      },
      staffProfile: {
        findFirst: async () => ({ id: "staff-1" }),
      },
      staffTermProfile: {
        findFirst: async () => ({
          id: "staff-term-1",
          academicAccessGrants: [
            {
              scope: "CLASS_SUBJECT",
              classRoomId: "class-1",
              subjectId: "math",
            },
          ],
          classroomsProfiles: [],
        }),
      },
      staffSubject: {
        findMany: async () => [],
      },
      classRoomDepartment: {
        findMany: async (query: any) => {
          const classIds = query.where.classRoomsId?.in as string[] | undefined;
          const ids = query.where.id?.in as string[] | undefined;
          return departments
            .filter((department) => (ids ? ids.includes(department.id) : true))
            .filter((department) =>
              classIds ? classIds.includes(department.classRoomsId) : true,
            )
            .map((department) => ({ id: department.id }));
        },
        findUniqueOrThrow: async (query: any) => {
          capturedFindUniqueArgs.push(query);
          const allowedSubjectIds = query.select.subjects.where.id?.in as
            | string[]
            | undefined;
          return {
            departmentName: "Science",
            subjects: departmentSubjects
              .filter(
                (subject) =>
                  subject.classRoomDepartmentId === query.where.id &&
                  (!allowedSubjectIds || allowedSubjectIds.includes(subject.id)),
              )
              .map((subject) => ({
                id: subject.id,
                assessments: [],
                subject: { title: subject.title },
              })),
            studentTermForms: [],
          };
        },
      },
      departmentSubject: {
        findMany: async (query: any) => {
          const classSubjectFilters = query.where.OR as
            | Array<{
                subjectId: string;
                classRoomDepartment: { classRoomsId: string };
              }>
            | undefined;

          return departmentSubjects
            .filter((subject) => {
              if (!classSubjectFilters?.length) return true;
              return classSubjectFilters.some((filter) => {
                const department = departments.find(
                  (item) => item.id === subject.classRoomDepartmentId,
                );
                return (
                  subject.subjectId === filter.subjectId &&
                  department?.classRoomsId ===
                    filter.classRoomDepartment.classRoomsId
                );
              });
            })
            .map((subject) => ({
              id: subject.id,
              classRoomDepartmentId: subject.classRoomDepartmentId,
            }));
        },
      },
    },
  };

  return {
    ctx: ctx as any,
    capturedFindUniqueArgs,
  };
}

describe("getClassroomReportSheet teacher access", () => {
  test("filters report subjects to the teacher's effective broad-scope subjects", async () => {
    const { ctx, capturedFindUniqueArgs } = createTeacherReportCtx();

    const report = await getClassroomReportSheet(ctx, {
      departmentId: "science",
      sessionTermId: "term-1",
    });

    expect(report.subjects.map((subject: any) => subject.id)).toEqual([
      "science-math",
    ]);
    expect(
      capturedFindUniqueArgs[0].select.subjects.where.id.in,
    ).toEqual(["science-math"]);
    expect(capturedFindUniqueArgs[0].select.subjects.select.assessments.orderBy)
      .toEqual([{ index: "asc" }, { id: "asc" }]);
    expect(
      capturedFindUniqueArgs[0].select.subjects.select.assessments.select
        .parentAssessment.select,
    ).toMatchObject({
      id: true,
      title: true,
      index: true,
      printMode: true,
    });
  });

  test("rejects report sheets outside the teacher's effective classroom scope", async () => {
    const { ctx } = createTeacherReportCtx();

    try {
      await getClassroomReportSheet(ctx, {
        departmentId: "art",
        sessionTermId: "term-1",
      });
      throw new Error("Expected report sheet access to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
      expect((error as TRPCError).message).toBe(
        "This classroom is not assigned to your teacher profile.",
      );
    }
  });
});
