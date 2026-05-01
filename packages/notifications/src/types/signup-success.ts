import { z } from "zod";

import { createHrefNotificationAction } from "../actions";
import { channelHelpers } from "../channels";
import { defineSchoolNotification } from "./shared";

const schema = z.object({
  onboardingPath: z.string().min(1),
  schoolName: z.string().min(1),
  workspacePath: z.string().min(1),
});

export const signupSuccess = defineSchoolNotification({
  buildAction: (payload) =>
    createHrefNotificationAction({
      href: payload.onboardingPath,
      label: "Continue onboarding",
    }),
  buildBody: (payload) =>
    `${payload.schoolName} is ready. Continue onboarding to set up academics and invite your team.`,
  buildEmailTemplate: () => null,
  buildLink: (payload) => payload.workspacePath,
  channels: channelHelpers.inApp(),
  schema,
  title: (payload) => `${payload.schoolName} workspace created`,
  variant: "success",
});
