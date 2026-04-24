"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@school-clerk/ui/breadcrumb";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { StaffOverviewShell } from "./staff-overview-shell";

type Props = {
	staffId: string;
};

export function StaffOverviewPageClient({ staffId }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const [activeTab, setActiveTab] = useState("overview");

	const staffBasePath = pathname.split("/").slice(0, -1).join("/");
	const teachersPath = `${staffBasePath}/teachers`;

	return (
		<div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							className="cursor-pointer"
							onClick={() => router.push(teachersPath)}
						>
							Staff
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Staff Overview</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<StaffOverviewShell
				staffId={staffId}
				mode="page"
				activeTab={activeTab}
				onTabChange={setActiveTab}
			/>
		</div>
	);
}
