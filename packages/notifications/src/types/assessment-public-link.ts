import {
  FinanceNotificationEmail,
  type FinanceNotificationEmailProps,
} from "@school-clerk/email/emails/finance-notification";
import * as React from "react";
import { z } from "zod";
import { createHrefNotificationAction } from "../actions";
import { channelHelpers } from "../channels";
import { defineSchoolNotification } from "./shared";

const baseSchema = z.object({
  actorName: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  requesterEmail: z.string().optional().nullable(),
  requesterName: z.string().min(1),
  schoolName: z.string().min(1),
  scopeLabel: z.string().min(1),
});

function createAssessmentLinkTemplate(props: FinanceNotificationEmailProps) {
  return React.createElement(FinanceNotificationEmail, props);
}

function metadata(payload: z.infer<typeof baseSchema>) {
  return [
    { label: "Scope", value: payload.scopeLabel },
    ...(payload.expiresAt
      ? [{ label: "Expires", value: payload.expiresAt }]
      : []),
    ...(payload.reason ? [{ label: "Reason", value: payload.reason }] : []),
    ...(payload.note ? [{ label: "Note", value: payload.note }] : []),
  ];
}

export const assessmentPublicLinkRequested = defineSchoolNotification({
  buildAction: () =>
    createHrefNotificationAction({
      href: "/assessment-recording",
      label: "Review request",
    }),
  buildBody: (payload) =>
    `${payload.requesterName} requested a public assessment recording link for ${payload.scopeLabel}.`,
  buildEmailTemplate: (payload) => ({
    content: createAssessmentLinkTemplate({
      ctaHref: payload.link ?? "/assessment-recording",
      ctaLabel: "Review request",
      eventLabel: "Assessment link request",
      greetingName: "Admin",
      message: `${payload.requesterName} requested a public assessment recording link.${payload.reason ? ` Reason: ${payload.reason}` : ""}`,
      metadata: metadata(payload),
      schoolName: payload.schoolName,
      title: "Public assessment link requested",
    }),
    subject: `${payload.schoolName}: public assessment link requested`,
  }),
  buildLink: () => "/assessment-recording",
  channels: channelHelpers.inAppAndEmail(),
  schema: baseSchema,
  title: (payload) => `Assessment link request from ${payload.requesterName}`,
  variant: "info",
});

export const assessmentPublicLinkApproved = defineSchoolNotification({
  buildAction: (payload) =>
    payload.link
      ? createHrefNotificationAction({
          href: payload.link,
          label: "Open public link",
        })
      : null,
  buildBody: (payload) =>
    `Your public assessment recording link for ${payload.scopeLabel} has been approved.`,
  buildEmailTemplate: (payload) => ({
    content: createAssessmentLinkTemplate({
      ctaHref: payload.link,
      ctaLabel: "Open public link",
      eventLabel: "Assessment link approved",
      greetingName: payload.requesterName,
      message: `Your public assessment recording link has been approved.${payload.actorName ? ` Approved by ${payload.actorName}.` : ""}`,
      metadata: metadata(payload),
      schoolName: payload.schoolName,
      title: "Public assessment link approved",
    }),
    subject: `${payload.schoolName}: your assessment link is ready`,
  }),
  buildLink: (payload) => payload.link ?? "/assessment-recording",
  channels: channelHelpers.inAppAndEmail(),
  schema: baseSchema,
  title: () => "Public assessment link approved",
  variant: "success",
});

export const assessmentPublicLinkRejected = defineSchoolNotification({
  buildAction: () =>
    createHrefNotificationAction({
      href: "/assessment-recording",
      label: "Open assessment recording",
    }),
  buildBody: (payload) =>
    `Your public assessment recording link request for ${payload.scopeLabel} was rejected.${payload.note ? ` Note: ${payload.note}` : ""}`,
  buildEmailTemplate: (payload) => ({
    content: createAssessmentLinkTemplate({
      ctaHref: payload.link ?? "/assessment-recording",
      ctaLabel: "Open assessment recording",
      eventLabel: "Assessment link rejected",
      greetingName: payload.requesterName,
      message: `Your public assessment recording link request was rejected.${payload.actorName ? ` Reviewed by ${payload.actorName}.` : ""}`,
      metadata: metadata(payload),
      schoolName: payload.schoolName,
      title: "Public assessment link request rejected",
    }),
    subject: `${payload.schoolName}: assessment link request update`,
  }),
  buildLink: () => "/assessment-recording",
  channels: channelHelpers.inAppAndEmail(),
  schema: baseSchema,
  title: () => "Public assessment link request rejected",
  variant: "warning",
});
