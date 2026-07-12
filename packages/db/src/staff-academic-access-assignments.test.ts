import { describe, expect, test } from "bun:test";
import {
  assertStaffAcademicAssignmentReferences,
  buildStaffAcademicAccessPersistence,
  collectStaffAcademicAssignmentReferenceIds,
  mapStaffAcademicAccessGrantsToAssignments,
  normalizeStaffAcademicAssignments,
} from "./staff-academic-access-assignments";

describe("staff academic access assignment helpers", () => {
  test("normalizes assignments and dedupes selected department subjects", () => {
    const assignments = normalizeStaffAcademicAssignments([
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: " department-1 ",
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: ["subject-1", "subject-1", " subject-2 "],
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: ["subject-2"],
      },
    ]);

    expect(assignments).toEqual([
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: ["subject-1", "subject-2"],
      },
    ]);
  });

  test("collects unique reference ids for save ancestry validation", () => {
    const assignments = normalizeStaffAcademicAssignments([
      {
        scope: "CLASS",
        classRoomId: "class-1",
      },
      {
        scope: "CLASS_SUBJECT",
        classRoomId: "class-1",
        subjectId: "subject-1",
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        departmentSubjectIds: ["department-subject-1", "department-subject-1"],
      },
    ]);

    expect(collectStaffAcademicAssignmentReferenceIds(assignments)).toEqual({
      classRoomIds: ["class-1"],
      classRoomDepartmentIds: ["department-1"],
      subjectIds: ["subject-1"],
      departmentSubjectIds: ["department-subject-1"],
    });
  });

  test("builds grant and legacy persistence payloads for each supported scope", () => {
    const assignments = normalizeStaffAcademicAssignments([
      {
        scope: "CLASS",
        classRoomId: "class-1",
      },
      {
        scope: "CLASS_SUBJECT",
        classRoomId: "class-1",
        subjectId: "subject-1",
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        subjectAccessMode: "ALL",
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-2",
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: ["department-subject-1", "department-subject-2"],
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        classRoomDepartmentId: "department-3",
        departmentSubjectId: "department-subject-3",
      },
    ]);

    const persistence = buildStaffAcademicAccessPersistence({
      assignments,
      staffTermProfileId: "staff-term-1",
    });

    expect(persistence.legacyClassroomAssignments).toEqual([
      {
        staffTermProfileId: "staff-term-1",
        classRoomDepartmentId: "department-1",
        subjectAccessMode: "ALL",
      },
      {
        staffTermProfileId: "staff-term-1",
        classRoomDepartmentId: "department-2",
        subjectAccessMode: "SELECTED",
      },
    ]);
    expect(persistence.academicAccessGrants).toEqual([
      {
        scope: "CLASS",
        staffTermProfileId: "staff-term-1",
        classRoomId: "class-1",
      },
      {
        scope: "CLASS_SUBJECT",
        staffTermProfileId: "staff-term-1",
        classRoomId: "class-1",
        subjectId: "subject-1",
      },
      {
        scope: "DEPARTMENT",
        staffTermProfileId: "staff-term-1",
        classRoomDepartmentId: "department-1",
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        staffTermProfileId: "staff-term-1",
        classRoomDepartmentId: "department-2",
        departmentSubjectId: "department-subject-1",
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        staffTermProfileId: "staff-term-1",
        classRoomDepartmentId: "department-2",
        departmentSubjectId: "department-subject-2",
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        staffTermProfileId: "staff-term-1",
        classRoomDepartmentId: "department-3",
        departmentSubjectId: "department-subject-3",
      },
    ]);
    expect(persistence.selectedDepartmentSubjectIds).toEqual([
      "department-subject-1",
      "department-subject-2",
      "department-subject-3",
    ]);
  });

  test("maps grant rows back to staff form assignments", () => {
    const assignments = mapStaffAcademicAccessGrantsToAssignments([
      {
        scope: "CLASS",
        classRoomId: "class-1",
      },
      {
        scope: "CLASS_SUBJECT",
        classRoomId: "class-1",
        subjectId: "subject-1",
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        classRoomDepartmentId: "department-2",
        departmentSubjectId: "department-subject-1",
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        departmentSubjectId: "department-subject-2",
        departmentSubject: {
          classRoomDepartmentId: "department-2",
        },
      },
    ]);

    expect(assignments).toEqual([
      {
        scope: "CLASS",
        classRoomId: "class-1",
        subjectAccessMode: "ALL",
        departmentSubjectIds: [],
      },
      {
        scope: "CLASS_SUBJECT",
        classRoomId: "class-1",
        subjectId: "subject-1",
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: [],
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        subjectAccessMode: "ALL",
        departmentSubjectIds: [],
      },
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-2",
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: ["department-subject-1", "department-subject-2"],
      },
    ]);
  });

  test("ignores incomplete grant rows when mapping form assignments", () => {
    const assignments = mapStaffAcademicAccessGrantsToAssignments([
      {
        scope: "CLASS",
        classRoomId: null,
      },
      {
        scope: "CLASS_SUBJECT",
        classRoomId: "class-1",
        subjectId: null,
      },
      {
        scope: "DEPARTMENT_SUBJECT",
        departmentSubjectId: "department-subject-1",
      },
    ]);

    expect(assignments).toEqual([]);
  });

  test("rejects assignments with stale class references", () => {
    const assignments = normalizeStaffAcademicAssignments([
      {
        scope: "CLASS",
        classRoomId: "stale-class",
      },
    ]);

    expect(() =>
      assertStaffAcademicAssignmentReferences({
        assignments,
        validClassIds: [],
        validClassRoomDepartmentIds: [],
        validSubjectIds: [],
        validDepartmentSubjects: [],
      }),
    ).toThrow("One or more selected classes are no longer valid.");
  });

  test("rejects assignments with stale department subject references", () => {
    const assignments = normalizeStaffAcademicAssignments([
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        departmentSubjectIds: ["stale-subject"],
      },
    ]);

    expect(() =>
      assertStaffAcademicAssignmentReferences({
        assignments,
        validClassIds: [],
        validClassRoomDepartmentIds: [{ id: "department-1" }],
        validSubjectIds: [],
        validDepartmentSubjects: [],
      }),
    ).toThrow("One or more selected department subjects are no longer valid.");
  });

  test("rejects selected subjects outside the selected department", () => {
    const assignments = normalizeStaffAcademicAssignments([
      {
        scope: "DEPARTMENT",
        classRoomDepartmentId: "department-1",
        departmentSubjectIds: ["department-2-subject"],
      },
    ]);

    expect(() =>
      assertStaffAcademicAssignmentReferences({
        assignments,
        validClassIds: [],
        validClassRoomDepartmentIds: [{ id: "department-1" }],
        validSubjectIds: [],
        validDepartmentSubjects: [
          {
            id: "department-2-subject",
            classRoomDepartmentId: "department-2",
          },
        ],
      }),
    ).toThrow("Subjects must belong to the selected department assignment.");
  });
});
