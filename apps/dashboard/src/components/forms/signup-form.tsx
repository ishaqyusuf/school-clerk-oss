"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSaasProfileAction } from "@/actions/create-saas-profile";
import { createSignupSchema } from "@/actions/schema";
// Get the list of countries in multiple languages
import { countries } from "@/utils/i18n/countries";
import { useTranslations } from "@/utils/i18n/translations";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Building2,
  Globe,
  GraduationCap,
  Lock,
  Mail,
  Phone,
  School,
  User,
  Users,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { toast } from "@school-clerk/ui/use-toast";

import { DomainInput } from "../domain-input";

export default function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [locale, setLocale] = useState(() => {
    // Get from localStorage or browser preference if on client
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

  // Update the schema with translations
  const signupSchema = createSignupSchema(t);
  type SignupFormValues = z.infer<typeof signupSchema>;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      institutionName: undefined,
      institutionType: undefined,
      adminName: undefined,
      email: undefined,
      password: undefined,
      studentCount: undefined,
      country: undefined,
      phone: undefined,
      educationSystem: undefined,
      curriculumType: undefined,
      languageOfInstruction: undefined,
      // Add to the form defaultValues
      domainName: undefined,
    },
  });

  // Listen for language changes
  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale);
  };

  // Add state for domain validity
  const [isDomainValid, setIsDomainValid] = useState(false);

  // Add this function to generate a suggested domain from institution name
  const generateSuggestedDomain = (name: string) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, "") // Remove special chars except hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  };

  // Add an effect to suggest domain name based on institution name
  useEffect(() => {
    const institutionName = form.watch("institutionName");
    const currentDomain = form.watch("domainName");

    // Only suggest if domain is empty or hasn't been manually edited
    if (
      institutionName &&
      (!currentDomain ||
        currentDomain ===
          generateSuggestedDomain(form.getValues("institutionName")))
    ) {
      const suggestedDomain = generateSuggestedDomain(institutionName);
      form.setValue("domainName", suggestedDomain);
    }
  }, [form.watch("institutionName")]);
  const createSchool = useAction(createSaasProfileAction, {
    onSuccess(args) {},
  });
  // Update the onSubmit function to include domain validation
  async function onSubmit(data: SignupFormValues) {
    // createSchool.execute()
    if (!isDomainValid) {
      toast({
        title: "Invalid domain",
        description: "Please choose a valid and available domain name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // This would be replaced with your actual API call
      console.log("Form data submitted:", data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });

      // Redirect to dashboard or onboarding
      // router.push('/dashboard')
    } catch (error) {
      toast({
        title: t("errorTitle"),
        description: t("errorMessage"),
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Get country list for the current locale
  const countryList =
    countries[locale as keyof typeof countries] || countries.en;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </CardHeader>
      <form onSubmit={form.handleSubmit(createSchool.execute)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="institutionName">{t("institutionName")}</Label>
            </div>
            <Input
              id="institutionName"
              placeholder={t("institutionNamePlaceholder")}
              {...form.register("institutionName")}
              disabled={isLoading}
            />
            {form.formState.errors.institutionName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.institutionName.message}
              </p>
            )}
          </div>

          {/* Add the DomainInput component to the form, after the institution name field */}
          <div className="space-y-2">
            <DomainInput
              value={form.watch("domainName")}
              onChange={(value) => form.setValue("domainName", value)}
              onValidityChange={setIsDomainValid}
              disabled={isLoading}
              locale={locale}
            />
            {form.formState.errors.domainName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.domainName.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="institutionType">{t("institutionType")}</Label>
              </div>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  form.setValue("institutionType", value)
                }
                defaultValue={form.getValues("institutionType")}
              >
                <SelectTrigger id="institutionType">
                  <SelectValue placeholder={t("institutionTypeSelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="k12">{t("k12")}</SelectItem>
                  <SelectItem value="college">{t("college")}</SelectItem>
                  <SelectItem value="university">{t("university")}</SelectItem>
                  <SelectItem value="vocational">{t("vocational")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.institutionType && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.institutionType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="educationSystem">{t("educationSystem")}</Label>
              </div>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  form.setValue("educationSystem", value)
                }
                defaultValue={form.getValues("educationSystem")}
              >
                <SelectTrigger id="educationSystem">
                  <SelectValue placeholder={t("educationSystemSelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="american">{t("american")}</SelectItem>
                  <SelectItem value="british">{t("british")}</SelectItem>
                  <SelectItem value="european">{t("european")}</SelectItem>
                  <SelectItem value="asian">{t("asian")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="curriculumType">{t("curriculumType")}</Label>
              </div>
              <Input
                id="curriculumType"
                placeholder={t("curriculumTypePlaceholder")}
                {...form.register("curriculumType")}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="languageOfInstruction">
                  {t("languageOfInstruction")}
                </Label>
              </div>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  form.setValue("languageOfInstruction", value)
                }
                defaultValue={form.getValues("languageOfInstruction")}
              >
                <SelectTrigger id="languageOfInstruction">
                  <SelectValue placeholder={t("languageOfInstructionSelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="adminName">{t("adminName")}</Label>
              </div>
              <Input
                id="adminName"
                placeholder={t("adminNamePlaceholder")}
                {...form.register("adminName")}
                disabled={isLoading}
              />
              {form.formState.errors.adminName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.adminName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email">{t("email")}</Label>
              </div>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                {...form.register("email")}
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="password">{t("password")}</Label>
            </div>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              disabled={isLoading}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="studentCount">{t("studentCount")}</Label>
              </div>
              <Input
                id="studentCount"
                placeholder={t("studentCountPlaceholder")}
                {...form.register("studentCount")}
                disabled={isLoading}
              />
              {form.formState.errors.studentCount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.studentCount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="country">{t("country")}</Label>
              </div>
              <Select
                disabled={isLoading}
                onValueChange={(value) => form.setValue("country", value)}
                defaultValue={form.getValues("country")}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder={t("countrySelect")} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {Object.entries(countryList).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.country && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.country.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="phone">{t("phone")}</Label>
            </div>
            <Input
              id="phone"
              placeholder={t("phonePlaceholder")}
              {...form.register("phone")}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || createSchool.isExecuting}
          >
            {isLoading ? t("creatingAccount") : t("createAccount")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("termsText")}{" "}
            <a
              href="#"
              className="underline underline-offset-2 hover:text-primary"
            >
              {t("termsLink")}
            </a>{" "}
            {t("and")}{" "}
            <a
              href="#"
              className="underline underline-offset-2 hover:text-primary"
            >
              {t("privacyLink")}
            </a>
            .
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
