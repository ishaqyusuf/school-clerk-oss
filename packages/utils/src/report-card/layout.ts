export type ReportFitInput = {
	/** Usable page height inside the margins, in px. */
	pageHeight: number;
	/** Measured height of the page content at the base row padding, in px. */
	contentHeight: number;
	/** Number of subject rows whose vertical padding can grow or shrink. */
	rows: number;
	/** Number of section gaps (header, tables, comments, signatures) that can grow. */
	gaps: number;
	basePad: number;
	minPad?: number;
	maxPad?: number;
	maxGap?: number;
};

export type ReportFit = {
	/** Vertical padding for each subject cell, in px. */
	rowPad: number;
	/** Extra space added to each section gap, in px. */
	gap: number;
	/** Uniform scale applied when the content cannot fit even at minimum padding. */
	scale: number;
	/** Remaining free space at the bottom of the page, in px. */
	slack: number;
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Works out how a single report should fill one page. Short reports (lower
 * classes with few subjects) get taller rows and wider section spacing; long
 * reports tighten their rows and, as a last resort, scale down so the page
 * never spills onto a second sheet.
 */
export function computeReportFit(input: ReportFitInput): ReportFit {
	const minPad = input.minPad ?? 2;
	const maxPad = input.maxPad ?? 30;
	const maxGap = input.maxGap ?? 40;
	const rows = Math.max(0, input.rows);
	const gaps = Math.max(0, input.gaps);
	const free = input.pageHeight - input.contentHeight;

	if (!Number.isFinite(free) || input.pageHeight <= 0) {
		return { rowPad: input.basePad, gap: 0, scale: 1, slack: 0 };
	}

	if (free >= 0) {
		// Give two thirds of the free space to the table, the rest to section gaps.
		const rowShare = gaps ? free * (2 / 3) : free;
		const rowPad = rows
			? Math.min(maxPad, input.basePad + rowShare / (2 * rows))
			: input.basePad;
		const usedByRows = rows ? 2 * rows * (rowPad - input.basePad) : 0;
		const gap = gaps ? Math.min(maxGap, (free - usedByRows) / gaps) : 0;
		const slack = free - usedByRows - gap * gaps;
		return {
			rowPad: round(rowPad),
			gap: round(Math.max(0, gap)),
			scale: 1,
			slack: round(slack),
		};
	}

	const shrinkable = rows ? 2 * rows * (input.basePad - minPad) : 0;
	if (-free <= shrinkable) {
		const rowPad = input.basePad + free / (2 * rows);
		return { rowPad: round(rowPad), gap: 0, scale: 1, slack: 0 };
	}

	const tightHeight = input.contentHeight - shrinkable;
	const scale = Math.max(0.5, input.pageHeight / tightHeight);
	return {
		rowPad: minPad,
		gap: 0,
		scale: Math.floor(scale * 1000) / 1000,
		slack: 0,
	};
}

/** Density tier used for font sizes before measuring (and in server renders). */
export function reportDensity(lineCount: number) {
	if (lineCount > 12) return "dense" as const;
	if (lineCount > 8) return "regular" as const;
	if (lineCount > 5) return "relaxed" as const;
	return "spacious" as const;
}
