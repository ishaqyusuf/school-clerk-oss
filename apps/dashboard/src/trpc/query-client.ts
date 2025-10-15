import { toast } from "@school-clerk/ui/use-toast";
import {
  MutationCache,
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
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
