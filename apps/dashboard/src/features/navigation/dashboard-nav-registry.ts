import type { NavModuleDefinition } from "@school-clerk/navigation";

import { academicsNavigationModule } from "./dashboard-nav-modules/academics";
import { financeNavigationModule } from "./dashboard-nav-modules/finance";
import { operationsNavigationModule } from "./dashboard-nav-modules/operations";
import { overviewNavigationModule } from "./dashboard-nav-modules/overview";
import { parentNavigationModule } from "./dashboard-nav-modules/parent";
import { peopleNavigationModule } from "./dashboard-nav-modules/people";
import { settingsNavigationModule } from "./dashboard-nav-modules/settings";
import { teacherNavigationModule } from "./dashboard-nav-modules/teacher";

export const dashboardNavRegistry: NavModuleDefinition[] = [
	overviewNavigationModule,
	peopleNavigationModule,
	academicsNavigationModule,
	financeNavigationModule,
	operationsNavigationModule,
	teacherNavigationModule,
	parentNavigationModule,
	settingsNavigationModule,
];
