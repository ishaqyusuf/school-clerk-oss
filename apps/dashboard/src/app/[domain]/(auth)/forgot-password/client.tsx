"use client";

import type React from "react";

import { useState } from "react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Mail, MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/actions/request-password-reset";

// import { signIn } from "next-auth/react";

export function Client() {
  const [formData, setFormData] = useState({
    email: "",
  });
  const [sentEmail, setSentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const email = formData.email.trim().toLowerCase();
      const result = await requestPasswordReset(email);

      if (result?.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setSentEmail(email);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send reset instructions.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (sentEmail) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <MailCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">Reset email sent</CardTitle>
                <p className="text-sm text-muted-foreground">
                  If an account exists for {sentEmail}, we sent password reset
                  instructions for this school workspace.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full bg-amber-700 hover:bg-amber-800">
                  <Link href="/login">Back to sign in</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSentEmail("");
                    setError("");
                  }}
                >
                  Use another email
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Forgot your password?</CardTitle>
              <p className="text-gray-600">
                Enter your email to reset your password
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {/* 
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div> */}

                {/* <div className="flex items-center justify-between">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    Forgot your password?
                  </Link>
                </div> */}

                <Button
                  type="submit"
                  className="w-full bg-amber-700 hover:bg-amber-800"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
