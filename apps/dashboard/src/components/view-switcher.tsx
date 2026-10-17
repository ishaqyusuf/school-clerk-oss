"use client";

import type { DirectoryView } from "@/utils/directory-view-settings";
import { Button } from "@school-clerk/ui/button";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { LayoutGrid, List, type LucideIcon, Table2 } from "lucide-react";

export type ViewOption<Value extends string> = {
	value: Value;
	label: string;
	icon: LucideIcon;
};

export const directoryViewOptions = [
	{ value: "table", label: "Table", icon: Table2 },
	{ value: "list", label: "List", icon: List },
	{ value: "cards", label: "Cards", icon: LayoutGrid },
] as const satisfies readonly ViewOption<DirectoryView>[];

/**
 * Icon segmented control from md up; a single icon button with a menu on
 * phones, where header space is tight.
 */
export function ViewSwitcher<Value extends string>({
	label,
	value,
	options,
	onValueChange,
}: {
	label: string;
	value: Value;
	options: readonly ViewOption<Value>[];
	onValueChange: (value: Value) => void;
}) {
	const current =
		options.find((option) => option.value === value) ?? options[0];
	if (!current || options.length < 2) return null;
	const CurrentIcon = current.icon;

	return (
		<>
			<ButtonGroup aria-label={label} className="hidden md:flex">
				{options.map((option) => {
					const Icon = option.icon;
					const active = option.value === current.value;
					return (
						<Button
							key={option.value}
							type="button"
							size="icon"
							variant={active ? "secondary" : "outline"}
							aria-label={`${option.label} view`}
							aria-pressed={active}
							title={`${option.label} view`}
							onClick={() => onValueChange(option.value)}
						>
							<Icon className="size-4" aria-hidden="true" />
						</Button>
					);
				})}
			</ButtonGroup>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="md:hidden"
						aria-label={`${label}: ${current.label}. Choose view`}
						title={`${current.label} view`}
					>
						<CurrentIcon className="size-4" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuRadioGroup
						value={current.value}
						onValueChange={(nextValue) => {
							const option = options.find(
								(option) => option.value === nextValue,
							);
							if (option) onValueChange(option.value);
						}}
					>
						{options.map((option) => {
							const Icon = option.icon;
							return (
								<DropdownMenuRadioItem
									key={option.value}
									value={option.value}
									className="gap-2"
								>
									<Icon className="size-4" aria-hidden="true" />
									{option.label}
								</DropdownMenuRadioItem>
							);
						})}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
