"use client";

import { useStudentParams } from "@/hooks/use-student-params";
import { Button } from "@school-clerk/ui/button";
import { PlusCircle } from "lucide-react";

export function AddStudentQuickLink({
	layout = "tile",
}: {
	/** "tile" for the quick-links grid; "toolbar" for a page header action. */
	layout?: "tile" | "toolbar";
}) {
	const { setParams } = useStudentParams();

	return (
		<Button
			variant="outline"
			className={layout === "toolbar" ? "gap-2" : "h-auto flex-col gap-2 py-5"}
			onClick={() => setParams({ createStudent: true })}
		>
			<PlusCircle className={layout === "toolbar" ? "h-4 w-4" : "h-5 w-5"} />
			<span className="text-sm font-medium">Add Student</span>
		</Button>
	);
}
