import { useTRPC } from "@/trpc/client";
import { useDebugToast } from "./use-debug-console";
import { authClient } from "@/auth/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAsyncMemo } from "use-async-memo";
import { AuthCookie, getAuthCookie } from "@/actions/cookies/auth-cookie";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as any as AuthCookie);

interface Props {
  required: boolean;
}
export function useAuth(props?: Props) {
  const { required } = props || {};
  const { data, isPending } = authClient.useSession();
  // const profile = useAsyncMemo(async () => {
  //   return await getAuthCookie();
  // },[])
  const { data: profile, isLoading } = useSWR("/api/profile", fetcher);
  return {
    isPending,
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
