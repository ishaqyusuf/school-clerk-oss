import { Filters } from "@/components/questions/filters";
import { NewQuestionButton } from "@/components/questions/new-question-button";
import { QuestionList } from "@/components/questions/questions-list";
import { loadQuestionsParams } from "@/hooks/use-questions-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import type { SearchParams } from "nuqs";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/questions",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const { classDepartmentId, subjectId } = loadQuestionsParams(searchParams);

	await batchPrefetch([
		trpc.questions.all.queryOptions({
			classDepartmentId,
			subjectId,
		}),
	]);

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
