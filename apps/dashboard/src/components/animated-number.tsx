"use client";

// import { useUserContext } from "@/store/user/hook";
import NumberFlow from "@number-flow/react";

type Props = {
  value: number;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
};

export function AnimatedNumber({
  value,
  currency,
  minimumFractionDigits,
  maximumFractionDigits,
  locale,
}: Props) {
  // const user = useUserContext((state) => state.data);
  // const localeToUse = locale || user?.locale;

  return (
    <NumberFlow
      value={value}
      format={{
        style: "currency",
        currency: currency ?? "NGN", //"₦",
        minimumFractionDigits,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits,
      }}
      willChange
      // locales={localeToUse}
    />
  );
}
