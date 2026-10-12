"use client";
import { Button } from "@school-clerk/ui/button";
import { CheckCircle2, Clock3 } from "lucide-react";
import { AssistantRecords } from "./assistant-records";
import {
	assistantToolInfo,
	assistantResultSchema,
} from "@school-clerk/ai/contracts";
const label = (key: string) =>
	key.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
export function ResultDetails({
	value,
	depth = 0,
}: { value: unknown; depth?: number }) {
	if (value === null || value === undefined)
		return <span className="text-muted-foreground">Not available</span>;
	if (typeof value !== "object")
		return (
			<span className="break-words">
				{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
			</span>
		);
	if (depth > 3)
		return <span>Additional details available in the record.</span>;
	if (Array.isArray(value))
		return value.length ? (
			<div className="space-y-2">
				{value.slice(0, 50).map((item, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: This is an immutable result snapshot.
					<div key={index} className="border-l-2 pl-3">
						<ResultDetails value={item} depth={depth + 1} />
					</div>
				))}
			</div>
		) : (
			<span className="text-muted-foreground">No matching records.</span>
		);
	return (
		<dl className="grid min-w-0 grid-cols-1 gap-2 text-sm">
			{Object.entries(value)
				.filter(
					([key]) =>
						!["confirmationToken", "receipt", "toolName"].includes(key),
				)
				.map(([key, item]) => (
					<div key={key} className="min-w-0">
						<dt className="text-xs capitalize text-muted-foreground">
							{label(key)}
						</dt>
						<dd className="mt-0.5">
							<ResultDetails value={item} depth={depth + 1} />
						</dd>
					</div>
				))}
		</dl>
	);
}
export function AssistantResult({
	output,
	onDecide,
	busy,
	onArtifact,
	proposalStatuses,
}: {
	output: unknown;
	proposalStatuses: {
		id?: string;
		status?: string;
		expiresAt?: string | Date;
	}[];
	onDecide: (id: string, approve: boolean) => void;
	busy: boolean;
	onArtifact: (value: unknown) => void;
}) {
	const parsed = assistantResultSchema.safeParse(output);
	if (!parsed.success)
		return (
			<div className="rounded-lg border p-4">
				<ResultDetails value={output} />
			</div>
		);
	const result = parsed.data;
	const data = result.data as Record<string, unknown> | null;
	const proposal = proposalStatuses.find((p) => p.id === data?.proposalId);
	const decision =
		proposal?.status !== "pending"
			? proposal?.status
			: new Date(proposal.expiresAt ?? 0) <= new Date()
				? "expired"
				: undefined;
	return (
		<section className="my-2 min-w-0 rounded-lg border bg-card p-4">
			<div className="mb-3 flex items-center gap-2 text-sm font-medium">
				{result.status === "requires_approval" ? (
					<Clock3 className="size-4" />
				) : result.status === "success" ? (
					<CheckCircle2 className="size-4" />
				) : (
					<span aria-label="Unavailable">!</span>
				)}
				{assistantToolInfo(result.toolId)?.title ?? label(result.toolId)}
			</div>
			{result.status === "requires_approval" && data ? (
				<>
					<p className="mb-3 text-sm">{String(data.summary)}</p>
					<ResultDetails value={data.actionInput} />
					<p className="mt-3 text-xs text-muted-foreground">
						Review these details. Approval expires after ten minutes; changed
						records need a new review.
					</p>
					{decision ? (
						<p className="mt-3 text-sm capitalize">
							Action {decision}. See saved actions for committed results.
						</p>
					) : (
						<div className="mt-3 flex flex-wrap gap-2">
							<Button
								disabled={busy}
								onClick={() => onDecide(String(data.proposalId), true)}
							>
								Approve action
							</Button>
							<Button
								disabled={busy}
								variant="outline"
								onClick={() => onDecide(String(data.proposalId), false)}
							>
								Decline
							</Button>
						</div>
					)}
				</>
			) : (
				<>
					<AssistantRecords toolId={result.toolId} data={data} />
					<div className="mt-2 flex gap-3 text-xs">
						{result.sources
							.filter(
								(source) =>
									source.href.startsWith("/") && !source.href.startsWith("//"),
							)
							.map((source) => (
								<a key={source.href} href={source.href} className="underline">
									Open {source.label.toLowerCase()}
								</a>
							))}
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="mt-2"
						onClick={() => onArtifact(result)}
					>
						Open result
					</Button>
				</>
			)}
		</section>
	);
}
