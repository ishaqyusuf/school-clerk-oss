"use client";

import {
	type ReportFit,
	computeReportFit,
} from "@school-clerk/utils/report-card";
import {
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { REPORT_BASE_GAP, REPORT_BASE_ROW_PAD } from "../../content";

type FitRefs = {
	area: RefObject<HTMLDivElement | null>;
	sections: RefObject<HTMLElement | null>[];
};

const MAX_REFITS = 4;

const DEFAULT_FIT: ReportFit = {
	rowPad: REPORT_BASE_ROW_PAD,
	gap: 0,
	scale: 1,
	slack: 0,
};

/**
 * Measures the page sections and works out row padding, section spacing and
 * (only when needed) a scale so the report fills exactly one page. The same
 * values apply on screen and in print because both use the A4 page box.
 */
export function useReportCardFit({
	enabled,
	rows,
	gaps,
	refs,
	dependencyKey,
}: {
	enabled: boolean;
	rows: number;
	gaps: number;
	refs: FitRefs;
	dependencyKey: string;
}) {
	const [fit, setFit] = useState<ReportFit>(DEFAULT_FIT);
	const fitRef = useRef(fit);
	fitRef.current = fit;
	// Refitting can change how text wraps, which changes the height again. Cap
	// the refits per content change so the page settles instead of flickering.
	const refits = useRef({ key: dependencyKey, count: 0 });
	if (refits.current.key !== dependencyKey) {
		refits.current = { key: dependencyKey, count: 0 };
	}

	const measure = useCallback(() => {
		const area = refs.area.current;
		if (!area) return;
		if (!enabled) {
			if (fitRef.current !== DEFAULT_FIT) setFit(DEFAULT_FIT);
			return;
		}
		// clientHeight includes padding (the framed template pads inside its border).
		const areaStyle = getComputedStyle(area);
		const pageHeight =
			area.clientHeight -
			Number.parseFloat(areaStyle.paddingTop) -
			Number.parseFloat(areaStyle.paddingBottom);
		if (!pageHeight) return;
		const current = fitRef.current;
		const measured = refs.sections.reduce(
			(total, ref) => total + (ref.current?.offsetHeight ?? 0),
			0,
		);
		// Remove what the current fit added so we always start from the natural size.
		const natural =
			measured -
			2 * rows * (current.rowPad - REPORT_BASE_ROW_PAD) +
			gaps * REPORT_BASE_GAP;
		const next = computeReportFit({
			// Keep a small safety margin so rounding never spills onto a new sheet.
			pageHeight: pageHeight - 4,
			contentHeight: natural,
			rows,
			gaps,
			basePad: REPORT_BASE_ROW_PAD,
		});
		const changed =
			Math.abs(next.rowPad - current.rowPad) > 0.5 ||
			Math.abs(next.gap - current.gap) > 0.5 ||
			Math.abs(next.scale - current.scale) > 0.005;
		if (!changed || refits.current.count >= MAX_REFITS) return;
		refits.current.count += 1;
		setFit(next);
	}, [enabled, gaps, refs, rows]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: dependencyKey re-measures when the content changes.
	useLayoutEffect(() => {
		measure();
		let cancelled = false;
		void document.fonts?.ready.then(() => {
			if (!cancelled) measure();
		});
		const observer = new ResizeObserver(() => measure());
		if (refs.area.current) observer.observe(refs.area.current);
		for (const ref of refs.sections) {
			if (ref.current) observer.observe(ref.current);
		}
		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, [measure, refs, dependencyKey]);

	return fit;
}
