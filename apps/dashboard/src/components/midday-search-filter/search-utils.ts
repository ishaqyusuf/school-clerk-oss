import { SearchParamsKeys } from "@/utils/search-params";
import { IconKeys } from "@school-clerk/ui/custom/icons";
import { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";

type T = RouterInputs["students"]["index"];
type NonVoidT = Exclude<T, void>;
//get keys
type Keys = keyof NonVoidT;

export const searchIcons: Partial<{
  [id in Keys]: IconKeys;
}> = {
  //   "order.no": "orders",
  //   "customer.name": "user",
  //   phone: "phone",
  //   search: "Search",
  //   "production.assignedToId": "production",
  //   "production.assignment": "production",
  //   "production.status": "production",
  //   production: "production",
  // "sales.rep": "r"
};
export function isSearchKey(k) {
  return k == "q" || k == "search" || k?.startsWith("_q");
}
export function getSearchKey(filters) {
  console.log(filters);
  return Object.entries(filters || {}).find(([k, v]) => isSearchKey(k))?.[0];
}
