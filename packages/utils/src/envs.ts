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

export type EmailDeliveryMode = "console" | "live";

export type EmailDeliveryRoute = {
	originalRecipient: string;
	recipient: string;
	transport: "console" | "provider";
	qaRouted: boolean;
};

function normalizeDomain(value: string) {
	return value.trim().toLowerCase().replace(/^\.+/, "");
}

export function parseQaDomainRoutes(
	value = process.env.EMAIL_QA_DOMAIN_ROUTES,
) {
	if (!value?.trim()) return new Map<string, string>();

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		throw new Error("EMAIL_QA_DOMAIN_ROUTES must be valid JSON.");
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("EMAIL_QA_DOMAIN_ROUTES must be a JSON object.");
	}

	const routes = new Map<string, string>();
	for (const [domain, destination] of Object.entries(parsed)) {
		if (typeof destination !== "string" || !destination.trim()) {
			throw new Error("Every QA email domain route needs a destination.");
		}
		routes.set(normalizeDomain(domain), destination.trim());
	}
	return routes;
}

export function getEmailDeliveryMode(): EmailDeliveryMode {
	const configured = process.env.EMAIL_DELIVERY_MODE?.trim().toLowerCase();
	if (configured && configured !== "console" && configured !== "live") {
		throw new Error("EMAIL_DELIVERY_MODE must be console or live.");
	}
	if (configured) return configured as EmailDeliveryMode;
	return process.env.NODE_ENV === "production" ? "live" : "console";
}

export function getEmailDeliveryRoutes(
	recipient: string | string[],
): EmailDeliveryRoute[] {
	const recipients = Array.isArray(recipient) ? recipient : [recipient];
	const qaRoutes = parseQaDomainRoutes();
	const mode = getEmailDeliveryMode();

	return recipients.map((originalRecipient) => {
		const normalized = originalRecipient.trim().toLowerCase();
		const domain = normalizeDomain(normalized.split("@").at(-1) ?? "");
		const destination = qaRoutes.get(domain);

		if (destination) {
			return {
				originalRecipient,
				recipient: destination,
				transport: "provider" as const,
				qaRouted: true,
			};
		}

		if (domain.endsWith(".test")) {
			throw new Error(`No QA email route is configured for ${domain}.`);
		}

		return {
			originalRecipient,
			recipient: originalRecipient,
			transport: mode === "live" ? ("provider" as const) : ("console" as const),
			qaRouted: false,
		};
	});
}

/** @deprecated Prefer getEmailDeliveryRoutes at the delivery boundary. */
export function getRecipient(recipient: string | string[]) {
	const routes = getEmailDeliveryRoutes(recipient);
	const recipients = routes.map((route) => route.recipient);
	if (Array.isArray(recipient)) return recipients;
	const resolved = recipients[0];
	if (!resolved) throw new Error("At least one email recipient is required.");
	return resolved;
}

export function getQaDomainForEmail(email: string) {
	const domain = normalizeDomain(email.split("@").at(-1) ?? "");
	return parseQaDomainRoutes().has(domain) ? domain : null;
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
