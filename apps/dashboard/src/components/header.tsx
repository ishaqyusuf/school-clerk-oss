"use client";

import { SiteNav } from "@school-clerk/site-nav";
import { NotificationBell } from "./notifications/notification-bell";
import { TermSwitcher } from "./sidebar/term-switcher";
import { ThemeSwitch } from "./theme-switch";

export function Header() {
	return (
		<header className="print:hidden">
			<div className="sticky top-0 z-50 border-b border-border/80 bg-background/85 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 md:px-6 desktop:rounded-t-[10px]">
				<div className="flex min-h-[72px] flex-col gap-3 py-3 md:min-h-[78px] md:flex-row md:items-center">
					<div className="flex min-w-0 items-center gap-3">
						<SiteNav.MobileSidebar />
						<div className="min-w-0">
							<div
								id="pageTitle"
								className="font-bold"
								role="heading"
								aria-level={1}
								aria-live="polite"
							/>
							<div
								id="headerTitleSlot"
								className="flex min-w-0 items-center space-x-1"
							/>
						</div>
					</div>

					<div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
						<div
							id="headerNav"
							className="flex min-w-0 items-center space-x-1"
						/>
						<div
							id="breadCrumb"
							className="flex min-w-0 items-center space-x-1 overflow-hidden"
						/>
						<div className="w-full md:w-auto">
							<TermSwitcher />
						</div>
						<div
							id="navRightSlot"
							className="flex items-center gap-3 md:mx-2"
						/>
						<div id="actionNav" className="flex items-center gap-3" />
						<div className="ml-auto flex items-center gap-3 md:ml-0">
							<NotificationBell />
							<ThemeSwitch />
						</div>
					</div>
				</div>
			</div>
			<div className="dark:bg-muted" id="pageTab" />
			<div className="overflow-auto" id="tab" />
		</header>
	);
}
