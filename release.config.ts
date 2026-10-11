// Uses the same shared release engine as EwaTrade. Main releases Production;
// other branches release Preview. Successful components are recorded in Git tags.
const team = "team_BV5rgKHJH4fMyFL1YfscZIZK";

export default {
	project: "school-clerk",
	components: [
		{
			name: "database",
			paths: ["packages/db/src/schema/**", "packages/db/prisma.config.ts"],
			sharedPaths: false,
			beforePush: true,
			// School Clerk permits schema rollout only through local and prod pushes.
			environments: ["production"],
			deploy: { production: "bun run db:push --prod" },
		},
		{
			name: "dashboard",
			app: "apps/dashboard",
			// The dashboard deploy includes apps/api through its workspace dependency.
			vercel: { team, projects: ["schoolclerk-dashboard"] },
		},
		{
			name: "marketing",
			app: "apps/marketing",
			vercel: { team, projects: ["schoolify"] },
		},
		{
			name: "jobs",
			app: "packages/jobs",
			// The existing deploy command targets Production. No Preview fallback.
			environments: ["production"],
			deploy: { production: "bun run jobs:deploy" },
		},
	],
};
