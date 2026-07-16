import { redirect } from "next/navigation";

export function redirectTeacherWipInProduction() {
  if (process.env.NODE_ENV === "production") {
    redirect("/teacher");
  }
}
