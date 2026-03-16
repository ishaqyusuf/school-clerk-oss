# data-page
# data-page
## `db/queries/subject.ts`
```typescript
export const getSubjectsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetSubjectsSchema = z.infer<typeof getSubjectsSchema>;

export async function getSubjects(
  ctx: TRPCContext,
  query: GetSubjectsSchema
) {
  const {db} = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSubjects(query),
    db.subjects
  );

  const data = await db.subjects.findMany({
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
function whereSubjects(query: GetSubjectsSchema) {
  const where: Prisma.SubjectsWhereInput[] = [
     
  ];
  if (query.q) {
    where.push({
    
    });
  }
  return composeQuery(where);
}
```
## `routers/subject.routes.ts`
```typescript
  getSubjects: publicProcedure.input(getSubjectsSchema)
  .query(async (props) => {
    return getSubjects(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
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
```
## `trpc/routers/filters.route.ts`
```typescript
subject: publicProcedure.query(async (props) => {
     return subjectFilters(props.ctx)
  })
```
## `hooks/use-subject-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["subjects"]['getSubjects'], void>;

export const subjectFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useSubjectFilterParams() {
    const [filters, setFilters] = useQueryStates(subjectFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadSubjectFilterParams = createLoader(
    subjectFilterParams,
);
```
## `hooks/use-subject-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useSubjectParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openSubjectId: parseAsInteger
    },
    options
  );
  const opened = !!params.openSubjectId
  return {
    ...params,
    setParams,opened
  };
}
```
## `subject/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@school-clerk/utils/construct-metadata";
import { DataTable } from "@/components/tables/subject/data-table";
import { SubjectHeader } from "@/components/subject-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadSubjectFilterParams } from "@/hooks/use-subject-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Subject | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadSubjectFilterParams(searchParams);
    batchPrefetch([
        trpc.subjects.getSubjects.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div>
        <PageTitle>Subject</PageTitle>
            <SubjectHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `components/subject-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@school-clerk/ui/custom/search-filter/index";
import { SubjectSearchFilter } from "./subject-search-filter";
import { OpenSubjectSheet } from "./open-subject-sheet";
import { subjectFilterParams } from "@/hooks/use-subject-filter-params";

export function SubjectHeader({}) {
    return (
        <div className="flex justify-between">
             {/* <SubjectSearchFilter /> */}
             <SearchFilter
        filterSchema={subjectFilterParams}
        placeholder="Search Subjects..."
        trpcRoute={trpc.filters.subject}
      />
            <div className="flex-1"></div>
            <OpenSubjectSheet/>
        </div>
    );
}
```
## `components/open-subject-sheet`
```typescript
import { useSubjectParams } from "@/hooks/use-subject-params";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";

export function OpenSubjectSheet() {
  const { setParams } = useSubjectParams();

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
## `components/subject-search-filter.tsx`
```typescript
"use client";
import { SearchFilterProvider } from "@school-clerk/ui/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "@school-clerk/ui/search-filter";
import { subjectFilterParams } from "@/hooks/use-subject-filter-params";

export function SubjectSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: subjectFilterParams,
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
        ...trpc.filters.subject.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Subjects..."}
                filterList={trpcFilterData}
            />
        </>
    );
}
```
## `components/tables/subject-page/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns, mobileColumn } from "./columns";
import { Table, TableBody } from "@school-clerk/ui/table";
import { TableHeaderComponent } from "@school-clerk/ui/data-table/table-header";
import { TableRow } from "@school-clerk/ui/data-table/table-row";
import { useSubjectFilterParams } from "@/hooks/use-subject-filter-params";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { LoadMoreTRPC } from "@school-clerk/ui/data-table/load-more";

export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useSubjectStore();
  const { filters } = useSubjectFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.subjects.getSubjects,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });
  const { setParams } = useSubjectParams();
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
## `components/tables/subject-page/columns.tsx`
```typescript
import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Menu } from "@school-clerk/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@school-clerk/ui/cn";
import { useSubjectParams } from "@/hooks/use-subject-params";

export type Item = RouterOutputs["subjects"]["getSubjects"]["data"][number];
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
  const { setParams } = useSubjectParams();
  return <></>;
}
```
## `subject-form-queries`
```typescript

  export const subjectFormSchema = z
  .object({
     param: z.string()
  });
export type SubjectFormSchema = z.infer<typeof subjectFormSchema>;

export async function saveSubject(
  ctx: TRPCContext,
  query: SubjectFormSchema
) {
  const {db} = ctx;
  
}
  export const getSubjectFormSchema = z
  .object({
     
  });
export type GetSubjectFormSchema = z.infer<typeof subjectFormSchema>;
export async function getSubjectForm(
  ctx: TRPCContext,
  query: GetSubjectFormSchema
) {
  const {db} = ctx;
  
}
```

## `subject-form-trpc-routes`
```typescript
  import {saveSubject,subjectFormSchema,getSubjectForm,getSubjectFormSchema} from "@api/db/queries/route";

  saveSubject: publicProcedure
    .input(subjectFormSchema)
    .mutation(async (props) => {
      return saveSubject(props.ctx, props.input);
    }),
  getSubjectForm: publicProcedure
    .input(getSubjectFormSchema)
    .mutation(async (props) => {
      return getSubjectForm(props.ctx, props.input);
    }),

```
## `components/forms/subject-form`
```typescript
import { Form } from "@school-clerk/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof subjectFormSchema.type
}
export function SubjectForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(subjectFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.subjects.saveSubject.mutationOptions({
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
          queryKey: trpc.subjects.getSubjects.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof subjectFormSchema.type) => {
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