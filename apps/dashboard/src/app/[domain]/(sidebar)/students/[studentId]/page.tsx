import { StudentOverviewPageClient } from "@/components/students/student-overview-page-client";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

type Props = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function Page(props: Props) {
  const { studentId } = await props.params;
  const profile = await getAuthCookie();
  const session = await auth.api.getSession({ headers: await headers() });
  if (profile.schoolId && session?.session.id && session.user.id === profile.auth?.userId) {
    await batchPrefetch([
      trpc.students.overview.queryOptions({
        studentId,
        viewScope: { schoolId: profile.schoolId, userId: session.user.id, loginSessionId: session.session.id },
      }),
    ]);
  }

  return (
    <HydrateClient>
      <StudentOverviewPageClient studentId={studentId} />
    </HydrateClient>
  );
}
