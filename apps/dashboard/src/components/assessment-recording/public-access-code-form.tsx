"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";

type Props = {
	classroomLabel: string | null;
	/** True when a saved code was rejected (for example, a new link was made). */
	hadGrant: boolean;
	onUnlocked: (accessGrant: string) => void;
	schoolName: string | null;
	token: string;
};

export function PublicAccessCodeForm({
	classroomLabel,
	hadGrant,
	onUnlocked,
	schoolName,
	token,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	const unlock = useMutation(
		trpc.assessments.unlockPublicAssessmentLink.mutationOptions({
			onError(mutationError) {
				setError(mutationError.message || "Could not check the code.");
				setCode("");
				// A link closed by too many tries should show its closed state.
				if (mutationError.data?.code === "FORBIDDEN") {
					void queryClient.invalidateQueries({
						queryKey: trpc.assessments.getPublicAssessmentLink.queryKey({
							token,
						}),
					});
				}
			},
			onSuccess(data) {
				setError(null);
				onUnlocked(data.accessGrant);
			},
		}),
	);

	const digits = code.replace(/\D/g, "");

	function submit(event: FormEvent) {
		event.preventDefault();
		if (digits.length !== 6 || unlock.isPending) return;
		unlock.mutate({ code: digits, token });
	}

	return (
		<form
			onSubmit={submit}
			className="mx-auto mt-8 flex max-w-sm flex-col gap-4 rounded-lg border bg-background p-5"
		>
			<div className="flex items-start gap-3">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
					<KeyRound className="size-4" aria-hidden="true" />
				</span>
				<div className="flex flex-col gap-1">
					<h2 className="text-base font-semibold">Enter the access code</h2>
					<p className="text-sm text-muted-foreground">
						{classroomLabel ? (
							<>
								To record scores for <bdi>{classroomLabel}</bdi>
								{schoolName ? (
									<>
										{" "}
										at <bdi>{schoolName}</bdi>
									</>
								) : null}
								, enter the 6-digit code the school gave you with this link.
							</>
						) : (
							"Enter the 6-digit code the school gave you with this link."
						)}
					</p>
				</div>
			</div>
			{hadGrant && !error ? (
				<p className="text-sm text-muted-foreground">
					Your saved code no longer works. Please enter it again.
				</p>
			) : null}
			<div className="flex flex-col gap-2">
				<Label htmlFor="public-access-code">Access code</Label>
				<Input
					id="public-access-code"
					autoComplete="one-time-code"
					autoFocus
					inputMode="numeric"
					maxLength={7}
					placeholder="000000"
					className="h-11 text-center font-mono text-lg tracking-[0.4em]"
					value={code}
					onChange={(event) => {
						setCode(event.target.value);
						if (error) setError(null);
					}}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? "public-access-code-error" : undefined}
				/>
				{error ? (
					<p
						id="public-access-code-error"
						role="alert"
						className="text-sm text-destructive"
					>
						{error}
					</p>
				) : null}
			</div>
			<Button
				type="submit"
				disabled={digits.length !== 6 || unlock.isPending}
			>
				{unlock.isPending ? "Checking…" : "Continue"}
			</Button>
		</form>
	);
}
