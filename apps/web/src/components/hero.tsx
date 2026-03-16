import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-32">
      {/* Background gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <Badge variant="outline" className="mb-6 inline-flex gap-1.5">
          <span className="text-primary">Open Source</span>
          <span className="text-muted-foreground">School Management</span>
        </Badge>

        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Run your school with{" "}
          <span className="text-primary">complete clarity</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          School Clerk is an open-source platform that brings together
          academics, attendance, finance, inventory, and staff management —
          built for modern schools.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Get Started for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">
              <Play className="mr-2 h-4 w-4" />
              See How It Works
            </Link>
          </Button>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-muted-foreground">
          Trusted by <span className="font-semibold text-foreground">500+</span>{" "}
          schools worldwide · Free to self-host
        </p>
      </div>
    </section>
  );
}
