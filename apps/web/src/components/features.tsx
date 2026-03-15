import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import {
  BookOpen,
  CalendarCheck,
  DollarSign,
  Package,
  PieChart,
  Users,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Academic Management",
    description:
      "Manage classes, subjects, sessions, and terms. Keep all academic data organized and accessible.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance Tracking",
    description:
      "Record and review daily student attendance with class-level and student-level views.",
  },
  {
    icon: DollarSign,
    title: "Finance & Fees",
    description:
      "Track school fees, billable services, transactions, and wallet balances in real time.",
  },
  {
    icon: Package,
    title: "Inventory Control",
    description:
      "Manage school supplies and equipment. Track stock levels and sales effortlessly.",
  },
  {
    icon: Users,
    title: "Staff Management",
    description:
      "Manage teaching and non-teaching staff, roles, sessions, and term evaluations.",
  },
  {
    icon: PieChart,
    title: "Reports & Results",
    description:
      "Generate student report cards, term sheets, and assessment results with PDF export.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your school needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A unified platform to manage every aspect of school operations —
            from enrollment to results.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/60 hover:border-border transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
