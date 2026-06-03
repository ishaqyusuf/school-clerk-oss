import { FinanceStreamDetailPage } from "@/components/finance/finance-stream-detail-page";

type PageProps = {
	params: Promise<{
		streamId: string;
	}>;
};

export default async function Page({ params }: PageProps) {
	const { streamId } = await params;
	return <FinanceStreamDetailPage streamId={streamId} />;
}
