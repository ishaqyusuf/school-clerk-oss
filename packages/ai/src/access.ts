import type { SchoolAssistantConfig } from "@school-clerk/db";
import type { ResolvedModuleAccess } from "@school-clerk/utils/module-config";
import {
	aiCapabilities,
	aiCapabilityMap,
	type AiCapabilityKey,
} from "./capabilities";
import { safeJsonParse } from "./schemas";
import { hasSchoolAiCapabilityModules } from "./tools/module-policy";
const CURRENT_RELEASED_CHAT_ROLES = ["Admin"];
const DEFAULT_ALLOWED_ROLES = ["Admin"];
export function getAllowedCapabilities({
	role,
	config,
	moduleAccess,
}: {
	role: string | null;
	config: SchoolAssistantConfig;
	moduleAccess: ResolvedModuleAccess;
}) {
	const allowedRoles = safeJsonParse<string[]>(
		config.allowedRoles,
		DEFAULT_ALLOWED_ROLES,
	);
	const enabledCapabilities = safeJsonParse<AiCapabilityKey[]>(
		config.enabledCapabilities,
		aiCapabilities.map((cap) => cap.key),
	);
	const disabledCapabilities = new Set(
		safeJsonParse<AiCapabilityKey[]>(config.disabledCapabilities, []),
	);

	if (
		!config.enabled ||
		!role ||
		!CURRENT_RELEASED_CHAT_ROLES.includes(role) ||
		!allowedRoles.includes(role)
	) {
		return [] as AiCapabilityKey[];
	}

	return enabledCapabilities.filter((key) => {
		const capability = aiCapabilityMap[key];
		return (
			capability &&
			hasSchoolAiCapabilityModules(key, moduleAccess) &&
			!disabledCapabilities.has(key) &&
			capability.roles.includes(role)
		);
	});
}

export function isCapabilityAllowed({
	role,
	config,
	capability,
	moduleAccess,
}: {
	role: string | null;
	config: SchoolAssistantConfig;
	capability: AiCapabilityKey;
	moduleAccess: ResolvedModuleAccess;
}) {
	return getAllowedCapabilities({ role, config, moduleAccess }).includes(
		capability,
	);
}
