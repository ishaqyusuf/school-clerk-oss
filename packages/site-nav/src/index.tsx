import { Logo, LogoSm } from "./components/logo";
import { MobileSidebar } from "./components/mobile-sidebar";
import { ModuleSelector } from "./components/module-selector";
import { NavsList } from "./components/navs-list";
import { Sidebar } from "./components/sidebar";
import { User } from "./components/user";

import { SidebarShell } from "./components/sidebar-shell";
import { SiteNavContext } from "./components/use-site-nav";

export * from "./components/use-site-nav";
export const SiteNav = Object.assign(
	{},
	{
		Provider: SiteNavContext.Provider,
		NavsList,
		Sidebar,
		Logo,
		LogoSm,
		User,
		MobileSidebar: MobileSidebar,
		ModuleSelector,
		Shell: SidebarShell,
	},
);
