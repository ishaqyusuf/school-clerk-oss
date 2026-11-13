import { describe, expect, test } from "bun:test";
import { resolveDashboardNavigation } from "@/features/navigation/dashboard-navigation";
import { collectNavigationPaths, routeIsReachable } from "./use-can-open-route";

const attendanceHref =
	"/academic/classes?viewClassroomId=c1&classroomTab=attendance&attendanceSessionId=a1";
const studentHref = "/students?studentViewId=s1&studentViewTab=overview";

describe("activity action reachability", () => {
	test("admins can open classroom and student targets", () => {
		const paths = collectNavigationPaths(resolveDashboardNavigation("Admin"));
		expect(routeIsReachable(paths, attendanceHref)).toBe(true);
		expect(routeIsReachable(paths, studentHref)).toBe(true);
	});

	test("teachers cannot reach admin classroom or student routes", () => {
		const paths = collectNavigationPaths(resolveDashboardNavigation("Teacher"));
		expect(routeIsReachable(paths, attendanceHref)).toBe(false);
		expect(routeIsReachable(paths, studentHref)).toBe(false);
		expect(routeIsReachable(paths, "/activity?activityId=x")).toBe(true);
	});
});
