import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { Badge } from "@school-clerk/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { prisma } from "@school-clerk/db";
import { Building2, Globe, Hash, Calendar } from "lucide-react";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

async function getSchoolProfile(schoolId: string) {
  if (!schoolId) return null;
  return prisma.schoolProfile.findFirst({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      subDomain: true,
      slug: true,
      createdAt: true,
      _count: {
        select: {
          students: true,
          sessions: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export default async function Page() {
  const cookie = await getAuthCookie();
  const school = await getSchoolProfile(cookie?.schoolId ?? "");

  if (!school) {
    return (
      <div className="py-8">
        <PageTitle>School Profile</PageTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          School profile not found.
        </p>
      </div>
    );
  }

  const fields = [
    { icon: Building2, label: "School Name", value: school.name },
    { icon: Globe, label: "Subdomain", value: school.subDomain },
    { icon: Hash, label: "Slug", value: school.slug },
    {
      icon: Calendar,
      label: "Created",
      value: school.createdAt
        ? new Date(school.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <PageTitle>School Profile</PageTitle>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Profile details */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">School Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <f.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium">{f.value ?? "—"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{school._count.students}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Academic Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{school._count.sessions}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
