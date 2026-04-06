import {
  type Access,
  createNavLink,
  createNavModule,
  createNavSection,
  initPermAccess,
  initRoleAccess,
} from "@school-clerk/ui/nav/utils";

import type {
  NavAvailability,
  NavItemDefinition,
  NavModuleDefinition,
  NavSectionDefinition,
  NavStatus,
  Role,
} from "./types";

const roleAccess = initRoleAccess("" as Role);
const permissionAccess = initPermAccess("" as string);

type BuildSidebarModulesOptions = {
  includeStatuses?: NavStatus[];
};

function mergeAvailability(
  inherited: NavAvailability,
  current: NavAvailability,
): NavAvailability {
  return {
    institutionTypes: current.institutionTypes ?? inherited.institutionTypes,
    permissions: current.permissions ?? inherited.permissions,
    requiresModules: current.requiresModules ?? inherited.requiresModules,
    roles: current.roles ?? inherited.roles,
    status: current.status ?? inherited.status ?? "live",
  };
}

function shouldInclude(
  availability: NavAvailability,
  includeStatuses: NavStatus[],
): boolean {
  const status = availability.status ?? "live";
  return includeStatuses.includes(status);
}

function toAccessRules(availability: NavAvailability) {
  const access: Access[] = [];

  if (availability.roles?.length) {
    access.push(roleAccess.in(...availability.roles));
  }

  if (availability.permissions?.length) {
    access.push(permissionAccess.every(...availability.permissions));
  }

  return access;
}

function buildItem(
  item: NavItemDefinition,
  inherited: NavAvailability,
  includeStatuses: NavStatus[],
) {
  const availability = mergeAvailability(inherited, item);
  if (!shouldInclude(availability, includeStatuses)) {
    return undefined;
  }

  const childLinks =
    item.children
      ?.map((child) => buildItem(child, availability, includeStatuses))
      .filter(Boolean) ?? [];

  const navLink = createNavLink(
    item.title,
    item.icon ?? undefined,
    item.href,
    childLinks,
  ).access(...toAccessRules(availability));

  if (item.childPaths?.length) {
    navLink.childPaths(...item.childPaths);
  }

  return navLink.data;
}

function buildSection(
  section: NavSectionDefinition,
  inherited: NavAvailability,
  includeStatuses: NavStatus[],
) {
  const availability = mergeAvailability(inherited, section);
  if (!shouldInclude(availability, includeStatuses)) {
    return undefined;
  }

  const links = section.items
    .map((item) => buildItem(item, availability, includeStatuses))
    .filter(Boolean);

  if (!links.length) {
    return undefined;
  }

  return createNavSection(section.key, section.title ?? undefined, links);
}

export function buildSidebarModules(
  modules: NavModuleDefinition[],
  options: BuildSidebarModulesOptions = {},
) {
  const includeStatuses = options.includeStatuses ?? ["live", "beta", "upcoming"];

  return modules
    .map((module) => {
      const availability = mergeAvailability({}, module);
      if (!shouldInclude(availability, includeStatuses)) {
        return undefined;
      }

      const sections = module.sections
        .map((section) => buildSection(section, availability, includeStatuses))
        .filter((section): section is NonNullable<typeof section> => Boolean(section));

      if (!sections.length) {
        return undefined;
      }

      return createNavModule(module.title, module.icon, module.subtitle, sections);
    })
    .filter((module): module is NonNullable<typeof module> => Boolean(module));
}
