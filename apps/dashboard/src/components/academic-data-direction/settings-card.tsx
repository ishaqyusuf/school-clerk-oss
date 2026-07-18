"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { cn } from "@school-clerk/ui/cn";
import { useMutation } from "@tanstack/react-query";
import { Languages, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
	AcademicDataDirectionMode,
	AcademicDataDirectionSettings,
} from "./provider";

const MODE_OPTIONS: {
	mode: AcademicDataDirectionMode;
	label: string;
	description: string;
}[] = [
	{
		mode: "AUTO",
		label: "Auto-detect",
		description: "Use the dominant direction in current academic data.",
	},
	{
		mode: "LTR",
		label: "Left to right",
		description: "Always keep academic tables and cards left to right.",
	},
	{
		mode: "RTL",
		label: "Right to left",
		description: "Always mirror academic tables and cards.",
	},
];

export function AcademicDataDirectionSettingsCard({
	canManage,
	initialSettings,
}: {
	canManage: boolean;
	initialSettings: AcademicDataDirectionSettings;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const [selectedMode, setSelectedMode] = useState<AcademicDataDirectionMode>(
		initialSettings.mode,
	);
	const updateDirection = useMutation(
		trpc.schoolSettings.updateAcademicDataDirection.mutationOptions({
			onError() {
				setSelectedMode(initialSettings.mode);
			},
			onSuccess() {
				router.refresh();
			},
			meta: {
				toastTitle: {
					error: "Unable to update academic data direction",
					loading: "Updating academic data direction...",
					success: "Academic data direction updated.",
				},
			},
		}),
	);

	const totalWeight = initialSettings.ltrWeight + initialSettings.rtlWeight;
	const rtlPercent =
		totalWeight > 0
			? Math.round((initialSettings.rtlWeight / totalWeight) * 100)
			: 0;

	const selectMode = (mode: AcademicDataDirectionMode) => {
		if (!canManage || updateDirection.isPending || mode === selectedMode)
			return;

		setSelectedMode(mode);
		updateDirection.mutate({ mode });
	};

	return (
		<Card className="sm:col-span-2" dir="ltr">
			<CardHeader className="gap-3">
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
							<Languages className="size-4 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<CardTitle className="text-base">
								Academic Data Direction
							</CardTitle>
							<CardDescription>
								Controls names, rosters, academic tables, and student cards.
								English navigation and controls remain left to right.
							</CardDescription>
						</div>
					</div>
					<Badge variant="outline" className="shrink-0">
						{initialSettings.direction === "rtl" ? "Using RTL" : "Using LTR"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div
					className="grid gap-2 md:grid-cols-3"
					role="radiogroup"
					aria-label="Academic data direction"
				>
					{MODE_OPTIONS.map((option) => {
						const selected = selectedMode === option.mode;

						return (
							<label
								key={option.mode}
								className={cn(
									"flex min-h-20 items-start rounded-md border border-input bg-background p-3 text-left text-sm shadow-xs transition-[color,box-shadow]",
									selected && "border-primary bg-primary/5 ring-1 ring-primary",
									canManage &&
										!updateDirection.isPending &&
										"cursor-pointer hover:bg-accent hover:text-accent-foreground",
									(!canManage || updateDirection.isPending) &&
										"cursor-not-allowed opacity-50",
								)}
							>
								<input
									type="radio"
									name="academic-data-direction"
									value={option.mode}
									checked={selected}
									disabled={!canManage || updateDirection.isPending}
									onChange={() => selectMode(option.mode)}
									className="sr-only"
								/>
								<span className="flex min-w-0 flex-1 items-start gap-2">
									{updateDirection.isPending && selected ? (
										<Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
									) : (
										<span
											className={cn(
												"mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/30",
												selected && "bg-primary",
											)}
										/>
									)}
									<span className="space-y-1">
										<span className="block text-sm font-medium">
											{option.label}
										</span>
										<span className="block text-xs font-normal text-muted-foreground">
											{option.description}
										</span>
									</span>
								</span>
							</label>
						);
					})}
				</div>

				<div className="rounded-lg border bg-muted/25 p-3 text-sm">
					{initialSettings.analyzedRecords > 0 ? (
						<p>
							Detection analyzed {initialSettings.analyzedRecords} academic
							values; {rtlPercent}% of the weighted evidence was RTL.
						</p>
					) : (
						<p>
							There is not enough directional academic data yet, so automatic
							mode defaults to LTR.
						</p>
					)}
					{!canManage ? (
						<p className="mt-1 text-xs text-muted-foreground">
							Only school administrators can change this setting.
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
