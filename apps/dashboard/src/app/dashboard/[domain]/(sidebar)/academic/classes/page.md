# data-page
# data-page
## `db/queries/classrooms.ts`
```typescript
export const getClassroomsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetClassroomsSchema = z.infer<typeof getClassroomsSchema>;

export async function getClassrooms(
  ctx: TRPCContext,
  query: GetClassroomsSchema
) {
  const {db} = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereClassrooms(query),
    db.classroomDepartments
  );

  const data = await db.classroomDepartments.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
       
    },
  });

  return await response(
    data.map((d) => ({
      ...d
    }))
  );
}
function whereClassrooms(query: GetClassroomsSchema) {
  const where: Prisma.ClassroomDepartmentsWhereInput[] = [
     
  ];
  if (query.q) {
    where.push({
    
    });
  }
  return composeQuery(where);
}
```
## `routers/classroom.routes.ts`
```typescript
  getClassrooms: publicProcedure.input(getClassroomsSchema)
  .query(async (props) => {
    return getClassrooms(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function classroomFilters(ctx: TRPCContext) {
  type T = keyof GetClassroomsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.ClassroomDepartments.findMany({
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
```
## `trpc/routers/filters.route.ts`
```typescript
classroom: publicProcedure.query(async (props) => {
     return classroomFilters(props.ctx)
  })
```
## `hooks/use-classroom-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["academics"]['getClassrooms'], void>;

export const classroomFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useClassroomFilterParams() {
    const [filters, setFilters] = useQueryStates(classroomFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadClassroomFilterParams = createLoader(
    classroomFilterParams,
);
```
## `hooks/use-classroom-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useClassroomParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openClassroomId: parseAsInteger
    },
    options
  );
  const opened = !!params.openClassroomId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-classroom-sheet`
```typescript
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function OpenClassroomSheet() {
  const { setParams } = useClassroomParams();

  return (
    <div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setParams({ 

        })}
      >
        <Icons.Add />
      </Button>
    </div>
  );
}

```
## `components/classroom-search-filter.tsx`
```typescript
"use client";
import { SearchFilterProvider } from "@school-clerk/ui/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "@school-clerk/ui/search-filter";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";

export function ClassroomSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: classroomFilterParams,
                },
            ]}
        >
            <Content />
        </SearchFilterProvider>
    );
}

function Content({}) {
    const trpc = useTRPC();
    const { data: trpcFilterData } = useQuery({
        ...trpc.filters.classroom.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Classrooms..."}
                filterList={trpcFilterData}
            />
        </>
    );
}
```
## `components/classroom-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@school-clerk/ui/custom/search-filter/index";
import { ClassroomSearchFilter } from "./classroom-search-filter";
import { OpenClassroomSheet } from "./open-classroom-sheet";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useTRPC } from "@/trpc/client";

export function ClassroomHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
             {/* <ClassroomSearchFilter /> */}
             <SearchFilter
        filterSchema={classroomFilterParams}
        placeholder="Search Classrooms..."
        trpcRoute={trpc.filters.classroom}
      />
            <div className="flex-1"></div>
            <OpenClassroomSheet/>
        </div>
    );
}
```
## `components/tables/classroom-page/columns.tsx`
```typescript
import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Menu } from "@school-clerk/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@school-clerk/ui/cn";
import { useClassroomParams } from "@/hooks/use-classroom-params";

export type Item = RouterOutputs["academics"]["getClassrooms"]["data"][number];
interface ItemProps {
  item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
  header: "",
  accessorKey: "",
  meta: {},
  cell: ({ row: { original: item } }) => <></>,
};

export const columns: Column[] = [
  column1,
  {
    header: "",
    accessorKey: "action",
    meta: {
      actionCell: true,
      preventDefault: true,
    },
    cell: ({ row: { original: item } }) => (
      <>
        <Actions item={item} />
      </>
    ),
  },
];

function Actions({ item }: ItemProps) {
  const isMobile = useIsMobile();
  return (
    <div className="relative z-10">
      <Menu
        triggerSize={isMobile ? "default" : "xs"}
        Trigger={
          <Button className={cn(isMobile || "size-4 p-0")} variant="ghost">
            <Icons.MoreHoriz className="" />
          </Button>
        }
      >
        <Menu.Item SubMenu={<></>}>Mark as</Menu.Item>
      </Menu>
    </div>
  );
}
export const mobileColumn: ColumnDef<Item>[] = [
  {
    header: "",
    accessorKey: "row",
    meta: {
      className: "flex-1 p-0",
      // preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
      return <ItemCard item={item} />;
    },
  },
];
function ItemCard({ item }: ItemProps) {
  // design a mobile version of the columns here
  const { setParams } = useClassroomParams();
  return <></>;
}
```
## `components/tables/classroom-page/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns, mobileColumn } from "./columns";
import { Table, TableBody } from "@school-clerk/ui/table";
import { TableHeaderComponent } from "@school-clerk/ui/data-table/table-header";
import { TableRow } from "@school-clerk/ui/data-table/table-row";
import { useClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { LoadMoreTRPC } from "@school-clerk/ui/data-table/load-more";

export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useClassroomStore();
  const { filters } = useClassroomFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.academics.getClassrooms,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });
  const { setParams } = useClassroomParams();
  return (
    <TableProvider
      args={[
        {
          columns,
          // mobileColumn: mobileColumn,
          data,
          // checkbox: true,
          // tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
            // rowClick(id, rowData) {
            //   //   overviewQuery.open2(rowData.uuid, "sales");
            //   setParams({
            //     //
            //   });
            // },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
        <div
          // ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <TableHeaderComponent />
            <TableBody>
              <TableRow />
            </TableBody>
          </Table>
        </div>
        {hasNextPage && <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />}
        {/* <BatchActions /> */}
      </div>
    </TableProvider>
  );
}
```
## `classroom/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@school-clerk/utils/construct-metadata";
import { DataTable } from "@/components/tables/classroom/data-table";
import { ClassroomHeader } from "@/components/classroom-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Classroom | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadClassroomFilterParams(searchParams);
    batchPrefetch([
        trpc.academics.getClassrooms.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div>
        <PageTitle>Classroom</PageTitle>
            <ClassroomHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `classroom-form-queries`
```typescript

  export const classroomFormSchema = z
  .object({
     param: z.string()
  });
export type ClassroomFormSchema = z.infer<typeof classroomFormSchema>;

export async function saveClassroom(
  ctx: TRPCContext,
  query: ClassroomFormSchema
) {
  const {db} = ctx;
  
}
  export const getClassroomFormSchema = z
  .object({
     
  });
export type GetClassroomFormSchema = z.infer<typeof classroomFormSchema>;
export async function getClassroomForm(
  ctx: TRPCContext,
  query: GetClassroomFormSchema
) {
  const {db} = ctx;
  
}
```
## `classroom-form-trpc-routes`
```typescript
  import {saveClassroom,classroomFormSchema,getClassroomForm,getClassroomFormSchema} from "@api/db/queries/route";

  saveClassroom: publicProcedure
    .input(classroomFormSchema)
    .mutation(async (props) => {
      return saveClassroom(props.ctx, props.input);
    }),
  getClassroomForm: publicProcedure
    .input(getClassroomFormSchema)
    .mutation(async (props) => {
      return getClassroomForm(props.ctx, props.input);
    }),

```
## `components/forms/classroom-form`
```typescript
import { Form } from "@school-clerk/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof classroomFormSchema.type
}
export function ClassroomForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(classroomFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.academics.saveClassroom.mutationOptions({
      meta: {
              toastTitle: {
                error: "Something went wrong",
                loading: "Saving...",
                success: "Success",
              },
            },
      onSuccess() {
        form.reset();
        qc.invalidateQueriest({
          queryKey: trpc.academics.getClassrooms.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof classroomFormSchema.type) => {
    mutate(data)
  }
  return <div>
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        
        <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
        <FormDebugBtn />
      </form>
    </Form>
  </div>
}
```