import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Card, CardContent } from "@school-clerk/ui/card";

const testimonials = [
  {
    quote:
      "School Clerk transformed how we manage our institution. The academic and attendance modules alone saved us hours every week.",
    name: "Amara Osei",
    role: "Principal, Accra International School",
    initials: "AO",
  },
  {
    quote:
      "The finance module is outstanding. We finally have full visibility into fees collected, outstanding balances, and expenses.",
    name: "Fatima Al-Rashid",
    role: "Bursar, Al-Noor Academy",
    initials: "FA",
  },
  {
    quote:
      "Being open source was the deciding factor for us. We could customize the system to match our specific term structure perfectly.",
    name: "Emmanuel Nwosu",
    role: "IT Director, Lagos Model School",
    initials: "EN",
  },
  {
    quote:
      "Report card generation used to take three full days. With School Clerk, we do it in under two hours — for all 800 students.",
    name: "Priya Sundaram",
    role: "Academic Coordinator, Sunrise Academy",
    initials: "PS",
  },
  {
    quote:
      "The onboarding was smooth and the support community is very active. Our teachers adopted the system within a week.",
    name: "Daniel Mensah",
    role: "Administrator, Hope Christian School",
    initials: "DM",
  },
  {
    quote:
      "Inventory management for our lab equipment and library books is now completely automated. Highly recommend School Clerk.",
    name: "Ngozi Adeyemi",
    role: "Vice Principal, Covenant Academy",
    initials: "NA",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by school administrators
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Hear from the educators and administrators who rely on School Clerk
            every day.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border/60">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
