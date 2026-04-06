"use client";

import { useStudentParams } from "@/hooks/use-student-params";
import { Button } from "@school-clerk/ui/button";
import { PlusCircle } from "lucide-react";

export function AddStudentQuickLink() {
	const { setParams } = useStudentParams();

	return (
		<Button
			variant="outline"
			className="h-auto flex-col gap-2 py-5"
			onClick={() => setParams({ createStudent: true })}
		>
			<PlusCircle className="h-5 w-5" />
			<span className="text-sm font-medium">Add Student</span>
		</Button>
	);
}
