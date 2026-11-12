"use client";

import {
	focusScoreCell,
	getScoreGridMove,
	parseScoreInput,
} from "@/components/assessment-recording/score-entry";
import type { ScoreSaveRequest } from "@/components/assessment-recording/score-save-queue";
import {
	getScoreSaveQueue,
	useScoreSaveEntry,
} from "@/components/assessment-recording/score-save-status";
import { cn } from "@school-clerk/ui/cn";
import { TableCell } from "@school-clerk/ui/table";
import { Check } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

type ScoreResult = {
	id?: number | null;
	obtained?: number | null;
	percentageScore?: number | null;
	studentTermFormId?: string | null;
	studentId?: string | null;
};

type Props = {
	assessmentId: number;
	obtainable: number | null;
	studentTermFormId: string;
	studentId: string | undefined;
	departmentSubjectId: string;
	dividerClass?: string;
	publicToken?: string | null;
	result?: ScoreResult | null;
	/** Grid position for keyboard entry (Enter/arrows move between cells). */
	gridRow?: number;
	gridCol?: number;
	/** Accessible name, e.g. "Student name, Exam (100)". */
	label?: string;
	/** Cell width classes; defaults to the compact 70px column. */
	widthClass?: string;
};

const formatScore = (value: number | null | undefined) =>
	value != null ? String(value) : "";

export const AssessmentResultsScoreCell = memo(
	function AssessmentResultsScoreCell({
		assessmentId,
		obtainable,
		studentTermFormId,
		studentId,
		departmentSubjectId,
		dividerClass,
		publicToken,
		result,
		gridRow,
		gridCol,
		label,
		widthClass = "w-[70px] min-w-[70px] max-w-[70px]",
	}: Props) {
		const [isEditing, setIsEditing] = useState(false);
		const canonicalValue = formatScore(result?.obtained);
		const [localValue, setLocalValue] = useState<string>(canonicalValue);
		const [invalidReason, setInvalidReason] = useState<string | null>(null);
		const [justSaved, setJustSaved] = useState(false);
		const inputRef = useRef<HTMLInputElement>(null);
		const hasPendingLocalValueRef = useRef(false);
		const invalidReasonRef = useRef<string | null>(null);
		const lastCanonicalValueRef = useRef(canonicalValue);
		const saveKey = `${studentTermFormId}:${assessmentId}`;
		const queued = useScoreSaveEntry(saveKey);
		const gridProps =
			gridRow != null && gridCol != null
				? { "data-score-row": gridRow, "data-score-col": gridCol }
				: {};

		useEffect(() => {
			if (!isEditing) return;
			inputRef.current?.focus();
			inputRef.current?.select();
		}, [isEditing]);

		useEffect(() => {
			if (canonicalValue === lastCanonicalValueRef.current) return;

			lastCanonicalValueRef.current = canonicalValue;
			if (!hasPendingLocalValueRef.current) {
				setLocalValue(canonicalValue);
			}
		}, [canonicalValue]);

		// A value still in the outbox (typed before a subject switch or reload)
		// wins over the possibly stale server value.
		useEffect(() => {
			const pending = getScoreSaveQueue()?.getEntryState(saveKey);
			if (!pending) return;
			hasPendingLocalValueRef.current = true;
			setLocalValue(formatScore(pending.value));
		}, [saveKey]);

		// The outbox only reports "saved" when nothing newer is queued for this cell.
		useEffect(() => {
			const queue = getScoreSaveQueue();
			if (!queue) return;
			let checkTimer: ReturnType<typeof setTimeout> | undefined;
			const unsubscribe = queue.onSaved(saveKey, (saved) => {
				// Keep text the user is still fixing; it was never queued.
				if (invalidReasonRef.current) return;
				hasPendingLocalValueRef.current = false;
				setLocalValue(formatScore(saved.obtained));
				setJustSaved(true);
				clearTimeout(checkTimer);
				checkTimer = setTimeout(() => setJustSaved(false), 1500);
			});
			return () => {
				unsubscribe();
				clearTimeout(checkTimer);
			};
		}, [saveKey]);

		const buildRequest = (obtained: number | null): ScoreSaveRequest =>
			publicToken
				? {
						kind: "public",
						payload: {
							id: result?.id,
							obtained,
							assessmentId,
							studentTermId: studentTermFormId,
							studentId: studentId ?? "",
							departmentSubjectId,
							token: publicToken,
						},
					}
				: {
						kind: "authenticated",
						payload: {
							id: result?.id,
							obtained,
							assessmentId,
							studentTermId: studentTermFormId,
							studentId: studentId ?? "",
							departmentId: departmentSubjectId,
						},
					};

		const setInvalid = (reason: string | null) => {
			invalidReasonRef.current = reason;
			setInvalidReason(reason);
		};

		const updateValue = (value: string) => {
			setLocalValue(value);
			setJustSaved(false);
			hasPendingLocalValueRef.current = true;
			const queue = getScoreSaveQueue();
			const parsed = parseScoreInput(value, obtainable);
			if (parsed.error) {
				// Invalid input is never sent; drop any older unsent value too.
				queue?.cancel(saveKey);
				setInvalid(parsed.error);
				return;
			}
			setInvalid(null);
			queue?.enqueue(saveKey, buildRequest(parsed.value));
		};

		const restoreSavedValue = () => {
			getScoreSaveQueue()?.cancel(saveKey);
			hasPendingLocalValueRef.current = false;
			setInvalid(null);
			setLocalValue(canonicalValue);
		};

		const saveFailed = queued?.status === "failed";
		const saveRetrying = queued?.status === "retrying";
		const saveStateClassName = saveFailed
			? "border border-destructive"
			: saveRetrying
				? "border border-amber-400/70 bg-amber-50/60 dark:border-amber-500/50 dark:bg-amber-950/20"
				: undefined;
		const invalidClassName = invalidReason ? "text-destructive" : undefined;
		const cellTitle =
			invalidReason ??
			(saveFailed
				? `Not saved: ${queued?.error ?? "the server rejected this score"}`
				: saveRetrying
					? "Not saved yet. Retrying automatically."
					: undefined);

		if (!isEditing) {
			return (
				<TableCell
					className={cn(
						widthClass,
						"cursor-pointer border-l p-0 text-center transition-colors hover:bg-accent/50",
						dividerClass,
						saveStateClassName,
					)}
					onClick={() => setIsEditing(true)}
				>
					<div
						{...gridProps}
						role={gridRow != null ? "button" : undefined}
						tabIndex={gridRow != null ? 0 : undefined}
						aria-label={label}
						onFocus={() => setIsEditing(true)}
						className="flex h-full min-h-9 w-full items-center justify-center px-1 py-2 outline-none"
					>
						<span
							className={cn(
								"text-sm",
								localValue === "" && "text-muted-foreground",
								invalidClassName,
							)}
							title={cellTitle}
						>
							{localValue !== "" ? localValue : "-"}
						</span>
					</div>
				</TableCell>
			);
		}

		return (
			<TableCell
				className={cn(
					widthClass,
					"border-l p-0 text-center",
					dividerClass,
					saveStateClassName,
				)}
			>
				<div className="relative flex min-h-9 w-full items-center">
					<input
						{...gridProps}
						ref={inputRef}
						type="text"
						inputMode="decimal"
						autoComplete="off"
						aria-label={label}
						aria-invalid={saveFailed || Boolean(invalidReason)}
						title={cellTitle}
						className={cn(
							"h-9 w-full min-w-0 bg-transparent px-0 pr-5 text-center text-sm outline-none",
							"border-0 focus:bg-accent/40 focus:ring-0 focus-visible:ring-0",
							gridRow != null && "[@media(any-pointer:coarse)]:text-base",
							invalidClassName,
						)}
						value={localValue}
						onBlur={() => {
							// Leaving the cell sends right away; the outbox keeps retrying.
							getScoreSaveQueue()?.flush(saveKey);
							setTimeout(() => setIsEditing(false), 200);
						}}
						onChange={(event) => updateValue(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								event.preventDefault();
								restoreSavedValue();
								return;
							}
							const move = getScoreGridMove(event.key, event.shiftKey);
							if (move && focusScoreCell(event.currentTarget, move)) {
								event.preventDefault();
							}
						}}
						placeholder="-"
					/>
					{justSaved ? (
						<div className="pointer-events-none absolute right-1 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center">
							<Check className="size-3 text-green-500" />
						</div>
					) : null}
				</div>
			</TableCell>
		);
	},
);
