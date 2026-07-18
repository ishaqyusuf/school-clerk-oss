import type { Database } from "./prisma";

export type AcademicDataDirectionMode = "AUTO" | "LTR" | "RTL";
export type DataDirection = "ltr" | "rtl";
export type AcademicDirectionSource =
	| "students"
	| "classrooms"
	| "departments"
	| "subjects"
	| "school"
	| "language";

export type AcademicDirectionEvidence = Record<
	AcademicDirectionSource,
	readonly string[]
>;

export interface AcademicDirectionSourceSummary {
	analyzed: number;
	ltr: number;
	rtl: number;
}

export interface AcademicDataDirectionAnalysis {
	direction: DataDirection;
	analyzedRecords: number;
	ltrWeight: number;
	rtlWeight: number;
	sources: Record<AcademicDirectionSource, AcademicDirectionSourceSummary>;
}

export interface SchoolAcademicDataDirection
	extends AcademicDataDirectionAnalysis {
	mode: AcademicDataDirectionMode;
}

const SOURCE_WEIGHTS: Record<AcademicDirectionSource, number> = {
	students: 3,
	classrooms: 2,
	departments: 2,
	subjects: 2,
	school: 1,
	language: 4,
};

const RTL_STRONG_CHARACTER =
	/[\u0590-\u05ff\u0600-\u06ff\u0700-\u074f\u0750-\u077f\u0780-\u07bf\u07c0-\u07ff\u0800-\u083f\u0840-\u085f\u08a0-\u08ff\ufb1d-\ufb4f\ufb50-\ufdff\ufe70-\ufefc\u{10d00}-\u{10d3f}\u{1e900}-\u{1e95f}]/u;
const LETTER_CHARACTER = /\p{Letter}/u;
const RTL_LANGUAGE_NAMES = [
	"arabic",
	"العربية",
	"hebrew",
	"עברית",
	"persian",
	"farsi",
	"فارسی",
	"urdu",
	"اردو",
	"pashto",
	"پښتو",
	"dari",
	"syriac",
	"yiddish",
	"sorani",
	"kurdish",
	"dhivehi",
	"maldivian",
];

function createEmptySourceSummary(): AcademicDirectionSourceSummary {
	return {
		analyzed: 0,
		ltr: 0,
		rtl: 0,
	};
}

export function detectStrongTextDirection(
	value: string | null | undefined,
): DataDirection | null {
	const normalized = value?.trim();
	if (!normalized) return null;

	for (const character of normalized) {
		if (RTL_STRONG_CHARACTER.test(character)) return "rtl";
		if (LETTER_CHARACTER.test(character)) return "ltr";
	}

	return null;
}

export function detectInstructionLanguageDirection(
	value: string | null | undefined,
): DataDirection | null {
	const normalized = value?.trim().toLocaleLowerCase();
	if (!normalized) return null;

	if (RTL_LANGUAGE_NAMES.some((language) => normalized.includes(language))) {
		return "rtl";
	}

	return detectStrongTextDirection(normalized);
}

export function analyzeAcademicDirectionEvidence(
	evidence: AcademicDirectionEvidence,
): AcademicDataDirectionAnalysis {
	const sources: AcademicDataDirectionAnalysis["sources"] = {
		students: createEmptySourceSummary(),
		classrooms: createEmptySourceSummary(),
		departments: createEmptySourceSummary(),
		subjects: createEmptySourceSummary(),
		school: createEmptySourceSummary(),
		language: createEmptySourceSummary(),
	};
	let ltrWeight = 0;
	let rtlWeight = 0;

	for (const [source, values] of Object.entries(evidence) as [
		AcademicDirectionSource,
		readonly string[],
	][]) {
		const weight = SOURCE_WEIGHTS[source];

		for (const value of values) {
			const direction =
				source === "language"
					? detectInstructionLanguageDirection(value)
					: detectStrongTextDirection(value);
			if (!direction) continue;

			sources[source].analyzed += 1;
			sources[source][direction] += 1;

			if (direction === "rtl") {
				rtlWeight += weight;
			} else {
				ltrWeight += weight;
			}
		}
	}

	return {
		direction: rtlWeight > ltrWeight ? "rtl" : "ltr",
		analyzedRecords: Object.values(sources).reduce(
			(total, source) => total + source.analyzed,
			0,
		),
		ltrWeight,
		rtlWeight,
		sources,
	};
}

export function applyAcademicDirectionMode(
	mode: AcademicDataDirectionMode,
	analysis: AcademicDataDirectionAnalysis,
): SchoolAcademicDataDirection {
	return {
		...analysis,
		mode,
		direction:
			mode === "RTL" ? "rtl" : mode === "LTR" ? "ltr" : analysis.direction,
	};
}

export async function analyzeSchoolAcademicDataDirection(
	db: Database,
	schoolProfileId: string,
): Promise<AcademicDataDirectionAnalysis> {
	const [school, students, classrooms, departments, subjects] =
		await Promise.all([
			db.schoolProfile.findFirst({
				where: { id: schoolProfileId, deletedAt: null },
				select: {
					name: true,
					languageOfInstruction: true,
				},
			}),
			db.students.findMany({
				where: { schoolProfileId, deletedAt: null },
				orderBy: { updatedAt: "desc" },
				take: 500,
				select: {
					name: true,
					surname: true,
					otherName: true,
				},
			}),
			db.classRoom.findMany({
				where: { schoolProfileId, deletedAt: null },
				orderBy: { updatedAt: "desc" },
				take: 200,
				select: { name: true },
			}),
			db.classRoomDepartment.findMany({
				where: { schoolProfileId, deletedAt: null },
				orderBy: { updatedAt: "desc" },
				take: 200,
				select: { departmentName: true },
			}),
			db.subject.findMany({
				where: { schoolProfileId, deletedAt: null },
				orderBy: { updatedAt: "desc" },
				take: 200,
				select: { title: true },
			}),
		]);

	if (!school) {
		throw new Error("School profile was not found.");
	}

	return analyzeAcademicDirectionEvidence({
		students: students.map((student) =>
			[student.name, student.surname, student.otherName]
				.filter(Boolean)
				.join(" "),
		),
		classrooms: classrooms.flatMap((classroom) =>
			classroom.name ? [classroom.name] : [],
		),
		departments: departments.flatMap((department) =>
			department.departmentName ? [department.departmentName] : [],
		),
		subjects: subjects.map((subject) => subject.title),
		school: [school.name],
		language: school.languageOfInstruction
			? [school.languageOfInstruction]
			: [],
	});
}

export async function resolveSchoolAcademicDataDirection(
	db: Database,
	schoolProfileId: string,
): Promise<SchoolAcademicDataDirection> {
	const school = await db.schoolProfile.findFirst({
		where: { id: schoolProfileId, deletedAt: null },
		select: { academicDataDirectionMode: true },
	});

	if (!school) {
		throw new Error("School profile was not found.");
	}

	const mode = school.academicDataDirectionMode as AcademicDataDirectionMode;
	const analysis =
		mode === "AUTO"
			? await analyzeSchoolAcademicDataDirection(db, schoolProfileId)
			: analyzeAcademicDirectionEvidence({
					students: [],
					classrooms: [],
					departments: [],
					subjects: [],
					school: [],
					language: [],
				});

	return applyAcademicDirectionMode(mode, analysis);
}

export function createAcademicDirectionFallback(
	mode: AcademicDataDirectionMode = "AUTO",
): SchoolAcademicDataDirection {
	return applyAcademicDirectionMode(
		mode,
		analyzeAcademicDirectionEvidence({
			students: [],
			classrooms: [],
			departments: [],
			subjects: [],
			school: [],
			language: [],
		}),
	);
}
