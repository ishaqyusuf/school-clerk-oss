"use client";
import { SearchModal } from "../search/search-modal";
import { PaymentImportModal } from "./payment-import";
import { StudentImportModal } from "./student-import";

export function GlobalModals() {
	return (
		<>
			<SearchModal />
			<StudentImportModal />
			<PaymentImportModal />
		</>
	);
}
