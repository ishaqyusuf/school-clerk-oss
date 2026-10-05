import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "@/hooks/use-auth";
import { useStudentFeePreview } from "@/hooks/use-student-fee-preview";
import { useStudentRegistrationPolicy } from "@/hooks/use-student-registration-policy";
import { useStudentFormContext } from "../students/form-context";
import { toast } from "@school-clerk/ui/use-toast";
import { SubmitButton } from "../submit-button";
import { Button } from "@school-clerk/ui/button";
import { useStudentParams } from "@/hooks/use-student-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { CreateStudentInput } from "@school-clerk/utils/student-create-schema";

const currencyFormatter = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

export function StudentFormAction({ onSaved }: { onSaved?: () => void } = {}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const registrationPolicy = useStudentRegistrationPolicy();
	const router = useRouter();
	const studentParams = useStudentParams();
	const receivePaymentParams = useReceivePaymentParams();
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const { mutate, data, error, reset, isPending } = useMutation(
		trpc.students.createStudent.mutationOptions({
			retry: false,
			meta: {
				toastTitle: {
					error: "Something went wrong",
					loading: "Saving...",
					success: "Success",
				},
			},
			onSuccess(data, variables, context) {
				queryClient.invalidateQueries({
					queryKey: trpc.students.index.infiniteQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.students.analytics.queryKey(),
				});
				if (!mounted.current) return;
				if (onSaved) {
					onSaved();
					return;
				}

				router.refresh();

				if (
					studentParams.createStudentReturnTo === "receive-payment" &&
					data.feePaymentSummary.totalAllocated > 0
				) {
					studentParams.setParams({ createStudentReturnTo: null });
				} else if (studentParams.createStudentReturnTo === "receive-payment") {
					receivePaymentParams.setParams({
						receivePayment: true,
						receivePaymentStudentId: data.id,
						receivePaymentCreatedStudentId: data.id,
						receivePaymentStudentName: null,
						receivePaymentReturnTo: "student-create",
					});
					studentParams.setParams({
						createStudent: null,
						createStudentPrefillName: null,
						createStudentReturnTo: null,
					});
				}
			},
		}),
	);
	const { handleSubmit, reset: resetForm, watch } = useStudentFormContext();
	const feePayments = watch("feePayments") ?? [];
	const classroomDepartmentId = watch("classRoomId") || null;
	const needsFeePreview = registrationPolicy.billingEnabled && Boolean(classroomDepartmentId || feePayments.length || watch("selectedOptionalFeeItemIds")?.length);
	const feePreview = useStudentFeePreview({
		sessionTermId: auth.profile?.termId || "", classroomDepartmentId,
		admissionType: watch("admissionType"), studentGender: watch("gender"),
	}, needsFeePreview && !data);
	const blockedByPreview = needsFeePreview && !feePreview.data;
	const blockedByPolicy = !registrationPolicy.ready;
	const totalPayingNow = feePayments.reduce(
		(sum, payment) => sum + payment.amount,
		0,
	);

	const scopeReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
		!!auth.id && !!auth.sessionId && !!auth.profile?.schoolId && auth.profile.auth?.userId === auth.id;
	const onSubmit = (formData: CreateStudentInput) => {
		if (!scopeReady) {
			toast({ title: "Your registration workspace is unavailable. Reopen the form before saving.", variant: "error" });
			return;
		}
		if (isPending || blockedByPreview || blockedByPolicy) {
			if (blockedByPreview) toast({ title: "Review a current fee preview before creating this enrollment or payment.", variant: "error" });
			return;
		}
		mutate({ ...formData, submissionScope: {
			schoolId: auth.profile!.schoolId!, userId: auth.id!, loginSessionId: auth.sessionId!,
			schoolSessionId: auth.profile?.sessionId || null, sessionTermId: auth.profile?.termId || null,
		} });
	};

	if (data && studentParams.createStudentReturnTo !== "receive-payment") {
		const paymentSummary = data.feePaymentSummary;
		const openReceipt = () => {
			if (!paymentSummary.paymentIds.length) return;
			const searchParams = new URLSearchParams({
				paymentIds: paymentSummary.paymentIds.join(","),
			});
			window.open(
				`/api/pdf/student-payment-receipt?${searchParams.toString()}`,
				"_blank",
				"noopener,noreferrer",
			);
		};

		return (
			<div className="flex w-full flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-medium">Student created</p>
					<p className="text-xs text-muted-foreground">
						{paymentSummary.totalAllocated > 0
							? `${currencyFormatter.format(paymentSummary.totalAllocated)} received • ${currencyFormatter.format(paymentSummary.remainingBalance)} pending`
							: `${currencyFormatter.format(paymentSummary.remainingBalance)} assigned and pending`}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						className="min-h-11"
						size="sm"
						variant="outline"
						onClick={() => {
							reset();
							resetForm();
						}}
					>
						Create New
					</Button>
					<Button
						className="min-h-11"
						size="sm"
						variant="outline"
						onClick={() => {
							reset();
							studentParams.setParams({
								createStudent: null,
								createStudentPrefillName: null,
								createStudentReturnTo: null,
							});
						}}
					>
						Close
					</Button>
					{paymentSummary.paymentIds.length > 0 ? (
						<Button className="min-h-11" size="sm" onClick={openReceipt}>
							View Receipt
						</Button>
					) : (
						<Button
							className="min-h-11"
							size="sm"
							onClick={() => {
								reset();
								receivePaymentParams.setParams({
									receivePayment: true,
									receivePaymentStudentId: data.id,
									receivePaymentCreatedStudentId: data.id,
									receivePaymentStudentName: null,
									receivePaymentReturnTo: "student-create",
								});
								studentParams.setParams({
									createStudent: null,
									createStudentPrefillName: null,
									createStudentReturnTo: null,
								});
							}}
						>
							Apply Payment
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full min-w-0 flex-col items-end gap-3">
			{error ? (
				<p role="alert" className="w-full break-words text-sm text-destructive">
					{error.message} If the response was interrupted, check the student directory before submitting again.
				</p>
			) : null}
			<form
				className="w-full sm:w-auto"
				onSubmit={handleSubmit(onSubmit, (arg) => {
					toast({
						title: "Invalid Form Data",
						variant: "error",
					});
				})}
			>
				<SubmitButton className="min-h-11 w-full whitespace-normal" size="sm" isSubmitting={isPending} disabled={blockedByPreview || blockedByPolicy || !scopeReady}>
					{blockedByPolicy ? "Check registration settings" : blockedByPreview ? "Review fee preview" : totalPayingNow > 0
						? `Create student & record ${currencyFormatter.format(totalPayingNow)}`
						: "Create student"}
				</SubmitButton>
			</form>
		</div>
	);
}
