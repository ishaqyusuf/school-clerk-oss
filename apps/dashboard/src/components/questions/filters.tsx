"use client";

import { useQuestionParams } from "@/hooks/use-questions-params";
import { useTRPC } from "@/trpc/client";

import { useSuspenseQuery } from "@tanstack/react-query";

export function Filters({}) {
  const trpc = useTRPC();
  const { params: filter } = useQuestionParams();
  // const infiniteQueryOptions = trpc.questions.all.infiniteQueryOptions(
  //   {
  //     //   sort: params.sort,
  //     ...filter,
  //   },
  //   {
  //     getNextPageParam: ({ meta }) => meta?.cursor,
  //   },
  // );

  const { data, isFetching } = useSuspenseQuery(
    trpc.questions.all.queryOptions({
      ...filter,
    })
  );

  if (!data?.length) return <>No Result</>;
  // return <div>{JSON.stringify(data?.[0])}</div>;
  return <div></div>;
}
