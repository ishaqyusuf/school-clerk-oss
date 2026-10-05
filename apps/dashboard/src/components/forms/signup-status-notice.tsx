import Link from "next/link";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";

export function SignupStatusNotice() {
  return (
    <main className="flex min-h-screen justify-center bg-muted/20 px-4 py-8 sm:items-center">
      <Card className="h-fit w-full min-w-0 max-w-lg">
        <CardHeader>
          <CardTitle className="break-words text-2xl">Check your signup status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm leading-6">
          <p>This older page cannot confirm that an account was created or an email was delivered.</p>
          <p>If you already submitted signup, check your inbox or open your school’s sign-in address and use the credentials you chose. Do not submit signup again solely to retry a missing email.</p>
          <p className="text-muted-foreground">If you can sign in, the welcome page includes an option to request a fresh verification link. Contact support if your school address is unavailable.</p>
          <Button asChild variant="outline" className="min-h-11 w-full whitespace-normal">
            <Link href="/sign-up">Back to signup</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
