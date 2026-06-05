import { buildSidebarModules } from "@school-clerk/navigation";

import { dashboardNavRegistry } from "./dashboard-nav-registry";

export const linkModules = buildSidebarModules(dashboardNavRegistry, {
  includeStatuses: process.env.NODE_ENV === "production" 
    ? ["live"] 
    : ["live", "beta", "upcoming", "hidden"]
});
