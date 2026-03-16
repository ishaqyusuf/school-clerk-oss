import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Self-host for free. Always open source.",
    badge: null,
    features: [
      "Unlimited students",
      "Academic management",
      "Attendance tracking",
      "Basic reports",
      "Community support",
      "Self-hosted deployment",
    ],
    cta: "Get Started",
    ctaHref: "/sign-up",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Starter",
    price: "$29",
    description: "Hosted and managed for small schools.",
    badge: "Most Popular",
    features: [
      "Everything in Free",
      "Cloud hosting included",
      "Finance & fees module",
      "Inventory management",
      "Email support",
      "Daily backups",
    ],
    cta: "Start Free Trial",
    ctaHref: "/sign-up?plan=starter",
    variant: "default" as const,
    highlight: true,
  },
  {
    name: "Pro",
    price: "$79",
    description: "Advanced features for growing institutions.",
    badge: null,
    features: [
      "Everything in Starter",
      "Multi-branch support",
      "Custom domain",
      "Priority support",
      "Advanced analytics",
      "API access",
    ],
    cta: "Start Free Trial",
    ctaHref: "/sign-up?plan=pro",
    variant: "outline" as const,
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start free with self-hosting, or let us handle the infrastructure.
            No hidden fees.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={
                tier.highlight
                  ? "border-primary shadow-md relative"
                  : "border-border/60"
              }
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-0.5 text-xs">{tier.badge}</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  {tier.name}
                </CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">
                    {tier.price}
                  </span>
                  {tier.price !== "$0" && (
                    <span className="text-sm text-muted-foreground ml-1">
                      /month
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={tier.variant}
                  className="w-full"
                  size="sm"
                  asChild
                >
                  <Link href={tier.ctaHref}>{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
