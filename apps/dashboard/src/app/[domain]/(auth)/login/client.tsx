"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { FormProvider, useForm } from "react-hook-form";

import { resetCookie } from "@/actions/cookies/auth-cookie";
import { restoreDevQuickLoginCredential } from "@/actions/dev-quick-login";
import { authClient } from "@/auth/client";
import { getFirstPermittedHref } from "@/components/sidebar/links";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@school-clerk/ui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { loginWithPasswordAction } from "./actions";
import {
  TenantLink as Link,
  useTenantRouter,
} from "@school-clerk/tenant-url/next";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Checkbox } from "@school-clerk/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@school-clerk/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@school-clerk/ui/popover";
import { Separator } from "@school-clerk/ui/separator";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

type QuickLoginUser = {
  email: string;
  name: string | null;
  role: string | null;
};

type ClientProps = {
  initialEmail?: string;
  initialError?: string;
  initialPassword?: string;
  initialRememberMe?: boolean;
  schoolName: string;
  signupHref: string;
  quickLoginUsers?: QuickLoginUser[];
};

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type LoginSubmitValues = LoginFormValues & {
  afterSessionPrepared?: () => Promise<void>;
};

const quickLoginPassword = "lorem-ipsum";

export function Client({
  initialEmail = "",
  initialError = "",
  initialPassword = "",
  initialRememberMe = false,
  schoolName,
  signupHref,
  quickLoginUsers = [],
}: ClientProps) {
  const router = useTenantRouter();
  const searchParams = useSearchParams();
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: initialEmail,
      password: initialPassword,
      rememberMe: initialRememberMe,
    },
  });
  const emailField = form.register("email", {
    onChange: () => markFieldFilled(),
  });
  const passwordField = form.register("password", {
    onChange: () => markFieldFilled(),
  });
  const emailValue = form.watch("email");
  const rememberMe = form.watch("rememberMe");
  const showDevEmailPicker =
    process.env.NODE_ENV !== "production" && quickLoginUsers.length > 0;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [returnTo] = useQueryState("return_to");
  const attemptedAutoLoginRef = useRef(false);
  const emailFromQuery = searchParams.get("email") ?? "";
  const errorFromQuery = searchParams.get("error") ?? "";
  const passwordFromQuery = searchParams.get("password") ?? "";
  const rememberMeFromQuery = searchParams.get("rememberMe") === "1";
  const devRestoreTokenFromQuery = searchParams.get("dev_restore_token") ?? "";
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

  const selectQuickLoginUser = (user: QuickLoginUser) => {
    form.setValue("email", user.email, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("password", quickLoginPassword, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setNativeInputValue("password", quickLoginPassword);
    markFieldFilled();
  };

  const submitCredentials = async ({
    afterSessionPrepared,
    email,
    password,
    rememberMe,
  }: LoginSubmitValues) => {
    setIsLoading(true);
    setError("");
    let afterSessionPreparedRan = false;
    const runAfterSessionPrepared = async () => {
      if (afterSessionPreparedRan) return;
      afterSessionPreparedRan = true;

      try {
        await afterSessionPrepared?.();
      } catch (restoreError) {
        console.warn("Dev quick login credential restore failed", restoreError);
      }
    };

    try {
      if (!email.includes("@")) {
        const formData = new FormData();
        formData.set("email", email);
        formData.set("password", password);
        if (rememberMe) formData.set("rememberMe", "on");
        await loginWithPasswordAction(formData);
        return true;
      }

      const resp = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });

      if (resp.error) {
        setError(resp.error.message || "Unable to sign in right now.");
        await runAfterSessionPrepared();
        return false;
      }

      const bearerToken = resp.data?.token;
      const userId = resp.data?.user?.id;

      if (!bearerToken || !userId) {
        setError("Login succeeded, but your session could not be prepared.");
        await runAfterSessionPrepared();
        return false;
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
        await runAfterSessionPrepared();
        return false;
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

      await runAfterSessionPrepared();
      router.push(redirectUrl);
      router.refresh();
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in right now. Please try again.",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setError(errorFromQuery);
  }, [errorFromQuery]);

  useEffect(() => {
    if (!emailFromQuery && !passwordFromQuery) return;

    if (emailFromQuery) {
      form.setValue("email", emailFromQuery, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setNativeInputValue("email", emailFromQuery);
    }

    if (passwordFromQuery) {
      form.setValue("password", passwordFromQuery, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setNativeInputValue("password", passwordFromQuery);
    }

    if (rememberMeFromQuery) {
      form.setValue("rememberMe", true, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }

    markFieldFilled();
  }, [emailFromQuery, form, passwordFromQuery, rememberMeFromQuery]);

  useEffect(() => {
    if (!shouldAutoLogin || attemptedAutoLoginRef.current) return;
    if (!emailFromQuery || !passwordFromQuery) return;

    attemptedAutoLoginRef.current = true;
    void submitCredentials({
      afterSessionPrepared: devRestoreTokenFromQuery
        ? () =>
            restoreDevQuickLoginCredential({
              restoreToken: devRestoreTokenFromQuery,
            }).then(() => undefined)
        : undefined,
      email: emailFromQuery,
      password: passwordFromQuery,
      rememberMe: true,
    });
  }, [
    devRestoreTokenFromQuery,
    emailFromQuery,
    passwordFromQuery,
    shouldAutoLogin,
  ]);

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
              <form
                action={loginWithPasswordAction}
                method="post"
                onSubmit={form.handleSubmit(submitCredentials)}
              >
                <FieldGroup>
                  {showDevEmailPicker ? (
                    <>
                      <input type="hidden" {...emailField} />
                      <DevEmailCombobox
                        onSelect={selectQuickLoginUser}
                        users={quickLoginUsers}
                        value={emailValue}
                      />
                    </>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="email">Email or phone</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Mail />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="email"
                          type="text"
                          placeholder="admin@school.edu or primary phone"
                          autoComplete="email"
                          required
                          {...emailField}
                          defaultValue={initialEmail}
                        />
                      </InputGroup>
                    </Field>
                  )}

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
                        defaultValue={initialPassword}
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
                    <input
                      type="hidden"
                      name="rememberMe"
                      value={rememberMe ? "on" : ""}
                    />
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

function DevEmailCombobox({
  onSelect,
  users,
  value,
}: {
  onSelect: (user: QuickLoginUser) => void;
  users: QuickLoginUser[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedUser = users.find((user) => user.email === value) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) {
      return users.slice(0, 30);
    }

    return users
      .filter((user) =>
        [user.name ?? "", user.email, user.role ?? "User"]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 30);
  }, [normalizedQuery, users]);

  function selectUser(user: QuickLoginUser) {
    onSelect(user);
    setQuery("");
    setOpen(false);
  }

  return (
    <Field>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            id="email"
            className="h-10 w-full justify-between px-3 text-left font-normal"
            type="button"
            variant="outline"
          >
            <span className="min-w-0 truncate">
              {selectedUser?.email ?? "Search email"}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-96 max-w-[calc(100vw-2rem)] p-1"
        >
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setQuery}
              placeholder="Search email"
              value={query}
            />
            <CommandList>
              {filteredUsers.length > 0 ? (
                <CommandGroup>
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.email}
                      onSelect={() => selectUser(user)}
                      value={user.email}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.name || user.email} - {user.role || "User"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {user.role || "User"}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No emails found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function setNativeInputValue(id: string, value: string) {
  const input = document.getElementById(id);

  if (!(input instanceof HTMLInputElement)) return;

  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
