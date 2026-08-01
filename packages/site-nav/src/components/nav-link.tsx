import type { AnchorHTMLAttributes } from "react";

import { useSiteNav } from "./use-site-nav";

type NavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	href: string;
	prefetch?: boolean;
};

export function NavLink(props: NavLinkProps) {
	const {
		props: { Link },
	} = useSiteNav();
	if (Link) return <Link {...props} />;

	const { prefetch: _prefetch, ...anchorProps } = props;
	return <a {...anchorProps} />;
}
