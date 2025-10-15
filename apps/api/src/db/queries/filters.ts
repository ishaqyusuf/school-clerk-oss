import type { TRPCContext } from "@api/trpc/init";
import type { GetSubjectsSchema } from "@api/trpc/schemas/students";
import type { PageFilterData } from "@api/type";
import type { GetClassroomsSchema } from "./classroom";

function optionFilter<T>(
  value: T,
  label,
  options: { label: any; value: any }[]
) {
  return {
    label,
    value,
    options: options.map(({ label, value }) => ({
      label,
      value: value, //?.toString(),
    })),
    type: "checkbox",
  } satisfies PageFilterData<T>;
}
function dateFilter<T>(value: T, label) {
  return {
    label,
    value,
    type: "date",
  } satisfies PageFilterData<T>;
}
function dateRangeFilter<T>(value: T, label) {
  return {
    label,
    value,
    type: "date-range",
  } satisfies PageFilterData<T>;
}
const searchFilter = {
  label: "Search",
  type: "input",
  value: "q",
} as PageFilterData<"q">;
export async function subjectFilters(ctx: TRPCContext) {
  type T = keyof GetSubjectsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Subjects.findMany({
  //     where: {},
  //     select: {
  //       id: true,
  //       title: true,
  //     },
  //   }),
  //   "title",
  //   "id"
  // );
  const resp = [
    searchFilter,
    // optionFilter<T>("categoryId", "Category", steps),
    // dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}
export async function classroomFilters(ctx: TRPCContext) {
  type T = keyof GetClassroomsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.ClassRoomDepartment.findMany({
  //     where: {},
  //     select: {
  //       id: true,
  //       title: true,
  //     },
  //   }),
  //   "title",
  //   "id"
  // );
  const resp = [
    searchFilter,
    // optionFilter<T>("categoryId", "Category", steps),
    // dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}
