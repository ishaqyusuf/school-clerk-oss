export type SignupSetupStatus = {
  domains: "not-requested" | "submitted" | "needs-attention";
  verificationEmail: "accepted" | "console" | "needs-attention";
  workspaceEmail: "accepted" | "console" | "skipped" | "needs-attention";
  notification: "created" | "skipped" | "needs-attention";
};

export type SignupCompletion = {
  schoolName: string;
  onboardingLoginUrl: string;
  setupStatus: SignupSetupStatus;
};
