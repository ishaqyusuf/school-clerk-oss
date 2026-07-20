"use client";

import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useTenantUrl } from "@school-clerk/tenant-url/react";
import { cn } from "@school-clerk/ui/cn";
import { usePathname } from "next/navigation";

const SETTINGS_ITEMS = [
	{ path: "/settings/school-profile", label: "General" },
	{ path: "/settings/sessions", label: "Academic Sessions" },
	{ path: "/settings/roles", label: "Roles" },
	{ path: "/settings/document-templates", label: "Documents" },
	{ path: "/settings/website", label: "Website" },
];

export function SettingsShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const tenantUrl = useTenantUrl();
	const productPath = tenantUrl?.context.productPath ?? pathname;

	if (productPath.startsWith("/settings/website")) {
		return children;
	}

	return (
		<div className="max-w-[800px]">
			<nav className="overflow-x-auto py-4 scrollbar-hide">
				<ul className="flex min-w-max gap-6 text-sm">
					{SETTINGS_ITEMS.map((item) => {
						const active =
							productPath === item.path ||
							(item.path !== "/settings/school-profile" &&
								productPath.startsWith(`${item.path}/`));

						return (
							<li key={item.path}>
								<Link
									href={item.path}
									prefetch
									className={cn(
										"text-muted-foreground transition-colors hover:text-foreground",
										active &&
											"font-medium text-foreground underline underline-offset-8",
									)}
								>
									{item.label}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<main className="mt-8">{children}</main>
		</div>
	);
}
