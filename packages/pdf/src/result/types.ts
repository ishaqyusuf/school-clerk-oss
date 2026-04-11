export const resultTemplateSlugs = ["template-1"] as const;

export type ResultTemplateSlug = (typeof resultTemplateSlugs)[number];

export type ResultTemplateValue = string | number | null | undefined;

export interface ResultTemplateStudent {
	name?: string | null;
	surname?: string | null;
	otherName?: string | null;
}

export interface ResultTemplateComment {
	arabic?: string | null;
	english?: string | null;
}

export interface ResultTemplateGrade {
	obtained?: number | null;
	obtainable?: number | null;
	percentage?: number | null;
	position?: number | null;
	totalStudents?: number | null;
}

export interface ResultTemplateCell {
	value?: ResultTemplateValue;
}

export interface ResultTemplateColumn {
	label: string;
	subLabel?: string | null;
}

export interface ResultTemplateRow {
	columns: ResultTemplateCell[];
}

export interface ResultTemplateTable {
	columns: ResultTemplateColumn[];
	rows: ResultTemplateRow[];
}

export interface ResultTemplateReport {
	id?: string;
	student: ResultTemplateStudent;
	tables: ResultTemplateTable[];
	grade?: ResultTemplateGrade;
	comment?: ResultTemplateComment;
	lineCount?: number | null;
	classroom?: string | null;
	term?: string | null;
	academicYear?: string | null;
	returnDate?: string | null;
}

export interface ResultTemplateConfig {
	schoolName: string;
	schoolAddress?: string | null;
	academicYear?: string | null;
	term?: string | null;
	classroom?: string | null;
	returnDate?: string | null;
	commentLabel?: string | null;
	teacherSignature?: string | null;
	directorSignature?: string | null;
	signatureImageSrc?: string | null;
	calligraphs?: Record<string, string>;
}

export interface ResultTemplateProps {
	reports: ResultTemplateReport[];
	config: ResultTemplateConfig;
	template?: ResultTemplateSlug;
	title?: string;
}
