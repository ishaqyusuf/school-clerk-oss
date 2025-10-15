import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useDebugToast } from "./use-debug-console";
export const useTableData = ({ filter, route }) => {
  // const trpc = useTRPC();
  const { ref, inView } = useInView();

  const deferredSearch = useDeferredValue(filter.q);

  const infiniteQueryOptions = route.infiniteQueryOptions(
    {
      ...filter,
      q: deferredSearch,
    },
    {
      getNextPageParam: ({ meta }) => {
        return meta?.cursor;
      },
    }
  );
  const { data, error, fetchNextPage, hasNextPage, isFetching } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);
  const tableData = useMemo(() => {
    const list =
      data?.pages.flatMap((page) => {
        return (page as any)?.data ?? [];
      }) ?? [];
    const meta = (data?.pages?.reverse()?.[0] as any)?.meta;
    const { cursor, count } = meta || {};
    return {
      data: list,
      resultCount: cursor,
      total: count,
    };
  }, [data]);
  // useDebugToast("DEBUG", { data, error, isFetching, filter, deferredSearch });
  useEffect(() => {
    if (isFetching) return;
    if (inView) {
      fetchNextPage();
    }
  }, [inView, isFetching]);
  return {
    ref,
    ...tableData,
    data: tableData?.data,
    queryData: data,
    hasNextPage,
    isFetching,
    // from: data?.
  };
};
