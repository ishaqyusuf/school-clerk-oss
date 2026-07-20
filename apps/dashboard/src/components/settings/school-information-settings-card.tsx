"use client";

import { useTRPC } from "@/trpc/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Building2, Calendar, Globe, Hash } from "lucide-react";

export function SchoolInformationSettingsCard() {
	const trpc = useTRPC();
	const { data: school } = useSuspenseQuery(
		trpc.schoolSettings.getGeneral.queryOptions(),
	);

	const fields = [
		{ icon: Building2, label: "School name", value: school.name },
		{ icon: Globe, label: "Subdomain", value: school.subDomain },
		{ icon: Hash, label: "Slug", value: school.slug },
		{
			icon: Calendar,
			label: "Created",
			value: school.createdAt
				? new Date(school.createdAt).toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})
				: "—",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>School information</CardTitle>
				<CardDescription>
					The tenant identity currently used throughout SchoolClerk.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-5 sm:grid-cols-2">
				{fields.map((field) => (
					<div key={field.label} className="flex items-start gap-3">
						<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
							<field.icon className="size-4 text-muted-foreground" />
						</div>
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">{field.label}</p>
							<p className="truncate text-sm font-medium">
								{field.value ?? "—"}
							</p>
						</div>
					</div>
				))}
			</CardContent>
			<CardFooter className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
				<span>{school._count.students} students</span>
				<span>{school._count.sessions} academic sessions</span>
			</CardFooter>
		</Card>
	);
}
