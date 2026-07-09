import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";

export async function generateMetadata({ params }) {
  const { domain } = await params;

  return buildTenantPageMetadata({
    description:
      "Public score-entry link for a scoped assessment recording page.",
    domain,
    noIndex: true,
    pathname: "/assessment-recording/public",
    title: "Public Assessment Recording",
  });
}

export default async function PublicAssessmentRecordingPage({ params }) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-muted/10 px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Public assessment recording
          </h1>
          <p className="text-sm text-muted-foreground">
            Scores entered here are limited to the link scope set by the school.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-2 py-4 sm:px-4">
        <AssessmentRecordingResultsTable
          departmentId=""
          publicToken={decodeURIComponent(token)}
          termId=""
        />
      </div>
    </main>
  );
}
