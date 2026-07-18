import { createHmac, timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import {
  ASSESSMENT_WORKBOOK_METADATA_SHEET,
  ASSESSMENT_WORKBOOK_SCHEMA_VERSION,
  ASSESSMENT_WORKBOOK_VISIBLE_SHEET,
  assessmentWorkbookMetadataSchema,
  generateAssessmentWorkbookInputSchema,
  type AssessmentWorkbookMetadata,
  type GenerateAssessmentWorkbookInput,
  type ParsedAssessmentWorkbook,
} from "../contracts";

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_WORKBOOK_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 250;
const WORKSHEET_PASSWORD = "school-clerk-assessment-workbook";
const NAVY = "1E3A8A";
const LIGHT_BLUE = "DBEAFE";
const WHITE = "FFFFFF";
const BORDER = "94A3B8";

type WorkbookSecurityOptions = {
  signingKey: string;
};

function signatureFor(metadataJson: string, signingKey: string) {
  return createHmac("sha256", signingKey).update(metadataJson).digest("hex");
}

function signaturesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: BORDER } },
    left: { style: "thin", color: { argb: BORDER } },
    bottom: { style: "thin", color: { argb: BORDER } },
    right: { style: "thin", color: { argb: BORDER } },
  };
}

function styleHeaderCell(cell: ExcelJS.Cell, fill: string) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };
  cell.font = {
    name: "Noto Naskh Arabic",
    bold: true,
    color: { argb: fill === NAVY ? WHITE : "0F172A" },
    size: fill === NAVY ? 14 : 11,
  };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  applyBorder(cell);
}

function visibleCellValue(value: ExcelJS.CellValue) {
  if (
    value &&
    typeof value === "object" &&
    ("formula" in value || "sharedFormula" in value)
  ) {
    throw new Error("Formula values are not allowed in score cells.");
  }

  if (value == null || typeof value === "string" || typeof value === "number") {
    return value;
  }

  return value;
}

function rejectFormulaValues(workbook: ExcelJS.Workbook) {
  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const value = cell.value;
        if (
          value &&
          typeof value === "object" &&
          ("formula" in value || "sharedFormula" in value)
        ) {
          throw new Error(
            "Formula values are not allowed in assessment workbooks.",
          );
        }
      });
    });
  }
}

async function preflightWorkbookArchive(bytes: Uint8Array) {
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error("The uploaded file is not a valid .xlsx workbook.");
  }

  const entries = Object.values(archive.files);
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("Workbook archive contains too many files.");
  }

  let uncompressedBytes = 0;
  for (const entry of entries) {
    const path = entry.name.toLowerCase();
    if (
      path.endsWith("/vbaproject.bin") ||
      path.includes("/activex/") ||
      path.includes("/embeddings/")
    ) {
      throw new Error(
        "Macros and embedded executable content are not allowed.",
      );
    }
    if (path.includes("/externallinks/")) {
      throw new Error("External workbook links are not allowed.");
    }

    const data = (
      entry as unknown as {
        _data?: { uncompressedSize?: number };
      }
    )._data;
    uncompressedBytes += data?.uncompressedSize ?? 0;
    if (uncompressedBytes > MAX_UNCOMPRESSED_WORKBOOK_BYTES) {
      throw new Error("Workbook expands beyond the safe processing limit.");
    }
  }
}

function writeHeaders({
  sheet,
  topRow,
  columns,
}: {
  sheet: ExcelJS.Worksheet;
  topRow: number;
  columns: GenerateAssessmentWorkbookInput["columns"];
}) {
  sheet.mergeCells(topRow, 1, topRow + 1, 1);
  sheet.mergeCells(topRow, 2, topRow + 1, 2);
  sheet.getCell(topRow, 1).value = "S/N";
  sheet.getCell(topRow, 2).value = "Name";

  for (const columnNumber of [1, 2]) {
    styleHeaderCell(sheet.getCell(topRow, columnNumber), LIGHT_BLUE);
    styleHeaderCell(sheet.getCell(topRow + 1, columnNumber), LIGHT_BLUE);
  }

  let index = 0;
  while (index < columns.length) {
    const subjectId = columns[index]!.departmentSubjectId;
    let end = index;
    while (
      end + 1 < columns.length &&
      columns[end + 1]!.departmentSubjectId === subjectId
    ) {
      end += 1;
    }

    const startColumn = index + 3;
    const endColumn = end + 3;
    const subjectColumns = columns.slice(index, end + 1);
    const isBareOnly =
      subjectColumns.length === 1 && subjectColumns[0]!.assessmentId == null;

    if (isBareOnly) {
      sheet.mergeCells(topRow, startColumn, topRow + 1, startColumn);
      sheet.getCell(topRow, startColumn).value =
        subjectColumns[0]!.subjectTitle;
      styleHeaderCell(sheet.getCell(topRow, startColumn), LIGHT_BLUE);
      styleHeaderCell(sheet.getCell(topRow + 1, startColumn), LIGHT_BLUE);
    } else {
      if (startColumn !== endColumn) {
        sheet.mergeCells(topRow, startColumn, topRow, endColumn);
      }
      sheet.getCell(topRow, startColumn).value =
        subjectColumns[0]!.subjectTitle;
      for (let column = startColumn; column <= endColumn; column += 1) {
        styleHeaderCell(sheet.getCell(topRow, column), LIGHT_BLUE);
      }
      for (const [offset, assessment] of subjectColumns.entries()) {
        const cell = sheet.getCell(topRow + 1, startColumn + offset);
        cell.value = assessment.assessmentTitle ?? "Score";
        styleHeaderCell(cell, LIGHT_BLUE);
      }
    }

    index = end + 1;
  }
}

export async function generateAssessmentWorkbook(
  rawInput: GenerateAssessmentWorkbookInput,
  { signingKey }: WorkbookSecurityOptions,
) {
  const input = generateAssessmentWorkbookInputSchema.parse(rawInput);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "School Clerk";
  workbook.created = new Date(input.generatedAt);

  const sheet = workbook.addWorksheet(ASSESSMENT_WORKBOOK_VISIBLE_SHEET, {
    views: [
      {
        state: "frozen",
        ySplit: 1,
        rightToLeft: input.direction === "rtl",
        showGridLines: false,
      },
    ],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const scoreColumnStart = 3;
  const lastScoreColumn = scoreColumnStart + input.columns.length - 1;
  const studentIdColumn = lastScoreColumn + 1;
  sheet.getRow(1).hidden = true;
  sheet.getCell(1, 1).value =
    `school-clerk-assessment-workbook:${ASSESSMENT_WORKBOOK_SCHEMA_VERSION}`;
  for (const [index, column] of input.columns.entries()) {
    sheet.getCell(1, scoreColumnStart + index).value = column.key;
  }
  sheet.getCell(1, studentIdColumn).value = "__student_term_form_id";
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 30;
  for (let column = scoreColumnStart; column <= lastScoreColumn; column += 1) {
    sheet.getColumn(column).width = 16;
  }
  sheet.getColumn(studentIdColumn).hidden = true;

  const studentRows: AssessmentWorkbookMetadata["studentRows"] = [];
  let nextRow = 2;

  for (const section of [
    { gender: "Male" as const, label: "Boys" },
    { gender: "Female" as const, label: "Girls" },
  ]) {
    const students = input.students.filter(
      (student) => student.gender === section.gender,
    );
    if (!students.length) continue;

    const titleRow = nextRow;
    sheet.mergeCells(titleRow, 1, titleRow, lastScoreColumn);
    const titleCell = sheet.getCell(titleRow, 1);
    titleCell.value = `${input.classroomLabel} — ${section.label} — ${input.termLabel}`;
    styleHeaderCell(titleCell, NAVY);
    sheet.getRow(titleRow).height = 28;

    writeHeaders({
      sheet,
      topRow: titleRow + 1,
      columns: input.columns,
    });
    sheet.getRow(titleRow + 1).height = 26;
    sheet.getRow(titleRow + 2).height = 38;

    for (const [studentIndex, student] of students.entries()) {
      const rowNumber = titleRow + 3 + studentIndex;
      const row = sheet.getRow(rowNumber);
      row.getCell(1).value = studentIndex + 1;
      row.getCell(2).value = student.displayName;
      row.getCell(2).alignment = {
        horizontal: input.direction === "rtl" ? "right" : "left",
        vertical: "middle",
      };
      row.getCell(studentIdColumn).value = student.studentTermFormId;

      for (const [columnIndex, column] of input.columns.entries()) {
        const cell = row.getCell(scoreColumnStart + columnIndex);
        cell.value = column.originalScores[student.studentTermFormId] ?? null;
        cell.numFmt = "0.##";
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.protection = { locked: false };
      }

      for (let column = 1; column <= lastScoreColumn; column += 1) {
        applyBorder(row.getCell(column));
      }
      row.height = 24;
      studentRows.push({ ...student, row: rowNumber });
    }

    nextRow = titleRow + students.length + 4;
  }

  await sheet.protect(WORKSHEET_PASSWORD, {
    selectLockedCells: false,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
  });

  const metadata: AssessmentWorkbookMetadata = {
    schemaVersion: ASSESSMENT_WORKBOOK_SCHEMA_VERSION,
    identity: {
      exportId: input.exportId,
      tenantId: input.tenantId,
      termId: input.termId,
      classroomId: input.classroomId,
      generatedAt: input.generatedAt,
      direction: input.direction,
    },
    visibleSheetName: ASSESSMENT_WORKBOOK_VISIBLE_SHEET,
    studentRows,
    columns: input.columns.map((column, index) => ({
      ...column,
      column: scoreColumnStart + index,
    })),
    studentIdColumn,
  };
  const metadataJson = JSON.stringify(metadata);
  const metadataSheet = workbook.addWorksheet(
    ASSESSMENT_WORKBOOK_METADATA_SHEET,
  );
  metadataSheet.state = "veryHidden";
  metadataSheet.getCell("A1").value = metadataJson;
  metadataSheet.getCell("A2").value = signatureFor(metadataJson, signingKey);

  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output);
}

export async function parseAssessmentWorkbook(
  bytes: Uint8Array,
  { signingKey }: WorkbookSecurityOptions,
): Promise<ParsedAssessmentWorkbook> {
  if (bytes.byteLength > MAX_WORKBOOK_BYTES) {
    throw new Error("Workbook exceeds the 10 MB upload limit.");
  }
  await preflightWorkbookArchive(bytes);

  const workbook = new ExcelJS.Workbook();
  const xlsxInput = Buffer.from(bytes) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];
  await workbook.xlsx.load(xlsxInput);
  rejectFormulaValues(workbook);
  if (
    workbook.worksheets.length !== 2 ||
    !workbook.getWorksheet(ASSESSMENT_WORKBOOK_VISIBLE_SHEET) ||
    !workbook.getWorksheet(ASSESSMENT_WORKBOOK_METADATA_SHEET)
  ) {
    throw new Error("Workbook structure is not supported.");
  }

  const metadataSheet = workbook.getWorksheet(
    ASSESSMENT_WORKBOOK_METADATA_SHEET,
  )!;
  if (metadataSheet.state !== "veryHidden") {
    throw new Error("Workbook protection or metadata visibility was altered.");
  }
  const metadataJson = metadataSheet.getCell("A1").value;
  const actualSignature = metadataSheet.getCell("A2").value;
  if (
    typeof metadataJson !== "string" ||
    typeof actualSignature !== "string" ||
    !signaturesMatch(actualSignature, signatureFor(metadataJson, signingKey))
  ) {
    throw new Error("Workbook metadata signature is invalid.");
  }

  const metadata = assessmentWorkbookMetadataSchema.parse(
    JSON.parse(metadataJson),
  );
  const sheet = workbook.getWorksheet(metadata.visibleSheetName)!;
  const sheetProtection = (
    sheet.model as unknown as {
      sheetProtection?: { sheet?: boolean };
    }
  ).sheetProtection;
  if (
    sheetProtection?.sheet !== true ||
    !sheet.getRow(1).hidden ||
    !sheet.getColumn(metadata.studentIdColumn).hidden
  ) {
    throw new Error("Workbook protection or metadata visibility was altered.");
  }

  for (const column of metadata.columns) {
    if (sheet.getCell(1, column.column).value !== column.key) {
      throw new Error("Workbook columns were moved or altered.");
    }
  }

  const scoreCells: ParsedAssessmentWorkbook["scoreCells"] = [];
  for (const student of metadata.studentRows) {
    if (
      sheet.getCell(student.row, metadata.studentIdColumn).value !==
      student.studentTermFormId
    ) {
      throw new Error("Workbook student rows were moved or altered.");
    }

    for (const column of metadata.columns) {
      scoreCells.push({
        studentTermFormId: student.studentTermFormId,
        columnKey: column.key,
        uploaded: visibleCellValue(
          sheet.getCell(student.row, column.column).value,
        ),
      });
    }
  }

  return {
    identity: metadata.identity,
    metadata,
    scoreCells,
  };
}
