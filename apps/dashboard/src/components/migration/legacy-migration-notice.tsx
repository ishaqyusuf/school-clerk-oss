import Link from "next/link";
import { Button } from "@school-clerk/ui/button";

export function LegacyMigrationNotice() {
  return (
    <section aria-labelledby="legacy-migration-title" className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <h1 id="legacy-migration-title" className="break-words text-2xl font-semibold">Legacy migration needs ownership setup</h1>
        <p className="break-words text-sm text-muted-foreground">
          This historical migration tool has no confirmed school binding. Its records cannot be displayed or changed until the dataset owner and a school-scoped migration are approved.
        </p>
      </div>
      <p className="break-words text-sm">
        Opening this page does not run a migration. Existing records are preserved. Ask the project administrator to confirm the owning school; current student registrations and reviewed imports are available from the student directory.
      </p>
      <Button asChild className="min-h-11 w-full whitespace-normal sm:w-fit">
        <Link href="/students/list">Open student directory</Link>
      </Button>
    </section>
  );
}
