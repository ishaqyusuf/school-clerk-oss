const DEFAULT_EMAIL_SENDER_ADDRESS = "noreply@school-clerk.com";

function extractEmailAddress(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const bracketedEmail = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (bracketedEmail?.[1]) return bracketedEmail[1];

  if (/^[^<>\s@]+@[^<>\s@]+$/.test(trimmed)) return trimmed;

  return null;
}

function formatEmailDisplayName(value?: string | null) {
  return (
    value
      ?.replace(/[\r\n<>]/g, " ")
      .replace(/"/g, "'")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

export function formatTenantEmailFrom({
  defaultEmail = DEFAULT_EMAIL_SENDER_ADDRESS,
  fallbackFrom,
  fallbackName = "School Clerk",
  schoolName,
}: {
  defaultEmail?: string;
  fallbackFrom?: string | null;
  fallbackName?: string;
  schoolName?: string | null;
}) {
  const displayName =
    formatEmailDisplayName(schoolName) ??
    formatEmailDisplayName(fallbackName) ??
    "School Clerk";
  const emailAddress = extractEmailAddress(fallbackFrom) ?? defaultEmail;

  return `${displayName} <${emailAddress}>`;
}
