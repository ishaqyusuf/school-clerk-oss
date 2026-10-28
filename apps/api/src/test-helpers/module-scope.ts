import { MODULE_IDS } from "@school-clerk/utils/module-config";

/** In-memory, fully entitled school for tests inside an authorized scope. */
export function configuredTestSchool(id = "school-1") {
  return {
    id,
    accountId: "account-1",
    name: "School",
    subDomain: "school",
    institutionType: "SECONDARY",
    moduleConfiguration: {
      version: 1,
      revision: 0,
      enabledModules: [...MODULE_IDS],
      entitledModules: [...MODULE_IDS],
    },
  };
}
