import { Primitive } from "@radix-ui/react-primitive";

import type { IconKeys } from "@school-clerk/ui/custom/icons";
import type { PageFilterData as SharedPageFilterData } from "@school-clerk/utils/types";
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
export type PageFilterData = Omit<
  SharedPageFilterData<SearchParamsKeys>,
  "value"
> & {
  value: SearchParamsKeys;
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
