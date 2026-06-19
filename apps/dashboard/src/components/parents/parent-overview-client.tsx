"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Shirt, Wallet } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    style: "currency",
  }).format(amount || 0);
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status || status === "NOT_REQUIRED") {
    return <Badge variant="secondary">Not required</Badge>;
  }

  if (status === "COLLECTED" || status === "ENROLLED") {
    return <Badge variant="success">{status.replaceAll("_", " ")}</Badge>;
  }

  return <Badge variant="warning">{status.replaceAll("_", " ")}</Badge>;
}

export function ParentOverviewClient() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.parents.overview.queryOptions());
  const wards = data?.wards ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card className="h-48 animate-pulse rounded-lg" key={index} />
        ))}
      </div>
    );
  }

  if (!wards.length) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>No wards linked yet</CardTitle>
          <CardDescription>
            Once the school approves an enrollment application and links your
            parent profile, your children or wards will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {wards.map((ward: any) => (
        <Card className="rounded-lg" key={ward.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{ward.name}</CardTitle>
                <CardDescription>
                  {ward.classroomName || "No classroom yet"}
                  {ward.termName ? ` • ${ward.termName}` : ""}
                </CardDescription>
              </div>
              <StatusBadge status={ward.enrollmentStatus} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="size-4" />
                Outstanding
              </div>
              <p className="mt-2 text-lg font-semibold">
                {formatMoney(ward.outstanding)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="size-4" />
                Collections
              </div>
              <div className="mt-2">
                <StatusBadge status={ward.collectionStatus} />
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="size-4" />
                Books
              </div>
              <div className="mt-2">
                <StatusBadge status={ward.bookStatus} />
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shirt className="size-4" />
                Uniform
              </div>
              <div className="mt-2">
                <StatusBadge status={ward.uniformStatus} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
