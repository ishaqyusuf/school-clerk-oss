"use client";

import {
	type FinanceSectionKey,
	financeSections,
	visibleFinanceTabs,
} from "@/features/finance/finance-sections";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@school-clerk/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

function normalize(path: string) {
	const trimmed = path.replace(/\/+$/, "");
	return trimmed || "/";
}

export function FinanceSectionTabs({ section }: { section: FinanceSectionKey }) {
	const pathname = normalize(usePathname() ?? "");
	const { role, isPending } = useAuth();
	// Until the session loads, keep role-gated tabs' space so the strip doesn't shift.
	const visible = new Set(
		visibleFinanceTabs(section, role).map((tab) => tab.href),
	);
	const tabs = isPending
		? financeSections[section].tabs
		: financeSections[section].tabs.filter((tab) => visible.has(tab.href));
	if (tabs.length < 2) return null;

	return (
		<nav
			aria-label="Section tabs"
			className="-mt-2 flex gap-1 overflow-x-auto border-b"
		>
			{tabs.map((tab) => {
				// The tenant domain may prefix the path, so match on the ending.
				const isActive = pathname === tab.href || pathname.endsWith(tab.href);
				const placeholder = isPending && !visible.has(tab.href);
				return (
					<Link
						key={tab.href}
						href={tab.href}
						aria-current={isActive ? "page" : undefined}
						aria-hidden={placeholder || undefined}
						tabIndex={placeholder ? -1 : undefined}
						className={cn(
							"whitespace-nowrap border-b-2 px-4 py-2 font-medium text-sm transition-colors",
							placeholder && "invisible",
							isActive
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:border-muted hover:text-foreground",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
