import { Filters } from "@/components/questions/filters";
import { NewQuestionButton } from "@/components/questions/new-question-button";
import { QuestionList } from "@/components/questions/questions-list";
import { loadQuestionsParams } from "@/hooks/use-questions-params";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { Metadata } from "next";
import { SearchParams } from "nuqs";

export const metadata: Metadata = {
  title: "Questions | 1st Term",
};
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const { classDepartmentId, subjectId } = loadQuestionsParams(searchParams);

  batchPrefetch([
    trpc.questions.all.queryOptions({
      classDepartmentId,
      subjectId,
    }),
  ]);
  await Promise.all([]);

  return (
    <HydrateClient>
      <div className="">
        <Filters />
        <QuestionList />
        <NewQuestionButton />
      </div>
    </HydrateClient>
  );
}
