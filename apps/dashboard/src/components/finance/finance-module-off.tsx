import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { WalletCards } from "lucide-react";

/**
 * Shown on every /finance page when the school's effective modules exclude
 * Billing & finance, instead of letting each page's API calls fail.
 */
export function FinanceModuleOff({ entitled }: { entitled: boolean }) {
	return (
		<div className="flex min-h-[60vh] items-center justify-center p-6">
			<div className="w-full max-w-md space-y-4 rounded-md border bg-card p-6 text-center">
				<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<WalletCards className="h-5 w-5" />
				</div>
				<div className="space-y-1.5">
					<h1 className="font-semibold text-lg">Billing & finance is turned off</h1>
					<p className="text-muted-foreground text-sm">
						{entitled
							? "This school has finance available but switched off. An administrator can turn it on under School profile → Modules."
							: "Finance isn't included in this school's modules yet. Contact School Clerk support to add it."}
					</p>
				</div>
				{entitled ? (
					<Button asChild>
						<Link href="/settings/school-profile">Open module settings</Link>
					</Button>
				) : null}
			</div>
		</div>
	);
}
