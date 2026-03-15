import { Separator } from "@school-clerk/ui/separator";
import { Github, Twitter } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Roadmap", href: "/roadmap" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "GitHub", href: "https://github.com/school-clerk/school-clerk-oss" },
    { label: "Community", href: "/community" },
    { label: "Status", href: "/status" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "License (MIT)", href: "/license" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                SC
              </div>
              <span className="font-semibold text-foreground">School Clerk</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open-source school management built for modern institutions.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://github.com/school-clerk/school-clerk-oss"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="https://twitter.com/schoolclerk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {group}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} School Clerk. Open source under MIT
            License.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with{" "}
            <a
              href="https://nextjs.org"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Next.js
            </a>{" "}
            and{" "}
            <a
              href="https://ui.shadcn.com"
              className="underline underline-offset-2 hover:text-foreground"
            >
              shadcn/ui
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
