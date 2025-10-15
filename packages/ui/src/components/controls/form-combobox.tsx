import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "../../utils";
import {
  ComboboxDropdown,
  ComboboxProps,
} from "@school-clerk/ui/combobox-dropdown";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@school-clerk/ui/form";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

export interface FormComboboxProps<T> {
  label?: string;
  className?: string;
  comboProps: Partial<ComboboxProps<T>>;
  transformSelectionValue?: (data: any) => any;
  handleSelect?: (value, selected: T, callback) => void;
}

export function FormCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>({
  control,
  name,
  defaultValue,
  className,
  label,
  disabled,
  comboProps,
  handleSelect,
  transformSelectionValue,
  // ...props
}: Partial<ControllerProps<TFieldValues, TName>> &
  FormComboboxProps<TOptionType>) {
  const formProps = { control, name, defaultValue, disabled };
  const load = useDataSkeleton();
  return (
    <FormField
      {...formProps}
      render={({ field }) => (
        <FormItem className={cn(className, "mx-1")}>
          {label && (
            <FormLabel className={cn(disabled && "text-muted-foreground")}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            {load?.loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <ComboboxDropdown
                selectedItem={
                  comboProps.items?.find(
                    (p) => (p as any).id === String(field?.value)
                  ) as any
                }
                {...(comboProps as any)}
                onSelect={(data) => {
                  const cb = () => {
                    comboProps?.onSelect?.(data as any);
                    field.onChange(transformSelectionValue?.(data) || data.id);
                  };
                  handleSelect ? handleSelect(data?.id, data as any, cb) : cb();
                }}
              />
            )}
          </FormControl>
        </FormItem>
      )}
    />
  );
}
