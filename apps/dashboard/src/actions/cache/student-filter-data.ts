"use server";

import { unstable_cache } from "next/cache";

import { Gender } from "@school-clerk/db";

import { getAuthCookie } from "../cookies/auth-cookie";
import { getCachedClassRooms } from "./classrooms";
import { PageFilterData } from "@school-clerk/utils/types";

export async function studentFilterData() {
  const profile = await getAuthCookie();
  const { termId } = profile;

  const fn = async () => {
    const [classes] = await Promise.all([
      getCachedClassRooms(profile.termId, profile.sessionId),
    ]);

    const response: PageFilterData[] = [
      {
        value: "search",
        icon: "Search",
        type: "input",
      },
      {
        value: "departmentId",
        label: "Class",
        type: "input",
        icon: "Search",
        options: [
          {
            label: "Not enrolled",
            value: "undocumented",
          },
          ...classes?.map((c) => ({
            label: c.name,
            value: c.departmentId,
          })),
        ],
      },
      {
        value: "gender",
        type: "input",
        icon: "gender",
        options: [
          {
            label: "Male",
            value: "Male" as Gender,
          },
          {
            label: "Female",
            value: "Female" as Gender,
          },
        ],
      },
    ];

    return response;
  };
  const tags = [`students_class_filter_${termId}`];
  return unstable_cache(fn, tags, {
    tags,
  })();
}
