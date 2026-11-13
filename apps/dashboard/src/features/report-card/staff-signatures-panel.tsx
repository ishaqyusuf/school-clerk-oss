"use client";

import { useTRPC } from "@/trpc/client";
import { Input } from "@school-clerk/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SignatureUploader } from "./signature-uploader";

/** Admin view of every staff member's saved signature. */
export function StaffSignaturesPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const { data: staff, isPending } = useQuery(trpc.reportCards.listStaffSignatures.queryOptions());
	const update = useMutation(
		trpc.reportCards.updateStaffSignature.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.reportCards.listStaffSignatures.queryKey(),
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.reportCards.getPrintContext.queryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to save the signature",
					loading: "Saving signature...",
					success: "Signature saved.",
				},
			},
		}),
	);
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		return (staff ?? []).filter((member) => !query || member.name.toLocaleLowerCase().includes(query));
	}, [search, staff]);

	return (
		<section className="flex flex-col gap-3">
			<div className="space-y-1">
				<h3 className="text-sm font-semibold">Staff signatures</h3>
				<p className="text-xs text-muted-foreground">
					Teachers can add their own from their workspace. You can add or replace any of
					them here.
				</p>
			</div>
			{(staff?.length ?? 0) > 6 ? (
				<Input placeholder="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} />
			) : null}
			{isPending ? (
				<p className="text-xs text-muted-foreground">Loading staff…</p>
			) : filtered.length ? (
				<ul className="flex flex-col divide-y rounded-md border">
					{filtered.map((member) => (
						<li key={member.id} className="flex flex-col gap-2 p-3">
							<span className="text-sm font-medium">
								{member.name}
								{member.title ? (
									<span className="ms-1 text-xs font-normal text-muted-foreground">· {member.title}</span>
								) : null}
							</span>
							<SignatureUploader
								value={member.signatureUrl}
								disabled={update.isPending}
								onChange={(signatureUrl) => update.mutate({ staffId: member.id, signatureUrl })}
							/>
						</li>
					))}
				</ul>
			) : (
				<p className="text-xs text-muted-foreground">No staff found.</p>
			)}
		</section>
	);
}
