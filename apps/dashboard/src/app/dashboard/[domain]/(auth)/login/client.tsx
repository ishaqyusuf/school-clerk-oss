"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { authClient } from "@/auth/client";
import { debugToast } from "@/hooks/use-debug-console";
import { changePasswordDefault } from "@/actions/change-password-default";
import { useWorkspaceStore } from "@/store/workspace";
import { resetCookie } from "@/actions/cookies/auth-cookie";

// import { signIn } from "next-auth/react";

export function Client() {
  const router = useRouter();
  const auth = authClient.useSession();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };
  const ws = useWorkspaceStore();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      authClient.signIn
        .email({
          email: formData.email,
          password: formData.password,
          // callbackURL: "/",
        })
        .then((resp) => {
          console.log({ resp });
          const bearerToken = resp.data.token;
          const userId = resp.data.user.id;
          resetCookie({ bearerToken, userId, redirectUrl: "/" })
            .then((res) => {
              console.log({ res, bearerToken, userId });
            })
            .catch((e) => {
              debugToast("Error setting cookie:", e);
            });
          // ws.

          // .then((e) => {
          //   if (e.error.status === 401) {
          //     authClient.signUp
          //       .email({
          //         email: formData.email,
          //         password: formData.password,
          //         name: "Ishaq Yusuf",
          //       })
          //       .then((e) => {
          //         debugToast("Register", e);
          //       });
          //   }
          //   debugToast("Login", e);
          //   setIsLoading(false);
          // });
        });
    } catch (error) {}

    // signIn("credentials", {
    //   email: formData.email,
    //   password: formData.password,
    //   callbackURL: "/",
    //   tenantLogin: true,
    //   // type: "customer",
    // }).catch((e) => {
    //   // console.log(e);
    // });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                Sign In to Your Account
              </CardTitle>
              <p className="text-gray-600">
                Welcome back! Please sign in to continue.
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
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-700 hover:bg-amber-800"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    href="/signup"
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Create one here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
