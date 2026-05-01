import SignupForm from "@/components/forms/signup-form";
import { LanguageSelector } from "@/components/language-selector";
import { getSignupPreviewSuffix } from "@/features/signup/tenant-urls";

// import { prisma } from "@school-clerk/db";

export default async function SignUpPage() {
  const hostSuffix = getSignupPreviewSuffix();

  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>
      <SignupForm hostSuffix={hostSuffix} />
    </div>
  );
}
