import {
	prisma,
	saveStudentAssessmentScoreWithHistory,
} from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { tool } from "ai";
import { z } from "zod";
import {
	studentDisplayName,
	type SchoolAiToolContext,
	type SchoolAiToolHelpers,
} from "./context";

type AssessmentScoreInput = {
	studentName: string;
	obtained: number;
};

type AssessmentActionInput = {
	classroomName: string;
	subjectName: string;
	assessmentTitle: string;
	obtainable: number;
	percentageObtainable: number;
	scores: AssessmentScoreInput[];
};

type ResolvedStudentScore = {
	studentId: string;
	studentTermFormId: string;
	studentName: string;
	inputName: string;
	obtained: number;
	existingRecordId: number | null;
	existingObtained: number | null;
};

function normalizeLookupText(value: string | null | undefined) {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function normalizeTokenSet(value: string | null | undefined) {
	return normalizeLookupText(value).split(" ").filter(Boolean).sort().join(" ");
}

function valuesMatch(input: string, candidate: string) {
	const normalizedInput = normalizeLookupText(input);
	const normalizedCandidate = normalizeLookupText(candidate);
	if (!normalizedInput || !normalizedCandidate) return false;
	if (normalizedInput === normalizedCandidate) return true;
	return normalizeTokenSet(input) === normalizeTokenSet(candidate);
}

function uniqueMatches<T>(
	items: T[],
	input: string,
	getLabels: (item: T) => string[],
) {
	return items.filter((item) =>
		getLabels(item).some((label) => valuesMatch(input, label)),
	);
}

function blockedOutput(params: {
	toolName: string;
	message: string;
	candidates?: unknown;
	unmatched?: unknown;
	ambiguous?: unknown;
}) {
	return {
		blocked: true,
		toolName: params.toolName,
		message: params.message,
		candidates: params.candidates,
		unmatched: params.unmatched,
		ambiguous: params.ambiguous,
	};
}

export function createAssessmentTools(
	ctx: SchoolAiToolContext,
	helpers: SchoolAiToolHelpers,
	database: typeof prisma = prisma,
) {
	const {
		finishAssistantToolExecution,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity,
		requiresConfirmationResult,
	} = helpers;

	return {
		recordAssessmentScores: tool({
			description:
				"Create or update a subject assessment and batch-record raw student scores for an active classroom term. Requires explicit confirmation.",
			inputSchema: z.object({
				classroomName: z
					.string()
					.describe("Classroom display name, for example Primary 1 Emerald"),
				subjectName: z.string().describe("Subject name, for example Hadith"),
				assessmentTitle: z.string().describe("Assessment title, for example exam"),
				obtainable: z.number().positive(),
				percentageObtainable: z.number().min(0),
				scores: z
					.array(
						z.object({
							studentName: z.string(),
							obtained: z.number().min(0),
						}),
					)
					.min(1),
				confirmationToken: z.string().optional(),
			}),
			execute: async ({
				confirmationToken,
				...actionInput
			}: AssessmentActionInput & { confirmationToken?: string }) => {
				const guarded = await guardCapability(
					"assessments.write",
					"recordAssessmentScores",
					actionInput,
					true,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					if (!ctx.sessionId || !ctx.termId) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message:
								"An active academic session and term are required before assessment scores can be recorded.",
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const departments = await database.classRoomDepartment.findMany({
						where: {
							deletedAt: null,
							classRoom: {
								schoolProfileId: ctx.schoolId,
								schoolSessionId: ctx.sessionId,
							},
						},
						select: {
							id: true,
							departmentName: true,
							classRoom: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: [
							{ classRoom: { classLevel: "asc" } },
							{ departmentLevel: "asc" },
							{ departmentName: "asc" },
						],
					});

					const classroomMatches = uniqueMatches(
						departments,
						actionInput.classroomName,
						(department) => [
							classroomDisplayName({
								className: department.classRoom?.name,
								departmentName: department.departmentName,
							}),
							department.classRoom?.name ?? "",
							department.departmentName ?? "",
						],
					);

					if (classroomMatches.length !== 1) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message:
								classroomMatches.length > 1
									? "More than one classroom matches the requested classroom name."
									: "No classroom matches the requested classroom name.",
							candidates: (classroomMatches.length ? classroomMatches : departments)
								.slice(0, 12)
								.map((department) => ({
									id: department.id,
									displayName: classroomDisplayName({
										className: department.classRoom?.name,
										departmentName: department.departmentName,
									}),
									className: department.classRoom?.name ?? null,
									streamName: department.departmentName ?? null,
								})),
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const department = classroomMatches[0];
					if (!department) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message: "No classroom matches the requested classroom name.",
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}
					const departmentDisplayName = classroomDisplayName({
						className: department.classRoom?.name,
						departmentName: department.departmentName,
					});

					const subjects = await database.departmentSubject.findMany({
						where: {
							classRoomDepartmentId: department.id,
							sessionTermId: ctx.termId,
							deletedAt: null,
							subject: {
								schoolProfileId: ctx.schoolId,
								deletedAt: null,
							},
						},
						select: {
							id: true,
							subject: {
								select: {
									id: true,
									title: true,
								},
							},
						},
						orderBy: { createdAt: "asc" },
					});

					const subjectMatches = uniqueMatches(
						subjects,
						actionInput.subjectName,
						(subject) => [subject.subject.title],
					);

					if (subjectMatches.length !== 1) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message:
								subjectMatches.length > 1
									? "More than one subject matches the requested subject name."
									: "No subject matches the requested subject name for this classroom and term.",
							candidates: (subjectMatches.length ? subjectMatches : subjects)
								.slice(0, 12)
								.map((subject) => ({
									departmentSubjectId: subject.id,
									title: subject.subject.title,
								})),
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const departmentSubject = subjectMatches[0];
					if (!departmentSubject) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message:
								"No subject matches the requested subject name for this classroom and term.",
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}
					const studentTermForms = await database.studentTermForm.findMany({
						where: {
							schoolProfileId: ctx.schoolId,
							sessionTermId: ctx.termId,
							classroomDepartmentId: department.id,
							deletedAt: null,
							student: {
								deletedAt: null,
							},
						},
						select: {
							id: true,
							student: {
								select: {
									id: true,
									name: true,
									otherName: true,
									surname: true,
								},
							},
						},
						orderBy: [
							{ student: { gender: "asc" } },
							{ student: { name: "asc" } },
						],
					});

					const unmatched: { inputName: string; obtained: number }[] = [];
					const ambiguous: {
						inputName: string;
						obtained: number;
						candidates: { studentId: string; studentTermFormId: string; studentName: string }[];
					}[] = [];
					const duplicateInputs: string[] = [];
					const resolvedScores: Omit<
						ResolvedStudentScore,
						"existingRecordId" | "existingObtained"
					>[] = [];
					const seenStudentIds = new Set<string>();

					for (const score of actionInput.scores) {
						const matches = uniqueMatches(
							studentTermForms,
							score.studentName,
							(termForm) => {
								const student = termForm.student;
								if (!student) return [];
								return [
									studentDisplayName(student),
									[student.name, student.surname, student.otherName]
										.filter(Boolean)
										.join(" "),
									[student.name, student.otherName, student.surname]
										.filter(Boolean)
										.join(" "),
								];
							},
						).filter((match) => match.student?.id);

						if (!matches.length) {
							unmatched.push({
								inputName: score.studentName,
								obtained: score.obtained,
							});
							continue;
						}

						if (matches.length > 1) {
							ambiguous.push({
								inputName: score.studentName,
								obtained: score.obtained,
								candidates: matches.map((match) => ({
									studentId: match.student?.id ?? "",
									studentTermFormId: match.id,
									studentName: match.student
										? studentDisplayName(match.student)
										: "Student",
								})),
							});
							continue;
						}

						const match = matches[0];
						if (!match?.student?.id) {
							unmatched.push({
								inputName: score.studentName,
								obtained: score.obtained,
							});
							continue;
						}
						const student = match.student;
						const studentId = student.id;

						if (seenStudentIds.has(studentId)) {
							duplicateInputs.push(score.studentName);
							continue;
						}

						seenStudentIds.add(studentId);
						resolvedScores.push({
							studentId,
							studentTermFormId: match.id,
							studentName: studentDisplayName(student),
							inputName: score.studentName,
							obtained: score.obtained,
						});
					}

					if (unmatched.length || ambiguous.length || duplicateInputs.length) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message:
								"Some student names could not be uniquely matched in the selected classroom and term.",
							unmatched,
							ambiguous,
							candidates: {
								duplicateInputs,
								enrolledStudents: studentTermForms
									.slice(0, 40)
									.map((termForm) => ({
										studentId: termForm.student?.id ?? null,
										studentTermFormId: termForm.id,
										studentName: termForm.student
											? studentDisplayName(termForm.student)
											: "Student",
									})),
							},
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const existingAssessments =
						await database.classroomSubjectAssessment.findMany({
							where: {
								departmentSubjectId: departmentSubject.id,
								parentAssessmentId: null,
								isGroup: false,
								deletedAt: null,
							},
							select: {
								id: true,
								title: true,
								obtainable: true,
								percentageObtainable: true,
								index: true,
							},
							orderBy: { index: "asc" },
						});
					const assessmentMatches = existingAssessments.filter((assessment) =>
						valuesMatch(actionInput.assessmentTitle, assessment.title),
					);

					if (assessmentMatches.length > 1) {
						const output = blockedOutput({
							toolName: "recordAssessmentScores",
							message:
								"More than one existing assessment matches the requested assessment title.",
							candidates: assessmentMatches.map((assessment) => ({
								id: assessment.id,
								title: assessment.title,
								obtainable: assessment.obtainable,
								percentageObtainable: assessment.percentageObtainable,
							})),
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const existingAssessment = assessmentMatches[0] ?? null;

					const existingRecords =
						existingAssessment && resolvedScores.length
							? await database.studentAssessmentRecord.findMany({
									where: {
										classSubjectAssessmentId: existingAssessment.id,
										studentTermFormId: {
											in: resolvedScores.map(
												(score) => score.studentTermFormId,
											),
										},
										deletedAt: null,
									},
									select: {
										id: true,
										obtained: true,
										studentTermFormId: true,
									},
								})
							: [];
					const recordsByTermFormId = new Map(
						existingRecords.map((record) => [record.studentTermFormId, record]),
					);
					const previewScores: ResolvedStudentScore[] = resolvedScores.map(
						(score) => {
							const existingRecord = recordsByTermFormId.get(
								score.studentTermFormId,
							);
							return {
								...score,
								existingRecordId: existingRecord?.id ?? null,
								existingObtained: existingRecord?.obtained ?? null,
							};
						},
					);
					const metadataWillChange =
						!!existingAssessment &&
						(existingAssessment.obtainable !== actionInput.obtainable ||
							(existingAssessment.percentageObtainable ?? 0) !==
								actionInput.percentageObtainable);
					const assessmentStatus = !existingAssessment
						? "create"
						: metadataWillChange
							? "update-metadata"
							: "use-existing";
					const confirmationActionInput = {
						...actionInput,
						resolvedClassroomDepartmentId: department.id,
						resolvedDepartmentSubjectId: departmentSubject.id,
						resolvedAssessmentId: existingAssessment?.id ?? null,
						resolvedScores: previewScores.map((score) => ({
							studentId: score.studentId,
							studentTermFormId: score.studentTermFormId,
							studentName: score.studentName,
							inputName: score.inputName,
							obtained: score.obtained,
						})),
					};

					if (
						!isConfirmedMutation({
							ctx,
							toolName: "recordAssessmentScores",
							confirmationToken,
							actionInput: confirmationActionInput,
						})
					) {
						const output = {
							...requiresConfirmationResult({
								ctx,
								toolName: "recordAssessmentScores",
								summary: `Record ${previewScores.length} ${departmentSubject.subject.title} ${actionInput.assessmentTitle} scores for ${departmentDisplayName}?`,
								actionInput: confirmationActionInput,
							}),
							classroom: {
								id: department.id,
								displayName: departmentDisplayName,
							},
							subject: {
								departmentSubjectId: departmentSubject.id,
								title: departmentSubject.subject.title,
							},
							assessment: {
								id: existingAssessment?.id ?? null,
								title: actionInput.assessmentTitle,
								obtainable: actionInput.obtainable,
								percentageObtainable: actionInput.percentageObtainable,
								status: assessmentStatus,
								previousObtainable: existingAssessment?.obtainable ?? null,
								previousPercentageObtainable:
									existingAssessment?.percentageObtainable ?? null,
							},
							scoreCount: previewScores.length,
							scores: previewScores,
						};
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_requested",
							title: "AI assessment score confirmation requested",
							description: output.summary,
							meta: {
								toolName: "recordAssessmentScores",
								actionInput: confirmationActionInput,
							},
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const result = await database.$transaction(async (tx) => {
						let assessment = existingAssessment;

						if (!assessment) {
							const lastAssessment =
								await tx.classroomSubjectAssessment.findFirst({
									where: {
										departmentSubjectId: departmentSubject.id,
										parentAssessmentId: null,
										deletedAt: null,
									},
									select: { index: true },
									orderBy: { index: "desc" },
								});
							assessment = await tx.classroomSubjectAssessment.create({
								data: {
									title: actionInput.assessmentTitle,
									obtainable: actionInput.obtainable,
									percentageObtainable: actionInput.percentageObtainable,
									index: (lastAssessment?.index ?? -1) + 1,
									departmentSubjectId: departmentSubject.id,
									isGroup: false,
									parentAssessmentId: null,
								},
								select: {
									id: true,
									title: true,
									obtainable: true,
									percentageObtainable: true,
									index: true,
								},
							});
						} else if (metadataWillChange) {
							assessment = await tx.classroomSubjectAssessment.update({
								where: { id: assessment.id },
								data: {
									title: actionInput.assessmentTitle,
									obtainable: actionInput.obtainable,
									percentageObtainable: actionInput.percentageObtainable,
									deletedAt: null,
								},
								select: {
									id: true,
									title: true,
									obtainable: true,
									percentageObtainable: true,
									index: true,
								},
							});
						}

						const writtenScores: {
							recordId: number;
							studentId: string;
							studentTermFormId: string;
							studentName: string;
							obtained: number;
							previousObtained: number | null;
						}[] = [];

						for (const score of previewScores) {
							const existingRecord = await tx.studentAssessmentRecord.findFirst({
								where: {
									studentId: score.studentId,
									studentTermFormId: score.studentTermFormId,
									classSubjectAssessmentId: assessment.id,
								},
								select: { id: true, obtained: true },
							});

							const record = await saveStudentAssessmentScoreWithHistory({
								db: tx,
								currentRecord: existingRecord,
								score: {
									classSubjectAssessmentId: assessment.id,
									obtained: score.obtained,
									studentId: score.studentId,
									studentTermFormId: score.studentTermFormId,
								},
								history: {
									schoolProfileId: ctx.schoolId,
									source: "AI_TOOL",
									actorUserId: ctx.userId,
									actorName: ctx.userName,
									sourceReference: guarded.executionId,
									metadata: {
										classRoomDepartmentId: department.id,
										departmentSubjectId: departmentSubject.id,
									},
								},
							});

							writtenScores.push({
								recordId: record.id,
								studentId: score.studentId,
								studentTermFormId: score.studentTermFormId,
								studentName: score.studentName,
								obtained: score.obtained,
								previousObtained: existingRecord?.obtained ?? null,
							});
						}

						return {
							success: true,
							classroom: {
								id: department.id,
								displayName: departmentDisplayName,
							},
							subject: {
								departmentSubjectId: departmentSubject.id,
								title: departmentSubject.subject.title,
							},
							assessment: {
								id: assessment.id,
								title: assessment.title,
								obtainable: assessment.obtainable,
								percentageObtainable: assessment.percentageObtainable,
								status: assessmentStatus,
							},
							scoreCount: writtenScores.length,
							scores: writtenScores,
						};
					}, { isolationLevel: "Serializable" });

					await recordAssistantActivity({
						schoolId: ctx.schoolId,
						userId: ctx.userId,
						userName: ctx.userName,
						type: "assistant_action_completed",
						title: "AI recorded assessment scores",
						description: `${result.scoreCount} ${result.subject.title} scores recorded for ${result.classroom.displayName}.`,
						meta: {
							toolName: "recordAssessmentScores",
							actionInput: confirmationActionInput,
							output: result,
						},
					});
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output: result,
					});
					return result;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error
								? error.message
								: "Assessment score recording failed",
					});
					throw error;
				}
			},
		}),
	};
}
