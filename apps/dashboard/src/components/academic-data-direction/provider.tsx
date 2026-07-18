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
