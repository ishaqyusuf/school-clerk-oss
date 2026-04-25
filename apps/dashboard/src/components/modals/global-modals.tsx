"use client";
import { SearchModal } from "../search/search-modal";
import { StudentImportModal } from "./student-import";

export function GlobalModals() {
	return (
		<>
			<SearchModal />
			<StudentImportModal />
		</>
	);
}
