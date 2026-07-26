import type { Prisma } from "./generated/client";

export const classroomListOrderBy = [
	{ classLevel: { sort: "asc", nulls: "last" } },
	{ name: "asc" },
	{ id: "asc" },
] satisfies Prisma.ClassRoomOrderByWithRelationInput[];

export const nestedClassroomDepartmentListOrderBy = [
	{ departmentLevel: { sort: "asc", nulls: "last" } },
	{ departmentName: "asc" },
	{ id: "asc" },
] satisfies Prisma.ClassRoomDepartmentOrderByWithRelationInput[];

export const classroomDepartmentListOrderBy = [
	{ classRoom: { classLevel: { sort: "asc", nulls: "last" } } },
	{ departmentLevel: { sort: "asc", nulls: "last" } },
	{ classRoom: { name: "asc" } },
	{ departmentName: "asc" },
	{ id: "asc" },
] satisfies Prisma.ClassRoomDepartmentOrderByWithRelationInput[];

type OrderedClassroomDepartment = {
	id?: string | null;
	departmentLevel?: number | null;
	departmentName?: string | null;
	classRoom?: {
		id?: string | null;
		classLevel?: number | null;
		name?: string | null;
	} | null;
};

function compareNullableNumber(left?: number | null, right?: number | null) {
	if (left == null && right == null) return 0;
	if (left == null) return 1;
	if (right == null) return -1;
	return left - right;
}

function compareNullableText(left?: string | null, right?: string | null) {
	if (left == null && right == null) return 0;
	if (left == null) return 1;
	if (right == null) return -1;
	return left.localeCompare(right);
}

export function compareClassroomDepartments(
	left: OrderedClassroomDepartment,
	right: OrderedClassroomDepartment,
) {
	return (
		compareNullableNumber(
			left.classRoom?.classLevel,
			right.classRoom?.classLevel,
		) ||
		compareNullableNumber(left.departmentLevel, right.departmentLevel) ||
		compareNullableText(left.classRoom?.name, right.classRoom?.name) ||
		compareNullableText(left.departmentName, right.departmentName) ||
		compareNullableText(left.id, right.id)
	);
}
