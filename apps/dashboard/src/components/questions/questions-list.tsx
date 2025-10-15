"use client";

import { useQuestionFormParams } from "@/hooks/use-question-form-params";
import { useQuestionParams } from "@/hooks/use-questions-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { RenderQuestion } from "./render-question";

export function QuestionList({}) {
  const trpc = useTRPC();
  const { params: filter } = useQuestionParams();
  const {} = filter;
  // const infiniteQueryOptions = trpc.questions.all.infiniteQueryOptions(
  //   {
  //     //   sort: params.sort,
  //     ...filter,
  //   },
  //   {
  //     getNextPageParam: ({ meta }) => meta?.cursor,
  //   },
  // );

  // const { data, fetchNextPage, hasNextPage, isFetching } =
  //   useSuspenseInfiniteQuery(infiniteQueryOptions);

  // const tableData = useMemo(() => {
  //   return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
  // }, [data]);
  const { data } = useSuspenseQuery(
    trpc.questions.all.queryOptions({
      ...filter,
    }),
  );
  const { params, setParams } = useQuestionFormParams();
  if (!data?.length) return <>No Result</>;
  return (
    <div className="max-w-[800px] print:max-w-none container">
      {data?.map((question) => (
        <div
          onClick={(e) => {
            setParams({
              postId: question.id,
            });
          }}
          key={question.id}
        >
          {/* {JSON.stringify(question)} */}
          <RenderQuestion data={question} />
        </div>
      ))}
    </div>
  );
}
