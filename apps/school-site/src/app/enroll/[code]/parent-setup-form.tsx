"use client";

import { useActionState } from "react";
import { confirmParentSetup, requestParentSetupEmail, type ParentSetupState } from "@/lib/enrollment/parent-setup-actions";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";

const initialState: ParentSetupState = { status: "idle", message: "" };

export function ParentSetupEmailForm({ code, applicationId }: { code: string; applicationId: string }) {
  const [state, action, pending] = useActionState(requestParentSetupEmail.bind(null, code, applicationId), initialState);
  return (
    <form action={action} className="min-w-0 space-y-4 rounded-md border border-slate-200 p-4" aria-busy={pending}>
      <div className="space-y-1 break-words">
        <h2 className="font-medium">Verify your parent login</h2>
        <p className="text-sm text-slate-600">We will email a private setup link to the primary parent recorded on this application. Contact the school if that email needs correcting. Existing passwords will not be changed here.</p>
      </div>
      <Button className="min-h-11 w-full whitespace-normal sm:w-auto" disabled={pending} type="submit">
        {pending ? "Sending email…" : "Email parent setup link"}
      </Button>
      <p className="break-words text-sm" role={state.status === "error" ? "alert" : "status"}>{state.message}</p>
    </form>
  );
}

export function ParentSetupConfirmationForm({ code, applicationId, token }: { code: string; applicationId: string; token: string }) {
  const [state, action, pending] = useActionState(confirmParentSetup.bind(null, code, applicationId, token), initialState);
  if (state.status === "success") return <p className="break-words text-sm" role="status">{state.message}</p>;
  return (
    <form action={action} className="min-w-0 space-y-4" aria-busy={pending}>
      <p className="break-words text-sm text-slate-600">Choose a password for a new or passwordless parent login. If you already have a password, it will remain unchanged. This link verifies only the email it was sent to.</p>
      <label className="block space-y-2 text-sm" htmlFor="parent-setup-password">
        <span>Password</span>
        <Input className="min-h-11" id="parent-setup-password" name="password" autoComplete="new-password" type="password" minLength={8} maxLength={128} required aria-describedby="parent-setup-help" disabled={pending} />
      </label>
      <p id="parent-setup-help" className="text-sm text-slate-600">Use 8–128 characters. Opening this page does not consume your link.</p>
      <Button className="min-h-11 w-full whitespace-normal sm:w-auto" disabled={pending} type="submit">{pending ? "Verifying…" : "Verify email and finish setup"}</Button>
      <p className="break-words text-sm" role={state.status === "error" ? "alert" : "status"}>{state.message}</p>
    </form>
  );
}
