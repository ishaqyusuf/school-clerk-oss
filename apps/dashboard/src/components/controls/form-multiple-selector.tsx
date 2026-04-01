import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@school-clerk/ui/form";
import MultipleSelector, {
	type Option,
} from "@school-clerk/ui/multiple-selector";

type Props = {
	label?: string;
	options?: Option[];
	placeholder?: string;
};

export default function FormMultipleSelector<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	label,
	options = [],
	placeholder,
	...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props) {
	return (
		<FormField
			{...(props as ControllerProps<TFieldValues, TName>)}
			render={({ field }) => (
				<FormItem>
					{label ? <FormLabel>{label}</FormLabel> : null}
					<FormControl>
						<MultipleSelector
							options={options}
							placeholder={placeholder}
							value={options.filter((option) =>
								(field.value ?? []).includes(option.value),
							)}
							onChange={(selected) =>
								field.onChange(selected.map((option) => option.value))
							}
							hideClearAllButton
							emptyIndicator={
								<p className="py-3 text-center text-sm text-muted-foreground">
									No options found.
								</p>
							}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
