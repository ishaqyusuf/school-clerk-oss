import type {
	ResultTemplateConfig,
	ResultTemplateReport,
} from "@school-clerk/pdf/result-template";
import { configs } from "@/configs";

const legacyCalligraphOverrides = {
	...configs["caligraphs"],
	...configs["caligraphs2"],
};

export const previewResultTemplateConfig: ResultTemplateConfig = {
	schoolName: configs.schoolName,
	schoolAddress: configs.schoolAddress,
	academicYear: "١٤٤٦/١٤٤٧هـ",
	term: "الثالثة",
	commentLabel: configs.comment,
	directorSignature: configs.directorSignature,
	teacherSignature: configs.teacherSignature,
	signatureImageSrc: "/signature.png",
	calligraphs: legacyCalligraphOverrides,
};

export const previewResultTemplateReports: ResultTemplateReport[] = [
	{
		id: "preview-template-1",
		student: {
			name: "إسحاق",
			surname: "يوسف",
			otherName: "أحمد",
		},
		classroom: "الصف الثالث",
		term: "الثالثة",
		academicYear: "١٤٤٦/١٤٤٧هـ",
		returnDate: "٢٨/٠٣/٢٦",
		grade: {
			percentage: 87.5,
			position: 2,
			totalStudents: 18,
		},
		comment: {
			arabic: "جيّد جدا",
			english: "Very Good",
		},
		tables: [
			{
				columns: [
					{ label: "المواد" },
					{ label: "الحضور", subLabel: "(١٠)" },
					{ label: "الاختبار", subLabel: "(٣٠)" },
					{ label: "الامتحان", subLabel: "(٦٠)" },
					{ label: "المجموع الكلي", subLabel: "(١٠٠)" },
				],
				rows: [
					{
						columns: [
							{ value: "١. القرآن" },
							{ value: 10 },
							{ value: 26 },
							{ value: 52 },
							{ value: 88 },
						],
					},
					{
						columns: [
							{ value: "٢. اللغة العربية" },
							{ value: 9 },
							{ value: 25 },
							{ value: 51 },
							{ value: 85 },
						],
					},
					{
						columns: [
							{ value: "٣. التربية الإسلامية" },
							{ value: 10 },
							{ value: 27 },
							{ value: 54 },
							{ value: 91 },
						],
					},
				],
			},
		],
	},
];
