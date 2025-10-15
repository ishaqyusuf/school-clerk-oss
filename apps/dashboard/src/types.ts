import { Primitive } from "@radix-ui/react-primitive";

import { IconKeys } from "./components/icons";
import { SearchParamsKeys } from "./utils/search-params";
import { ColumnDef as TanColumnDef } from "@tanstack/react-table";

export type AsyncFnType<T extends (...args: any) => any> = Awaited<
  ReturnType<T>
>;
export type PageItemData<T extends (...args: any) => any> = Awaited<
  ReturnType<T>
>["data"][number];

export type PrimitiveDivProps = React.ComponentPropsWithoutRef<
  typeof Primitive.div
>;
export type PageFilterData = {
  value: SearchParamsKeys;
  icon?;
  type: "checkbox" | "input" | "date" | "date-range";
  label?: string;
  options?: {
    label?: string;
    value?: string;
  }[];
};
export type PageDataMeta = {
  count?;
  page?;
  next?: {
    size?;
    start?;
  };
};
export type ColumnMeta = {
  preventDefault?: boolean;
  className?: string;
};
export type ColumnDef<T, Meta = {}> = TanColumnDef<T> & {
  meta?: Meta & ColumnMeta;
};
