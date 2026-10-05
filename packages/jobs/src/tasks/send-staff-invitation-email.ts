import { sendStaffInvitationEmailSchema } from "../schema.js";
import { getStaffInvitationDelivery, prisma } from "@school-clerk/db";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { STAFF_ROLES } from "@school-clerk/utils/constants";
import { isStaffOnboardingUrl, resolveAuthConfiguration } from "@school-clerk/utils/auth-url";
import { StaffInvitationEmail } from "@school-clerk/email/emails/staff-invitation";
import {
  formatTenantEmailFrom,
  formatTenantEmailSubject,
} from "@school-clerk/utils/email";
import { sendStaffInvitationEmailTaskId } from "@school-clerk/utils/task-contracts";
import { queue, schemaTask } from "@trigger.dev/sdk";
import React from "react";
import { sendEmail } from "../utils/resend.js";

export const sendStaffInvitationEmailQueue = queue({
  concurrencyLimit: 10,
  name: "send-staff-invitation-email",
});

export const sendStaffInvitationEmail = schemaTask({
  id: sendStaffInvitationEmailTaskId,
  schema: sendStaffInvitationEmailSchema,
  maxDuration: 60,
  queue: sendStaffInvitationEmailQueue,
  run: async (payload) => {
    const load = async () => {
      const current = await getStaffInvitationDelivery(prisma, payload);
      if (!current) return null;
      const configuration = resolveAuthConfiguration({
        nodeEnv: process.env.NODE_ENV, authUrl: process.env.BETTER_AUTH_URL,
        dashboardUrl: process.env.DASHBOARD_APP_URL, publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
        appRootDomain: process.env.APP_ROOT_DOMAIN,
      });
      if (!isStaffOnboardingUrl(payload.ctaHref, { baseUrl: configuration.baseUrl,
        tenantSlug: current.school.subDomain, staffId: current.staff.id, email: current.user.email })) return null;
      return current && STAFF_ROLES.some((role) => role === current.user.role) &&
        canAccessModules(resolveModuleAccess(current.school.moduleConfiguration), ["STAFF_MANAGEMENT"])
        ? current : null;
    };
    const current = await load();
    if (!current) return { skipped: true };
    const roleLabel = current.user.role;
    if (!roleLabel) return { skipped: true };
    return sendEmail({
      idempotencyKey: `staff-invitation:${payload.deliveryId}`,
      beforeSend: async () => {
        const latest = await load();
        return !!latest && latest.school.name === current.school.name &&
          latest.user.email === current.user.email && latest.user.name === current.user.name && latest.user.role === roleLabel &&
          latest.staff.name === current.staff.name && latest.actor.name === current.actor.name;
      },
      subject: formatTenantEmailSubject({
        message: `you're invited to join as ${roleLabel}`,
        schoolName: current.school.name,
      }),
      from: formatTenantEmailFrom({
        fallbackFrom: process.env.RESEND_FROM_EMAIL,
        schoolName: current.school.name,
      }),
      to: current.user.email,
      content: React.createElement(StaffInvitationEmail, {
        ctaHref: payload.ctaHref,
        inviteeName: current.staff.name || current.user.name,
        inviterName: current.actor.name,
        roleLabel,
        schoolName: current.school.name,
      }),
      successLog: "staff invitation email sent",
      errorLog: "staff invitation email failed to send",
      task: {
        id: sendStaffInvitationEmailTaskId,
        payload,
      },
    });
  },
});
