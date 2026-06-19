"use client";

import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@school-clerk/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@school-clerk/ui/tooltip";
import { LayoutGrid, SlidersHorizontal, Table2 } from "lucide-react";

import { useStudentsTableStore } from "./store";

export function StudentsViewToggle() {
	const { viewMode, setViewMode } = useStudentsTableStore();
	const isGrid = viewMode === "grid";
	const label = isGrid ? "Switch to table view" : "Switch to grid view";
	const Icon = isGrid ? Table2 : LayoutGrid;

	return (
		<TooltipProvider delayDuration={100}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={isGrid ? "secondary" : "outline"}
						size="icon"
						aria-label={label}
						aria-pressed={isGrid}
						title={label}
						onClick={() => setViewMode(isGrid ? "table" : "grid")}
					>
						<Icon size={18} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export function StudentsColumnVisibility() {
	const { columns, showColumnDividers, setShowColumnDividers } =
		useStudentsTableStore();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="icon" aria-label="Table settings">
					<SlidersHorizontal size={18} />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-[220px] p-0" align="end" sideOffset={8}>
				<div className="flex max-h-[450px] flex-col space-y-2 overflow-auto p-4">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="students-column-dividers"
							checked={showColumnDividers}
							onCheckedChange={(checked) =>
								setShowColumnDividers(checked === true)
							}
						/>
						<label
							htmlFor="students-column-dividers"
							className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Column dividers
						</label>
					</div>
					<div className="my-1 border-t border-border" />
					{columns
						.filter((column) => column.columnDef.enableHiding !== false)
						.map((column) => {
							const meta = column.columnDef.meta as
								| { headerLabel?: string }
								| undefined;
							const label =
								meta?.headerLabel ??
								column.columnDef.header?.toString() ??
								column.id;

							return (
								<div key={column.id} className="flex items-center space-x-2">
									<Checkbox
										id={`students-${column.id}`}
										checked={column.getIsVisible()}
										onCheckedChange={(checked) =>
											column.toggleVisibility(checked === true)
										}
									/>
									<label
										htmlFor={`students-${column.id}`}
										className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										{label}
									</label>
								</div>
							);
						})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
