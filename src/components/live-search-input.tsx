"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";

export function LiveSearchInput({ defaultValue, ...props }: ComponentProps<"input">) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const field = input.current;
    if (field && document.activeElement !== field && !timeout.current) {
      field.value = String(defaultValue ?? "");
    }
  }, [defaultValue]);

  useEffect(() => {
    const form = input.current?.form;
    const cancel = () => {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    };
    form?.addEventListener("submit", cancel);
    return () => {
      cancel();
      form?.removeEventListener("submit", cancel);
    };
  }, []);

  return (
    <input
      {...props}
      ref={input}
      type="search"
      defaultValue={defaultValue}
      onChange={(event) => {
        clearTimeout(timeout.current);
        const field = event.currentTarget;
        timeout.current = setTimeout(() => {
          timeout.current = undefined;
          if (!field.form) return;
          const url = new URL(field.form.action);
          const params = new URLSearchParams(window.location.search);
          for (const control of field.form.elements) {
            if (control instanceof HTMLInputElement && control.type === "hidden" && control.name && control.value) {
              params.set(control.name, control.value);
            }
          }
          const value = field.value.trim();
          if (value) params.set(field.name, value);
          else params.delete(field.name);
          url.search = params.toString();
          router.replace(url.pathname + url.search + window.location.hash, { scroll: false });
        }, 300);
      }}
    />
  );
}
