"use client";

import { useActionState, type ComponentPropsWithoutRef, type ReactNode } from "react";

type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type ActionFeedbackResult = {
  success: boolean;
  message?: string;
};

type ActionFeedbackFormProps = Omit<ComponentPropsWithoutRef<"form">, "action" | "children"> & {
  action: (formData: FormData) => void | ActionFeedbackResult | Promise<void | ActionFeedbackResult>;
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
        const result = await action(formData);
        if (result && !result.success) {
          return { status: "error", message: result.message };
        }
        return { status: "success" };
      } catch {
        return { status: "error" };
      }
    },
    { status: "idle" }
  );

  return (
    <form action={formAction} {...formProps}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <div aria-live="polite" className="sm:col-span-2">
        {pending ? <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-lead-blue">Updating...</p> : null}
        {state.status === "success" && !pending ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{successMessage}</p>
        ) : null}
        {state.status === "error" && !pending ? (
          <p role="alert" className="whitespace-pre-line rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700">
            {state.message || "Update failed. Please check the form and try again."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
