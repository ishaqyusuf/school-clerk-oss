"use client";

import type React from "react";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { completeStaffOnboardingAction } from "@/actions/save-staff";
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

export function Client() {
	const router = useRouter();
	const params = useParams<{ domain: string }>();
	const toast = useLoadingToast();
	const [legacyToken] = useQueryState("tok");
	const [tokenFromCallback] = useQueryState("token");
	const [emailFromQuery] = useQueryState("email");
	const [staffId] = useQueryState("staffId");
	const [onboardingFlag] = useQueryState("onboarding");
	const token = tokenFromCallback || legacyToken;
	const isOnboardingFlow = onboardingFlag === "1" && Boolean(staffId);
	const [formData, setFormData] = useState({
		email: emailFromQuery || "",
		password: "",
		name: "",
		title: "",
		phone: "",
		phone2: "",
		address: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const completeOnboarding = useAction(completeStaffOnboardingAction, {
		onSuccess() {
			toast.success("Onboarding completed. You can now sign in.");
			router.push(`/dashboard/${params.domain}/login`);
		},
		onError({ error }) {
			setIsLoading(false);
			setError(
				error.serverError ||
					"We saved your password, but could not finish onboarding.",
			);
		},
	});

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setError("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!token) {
			setError("This onboarding link is missing its reset token.");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			await authClient.resetPassword({
				newPassword: formData.password,
				token,
			});

			if (isOnboardingFlow && staffId) {
				completeOnboarding.execute({
					staffId,
					email: formData.email,
					name: formData.name,
					title: formData.title,
					phone: formData.phone,
					phone2: formData.phone2,
					address: formData.address,
				});
				return;
			}

			toast.success("Password updated. You can now sign in.");
			router.push(`/dashboard/${params.domain}/login`);
		} catch (caughtError) {
			setIsLoading(false);
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Could not reset your password.",
			);
		}
	};

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

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<Label htmlFor="email">Email address</Label>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
										<Input
											disabled
											id="email"
											type="email"
											value={formData.email}
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
													placeholder="Aisha Bello"
													value={formData.name}
													onChange={(e) =>
														handleInputChange("name", e.target.value)
													}
													className="pl-10"
													required
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="title">Title</Label>
											<Input
												id="title"
												placeholder="Mr, Mrs, Dr..."
												value={formData.title}
												onChange={(e) =>
													handleInputChange("title", e.target.value)
												}
											/>
										</div>

										<div>
											<Label htmlFor="phone">Phone</Label>
											<div className="relative">
												<Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
												<Input
													id="phone"
													placeholder="+234..."
													value={formData.phone}
													onChange={(e) =>
														handleInputChange("phone", e.target.value)
													}
													className="pl-10"
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="phone2">Alternative phone</Label>
											<Input
												id="phone2"
												placeholder="Optional"
												value={formData.phone2}
												onChange={(e) =>
													handleInputChange("phone2", e.target.value)
												}
											/>
										</div>

										<div className="md:col-span-2">
											<Label htmlFor="address">Address</Label>
											<Textarea
												id="address"
												placeholder="Enter your address"
												value={formData.address}
												onChange={(e) =>
													handleInputChange("address", e.target.value)
												}
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
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
