"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@school-clerk/ui/cn";

const tabs = [
	{ name: "All Payables", href: "/finance/payables" },
	{ name: "Service Bills", href: "/finance/payables/services" },
	{ name: "Payroll Bills", href: "/finance/payables/payroll" },
	{ name: "Owing & Repayments", href: "/finance/payables/owing" },
];

export function FinancePayablesTabs() {
	const pathname = usePathname();

	return (
		<div className="mb-6 flex gap-1 overflow-x-auto border-b">
			{tabs.map((tab) => {
				const isActive = pathname === tab.href;
				return (
					<Link
						key={tab.href}
						href={tab.href}
						className={cn(
							"whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
							isActive
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
						)}
					>
						{tab.name}
					</Link>
				);
			})}
		</div>
	);
}
