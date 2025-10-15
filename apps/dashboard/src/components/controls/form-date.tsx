import { InputHTMLAttributes, useCallback, useState } from "react";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Button } from "@school-clerk/ui/button";
import { Calendar } from "@school-clerk/ui/calendar";
import { cn } from "@school-clerk/ui/cn";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@school-clerk/ui/form";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { Textarea } from "@school-clerk/ui/textarea";

import { Menu } from "../menu";

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
  uppercase?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  hideIcon?: boolean;
  range?: boolean;
  dateFormat?: DateFormats;
  // defaultValue?:boolean
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
  dateFormat = "dd/MM/yy",
  className,
  suffix,
  type,
  list,
  prefix,
  uppercase,
  tabIndex,
  size = "default",
  inputProps,
  range,
  hideIcon,
  ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
  const [open, setOpen] = useState(false);
  const openChanged = useCallback(
    (e) => {
      console.log(e);

      setOpen(e);
    },
    [open]
  );
  const load = useDataSkeleton();

  return (
    <FormField
      {...(props as any)}
      render={({ field, fieldState }) => {
        const date = field.value;
        function from() {
          if (!range) return null;
          return (date as any).from;
        }
        function to() {
          if (!range) return null;
          return (date as any).from;
        }

        function _date() {
          if (range) return null;
          return date as any;
        }
        function __format(d) {
          return format(d, dateFormat);
        }
        return (
          <FormItem
            className={cn(
              className,
              props.disabled && "text-muted-foreground",
              "mx-1"
            )}
          >
            {label && (
              <FormLabel className={cn(fieldState.error && "border-red-400")}>
                {label}
              </FormLabel>
            )}
            <FormControl {...inputProps}>
              {load?.loading ? (
                <>
                  <Skeleton className="h-8 w-full" />
                </>
              ) : (
                <>
                  <div className={cn("grid gap-2")}>
                    <Menu
                      noSize
                      open={open}
                      onOpenChanged={openChanged}
                      Trigger={
                        <Button
                          id="date"
                          variant={"outline"}
                          disabled={!!props.disabled}
                          className={cn(
                            "sw-[260px] justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                            className
                          )}
                        >
                          {!hideIcon && (
                            <CalendarIcon className="mr-2 h-4 w-4" />
                          )}
                          {range &&
                            (from() ? (
                              to() ? (
                                <>
                                  {__format(from())} - {__format(to())}
                                </>
                              ) : (
                                __format(from())
                              )
                            ) : (
                              <span className="whitespace-nowrap">
                                {placeholder}
                              </span>
                            ))}
                          {!range &&
                            (!date ? (
                              <span className="whitespace-nowrap">
                                {placeholder}
                              </span>
                            ) : (
                              __format(_date())
                            ))}
                        </Button>
                      }
                    >
                      <div className="">
                        <Calendar
                          {...({} as any)}
                          initialFocus
                          mode={(range ? "range" : "single") as any}
                          defaultMonth={range ? from() : date}
                          selected={date}
                          onSelect={(v) => {
                            field.onChange(v);
                            //  setDate(v);
                            //  setValue?.(v);
                            setOpen(false);
                          }}
                          numberOfMonths={range ? 2 : 1}
                        />
                      </div>
                      {/* <PopoverContent className="w-auto z-10 p-0" align="end"> */}
                      {/* </PopoverContent> */}
                    </Menu>
                  </div>
                </>
              )}
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
}
