"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginGames } from "@/app/games/actions";
import { Button } from "@/components/ui/button";

export function GamesLoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(loginGames, { error: "" });

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="grid gap-2 text-sm font-semibold text-lead-navy">
        Games password
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
        {pending ? "Unlocking..." : "Open games"}
      </Button>
      {state?.error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p> : null}
    </form>
  );
}
