import { useState } from "react";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "../../utils";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { Button } from "@school-clerk/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@school-clerk/ui/form";
import { Skeleton } from "@school-clerk/ui/skeleton";

import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { Calendar } from "@school-clerk/ui/calendar";
import { CalendarIcon } from "lucide-react";

interface Props<T> {
  label?: string;
  placeholder?: string;
  className?: string;
  suffix?: string;
  type?: string;
  list?: boolean;
  size?: "sm" | "default" | "xs";
  prefix?: string;
  tabIndex?;
  dateFormat?: DateFormats;
  calendarProps?: any;
}
export type DateFormats =
  | "DD/MM/YY"
  | "MM/DD/YY"
  | "YYYY-MM-DD"
  | "MMM DD, YYYY"
  | "YYYY-MM-DD HH:mm:ss"
  | "YYYY-MM-DD HH:mm"
  | any;
export function FormDate<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOptionType = any,
>({
  label,
  placeholder,
  className,
  suffix,
  type,
  list,
  prefix,
  tabIndex,
  size = "default",
  dateFormat = "dd/MM/yy",
  calendarProps,
  ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  const load = useDataSkeleton();
  const [open, setOpen] = useState(false);
  return (
    <FormField
      {...(props as any)}
      render={({ field, fieldState }) => (
        <FormItem
          className={cn(
            className,
            props.disabled && "text-muted-foreground",
            "mx-1",
            "flex flex-col"
          )}
        >
          {label && (
            <FormLabel className={cn(fieldState.error && "border-red-400")}>
              {label}
            </FormLabel>
          )}
          {/* <FormControl {...inputProps}> */}
          {load?.loading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                      size == "sm" && "h-8"
                    )}
                  >
                    {field.value ? (
                      format(field.value, dateFormat)
                    ) : (
                      <span>{placeholder || "Pick a date"}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  selected={field.value}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                  {...calendarProps}
                  mode="single"
                  onSelect={(e) => {
                    field.onChange(e);
                    setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
          {/* </FormControl> */}
        </FormItem>
      )}
    />
  );
}
