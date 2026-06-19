export * from "./types";
export * from "./schema";
export * from "./registry";
export * from "./mock";
export * from "./editor-client";
export * from "./ai";
export * from "./media";
export * from "./block-presets";
export * from "./content-data";
export * from "./config";
export * from "./upgrades";
export * from "./preview";
export * from "./registry-context";
export * from "./site-config";
export * from "./style-tokens";
export * from "./hooks";
export * from "./adapters";
export * from "./common";
export * from "./features";
export * from "./templates/k12-plus-template-1";
export * from "./templates/k12-plus-template-2";
export * from "./templates/k12-plus-template-3";
export * from "./templates/k12-plus-template-4";

import { createTemplateRegistry } from "./registry";
import { k12PlusTemplate1 } from "./templates/k12-plus-template-1";
import { k12PlusTemplate2 } from "./templates/k12-plus-template-2";
import { k12PlusTemplate3 } from "./templates/k12-plus-template-3";
import { k12PlusTemplate4 } from "./templates/k12-plus-template-4";

export const templateRegistry = createTemplateRegistry([
  k12PlusTemplate1,
  k12PlusTemplate2,
  k12PlusTemplate3,
  k12PlusTemplate4,
]);
