import { useZodForm } from "@/hooks/use-zod-form";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Tabs } from "@school-clerk/ui/composite";
import { useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { ImportActivity } from "./import-activities";
import { useTRPC } from "@/trpc/client";
import { STUDENT_IMPORT_PREVIEW_ROW_LIMIT } from "@school-clerk/utils/student-import-schema";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { parseRawInput } from "./parser";
import {
  createEmptyStudentImportDraft,
  LEGACY_STUDENT_IMPORT_RAW_STORAGE_KEY,
  normalizeStudentImportDraft,
  STUDENT_IMPORT_DRAFT_STORAGE_KEY,
  type StudentImportDraft,
  type StudentImportReviewDraft,
} from "./draft-storage";

import { StudentImportSetupForm, studentImportSchema } from "./setup-form";

export function StudentImportModal() {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const [, setParams] = useQueryStates({
    action: parseAsString,
  });
  const [legacyRaw, setLegacyRaw] = useLocalStorage(
    LEGACY_STUDENT_IMPORT_RAW_STORAGE_KEY,
    "",
  );
  const [storedDraft, setStoredDraft] = useLocalStorage<StudentImportDraft>(
    STUDENT_IMPORT_DRAFT_STORAGE_KEY,
    createEmptyStudentImportDraft(legacyRaw),
  );
  const draft = useMemo(
    () => normalizeStudentImportDraft(storedDraft, legacyRaw),
    [legacyRaw, storedDraft],
  );
  const open = searchParams.get("action") === "student-import";

  const referenceQuery = useQuery(trpc.students.getStudentImportReference.queryOptions(undefined, {
    enabled: open, retry: false, staleTime: 0, refetchOnMount: "always",
  }));
  const reference = referenceQuery.isError ? undefined : referenceQuery.data;
  const classList = useMemo(() => reference ? { data: reference.classDepartments } : undefined, [reference]);
  const importNameGuide = reference;
  const isClassListLoading = referenceQuery.isPending;
  const refetchClassList = referenceQuery.refetch;

  const form = useZodForm(studentImportSchema, {
    defaultValues: {
      classRoomId: draft.setup.classRoomId,
      globalGender: draft.setup.globalGender,
      raw: draft.setup.raw,
    },
  });

  const [tab, setTab] = useState(draft.setup.tab);
  const [importPhase, setImportPhase] = useState<"review" | "import">(
    draft.setup.importPhase,
  );
  const onSubmit = () => {
    if (!canStartAnalysis) return;
    setImportPhase("review");
    setTab("importing");
  };
  const clearDraft = () => {
    const emptyDraft = createEmptyStudentImportDraft("");

    setStoredDraft(emptyDraft);
    setLegacyRaw("");
    form.setValue("classRoomId", emptyDraft.setup.classRoomId);
    form.setValue("globalGender", emptyDraft.setup.globalGender);
    form.setValue("raw", emptyDraft.setup.raw, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };
  const startNewImport = () => {
    clearDraft();
    setImportPhase("review");
    setTab("main");
  };
  const closeImport = () => {
    setImportPhase("review");
    setTab("main");
    setParams(null);
  };

  const raw = form.watch("raw");
  const classRoomId = form.watch("classRoomId");
  const globalGender = form.watch("globalGender");

  const parse = useMemo(() => {
    const selectedDept = classList?.data?.find((d) => d.id === classRoomId);
    const classRoomName = selectedDept
      ? selectedDept.classRoom
        ? `${selectedDept.classRoom.name} - ${selectedDept.departmentName}`
        : selectedDept.departmentName
      : "";
    return parseRawInput(
      raw,
      classRoomName,
      classRoomId || "",
      globalGender,
      importNameGuide?.names || [],
      classList?.data || [],
    );
  }, [raw, classRoomId, classList?.data, globalGender, importNameGuide?.names]);
  const warningCount = parse?.warnings?.length || 0;
  const parsedStudentCount = parse?.students?.length || 0;
  const rawLineCount = useMemo(
    () => raw.split(/\r?\n/).filter((line) => line.trim()).length,
    [raw],
  );
  const setupFixCount = new Set(parse.warnings.map((warning) => warning.lineNumber)).size +
    (raw.trim() && parsedStudentCount === 0 && warningCount === 0 ? 1 : 0);
  const isReferenceLoading = referenceQuery.isPending;
  const referenceError = referenceQuery.isError
    ? referenceQuery.error.message || "Import references are unavailable. Retry before reviewing."
    : parsedStudentCount > STUDENT_IMPORT_PREVIEW_ROW_LIMIT
      ? `Review at most ${STUDENT_IMPORT_PREVIEW_ROW_LIMIT} students per batch. Split the pasted list before continuing.`
      : null;
  const canStartAnalysis =
    Boolean(raw?.trim()) && !isReferenceLoading && !referenceError && parsedStudentCount > 0;
  const workflowPhase =
    tab === "main"
      ? ("setup" as const)
      : importPhase === "import"
        ? "import"
        : "review";

  useEffect(() => {
    setLegacyRaw(raw);
    setStoredDraft((current) => {
      const normalized = normalizeStudentImportDraft(current, legacyRaw);
      const nextSetup: StudentImportDraft["setup"] = {
        classRoomId: classRoomId || "",
        globalGender:
          globalGender === "Male" ||
          globalGender === "Female" ||
          globalGender === "unset" ||
          globalGender === ""
            ? globalGender
            : "unset",
        raw,
        tab: tab === "importing" ? "importing" : "main",
        importPhase,
        admissionType: normalized.setup.admissionType,
      };

      if (
        normalized.setup.classRoomId === nextSetup.classRoomId &&
        normalized.setup.globalGender === nextSetup.globalGender &&
        normalized.setup.raw === nextSetup.raw &&
        normalized.setup.tab === nextSetup.tab &&
        normalized.setup.importPhase === nextSetup.importPhase &&
        normalized.setup.admissionType === nextSetup.admissionType
      ) {
        return current;
      }

      return {
        ...normalized,
        setup: nextSetup,
      };
    });
  }, [
    classRoomId,
    globalGender,
    importPhase,
    legacyRaw,
    raw,
    setLegacyRaw,
    setStoredDraft,
    tab,
  ]);

  const updateReviewDraft = (review: StudentImportReviewDraft | null) => {
    setStoredDraft((current) => {
      const normalized = normalizeStudentImportDraft(current, legacyRaw);

      if (normalized.review === review) {
        return current;
      }

      return {
        ...normalized,
        review,
      };
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        setParams(null);
      }}
    >
      <Dialog.Content className="flex h-dvh max-h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[88vh] sm:max-h-[88vh] sm:w-[96vw] sm:max-w-5xl sm:rounded-lg sm:border lg:max-w-6xl xl:max-w-7xl">
        <Dialog.Header className="shrink-0 border-b px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Dialog.Title className="text-base leading-tight font-semibold">
                Import Students
              </Dialog.Title>
              <Dialog.Description className="hidden max-w-[18rem] text-[11px] leading-4 text-muted-foreground sm:block sm:max-w-none sm:text-xs">
                Paste names, review the rows that need decisions, then import
                the checked rows.
              </Dialog.Description>
            </div>
            <Badge
              variant="outline"
              className="hidden shrink-0 bg-background sm:inline-flex"
            >
              {workflowPhase === "setup"
                ? "Setup"
                : workflowPhase === "review"
                  ? "Review"
                  : "Import"}
            </Badge>
          </div>
        </Dialog.Header>
        <Tabs.Root value={tab} className="flex min-h-0 flex-1 flex-col">
          <Tabs.Content
            value="main"
            className="m-0 flex min-h-0 flex-1 flex-col"
          >
            <StudentImportSetupForm
              form={form}
              classList={classList}
              isClassListLoading={isClassListLoading}
              isReferenceLoading={isReferenceLoading}
              referenceError={referenceError}
              onRetryReferences={() => { refetchClassList(); }}
              parse={parse}
              parsedStudentCount={parsedStudentCount}
              rawLineCount={rawLineCount}
              setupFixCount={setupFixCount}
              canStartAnalysis={canStartAnalysis}
              onSubmit={onSubmit}
              closeImport={closeImport}
            />
          </Tabs.Content>
          <Tabs.Content
            value="importing"
            className="m-0 min-h-0 flex-1 overflow-hidden px-3 py-2 sm:px-6 sm:py-4"
          >
            {tab === "importing" && raw.trim() && (isReferenceLoading || referenceError) ? (
              <div className="flex h-full min-w-0 flex-col items-center justify-center gap-3 p-4 text-center">
                <p role={referenceError ? "alert" : "status"} className="text-sm text-muted-foreground">
                  {referenceError || "Loading classroom and name guidance for your saved import…"}
                </p>
                {referenceError ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => { refetchClassList(); }}>
                    Retry reference data
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" className="min-h-11" onClick={() => setTab("main")}>
                  Back to setup
                </Button>
              </div>
            ) : tab === "importing" ? (
              <ImportActivity
                classrooms={
                  classList?.data?.map((c) => ({ title: c.departmentName })) ||
                  []
                }
                students={parse?.students || []}
                savedDraft={
                  draft.review?.sourceRaw === raw ? draft.review : null
                }
                isActive={open && tab === "importing"}
                sourceRaw={raw}
                onCancelImport={() => {
                  setImportPhase("review");
                  setTab("main");
                }}
                onClearDraft={clearDraft}
                onStartNewImport={startNewImport}
                onCloseImport={closeImport}
                onPhaseChange={setImportPhase}
                onDraftChange={updateReviewDraft}
              />
            ) : null}
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
