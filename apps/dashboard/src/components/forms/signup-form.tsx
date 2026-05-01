"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Globe,
  GraduationCap,
  Languages,
  Lock,
  Mail,
  Phone,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

import { createSaasProfileAction } from "@/actions/create-saas-profile";
import { createSignupSchema } from "@/actions/schema";
import { DomainInput } from "@/components/domain-input";
import {
  getInstitutionType,
  institutionTypeOptions,
} from "@/features/signup/institution-types";
import { useTranslations } from "@/utils/i18n/translations";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@school-clerk/ui/form";
import { Input } from "@school-clerk/ui/input";
import { Badge } from "@school-clerk/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@school-clerk/ui/select";
import { toast } from "@school-clerk/ui/use-toast";

const trustPoints = [
  "Tenant-ready school workspace in minutes",
  "Guided onboarding into academic setup and staff invites",
  "Subdomain availability checked before creation",
];

type SignupFormProps = {
  hostSuffix: string;
};

export default function SignupForm({ hostSuffix }: SignupFormProps) {
  const [isDomainValid, setIsDomainValid] = useState(false);
  const [locale] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("preferredLanguage") ??
        navigator.language.split("-")[0] ??
        "en"
      );
    }

    return "en";
  });
  const { t } = useTranslations(locale);
  const signupSchema = createSignupSchema(t);
  type SignupFormValues = z.infer<typeof signupSchema>;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      institutionName: "",
      institutionType: "k12",
      adminName: "",
      email: "",
      password: "lorem-ipsum",
      studentCount: "",
      country: "",
      phone: "",
      educationSystem: "",
      curriculumType: "",
      languageOfInstruction: "",
      domainName: "",
    },
  });

  const activeInstitutionType = form.watch("institutionType");
  const watchedInstitutionName = form.watch("institutionName");
  const institutionTypeMeta = getInstitutionType(activeInstitutionType);

  const createSchool = useAction(createSaasProfileAction, {
    onSuccess({ data }) {
      if (!data) return;

      window.location.assign(
        data.onboardingLoginUrl || data.onboardingUrl || data.loginUrl,
      );
    },
    onError({ error }) {
      toast({
        title: "We couldn’t create your workspace",
        description:
          error.serverError ||
          "Please review your details and try again.",
        variant: "destructive",
      });
    },
  });

  const suggestedDomain = useMemo(() => {
    if (!watchedInstitutionName) return "";

    return watchedInstitutionName
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }, [watchedInstitutionName]);

  const devQuickFill = () => {
    const seed = Date.now().toString().slice(-5);
    const firstNames = ["Aisha", "Fatima", "Zainab", "Maryam", "Yusuf"];
    const lastNames = ["Bello", "Okafor", "Danjuma", "Adewale", "Garba"];
    const schoolPrefixes = ["Atlas", "Cedar", "Summit", "Greenfield", "Lagoon"];
    const schoolSuffixes = ["Academy", "College", "Preparatory School", "Learning Centre", "International School"];
    const educationSystems = ["British", "National", "International", "Hybrid"];
    const curriculumNotes = [
      "National + Cambridge blend",
      "British core curriculum",
      "Nigerian curriculum with STEM focus",
      "International primary programme",
    ];
    const languages = ["English", "Mixed"];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const schoolPrefix =
      schoolPrefixes[Math.floor(Math.random() * schoolPrefixes.length)];
    const schoolSuffix =
      schoolSuffixes[Math.floor(Math.random() * schoolSuffixes.length)];
    const educationSystem =
      educationSystems[Math.floor(Math.random() * educationSystems.length)];
    const curriculumType =
      curriculumNotes[Math.floor(Math.random() * curriculumNotes.length)];
    const languageOfInstruction =
      languages[Math.floor(Math.random() * languages.length)];

    const institutionName = `${schoolPrefix} ${schoolSuffix}`;
    const subdomain = `${schoolPrefix.toLowerCase()}-${seed}`;

    form.reset({
      institutionName,
      institutionType: "k12",
      adminName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}+${seed}@schoolclerk.dev`,
      password: "lorem-ipsum",
      studentCount: String(120 + Math.floor(Math.random() * 780)),
      country: "Nigeria",
      phone: `+23480${Math.floor(10000000 + Math.random() * 89999999)}`,
      educationSystem,
      curriculumType,
      languageOfInstruction,
      domainName: subdomain,
    });
    setIsDomainValid(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!isDomainValid) {
      toast({
        title: "Choose an available subdomain",
        description:
          "We need a valid, available subdomain before we can create your workspace.",
        variant: "destructive",
      });
      return;
    }

    createSchool.execute(values);
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative overflow-hidden border-b border-border bg-[#f7f2e8] lg:border-b-0 lg:border-r">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(184,134,11,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_35%)]" />
        <div className="relative flex h-full flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b16] backdrop-blur">
              <Rocket className="h-3.5 w-3.5" />
              Launch your school workspace
            </div>

            <div className="space-y-5">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-0.05em] text-slate-950 sm:text-5xl">
                Create a school OS that feels operational on day one.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-700">
                Set up your workspace, reserve your subdomain, and move
                straight into onboarding that gets your academic structure and
                staff invitations flowing fast.
              </p>
            </div>

            <div className="grid gap-3">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur"
                >
                  <BadgeCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <p className="text-sm leading-6 text-slate-700">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="mt-10 border-black/5 bg-white/80 shadow-xl backdrop-blur">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  01
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Claim your domain
                </p>
                <p className="text-xs leading-5 text-slate-600">
                  Reserve a clean tenant URL before onboarding begins.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  02
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Configure academics
                </p>
                <p className="text-xs leading-5 text-slate-600">
                  Stand up your first session and term structure quickly.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  03
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Invite your team
                </p>
                <p className="text-xs leading-5 text-slate-600">
                  Bring staff in with onboarding links right after launch.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-background px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Self-serve signup
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em]">
                Build your workspace
              </h2>
            </div>
            {process.env.NODE_ENV !== "production" ? (
              <Button variant="outline" type="button" onClick={devQuickFill}>
                <Sparkles className="mr-2 h-4 w-4" />
                Quick fill
              </Button>
            ) : null}
          </div>

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-8">
              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      School identity
                    </p>
                    <h3 className="text-xl font-semibold tracking-tight">
                      Tell us what you’re launching
                    </h3>
                  </div>

                  <div className="grid gap-5">
                    <FormField
                      control={form.control}
                      name="institutionName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Institution name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Atlas Heights Academy"
                              disabled={createSchool.isExecuting}
                              onBlur={() => {
                                if (
                                  !form.getValues("domainName") &&
                                  suggestedDomain
                                ) {
                                  form.setValue("domainName", suggestedDomain);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          Institution type
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Choose a released setup path. Disabled options stay
                          visible so you can see what’s coming next.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {institutionTypeOptions.map((option) => {
                          const selected = activeInstitutionType === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={!option.enabled || createSchool.isExecuting}
                              onClick={() =>
                                form.setValue("institutionType", option.id, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                })
                              }
                              className={`rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-foreground/20"
                              } ${!option.enabled ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{option.label}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {option.description}
                                  </p>
                                </div>
                                {option.badge ? (
                                  <Badge
                                    variant={option.enabled ? "default" : "secondary"}
                                  >
                                    {option.badge}
                                  </Badge>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage>
                        {form.formState.errors.institutionType?.message}
                      </FormMessage>
                    </div>

                    <FormField
                      control={form.control}
                      name="domainName"
                      render={({ field }) => (
                        <DomainInput
                          value={field.value}
                          onChange={(nextValue) => {
                            field.onChange(nextValue);
                            setIsDomainValid(false);
                          }}
                          onValidityChange={setIsDomainValid}
                          disabled={createSchool.isExecuting}
                          hostSuffix={hostSuffix}
                          institutionType={activeInstitutionType}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Admin access
                    </p>
                    <h3 className="text-xl font-semibold tracking-tight">
                      Create your first admin account
                    </h3>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="adminName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Full name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Aisha Bello"
                              disabled={createSchool.isExecuting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            Phone number
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="+2348012345678"
                              disabled={createSchool.isExecuting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            Work email
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="founder@school.com"
                              disabled={createSchool.isExecuting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="At least 8 characters"
                              disabled={createSchool.isExecuting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Context for onboarding
                    </p>
                    <h3 className="text-xl font-semibold tracking-tight">
                      Help us shape your starting setup
                    </h3>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            Country
                          </FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={createSchool.isExecuting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Nigeria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Nigeria">Nigeria</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="studentCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student count estimate</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="480"
                              disabled={createSchool.isExecuting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="educationSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education system</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={createSchool.isExecuting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a system" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[
                                "National",
                                "British",
                                "American",
                                "International",
                                "Hybrid",
                              ].map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="languageOfInstruction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Languages className="h-4 w-4 text-muted-foreground" />
                            Language of instruction
                          </FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={createSchool.isExecuting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["English", "Arabic", "French", "Mixed"].map(
                                (option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="curriculumType"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Curriculum notes</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="National, Montessori, Cambridge, blended..."
                              disabled={createSchool.isExecuting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {institutionTypeMeta?.label || "Institution"} launch path
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We’ll create your workspace, email your onboarding link, and
                    guide you into academic setup and staff invitations.
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={createSchool.isExecuting}
                  className="min-w-[220px]"
                >
                  {createSchool.isExecuting ? "Creating workspace..." : "Create workspace"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Success email and onboarding link will be sent after signup.
              </div>
            </form>
          </Form>
        </div>
      </section>
    </div>
  );
}
