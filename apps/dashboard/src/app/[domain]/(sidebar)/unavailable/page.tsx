import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { Construction } from "lucide-react";

export default function UnavailableWorkspacePage() {
	return (
		<div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-2 py-10">
			<PageTitle>Workspace unavailable</PageTitle>
			<Card className="w-full rounded-2xl">
				<CardHeader className="gap-4">
					<div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
						<Construction className="size-6" />
					</div>
					<div className="space-y-2">
						<CardTitle>Your workspace is not available yet</CardTitle>
						<CardDescription className="leading-6">
							This account does not currently have a dedicated SchoolClerk
							workspace. No administrative or teacher pages have been assigned
							as a fallback.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<Button asChild variant="outline">
						<Link href="/signout">Sign out</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
