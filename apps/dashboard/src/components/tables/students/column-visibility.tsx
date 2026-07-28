"use client";

import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@school-clerk/ui/popover";
import { SlidersHorizontal } from "lucide-react";
import { useStudentsTableStore } from "./store";

export function StudentsColumnVisibility() {
	const { columns, showColumnDividers, setShowColumnDividers } =
		useStudentsTableStore();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					aria-label="Student table settings"
				>
					<SlidersHorizontal className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[240px] p-0" align="end" sideOffset={8}>
				<div className="flex max-h-[450px] flex-col gap-2 overflow-auto p-4">
					<label className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={showColumnDividers}
							onCheckedChange={(checked) =>
								setShowColumnDividers(checked === true)
							}
						/>
						Column dividers
					</label>
					<div className="my-1 border-t border-border" />
					{columns
						.filter((column) => column.columnDef.enableHiding !== false)
						.map((column) => {
							const meta = column.columnDef.meta as
								{ headerLabel?: string } | undefined;
							return (
								<label
									key={column.id}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										checked={column.getIsVisible()}
										onCheckedChange={(checked) =>
											column.toggleVisibility(checked === true)
										}
									/>
									{meta?.headerLabel ?? column.id}
								</label>
							);
						})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
