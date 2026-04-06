"use server";

import { cookies } from "next/headers";

type ClassroomLayout = "ltr" | "rtl";

interface StudentReportCookie {
  classroomLayout?: ClassroomLayout;
}

const COOKIE_NAME = "student-report";

export async function getStudentReportCookie(): Promise<StudentReportCookie> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;

  return JSON.parse(value || "{}");
}

export async function updateStudentReportCookieByName(
  name: keyof StudentReportCookie,
  value: StudentReportCookie[typeof name],
) {
  const nextCookie = await getStudentReportCookie();
  nextCookie[name] = value;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(nextCookie));
}
