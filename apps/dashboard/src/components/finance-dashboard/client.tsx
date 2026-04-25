"use client";

import { NumberInput } from "../currency-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Clock, TrendingUp, Wallet } from "lucide-react";

type PendingFee = {
  feeTitle: string;
  _sum: { billAmount: number | null; pendingAmount: number | null };
};

type Props = {
  data: {
    summary: {
      activeStreams: number;
      totalIn: number;
      totalOut: number;
      availableFunds: number;
      pendingBills: number;
      pendingFees: number;
      owingAmount: number;
      projectedBalance: number;
    };
    pendingFeeByWalletType: PendingFee[];
  };
};

export default function Client({ data }: Props) {
  const cards = [
    {
      label: "Available Funds",
      value: data.summary.availableFunds,
      icon: Wallet,
      color: "text-sky-600",
    },
    {
      label: "Total Income",
      value: data.summary.totalIn,
      icon: ArrowUpCircle,
      color: "text-green-600",
    },
    {
      label: "Total Expenses",
      value: data.summary.totalOut,
      icon: ArrowDownCircle,
      color: "text-red-500",
    },
    {
      label: "Pending Bills",
      value: data.summary.pendingBills,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Outstanding Fees",
      value: data.summary.pendingFees,
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      label: "Outstanding Owing",
      value: data.summary.owingAmount,
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Projected Position",
      value: data.summary.projectedBalance,
      icon: TrendingUp,
      color: "text-violet-600",
    },
    {
      label: "Active Streams",
      value: data.summary.activeStreams,
      icon: Wallet,
      color: "text-slate-600",
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <h1 className="text-2xl font-bold tracking-tight">Finance Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
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
