"use client";

import { cn } from "@school-clerk/ui/cn";
import { Spinner } from "@school-clerk/ui/spinner";
import { TableCell } from "@school-clerk/ui/table";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { _qc, _trpc } from "./static-trpc";

type ScoreResult = {
	id?: number | null;
	obtained?: number | null;
	percentageScore?: number | null;
	studentTermFormId?: string | null;
	studentId?: string | null;
};

type Props = {
	assessmentId: number;
	obtainable: number;
	studentTermFormId: string;
	studentId: string | undefined;
	departmentSubjectId: string;
	dividerClass?: string;
	result?: ScoreResult | null;
};

export function AssessmentResultsScoreCell({
	assessmentId,
	obtainable,
	studentTermFormId,
	studentId,
	departmentSubjectId,
	dividerClass,
	result,
}: Props) {
	const [isEditing, setIsEditing] = useState(false);
	const [localValue, setLocalValue] = useState<string>(
		result?.obtained != null ? String(result.obtained) : "",
	);
	const displayValue = useDeferredValue(localValue);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isEditing) return;
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [isEditing]);

	const { isPending, mutate, isSuccess, error, reset } = useMutation(
		_trpc.assessments.updateAssessmentScore.mutationOptions({
			onSuccess(data) {
				setLocalValue(data.obtained != null ? String(data.obtained) : "");
				_qc.invalidateQueries({
					queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
				});
				_qc.invalidateQueries({
					queryKey:
						_trpc.assessments.getSubjectAssessmentRecordings.queryKey({}),
				});
				setTimeout(() => {
					reset();
				}, 1500);
			},
		}),
	);

	const handleSave = useDebouncedCallback((value: string) => {
		const numValue = value ? +value : null;
		mutate({
			id: result?.id,
			obtained: numValue,
			assessmentId,
			studentTermId: studentTermFormId,
			studentId: studentId ?? "",
			departmentId: departmentSubjectId,
		});
	}, 600);

	if (!isEditing) {
		return (
			<TableCell
				className={cn(
					"text-center cursor-pointer hover:bg-accent/50 transition-colors min-w-[70px] p-0",
					dividerClass,
				)}
				onClick={() => setIsEditing(true)}
			>
				<div className="flex items-center justify-center h-full py-2 px-1">
					<span
						className={cn(
							"text-sm",
							result?.obtained == null && "text-muted-foreground",
						)}
					>
						{result?.obtained != null ? result.obtained : "-"}
					</span>
				</div>
			</TableCell>
		);
	}

	return (
		<TableCell className={cn("text-center p-0 min-w-[70px]", dividerClass)}>
			<div className="flex items-center gap-1">
				<input
					ref={inputRef}
					type="number"
					className={cn(
						"w-full h-8 text-center text-sm bg-transparent border-0 outline-none",
						"focus:ring-1 focus:ring-primary rounded",
						"[appearance:textfield]",
						"[&::-webkit-inner-spin-button]:appearance-none",
						"[&::-webkit-outer-spin-button]:appearance-none",
						+displayValue > obtainable && "text-destructive",
					)}
					defaultValue={displayValue}
					onBlur={() => {
						setTimeout(() => setIsEditing(false), 200);
					}}
					onChange={(event) => {
						setLocalValue(event.target.value);
						handleSave(event.target.value);
					}}
					onKeyDown={(event) => {
						if (event.key === "Escape") {
							setIsEditing(false);
						}
					}}
					placeholder="-"
				/>
				<div className="w-4 mr-1">
					{isPending ? (
						<Spinner size={12} />
					) : error ? (
						<AlertCircle className="text-destructive size-3" />
					) : isSuccess ? (
						<Check className="text-green-500 size-3" />
					) : null}
				</div>
			</div>
		</TableCell>
	);
}
