export type { PageFilterData } from "@school-clerk/utils/types";

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
export type WalletTypes = "fee" | "bill" | "fund";
export type PaymentTypes = "cash";
export type ReturnTypeAsync<T extends (...args: any) => any> = Awaited<
  ReturnType<T>
>;
