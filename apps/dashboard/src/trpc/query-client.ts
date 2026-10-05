import { toast } from "@school-clerk/ui/use-toast";
import {
  MutationCache,
  QueryClient,
  isServer,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: isServer ? false : (failureCount, error) => {
          const status = "status" in error ? error.status : undefined;
          const code = "data" in error && error.data && typeof error.data === "object" && "code" in error.data ? error.data.code : undefined;
          if (status === 401 || code === "UNAUTHORIZED" || code === "FORBIDDEN") return false;
          return failureCount < 2;
        },
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
    mutationCache: new MutationCache({
      onMutate: async (variables, mutation) => {
        const title = mutation?.meta?.toastTitle?.loading;
        if (!title) return;
        toast({
          title,
          variant: "progress",
        });
      },
      onSuccess: async (data, variables, _context, mutation) => {
        const title = mutation?.meta?.toastTitle?.success;
        if (!title) return;
        toast({
          title,
          variant: "success",
        });
      },
      onError: async (data, variables, _context, mutation) => {
        const title = mutation?.meta?.toastTitle?.error;
        if (!title) return;
        toast({
          title,
          variant: "error",
        });
      },
    }),
  });
}
