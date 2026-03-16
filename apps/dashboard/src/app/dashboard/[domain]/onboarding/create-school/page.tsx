import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function Page({ params }) {
  const { domain } = await params;
  const cookie = await getAuthCookie();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">School Created Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your school account has been set up and is ready to configure.
          </p>
          {cookie?.domain && (
            <p>
              Domain:{" "}
              <span className="font-semibold text-foreground">
                {cookie.domain}
              </span>
            </p>
          )}
          <p className="pt-2">
            Next step: create your first academic session so you can start
            adding classes, students, and managing your school.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link
              href={`/dashboard/${domain}/onboarding/create-academic-session`}
            >
              Set Up Academic Session
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
