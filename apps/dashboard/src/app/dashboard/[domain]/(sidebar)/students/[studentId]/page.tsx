import { StudentOverviewPageClient } from "@/components/students/student-overview-page-client";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function Page(props: Props) {
  const { studentId } = await props.params;

  await batchPrefetch([
    trpc.students.overview.queryOptions({
      studentId,
    }),
  ]);

  return (
    <HydrateClient>
      <StudentOverviewPageClient studentId={studentId} />
    </HydrateClient>
  );
}
