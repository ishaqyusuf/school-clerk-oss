import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {}

export function useTrpcSubjects(props: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  return {
    trpc,
  };
}
