"use client";

import { useTRPC } from "@/trpc/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SignatureUploader } from "./signature-uploader";

/** Lets a signed-in staff member add the signature printed on their class reports. */
export function MySignatureCard() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(trpc.reportCards.getMySignature.queryOptions());
	const update = useMutation(
		trpc.reportCards.updateStaffSignature.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.reportCards.getMySignature.queryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to save your signature",
					loading: "Saving signature...",
					success: "Signature saved.",
				},
			},
		}),
	);

	if (isPending || !data) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>My signature</CardTitle>
				<CardDescription>
					Printed in the class teacher's signature space on report cards for
					the classes you teach. A photo of your signature on white paper works
					best.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SignatureUploader
					value={data.signatureUrl}
					disabled={update.isPending}
					onChange={(signatureUrl) => update.mutate({ signatureUrl })}
				/>
			</CardContent>
		</Card>
	);
}
