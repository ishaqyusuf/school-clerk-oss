"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";

type Props = {
	feeHistoryId: string | null;
	onClose: () => void;
};

export function ApplyFeeDialog({ feeHistoryId, onClose }: Props) {
	return (
		<AlertDialog open={Boolean(feeHistoryId)} onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Legacy fee application replaced</AlertDialogTitle>
					<AlertDialogDescription>
						Fee application now happens through standardized finance charges.
						Create a tuition, book, or service charge from the finance module.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
