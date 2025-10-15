"use server";

import { cookies } from "next/headers";

interface Cookie {
  walletType?: string;
}
const COOKIE_NAME = "finance-dashboard";
export async function getFinanceCookie(): Promise<Cookie> {
  const cookiStore = await cookies();
  const value = cookiStore.get(COOKIE_NAME)?.value;

  return JSON.parse(value || "{}");
}
export async function updateFinanceCookieByName(name: keyof Cookie, value) {
  const c = await getFinanceCookie();
  c[name] = value;
  const cs = await cookies();
  cs.set(COOKIE_NAME, JSON.stringify(c));
}
