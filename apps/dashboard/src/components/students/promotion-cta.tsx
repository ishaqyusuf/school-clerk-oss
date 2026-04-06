"use client";

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle } from "lucide-react";
import Link from "next/link";

import { _trpc } from "@/components/static-trpc";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Button } from "@school-clerk/ui/button";

export function PromotionCta() {
	const { data } = useQuery(_trpc.academics.dashboard.queryOptions({}));
	const auth = useAuth();

	const promotionIds = data?.promotionIds ?? null;
	const shouldShow =
		!!promotionIds && auth.profile?.termId === promotionIds.firstTermId;

	if (!shouldShow || !promotionIds) return null;

	return (
		<Alert className="border-primary/20 bg-primary/5">
			<ArrowUpCircle className="h-4 w-4 text-primary" />
			<AlertTitle>Ready to promote returning students?</AlertTitle>
			<AlertDescription className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<span>
					You are in the first term of a new session and there is a previous
					term available. Review promotions before adding students manually.
				</span>
				<Button asChild className="shrink-0">
					<Link
						href={`/academic/progression/${promotionIds.lastTermId}/${promotionIds.firstTermId}`}
					>
						Open Progression
					</Link>
				</Button>
			</AlertDescription>
		</Alert>
	);
}
