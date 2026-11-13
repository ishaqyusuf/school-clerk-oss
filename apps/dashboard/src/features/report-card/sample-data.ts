import type { ReportCardData, ReportCardTable, ReportCardTerm } from "./types";

function table(
	assessments: { label: string; max: number }[],
	subjects: { title: string; scores: (number | null)[] }[],
	startIndex = 1,
): ReportCardTable {
	const total = assessments.reduce((sum, item) => sum + item.max, 0);
	return {
		columns: [
			{ label: "المواد" },
			...assessments.map((item) => ({ label: item.label, subLabel: `(${item.max})` })),
			...(assessments.length > 1 ? [{ label: "المجموع الكلي", subLabel: `(${total})` }] : []),
		],
		rows: subjects.map((subject, index) => ({
			columns: [
				{ value: `${startIndex + index}. ${subject.title}` },
				...subject.scores.map((value) => ({ value })),
				...(assessments.length > 1
					? [{ value: subject.scores.reduce<number>((sum, value) => sum + (value ?? 0), 0) }]
					: []),
			],
		})),
	};
}

const standard = [
	{ label: "الحضور", max: 10 },
	{ label: "الاختبار", max: 30 },
	{ label: "الامتحان", max: 60 },
];

export const SAMPLE_REPORTS: Record<"short" | "long", ReportCardData> = {
	short: {
		id: "sample-short",
		nameParts: ["فاطمة", "إبراهيم", "الحاج"],
		classroomName: "الروضة الأولى",
		tables: [
			table(standard, [
				{ title: "القرآن الكريم", scores: [10, 27, 55] },
				{ title: "الكتابة", scores: [9, 24, 48] },
				{ title: "الأذكار", scores: [10, 28, 51] },
				{ title: "الحساب", scores: [8, 22, 44] },
			]),
		],
		grade: { obtained: 336, obtainable: 400, percentage: 84, position: 2, totalStudents: 9 },
	},
	long: {
		id: "sample-long",
		nameParts: ["محمد", "عبد الرحمن", "يوسف"],
		classroomName: "الإعدادية الثالثة",
		tables: [
			table(standard, [
				{ title: "التفسير", scores: [9, 25, 51] },
				{ title: "الحديث", scores: [10, 27, 49] },
				{ title: "الفقه", scores: [8, 21, 40] },
				{ title: "التوحيد", scores: [10, 26, 55] },
				{ title: "السيرة", scores: [9, 22, 47] },
				{ title: "النحو", scores: [7, 18, 38] },
				{ title: "الصرف", scores: [8, 20, null] },
				{ title: "البلاغة", scores: [9, 24, 44] },
				{ title: "الأدب", scores: [10, 25, 50] },
				{ title: "الإملاء", scores: [9, 26, 52] },
			]),
			table(
				[
					{ label: "الحفظ", max: 50 },
					{ label: "المراجعة", max: 50 },
				],
				[
					{ title: "القرآن الكريم", scores: [46, 41] },
					{ title: "التجويد", scores: [40, 38] },
				],
				11,
			),
		],
		grade: { obtained: 976, obtainable: 1200, percentage: 81.3, position: 4, totalStudents: 27 },
	},
};

export const SAMPLE_TERM: ReportCardTerm = {
	title: "2nd Term",
	sessionTitle: "1447/1448",
	resumptionDate: "2026-09-12T00:00:00.000Z",
};
