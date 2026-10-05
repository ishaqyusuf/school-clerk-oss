import { authClient } from "@/auth/client";
import { loadWorkspaceProfile } from "@/lib/workspace-profile";
import useSWR from "swr";

interface Props {
  required: boolean;
}
export function useAuth(props?: Props) {
  const { required } = props || {};
  const { data, isPending, error: sessionError } = authClient.useSession();
  const { data: profile, isLoading, error: profileError } = useSWR("/api/profile", loadWorkspaceProfile);
  return {
    isPending,
    isSessionError: !!sessionError,
    isProfileLoading: isLoading,
    isProfileError: !!profileError,
    sessionId: data?.session?.id,
    // termId: data?.session?.term
    id: data?.user?.id,
    email: data?.user?.email,
    name: data?.user?.name,
    role: (data?.user as any)?.role,
    avatar: data?.user?.image,
    profile,
  };
}
