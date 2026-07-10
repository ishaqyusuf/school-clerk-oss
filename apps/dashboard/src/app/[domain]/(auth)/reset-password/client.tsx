"use client";

import type React from "react";

import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { QuickFill } from "@/components/quick-fill";
import { completeStaffOnboardingAction } from "@/actions/save-staff";
import { getPasswordResetTokenStatus } from "@/actions/reset-password-token";
import { authClient } from "@/auth/client";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Button } from "@school-clerk/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Textarea } from "@school-clerk/ui/textarea";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";

function getTokenStatusMessage(status: string, isOnboardingFlow: boolean) {
	if (status === "expired") {
		return isOnboardingFlow
			? "This onboarding link has expired. Ask your school administrator to resend your staff invite."
			: "This password reset link has expired. Request a new password reset link.";
	}

	if (status === "missing") {
		return isOnboardingFlow
			? "This onboarding link is missing its reset token."
			: "This password reset link is missing its reset token.";
	}

	return isOnboardingFlow
		? "This onboarding link is invalid or has already been used. Ask your school administrator to resend your staff invite."
		: "This password reset link is invalid or has already been used. Request a new password reset link.";
}

async function getResetPasswordErrorMessage(
	token: string,
	fallbackMessage: string,
	isOnboardingFlow: boolean,
) {
	const normalizedMessage = fallbackMessage.toLowerCase();

	if (!normalizedMessage.includes("token")) {
		return fallbackMessage;
	}

	const tokenStatus = await getPasswordResetTokenStatus(token);
	if (tokenStatus.status === "valid") {
		return fallbackMessage;
	}

	return getTokenStatusMessage(tokenStatus.status, isOnboardingFlow);
}

export function Client() {
	const router = useRouter();
	const toast = useLoadingToast();
	const [legacyToken] = useQueryState("tok");
	const [tokenFromCallback] = useQueryState("token");
	const [emailFromQuery] = useQueryState("email");
	const [staffId] = useQueryState("staffId");
	const [onboardingFlag] = useQueryState("onboarding");
	const token = tokenFromCallback || legacyToken;
	const isOnboardingFlow = onboardingFlag === "1" && Boolean(staffId);
	const form = useForm({
		defaultValues: {
			email: emailFromQuery || "",
			password: "",
			name: "",
			title: "",
			phone: "",
			phone2: "",
			address: "",
		},
	});
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const completeOnboarding = useAction(completeStaffOnboardingAction, {
		onSuccess() {
			toast.success("Onboarding completed. You can now sign in.");
			router.push("/login");
		},
		onError({ error }) {
			setIsLoading(false);
			setError(
				error.serverError ||
					"We saved your password, but could not finish onboarding.",
			);
		},
	});

	const handleSubmit = form.handleSubmit(async (values) => {
		if (!token) {
			setError(getTokenStatusMessage("missing", isOnboardingFlow));
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const tokenStatus = await getPasswordResetTokenStatus(token);

			if (tokenStatus.status !== "valid") {
				setIsLoading(false);
				setError(getTokenStatusMessage(tokenStatus.status, isOnboardingFlow));
				return;
			}

			const resetResponse = await authClient.resetPassword({
				newPassword: values.password,
				token,
			});

			if (resetResponse.error) {
				const message = await getResetPasswordErrorMessage(
					token,
					resetResponse.error.message || "Could not reset your password.",
					isOnboardingFlow,
				);
				throw new Error(message);
			}

			if (isOnboardingFlow && staffId) {
				completeOnboarding.execute({
					staffId,
					email: values.email,
					name: values.name,
					title: values.title,
					phone: values.phone,
					phone2: values.phone2,
					address: values.address,
				});
				return;
			}

			toast.success("Password updated. You can now sign in.");
			router.push("/login");
		} catch (caughtError) {
			setIsLoading(false);
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Could not reset your password.",
			);
		}
	});

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<div className="mx-auto max-w-2xl">
					<Card>
						<CardHeader className="text-center">
							<CardTitle className="text-2xl">
								{isOnboardingFlow
									? "Complete your staff onboarding"
									: "Reset your password"}
							</CardTitle>
							<p className="text-gray-600">
								{isOnboardingFlow
									? "Set your password and fill in your profile details to join School Clerk."
									: "Enter a new password to continue."}
							</p>
						</CardHeader>
						<CardContent>
							{error ? (
								<Alert className="mb-4" variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							) : null}

							<FormProvider {...form}>
							<form onSubmit={handleSubmit} className="space-y-4">
								{isOnboardingFlow && (
									<div className="flex justify-end">
										<QuickFill name="staffOnboarding" />
									</div>
								)}
								<div>
									<Label htmlFor="email">Email address</Label>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
										<Input
											disabled
											id="email"
											type="email"
											{...form.register("email")}
											className="pl-10"
											required
										/>
									</div>
								</div>

								{isOnboardingFlow ? (
									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<Label htmlFor="name">Full name</Label>
											<div className="relative">
												<User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
												<Input
													id="name"
													placeholder="Enter your full name"
													{...form.register("name")}
													className="pl-10"
													required
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="phone">Phone</Label>
											<div className="relative">
												<Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
												<Input
													id="phone"
													type="tel"
													placeholder="+234..."
													{...form.register("phone")}
													className="pl-10"
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="phone2">Alternative phone</Label>
											<Input
												id="phone2"
												type="tel"
												placeholder="Optional"
												{...form.register("phone2")}
											/>
										</div>

										<div className="md:col-span-2">
											<Label htmlFor="address">Address</Label>
											<Textarea
												id="address"
												placeholder="Enter your address"
												{...form.register("address")}
											/>
										</div>
									</div>
								) : null}

								<div>
									<Label htmlFor="password">Password</Label>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
										<Input
											id="password"
											type={showPassword ? "text" : "password"}
											placeholder="Choose a password"
											{...form.register("password")}
											className="pl-10 pr-10"
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>

								<Button type="submit" className="w-full" disabled={isLoading}>
									{isLoading
										? "Submitting..."
										: isOnboardingFlow
											? "Complete onboarding"
											: "Update password"}
								</Button>
							</form>
							</FormProvider>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
