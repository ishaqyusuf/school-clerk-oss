"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle } from "lucide-react";
import Link from "next/link";

import { _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";

export function PromotionQuickLink() {
	const { data } = useQuery(_trpc.academics.dashboard.queryOptions({}));

	const promotionIds = data?.promotionIds ?? null;
	const currentSession = data?.sessions.find(
		(session) => session.status === "current",
	);
	const isEnabled =
		!!promotionIds &&
		currentSession?.currentTerm?.id === promotionIds.firstTermId;

	if (!promotionIds) {
		return null;
	}

	return (
		<Button
			variant="outline"
			className="h-auto flex-col gap-2 py-5"
			asChild={isEnabled}
			disabled={!isEnabled}
			title={
				isEnabled
					? "Open promotion"
					: "Promotion is available only in the first term of the session"
			}
		>
			{isEnabled ? (
				<Link
					href={`/academic/promotion/${promotionIds.lastTermId}/${promotionIds.firstTermId}`}
				>
					<ArrowUpCircle className="h-5 w-5" />
					<span className="text-sm font-medium">Promotion</span>
				</Link>
			) : (
				<span>
					<ArrowUpCircle className="h-5 w-5" />
					<span className="text-sm font-medium">Promotion</span>
				</span>
			)}
		</Button>
	);
}
