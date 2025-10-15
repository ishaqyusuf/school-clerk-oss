type FormatAmountParams = {
  currency: string;
  amount: number;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatAmount({
  currency,
  amount,
  locale = "en-US",
  minimumFractionDigits,
  maximumFractionDigits,
}: FormatAmountParams) {
  if (!currency) {
    return;
  }

  return Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}
export const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD", // Replace with your desired currency code
});
const camelCaseKey = (key) =>
  key.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
export function camel(str?: string) {
  if (!str) return str;
  return str.replace(
    /^([A-Z])|\s(\w)/g,
    function (match: any, p1: any, p2: any, offset: any) {
      if (p2) return p2.toUpperCase();
      return p1.toLowerCase();
    }
  );
}
