import SignupForm from "@/components/forms/signup-form";
import { LanguageSelector } from "@/components/language-selector";

// import { prisma } from "@school-clerk/db";

export default async function SignUpPage() {
  // await prisma.whatIsGoingOn.create({
  //   data: {
  //     name: "HELLO",
  //   },
  // });
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[600px]">
        <SignupForm />
      </div>
    </div>
  );
}
