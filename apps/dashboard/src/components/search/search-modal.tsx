"use client";

import { useSearchStore } from "@/store/search";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import { useHotkeys } from "react-hotkeys-hook";
import { SearchPanel } from "./search";

export function SearchModal() {
	const isOpen = useSearchStore((state) => state.isOpen);
	const setOpen = useSearchStore((state) => state.setOpen);
	const toggle = useSearchStore((state) => state.toggle);

	useHotkeys(
		"meta+k,ctrl+k",
		(event) => {
			event.preventDefault();
			toggle();
		},
		{ enableOnFormTags: true },
	);

	return (
		<Dialog open={isOpen} onOpenChange={setOpen}>
			<DialogContent
				className="overflow-hidden border-none bg-transparent p-0 shadow-none sm:max-w-[760px]"
				hideClose
			>
				<DialogTitle className="sr-only">Search</DialogTitle>
				<DialogDescription className="sr-only">
					Search across students, classrooms, finance, and school records.
				</DialogDescription>
				{isOpen ? <SearchPanel /> : null}
			</DialogContent>
		</Dialog>
	);
}
