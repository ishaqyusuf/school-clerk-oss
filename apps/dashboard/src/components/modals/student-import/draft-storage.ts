export const STUDENT_IMPORT_DRAFT_STORAGE_KEY = "student-import-draft-v1";
export const LEGACY_STUDENT_IMPORT_RAW_STORAGE_KEY = "student-import-data";

export type StudentImportDraftAction =
  | "import_new"
  | "keep_match"
  | "update_match_with_name"
  | "skip";

export type StudentImportDraftNamePart = "name" | "surname" | "otherName";

export type StudentImportDraftNameTokenSpan = {
  start: number;
  end: number;
};

export type StudentImportDraftNameOverride = {
  name?: string;
  surname?: string;
  otherName?: string | null;
  lockedSpans?: Partial<
    Record<StudentImportDraftNamePart, StudentImportDraftNameTokenSpan>
  >;
};

export type StudentImportDraftRowDecision = {
  action?: StudentImportDraftAction;
  existingStudentId?: string | null;
  touched?: boolean;
};

export type StudentImportReviewDraft = {
  sourceRaw: string;
  classroomDeptId?: string;
  activeClassroomFilterId?: string;
  rowDecisions?: Record<number, StudentImportDraftRowDecision>;
  manualGenders?: Record<number, "Male" | "Female">;
  manualClassroomDepartmentIds?: Record<number, string>;
  checkedRows?: Record<number, boolean>;
  nameOverrides?: Record<number, StudentImportDraftNameOverride>;
  manualMatchStudentIds?: Record<number, string>;
};

export type StudentImportDraft = {
  version: 1;
  setup: {
    classRoomId: string;
    globalGender: "Male" | "Female" | "unset" | "";
    raw: string;
    tab: "main" | "importing";
    importPhase: "review" | "import";
  };
  review: StudentImportReviewDraft | null;
};

export function createEmptyStudentImportDraft(
  raw = "",
): StudentImportDraft {
  return {
    version: 1,
    setup: {
      classRoomId: "",
      globalGender: "unset",
      raw,
      tab: "main",
      importPhase: "review",
    },
    review: null,
  };
}

export function normalizeStudentImportDraft(
  draft: StudentImportDraft | null | undefined,
  fallbackRaw = "",
): StudentImportDraft {
  if (!draft || draft.version !== 1) {
    return createEmptyStudentImportDraft(fallbackRaw);
  }

  return {
    version: 1,
    setup: {
      classRoomId: draft.setup?.classRoomId || "",
      globalGender:
        draft.setup?.globalGender === "Male" ||
        draft.setup?.globalGender === "Female" ||
        draft.setup?.globalGender === "unset" ||
        draft.setup?.globalGender === ""
          ? draft.setup.globalGender
          : "unset",
      raw: draft.setup?.raw ?? fallbackRaw,
      tab: draft.setup?.tab === "importing" ? "importing" : "main",
      importPhase: draft.setup?.importPhase === "import" ? "import" : "review",
    },
    review: draft.review ?? null,
  };
}
