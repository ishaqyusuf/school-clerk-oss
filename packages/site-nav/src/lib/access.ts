import type { Access } from "./types";

export const navHasAccess = (
	type: Access["type"],
	equator: Access["equator"],
	...values
) => ({ type, equator, values }) as Access;

export const initRoleAccess = <Role>(a: Role) => ({
	is: (role: Role) => navHasAccess("role", "is", role),
	isNot: (role: Role) => navHasAccess("role", "isNot", role),
	in: (...roles: Role[]) => navHasAccess("role", "in", ...roles),
	notIn: (...roles: Role[]) => navHasAccess("role", "notIn", ...roles),
	every: (...roles: Role[]) => navHasAccess("role", "every", ...roles),
	some: (...roles: Role[]) => navHasAccess("role", "some", ...roles),
});

export const initPermAccess = <PermissionScope>(a: PermissionScope) => ({
	is: (role: PermissionScope) => navHasAccess("permission", "is", role),
	isNot: (role: PermissionScope) => navHasAccess("permission", "isNot", role),
	in: (...roles: PermissionScope[]) =>
		navHasAccess("permission", "in", ...roles),
	notIn: (...roles: PermissionScope[]) =>
		navHasAccess("permission", "notIn", ...roles),
	every: (...roles: PermissionScope[]) =>
		navHasAccess("permission", "every", ...roles),
	some: (...roles: PermissionScope[]) =>
		navHasAccess("permission", "some", ...roles),
});

export function validateRules(accessList: Access[], can?, userId?, _role?) {
	const permissions = can ?? {};
	const role = (typeof _role === "string" ? _role : _role?.name)?.toLowerCase();
	for (const [key, value] of Object.entries(permissions)) {
		permissions[key?.toLocaleLowerCase()] = value;
	}
	const isValid = accessList.every((a) => {
		switch (a.type) {
			case "permission":
				switch (a.equator) {
					case "every":
					case "is":
						return a.values?.every((p) => permissions?.[p]);
					case "in":
					case "some":
						return a.values?.some((p) => permissions?.[p]);
					case "isNot":
					case "notIn":
						return a.values.every((p) => !permissions?.[p]);
				}
				break;
			case "role":
				switch (a.equator) {
					case "every":
					case "is":
						return a.values?.every((p) => role === p?.toLowerCase());
					case "in":
					case "some":
						return a.values?.some((p) => role === p?.toLowerCase());
					case "isNot":
					case "notIn":
						return a.values.every((p) => role !== p?.toLowerCase());
				}
				break;
		}

		return true;
	});
	return isValid;
}
