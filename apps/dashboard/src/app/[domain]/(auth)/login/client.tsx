"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

import { resetCookie } from "@/actions/cookies/auth-cookie";
import { authClient } from "@/auth/client";
import { DevTenantQuickLoginFab } from "@/components/dev-tenant-quick-login-fab";
import { getFirstPermittedHref } from "@/components/sidebar/links";
import { SubmitButton } from "@/components/submit-button";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  TenantLink as Link,
  useTenantRouter,
} from "@school-clerk/tenant-url/next";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Checkbox } from "@school-clerk/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@school-clerk/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@school-clerk/ui/input-group";
import { Separator } from "@school-clerk/ui/separator";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@school-clerk/ui/use-toast";

type QuickLoginUser = {
  email: string;
  name: string | null;
  role: string | null;
  isOnboarded?: boolean;
  staffId?: string;
  token?: string;
};

type ClientProps = {
  schoolName: string;
  signupHref: string;
  quickLoginUsers?: QuickLoginUser[];
};

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const quickLoginPassword = "lorem-ipsum";

export function Client({
  schoolName,
  signupHref,
  quickLoginUsers = [],
}: ClientProps) {
  const router = useTenantRouter();
  const searchParams = useSearchParams();
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  const emailField = form.register("email", {
    onChange: () => markFieldFilled(),
  });
  const passwordField = form.register("password", {
    onChange: () => markFieldFilled(),
  });
  const rememberMe = form.watch("rememberMe");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnTo] = useQueryState("return_to");
  const attemptedAutoLoginRef = useRef(false);
  const emailFromQuery = searchParams.get("email") ?? "";
  const passwordFromQuery = searchParams.get("password") ?? "";
  const shouldAutoLogin =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("autologin") === "1";

  const markFieldFilled = () => setError("");

  const setRememberMe = (value: boolean) => {
    form.setValue("rememberMe", value, {
      shouldDirty: true,
      shouldTouch: true,
    });
    markFieldFilled();
  };

  const submitCredentials = async ({
    email,
    password,
    rememberMe,
  }: LoginFormValues) => {
    setIsLoading(true);
    setError("");

    try {
      const resp = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });

      if (resp.error) {
        setError(resp.error.message || "Unable to sign in right now.");
        return;
      }

      const bearerToken = resp.data?.token;
      const userId = resp.data?.user?.id;

      if (!bearerToken || !userId) {
        setError("Login succeeded, but your session could not be prepared.");
        return;
      }

      const defaultHref = getFirstPermittedHref({
        role: resp.data.user.role,
      });

      const cookie = await resetCookie({
        bearerToken,
        userId,
        redirectUrl: defaultHref,
      });
      if (!cookie?.schoolId) {
        setError(
          "Signed in, but your school workspace could not be loaded for this tenant.",
        );
        router.refresh();
        return;
      }

      const normalizedReturnTo = returnTo
        ? returnTo.startsWith("/")
          ? returnTo
          : `/${returnTo}`
        : null;

      const redirectUrl =
        normalizedReturnTo ||
        (!cookie?.sessionId && cookie?.domain
          ? "/onboarding/welcome"
          : defaultHref || "/");

      router.push(redirectUrl);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in right now. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!emailFromQuery && !passwordFromQuery) return;

    form.reset({
      email: emailFromQuery || form.getValues("email"),
      password: passwordFromQuery || form.getValues("password"),
      rememberMe: form.getValues("rememberMe"),
    });
  }, [emailFromQuery, form, passwordFromQuery]);

  useEffect(() => {
    if (!shouldAutoLogin || attemptedAutoLoginRef.current) return;
    if (!emailFromQuery || !passwordFromQuery) return;

    attemptedAutoLoginRef.current = true;
    void submitCredentials({
      email: emailFromQuery,
      password: passwordFromQuery,
      rememberMe: true,
    });
  }, [emailFromQuery, passwordFromQuery, shouldAutoLogin]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed right-4 top-4 z-50">
        <ThemeSwitch />
      </div>
      <main className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden border-r bg-sidebar text-sidebar-foreground lg:flex">
          <div className="absolute inset-0 bg-primary/10" />
          <div className="relative flex min-h-screen w-full flex-col justify-between px-12 py-10">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
                  {schoolName}
                </p>
                <p className="text-sm text-sidebar-foreground/70">
                  Tenant workspace
                </p>
              </div>
            </div>

            <div className="flex max-w-xl flex-col gap-8">
              <Badge variant="secondary" className="w-fit gap-2">
                <ShieldCheck />
                Secure tenant access
              </Badge>
              <div className="flex flex-col gap-5">
                <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal">
                  Pick up exactly where your school left off.
                </h1>
                <p className="max-w-md text-base leading-7 text-sidebar-foreground/70">
                  Sign in to manage sessions, staff, learners, fees, and the
                  daily work that keeps the school moving.
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-sidebar-foreground/75">
              {[
                "Tenant-specific session setup",
                "Role-aware dashboard access",
                "Onboarding continues inside the workspace",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <BadgeCheck className="text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[440px]">
            <div className="mb-9 flex flex-col gap-3">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Building2 />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {schoolName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tenant workspace
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="w-fit">
                Welcome back
              </Badge>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-semibold tracking-normal">
                  Sign in to continue
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use the administrator or staff account connected to this
                  school workspace.
                </p>
              </div>
            </div>

            {error && (
              <Alert className="mb-5" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(submitCredentials)}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Mail />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="email"
                        type="email"
                        placeholder="admin@school.edu"
                        autoComplete="email"
                        required
                        {...emailField}
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between gap-4">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        {...passwordField}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          size="icon-xs"
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked === true)
                      }
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="remember-me">
                        Remember this device
                      </FieldLabel>
                      <FieldDescription>
                        Keep this tenant session ready on trusted devices.
                      </FieldDescription>
                    </FieldContent>
                  </Field>

                  <SubmitButton
                    type="submit"
                    className="w-full flex-row gap-2"
                    isSubmitting={isLoading}
                  >
                    Sign in
                    <ArrowRight data-icon="inline-end" />
                  </SubmitButton>
                </FieldGroup>
              </form>
              <LoginQuickLoginFab
                domain={schoolName}
                onFilled={markFieldFilled}
                onSubmit={submitCredentials}
                users={quickLoginUsers}
              />
            </FormProvider>

            <Separator className="my-6" />
            <div>
              <p className="text-sm text-muted-foreground">
                Starting a new school workspace?{" "}
                <Link
                  href={signupHref}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Create it on the signup domain
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LoginQuickLoginFab({
  domain,
  onFilled,
  onSubmit,
  users,
}: {
  domain: string;
  onFilled: () => void;
  onSubmit: (values: LoginFormValues) => Promise<void>;
  users: QuickLoginUser[];
}) {
  const form = useFormContext<LoginFormValues>();
  const router = useTenantRouter();

  return (
    <DevTenantQuickLoginFab
      domain={domain}
      hideOnLogin={false}
      users={users.map((user) => ({
        ...user,
        quickLoginHref: "#",
        onQuickLogin: () => {
          if (user.isOnboarded === false && user.staffId) {
            router.push(
              `/reset-password?onboarding=1&staffId=${
                user.staffId
              }&email=${encodeURIComponent(user.email)}&tok=${encodeURIComponent(
                user.token || "",
              )}`,
            );
            return;
          }

          const values = {
            email: user.email,
            password: quickLoginPassword,
            rememberMe: true,
          };

          form.reset(values, {
            keepErrors: false,
          });
          onFilled();
          toast({
            title: "Quick login started",
            description: `Signing in as ${user.email}.`,
          });
          void onSubmit(values);
        },
      }))}
    />
  );
}
