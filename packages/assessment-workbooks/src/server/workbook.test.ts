import { describe, expect, test } from "bun:test";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import {
  generateAssessmentWorkbook,
  parseAssessmentWorkbook,
} from "./workbook";

const signingKey = "assessment-workbook-test-signing-key";

const workbookInput = {
  exportId: "export-1",
  tenantId: "school-1",
  termId: "term-1",
  termLabel: "First Term",
  classroomId: "classroom-1",
  classroomLabel: "Second Preparatory",
  direction: "rtl" as const,
  generatedAt: "2026-07-18T12:00:00.000Z",
  students: [
    {
      studentId: "student-1",
      studentTermFormId: "term-form-1",
      displayName: "حمزة محمد",
      gender: "Male" as const,
    },
    {
      studentId: "student-2",
      studentTermFormId: "term-form-2",
      displayName: "عبد العظيم",
      gender: "Male" as const,
    },
    {
      studentId: "student-3",
      studentTermFormId: "term-form-3",
      displayName: "حسينة محمد",
      gender: "Female" as const,
    },
  ],
  columns: [
    {
      key: "quran-review",
      departmentSubjectId: "subject-1",
      subjectTitle: "القرآن",
      assessmentId: 101,
      assessmentTitle: "المراجعة",
      obtainable: 20,
      originalScores: {
        "term-form-1": 10,
        "term-form-2": null,
        "term-form-3": null,
      },
    },
    {
      key: "hadith-bare",
      departmentSubjectId: "subject-2",
      subjectTitle: "الحديث",
      assessmentId: null,
      assessmentTitle: null,
      obtainable: null,
      originalScores: {
        "term-form-1": null,
        "term-form-2": null,
        "term-form-3": null,
      },
    },
  ],
};

async function loadWorkbook(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes));
  return workbook;
}

describe("signed assessment workbook", () => {
  test("generates a protected RTL workbook with hidden signed metadata", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const workbook = await loadWorkbook(bytes);
    const sheet = workbook.getWorksheet("Assessment Form")!;
    const metadataSheet = workbook.getWorksheet("__school_clerk")!;

    expect(sheet.views[0]?.rightToLeft).toBe(true);
    expect(sheet.getRow(1).hidden).toBe(true);
    expect(sheet.getColumn(5).hidden).toBe(true);
    expect(sheet.model.sheetProtection?.sheet).toBe(true);
    expect(sheet.getCell("C5").protection.locked).toBe(false);
    expect(sheet.getCell("A5").protection?.locked).not.toBe(false);
    expect(metadataSheet.state).toBe("veryHidden");
  });

  test("round-trips edited literal score cells through stable mappings", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const workbook = await loadWorkbook(bytes);
    const sheet = workbook.getWorksheet("Assessment Form")!;

    sheet.getCell("C5").value = "١٢٫٥";
    sheet.getCell("D5").value = "١٤";
    sheet.getCell("C11").value = 10;

    const edited = new Uint8Array(await workbook.xlsx.writeBuffer());
    const parsed = await parseAssessmentWorkbook(edited, { signingKey });

    expect(parsed.identity).toEqual({
      exportId: "export-1",
      tenantId: "school-1",
      termId: "term-1",
      classroomId: "classroom-1",
      generatedAt: "2026-07-18T12:00:00.000Z",
      direction: "rtl",
    });
    expect(parsed.scoreCells).toEqual([
      {
        studentTermFormId: "term-form-1",
        columnKey: "quran-review",
        uploaded: "١٢٫٥",
      },
      {
        studentTermFormId: "term-form-1",
        columnKey: "hadith-bare",
        uploaded: "١٤",
      },
      {
        studentTermFormId: "term-form-2",
        columnKey: "quran-review",
        uploaded: null,
      },
      {
        studentTermFormId: "term-form-2",
        columnKey: "hadith-bare",
        uploaded: null,
      },
      {
        studentTermFormId: "term-form-3",
        columnKey: "quran-review",
        uploaded: 10,
      },
      {
        studentTermFormId: "term-form-3",
        columnKey: "hadith-bare",
        uploaded: null,
      },
    ]);
  });

  test("rejects altered signed metadata", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const workbook = await loadWorkbook(bytes);
    const metadata = workbook.getWorksheet("__school_clerk")!;
    metadata.getCell("A1").value = String(metadata.getCell("A1").value).replace(
      "school-1",
      "school-2",
    );

    const tampered = new Uint8Array(await workbook.xlsx.writeBuffer());

    await expect(
      parseAssessmentWorkbook(tampered, { signingKey }),
    ).rejects.toThrow("Workbook metadata signature is invalid.");
  });

  test("rejects formulas in editable score cells", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const workbook = await loadWorkbook(bytes);
    workbook.getWorksheet("Assessment Form")!.getCell("C5").value = {
      formula: "10+2",
      result: 12,
    };

    const edited = new Uint8Array(await workbook.xlsx.writeBuffer());

    await expect(
      parseAssessmentWorkbook(edited, { signingKey }),
    ).rejects.toThrow(
      "Formula values are not allowed in assessment workbooks.",
    );
  });

  test("rejects formulas outside mapped score cells", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const workbook = await loadWorkbook(bytes);
    workbook.getWorksheet("Assessment Form")!.getCell("Z100").value = {
      formula: 'WEBSERVICE("https://example.invalid")',
      result: "blocked",
    };

    const edited = new Uint8Array(await workbook.xlsx.writeBuffer());

    await expect(
      parseAssessmentWorkbook(edited, { signingKey }),
    ).rejects.toThrow(
      "Formula values are not allowed in assessment workbooks.",
    );
  });

  test("rejects workbooks whose protected structure was exposed", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const workbook = await loadWorkbook(bytes);
    workbook.getWorksheet("__school_clerk")!.state = "visible";

    const edited = new Uint8Array(await workbook.xlsx.writeBuffer());

    await expect(
      parseAssessmentWorkbook(edited, { signingKey }),
    ).rejects.toThrow(
      "Workbook protection or metadata visibility was altered.",
    );
  });

  test("rejects macro and external-link payloads before workbook parsing", async () => {
    const bytes = await generateAssessmentWorkbook(workbookInput, {
      signingKey,
    });
    const macroZip = await JSZip.loadAsync(bytes);
    macroZip.file("xl/vbaProject.bin", new Uint8Array([1, 2, 3]));
    const macroBytes = await macroZip.generateAsync({ type: "uint8array" });
    await expect(
      parseAssessmentWorkbook(macroBytes, { signingKey }),
    ).rejects.toThrow(
      "Macros and embedded executable content are not allowed.",
    );

    const linkZip = await JSZip.loadAsync(bytes);
    linkZip.file("xl/externalLinks/externalLink1.xml", "<externalLink />");
    const linkBytes = await linkZip.generateAsync({ type: "uint8array" });
    await expect(
      parseAssessmentWorkbook(linkBytes, { signingKey }),
    ).rejects.toThrow("External workbook links are not allowed.");
  });
});
