import "server-only";
import { z } from "zod";

const workspaceCookieSchema = z.object({
  domain: z.string().max(253),
  schoolId: z.string().min(1).max(200).optional(),
  sessionId: z.string().min(1).max(200).optional(),
  termId: z.string().min(1).max(200).optional(),
  sessionTitle: z.string().max(500).optional(),
  termTitle: z.string().max(500).optional(),
  auth: z.object({ bearerToken: z.string().max(512), userId: z.string().max(200) }),
  remembered: z.boolean().optional(),
});

export type AuthCookie = z.infer<typeof workspaceCookieSchema>;

export function emptyWorkspaceCookie(domain: string): AuthCookie {
  return { domain, auth: { bearerToken: "", userId: "" }, remembered: false };
}

export function parseWorkspaceCookie(value?: string | null): AuthCookie | null {
  if (!value || value.length > 8192) return null;
  try {
    const result = workspaceCookieSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function workspaceCookieOptions(remembered = false) {
  return { httpOnly: true, secure: true, path: "/", sameSite: "lax" as const,
    maxAge: remembered ? 60 * 60 * 24 * 30 : undefined };
}

export function workspaceCookieSelection(cookie: AuthCookie | null, input: {
  domain: string; token: string; userId: string;
}) {
  return cookie?.domain === input.domain && cookie.auth.userId === input.userId &&
    cookie.auth.bearerToken === input.token
    ? { schoolId: cookie.schoolId, sessionId: cookie.sessionId, termId: cookie.termId } : undefined;
}
