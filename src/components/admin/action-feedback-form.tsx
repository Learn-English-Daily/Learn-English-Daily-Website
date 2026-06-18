"use client";

import { useActionState, type ComponentPropsWithoutRef, type ReactNode } from "react";

type ActionState = "idle" | "success" | "error";

type ActionFeedbackFormProps = Omit<ComponentPropsWithoutRef<"form">, "action" | "children"> & {
  action: (formData: FormData) => void | Promise<void>;
  successMessage: string;
  children: ReactNode;
};

export function ActionFeedbackForm({
  action,
  successMessage,
  children,
  ...formProps
}: ActionFeedbackFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      try {
        await action(formData);
        return "success";
      } catch {
        return "error";
      }
    },
    "idle"
  );

  return (
    <form action={formAction} {...formProps}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <div aria-live="polite" className="sm:col-span-2">
        {pending ? <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-lead-blue">Updating...</p> : null}
        {state === "success" && !pending ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{successMessage}</p>
        ) : null}
        {state === "error" && !pending ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
            Update failed. Please check the form and try again.
          </p>
        ) : null}
      </div>
    </form>
  );
}
