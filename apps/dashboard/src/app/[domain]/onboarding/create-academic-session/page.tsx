import { AcademicSessionForm } from "@/components/forms/academic-session-form";
import { Badge } from "@school-clerk/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";

export default async function CreateAcademicSessionPage({}) {
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1.5 text-sm"
          >
            Onboarding step 2 of 5
          </Badge>
        </div>

        <Card className="rounded-[2rem] border-border/70 shadow-lg">
          <CardHeader className="space-y-2 px-6 pt-8 sm:px-10">
            <CardTitle className="text-3xl font-semibold tracking-[-0.05em]">
              Create your first academic session
            </CardTitle>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              This gives School Clerk the current academic structure it needs to
              power classes, students, terms, billing, and reporting.
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-10">
            <AcademicSessionForm mode="onboarding" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
