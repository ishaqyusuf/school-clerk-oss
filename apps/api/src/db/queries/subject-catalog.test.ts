import { describe, expect, test } from "bun:test";
import {
  buildSubjectCatalogAssignmentWhere,
  buildSubjectCatalogWhere,
  countSubjectClassrooms,
} from "./subject-catalog";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { getSubjectCatalog } = await import("./subjects");

describe("subject catalog query", () => {
  test("scopes canonical subjects to the tenant and searches by title", () => {
    expect(
      buildSubjectCatalogWhere(
        {
          q: " mathematics ",
        },
        {
          schoolProfileId: "school-1",
          sessionTermId: "term-1",
        },
      ),
    ).toEqual({
      deletedAt: null,
      schoolProfileId: "school-1",
      title: {
        contains: "mathematics",
        mode: "insensitive",
      },
    });
  });

  test("restricts teacher catalogs to accessible active-term assignments", () => {
    expect(
      buildSubjectCatalogWhere(
        {},
        {
          accessibleDepartmentSubjectIds: ["assignment-1"],
          schoolProfileId: "school-1",
          sessionTermId: "term-1",
        },
      ),
    ).toEqual({
      deletedAt: null,
      departmentSubjects: {
        some: {
          classRoomDepartment: {
            deletedAt: null,
            schoolProfileId: "school-1",
          },
          deletedAt: null,
          id: {
            in: ["assignment-1"],
          },
          sessionTermId: "term-1",
        },
      },
      schoolProfileId: "school-1",
    });
  });

  test("counts each classroom once when duplicate assignments exist", () => {
    expect(
      countSubjectClassrooms([
        {
          classRoomDepartment: {
            classRoomsId: "classroom-1",
          },
        },
        {
          classRoomDepartment: {
            classRoomsId: "classroom-1",
          },
        },
        {
          classRoomDepartment: {
            classRoomsId: "classroom-2",
          },
        },
        {
          classRoomDepartment: null,
        },
      ]),
    ).toBe(2);
  });

  test("always scopes assignment counts to the active term and tenant", () => {
    expect(
      buildSubjectCatalogAssignmentWhere({
        schoolProfileId: "school-1",
        sessionTermId: "term-1",
      }),
    ).toEqual({
      classRoomDepartment: {
        deletedAt: null,
        schoolProfileId: "school-1",
      },
      deletedAt: null,
      sessionTermId: "term-1",
    });
  });

  test("rejects a catalog read without an active tenant", async () => {
    await expect(
      getSubjectCatalog(
        {
          db: {},
          profile: {
            termId: "term-1",
          },
        } as any,
        {} as any,
      ),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("rejects a catalog read without a requested or active term", async () => {
    await expect(
      getSubjectCatalog(
        {
          db: {},
          profile: {
            schoolId: "school-1",
          },
        } as any,
        {} as any,
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("rejects a signed-in account that does not belong to the tenant", async () => {
    await expect(
      getSubjectCatalog(
        {
          currentUser: {
            saasAccountId: "account-1",
          },
          db: {
            schoolProfile: {
              findFirst: async () => null,
            },
          },
          profile: {
            schoolId: "school-2",
            termId: "term-1",
          },
        } as any,
        {} as any,
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("paginates canonical subjects and counts canonical classes, not streams", async () => {
    let findManyArgs: any;
    let tenantWhere: any;
    const response = await getSubjectCatalog(
      {
        currentUser: {
          saasAccountId: "account-1",
        },
        db: {
          schoolProfile: {
            findFirst: async (args: any) => {
              tenantWhere = args.where;
              return {
                id: "school-1",
              };
            },
          },
          subject: {
            count: async () => 2,
            findMany: async (args: any) => {
              findManyArgs = args;
              return [
                {
                  id: "subject-1",
                  title: "Mathematics",
                  departmentSubjects: [
                    {
                      classRoomDepartment: {
                        classRoomsId: "classroom-1",
                      },
                    },
                    {
                      classRoomDepartment: {
                        classRoomsId: "classroom-1",
                      },
                    },
                    {
                      classRoomDepartment: {
                        classRoomsId: "classroom-2",
                      },
                    },
                  ],
                },
                {
                  id: "subject-2",
                  title: "Arabic",
                  departmentSubjects: [],
                },
              ];
            },
          },
        },
        profile: {
          schoolId: "school-1",
          termId: "term-1",
        },
      } as any,
      {
        cursor: "0",
        departmentId: "stale-classroom-filter",
        size: 10,
        sort: "title.asc",
      } as any,
    );

    expect(response).toEqual({
      data: [
        {
          classroomCount: 2,
          id: "subject-1",
          title: "Mathematics",
        },
        {
          classroomCount: 0,
          id: "subject-2",
          title: "Arabic",
        },
      ],
      meta: {
        count: 2,
        cursor: null,
        hasNextPage: false,
        hasPreviousePage: false,
      },
    });
    expect(tenantWhere).toEqual({
      accountId: "account-1",
      deletedAt: null,
      id: "school-1",
    });
    expect(findManyArgs).toMatchObject({
      orderBy: {
        title: "asc",
      },
      skip: 0,
      take: 10,
      where: {
        deletedAt: null,
        schoolProfileId: "school-1",
      },
    });
    expect(
      findManyArgs.select.departmentSubjects.where.classRoomDepartmentId,
    ).toBeUndefined();
    expect(findManyArgs.select.departmentSubjects.where.sessionTermId).toBe(
      "term-1",
    );
  });
});
