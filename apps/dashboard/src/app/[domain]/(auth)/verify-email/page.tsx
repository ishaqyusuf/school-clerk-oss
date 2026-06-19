import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { CheckCircle2, MailCheck, TriangleAlert } from "lucide-react";

import { prisma } from "@school-clerk/db";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

async function verifyEmailToken(token?: string) {
  if (!token) {
    return {
      ok: false,
      message: "The verification link is missing its token.",
    };
  }

  const verification = await prisma.verification.findFirst({
    where: {
      deletedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      identifier: `email-verification:${token}`,
    },
    select: {
      id: true,
      value: true,
    },
  });

  if (!verification) {
    return {
      ok: false,
      message:
        "This verification link is invalid or has expired. Please sign in and request a fresh email.",
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: verification.value,
      deletedAt: null,
    },
    select: {
      email: true,
      id: true,
      name: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      message: "We could not find the account for this verification link.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: true,
      },
    }),
    prisma.verification.delete({
      where: {
        id: verification.id,
      },
    }),
  ]);

  return {
    ok: true,
    email: user.email,
    name: user.name,
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const result = await verifyEmailToken(params.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-lg border-border/70 shadow-xl">
        <CardHeader className="items-center space-y-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {result.ok ? (
              <MailCheck className="h-8 w-8" />
            ) : (
              <TriangleAlert className="h-8 w-8" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {result.ok ? "Email verified" : "Verification failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {result.ok ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                {result.name || "Your account"} is verified. You can continue
                to the dashboard and finish school setup.
              </p>
              <Alert className="text-left">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Verified email: {result.email}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert variant="destructive" className="text-left">
              <TriangleAlert className="h-4 w-4" />
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
