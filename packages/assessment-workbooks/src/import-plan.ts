import {
  normalizeAssessmentScoreCell,
  type AssessmentScoreCellResult,
} from "./score-normalization";

type InvalidScoreReason =
  | Extract<AssessmentScoreCellResult, { status: "invalid" }>["reason"]
  | "above-maximum";

export type AssessmentScoreChange =
  | { status: "blank" | "unchanged" }
  | { status: "create" | "update"; value: number }
  | {
      status: "conflict";
      downloaded: number | null;
      uploaded: number;
      current: number | null;
    }
  | {
      status: "invalid";
      reason: InvalidScoreReason;
      value?: number;
      maximum?: number;
    };

export type AssessmentScoreChangeInput = {
  downloaded: number | null;
  uploaded: unknown;
  current: number | null;
  obtainable: number;
};

export function classifyAssessmentScoreChange({
  downloaded,
  uploaded,
  current,
  obtainable,
}: AssessmentScoreChangeInput): AssessmentScoreChange {
  const normalized = normalizeAssessmentScoreCell(uploaded);

  if (normalized.status === "blank") {
    return { status: "blank" };
  }
  if (normalized.status === "invalid") {
    return normalized;
  }
  if (normalized.value > obtainable) {
    return {
      status: "invalid",
      reason: "above-maximum",
      value: normalized.value,
      maximum: obtainable,
    };
  }
  if (normalized.value === downloaded || normalized.value === current) {
    return { status: "unchanged" };
  }
  if (current === downloaded) {
    return {
      status: current == null ? "create" : "update",
      value: normalized.value,
    };
  }

  return {
    status: "conflict",
    downloaded,
    uploaded: normalized.value,
    current,
  };
}
