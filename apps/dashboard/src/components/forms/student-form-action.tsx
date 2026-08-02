import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "../static-trpc";
import { useStudentFormContext } from "../students/form-context";
import { toast } from "@school-clerk/ui/use-toast";
import { SubmitButton } from "../submit-button";
import { Button } from "@school-clerk/ui/button";
import { useStudentParams } from "@/hooks/use-student-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useRouter } from "next/navigation";

const currencyFormatter = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

export function StudentFormAction() {
	const router = useRouter();
	const studentParams = useStudentParams();
	const receivePaymentParams = useReceivePaymentParams();
	const { mutate, data, reset, isPending } = useMutation(
		_trpc.students.createStudent.mutationOptions({
			meta: {
				toastTitle: {
					error: "Something went wrong",
					loading: "Saving...",
					success: "Success",
				},
			},
			onSuccess(data, variables, context) {
				_qc.invalidateQueries({
					queryKey: _trpc.students.index.infiniteQueryKey(),
				});
				_qc.invalidateQueries({
					queryKey: _trpc.students.analytics.queryKey(),
				});

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
	const totalPayingNow = feePayments.reduce(
		(sum, payment) => sum + payment.amount,
		0,
	);

	const onSubmit = (formData) => {
		mutate(formData);
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
				<div>
					<p className="text-sm font-medium">Student created</p>
					<p className="text-xs text-muted-foreground">
						{paymentSummary.totalAllocated > 0
							? `${currencyFormatter.format(paymentSummary.totalAllocated)} received • ${currencyFormatter.format(paymentSummary.remainingBalance)} pending`
							: `${currencyFormatter.format(paymentSummary.remainingBalance)} assigned and pending`}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
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
						<Button size="sm" onClick={openReceipt}>
							View Receipt
						</Button>
					) : (
						<Button
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
		<div className="flex justify-end">
			<form
				onSubmit={handleSubmit(onSubmit, (arg) => {
					toast({
						title: "Invalid Form Data",
						variant: "error",
					});
				})}
			>
				<SubmitButton size="sm" isSubmitting={isPending}>
					{totalPayingNow > 0
						? `Create student & record ${currencyFormatter.format(totalPayingNow)}`
						: "Create student"}
				</SubmitButton>
			</form>
		</div>
	);
}
