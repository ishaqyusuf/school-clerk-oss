import {
  getLinkModules as buildNavLinkModules,
  validateLinks as buildValidatedNavLinks,
} from "@school-clerk/ui/nav/utils";

import { linkModules } from "@/features/navigation/sidebar-modules";

export { linkModules };

export function getFirstPermittedHref({
  can,
  role,
  userId,
}: {
  can?: Record<string, boolean>;
  role?: string | null;
  userId?: string | null;
}) {
  const validLinks = buildNavLinkModules(
    buildValidatedNavLinks({
      linkModules: structuredClone(linkModules),
      role,
      can,
      userId,
    }),
  );

  return validLinks.defaultLink || "/";
}
