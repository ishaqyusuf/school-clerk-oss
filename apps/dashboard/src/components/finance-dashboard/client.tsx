"use client";

import { NumberInput } from "../currency-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Clock, TrendingUp } from "lucide-react";

type Transaction = {
  type: string | null;
  _sum: { amount: number | null };
};

type PendingFee = {
  feeTitle: string;
  _sum: { billAmount: number | null; pendingAmount: number | null };
};

type Props = {
  data: {
    transactions: Transaction[];
    pendingFeeByWalletType: PendingFee[];
    pendingBillByWalletType: { title: string; _sum: { amount: number | null } }[];
  };
};

export default function Client({ data }: Props) {
  const credit = data?.transactions?.find((t) => t.type === "credit")?._sum?.amount ?? 0;
  const debit = data?.transactions?.find((t) => t.type === "debit")?._sum?.amount ?? 0;
  const pendingBillTotal = data?.pendingBillByWalletType?.reduce(
    (sum, b) => sum + (b._sum?.amount ?? 0),
    0,
  );
  const pendingFeeTotal = data?.pendingFeeByWalletType?.reduce(
    (sum, f) => sum + (f._sum?.pendingAmount ?? 0),
    0,
  );

  const cards = [
    {
      label: "Total Income",
      value: credit,
      icon: ArrowUpCircle,
      color: "text-green-600",
    },
    {
      label: "Total Expenses",
      value: debit,
      icon: ArrowDownCircle,
      color: "text-red-500",
    },
    {
      label: "Pending Bills",
      value: pendingBillTotal,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Outstanding Fees",
      value: pendingFeeTotal,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <h1 className="text-2xl font-bold tracking-tight">Finance Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${c.color}`}>
                <NumberInput value={c.value} prefix="NGN " />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending fees breakdown */}
      {data?.pendingFeeByWalletType?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding Fees Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {data.pendingFeeByWalletType.map((f) => (
                <div
                  key={f.feeTitle}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm">{f.feeTitle}</span>
                  <span className="text-sm font-semibold">
                    <NumberInput value={f._sum?.pendingAmount ?? 0} prefix="NGN " />
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
