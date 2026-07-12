import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@school-clerk/ui/accordion";

const faqs = [
  {
    question: "Is School Clerk really free and open source?",
    answer:
      "Yes. The core platform is completely open source (MIT license) and free to self-host. You can deploy it on your own server with no per-student or per-school fees. Paid plans cover managed cloud hosting, priority support, and advanced features.",
  },
  {
    question: "How do I get started with self-hosting?",
    answer:
      "Clone the repository, configure your PostgreSQL database, set the required environment variables, and run the Docker or Node.js deployment. Full documentation is available in the GitHub repository.",
  },
  {
    question: "Can School Clerk handle multiple schools?",
    answer:
      "Yes. School Clerk is built with multi-tenancy in mind. Each school gets its own isolated domain-based environment. The Pro plan includes official multi-branch support with centralized reporting.",
  },
  {
    question: "What kind of reports can I generate?",
    answer:
      "School Clerk can generate student result sheets, term performance reports, attendance summaries, and financial reports — all exportable as PDFs with your school branding.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "The web application is fully responsive and works well on mobile browsers. A dedicated mobile app is on our roadmap.",
  },
  {
    question: "How do I migrate data from our current system?",
    answer:
      "School Clerk provides data import utilities for common formats (CSV, Excel). For complex migrations, our Pro plan includes dedicated migration support from our team.",
  },
  {
    question: "What payment methods are supported for school fees?",
    answer:
      "The finance module tracks fee collection and transactions. Payment gateway integrations (Paystack, Stripe, etc.) can be added by self-hosters or are included in the hosted plans.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Can&apos;t find what you&apos;re looking for?{" "}
            <a
              href="https://github.com/school-clerk/school-clerk-oss/issues"
              className="text-primary underline underline-offset-4 hover:opacity-80"
            >
              Open an issue on GitHub.
            </a>
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-1">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
