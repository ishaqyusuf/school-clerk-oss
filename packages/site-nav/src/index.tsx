import { Logo, LogoSm } from "./components/logo";
import { MobileSidebar } from "./components/mobile-sidebar";
import { NavTree } from "./components/nav-tree";
import { Sidebar } from "./components/sidebar";
import { User } from "./components/user";

import { SidebarShell } from "./components/sidebar-shell";
import { SiteNavContext } from "./components/use-site-nav";

export * from "./components/use-site-nav";
export const SiteNav = Object.assign(
	{},
	{
		Provider: SiteNavContext.Provider,
		NavTree,
		Sidebar,
		Logo,
		LogoSm,
		User,
		MobileSidebar: MobileSidebar,
		Shell: SidebarShell,
	},
);
