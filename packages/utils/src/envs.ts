export function getAppUrl() {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://gnd-prodesk.vercel.app";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function getDevelopmentEmailRecipient() {
  const devEmailRecipient = process.env.DEV_EMAIL_RECIPIENT?.trim();

  if (!devEmailRecipient) {
    throw new Error(
      "DEV_EMAIL_RECIPIENT must be configured in development before sending email.",
    );
  }

  return devEmailRecipient;
}

export function getRecipient(recipient: string | string[]) {
  if (process.env.NODE_ENV === "development") {
    return getDevelopmentEmailRecipient();
  }

  return recipient;
}

export function getEmailUrl() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://midday.ai";
}

export function getWebsiteUrl() {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://midday.ai";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getCdnUrl() {
  return "https://cdn.midday.ai";
}
