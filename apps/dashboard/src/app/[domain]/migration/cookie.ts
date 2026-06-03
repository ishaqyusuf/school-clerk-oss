"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { Gender } from "@school-clerk/db";

export async function loadCookie() {
  const c = await cookies();
  const d = c.get("migration")?.value;
  return JSON.parse(d || ("{}" as any)) satisfies {
    class?: string;
    term?: string;
  };
}
export async function cookieChanged(value) {
  //   const c = loadCookie();
  //   c[k] = val;
  const _c = await cookies();
  _c.set("migration", JSON.stringify(value));
  revalidatePath("/migration");
}

export async function loadGenders() {
  const c = await cookies();
  const d = c.get("genders")?.value;

  return JSON.parse(d || ("{}" as any)) satisfies { [name in string]: Gender };
}
export async function setGender(name, gender) {
  const genders = await loadGenders();
  genders[name] = gender;
  const c = await cookies();
  c.set("genders", JSON.stringify(genders));
  revalidatePath("/migration");
}
