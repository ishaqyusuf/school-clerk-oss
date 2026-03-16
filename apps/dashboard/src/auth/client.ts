import type { Auth } from "@school-clerk/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  $InferAuth: {} as Auth["options"],
  plugins: [inferAdditionalFields<Auth>()],
});
