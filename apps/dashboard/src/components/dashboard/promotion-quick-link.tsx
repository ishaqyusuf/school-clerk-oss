"use client";

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle } from "lucide-react";
import Link from "next/link";

import { _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";

export function PromotionQuickLink() {
	const { data } = useQuery(_trpc.academics.dashboard.queryOptions({}));
	const auth = useAuth();

	const promotionIds = data?.promotionIds ?? null;
	const activeTermId = auth.profile?.termId;
	const isEnabled = !!promotionIds && activeTermId === promotionIds.firstTermId;

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
					? "Open student progression"
					: "Student progression is available only in the first term of the session"
			}
		>
			{isEnabled ? (
				<Link
					href={`/academic/progression/${promotionIds.lastTermId}/${promotionIds.firstTermId}`}
				>
					<ArrowUpCircle className="h-5 w-5" />
					<span className="text-sm font-medium">Progression</span>
				</Link>
			) : (
				<span>
					<ArrowUpCircle className="h-5 w-5" />
					<span className="text-sm font-medium">Progression</span>
				</span>
			)}
		</Button>
	);
}
