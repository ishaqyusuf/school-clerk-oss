import { describe, expect, test } from "bun:test";
import {
	classroomDepartmentListOrderBy,
	classroomListOrderBy,
	compareClassroomDepartments,
	nestedClassroomDepartmentListOrderBy,
} from "./classroom-order";

describe("classroom list ordering", () => {
	test("orders classes by level before name and id", () => {
		expect(classroomListOrderBy).toEqual([
			{ classLevel: { sort: "asc", nulls: "last" } },
			{ name: "asc" },
			{ id: "asc" },
		]);
	});

	test("orders classroom departments by class level then department level", () => {
		expect(classroomDepartmentListOrderBy).toEqual([
			{ classRoom: { classLevel: { sort: "asc", nulls: "last" } } },
			{ departmentLevel: { sort: "asc", nulls: "last" } },
			{ classRoom: { name: "asc" } },
			{ departmentName: "asc" },
			{ id: "asc" },
		]);
		expect(nestedClassroomDepartmentListOrderBy).toEqual([
			{ departmentLevel: { sort: "asc", nulls: "last" } },
			{ departmentName: "asc" },
			{ id: "asc" },
		]);
	});

	test("uses the same level-first contract for in-memory API results", () => {
		const rows = [
			{
				id: "class-2-department-1",
				departmentLevel: 1,
				departmentName: "A",
				classRoom: { id: "class-2", classLevel: 2, name: "Class 2" },
			},
			{
				id: "class-1-department-2",
				departmentLevel: 2,
				departmentName: "B",
				classRoom: { id: "class-1", classLevel: 1, name: "Class 1" },
			},
			{
				id: "class-1-department-1",
				departmentLevel: 1,
				departmentName: "A",
				classRoom: { id: "class-1", classLevel: 1, name: "Class 1" },
			},
			{
				id: "same-level-other-class-department-1",
				departmentLevel: 1,
				departmentName: "A",
				classRoom: { id: "class-z", classLevel: 1, name: "Class Z" },
			},
			{
				id: "unranked",
				departmentLevel: null,
				departmentName: "Later",
				classRoom: { id: "unranked-class", classLevel: null, name: "Later" },
			},
		];

		expect(
			rows
				.slice()
				.sort(compareClassroomDepartments)
				.map((row) => row.id),
		).toEqual([
			"class-1-department-1",
			"same-level-other-class-department-1",
			"class-1-department-2",
			"class-2-department-1",
			"unranked",
		]);
	});
});
