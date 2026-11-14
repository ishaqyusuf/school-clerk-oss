import { describe, expect, test } from "bun:test";
import { isPublicAssessmentRecordingPath } from "./public-share-paths";

describe("isPublicAssessmentRecordingPath", () => {
	test("matches only the public link page", () => {
		expect(isPublicAssessmentRecordingPath("/assessment-recording/public/abc.def")).toBe(true);
		expect(isPublicAssessmentRecordingPath("/daarulhadith/assessment-recording/public/abc.def/")).toBe(true);
		expect(isPublicAssessmentRecordingPath("/assessment-recording")).toBe(false);
		expect(isPublicAssessmentRecordingPath("/assessment-recording/public")).toBe(false);
		expect(isPublicAssessmentRecordingPath("/assessment-recording/public/abc/edit")).toBe(false);
		expect(isPublicAssessmentRecordingPath("/students")).toBe(false);
	});
});
