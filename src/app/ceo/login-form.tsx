"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginCeo } from "@/app/ceo/actions";
import { Button } from "@/components/ui/button";

export function CeoLoginForm() {
  const [state, formAction, pending] = useActionState(loginCeo, { error: "" });

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-lead-navy">
        CEO password
        <input
          required
          name="password"
          type="password"
          autoComplete="current-password"
          className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
        />
      </label>
      <Button type="submit" size="lg" disabled={pending}>
        <LockKeyhole className="h-4 w-4" />
        {pending ? "Signing in..." : "Open CEO dashboard"}
      </Button>
      {state?.error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p> : null}
    </form>
  );
}
