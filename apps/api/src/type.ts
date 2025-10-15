import { Primitive } from "@radix-ui/react-primitive";

export type PageDataMeta = {
  count?;
  page?;
  next?: {
    size?;
    start?;
  };
  cursor?;
  hasPreviousePage?;
  hasNextPage?;
};
export type ColumnMeta = {
  preventDefault?: boolean;
  className?: string;
};
// PageFilterData<T> optional value type

export type PageFilterData<TValue = string> = {
  value?: TValue;
  icon?: any;
  type: "checkbox" | "input" | "date" | "date-range";
  label?: string;
  options?: {
    label: string;
    subLabel?: string;
    value: string;
  }[];
};

export type WalletTypes = "fee" | "bill" | "fund";
export type PaymentTypes = "cash";
export type ReturnTypeAsync<T extends (...args: any) => any> = Awaited<
  ReturnType<T>
>;
