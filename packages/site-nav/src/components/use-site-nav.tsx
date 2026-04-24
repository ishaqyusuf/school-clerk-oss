import { createContext, useContext, useMemo, useRef, useState } from "react";
import {
	getActiveLinkFromMap,
	getLinkModules,
	validateLinks,
} from "../lib/utils";

type SiteNavContext = ReturnType<typeof createSiteNavContext>;
export const SiteNavContext = createContext<SiteNavContext>(undefined);
export const SiteNavProvider = SiteNavContext.Provider;
interface Props {
	pathName: string;
	linkModules;
	permissions?;
	role?;
	userId?;
	Link?;
}
export const createSiteNavContext = (props: Props) => {
	const mainMenuRef = useRef<HTMLDivElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);

	const { activeLink, linkModules, modules, currentModule } = useMemo(() => {
		const linkModules = getLinkModules(
			validateLinks({
				linkModules: props.linkModules,
				can: props.permissions,
				role: props.role,
				userId: props.userId,
			}),
		);
		const activeLink = getActiveLinkFromMap(
			props.pathName,
			linkModules.linksNameMap || {},
		);
		const modules = linkModules?.modules
			?.filter((a) => a.activeLinkCount && a?.name)
			.map((module) => {
				const prim = module?.sections
					?.flatMap((a) => a.links?.filter((l) => l.show))
					?.sort((a, b) => a.globalIndex - b.globalIndex)?.[0];
				const href =
					module.defaultLink ||
					prim?.href ||
					prim?.subLinks?.filter((a) => a.show)?.[0]?.href;
				return {
					...module,
					href,
				};
			});
		const currentModule = modules.find((m) => m.name === activeLink?.module);

		return { activeLink, modules, linkModules, currentModule };
	}, [props]);
	return {
		props,
		mainMenuRef,
		isExpanded,
		setIsExpanded,
		activeLink,
		modules,
		linkModules,
		currentModule,
	};
};
export const useSiteNav = () => {
	const context = useContext(SiteNavContext);
	if (context === undefined) {
		throw new Error("useSiteNavContext must be used within a SiteNavProvider");
	}
	return context;
};
