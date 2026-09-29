"use client";

import { useActionState, useState, useTransition, type ComponentPropsWithoutRef, type ReactNode } from "react";

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
  preserveValuesAfterSubmit?: boolean;
};

export function ActionFeedbackForm({
  action,
  successMessage,
  children,
  preserveValuesAfterSubmit = false,
  ...formProps
}: ActionFeedbackFormProps) {
  const { onSubmit, ...restFormProps } = formProps;
  const [actionState, formAction, actionPending] = useActionState<ActionState, FormData>(
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
  const [preservedState, setPreservedState] = useState<ActionState>({ status: "idle" });
  const [preservedPending, startTransition] = useTransition();
  const state = preserveValuesAfterSubmit ? preservedState : actionState;
  const pending = preserveValuesAfterSubmit ? preservedPending : actionPending;

  async function submitPreservingValues(formData: FormData) {
    try {
      const result = await action(formData);
      if (result && !result.success) {
        setPreservedState({ status: "error", message: result.message });
        return;
      }
      setPreservedState({ status: "success" });
    } catch {
      setPreservedState({ status: "error" });
    }
  }

  return (
    <form
      action={preserveValuesAfterSubmit ? undefined : formAction}
      {...restFormProps}
      onSubmit={(event) => {
        onSubmit?.(event);
        if (!preserveValuesAfterSubmit || event.defaultPrevented) return;

        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => submitPreservingValues(formData));
      }}
    >
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
