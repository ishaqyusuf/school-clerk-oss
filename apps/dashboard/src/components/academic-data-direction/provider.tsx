"use client";

import { cn } from "@school-clerk/ui/cn";
import { type ReactNode, createContext, useContext } from "react";

export type AcademicDataDirectionMode = "AUTO" | "LTR" | "RTL";
export type DataDirection = "ltr" | "rtl";

export interface AcademicDirectionSourceSummary {
	analyzed: number;
	ltr: number;
	rtl: number;
}

export interface AcademicDataDirectionSettings {
	mode: AcademicDataDirectionMode;
	direction: DataDirection;
	analyzedRecords: number;
	ltrWeight: number;
	rtlWeight: number;
	sources: Record<string, AcademicDirectionSourceSummary>;
}

const AcademicDataDirectionContext = createContext<DataDirection>("ltr");

export function AcademicDataDirectionProvider({
	children,
	direction,
}: {
	children: ReactNode;
	direction: DataDirection;
}) {
	return (
		<AcademicDataDirectionContext.Provider value={direction}>
			{children}
		</AcademicDataDirectionContext.Provider>
	);
}

export function useAcademicDataDirection() {
	return useContext(AcademicDataDirectionContext);
}

const RTL_STRONG_CHARACTER =
	/[\u0590-\u05ff\u0600-\u06ff\u0700-\u074f\u0750-\u077f\u0780-\u07bf\u07c0-\u07ff\u0800-\u083f\u0840-\u085f\u08a0-\u08ff\ufb1d-\ufb4f\ufb50-\ufdff\ufe70-\ufefc\u{10d00}-\u{10d3f}\u{1e900}-\u{1e95f}]/u;
const LETTER_CHARACTER = /\p{Letter}/u;

export function resolveRosterDataDirection(
	values: readonly string[],
	fallback: DataDirection,
): DataDirection {
	let ltr = 0;
	let rtl = 0;

	for (const value of values) {
		for (const character of value.trim()) {
			if (RTL_STRONG_CHARACTER.test(character)) {
				rtl += 1;
				break;
			}
			if (LETTER_CHARACTER.test(character)) {
				ltr += 1;
				break;
			}
		}
	}

	if (rtl === ltr) return fallback;
	return rtl > ltr ? "rtl" : "ltr";
}

export function AcademicDataSurface({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	const direction = useAcademicDataDirection();

	return (
		<div className={cn(className)} dir={direction}>
			{children}
		</div>
	);
}
