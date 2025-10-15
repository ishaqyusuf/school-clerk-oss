import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { AcademicSessionForm } from "@/components/forms/academic-session-form";

export default async function CreateAcademicSessionPage({}) {
  const profile = await getAuthCookie();

  return (
    <div className="">
      <AcademicSessionForm />
    </div>
  );
}
