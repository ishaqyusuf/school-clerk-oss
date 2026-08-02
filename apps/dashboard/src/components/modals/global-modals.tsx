"use client";
import { SearchModal } from "../search/search-modal";
import { AddFeeModal } from "./add-fee-modal";
import { PaymentImportModal } from "./payment-import";
import { StudentImportModal } from "./student-import";

export function GlobalModals() {
	return (
		<>
			<AddFeeModal />
			<SearchModal />
			<StudentImportModal />
			<PaymentImportModal />
		</>
	);
}
