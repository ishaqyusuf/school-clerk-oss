"use client";

import { SiteNav } from "@school-clerk/site-nav";
import { NotificationBell } from "./notifications/notification-bell";
import { TermSwitcher } from "./sidebar/term-switcher";
import { ThemeSwitch } from "./theme-switch";

export function Header() {
	return (
		<header className="print:hidden">
			<div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:px-5 desktop:rounded-t-[10px]">
				<div className="flex min-h-14 gap-3 py-2 md:min-h-16 md:flex-row md:items-center">
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

					<div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
						<div
							id="headerNav"
							className="hidden lg:flex min-w-0 items-center space-x-1"
						/>
						<div
							id="breadCrumb"
							className="flex min-w-0 items-center space-x-1 overflow-hidden"
						/>
						<div className="hidden w-full lg:flex md:w-auto">
							<TermSwitcher />
						</div>
						<div
							id="navRightSlot"
							className="hidden lg:flex items-center gap-2 md:mx-1"
						/>
						<div id="actionNav" className="hidden lg:flex items-center gap-2" />
						<div className="ml-auto flex items-center gap-2 md:ml-0">
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
