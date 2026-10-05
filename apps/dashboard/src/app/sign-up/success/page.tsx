import type { Metadata } from "next";
import { SignupStatusNotice } from "@/components/forms/signup-status-notice";

export const metadata: Metadata = {
  title: "Check signup status",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SignupSuccessPage() {
  return <SignupStatusNotice />;
}
