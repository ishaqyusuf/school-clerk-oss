import type {
	ReportCardConfig,
	ReportCardTemplateId,
} from "@school-clerk/utils/report-card";

export type ReportCardTable = {
	columns: { label?: string; subLabel?: string }[];
	rows: { columns: { value?: string | number | null }[] }[];
};

/** One student's scores, independent of how the school's template draws them. */
export type ReportCardData = {
	id: string;
	/** Name parts in the school's name order, before calligraphy. */
	nameParts: string[];
	classroomName: string;
	tables: ReportCardTable[];
	grade: {
		obtained: number;
		obtainable: number;
		percentage: number;
		position: number;
		totalStudents: number;
	};
};

export type ReportCardTerm = {
	title?: string | null;
	sessionTitle?: string | null;
	resumptionDate?: Date | string | null;
};

export type ReportCardRenderProps = {
	templateId: ReportCardTemplateId;
	config: ReportCardConfig;
	report: ReportCardData;
	term: ReportCardTerm;
	teacherSignatureUrl?: string | null;
};
